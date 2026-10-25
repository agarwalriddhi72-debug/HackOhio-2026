"""
Historical disaster-risk indicator for Daraga, Albay (Philippines) using Random Forests.

What it does
------------
1. Loads 50 years of hourly weather (PastWeather.csv, converted to Philippines time).
2. Trains two Random Forests on the time pattern (day of year + hour of day):
     - a regressor that predicts the 13 weather variables for any date/hour
     - a classifier that predicts the chance of each hazard for any date/hour
       (labels come from scoring every historical hour with the thresholds below)
3. For each hour from +12h to +24h after "now", it predicts the hazard risk. If a
   hazard stays above the cutoff for enough hours in a row, a warning is declared.

No live data is used, so this describes what is typical for this date and hour. It
cannot see a storm that is actually approaching. It is a HISTORICAL RISK INDICATOR,
not an official warning. Always defer to PAGASA / PHIVOLCS / MGB advisories.

Where the thresholds come from
------------------------------
OFFICIAL (cited):
  - Rain per hour 7.5 / 15 / 30 mm ........ PAGASA rainfall warning levels
  - Rain over 3 hours 45 / 65 mm .......... PAGASA orange / red equivalents
  - Wind speed 39 / 61 km/h ............... PAGASA Tropical Cyclone Wind Signals 1-2
  - Lahar rain 10 / 30 mm/h ............... PHIVOLCS advisories (about 60 mm/h is the
                                            upper figure; fresh deposits lower it)
CALIBRATED FROM THE DATA (no official source found):
  - pressure, cloud cover, humidity, soil moisture, soil temperature,
    apparent temperature -> percentiles of the 50-year dataset (see calibrate()).
    The scoring weights are tunable judgment calls.
"""

import hashlib
import inspect
import json
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

PH_TZ = ZoneInfo("Asia/Manila")
CSV_FILE_PATH = "PastWeather.csv"
MODEL_PATH = "weather_rf_models.pkl"  # generated; safe to delete (it retrains)
SCORE_FLOOR = 60.0                    # a historical hour counts as "dangerous" at this score
SHOW_DIAGNOSTICS = False              # True: print predicted risk for every hour
EVALUATE = False                      # True: compare the Random Forest to the plain 50-year average
SHOW_CALIBRATION = False              # True: print the data-calibrated thresholds at the start

HAZARDS = ["Cyclone / Typhoon", "Flash Flood", "Volcanic Lahar", "Rain-Induced Landslide"]

# Hours in a row a hazard must last before a warning is declared
REQUIRED_HOURS = {
    "Volcanic Lahar": 1,
    "Flash Flood": 2,  # PAGASA rain warnings assume rain continues ~2 more hours
    "Cyclone / Typhoon": 3,
    "Rain-Induced Landslide": 3,
}

DISPLAY_VARS = [
    "temperature_2m (°C)", "relative_humidity_2m (%)", "dew_point_2m (°C)",
    "apparent_temperature (°C)", "precipitation (mm)", "rain (mm)",
    "pressure_msl (hPa)", "surface_pressure (hPa)", "cloud_cover (%)",
    "wind_speed_10m (km/h)", "wind_gusts_10m (km/h)",
    "soil_temperature_0_to_7cm (°C)", "soil_moisture_0_to_7cm (m³/m³)",
]


# ---------------------------------------------------------------- data ----
def load_data(path):
    df = pd.read_csv(path, skiprows=3)
    df.columns = [c.strip() for c in df.columns]
    df["time"] = pd.to_datetime(df["time"])  # CSV is UTC
    df["time"] = (
        df["time"].dt.tz_localize("UTC")
        .dt.tz_convert("Asia/Manila")
        .dt.tz_localize(None)  # now plain Manila time
    )
    df = df.sort_values("time").reset_index(drop=True)
    df["rain_3h"] = df["rain (mm)"].rolling(3, min_periods=1).sum()  # mm over last 3 hours
    return df


