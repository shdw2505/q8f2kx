# GridBricks: UK Day-Ahead Wind Power Forecast Evaluation

A single-service web application built for a UK energy utility's day-ahead power trading desk. It evaluates the accuracy of National Energy System Operator (NESO) national wind generation forecasts (`WINDFOR`) against actual settlement generation (`FUELHH`) for January 2026, enforcing day-ahead decision gate closures with no forecast published after the cutoff is used.

---

## Live Demo & Repository
- Deployed Application: [TBD - https://<project-name>.vercel.app]
- Source Repository: [TBD - GitHub repository URL]

---

## AI Usage
- **Development Tool**: Google Antigravity
- **Exact Model Used**: Gemini 3.8 Flash (High)
- **Review & Feedback**: Claude (Anthropic) was used for planning review, feedback critique, and verification checks.

---

## My Contributions
[Author to complete this section]

---

## Quick Start: Local Run

> **Note on Docker**: Docker and docker-compose are maintained for local single-container execution and automated GitHub Actions CI builds. Production deployment runs on Vercel's free serverless architecture.

### Option A: Local Docker (Recommended)
Run the single unified container (builds React frontend and serves via FastAPI):
```bash
docker compose up --build
```
Open `http://localhost:8000` in your browser.

### Option B: Local Run Without Docker as a Single Service
Build the frontend once, then run FastAPI from `backend/` to serve both the API and the static frontend from port 8000:
```bash
# 1. Build the frontend production bundle
cd frontend
npm install
npm run build

# 2. Start the unified FastAPI backend from the backend directory
cd ../backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open `http://localhost:8000` in your browser.

### Option C: Local Non-Docker Development (Hot Reloading)

1. **Backend**:
```bash
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

2. **Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. (Vite proxies `/api/v1` to `http://localhost:8000`).

3. **Running Automated Tests**:
Run pytest from the repository root:
```bash
# Linux/macOS:
PYTHONPATH=backend pytest backend/tests -v

# Windows PowerShell:
$env:PYTHONPATH="backend"; pytest backend/tests -v
```

> **Testing Verification Note**: `vercel dev` was not run locally (the Vercel CLI was not pre-installed in the development environment). Local verification was performed by running the unified FastAPI server against the built static assets, executing the 15-test automated pytest suite, and verifying programmatic ASGI route resolution.

---

## Repository Structure

```text
.
├── .dockerignore                            # Excludes venv, node_modules, tests, and caches from Docker context
├── .gitignore                               # Ignores Python bytecode, venv, node_modules, build outputs, and docx
├── .vercelignore                            # Excludes dev venv, node_modules, tests, and docs from Vercel deployment
├── vercel.json                              # Vercel deployment config (Edge static hosting + serverless function)
├── Dockerfile                               # Multi-stage build: Node 20 (React build) + Python 3.11-slim (FastAPI runtime)
├── docker-compose.yml                       # Single-service container configuration mapping port 8000:8000
├── validate_pipeline.py                     # Diagnostic script verifying data joins, timestamps, and bias across Jan 2026
├── .github/
│   └── workflows/
│       └── docker-build.yml                 # GitHub Actions CI running pytest and verifying Docker build
├── docs/
│   └── ARCHITECTURE.md                      # Technical reference, auction gate citations, alignment math, and video script
├── api/
│   ├── index.py                             # Vercel serverless Python entrypoint exposing FastAPI with pre-warming
│   └── requirements.txt                     # Lean serverless runtime dependencies (fastapi, pydantic, numpy, requests)
├── backend/
│   ├── requirements.txt                     # Full backend dependencies (fastapi, uvicorn, pydantic, numpy, requests, pytest)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                        # Settings: 09:50 UTC default cutoff, snapshot paths, MAPE floor
│   │   ├── main.py                          # FastAPI application entrypoint, CORS configuration, and static mount
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py                    # REST API endpoints (/health, /forecasts, /metrics, /cutoffs, /summary)
│   │   ├── data/
│   │   │   ├── snapshot_fuelhh_jan2026.json # Committed snapshot: 1,488 half-hourly WIND actuals (Jan 2026)
│   │   │   └── snapshot_windfor_jan2026.json# Committed snapshot: 22,192 hourly wind generation forecasts (Jan 2026)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py                   # Pydantic v2 data models for records, metrics, and summaries
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── elexon_client.py             # Loads committed snapshots with optional live BMRS API re-fetch
│   │       ├── fetch_snapshot.py            # Standalone utility script to fetch and update committed JSON snapshots
│   │       ├── forecast_engine.py           # Alignment engine: cutoff filtering, lead time, P50/P90 bands, rolling bias
│   │       └── metrics_engine.py            # Single source of truth for MAE, RMSE, Bias, WAPE, MAPE, and summary text
│   └── tests/
│       ├── test_api_endpoints.py            # Integration tests for REST API endpoints and schema responses
│       ├── test_forecast_engine.py          # Unit tests: hourly aggregation, cutoff selection, zero leakage test
│       └── test_metrics_engine.py           # Unit tests: metric mathematics, guarded MAPE, and trading text
└── frontend/
    ├── index.html                           # Single-page application root HTML
    ├── package.json                         # Frontend dependencies (React 18, Vite, Tailwind CSS, Recharts, Lucide)
    ├── package-lock.json                    # Lockfile for reproducible npm installs
    ├── postcss.config.js                    # PostCSS plugins for Tailwind CSS
    ├── tailwind.config.js                   # Tailwind styling configuration
    ├── tsconfig.json                        # TypeScript compiler options
    ├── tsconfig.node.json                   # TypeScript configuration for Vite tooling
    ├── vite.config.ts                       # Vite configuration proxying /api/v1 to http://localhost:8000
    └── src/
        ├── App.tsx                          # Root React view managing state, API polling, and layout
        ├── main.tsx                         # React DOM mount entrypoint
        ├── index.css                        # Global CSS styles and Tailwind layers
        ├── vite-env.d.ts                    # Vite client type definitions
        ├── types/
        │   └── index.ts                     # TypeScript interfaces matching backend Pydantic schemas
        ├── services/
        │   └── api.ts                       # API fetch wrapper for backend endpoints (relative /api/v1 paths)
        └── components/
            ├── Header.tsx                   # Top navigation bar and status indicators
            ├── Controls.tsx                 # Auction gate cutoff selector, date range filters, and feature toggles
            ├── MetricCards.tsx              # KPI overview cards (MAE, WAPE, Bias, RMSE, P50, P90)
            ├── TraderInsight.tsx            # Quantitative trading guidance and peak hour risk assessment
            ├── CutoffComparisonTable.tsx    # Side-by-side comparison table of alternative decision cutoffs
            ├── TimeSeriesChart.tsx          # Main chart: actuals, forecast, P50/P90 bands, adjusted forecast
            ├── ErrorDistributionChart.tsx   # Error histogram showing distribution of over/under-forecasting
            ├── HourlyErrorChart.tsx         # Diurnal error breakdown across clock hours 0-23 UTC
            └── HorizonErrorChart.tsx        # Error degradation across lead time horizon buckets
```

---

## Data Sources & Alignment

- **Actuals (`FUELHH` stream)**:
  - Half-hourly outturn generation by fuel type from Elexon BMRS.
  - Filter: `fuelType == "WIND"`.
  - Resolution: 30 minutes (`startTime` at `:00` and `:30`).
- **Forecasts (`WINDFOR` stream)**:
  - National wind generation forecasts published by NESO.
  - Resolution: Hourly (`startTime` at `:00`).
  - Published roughly every 2-4 hours (for example 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30); times can shift, e.g. a batch was published at 12:25 on 2026-01-15.
- **Time Alignment**:
  - Because `WINDFOR` forecasts average generation over a 60-minute window starting at T:00, the corresponding actual generation outturn is the average of the two half-hourly periods:
    Actual(T:00) = (FUELHH(T:00) + FUELHH(T:30)) / 2
- **Offline Snapshot**:
  - The repository includes committed JSON snapshots of all January 2026 data in `backend/app/data/` (1,488 actual records, 22,192 forecast records). The application runs offline without external API rate limits.
  - An optional refresh script (`python backend/app/services/fetch_snapshot.py`) is included to fetch fresh data if desired.

---

## Day-Ahead Decision Gate Closure

In Great Britain wholesale electricity markets, day-ahead physical auctions close on day D-1:
- **Default Assumption: 09:50 UTC on D-1**:
  - Based on published schedules for the N2EX Day-Ahead Hourly auction order book deadline (Nord Pool "About the N2EX day-ahead auction" support page; Modo Energy GB wholesale markets explainer).
  - These citations represent published schedules from secondary industry sources, not an official statutory rulebook. The gate time is kept fully configurable in the application.
- **Selectable Alternative Cutoffs**:
  - `09:20 UTC`: EPEX SPOT GB 60-minute day-ahead auction order book deadline.
  - `11:00 UTC`: Continental European Single Day-Ahead Coupling (SDAC) close (12:00 CET), for comparison only.
  - `12:00 UTC`: Later cutoff, comparison only (not a GB auction gate).
- **Why 09:50 UTC and 11:00 UTC Produce Identical Metrics**:
  - NESO publishes forecast batches roughly every 2-4 hours (for example 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30); times can shift, e.g. a batch was published at 12:25 on 2026-01-15.
  - At 09:50 UTC, the latest available batch is 09:30 UTC.
  - At 11:00 UTC, the 11:30 UTC batch is not yet published, so 09:30 UTC remains the latest available batch.
  - All 744 hours select the 09:30 batch under both cutoffs.
- **Cutoff Filter Rule**:
  - For any delivery hour on day D, the system strictly selects the latest forecast published on or before (D-1 at H_cutoff). No forecast published after the cutoff is used. Lead times range between 14.5 and 37.5 hours.

### Cutoff Comparison Across January 2026 (All 744 Hours)

| Cutoff Gate (D-1) | Selected WINDFOR Batch | Avg Horizon | MAE (MW) | RMSE (MW) | Bias (MW) | WAPE (%) | P50 (MW) | P90 (MW) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **09:20 UTC (EPEX SPOT GB 60-min)** | 07:30 UTC (744h) | 28.0 h | 2,142.1 | 2,611.7 | +1,851.9 | 18.50% | 1,787.8 | 4,300.2 |
| **09:50 UTC (N2EX Hourly - Assumed Default)** | 09:30 UTC (744h) | 26.0 h | 2,122.8 | 2,616.7 | +1,840.3 | 18.33% | 1,714.0 | 4,312.4 |
| **11:00 UTC (Continental SDAC, comparison only)** | 09:30 UTC (744h) | 26.0 h | 2,122.8 | 2,616.7 | +1,840.3 | 18.33% | 1,714.0 | 4,312.4 |
| **12:00 UTC (Later cutoff, comparison only - not a GB auction gate)** | 11:30 UTC (720h)<br>09:30 UTC (24h) | 24.1 h | 2,017.9 | 2,477.0 | +1,806.2 | 17.42% | 1,700.8 | 4,000.6 |

*Explanation of the 12:00 UTC row*: For 30 of the 31 delivery days (720 hours), the 11:30 UTC batch is available before 12:00 UTC. On 2026-01-15 (D-1 for delivery day 2026-01-16), NESO published the midday forecast batch late at 12:25:00 UTC, so the system selected the 09:30 UTC batch for all 24 hours of 2026-01-16.

---

## Accuracy Metrics Definitions

All metrics share a single implementation across the API, frontend, and tests:
- Error = Forecast - Actual (MW)
- Absolute Error = |Forecast - Actual| (MW)
- MAE = sum(|Error|) / N = 2,122.8 MW (at 09:50 and 11:00 cutoffs)
- RMSE = sqrt(sum(Error^2) / N) = 2,616.7 MW
- Mean Error (Bias) = sum(Error) / N = +1,840.3 MW
- WAPE = (sum(|Error|) / sum(Actual)) * 100% = 18.33%
- P50 (Median Absolute Error) = 1,714.0 MW
- P90 (90th Percentile Absolute Error) = 4,312.4 MW
- P99 (99th Percentile Absolute Error) = 6,261.3 MW

*Note on In-Sample Evaluation*: The P50/P90 uncertainty bands and trader summary percentiles are in-sample, whole-month retrospective metrics and would not be available to a trader in real time without a rolling estimation window.

---

## Bias Finding & Hypotheses

Across all 744 hours of January 2026, the mean forecast error is +1,840.3 MW (over-forecasting on 28 of 31 days).

**Hypotheses on Cause of Bias**:
- **Curtailment**: In Great Britain, wind generators may be curtailed by the system operator under transmission bottlenecks (e.g. Scottish export constraints), which may reduce physical FUELHH outturn below meteorological generation potential.
- **Scope Differences**: WINDFOR may model total national operational wind capacity across Great Britain, whereas FUELHH may record only metered Balancing Mechanism units connected to the high-voltage transmission system, omitting unmetered distribution-embedded wind.
*Status: These are working hypotheses and have not been verified against operational curtailment (BOAL) feeds.*

---

## Experimental Bias-Adjusted Forecast

An optional toggle applies a backward-looking 7-day rolling offset strictly using completed delivery days [D-8, D-2]:
- Bias_hist(D) = (1 / 168) * sum_{t in [D-8, D-2]} (Forecast_t - Actual_t)
- Adjusted_Forecast = max(0, Forecast - Bias_hist)
- **Leakage Prevention**: At 09:50 UTC on D-1, actuals for D-1 are incomplete. Day D-2 ended 9 hours and 50 minutes before cutoff, ensuring no actuals with timestamps after the cutoff are used.
- **Handling Insufficient History**: For January 1 through January 8 (< 7 completed delivery days), the adjusted forecast returns null. It does not silently use zero or future data.
- **Results on Active Period (Jan 9-31, 552 hours, experimental single-month result)**:
  - Raw: MAE = 2,115.9 MW | WAPE = 18.41% | Bias = +1,850.6 MW
  - Adjusted: MAE = 1,685.0 MW | WAPE = 14.66% | Bias = +239.7 MW
  - MAE improves by 430.9 MW; WAPE improves from 18.41% to 14.66%.
- **Limitation**: The bias adjustment is based on one month (January 2026) in which the bias was persistent and may not generalize to other months or seasons.

---

## Deployment Steps (Vercel Free Hobby Plan)

The application deploys to Vercel as a single project combining Edge static asset hosting (React SPA) and a Python serverless function (FastAPI API):

1. Push the repository to a public GitHub repo.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: Select **Other**.
   - **Root Directory**: `./` (repository root).
   - Build command and output directory are automatically read from `vercel.json`.
5. Click **Deploy**. Vercel will provision the application at `https://<project-name>.vercel.app`.

---

## Limitations and Next Steps
[Author to complete this section]
