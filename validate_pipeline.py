import os
import json
from datetime import datetime, timedelta
import numpy as np

# Load snapshots
DATA_DIR = os.path.join(os.path.dirname(__file__), 'backend', 'app', 'data')
fuel_path = os.path.join(DATA_DIR, 'snapshot_fuelhh_jan2026.json')
wind_path = os.path.join(DATA_DIR, 'snapshot_windfor_jan2026.json')

with open(fuel_path, 'r', encoding='utf-8') as f:
    raw_fuel = json.load(f)
with open(wind_path, 'r', encoding='utf-8') as f:
    raw_wind = json.load(f)

print(f"Loaded {len(raw_fuel)} FUELHH and {len(raw_wind)} WINDFOR records.")

def parse_utc(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))

# Filter strictly fuelType == WIND
fuel_wind = [r for r in raw_fuel if r.get('fuelType') == 'WIND']

# Aggregate FUELHH to hourly blocks (:00)
hourly_fuel = {}
for r in fuel_wind:
    dt = parse_utc(r['startTime'])
    h_dt = dt.replace(minute=0, second=0, microsecond=0)
    key = h_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    if key not in hourly_fuel:
        hourly_fuel[key] = {'00': None, '30': None, 'date': dt.strftime('%Y-%m-%d'), 'hour': dt.hour}
    if dt.minute == 0:
        hourly_fuel[key]['00'] = float(r['generation'])
    elif dt.minute == 30:
        hourly_fuel[key]['30'] = float(r['generation'])

for k, v in hourly_fuel.items():
    v0 = v['00']
    v30 = v['30']
    if v0 is not None and v30 is not None:
        v['avg'] = (v0 + v30) / 2.0
    elif v0 is not None:
        v['avg'] = v0
    elif v30 is not None:
        v['avg'] = v30
    else:
        v['avg'] = 0.0

# Function to run selection and matching with arbitrary cutoff hour and minute
def run_evaluation(cutoff_hour=11, cutoff_minute=0, shift_hours=0):
    # Group forecasts by target startTime
    by_target = {}
    for f in raw_wind:
        st = f['startTime']
        if st not in by_target:
            by_target[st] = []
        by_target[st].append(f)

    aligned = []
    for st_str, f_entry in sorted(hourly_fuel.items()):
        if not f_entry['date'].startswith('2026-01'):
            continue
        st_dt = parse_utc(st_str)
        # Apply shift if testing timestamp offset
        target_lookup_dt = st_dt + timedelta(hours=shift_hours)
        target_lookup_str = target_lookup_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

        delivery_date = st_dt.date()
        d_minus_1 = delivery_date - timedelta(days=1)
        cutoff_dt = datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, cutoff_hour, cutoff_minute, tzinfo=st_dt.tzinfo)

        candidates = by_target.get(target_lookup_str, [])
        valid = [c for c in candidates if parse_utc(c['publishTime']) <= cutoff_dt]

        if valid:
            valid.sort(key=lambda x: parse_utc(x['publishTime']))
            chosen = valid[-1]
            pt_dt = parse_utc(chosen['publishTime'])
            horizon = (st_dt - pt_dt).total_seconds() / 3600.0
            act = f_entry['avg']
            fc = float(chosen['generation'])
            err = fc - act
            aligned.append({
                'startTime': st_str,
                'targetLookup': target_lookup_str,
                'date': f_entry['date'],
                'hour': f_entry['hour'],
                'fuel00': f_entry['00'],
                'fuel30': f_entry['30'],
                'fuelAvg': act,
                'forecast': fc,
                'publishTime': chosen['publishTime'],
                'horizon': horizon,
                'error': err,
                'absError': abs(err),
            })
    return aligned

aligned_default = run_evaluation(11, 0, 0)
print(f"Total aligned default hours: {len(aligned_default)}")

# === CHECK 1: One full day (2026-01-15) ===
print("\n" + "="*80)
print("CHECK 1: FULL DAY PROFILE FOR 2026-01-15 (Default 11:00 UTC D-1 Cutoff)")
print("="*80)
print(f"{'Hour (UTC)':<10} | {'FUELHH :00':<11} | {'FUELHH :30':<11} | {'Actual Avg':<11} | {'WINDFOR Fc':<11} | {'Publish Time':<20} | {'Horizon (h)':<11} | {'Error (MW)':<10}")
print("-" * 105)
day_15 = [p for p in aligned_default if p['date'] == '2026-01-15']
for p in day_15:
    print(f"{p['hour']:02d}:00      | {p['fuel00']:>9.0f} MW | {p['fuel30']:>9.0f} MW | {p['fuelAvg']:>9.0f} MW | {p['forecast']:>9.0f} MW | {p['publishTime']:<20} | {p['horizon']:>9.1f} h | {p['error']:>+9.0f}")

# === CHECK 2: Daily mean actual, mean forecast, mean error for all 31 days ===
print("\n" + "="*80)
print("CHECK 2: DAILY SUMMARY FOR ALL 31 DAYS OF JANUARY 2026")
print("="*80)
print(f"{'Date':<12} | {'Mean Actual (MW)':<17} | {'Mean Forecast (MW)':<19} | {'Mean Error (Bias)':<18} | {'MAE (MW)':<10} | {'Hourly Over/Under'}")
print("-" * 88)
by_day = {}
for p in aligned_default:
    d = p['date']
    if d not in by_day:
        by_day[d] = []
    by_day[d].append(p)

