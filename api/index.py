"""
Vercel Serverless Function entrypoint for GridBricks Day-Ahead Wind Evaluation API.
Exposes the FastAPI application instance for Vercel's Python runtime.
"""

import sys
import os

# Ensure the backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Import existing FastAPI app instance
from app.main import app

# Pre-warm in-memory cache on lambda container initialization
# Guarantees that cold-start loads the JSON snapshots once,
# so subsequent requests serve in < 1ms from RAM.
from app.services.elexon_client import elexon_client
from app.services.forecast_engine import forecast_engine
from app.services.metrics_engine import metrics_engine
from app.api.routes import compute_cutoff_comparisons

try:
    _actuals = elexon_client.get_fuelhh_actuals()
    _forecasts = elexon_client.get_windfor_forecasts()
    # Pre-align default 09:50 UTC cutoff and precompute comparisons
    _default_aligned = forecast_engine.align_and_evaluate(
        _actuals, _forecasts, cutoff_hour=9, cutoff_minute=50
    )
    metrics_engine.compute_summary_metrics(_default_aligned)
    compute_cutoff_comparisons()
except Exception as e:
    import logging
    logging.getLogger("uvicorn").warning(f"Vercel serverless pre-warm note: {e}")
