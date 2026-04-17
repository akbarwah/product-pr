"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Cell,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase";
import { applyClientScoring } from "@/lib/scoring";
import type { EvaluationPeriod, GapAnalysis, ProductOwner } from "@/lib/types";

/* ============================================================
   ROLE INDICATOR MATRIX
   (sama persis dengan detail page)
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

/* ============================================================
   HEATMAP STYLE
   ============================================================ */

function getHeatmapStyle(gap: number | null): React.CSSProperties {
  if (gap === null) return { backgroundColor: "#f8fafc", color: "#94a3b8" };
  if (gap >= 2.0) return { backgroundColor: "#b91c1c", color: "white" };
  if (gap >= 1.0) return { backgroundColor: "#fecaca", color: "#7f1d1d" };
  if (gap <= -2.0) return { backgroundColor: "#1d4ed8", color: "white" };
  if (gap <= -1.0) return { backgroundColor: "#bfdbfe", color: "#1e3a8a" };
  return { backgroundColor: "white", color: "#475569" };
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function GapAnalysisPage() {
  const supabase = createBrowserClient();

  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [pos, setPOs] = useState<ProductOwner[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFlag, setSelectedFlag] = useState<string>("all");
  const [allData, setAllData] = useState<GapAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeta = async () => {
      const [periodRes, posRes] = await Promise.all([
        supabase
          .from("evaluation_periods")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("product_owners")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);
      if (!periodRes.error) {
        const p = (periodRes.data as EvaluationPeriod[]) ?? [];
        setPeriods(p);
        const active = p.find((x) => x.is_active) ?? p[0];
        if (active) setSelectedPeriodId(active.id);
      }
      if (!posRes.error) setPOs((posRes.data as ProductOwner[]) ?? []);
    };
    fetchMeta();
  }, []);

  /* ─── Fetch data WITH WEIGHTING ───────────────────────── */
  const fetchData = useCallback(async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("vw_gap_analysis")
        .select("*")
        .eq("period_id", selectedPeriodId)
        .order("po_name")
        .order("indicator_id");
      if (error) throw error;

      // Terapkan pembobotan
      const rawData = (data as GapAnalysis[]) ?? [];
      const weightedData = applyClientScoring(rawData);

      setAllData(weightedData);
    } catch (err: any) {
      console.error("GapAnalysis fetchData:", err);
      toast.error(err.message || "Gagal memuat data gap analysis.");
      setError("Gagal memuat data. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  const filtered = allData.filter((d) => {
    if (selectedPoId !== "all" && d.po_id !== selectedPoId) return false;
    if (selectedCategory !== "all" && d.category !== selectedCategory)
      return false;
    if (selectedFlag !== "all" && d.gap_flag !== selectedFlag) return false;
    return true;
  });

  const categories = Array.from(new Set(allData.map((d) => d.category)));
  const selectedPO = pos.find((p) => p.id === selectedPoId);

  // Diverging chart data (single PO)
  const divergingData = filtered
    .sort(
      (a, b) => (b.gap_self_vs_actual ?? 0) - (a.gap_self_vs_actual ?? 0)
    )
    .map((d) => ({
      indicator_name:
        d.indicator_name.length > 25
          ? d.indicator_name.slice(0, 25) + "..."
          : d.indicator_name,
      gap: d.gap_self_vs_actual ?? 0,
      avg_self: d.avg_self,
      actual_score: d.actual_score,
    }));

  // Heatmap data (all POs)
  const heatmapIndicators = Array.from(
    new Map(
      filtered.map((d) => [d.indicator_id, d.indicator_name])
    ).entries()
  ).sort((a, b) => a[0] - b[0]);

  const heatmapPOs = Array.from(new Set(filtered.map((d) => d.po_id))).map(
    (poId) => ({
      id: poId,
      name: filtered.find((d) => d.po_id === poId)?.po_name ?? poId,
    })
  );

  const heatmapMap = new Map(
    filtered.map((d) => [`${d.po_id}-${d.indicator_id}`, d])
  );

  // CSV export (sekarang pakai data yang sudah weighted)
  const handleDownloadCSV = () => {
    if (allData.length === 0) {
      toast.error("Tidak ada data untuk diunduh.");
      return;
    }

    const headers = [
      "Periode",
      "PO",
      "Indikator ID",
      "Indikator Name",
      "Kategori",
      "Self Score",
      "Weighted Actual Score",
      "Gap (Weighted)",
      "Flag",
    ];

    const rows = allData.map((d) => [
      d.period_name || "",
      d.po_name || "",
      d.indicator_id?.toString() || "",
      `"${d.indicator_name || ""}"`,
      `"${d.category || ""}"`,
      d.avg_self?.toFixed(2) || "N/A",
      d.actual_score?.toFixed(2) || "N/A",
      d.gap_self_vs_actual?.toFixed(2) || "N/A",
      d.gap_flag || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `gap_analysis_weighted_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showDiverging = selectedPoId !== "all";
  const showHeatmap = selectedPoId === "all";

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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gap Analysis</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Analisis kesenjangan persepsi Self vs Tim (Weighted Score)
            </p>
          </div>
          <div>
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              className="flex items-center gap-2 bg-white"
            >
              <Download className="h-4 w-4" />
              Unduh CSV
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3">
          <div className="w-48">
            <Select
              value={selectedPeriodId}
              onValueChange={setSelectedPeriodId}
            >
              <SelectTrigger className="bg-white" id="gap-period">
                <SelectValue placeholder="Periode..." />
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

          <div className="w-48">
            <Select value={selectedPoId} onValueChange={setSelectedPoId}>
              <SelectTrigger className="bg-white" id="gap-po">
                <SelectValue placeholder="PO..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PO</SelectItem>
                {pos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="bg-white" id="gap-cat">
                <SelectValue placeholder="Kategori..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Select value={selectedFlag} onValueChange={setSelectedFlag}>
              <SelectTrigger className="bg-white" id="gap-flag">
                <SelectValue placeholder="Flag..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Flag</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="consistent">Consistent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Diverging Bar Chart (single PO) */}
        {showDiverging && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Self vs Tim (Weighted) - {selectedPO?.name}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Gap positif = PO menilai dirinya lebih tinggi (blind spot);
                negatif = low confidence. Skor Tim sudah terbobot per kategori.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : divergingData.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  Tidak ada data untuk filter ini.
                </p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(divergingData.length * 46, 250)}
                >
                  <BarChart
                    data={divergingData}
                    layout="vertical"
                    margin={{ top: 4, right: 70, left: 12, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="indicator_name"
                      width={170}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v: number) => [
                        v.toFixed(2),
                        "Gap (Self - Tim Weighted)",
                      ]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <ReferenceLine x={0} stroke="#1e293b" strokeWidth={2} />
                    <Bar dataKey="gap" radius={2}>
                      {divergingData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.gap >= 0 ? "#ef5350" : "#42a5f5"}
                        />
                      ))}
                      <LabelList
                        dataKey="gap"
                        position="right"
                        formatter={(v: number) =>
                          (v > 0 ? "+" : "") + v.toFixed(2)
                        }
                        style={{ fontSize: 10, fill: "#64748b" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Heatmap (all POs) */}
        {showHeatmap && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Heatmap Gap (Weighted) - Semua PO
              </CardTitle>
              <p className="text-xs text-slate-500">
                Nilai: Gap Self vs Tim (Weighted). Merah = blind spot, Biru =
                low confidence
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs w-full">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-left text-slate-600 font-semibold min-w-[180px]">
                          Indikator
                        </th>
                        {heatmapPOs.map((po) => (
                          <th
                            key={po.id}
                            className="border border-slate-200 px-2 py-2 text-center text-slate-600 font-semibold min-w-[80px] max-w-[100px]"
                          >
                            <div
                              className="truncate max-w-[80px]"
                              title={po.name}
                            >
                              {po.name.split(" ")[0]}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapIndicators.map(([indId, indName]) => (
                        <tr key={indId}>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 font-medium text-slate-700">
                            {indName}
                          </td>
                          {heatmapPOs.map((po) => {
                            const cell = heatmapMap.get(
                              `${po.id}-${indId}`
                            );
                            const gap = cell?.gap_self_vs_actual ?? null;
                            const style = getHeatmapStyle(gap);
                            const tooltipText = cell
                              ? `Self: ${cell.avg_self?.toFixed(2) ?? "N/A"} | Tim (Weighted): ${cell.actual_score?.toFixed(2) ?? "N/A"} | Gap: ${gap !== null ? (gap > 0 ? "+" : "") + gap.toFixed(2) : "N/A"}`
                              : "Data tidak tersedia";
                            return (
                              <td
                                key={po.id}
                                className="border border-slate-100 text-center font-medium"
                                style={style}
                              >
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="px-2 py-2 cursor-default w-full h-full">
                                      {gap !== null
                                        ? (gap > 0 ? "+" : "") +
                                        gap.toFixed(1)
                                        : "-"}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{tooltipText}</p>
                                  </TooltipContent>
                                </UITooltip>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              emoji: "🔴",
              title: "Critical Gap",
              subtitle: "Gap ≥ 1.5 atau ≤ -1.5",
              desc: "Terdeteksi ada Blind Spot ekstrem (jika positif) atau Underconfident ekstrem (jika negatif).",
              bg: "bg-red-50 border-red-200",
            },
            {
              emoji: "🟡",
              title: "Moderate Gap",
              subtitle: "Gap 0.75 s/d 1.49 (±)",
              desc: "Ada selisih ekspektasi antara self-assessment dengan realita tim. Perlu diselaraskan.",
              bg: "bg-amber-50 border-amber-200",
            },
            {
              emoji: "🟢",
              title: "Konsisten",
              subtitle: "Gap didalam rentang ±0.75",
              desc: "Persepsi selaras antara PO dengan pandangan Tim. Performa objektif terkonfirmasi.",
              bg: "bg-green-50 border-green-200",
            },
          ].map((item) => (
            <Card key={item.title} className={`border ${item.bg}`}>
              <CardContent className="p-4">
                <div className="text-xl mb-1">{item.emoji}</div>
                <p className="text-sm font-semibold text-slate-800">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 mb-1">
                  {item.subtitle}
                </p>
                <p className="text-xs text-slate-600">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}