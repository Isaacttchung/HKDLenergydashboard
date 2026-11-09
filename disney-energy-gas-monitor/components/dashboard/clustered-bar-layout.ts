/**
 * Group multiple series per x category (bars touch within the day/month/year).
 * Does not set maxBarSize so bar thickness stays at Recharts’ default.
 */
export function getClusteredBarChartProps() {
  return {
    barGap: 0,
    barCategoryGap: "20%",
  };
}
