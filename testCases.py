"""
Finds dates and times that trigger a warning in future1.py, WITHOUT editing future1.py.

  python test_dates.py            scan the next 60 days (default)
  python test_dates.py 120        scan the next 120 days
  python test_dates.py run "2026-12-22 23:00"       replay future1.py as if "now" were that Manila time
  python test_dates.py run "2026-12-22 23:00" 3     same, with a 3% risk cutoff

How it works: it asks the trained Random Forest for the predicted hazard risk of every
hour in the period, then applies the same rule as future1.py (the risk must stay at or
above the cutoff for the required number of hours in a row, inside the +12h to +24h
window). For each disaster it lists up to 4 different dates where a warning would fire.

If a disaster never reaches the normal 10% cutoff, it uses the highest lower cutoff that
still gives at least 3 dates, and tells you which cutoff each disaster uses.

Run it from the folder that contains future1.py and PastWeather.csv.
"""

import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

import future1 as f

WINDOW = 13                            # hours checked by run_forecast: +12h .. +24h
DEFAULT_CUTOFF = 10                    # same default as future1.py
FALLBACK_CUTOFFS = [5, 3, 2, 1, 0.5, 0.2, 0.1]


def load_models():
    data = f.load_data(f.CSV_FILE_PATH)
    return f.get_models(data, f.calibrate(data))


def hourly_risk(bundle, hours):
    """Predicted risk (%) of every hazard for every hour in `hours`."""
    clf = bundle["clf"]
    proba = clf.predict_proba(f.time_features(hours))
    out = {}
    for k, hazard in enumerate(f.HAZARDS):
        classes = list(clf.classes_[k])
        out[hazard] = proba[k][:, classes.index(1)] * 100 if 1 in classes else np.zeros(len(hours))
    return out


def best_sustained(risk, need):
    """For each possible "now" s: the highest cutoff c such that `need` hours in a row are all
    >= c somewhere in the +12h..+24h window."""
    run_min = pd.Series(risk).rolling(need).min()                  # lowest risk of `need` hours ending here
    best = run_min.rolling(WINDOW - need + 1).max().shift(-24)     # best run ending inside the window
    return best.to_numpy()


def choose_cutoff(day_max, want):
    """Highest cutoff that gives at least `want` different days; otherwise the lowest one that gives any."""
    candidates = [DEFAULT_CUTOFF] + FALLBACK_CUTOFFS
    for c in candidates:
        if (day_max >= c).sum() >= want:
            return c
    return candidates[-1] if (day_max >= candidates[-1]).any() else None


def pick_days(day_max, cutoff, how_many, min_gap_days):
    """Best days first, spread apart when possible."""
    ranked = list(day_max[day_max >= cutoff].sort_values(ascending=False).index)
    chosen = []
    for day in ranked:
        if all(abs((day - d).days) >= min_gap_days for d in chosen):
            chosen.append(day)
        if len(chosen) == how_many:
            break
    for day in ranked:  # not enough spread-out days: fill up with the next best ones
        if len(chosen) == how_many:
            break
        if day not in chosen:
            chosen.append(day)
    return sorted(chosen)


def scan(days=60, picks=4, min_gap_days=2, want=3):
    bundle = load_models()
    now = f.datetime.now(f.PH_TZ).replace(tzinfo=None)
    start = (now + timedelta(minutes=30)).replace(minute=0, second=0, microsecond=0)
    n_starts = days * 24
    hours = pd.date_range(start, periods=n_starts + 24, freq="h")
    risks = hourly_risk(bundle, hours)
    starts = hours[:n_starts]
    start_days = starts.normalize()

    print(f"\nScanning predicted risk for the next {days} days "
          f"({start:%b %d} to {hours[-1]:%b %d}), Manila time.")
    print("Each 'now' below is a clock time at which future1.py would declare a warning.")
    print(f"Cutoffs under {DEFAULT_CUTOFF}% are lowered for the demo, and each disaster shows the one it uses.\n")

    for hazard in f.HAZARDS:
        need = f.REQUIRED_HOURS[hazard]
        b = best_sustained(risks[hazard], need)[:n_starts]
        series = pd.Series(b, index=starts)
        grouped = series.groupby(start_days)
        day_max, day_when = grouped.max(), grouped.idxmax()

        cutoff = choose_cutoff(day_max, want)
        if cutoff is None:
            print(f"{hazard}  (needs {need}h in a row)")
            print(f"  no date in this period reaches even {FALLBACK_CUTOFFS[-1]}% "
                  f"(try a longer period, for example: python test_dates.py 365)\n")
            continue

        note = "normal cutoff" if cutoff == DEFAULT_CUTOFF else "lowered for the demo"
        print(f"{hazard}  (needs {need}h in a row)  |  cutoff {cutoff:g}% ({note})")
        arg = "" if cutoff == DEFAULT_CUTOFF else f" {cutoff:g}"
        for i, day in enumerate(pick_days(day_max, cutoff, picks, min_gap_days), 1):
            when = day_when[day]
            ok = starts[(start_days == day) & (b >= cutoff)]
            print(f"  {i}) now = {when:%a %b %d %Y %H:%M}   sustained risk {day_max[day]:.1f}%   "
                  f"(also works {ok[0]:%H:%M} to {ok[-1]:%H:%M} that day)")
            print(f"     python test_dates.py run \"{when:%Y-%m-%d %H:%M}\"{arg}")
        print()


def run_at(when, cutoff=None):
    fake_now = datetime.strptime(when, "%Y-%m-%d %H:%M").replace(tzinfo=f.PH_TZ)

    class FakeDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fake_now

    f.datetime = FakeDateTime  # future1 now believes it is `when` in Manila
    bundle = load_models()
    f.print_target_hour(bundle, 12)
    if cutoff is None:
        f.run_forecast(bundle)
    else:
        f.run_forecast(bundle, risk_cutoff_pct=cutoff)


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        scan()
    elif args[0].isdigit():
        scan(days=int(args[0]))
    elif args[0] == "run" and len(args) >= 2:
        run_at(args[1], float(args[2]) if len(args) > 2 else None)
    else:
        print(__doc__)