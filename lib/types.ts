// ============================================================
// TypeScript Interfaces - Performance Evaluation Dashboard
// ============================================================

export interface EvaluationPeriod {
  id: string;
  name: string;
  type: "pre_test" | "post_test";
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface ProductOwner {
  id: string;
  name: string;
  squad: string;
  is_active: boolean;
}

export interface Indicator {
  id: number;
  category: string;
  name: string;
  description: string;
  lead_po_weight: number;
  team_weight: number;
}

export interface Response {
  id: string;
  period_id: string;
  po_id: string;
  rater_role: string;
  rater_name: string | null;  // ← ADDED THIS LINE
  submitted_at: string;
  qualitative_note: string | null;
  scores?: Score[];
}

export interface Score {
  id: string;
  response_id: string;
  indicator_id: number;
  score: number;
  is_na: boolean;
}

// vw_gap_analysis view
export interface GapAnalysis {
  period_id: string;
  period_name: string;
  period_type: "pre_test" | "post_test";
  po_id: string;
  po_name: string;
  indicator_id: number;
  indicator_name: string;
  category: string;
  lead_po_weight: number;
  team_weight: number;
  avg_lead_po: number | null;
  avg_cpo: number | null;
  avg_sa: number | null;
  avg_ui_ux: number | null;
  avg_dev: number | null;
  avg_qa: number | null;
  avg_pm: number | null;
  avg_team_actual: number | null;
  avg_self: number | null;
  valid_raters: number;
  na_count: number;
  actual_score: number | null;
  gap_self_vs_actual: number | null;
  gap_lead_po_vs_team: number | null;
  gap_flag: "critical" | "moderate" | "consistent" | null;
}

export const ROLE_MATRIX: Record<number, string[]> = {
  1: ['lead_po', 'cpo', 'sa', 'pm', 'self'],
  2: ['lead_po', 'cpo', 'sa', 'ui_ux', 'pm', 'self'],
  3: ['lead_po', 'cpo', 'sa', 'qa', 'pm', 'self'],
  4: ['lead_po', 'cpo', 'sa', 'ui_ux', 'pm', 'self'],
  5: ['lead_po', 'cpo', 'sa', 'dev', 'qa', 'pm', 'self'],
  6: ['lead_po', 'cpo', 'sa', 'ui_ux', 'dev', 'qa', 'pm', 'self'],
  7: ['lead_po', 'cpo', 'sa', 'ui_ux', 'dev', 'qa', 'pm', 'self'],
  8: ['lead_po', 'cpo', 'sa', 'dev', 'pm', 'self'],
  9: ['lead_po', 'cpo', 'sa', 'pm', 'self'],
  10: ['lead_po', 'cpo', 'sa', 'dev', 'qa', 'pm', 'self'],
  11: ['lead_po', 'cpo', 'sa', 'pm', 'self'],
  12: ['lead_po', 'cpo', 'sa', 'ui_ux', 'dev', 'qa', 'pm', 'self'],
  13: ['lead_po', 'cpo', 'sa', 'dev', 'qa', 'pm', 'self'],
  14: ['lead_po', 'cpo', 'sa', 'pm', 'self'],
  15: ['lead_po', 'cpo', 'sa', 'ui_ux', 'pm', 'self'],
};

export interface QualitativeNote {
  rater_role: string;
  qualitative_note: string;
}

export interface ResponseStats {
  total_raters: number;
}