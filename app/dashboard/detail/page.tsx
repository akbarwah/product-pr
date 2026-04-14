"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  RefreshCw,
  Printer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createBrowserClient } from "@/lib/supabase";
import { RawResponsesTable } from "@/components/raw-responses-table";
import type { GapAnalysis, ProductOwner, QualitativeNote } from "@/lib/types";

/* ============================================================
   CONSTANTS
   ============================================================ */

const CATEGORY_COLORS: Record<string, string> = {
  "I. Strategic & Analytical Rigor": "bg-blue-100 text-blue-800",
  "II. Product Rigor & Specification": "bg-purple-100 text-purple-800",
  "III. Operational Execution": "bg-green-100 text-green-800",
  "IV. Stakeholder & Market Advocacy": "bg-orange-100 text-orange-800",
};

const CATEGORY_PRINT_COLORS: Record<string, string> = {
  "I. Strategic & Analytical Rigor": "border-blue-400 bg-blue-50",
  "II. Product Rigor & Specification": "border-purple-400 bg-purple-50",
  "III. Operational Execution": "border-green-400 bg-green-50",
  "IV. Stakeholder & Market Advocacy": "border-orange-400 bg-orange-50",
};

const INDICATOR_DESC: Record<number, string> = {
  1: "Memecah masalah kompleks menjadi logis untuk menemukan akar masalah.",
  2: "Memvalidasi asumsi dengan data/eksperimen sebelum eksekusi fitur secara penuh.",
  3: "Memetakan edge-cases teknis/bisnis dan merancang rencana mitigasi (What-If).",
  4: "Memantau pasar/kompetitor untuk mengidentifikasi celah strategis pengembangan produk.",
  5: "Kecepatan & ketajaman mengambil keputusan sulit dengan menyeimbangkan trade-off.",
  6: 'Kejelasan mendefinisikan masalah ("Why") sebelum mendikte spesifikasi solusi ("What").',
  7: "Kualitas, kelengkapan, dan presisi PRD untuk mencegah rework dan asumsi.",
  8: "Pemahaman terhadap arsitektur dasar dan limitasi teknis saat berkomunikasi.",
  9: "Memahami alur sistem eksisting secara menyeluruh dan mengintegrasikan praktik terbaik dari kompetitor untuk menghasilkan solusi yang relevan, terhubung, dan meningkatkan kualitas fondasi produk.",
  10: "Pengelolaan timeline dan kemampuan menghilangkan blocker operasional.",
  11: "Akuntabilitas penuh (rasa kepemilikan) dari fase ideation hingga produk dirilis.",
  12: "Kebersihan backlog dan efisiensi seremoni/proses kerja harian tim (sprint/daily).",
  13: "Kemampuan menjembatani dan menyelaraskan kepentingan antara Bisnis, Tech, dan Produk.",
  14: "Manajemen ekspektasi dan komunikasi dengan pihak luar (RS, Dokter, Regulator).",
  15: "Kemampuan berempati dan secara gigih membela kepentingan pengguna (Tenaga Kesehatan).",
};

/* ============================================================
   ROLE INDICATOR MATRIX
   Indikator mana saja yang boleh dinilai tiap role.
   ============================================================ */

const ROLE_INDICATOR_MATRIX: Record<string, Set<number>> = {
  avg_self: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  avg_lead_po: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  avg_sa: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  avg_ui_ux: new Set([2, 4, 6, 7, 12, 15]),
  avg_dev: new Set([5, 6, 7, 8, 10, 12, 13]),
  avg_qa: new Set([3, 5, 6, 7, 10, 12, 13]),
  avg_pm: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
};

function renderRoleCell(
  value: number | null | undefined,
  roleKey: string,
  indicatorId: number
): React.ReactNode {
  const allowed = ROLE_INDICATOR_MATRIX[roleKey];
  if (allowed && !allowed.has(indicatorId)) {
    return <span className="text-slate-300 text-[10px] italic select-none">N/A</span>;
  }
  if (value === null || value === undefined) {
    return <span className="text-amber-400 font-semibold">-</span>;
  }
  return value.toFixed(1);
}

/* ============================================================
   PEMBOBOTAN (WEIGHTING)
   ============================================================ */

