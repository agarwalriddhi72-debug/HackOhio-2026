import os
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

# Handle timezone localization cleanly depending on Python build version
try:
    from zoneinfo import ZoneInfo
    PH_TZ = ZoneInfo("Asia/Manila")
except ImportError:
    import pytz # type: ignore
    PH_TZ = pytz.timezone("Asia/Manila")

# === CONFIGURATION ===
CSV_FILE_PATH = "PastWeather.csv" # Ensure this file is in your local directory

def load_and_clean_data(file_path):
    print("Loading 50-year hourly weather dataset...")
    df = pd.read_csv(file_path, skiprows=3)
    df.columns = [c.strip() for c in df.columns]
    df['time'] = pd.to_datetime(df['time'])
    df = df.sort_values('time').reset_index(drop=True)
    return df

def train_forecasting_engine(df):
    print("Preparing 12-hour lag features for training...")
    
    core_features = [
        'temperature_2m (°C)', 'relative_humidity_2m (%)', 'dew_point_2m (°C)',
        'apparent_temperature (°C)', 'precipitation (mm)', 'rain (mm)',
        'pressure_msl (hPa)', 'surface_pressure (hPa)', 'cloud_cover (%)',
        'wind_speed_10m (km/h)', 'wind_gusts_10m (km/h)',
        'soil_temperature_0_to_7cm (°C)', 'soil_moisture_0_to_7cm (m³/m³)'
    ]
    
    target_cols = [f"target_{col}" for col in core_features]
    for col in core_features:
        df[f"target_{col}"] = df[col].shift(-12)
        
    train_df = df.dropna().copy()
    X = train_df[core_features]
    y = train_df[target_cols]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, random_state=42)
    
    print("Training Multi-Output Random Forest Regressor for 12-hour windows...")
    model = RandomForestRegressor(n_estimators=50, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    print(f"Model Baseline R² Accuracy: {model.score(X_test, y_test) * 100:.2f}%")
    
    joblib.dump(model, "hourly_12h_weather_forecaster.pkl")
    joblib.dump(core_features, "feature_list_12h.pkl")
    print("Saved 12-hour training artifacts locally.")
    return model, core_features

def run_timeline_prediction_and_matching(df, model, core_features, confidence_floor=60.0):
    try:
        raw_time = datetime.now(PH_TZ).replace(tzinfo=None)
        
        if raw_time.minute <= 30:
            current_time = raw_time.replace(minute=0, second=0, microsecond=0)
        else:
            current_time = (raw_time + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        
        print(f"\n⏱️  Philippines System Clock Time : {raw_time.strftime('%Y-%m-%d %I:%M:%S %p')}")
        print(f"🎯 Rounded Baseline Prediction Hour: {current_time.strftime('%Y-%m-%d %I:%M %p')}")
        print(f"⏳ GENERATING CONTINUOUS 12-HOUR FORECAST TIMELINE MATRIX...")
        print("-" * 75)

        consecutive_danger_hours = {
            "Cyclone / Typhoon": 0, "Flash Flood": 0, "Volcanic Lahar": 0, "Rain-Induced Landslide": 0
        }
        max_confidences_detected = {
            "Cyclone / Typhoon": 0.0, "Flash Flood": 0.0, "Volcanic Lahar": 0.0, "Rain-Induced Landslide": 0.0
        }
        
        target_12h_metrics = {}

        for hour_offset in range(1, 13):
            loop_search_time = current_time + timedelta(hours=hour_offset)
            current_row = df[(df['time'].dt.month == loop_search_time.month) & 
                             (df['time'].dt.day == loop_search_time.day) & 
                             (df['time'].dt.hour == loop_search_time.hour)].head(1)
            
            if current_row.empty:
                continue

            live_inputs = current_row[core_features]
            predicted_array = model.predict(live_inputs)[0] # FIXED: Unpacks nesting row safely right here
            
            predictions_dict = {col: float(predicted_array[idx]) for idx, col in enumerate(core_features)}
            
            if hour_offset == 12:
                target_12h_metrics = predictions_dict
            
            gusts = predictions_dict.get('wind_gusts_10m (km/h)', 0)
            pressure = predictions_dict.get('pressure_msl (hPa)', 1013)
            rain = predictions_dict.get('rain (mm)', 0)
            wind_speed = predictions_dict.get('wind_speed_10m (km/h)', 0)
            clouds = predictions_dict.get('cloud_cover (%)', 0)
            soil_moist = predictions_dict.get('soil_moisture_0_to_7cm (m³/m³)', 0)
            soil_temp = predictions_dict.get('soil_temperature_0_to_7cm (°C)', 25)
            apparent_temp = predictions_dict.get('apparent_temperature (°C)', 30)
            humidity = predictions_dict.get('relative_humidity_2m (%)', 0)

            typhoon_score = ((0 if gusts < 39 else (50 if gusts <= 60 else 100)) * 0.35) + \
                            ((0 if pressure > 1005 else (50 if pressure >= 990 else 100)) * 0.30) + \
                            ((0 if rain < 15 else (50 if rain <= 50 else 100)) * 0.20) + \
                            ((0 if wind_speed < 30 else (50 if wind_speed <= 50 else 100)) * 0.10) + \
                            ((0 if clouds < 50 else (50 if clouds <= 80 else 100)) * 0.05)

            flood_score = ((0 if rain < 15 else (50 if rain <= 50 else 100)) * 0.90) + \
                          ((0 if humidity < 85 else 100) * 0.10)

            lahar_score = ((0 if rain < 15 else (50 if rain <= 40 else 100)) * 0.50) + \
                          ((0 if soil_moist < 0.40 else (50 if soil_moist <= 0.48 else 100)) * 0.40) + \
                          ((0 if soil_temp > 25.0 else 100) * 0.10)

            landslide_score = ((0 if soil_moist < 0.45 else (50 if soil_moist <= 0.52 else 100)) * 0.50) + \
                              ((0 if rain < 15 else (50 if rain <= 30 else 100)) * 0.40) + \
                              ((0 if apparent_temp > 28.5 else 100) * 0.10)

            hourly_scores = {
                "Cyclone / Typhoon": typhoon_score, "Flash Flood": flood_score,
                "Volcanic Lahar": lahar_score, "Rain-Induced Landslide": landslide_score
            }

            for hazard, score in hourly_scores.items():
                if score >= confidence_floor:
                    consecutive_danger_hours[hazard] += 1
                    if score > max_confidences_detected[hazard]:
                        max_confidences_detected[hazard] = score
                else:
                    if hazard not in ["Volcanic Lahar", "Flash Flood"]:
                        consecutive_danger_hours[hazard] = 0

        future_target_str = (current_time + timedelta(hours=12)).strftime('%Y-%m-%d %I:%M %p')
        print(f"\n🔮 PREDICTED WEATHER VARIABLE VALUES FOR TARGET TIME ({future_target_str}):")
        print("-" * 75)
        for col, val in target_12h_metrics.items():
            print(f"-> {col:<40} : {val:.2f}")

        official_alerts_to_trigger = []
        
        if consecutive_danger_hours["Volcanic Lahar"] >= 1:
            official_alerts_to_trigger.append({"disaster": "Volcanic Lahar", "confidence": max_confidences_detected["Volcanic Lahar"], "duration": consecutive_danger_hours["Volcanic Lahar"], "required": 1})
        if consecutive_danger_hours["Flash Flood"] >= 1:
            official_alerts_to_trigger.append({"disaster": "Flash Flood", "confidence": max_confidences_detected["Flash Flood"], "duration": consecutive_danger_hours["Flash Flood"], "required": 1})
        if consecutive_danger_hours["Cyclone / Typhoon"] >= 3:
            official_alerts_to_trigger.append({"disaster": "Cyclone / Typhoon", "confidence": max_confidences_detected["Cyclone / Typhoon"], "duration": consecutive_danger_hours["Cyclone / Typhoon"], "required": 3})
        if consecutive_danger_hours["Rain-Induced Landslide"] >= 3:
            official_alerts_to_trigger.append({"disaster": "Rain-Induced Landslide", "confidence": max_confidences_detected["Rain-Induced Landslide"], "duration": consecutive_danger_hours["Rain-Induced Landslide"], "required": 3})

        print("\n🚨 OFFICIAL ADVANCED SUSTAINED HAZARD WARNING MONITOR REPORT:")
        print("-" * 75)
        print("📈 Timeline Peak Calculated Disaster Match Values:")
        print(f"   - Volcanic Lahar Match             : {max_confidences_detected['Volcanic Lahar']:.1f}% (Sustained: {consecutive_danger_hours['Volcanic Lahar']}h)")
        print(f"   - Flash Flood Match                : {max_confidences_detected['Flash Flood']:.1f}% (Sustained: {consecutive_danger_hours['Flash Flood']}h)")
        print(f"   - Cyclone / Typhoon Match          : {max_confidences_detected['Cyclone / Typhoon']:.1f}% (Sustained: {consecutive_danger_hours['Cyclone / Typhoon']}h)")
        print(f"   - Rain-Induced Landslide Match     : {max_confidences_detected['Rain-Induced Landslide']:.1f}% (Sustained: {consecutive_danger_hours['Rain-Induced Landslide']}h)")
        print("-" * 75)

        if not official_alerts_to_trigger:
            print("✅ SYSTEM MATRIX SAFE: Risks detected did not maintain continuous duration thresholds.")
            return {"status": "SAFE", "active_warnings": []}

        priority_order = ["Volcanic Lahar", "Flash Flood", "Cyclone / Typhoon", "Rain-Induced Landslide"]
        official_alerts_to_trigger.sort(key=lambda x: priority_order.index(x["disaster"]))

        for alert in official_alerts_to_trigger:
            print(f"🚨 DECLARING OFFICIAL CRITICAL WARNING: [{alert['disaster'].upper()}]")
            print(f"   ▶ Status Type        : BREACHED SUSTAINED HAZARD THRESHOLD")
            print(f"   ▶ Match Intensity   : {alert['confidence']:.1f}%")
            print(f"   ▶ Danger Duration   : {alert['duration']} Hours consecutive (Requires min: {alert['required']}h)")
            print(f"   -----------------------------------------------------------------------")

        return {
            "status": "ALERT_ACTIVE",
            "primary_disaster": official_alerts_to_trigger[0]["disaster"], 
            "all_active_alerts": official_alerts_to_trigger
        }
    except Exception as e:
        print(f"❌ Forecast pipeline failed: {e}")
        return {"status": "ERROR", "active_warnings": [], "error": str(e)}

if __name__ == "__main__":
    df = load_and_clean_data(CSV_FILE_PATH)
    if os.path.exists("hourly_12h_weather_forecaster.pkl"):
        model = joblib.load("hourly_12h_weather_forecaster.pkl")
        core_features = joblib.load("feature_list_12h.pkl")
    else:
        model, core_features = train_forecasting_engine(df)
    result = run_timeline_prediction_and_matching(df, model, core_features)
