function formatYoYMagnitude(changePct: number): string {
  return Math.abs(changePct).toLocaleString("en-HK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function resortYoYSentenceParts(changePct: number): {
  prefix: string;
  emphasis: string;
  suffix: string;
} {
  const verb = changePct >= 0 ? "increased" : "decreased";
  const magnitude = formatYoYMagnitude(changePct);
  return {
    prefix: "Total daily power consumption for resort-wide ",
    emphasis: `${verb} ${magnitude} %`,
    suffix: " compared with the previous year.",
  };
}

export function buildResortYoYSentence(changePct: number): string {
  const { prefix, emphasis, suffix } = resortYoYSentenceParts(changePct);
  return `${prefix}${emphasis}${suffix}`;
}

export function resolveResortYoYChangePct(
  currentTotal: number,
  previousTotal: number,
  contextPct?: number,
): number | null {
  if (contextPct !== undefined && Number.isFinite(contextPct)) {
    return contextPct;
  }
  if (previousTotal <= 0) return null;
  return ((currentTotal - previousTotal) / previousTotal) * 100;
}