def calibrate(df):
    """Thresholds for variables with no official source, taken from this dataset's percentiles."""
    def q(col, p):
        return float(df[col].quantile(p))

    return {
        # lower pressure = worse: (mild, severe)
        "pressure": (q("pressure_msl (hPa)", 0.05), q("pressure_msl (hPa)", 0.01)),
        "cloud": (q("cloud_cover (%)", 0.75), q("cloud_cover (%)", 0.90)),
        "humidity": q("relative_humidity_2m (%)", 0.90),
        "soil_moist_lahar": (q("soil_moisture_0_to_7cm (m³/m³)", 0.85),
                             q("soil_moisture_0_to_7cm (m³/m³)", 0.95)),
        "soil_moist_slide": (q("soil_moisture_0_to_7cm (m³/m³)", 0.90),
                             q("soil_moisture_0_to_7cm (m³/m³)", 0.97)),
        # cooler than usual (rain-cooled) = worse
        "soil_temp": q("soil_temperature_0_to_7cm (°C)", 0.10),
        "app_temp": q("apparent_temperature (°C)", 0.10),
    }


def print_calibration(cal):
    print("Data-calibrated thresholds (50-year percentiles for this location):")
    print(f"  pressure   : <= {cal['pressure'][0]:.1f} hPa (50) / <= {cal['pressure'][1]:.1f} hPa (100)")
    print(f"  cloud cover: >= {cal['cloud'][0]:.0f}%")
    print(f"  humidity   : >= {cal['humidity']:.0f}%")
    print(f"  soil moist (lahar)    : {cal['soil_moist_lahar'][0]:.3f} / {cal['soil_moist_lahar'][1]:.3f}")
    print(f"  soil moist (landslide): {cal['soil_moist_slide'][0]:.3f} / {cal['soil_moist_slide'][1]:.3f}")
    print(f"  soil temp  : <= {cal['soil_temp']:.1f} C   apparent temp: <= {cal['app_temp']:.1f} C")
    print("-" * 70)


# ------------------------------------------------------------- scoring ----
def level_v(x, low, high):
    """0 below `low`, 50 from `low` to `high`, 100 above `high` (works on whole columns)."""
    x = np.asarray(x, dtype=float)
    return np.where(x < low, 0, np.where(x <= high, 50, 100))


def hazard_scores_df(df, cal):
    """Hazard score (0-100) for every row. Rows must not contain missing values."""
    g = df["wind_gusts_10m (km/h)"].to_numpy()
    ws = df["wind_speed_10m (km/h)"].to_numpy()
    p = df["pressure_msl (hPa)"].to_numpy()
    rain = df["rain (mm)"].to_numpy()
    rain3 = df["rain_3h"].to_numpy()
    cl = df["cloud_cover (%)"].to_numpy()
    sm = df["soil_moisture_0_to_7cm (m³/m³)"].to_numpy()
    st = df["soil_temperature_0_to_7cm (°C)"].to_numpy()
    at = df["apparent_temperature (°C)"].to_numpy()
    hum = df["relative_humidity_2m (%)"].to_numpy()

    p_mild, p_severe = cal["pressure"]
    pressure_score = np.where(p > p_mild, 0, np.where(p >= p_severe, 50, 100))

    out = pd.DataFrame({
        "Cyclone / Typhoon": (
            level_v(g, 39, 60) * 0.35                       # gusts: PAGASA signal range
            + pressure_score * 0.30                         # calibrated
            + level_v(rain, 7.5, 15) * 0.20                 # PAGASA rain levels
            + level_v(ws, 39, 61) * 0.10                    # PAGASA wind signals 1-2
            + np.where(cl >= cal["cloud"][0], 100, 0) * 0.05  # calibrated
        ),
        "Flash Flood": (
            level_v(rain, 7.5, 15) * 0.60                   # PAGASA 1-hour levels
            + level_v(rain3, 45, 65) * 0.30                 # PAGASA 3-hour levels
            + np.where(hum >= cal["humidity"], 100, 0) * 0.10   # calibrated
        ),
        "Volcanic Lahar": (
            level_v(rain, 10, 30) * 0.50                    # PHIVOLCS advisories
            + level_v(sm, *cal["soil_moist_lahar"]) * 0.40  # calibrated
            + np.where(st <= cal["soil_temp"], 100, 0) * 0.10   # calibrated
        ),
        "Rain-Induced Landslide": (
            level_v(sm, *cal["soil_moist_slide"]) * 0.50    # calibrated
            + level_v(rain3, 45, 65) * 0.40                 # PAGASA 3-hour levels
            + np.where(at <= cal["app_temp"], 100, 0) * 0.10    # calibrated
        ),
    }, index=df.index)
    return out[HAZARDS]


