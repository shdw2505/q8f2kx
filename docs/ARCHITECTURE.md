# GridBricks UK Day-Ahead Wind Evaluation System
## Architecture, Data Pipeline, Domain Logic, and Analysis Findings

This document serves as the technical and domain architecture reference for the GridBricks platform, designed for technical leads, power traders, and system architects.

---

## 1. Executive Summary & Business Context

In the UK wholesale power market, an energy utility's Day-Ahead power procurement desk must decide on day $D-1$ how much electrical energy to purchase on the day-ahead auction beyond what renewable generation (primarily wind) will supply to cover consumer demand. 

Because wind generation is weather-dependent and volatile, power buyers must rely on forward forecasts. Procuring incorrectly leads to high financial exposure:
- **Over-forecasting wind**: Leads to under-procurement on the Day-Ahead market. The utility faces costly imbalance cashout penalties in the Balancing Mechanism when generation fails to meet expectations.
- **Under-forecasting wind**: Leads to over-procurement, forcing surplus energy to be spilled or sold back into the intraday market at distressed prices.

The GridBricks platform provides:
1. **Latest Forecast at Decision Time**: Resolves the exact latest wind generation forecast available before the day-ahead gate closure, avoiding lookahead data leakage.
2. **Quantitative Accuracy Metrics**: Calculates MAE, RMSE, Bias, and WAPE ($\frac{\sum |e|}{\sum \text{Actual}}$) broken down by delivery hour and lead time horizon.
3. **Actionable Trading Support**: Generates horizon-conditioned empirical P50 and P90 uncertainty bands and an experimental backward-looking bias-adjusted forecast.

---

## 2. High-Level Architecture & Deployment Model

The system is architected as a **unified, single-service deployment**:

```
+-------------------------------------------------------------------------+
|                        Unified Docker Container                         |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     FastAPI Application (Python)                  |  |
|  |                                                                   |  |
|  |   /api/v1/health             -> Health & snapshot status          |  |
|  |   /api/v1/forecasts/day-ahead-> Time-aligned actuals & forecasts   |  |
|  |   /api/v1/metrics/breakdown  -> Hourly & horizon breakdowns       |  |
|  |   /api/v1/cutoffs/comparison -> Multi-gate comparison table        |  |
|  |   /api/v1/trader-summary     -> Number-grounded guidance          |  |
|  |                                                                   |  |
|  |   Static Mount: /            -> Built React 18 SPA (Vite/Tailwind)|  |
|  +-------------------------------------------------------------------+  |
|                                     |                                   |
|                +--------------------+--------------------+              |
|                |                                         |              |
|     +-----------------------+              +-----------------------+    |
|     |  FUELHH WIND Snapshot |              |   WINDFOR Snapshot    |    |
|     |  (1,488 actual rows)  |              | (22,192 forecast rows)|    |
|     +-----------------------+              +-----------------------+    |
+-------------------------------------------------------------------------+
```

### Key Technical Decisions:
1. **Unified Container Image**:
   A multi-stage `Dockerfile` compiles the React frontend into static assets in Stage 1 (`node:20-alpine`) and copies them into Stage 2 (`python:3.11-slim`). FastAPI serves both the REST API and the React SPA from port 8000 (or `$PORT` on Heroku).
2. **Committed Snapshot Data Source**:
   All 1,488 actuals and 22,192 forecasts for January 2026 are committed as JSON snapshots in `backend/app/data/`. The app starts sub-second and functions 100% offline without network dependencies. Live refreshing from the Elexon BMRS API remains available via `backend/app/services/fetch_snapshot.py` or `force_refresh=true`.
3. **Strict Typings & Test Coverage**:
   - Backend: Pydantic v2 schemas and pure stateless engine functions covered by 13 pytest unit and integration tests.
   - Frontend: Strict TypeScript types mirroring backend schemas with 0 compile warnings.

---

## 3. Data Pipeline & Alignment Logic

### Data Sources (Elexon BMRS Only):
- **Actuals (`FUELHH` stream)**:
  - Half-hourly generation outturn by fuel type.
  - Filter: `fuelType == "WIND"`.
  - Resolution: 30 minutes (`startTime` at `:00` and `:30`).
- **Forecasts (`WINDFOR` stream)**:
  - National wind generation forecast published by the National Energy System Operator (NESO).
  - Resolution: Hourly (`startTime` strictly at `:00`).
  - Published in rolling batches up to 8 times daily.

