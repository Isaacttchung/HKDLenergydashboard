# HKDL Energy Dashboard

Hong Kong Disneyland energy dashboard for monitoring **electricity**, **gas**, and **solar generation** across the full resort — theme park, staff facilities, hotels, CCP/HCCP chilling plants, and solar installations.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

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
2. On the **host PC**, open the dashboard locally (`http://localhost:43123` or your dev port) and check **Master sheet dropbox → Host latest EMS date** and the file modified times. They should match right after an upload from another computer.
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

- `npm run dev` — start dev server on port 43123
- `npm run build` — production build
- `npm run start` — start production server

## Roadmap

- **Next:** Run on your PC, then move to a dedicated local server (auth + Cloudflare Tunnel)
- **Optional later:** Raw CSV → master sheet automation
- **Optional later:** Local AI analysis
