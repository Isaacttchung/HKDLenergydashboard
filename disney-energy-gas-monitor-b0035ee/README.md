# HKDL Energy Dashboard

Hong Kong Disneyland energy dashboard for monitoring **electricity**, **gas**, and **solar generation** across the full resort — theme park, staff facilities, hotels, CCP/HCCP chilling plants, and solar installations.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

## Data workflow

1. The team maintains **master sheets** (CSV or Excel) as the source of truth.
2. **This dashboard reads master sheets** from `data/master-sheets/`.
3. Raw meter CSVs can stay in your existing workflow outside the app for now — no in-dashboard conversion is required.

Optional later: automate raw CSV → master sheet conversion if the team wants it.

## Master sheets

The dashboard reads four rolling Excel master sheets from `data/master-sheets/`:

| File | Sheets used |
|------|-------------|
| `HCCP_Gas_Consumption_report.xlsx` | Gas Meter Reading |
| `HKDL_Daily_Feed-in_Tariff_Report.xlsx` | Summary_kWh_Data Input |
| `HKDL_Power_Solar_consumption_report.xlsx` | CCP, HCCP, Hotel, Park |
| `HKDL_Top_10.xlsx` | WebSS_Data (parsed for future use) |

Historical data loads from **2018** through the latest date in the workbooks. Gas consumption is converted to kWh using `(units × 48 × 0.278)` before display.

## Adding data

1. Update the master sheet files in `data/master-sheets/` (same filenames).
2. Refresh the page to reload data (the app watches master sheet file timestamps so uploads from other PCs are picked up after refresh).
3. Optional manual overrides for report titles or notes can still go in `data/daily-context.json`.

### Master sheet dropbox (host PC / ngrok)

The sidebar **Master sheet dropbox** uploads files to `data/master-sheets/` on the machine running the app. Coworkers only need the browser link; files are not stored on their laptops.

- Only these names are accepted: the four workbooks listed in the table above.
- After upload, the dashboard refreshes server data and clears the in-memory cache. A full browser refresh should show the same **Host latest EMS date** as the upload success message.

### Upload shows a new date, but refresh goes back to an old date

This almost always means the browser is not talking to the same app folder you think, or the host disk was not updated.

1. **Use one ngrok URL** for every teammate. Bookmarks to `localhost` on a laptop only update that laptop — not the host PC.
2. On the **host PC**, open the dashboard locally (`http://localhost:4000` or your dev port) and check **Master sheet dropbox → Host latest EMS date** and the file modified times. They should match right after an upload from another computer.
3. Confirm **Host folder** in the sidebar matches the project you started with `npm run dev` (only one copy of the project should be running).
4. Stop extra `npm run dev` / ngrok tunnels. Point ngrok at the single port where the host app runs.
5. If **Extra Excel files** appears in the sidebar, delete those duplicates on the host under `data/master-sheets/` — the app only reads the four standard underscore filenames.
6. After uploading, ensure all **four** workbooks were saved (green dots). Partial uploads leave the latest EMS date on the oldest power workbook.

**Upload password (required for ngrok):** the sidebar dropbox checks `MASTER_SHEET_UPLOAD_TOKEN` on the host PC.

For local testing, copy the example env file (default test password `12345`):

```bash
cp .env.example .env.local
npm run dev
```

Enter **12345** in **Upload password** in the sidebar when uploading. **Change this before production hosting** — set a long secret in `.env.local` or `export MASTER_SHEET_UPLOAD_TOKEN="…"` and restart the server.

Share the real password with teammates separately from the ngrok URL. Without a token set, anyone with the link could overwrite master sheets.

## Configuration

| File | Purpose |
|------|---------|
| `config/buildings.json` | Building taxonomy, areas, and filter groups |
| `config/relations.json` | Curated data relationship explanations |
| `config/column-mapping.json` | Map master sheet columns to canonical schema |

## Features

- **Full resort default view** — no filters required on first load
- **Resort map filter** — click regions on `public/hkdl-resort-map.svg` to toggle groups or buildings; double-click to zoom (hotels / theme park lands). Replace the SVG with a full export from design; keep path `id`s aligned with `lib/resort-map-config.ts`.
- **Progressive filtering** — map plus dropdown for individual buildings/installations
- **Metric views** — electricity, gas, electricity vs gas, solar
- **Time presets** — YTD, this month, single day, custom range
- **Period comparison** — compare days, months, or years
- **Daily report PDF** — on the single-day view, use **Download Daily Report** in the Daily Report Summary card to export the EMS-style PDF (summary tables plus dashboard charts)
- **Relations panel** — curated explanations of data relationships

## Project structure

```
app/                  Next.js pages and API routes
components/dashboard/ Dashboard UI components
config/               Building taxonomy, relations, column mapping
data/master-sheets/   Team master sheet files (CSV/Excel)
data/raw/             Optional later: raw meter CSV drop folder
lib/                  Data store, aggregations, filters
```

## Scripts

- `npm run dev` — start dev server on port 4000
- `npm run build` — production build
- `npm run start` — start production server

## Roadmap

- **Next:** Run on your PC, then move to a dedicated local server (auth + Cloudflare Tunnel)
- **Optional later:** Raw CSV → master sheet automation
- **Optional later:** Local AI analysis

## Raw data upload (Mode A)

Master sheet dropbox behavior added Nov 2026 (operators and developers).

### Summary

The dropbox accepts **exactly one** of two upload bundles per attempt:

| Mode | What to upload | Result |
|------|----------------|--------|
| **A — Raw conversion** | **26** raw CSV files **+** **`HKDL Daily Feed-in Tariff Report.xlsx`** (27 files total) | Converts data into master workbooks on disk, clears cache, refreshes the dashboard |
| **B — Master replace** | All **four** canonical master Excel workbooks together | Replaces files under `data/master-sheets/` (same as before this feature) |

Mixed or partial batches are **rejected** (for example 26 raws without feed-in, or raws mixed with only some masters).

Users do **not** upload the internal formula workbook (`Formula-DailyWeb4.xlsm`); conversion rules are baked into the app.

### Mode A — what gets converted

| Master workbook | From raw data? | Notes |
|-----------------|----------------|-------|
| **HKDL_Top_10.xlsx** (`WebSS_Data`) | Yes | Mappings from RawData spec; outdoor air temperature from **`CCP+HCCP Daily1`** (column BY, daily average → row 301) |
| **HKDL_Power_Solar_consumption_report.xlsx** | Yes | **Mercury_CCP**, **Mercury_HCCP**, **Mercury_Hotel**, **Mercury_Park** |
| **HKDL Daily Feed-in Tariff Report.xlsx** | Uploaded as input | Required for solar / feed-in calculations; not produced from raws alone |
| **HCCP_Gas_Consumption_report.xlsx** | No (yet) | Still upload via **Mode B** or future work |

After a successful Mode A run, **Top_10** and **Power_Solar** masters are updated on disk. Gas master is unchanged unless you upload masters in Mode B.

### Required raw files (26)

Logical ids (filename suffix `_YYYYMMDDHHMMSS` is ignored; spaces vs underscores are normalized):

1. `Mercury_CCP`
2. `Mercury_HCCP`
3. `Mercury_Hotel`
4. `Mercury_Park`
5. `SS200_TxA_1`
6. `SS201_TxA_1`
7. `SS201_TxB_1`
8. `SS201_TxC_1`
9. `SS202_TxA_1`
10. `SS202_TxB_1`
11. `SS203_TxA_1`
12. `SS203_TxB_1`
13. `SS203_TxC_1`
14. `SS204_TxA_1`
15. `SS204_TxB_1`
16. `SS206_TxA_1`
17. `SS206_TxB_1`
18. `SS207_TxA`
19. `SS207_TxB`
20. `SS208_TxA_HV`
21. `SS210_TxA_1`
22. `SS211_TxA_1`
23. `SS221_HV`
24. `209-121-126`
25. `209-MeterB`
26. **`CCP+HCCP Daily1`**

**Not required:** `CCP_COP_kWh`.

**Plus one master for Mode A:** `HKDL Daily Feed-in Tariff Report.xlsx` (must include a row for the batch **data date**).

### Data date rules

- Every raw CSV must share the same calendar **data date**, taken from the **`Timestamp`** column.
- If dates differ across files, upload fails with an error asking for a consistent set.
- Feed-in master must contain values for that same date where formulas require feed-in.

### Duplicate date

If that **data date** already exists in the masters / dashboard:

- Upload stops before overwriting.
- UI prompts: **Replace** or **Cancel**.
- **Replace** runs conversion again and overwrites that date’s column.
- **Cancel** leaves disk unchanged.

Same behavior applies when uploading **four masters** (Mode B) if that date column already exists.

### Blocking errors

Upload fails (no master write) when for example:

- Missing or extra files for the chosen mode
- Raw **Timestamp** dates do not match across the 26 files
- Feed-in master has no row for the batch date (when required)
- A meter/location row required for **Top_10** is missing in `WebSS_Data` (rows are **never** auto-added)

On missing master rows, the UI can offer a **download of the current master** to fix offline, then re-upload.

### Warnings (non-blocking)

Conversion **completes** and the dashboard **updates** even when warnings fire. A dialog lists issues and may offer downloads of flagged **raw CSVs** and affected **masters** (Top_10 and Power_Solar when those pipelines ran).

| Warning | Meaning |
|---------|---------|
| **LOW_DATA_COUNT** | Fewer than 70 data rows between first and last reading for a column (possible gaps) |
| **CUMULATIVE_DECREASE** | Cumulative kWh decreased row-to-row (equal is OK) |
| **NEGATIVE_DELTA** | Daily total (last − first non-empty) is negative |

Bad source data (for example known REC glitches) is **not** auto-corrected; fix manually and re-upload.

### Default kWh rule

For each meter column: **last non-empty cumulative kWh − first non-empty cumulative kWh** for that day, unless a specific mapping uses REC or feed-in formulas (Top_10 / Power_Solar).

### Code locations (developers)

| Area | Path |
|------|------|
| Upload API | `app/api/master-sheets/upload/route.ts` |
| Download after warnings | `app/api/master-sheets/download/route.ts` |
| Batch classification | `lib/upload/batch-classifier.ts` |
| Mode A orchestration | `lib/upload/raw-upload-stub.ts` |
| Raw CSV warnings | `lib/raw-csv-validation.ts` |
| Top_10 conversion | `lib/raw-to-master/top-10.ts` |
| Power Solar conversion | `lib/raw-to-master/power-solar.ts` |
| UI | `components/dashboard/master-sheet-upload.tsx`, `duplicate-date-dialog.tsx`, `upload-warnings-dialog.tsx` |

Tests: `lib/**/*.test.ts`, golden tests under `lib/raw-to-master/*golden*`.

### Not in this release

- Raw → **HCCP_Gas** conversion
- Optional “download all four masters” on clean success with no warnings
- Monthly / yearly PDF reports (dashboard remains **daily-only** by design)