positive_days = 0
negative_days = 0
for d in sorted(by_day.keys()):
    pts = by_day[d]
    mean_act = np.mean([p['fuelAvg'] for p in pts])
    mean_fc = np.mean([p['forecast'] for p in pts])
    mean_err = np.mean([p['error'] for p in pts])
    mae = np.mean([p['absError'] for p in pts])
    over_hours = sum(1 for p in pts if p['error'] > 0)
    under_hours = sum(1 for p in pts if p['error'] < 0)
    if mean_err > 0:
        positive_days += 1
    else:
        negative_days += 1
    print(f"{d:<12} | {mean_act:>15.1f} | {mean_fc:>17.1f} | {mean_err:>+16.1f} | {mae:>8.1f} | {over_hours:>2d} over / {under_hours:>2d} under")

print(f"\nTotal Days: {len(by_day)}. Positive Bias Days: {positive_days}, Negative Bias Days: {negative_days}")

# === CHECK 3: Timestamps & Time-shift sensitivity (+/- 1 hour, +/- 2 hours) ===
print("\n" + "="*80)
print("CHECK 3: TIMESTAMP SENSITIVITY TEST (Shifting Join by +/- 1h and +/- 2h)")
print("="*80)
for s in [-2, -1, 0, +1, +2]:
    shifted = run_evaluation(11, 0, shift_hours=s)
    errs = [p['error'] for p in shifted]
    abs_errs = [p['absError'] for p in shifted]
    bias = np.mean(errs)
    mae = np.mean(abs_errs)
    rmse = np.sqrt(np.mean(np.array(errs)**2))
    print(f"Shift {s:+2d} hour(s) -> Bias: {bias:>+8.1f} MW | MAE: {mae:>7.1f} MW | RMSE: {rmse:>7.1f} MW (evaluated {len(shifted)} hours)")

# === CHECK 5: Horizon Validity & Cutoff Leakage ===
print("\n" + "="*80)
print("CHECK 5: HORIZON VALIDITY & CUTOFF LEAKAGE CHECK")
print("="*80)
horizons = [p['horizon'] for p in aligned_default]
min_h = min(horizons)
max_h = max(horizons)
negative_horizons = [h for h in horizons if h <= 0]
print(f"Min horizon: {min_h:.1f} hours, Max horizon: {max_h:.1f} hours, Average: {np.mean(horizons):.1f} hours")
print(f"Negative or zero horizons count: {len(negative_horizons)}")

# Check for leakage past cutoff
leakage_count = 0
for p in aligned_default:
    st_dt = parse_utc(p['startTime'])
    d_minus_1 = st_dt.date() - timedelta(days=1)
    cutoff_dt = datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 11, 0, tzinfo=st_dt.tzinfo)
    pt_dt = parse_utc(p['publishTime'])
    if pt_dt > cutoff_dt:
        leakage_count += 1
print(f"Forecasts published AFTER cutoff used: {leakage_count}")

# === CHECK 6: Snapshot Integrity (Gaps or Duplicates) ===
print("\n" + "="*80)
print("CHECK 6: SNAPSHOT INTEGRITY (GAPS OR DUPLICATES)")
print("="*80)
print(f"Total FUELHH WIND records: {len(fuel_wind)}")
fuel_start_times = [r['startTime'] for r in fuel_wind]
print(f"Unique FUELHH startTimes: {len(set(fuel_start_times))} (expected 1488: 31 days * 48 periods)")
assert len(fuel_wind) == len(set(fuel_start_times)), "DUPLICATES IN FUELHH!"

# Check FUELHH count per day
fuel_by_day = {}
for r in fuel_wind:
    d = r['settlementDate']
    fuel_by_day[d] = fuel_by_day.get(d, 0) + 1
day_counts_fuel = set(fuel_by_day.values())
print(f"Settlement periods per day in FUELHH: {day_counts_fuel} across {len(fuel_by_day)} days (should be {set([48])})")

# Check WINDFOR targets
wind_targets = set(r['startTime'] for r in raw_wind if r['startTime'].startswith('2026-01'))
print(f"Unique January 2026 target hours in WINDFOR: {len(wind_targets)} (expected 744: 31 days * 24 hours)")

# === ALTERNATIVE CUTOFF COMPARISON ===
print("\n" + "="*80)
print("ALTERNATIVE CUTOFF COMPARISON (09:20, 11:00, 12:00, 17:00 UTC D-1)")
print("="*80)
print(f"{'Cutoff Time':<25} | {'MAE (MW)':<10} | {'RMSE (MW)':<10} | {'Bias (MW)':<10} | {'WAPE (%)':<10} | {'P50 (MW)':<10} | {'P90 (MW)':<10} | {'Avg Horizon'}")
print("-" * 105)
for c_h, c_m, label in [
    (9, 20, "09:20 UTC (EPEX 30m)"),
    (11, 0, "11:00 UTC (EPEX/Nord 60m)"),
    (12, 0, "12:00 UTC (Post-Auction)"),
    (17, 0, "17:00 UTC (Evening Gate)"),
]:
    res = run_evaluation(c_h, c_m, 0)
    errs = np.array([p['error'] for p in res])
    abs_errs = np.array([p['absError'] for p in res])
    acts = np.array([p['fuelAvg'] for p in res])
    horizs = [p['horizon'] for p in res]
    mae = float(np.mean(abs_errs))
    rmse = float(np.sqrt(np.mean(errs**2)))
    bias = float(np.mean(errs))
    wape = float(np.sum(abs_errs) / np.sum(acts) * 100.0)
    p50 = float(np.percentile(abs_errs, 50))
    p90 = float(np.percentile(abs_errs, 90))
    avg_h = float(np.mean(horizs))
    print(f"{label:<25} | {mae:>8.1f} | {rmse:>8.1f} | {bias:>+8.1f} | {wape:>8.2f}% | {p50:>8.1f} | {p90:>8.1f} | {avg_h:>7.1f} h")
