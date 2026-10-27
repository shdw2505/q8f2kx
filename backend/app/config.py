"""
Application configuration for GridBricks Day-Ahead Wind Evaluation Service.
"""

import os
from pydantic import BaseModel


class Settings(BaseModel):
    # UK Wholesale Electricity Day-Ahead Gate Closures:
    # 09:50 UTC on D-1: N2EX day-ahead hourly auction order book gate closure (Nord Pool).
    # 09:20 UTC on D-1: EPEX SPOT GB Day-Ahead 60-minute auction gate closure.
    # 11:00 UTC on D-1: Continental European Single Day-Ahead Coupling (SDAC) close (for comparison).
    # 12:00 UTC on D-1: Later cutoff, comparison only (not a GB auction gate).
    # Default assumption: 09:50 UTC on D-1 based on secondary published schedules (Nord Pool, Modo Energy).
    DEFAULT_CUTOFF_HOUR: int = 9
    DEFAULT_CUTOFF_MINUTE: int = 50
    DEFAULT_CUTOFF_NAME: str = "09:50 UTC (N2EX Day-Ahead Hourly Auction Gate Closure - Default)"

    # Base directory and data snapshots
    APP_DIR: str = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR: str = os.path.join(APP_DIR, "data")
    FUELHH_SNAPSHOT_PATH: str = os.path.join(DATA_DIR, "snapshot_fuelhh_jan2026.json")
    WINDFOR_SNAPSHOT_PATH: str = os.path.join(DATA_DIR, "snapshot_windfor_jan2026.json")

    # Elexon BMRS API
    ELEXON_API_BASE: str = "https://data.elexon.co.uk/bmrs/api/v1"

    # Default Target Window: January 2026
    JAN_2026_START: str = "2026-01-01"
    JAN_2026_END: str = "2026-01-31"

    # MAPE protection floor in MW to prevent division by zero / extreme skew during calm wind periods
    MAPE_FLOOR_MW: float = 100.0


settings = Settings()
