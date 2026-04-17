import { GapAnalysis } from "./types";

export const ROLE_INDICATOR_MATRIX: Record<string, Set<number>> = {
  avg_self: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  avg_lead_po: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  avg_sa: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  avg_ui_ux: new Set([2, 4, 6, 7, 12, 15]),
  avg_dev: new Set([5, 6, 7, 8, 10, 12, 13]),
  avg_qa: new Set([3, 5, 6, 7, 10, 12, 13]),
  avg_pm: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
};

export const CATEGORY_WEIGHTS: Record<string, { lead: number; team: number }> = {
  "I. Strategic & Analytical Rigor": { lead: 0.5, team: 0.5 },
  "II. Product Rigor & Specification": { lead: 0.3, team: 0.7 },
  "III. Operational Execution": { lead: 0.3, team: 0.7 },
  "IV. Stakeholder & Market Advocacy": { lead: 0.6, team: 0.4 },
};

export function calculateWeightedScore(row: GapAnalysis): number | null {
  const weights = CATEGORY_WEIGHTS[row.category];
  if (!weights) return row.actual_score;

  const leadScore = row.avg_lead_po ?? null;

  const teamRoles: { key: string; value: number | null }[] = [
    { key: "avg_sa", value: row.avg_sa ?? null },
    { key: "avg_ui_ux", value: row.avg_ui_ux ?? null },
    { key: "avg_dev", value: row.avg_dev ?? null },
    { key: "avg_qa", value: row.avg_qa ?? null },
    { key: "avg_pm", value: row.avg_pm ?? null },
  ];

  const validTeamScores = teamRoles
    .filter((r) => {
      const allowed = ROLE_INDICATOR_MATRIX[r.key];
      return allowed?.has(row.indicator_id) && r.value !== null;
    })
    .map((r) => r.value as number);

  const teamAvg =
    validTeamScores.length > 0
      ? validTeamScores.reduce((a, b) => a + b, 0) / validTeamScores.length
      : null;

  if (leadScore !== null && teamAvg !== null) {
    return leadScore * weights.lead + teamAvg * weights.team;
  }
  if (leadScore !== null) return leadScore;
  if (teamAvg !== null) return teamAvg;
  return null;
}

export function calculateGapFlag(gap: number | null): "critical" | "moderate" | "consistent" | null {
  if (gap === null) return null;
  const absGap = Math.abs(gap);
  if (absGap >= 1.5) return "critical";
  if (absGap >= 0.75) return "moderate";
  return "consistent";
}

export function applyClientScoring(rawData: GapAnalysis[]): GapAnalysis[] {
  return rawData.map((row) => {
    const weightedScore = calculateWeightedScore(row);
    const gap =
      row.avg_self !== null && weightedScore !== null
        ? row.avg_self - weightedScore
        : null;

    return {
      ...row,
      actual_score: weightedScore,
      gap_self_vs_actual: gap,
      gap_flag: calculateGapFlag(gap),
    };
  });
}