# --------------------------------------------------------- random forest ----
def time_features(times):
    """Day of year and hour of day as repeating (sin/cos) values, so Dec 31 sits next to Jan 1."""
    t = pd.DatetimeIndex(times)
    doy = t.day_of_year.to_numpy()
    hr = t.hour.to_numpy()
    return np.column_stack([
        np.sin(2 * np.pi * doy / 366), np.cos(2 * np.pi * doy / 366),
        np.sin(2 * np.pi * hr / 24), np.cos(2 * np.pi * hr / 24),
    ])


def fit_regressor(df):
    """Random Forest that predicts all weather variables. Targets are standardized so
    large-scale variables (pressure) don't drown out small ones (soil moisture)."""
    X = time_features(df["time"])
    Y = df[DISPLAY_VARS].to_numpy()
    mu, sd = Y.mean(axis=0), Y.std(axis=0)
    sd[sd == 0] = 1.0
    reg = RandomForestRegressor(n_estimators=30, min_samples_leaf=100, max_samples=0.5,
                                n_jobs=-1, random_state=42)
    reg.fit(X, (Y - mu) / sd)
    return reg, mu, sd


def train_models(df, cal):
    print("Training Random Forests on the 50-year pattern (first run only, then cached)...")
    clean = df.dropna(subset=DISPLAY_VARS + ["rain_3h"]).reset_index(drop=True)
    reg, mu, sd = fit_regressor(clean)

    labels = (hazard_scores_df(clean, cal) >= SCORE_FLOOR).astype(int)
    clf = RandomForestClassifier(n_estimators=30, min_samples_leaf=200, max_samples=0.5,
                                 n_jobs=-1, random_state=42)
    clf.fit(time_features(clean["time"]), labels.to_numpy())

    print("Historical share of hours at dangerous level: "
          + ", ".join(f"{h.split(' ')[0]} {labels[h].mean() * 100:.2f}%" for h in HAZARDS))
    return {"reg": reg, "mu": mu, "sd": sd, "clf": clf}


def get_models(df, cal):
    """Load cached models, or train new ones if the data or thresholds changed."""
    signature = hashlib.md5(
        (inspect.getsource(hazard_scores_df) + json.dumps(cal, sort_keys=True)
         + str(SCORE_FLOOR) + str(len(df)) + str(df["time"].iloc[-1])).encode()
    ).hexdigest()

    if os.path.exists(MODEL_PATH):
        try:
            bundle = joblib.load(MODEL_PATH)
            if bundle.get("sig") == signature:
                print(f"Loaded cached models from {MODEL_PATH}")
                return bundle
        except Exception:
            pass
    bundle = train_models(df, cal)
    bundle["sig"] = signature
    joblib.dump(bundle, MODEL_PATH, compress=3)
    print(f"Saved models to {MODEL_PATH}")
    return bundle


def predict_weather(bundle, t_ph):
    y = bundle["reg"].predict(time_features([t_ph]))[0] * bundle["sd"] + bundle["mu"]
    return dict(zip(DISPLAY_VARS, y))


def predict_risk(bundle, t_ph):
    """Predicted chance (0-100%) of each hazard at date/hour t_ph."""
    clf = bundle["clf"]
    proba = clf.predict_proba(time_features([t_ph]))  # one array per hazard
    risks = {}
    for k, hazard in enumerate(HAZARDS):
        classes = list(clf.classes_[k])
        risks[hazard] = float(proba[k][0][classes.index(1)] * 100) if 1 in classes else 0.0
    return risks


# ------------------------------------------------------------ forecast ----
def target_time(hour_offset):
    base = (datetime.now(PH_TZ) + timedelta(minutes=30)).replace(minute=0, second=0, microsecond=0)
    return (base + timedelta(hours=hour_offset)).replace(tzinfo=None)  # Manila time


def print_target_hour(bundle, hour_offset=12):
    t_ph = target_time(hour_offset)
    pred = predict_weather(bundle, t_ph)
    print(f"PREDICTED WEATHER FOR {t_ph:%Y-%m-%d %I:%M %p} (Manila), +{hour_offset}h from now")
    print("Random Forest trained on the 50-year pattern for this date and hour")
    print("-" * 70)
    for col in DISPLAY_VARS:
        print(f"-> {col:<40} : {pred[col]:.2f}")
    print("-" * 70)


def diagnose(bundle, start_h=12, end_h=24):
    for off in range(start_h, end_h + 1):
        t_ph = target_time(off)
        risks = predict_risk(bundle, t_ph)
        print(f"{t_ph:%b %d %I %p} | " + ", ".join(f"{h[:6]}={risks[h]:.1f}%" for h in HAZARDS))
    print("-" * 70)