### Time Resolution Alignment:
Because `WINDFOR` forecasts average generation over a 60-minute window starting at $T:00$, the corresponding actual generation outturn is computed by averaging the two half-hourly settlement periods within that hour:
$$\text{Actual}_{T:00} = \frac{\text{FUELHH}_{T:00} + \text{FUELHH}_{T:30}}{2}$$
This aligns the power (MW) and energy (MWh) delivered across each clock hour.

---

## 4. Domain Logic & Assumptions

### 1. Day-Ahead Decision Cutoff (Gate Closure)
- **Market Context**: In Great Britain wholesale electricity markets, Day-Ahead physical auctions close on day $D-1$:
  - **N2EX Day-Ahead Hourly Auction (Nord Pool)**: Order book gate closure is **09:50 GMT / 09:50 UTC** in January. Source citations: Nord Pool "About the N2EX day-ahead auction" support page; Modo Energy GB wholesale markets explainer. These are published schedules from secondary industry sources rather than an official rulebook.
  - **EPEX SPOT GB Day-Ahead 60-Minute Auction**: Order book deadline is **09:20 UTC**. (Note: the 30-minute GB auction runs at 15:30 D-1 and is not used here).
  - **Continental European Single Day-Ahead Coupling (SDAC)**: Closes at **11:00 UTC** (12:00 CET), included for cross-border comparison only.
  - **12:00 UTC**: Later cutoff, comparison only (not a GB auction gate).
- **Assumed Default**: **09:50 UTC on D-1** is used as the default decision cutoff assumption.
- **Why 09:50 UTC and 11:00 UTC Produce Identical Metrics**:
  - NESO publishes `WINDFOR` forecast batches at fixed intervals (approximately 07:30, 09:30, 11:30, and 15:30 UTC).
  - At **09:50 UTC on D-1**, the latest available forecast batch is the **09:30 UTC** batch.
  - At **11:00 UTC on D-1**, the subsequent 11:30 UTC batch has not yet been published, so the latest available batch remains the **09:30 UTC** batch.
  - As a result, across all 744 hours of January 2026, exactly the same forecast records are selected under both 09:50 and 11:00 cutoffs (100% drawn from the 09:30 batch).
- **Implementation**: Fully configurable in the UI and API. For any delivery day $D$, the system strictly filters forecasts published on or before $(D - 1\text{ day}) \text{ at } H_{\text{cutoff}}$ and selects the one with the maximum `publishTime`.
- **Zero Lookahead Guarantee**:
  - Minimum Lead Time Horizon: 14.5 hours (for delivery at 00:00 UTC).
  - Maximum Lead Time Horizon: 37.5 hours (for delivery at 23:00 UTC).
  - Zero forecasts published after cutoff are ever included.

### 2. Error Metrics Definitions
All metrics share a single implementation across the API and test suite:
- $\text{Error} = \text{Forecast} - \text{Actual}$ (MW). Positive indicates over-forecasting (deficit risk); negative indicates under-forecasting (surplus risk).
- $\text{Absolute Error} = |\text{Forecast} - \text{Actual}|$.
- $\text{MAE} = \frac{1}{N} \sum_{i=1}^N |e_i| = 2,122.8\text{ MW}$ (at 09:50 and 11:00 cutoffs).
- $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N e_i^2} = 2,616.7\text{ MW}$.
- $\text{Mean Error (Bias)} = \frac{1}{N} \sum_{i=1}^N e_i = +1,840.3\text{ MW}$.
- $\text{WAPE} = \frac{\sum |e_i|}{\sum \text{Actual}_i} \times 100\% = 18.33\%$ (18.3%).
- $\text{P50 (Median Absolute Error)} = 1,714.0\text{ MW}$.
- $\text{P90 (90th Percentile)} = 4,312.4\text{ MW}$.
- $\text{P99 (Extreme Tail)} = 6,261.3\text{ MW}$.

> [!NOTE]
> **In-Sample Evaluation Note**:
> The P50/P90 uncertainty bands, horizon breakdown, and trader-summary percentiles are in-sample, whole-month retrospective metrics and would not be available to a trader in real time without a rolling estimation window.

### 3. Empirical Horizon Uncertainty Bands
Rather than assuming Gaussian error distributions, empirical percentiles ($P_{50}$ and $P_{90}$) of absolute error are computed per forecast horizon bucket (12-18h, 18-24h, 24-30h, 30-36h, 36h+). Each forecast point is bracketed by:
$$\text{P50 Band} = [\max(0, \text{Forecast} - P_{50}), \text{Forecast} + P_{50}]$$
$$\text{P90 Band} = [\max(0, \text{Forecast} - P_{90}), \text{Forecast} + P_{90}]$$

