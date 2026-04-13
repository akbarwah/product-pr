// ============================================================
// Employee Types & Role Mapping Utilities
// ============================================================

export interface Employee {
  id: string;
  name: string;
  position: string;
  rater_role: string;
  is_active: boolean;
}

/** Role label mapping for display */
export const ROLE_LABELS: Record<string, string> = {
  self: "Self Assessment",
  cpo: "CPO (Chief Product Officer)",
  lead_po: "Lead PO / Principal Product",
  sa: "System Analyst (SA)",
  ui_ux: "UI/UX Designer",
  dev: "Developer / Engineer",
  qa: "Quality Assurance (QA)",
  pm: "Product / Project Manager",
};

/**
 * Maps a job position string to a system rater_role.
 * Used when creating new employees via the UI.
 */
export function mapPositionToRole(position: string): string {
  const p = position.toLowerCase().trim();
  if (p.includes("chief product officer")) return "cpo";
  if (p.includes("principal product")) return "lead_po";
  if (p.includes("product manager") || p.includes("associate product manager") || p.includes("project manager")) return "pm";
  if (p.includes("product implementator")) return "pm";
  if (p.includes("system analyst")) return "sa";
  if (p.includes("solution engineer") || p.includes("principal engineer")) return "dev";
  if (p.includes("back end") || p.includes("front end") || p.includes("network") || p.includes("infra")) return "dev";
  if (p.includes("quality assurance")) return "qa";
  if (p.includes("ui/ux") || p.includes("ui_ux")) return "ui_ux";
  return "pm"; // fallback
}
