"""
Script to fetch and snapshot January 2026 data from Elexon BMRS API.
Downloads FUELHH (actuals) and WINDFOR (forecasts) and saves them to local JSON snapshots.
Can be executed as a standalone script or called to refresh data.
"""

import os
import json
import logging
import urllib.request
import urllib.parse
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def fetch_stream(endpoint: str, params: dict, timeout: int = 60) -> list:
    query = urllib.parse.urlencode(params)
    url = f"{ELEXON_BASE_URL}{endpoint}?{query}"
    logger.info(f"Fetching from {url}...")
    headers = {
        "User-Agent": "GridBricks/1.0 (UK-Power-Trading-Evaluation)",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status} fetching {url}")
        content = resp.read().decode("utf-8")
        data = json.loads(content)
        logger.info(f"Successfully fetched {len(data)} records from {endpoint}")
        return data


def fetch_fuelhh_jan2026() -> list:
    """
    Fetches actual wind generation for all settlement dates in Jan 2026.
    48 periods per day * 31 days = 1,488 records.
    """
    logger.info("Fetching January 2026 FUELHH wind actuals...")
    params = {
        "settlementDateFrom": "2026-01-01",
        "settlementDateTo": "2026-01-31",
        "fuelType": "WIND",
    }
    records = fetch_stream("/datasets/FUELHH/stream", params)
    # Filter strictly for fuelType WIND just in case
    wind_records = [r for r in records if r.get("fuelType") == "WIND"]
    logger.info(f"Verified {len(wind_records)} WIND actuals.")
    return wind_records


def fetch_windfor_jan2026() -> list:
    """
    Fetches wind generation forecasts published from 2025-12-25 to 2026-01-31.
    Covers all Day-Ahead forecasts relevant to January 2026 delivery dates.
    """
    logger.info("Fetching WINDFOR forecasts relevant for January 2026...")
    # To avoid URL timeouts or payload size limits, we can fetch in two 18-day chunks or single call
    # In probe, 31 days returned ~18,000 records smoothly in ~12 seconds.
    params = {
        "publishDateTimeFrom": "2025-12-25T00:00:00Z",
        "publishDateTimeTo": "2026-01-31T23:59:59Z",
    }
    records = fetch_stream("/datasets/WINDFOR/stream", params, timeout=120)
    logger.info(f"Fetched {len(records)} total forecast records.")
    return records


def run_snapshot_download():
    os.makedirs(DATA_DIR, exist_ok=True)
    fuel_path = os.path.join(DATA_DIR, "snapshot_fuelhh_jan2026.json")
    wind_path = os.path.join(DATA_DIR, "snapshot_windfor_jan2026.json")

    actuals = fetch_fuelhh_jan2026()
    with open(fuel_path, "w", encoding="utf-8") as f:
        json.dump(actuals, f, indent=2)
    logger.info(f"Saved {len(actuals)} actuals to {fuel_path}")

    forecasts = fetch_windfor_jan2026()
    with open(wind_path, "w", encoding="utf-8") as f:
        json.dump(forecasts, f, indent=2)
    logger.info(f"Saved {len(forecasts)} forecasts to {wind_path}")

    print("\n=== SNAPSHOT SUMMARY ===")
    print(f"FUELHH Actuals: {len(actuals)} records -> {fuel_path}")
    print(f"WINDFOR Forecasts: {len(forecasts)} records -> {wind_path}")
    print("Snapshot successfully downloaded and ready for offline production use!\n")


if __name__ == "__main__":
    run_snapshot_download()