### 4. Experimental Backward-Looking Bias Adjustment
Power buyers can toggle an optional bias-adjusted forecast. To guarantee zero lookahead leakage at the decision cutoff on day $D-1$ (default 09:50 UTC), the bias offset is computed strictly from completed delivery days $[D-8, D-2]$:
$$\text{Bias}_{\text{hist}}(D) = \frac{1}{168}\sum_{t \in [D-8, D-2]} (\text{Forecast}_t - \text{Actual}_t)$$
$$\text{Forecast}_{\text{adj}} = \max(0, \text{Forecast} - \text{Bias}_{\text{hist}})$$

**Handling Insufficient History (First Week of January)**:
Because the dataset begins on 2026-01-01, a full 7-day window $[D-8, D-2]$ requires data back to $D-8$.
- For January 1 through January 8 (192 hours): History is insufficient (< 7 completed delivery days in January). The adjusted forecast is explicitly set to `null` (not calculated). It does not silently use zero or future data.
- For January 9 through January 31 (552 active delivery hours): Full 7-day history is available.
- **Results on active period (Jan 9-31, 552 hours, experimental single-month result)**:
  - Raw Forecast: MAE = 2,115.9 MW | WAPE = 18.41% | Bias = +1,850.6 MW
  - Adjusted Forecast: MAE = 1,685.0 MW | WAPE = 14.66% | Bias = +239.7 MW
  - MAE is reduced by 430.9 MW and WAPE improves from 18.41% to 14.66%.

> [!WARNING]
> **Generalization Limitation**:
> This bias adjustment is based on one month (January 2026) in which the bias was persistent and may not generalize to other months or seasons.

---

## 5. Key Findings & Data Validation Analysis

### Finding 1: Structural Positive Forecast Bias (+1,840 MW)
Across all 744 hours of January 2026:
- 28 of 31 days (90.3%) exhibited positive daily mean forecast error.
- Month-wide mean actual wind generation: 11,544.7 MW.
- Month-wide mean forecast: 13,385.0 MW.
- Mean bias: +1,840.3 MW (~15.9% of mean actual generation).

> [!NOTE]
> **Hypothesis on Cause of Bias**:
> The positive bias is a real property of the raw Elexon dataset and persists under timestamp shifts (+/- 1h, +/- 2h).
> **Possible explanations**:
> 1. **Curtailment**: In Great Britain, wind generators may be curtailed by the system operator under transmission bottlenecks (e.g. Scottish export constraints), which may reduce physical `FUELHH` outturn below meteorological potential.
> 2. **Scope Differences**: `WINDFOR` may model total national operational wind capacity across Great Britain, whereas `FUELHH` may record only metered Balancing Mechanism units connected to the high-voltage transmission system, omitting unmetered distribution-embedded wind.
> *Note: These remain working hypotheses and have not been independently verified with operational curtailment (BOAL) feeds.*

### Finding 2: Cutoff Comparison & Lead Time Decay
Comparing gate closure assumptions across January 2026:
| Decision Cutoff (D-1) | Avg Horizon | MAE (MW) | RMSE (MW) | Bias (MW) | WAPE (%) | P50 (MW) | P90 (MW) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **09:20 UTC (EPEX SPOT GB 60-min)** | 28.0 h | 2,142.1 | 2,611.7 | +1,851.9 | 18.50% | 1,787.8 | 4,300.2 |
| **09:50 UTC (N2EX Hourly - Assumed Default)**| 26.0 h | 2,122.8 | 2,616.7 | +1,840.3 | 18.33% | 1,714.0 | 4,312.4 |
| **11:00 UTC (Continental SDAC, comparison)**| 26.0 h | 2,122.8 | 2,616.7 | +1,840.3 | 18.33% | 1,714.0 | 4,312.4 |
| **12:00 UTC (Later cutoff, comparison only - not a GB auction gate)** | 24.1 h | 2,017.9 | 2,477.0 | +1,806.2 | 17.42% | 1,700.8 | 4,000.6 |

