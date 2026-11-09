# Master Sheet Schema

The HKDL Energy Dashboard reads **master sheets** from `data/master-sheets/`. These are the team-maintained backup files created from raw meter CSVs.

## Canonical columns

| Column | Type | Description |
|--------|------|-------------|
| `date` | ISO date (`YYYY-MM-DD`) | Daily row date |
| `source_id` | string | Building or solar installation ID (see `config/buildings.json`) |
| `energy_type` | `electricity` \| `gas` \| `solar` | Consumption or solar generation |
| `value_kwh` | number | Usage or generation in kWh |
| `cost_hkd` | number (optional) | Cost in HKD; blank for solar |

## Example

```csv
date,source_id,energy_type,value_kwh,cost_hkd
2025-01-15,ccp,electricity,12500.0,18750.00
2025-01-15,solar-tl-01,solar,1850.0,
```

## Supported file types

- `.csv`
- `.xlsx` / `.xls`

## Column mapping

If your existing master sheets use different headers, edit `config/column-mapping.json` to map them to the canonical schema.
