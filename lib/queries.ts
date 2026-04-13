import { createServerClient } from "@/lib/supabase-server";
import type {
  EvaluationPeriod,
  GapAnalysis,
  ProductOwner,
  QualitativeNote,
} from "@/lib/types";

// Get the active evaluation period
export async function getActivePeriod(): Promise<EvaluationPeriod | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("evaluation_periods")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("getActivePeriod error:", error);
    return null;
  }
  return data as EvaluationPeriod;
}

// Get all evaluation periods
export async function getEvaluationPeriods(): Promise<EvaluationPeriod[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("evaluation_periods")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("getEvaluationPeriods error:", error);
    return [];
  }
  return (data as EvaluationPeriod[]) ?? [];
}

// Get gap analysis data for a period, optionally filtered by PO
export async function getGapAnalysis(
  periodId: string,
  poId?: string
): Promise<GapAnalysis[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("vw_gap_analysis")
    .select("*")
    .eq("period_id", periodId);

  if (poId) {
    query = query.eq("po_id", poId);
  }

  const { data, error } = await query.order("po_name").order("indicator_id");

  if (error) {
    console.error("getGapAnalysis error:", error);
    return [];
  }
  return (data as GapAnalysis[]) ?? [];
}

// Get all gap analysis across all periods (for pre vs post comparison)
export async function getGapAnalysisAllPeriods(): Promise<GapAnalysis[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("vw_gap_analysis")
    .select("*")
    .order("period_type")
    .order("po_name")
    .order("indicator_id");

  if (error) {
    console.error("getGapAnalysisAllPeriods error:", error);
    return [];
  }
  return (data as GapAnalysis[]) ?? [];
}

// Get all active product owners
export async function getProductOwners(): Promise<ProductOwner[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_owners")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("getProductOwners error:", error);
    return [];
  }
  return (data as ProductOwner[]) ?? [];
}

// Get qualitative notes for a specific PO in a period
export async function getQualitativeNotes(
  periodId: string,
  poId: string
): Promise<QualitativeNote[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("responses")
    .select("rater_role, qualitative_note")
    .eq("period_id", periodId)
    .eq("po_id", poId)
    .not("qualitative_note", "is", null)
    .neq("qualitative_note", "");

  if (error) {
    console.error("getQualitativeNotes error:", error);
    return [];
  }
  return (data as QualitativeNote[]) ?? [];
}

// Get response statistics (total non-self raters) for a period
export async function getResponseStats(periodId: string): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("responses")
    .select("*", { count: "exact", head: true })
    .eq("period_id", periodId)
    .neq("rater_role", "self");

  if (error) {
    console.error("getResponseStats error:", error);
    return 0;
  }
  return count ?? 0;
}