- At 09:20 UTC (EPEX SPOT GB 60-min auction), only the 07:30 UTC forecast batch is available, resulting in an average lead time of 28.0 hours and MAE of 2,142.1 MW.
- At 09:50 UTC (N2EX hourly auction) and 11:00 UTC (continental SDAC), the 09:30 UTC batch is available, reducing lead time to 26.0 hours and MAE to 2,122.8 MW.
- At 12:00 UTC (later cutoff, comparison only): for 30 of 31 days (720 hours), the 11:30 UTC batch is available, reducing lead time to 24.1 hours, improving MAE to 2,017.9 MW and WAPE to 17.42%. On 2026-01-15 (D-1 for delivery day 2026-01-16), NESO published the midday batch late at 12:25:00Z, so the 09:30 UTC batch was used for all 24 hours of 2026-01-16.

### Finding 3: Peak Hour (16:00–20:00 UTC) Operational Risk
- Average MAE during evening peak hours is **2,006 MW** with a positive bias of **+1,476 MW**.
- When traders rely on unadjusted wind forecasts, the evening peak carries substantial risk of shortfall, requiring procurement of a +4,312 MW (P90) reserve margin to prevent imbalance exposure.

---

## 6. Video Walkthrough Script (10-Minute Guide)

Use this structure when recording your walkthrough video:

### Part 1: Client Pitch (5 Minutes)
1. **The Problem (1 min)**:
   - "Good morning. When buying power on the UK Day-Ahead market, your team has to decide how much electricity to procure beyond wind generation. Over-estimating wind leaves you short, facing punitive balancing mechanism cashout prices. Under-estimating forces you to spill power."
2. **The Decision Gate (1.5 min)**:
   - Show the 09:50 UTC D-1 default cutoff selector.
   - Explain how GridBricks locks in the latest forecast published prior to auction gate closure with zero lookahead leakage.
   - Point out the tooltip showing exact lead times (e.g. 26.5h) for each hour.
3. **The Quantitative Accuracy & Bias (1.5 min)**:
   - Walk through the KPI cards: MAE (2,123 MW), WAPE (18.3%), Bias (+1,840 MW).
   - Show the Time-Series chart with the P50 and P90 uncertainty bands.
   - Toggle the "Bias-Adjusted Forecast" and show how a 7-day backward-looking correction [D-8, D-2] reduces MAE from 2,116 MW to 1,685 MW and WAPE from 18.41% to 14.66% on the active period (Jan 9-31, experimental single-month result).
4. **Trading Guidance & Cutoff Comparisons (1 min)**:
   - Highlight the plain-language trading recommendation: procuring a +1,714 MW (P50) to +4,312 MW (P90) buffer during peak hours.
   - Show the side-by-side cutoff comparison table.

### Part 2: Technical Lead Review (5 Minutes)
1. **Architecture & Clean Code (1 min)**:
   - Single-container multi-stage Docker build: React 18 + Vite frontend built and served directly by FastAPI.
   - Offline snapshot resilience: 1,488 FUELHH and 22,192 WINDFOR records committed to repo.
2. **Data Pipeline & Alignment Math (1.5 min)**:
   - Explain why FUELHH half-hours (:00 and :30) are averaged into hourly blocks to match WINDFOR's hourly resolution.
   - Walk through `forecast_engine.py`: cutoff filtering logic and horizon calculation.
3. **Pipeline Validation & Bias Verification (1.5 min)**:
   - Explain how we validated that the +1,840 MW bias is real:
     - 28 of 31 days have positive bias.
     - Timestamp sensitivity test (+/- 1h, +/- 2h shifts) leaves bias unchanged (+1,830 to +1,850 MW).
     - State the two hypotheses: unconstrained meteorological forecast vs constrained physical outturn, and transmission vs embedded wind scope.
4. **Testing & Quality (1 min)**:
   - Show the 13 automated tests passing in under 2 seconds.
   - Demonstrate clean modular structure ready for GitHub and deployment.

---

## 7. Deployment Instructions

### Option A: Heroku (Recommended 1-Service Deployment)
1. Install Heroku CLI and login:
   ```bash
   heroku login
   ```
2. Create an app with container stack:
   ```bash
   heroku create <your-anonymous-app-name>
   heroku stack:set container
   ```
3. Push and release using `heroku.yml`:
   ```bash
   git push heroku main
   ```
4. Open the deployed application:
   ```bash
   heroku open
   ```

### Option B: Local Docker
Run the unified single-service container:
```bash
docker compose up --build
```
Navigate to `http://localhost:8000`.

### Option C: Vercel (Frontend) + Backend
If deploying frontend to Vercel separately:
1. Push repo to GitHub.
2. Import project in Vercel with Root Directory set to `frontend`.
3. Set environment variable: `VITE_API_BASE_URL=https://<your-backend-host>`.
4. Deploy.