const CATEGORY_WEIGHTS: Record<string, { lead: number; team: number }> = {
  "I. Strategic & Analytical Rigor": { lead: 0.5, team: 0.5 },
  "II. Product Rigor & Specification": { lead: 0.3, team: 0.7 },
  "III. Operational Execution": { lead: 0.3, team: 0.7 },
  "IV. Stakeholder & Market Advocacy": { lead: 0.6, team: 0.4 },
};

function calculateWeightedScore(row: GapAnalysis): number | null {
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

/* ============================================================
   HELPERS
   ============================================================ */

function getCategoryBadgeClass(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-800";
}

function truncateLabel(name: string, max = 20): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

function getScoreLabel(score: number): string {
  if (score >= 6) return "Sangat Baik";
  if (score >= 5) return "Baik";
  if (score >= 4) return "Cukup";
  if (score >= 3) return "Perlu Perbaikan";
  return "Kritis";
}

function getScoreColor(score: number): string {
  if (score >= 6) return "text-emerald-700";
  if (score >= 5) return "text-blue-700";
  if (score >= 4) return "text-amber-700";
  if (score >= 3) return "text-orange-700";
  return "text-red-700";
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function DetailPOPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createBrowserClient();
  const printRef = useRef<HTMLDivElement>(null);

  const poIdFromUrl = searchParams.get("po");

  const [pos, setPOs] = useState<ProductOwner[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>(poIdFromUrl ?? "");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [periods, setPeriods] = useState<
    Array<{
      id: string;
      name: string;
      is_active: boolean;
      type?: string;
      start_date?: string;
      end_date?: string;
    }>
  >([]);
  const [gapData, setGapData] = useState<GapAnalysis[]>([]);
  const [qualitativeNotes, setQualitativeNotes] = useState<QualitativeNote[]>(
    []
  );
  const [totalRaters, setTotalRaters] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Fetch periods + POs ─────────────────────────────── */
  useEffect(() => {
    const fetchMeta = async () => {
      const [posRes, periodRes] = await Promise.all([
        supabase
          .from("product_owners")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("evaluation_periods")
          .select("id, name, is_active, type, start_date, end_date")
          .order("start_date", { ascending: false }),
      ]);
      if (!posRes.error) setPOs((posRes.data as ProductOwner[]) ?? []);
      if (!periodRes.error) {
        const p = periodRes.data ?? [];
        setPeriods(p);
        const active = p.find((x: any) => x.is_active) ?? p[0];
        if (active) setSelectedPeriodId(active.id);
      }
    };
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Fetch gap + notes + stats (WITH WEIGHTING) ──────── */
  const fetchData = useCallback(async () => {
    if (!selectedPoId || !selectedPeriodId) return;
    setLoading(true);
    setError(null);

    try {
      const [gapRes, notesRes, statsRes] = await Promise.all([
        supabase
          .from("vw_gap_analysis")
          .select("*")
          .eq("period_id", selectedPeriodId)
          .eq("po_id", selectedPoId)
          .order("indicator_id"),
        supabase
          .from("responses")
          .select("rater_role, qualitative_note")
          .eq("period_id", selectedPeriodId)
          .eq("po_id", selectedPoId)
          .not("qualitative_note", "is", null),
        supabase
          .from("responses")
          .select("id", { count: "exact", head: true })
          .eq("period_id", selectedPeriodId)
          .eq("po_id", selectedPoId),
      ]);

      if (gapRes.error) throw gapRes.error;

      // Terapkan pembobotan
      const rawData = (gapRes.data as GapAnalysis[]) ?? [];
      const weightedData = rawData.map((row) => {
        const weightedScore = calculateWeightedScore(row);
        const gap =
          row.avg_self !== null && weightedScore !== null
            ? row.avg_self - weightedScore
            : null;

        return {
          ...row,
          actual_score: weightedScore,
          gap_self_vs_actual: gap,
          gap_flag:
            gap !== null
              ? Math.abs(gap) >= 1.5
                ? ("critical" as const)
                : Math.abs(gap) >= 0.75
                  ? ("moderate" as const)
                  : ("consistent" as const)
              : null,
        };
      });

      setGapData(weightedData);
      setQualitativeNotes((notesRes.data as QualitativeNote[]) ?? []);
      setTotalRaters(statsRes.count ?? 0);
    } catch (err: any) {
      console.error("DetailPO fetchData:", err);
      toast.error(err.message || "Gagal memuat data detail.");
      setError("Gagal memuat data. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [selectedPoId, selectedPeriodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Derived state ───────────────────────────────────── */
  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    router.push(`/dashboard/detail?po=${poId}`);
  };

  const selectedPO = pos.find((p) => p.id === selectedPoId);
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const selectedPeriodName = selectedPeriod?.name ?? "-";

  // Radar chart data
  const radarData = gapData.map((d) => ({
    indicator_name: truncateLabel(d.indicator_name),
    full_name: d.indicator_name,
    avg_self: d.avg_self ?? 0,
    actual_score: d.actual_score ?? 0,
  }));

  // Group by category
  const categories = Array.from(new Set(gapData.map((d) => d.category)));

  // Summary stats
  const avgSelf =
    gapData.length > 0
      ? gapData.reduce((a, d) => a + (d.avg_self ?? 0), 0) / gapData.length
      : 0;
  const avgTim =
    gapData.length > 0
      ? gapData.reduce((a, d) => a + (d.actual_score ?? 0), 0) / gapData.length
      : 0;
  const avgGap = avgSelf - avgTim;
  const criticalCount = gapData.filter(
    (d) => d.gap_flag === "critical"
  ).length;
  const moderateCount = gapData.filter(
    (d) => d.gap_flag === "moderate"
  ).length;
  const consistentCount = gapData.filter(
    (d) => d.gap_flag === "consistent"
  ).length;

  // Top strengths & weaknesses
  const sortedByScore = [...gapData].sort(
    (a, b) => (b.actual_score ?? 0) - (a.actual_score ?? 0)
  );
  const topStrengths = sortedByScore.slice(0, 3);
  const topWeaknesses = sortedByScore.slice(-3).reverse();

  // Biggest gaps
  const sortedByGap = [...gapData]
    .filter((d) => d.gap_self_vs_actual !== null)
    .sort(
      (a, b) => (b.gap_self_vs_actual ?? 0) - (a.gap_self_vs_actual ?? 0)
    );
  const biggestOverestimates = sortedByGap.slice(0, 3);
  const biggestUnderestimates = sortedByGap.slice(-3).reverse();

  // Category averages
  const categoryAverages = categories.map((cat) => {
    const rows = gapData.filter((d) => d.category === cat);
    const avgActual =
      rows.length > 0
        ? rows.reduce((a, d) => a + (d.actual_score ?? 0), 0) / rows.length
        : 0;
    const avgSelfCat =
      rows.length > 0
        ? rows.reduce((a, d) => a + (d.avg_self ?? 0), 0) / rows.length
        : 0;
    return {
      category: cat,
      shortName: cat.replace(/^[IVX]+\.\s*/, ""),
      avgActual,
      avgSelf: avgSelfCat,
      gap: avgSelfCat - avgActual,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  /* ============================================================
     ERROR STATE
     ============================================================ */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-red-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 text-sm text-blue-600 font-medium hover:underline"
            >
              Coba lagi
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <>
      {/* ===== PRINT STYLES ===== */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #rapor-printable,
          #rapor-printable * {
            visibility: visible;
          }
          #rapor-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden,
          .no-print {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          .print\\:grid {
            display: grid !important;
          }
          @page {
            size: A4 landscape;
            margin: 12mm 10mm;
          }
          .print-no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-page-break {
            break-before: page;
            page-break-before: always;
          }
          table {
            font-size: 9px !important;
          }
          th,
          td {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      <div id="rapor-printable" className="space-y-6">
        {/* ========== SCREEN HEADER (hidden on print) ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
              <span
                className="hover:text-blue-600 cursor-pointer"
                onClick={() => router.push("/dashboard")}
              >
                Overview
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-slate-800">
                {selectedPO?.name ?? "Detail PO"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Detail Product Owner
            </h1>
          </div>
          <div className="flex gap-3">
            <div className="w-48">
              <Select
                value={selectedPeriodId}
                onValueChange={setSelectedPeriodId}
              >
                <SelectTrigger className="bg-white" id="period-select-detail">
                  <SelectValue placeholder="Pilih periode..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Select value={selectedPoId} onValueChange={handlePoChange}>
                <SelectTrigger className="bg-white" id="po-select">
                  <SelectValue placeholder="Pilih PO..." />
                </SelectTrigger>
                <SelectContent>
                  {pos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {gapData.length > 0 && (
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Cetak / Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* ========== MAIN CONTENT ========== */}
        {!selectedPoId ? (
          <Card className="print:hidden">
            <CardContent className="py-16 text-center">
              <p className="text-slate-500 text-sm">
                Pilih Product Owner dari dropdown di atas untuk menampilkan
                detail evaluasi.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ============================================================
                SECTION 1: RAPOR HEADER
                ============================================================ */}
            <div className="border-2 border-slate-300 rounded-lg p-6 bg-white print-no-break">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-6 w-6 text-slate-700" />
                    <h1 className="text-xl font-bold text-slate-900">
                      RAPOR EVALUASI KINERJA
                    </h1>
                  </div>
                  <h2 className="text-base font-semibold text-slate-600 ml-8">
                    Product Owner Performance Review
                  </h2>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p className="font-medium text-slate-700">
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs mt-1 text-red-500 font-medium">
                    Confidential Document: Internal Use Only
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 bg-slate-50 p-4 rounded-lg border">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Nama PO
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedPO?.name ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Tribe
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedPO?.squad ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Periode Evaluasi
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedPeriodName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Jumlah Evaluator
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {totalRaters} orang
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-4">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-blue-600 uppercase tracking-wider font-medium">
                    Skor Self
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${getScoreColor(avgSelf)}`}
                  >
                    {avgSelf.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {getScoreLabel(avgSelf)}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-medium">
                    Skor Tim
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${getScoreColor(avgTim)}`}
                  >
                    {avgTim.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {getScoreLabel(avgTim)}
                  </p>
                </div>
                <div
                  className={`border p-3 rounded-lg text-center ${avgGap > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-sky-50 border-sky-200"
                    }`}
                >
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
                    Gap Rata-rata
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${avgGap > 0 ? "text-red-600" : "text-sky-600"
                      }`}
                  >
                    {avgGap > 0 ? "+" : ""}
                    {avgGap.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {avgGap > 0
                      ? "Over-estimate"
                      : avgGap < 0
                        ? "Under-estimate"
                        : "Selaras"}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-red-600 uppercase tracking-wider font-medium">
                    Critical
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {criticalCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">indikator</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">
                    Moderate
                  </p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {moderateCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">indikator</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-green-600 uppercase tracking-wider font-medium">
                    Consistent
                  </p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {consistentCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">indikator</p>
                </div>
              </div>
            </div>

            {/* ============================================================
                SECTION 2: STRENGTHS & WEAKNESSES
                ============================================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-no-break">
              <Card className="border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top 3 Area Kekuatan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topStrengths.map((item, idx) => (
                      <div
                        key={item.indicator_id}
                        className="flex items-start gap-2"
                      >
                        <span className="bg-green-100 text-green-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {item.indicator_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {INDICATOR_DESC[item.indicator_id]}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-700 shrink-0">
                          {item.actual_score?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Top 3 Area Pengembangan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topWeaknesses.map((item, idx) => (
                      <div
                        key={item.indicator_id}
                        className="flex items-start gap-2"
                      >
                        <span className="bg-red-100 text-red-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {item.indicator_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {INDICATOR_DESC[item.indicator_id]}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-red-700 shrink-0">
                          {item.actual_score?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================================
                SECTION 3: BLIND SPOT / HIDDEN STRENGTH
                ============================================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-no-break">
              <Card className="border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Blind Spot (Self &gt; Tim)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {biggestOverestimates.map((item, idx) => (
                      <div
                        key={item.indicator_id}
                        className="flex items-start gap-2"
                      >
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {item.indicator_name}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-orange-700 shrink-0">
                          +{item.gap_self_vs_actual?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-sky-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-sky-800 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Hidden Strength (Self &lt; Tim)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {biggestUnderestimates.map((item, idx) => (
                      <div
                        key={item.indicator_id}
                        className="flex items-start gap-2"
                      >
                        <span className="bg-sky-100 text-sky-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {item.indicator_name}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-sky-700 shrink-0">
                          {item.gap_self_vs_actual?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================================
                SECTION 4: CATEGORY AVERAGES
                ============================================================ */}
            <Card className="print-no-break">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ringkasan per Kategori Kompetensi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {categoryAverages.map((cat) => (
                    <div
                      key={cat.category}
                      className={`p-4 rounded-lg border-l-4 ${CATEGORY_PRINT_COLORS[cat.category] ??
                        "border-slate-300 bg-slate-50"
                        }`}
                    >
                      <p className="text-xs font-semibold text-slate-700 mb-2 leading-tight">
                        {cat.category}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500">Self</p>
                          <p className="text-lg font-bold text-blue-700">
                            {cat.avgSelf.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Tim</p>
                          <p className="text-lg font-bold text-emerald-700">
                            {cat.avgActual.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Gap</p>
                          <p
                            className={`text-lg font-bold ${cat.gap > 0 ? "text-red-600" : "text-sky-600"
                              }`}
                          >
                            {cat.gap > 0 ? "+" : ""}
                            {cat.gap.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ============================================================
                SECTION 5: RADAR CHART
                ============================================================ */}
            <Card className="print-no-break">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Profil Kompetensi - {selectedPO?.name}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Perbandingan perspektif Self vs Tim (rata-rata evaluator) pada
                  15 indikator. Skala 1 (Sangat Kurang) s/d 7 (Sangat Baik).
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[350px] sm:h-[500px] w-full rounded-lg" />
                ) : radarData.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-16">
                    Belum ada data untuk kombinasi PO dan periode ini.
                  </p>
                ) : (
                  <div className="h-[350px] sm:h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={radarData}
                        margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
                      >
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                          dataKey="indicator_name"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 7]}
                          tickCount={8}
                          tick={{ fontSize: 9, fill: "#94a3b8" }}
                        />
                        <Radar
                          name="Self"
                          dataKey="avg_self"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                        <Radar
                          name="Tim"
                          dataKey="actual_score"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number) => v.toFixed(2)}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================
                SECTION 6: DETAIL SCORE TABLE
                ============================================================ */}
            <Card className="print-page-break">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Skor Detail per Indikator
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Rincian skor dari setiap perspektif evaluator. Gap = Self -
                  Tim. Flag:{" "}
                  <span className="text-red-600 font-medium">Critical</span>{" "}
                  (gap ≥ 1.5),{" "}
                  <span className="text-amber-600 font-medium">Moderate</span>{" "}
                  (gap ≥ 0.75),{" "}
                  <span className="text-green-600 font-medium">Consistent</span>{" "}
                  (gap &lt; 0.75).
                </p>
                {/* Legend penanda cell */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-7 text-center text-slate-300 italic text-[10px] border border-dashed border-slate-200 rounded px-1">
                      N/A
                    </span>
                    <span className="text-slate-500">
                      Role memang tidak menilai indikator ini (sesuai Role
                      Matrix)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-7 text-center text-amber-400 font-semibold border border-dashed border-amber-200 rounded px-1">
                      -
                    </span>
                    <span className="text-slate-500">
                      Role seharusnya menilai, tapi datanya belum masuk
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : gapData.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">
                    Tidak ada data detail.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Indikator</TableHead>
                          <TableHead className="w-[250px]">Deskripsi</TableHead>
                          <TableHead className="text-right">Self</TableHead>
                          <TableHead className="text-right">Lead PO</TableHead>
                          <TableHead className="text-right">SA</TableHead>
                          <TableHead className="text-right">UI/UX</TableHead>
                          <TableHead className="text-right">Dev</TableHead>
                          <TableHead className="text-right">QA</TableHead>
                          <TableHead className="text-right">PM</TableHead>
                          <TableHead className="text-right">Skor Tim</TableHead>
                          <TableHead className="text-right">Gap</TableHead>
                          <TableHead>Flag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((cat) => {
                          const rows = gapData.filter(
                            (d) => d.category === cat
                          );
                          return (
                            <Fragment key={`cat-${cat}`}>
                              <TableRow className="bg-slate-100 hover:bg-slate-100">
                                <TableCell
                                  colSpan={13}
                                  className="font-semibold text-slate-700 text-sm py-2"
                                >
                                  {cat}
                                </TableCell>
                              </TableRow>
                              {rows.map((row) => (
                                <TableRow
                                  key={row.indicator_id}
                                  className={
                                    row.gap_flag === "critical"
                                      ? "bg-rose-50 hover:bg-rose-100"
                                      : ""
                                  }
                                >
                                  <TableCell className="text-slate-400 text-xs">
                                    {row.indicator_id}
                                  </TableCell>
                                  <TableCell className="text-slate-800 text-sm font-medium">
                                    {row.indicator_name}
                                  </TableCell>
                                  <TableCell
                                    className="text-slate-600 text-xs pr-4"
                                    title={
                                      INDICATOR_DESC[row.indicator_id] ?? ""
                                    }
                                  >
                                    {INDICATOR_DESC[row.indicator_id] ?? "-"}
                                  </TableCell>

                                  {/* Self */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_self,
                                      "avg_self",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* Lead PO */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_lead_po,
                                      "avg_lead_po",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* SA */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_sa,
                                      "avg_sa",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* UI/UX */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_ui_ux,
                                      "avg_ui_ux",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* Dev */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_dev,
                                      "avg_dev",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* QA */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_qa,
                                      "avg_qa",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* PM */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {renderRoleCell(
                                      row.avg_pm,
                                      "avg_pm",
                                      row.indicator_id
                                    )}
                                  </TableCell>

                                  {/* Skor Tim */}
                                  <TableCell className="text-right tabular-nums text-sm font-bold text-slate-800">
                                    {row.actual_score?.toFixed(2) ?? "-"}
                                  </TableCell>

                                  {/* Gap */}
                                  <TableCell className="text-right tabular-nums text-sm">
                                    <span
                                      className={
                                        (row.gap_self_vs_actual ?? 0) > 0
                                          ? "text-red-600 font-medium"
                                          : (row.gap_self_vs_actual ?? 0) < 0
                                            ? "text-blue-600 font-medium"
                                            : "text-slate-500"
                                      }
                                    >
                                      {(row.gap_self_vs_actual ?? 0) > 0
                                        ? "+"
                                        : ""}
                                      {row.gap_self_vs_actual?.toFixed(2) ??
                                        "-"}
                                    </span>
                                  </TableCell>

                                  {/* Flag */}
                                  <TableCell>
                                    {row.gap_flag === "critical" ? (
                                      <Badge variant="destructive">
                                        Critical
                                      </Badge>
                                    ) : row.gap_flag === "moderate" ? (
                                      <Badge variant="warning">Moderate</Badge>
                                    ) : row.gap_flag === "consistent" ? (
                                      <Badge variant="success">
                                        Consistent
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">N/A</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================
                SECTION 7: QUALITATIVE NOTES
                ============================================================ */}
            {qualitativeNotes.length > 0 && (
              <Card className="print-no-break">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Catatan Kualitatif dari Evaluator
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Masukan naratif dari para evaluator sebagai konteks tambahan.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {qualitativeNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className="capitalize text-xs"
                          >
                            {note.rater_role.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {note.qualitative_note}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ============================================================
                SECTION 8: PRINT FOOTER / SIGNATURE (print only)
                ============================================================ */}
            <div className="hidden print:block mt-8 pt-6 border-t-2 border-slate-300 print-no-break">
              <div className="grid grid-cols-3 gap-8 text-center text-sm">
                <div>
                  <p className="text-slate-500 mb-12">Dinilai oleh:</p>
                  <div className="border-t border-slate-400 pt-2 mx-8">
                    <p className="font-medium text-slate-700">Lead / CPO</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 mb-12">Mengetahui:</p>
                  <div className="border-t border-slate-400 pt-2 mx-8">
                    <p className="font-medium text-slate-700">
                      HR / People Ops
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 mb-12">Product Owner:</p>
                  <div className="border-t border-slate-400 pt-2 mx-8">
                    <p className="font-medium text-slate-700">
                      {selectedPO?.name ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-6">
                Dokumen ini digenerate secara otomatis oleh Sistem Performance
                Review Product |{" "}
                {new Date().toLocaleDateString("id-ID")} | Halaman ini bersifat
                rahasia.
              </p>
            </div>

            {/* ============================================================
                RAW RESPONSES TABLE (screen only)
                ============================================================ */}
            <div className="print:hidden">
              <RawResponsesTable
                periodId={selectedPeriodId}
                poId={selectedPoId}
                onDataChanged={fetchData}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}