"""
Elexon BMRS API client with committed snapshot fallback and in-memory caching.
Ensures the service runs 100% reliably, instantaneously, and offline without hammering Elexon.
"""

import os
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import urllib.request
import urllib.parse

from app.config import settings
from app.models.schemas import FuelHHRecord, WindforRecord

logger = logging.getLogger(__name__)


class ElexonClient:
    def __init__(self):
        self._fuelhh_cache: Optional[List[FuelHHRecord]] = None
        self._windfor_cache: Optional[List[WindforRecord]] = None

    def _load_snapshot(self, path: str) -> List[dict]:
        if not os.path.exists(path):
            logger.warning(f"Snapshot not found at {path}")
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_fuelhh_actuals(self, force_refresh: bool = False) -> List[FuelHHRecord]:
        """
        Returns all FUELHH wind actual records for January 2026.
        """
        if self._fuelhh_cache is not None and not force_refresh:
            return self._fuelhh_cache

        records_raw = []
        if not force_refresh and os.path.exists(settings.FUELHH_SNAPSHOT_PATH):
            logger.info(f"Loading FUELHH actuals from snapshot: {settings.FUELHH_SNAPSHOT_PATH}")
            records_raw = self._load_snapshot(settings.FUELHH_SNAPSHOT_PATH)
        else:
            try:
                logger.info("Fetching fresh FUELHH actuals from live Elexon BMRS API...")
                params = urllib.parse.urlencode({
                    "settlementDateFrom": settings.JAN_2026_START,
                    "settlementDateTo": settings.JAN_2026_END,
                    "fuelType": "WIND"
                })
                url = f"{settings.ELEXON_API_BASE}/datasets/FUELHH/stream?{params}"
                req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "GridBricks/1.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    records_raw = json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                logger.error(f"Error fetching live FUELHH: {e}. Falling back to snapshot.")
                records_raw = self._load_snapshot(settings.FUELHH_SNAPSHOT_PATH)

        parsed = []
        for r in records_raw:
            if r.get("fuelType") == "WIND":
                try:
                    parsed.append(FuelHHRecord(
                        dataset=r.get("dataset", "FUELHH"),
                        publishTime=r["publishTime"],
                        startTime=r["startTime"],
                        settlementDate=r["settlementDate"],
                        settlementPeriod=int(r["settlementPeriod"]),
                        fuelType=r["fuelType"],
                        generation=float(r["generation"])
                    ))
                except Exception as ex:
                    logger.debug(f"Skipping malformed FUELHH record: {ex}")

        # Sort chronologically by startTime
        parsed.sort(key=lambda x: x.startTime)
        self._fuelhh_cache = parsed
        logger.info(f"Loaded {len(parsed)} validated FUELHH wind records.")
        return parsed

    def get_windfor_forecasts(self, force_refresh: bool = False) -> List[WindforRecord]:
        """
        Returns all WINDFOR forecast records relevant to January 2026.
        """
        if self._windfor_cache is not None and not force_refresh:
            return self._windfor_cache

        records_raw = []
        if not force_refresh and os.path.exists(settings.WINDFOR_SNAPSHOT_PATH):
            logger.info(f"Loading WINDFOR forecasts from snapshot: {settings.WINDFOR_SNAPSHOT_PATH}")
            records_raw = self._load_snapshot(settings.WINDFOR_SNAPSHOT_PATH)
        else:
            try:
                logger.info("Fetching fresh WINDFOR forecasts from live Elexon BMRS API...")
                params = urllib.parse.urlencode({
                    "publishDateTimeFrom": "2025-12-25T00:00:00Z",
                    "publishDateTimeTo": "2026-01-31T23:59:59Z"
                })
                url = f"{settings.ELEXON_API_BASE}/datasets/WINDFOR/stream?{params}"
                req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "GridBricks/1.0"})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    records_raw = json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                logger.error(f"Error fetching live WINDFOR: {e}. Falling back to snapshot.")
                records_raw = self._load_snapshot(settings.WINDFOR_SNAPSHOT_PATH)

        parsed = []
        for r in records_raw:
            try:
                parsed.append(WindforRecord(
                    dataset=r.get("dataset", "WINDFOR"),
                    publishTime=r["publishTime"],
                    startTime=r["startTime"],
                    generation=float(r["generation"])
                ))
            except Exception as ex:
                logger.debug(f"Skipping malformed WINDFOR record: {ex}")

        # Sort chronologically by startTime then publishTime
        parsed.sort(key=lambda x: (x.startTime, x.publishTime))
        self._windfor_cache = parsed
        logger.info(f"Loaded {len(parsed)} validated WINDFOR forecast records.")
        return parsed


# Global singleton instance
elexon_client = ElexonClient()