def run_forecast(bundle, risk_cutoff_pct=10, start_h=12, end_h=24):
    try:
        now_ph = datetime.now(PH_TZ)
        print(f"Now (Manila): {now_ph:%Y-%m-%d %I:%M %p} | checking +{start_h}h to +{end_h}h")
        print("-" * 70)

        streak = {h: 0 for h in REQUIRED_HOURS}
        longest = {h: 0 for h in REQUIRED_HOURS}
        peak_conf = {h: 0.0 for h in REQUIRED_HOURS}
        best_risk = {h: 0.0 for h in REQUIRED_HOURS}  # highest predicted risk in any hour

        for off in range(start_h, end_h + 1):
            risks = predict_risk(bundle, target_time(off))
            for hazard in REQUIRED_HOURS:
                best_risk[hazard] = max(best_risk[hazard], risks[hazard])
                if risks[hazard] >= risk_cutoff_pct:
                    streak[hazard] += 1
                    longest[hazard] = max(longest[hazard], streak[hazard])
                    peak_conf[hazard] = max(peak_conf[hazard], risks[hazard])
                else:
                    streak[hazard] = 0

        for h in REQUIRED_HOURS:
            print(f"{h:<24} peak {peak_conf[h]:5.1f}%  longest streak {longest[h]}h "
                  f"(needs {REQUIRED_HOURS[h]}h) | highest predicted risk in any hour: "
                  f"{best_risk[h]:.1f}% (cutoff {risk_cutoff_pct}%)")
        print("-" * 70)

        alerts = [
            {"disaster": h, "confidence": peak_conf[h],
             "duration": longest[h], "required": need}
            for h, need in REQUIRED_HOURS.items()
            if longest[h] >= need
        ]

        if not alerts:
            print("SAFE: no hazard lasted long enough to trigger a warning.")
            print("(Historical risk indicator only; follow official PAGASA/PHIVOLCS advisories.)")
            return {"status": "SAFE", "alerts": []}

        priority = ["Volcanic Lahar", "Flash Flood", "Cyclone / Typhoon", "Rain-Induced Landslide"]
        alerts.sort(key=lambda a: priority.index(a["disaster"]))

        for a in alerts:
            print(f"WARNING: {a['disaster'].upper()} | confidence {a['confidence']:.1f}% | "
                  f"{a['duration']}h in a row (needs {a['required']}h)")
        print("(Historical risk indicator only; follow official PAGASA/PHIVOLCS advisories.)")

        return {"status": "ALERT_ACTIVE", "primary_disaster": alerts[0]["disaster"], "alerts": alerts}

    except Exception as e:
        print(f"Forecast failed: {e}")
        return {"status": "ERROR", "alerts": [], "error": str(e)}


# ---------------------------------------------------------- evaluation ----
def evaluate(df):
    """Train on all but the last 5 years, test on the last 5. Compares the Random Forest
    with the plain average of the exact same date/hour in the training years."""
    clean = df.dropna(subset=DISPLAY_VARS).reset_index(drop=True)
    cutoff = clean["time"].max() - pd.DateOffset(years=5)
    train, test = clean[clean["time"] <= cutoff], clean[clean["time"] > cutoff]
    reg, mu, sd = fit_regressor(train)
    rf_pred = reg.predict(time_features(test["time"])) * sd + mu

    def key(d):
        return d["time"].dt.month * 10000 + d["time"].dt.day * 100 + d["time"].dt.hour

    avg = train.groupby(key(train))[DISPLAY_VARS].mean()
    base_pred = avg.reindex(key(test)).fillna(train[DISPLAY_VARS].mean()).to_numpy()

    print("Error on the last 5 years (mean absolute error, lower is better):")
    print(f"{'variable':<34}{'Random Forest':>14}{'50-yr average':>15}")
    for i, col in enumerate(DISPLAY_VARS):
        actual = test[col].to_numpy()
        print(f"{col:<34}{np.abs(actual - rf_pred[:, i]).mean():>14.3f}"
              f"{np.abs(actual - base_pred[:, i]).mean():>15.3f}")
    print("-" * 70)


if __name__ == "__main__":
    data = load_data(CSV_FILE_PATH)
    calibration = calibrate(data)
    if SHOW_CALIBRATION:
        print_calibration(calibration)
    if EVALUATE:
        evaluate(data)
    models = get_models(data, calibration)
    print_target_hour(models, hour_offset=12)
    if SHOW_DIAGNOSTICS:
        diagnose(models)
    run_forecast(models)