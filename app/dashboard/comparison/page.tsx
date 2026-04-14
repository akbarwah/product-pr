"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase";
import type { EvaluationPeriod, GapAnalysis, ProductOwner } from "@/lib/types";

/* ============================================================
   ROLE INDICATOR MATRIX
   (sinkron dengan detail page & gap analysis page)
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
   PEMBOBOTAN (WEIGHTING)
   (sinkron dengan detail page & gap analysis page)
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

/**
 * Terapkan pembobotan ke array GapAnalysis.
 * Dipakai untuk pre-test dan post-test.
 */
function applyWeighting(rawData: GapAnalysis[]): GapAnalysis[] {
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
}

/* ============================================================
   HELPERS
   ============================================================ */

function truncateLabel(name: string, max = 20): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function ComparisonPage() {
  const supabase = createBrowserClient();

  const [pos, setPOs] = useState<ProductOwner[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [prePeriod, setPrePeriod] = useState<EvaluationPeriod | null>(null);
  const [postPeriod, setPostPeriod] = useState<EvaluationPeriod | null>(null);
  const [preData, setPreData] = useState<GapAnalysis[]>([]);
  const [postData, setPostData] = useState<GapAnalysis[]>([]);
  const [hasPostTest, setHasPostTest] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch periods and POs
  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      const [posRes, periodRes] = await Promise.all([
        supabase
          .from("product_owners")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("evaluation_periods")
          .select("*")
          .order("start_date", { ascending: false }),
      ]);

      if (!posRes.error) {
        const allPOs = (posRes.data as ProductOwner[]) ?? [];
        setPOs(allPOs);
        if (allPOs.length > 0) setSelectedPoId(allPOs[0].id);
      }

      if (!periodRes.error) {
        const allPeriods = (periodRes.data as EvaluationPeriod[]) ?? [];
        const pre = allPeriods.find((p) => p.type === "pre_test") ?? null;
        const post = allPeriods.find((p) => p.type === "post_test") ?? null;
        setPrePeriod(pre);
        setPostPeriod(post);
        setHasPostTest(post !== null);
      }

      setLoading(false);
    };
    fetchMeta();
  }, []);

  /* ─── Fetch data WITH WEIGHTING ───────────────────────── */
  const fetchData = useCallback(async () => {
    if (!selectedPoId || !prePeriod) return;
    setLoading(true);
    setError(null);

    try {
      const preRes = await supabase
        .from("vw_gap_analysis")
        .select("*")
        .eq("period_id", prePeriod.id)
        .eq("po_id", selectedPoId)
        .order("indicator_id");

      if (preRes.error) throw preRes.error;

      // Terapkan pembobotan ke pre-test
      const rawPre = (preRes.data as GapAnalysis[]) ?? [];
      setPreData(applyWeighting(rawPre));

      if (postPeriod) {
        const postRes = await supabase
          .from("vw_gap_analysis")
          .select("*")
          .eq("period_id", postPeriod.id)
          .eq("po_id", selectedPoId)
          .order("indicator_id");

        if (postRes.error) throw postRes.error;

        // Terapkan pembobotan ke post-test
        const rawPost = (postRes.data as GapAnalysis[]) ?? [];
        setPostData(applyWeighting(rawPost));
      }
    } catch (err: any) {
      console.error("Comparison fetchData:", err);
      toast.error(err.message || "Gagal memuat data perbandingan.");
      setError("Gagal memuat data. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [selectedPoId, prePeriod, postPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Derived data ────────────────────────────────────── */

  // Build joined table data
  const comparisonRows = preData.map((pre) => {
    const post = postData.find((p) => p.indicator_id === pre.indicator_id);
    const delta =
      post?.actual_score !== undefined &&
        post?.actual_score !== null &&
        pre.actual_score !== null
        ? (post.actual_score ?? 0) - (pre.actual_score ?? 0)
        : null;
    return { pre, post, delta };
  });

  const avgDelta =
    comparisonRows.filter((r) => r.delta !== null).length > 0
      ? comparisonRows.reduce((sum, r) => sum + (r.delta ?? 0), 0) /
      comparisonRows.filter((r) => r.delta !== null).length
      : null;

  // Radar data for overlay
  const radarData = preData.map((pre) => {
    const post = postData.find((p) => p.indicator_id === pre.indicator_id);
    return {
      indicator_name: truncateLabel(pre.indicator_name),
      pre: pre.actual_score ?? 0,
      post: post?.actual_score ?? 0,
    };
  });

  // Delta bar chart
  const deltaBarData = comparisonRows
    .filter((r) => r.delta !== null)
    .map((r) => ({
      indicator_name:
        r.pre.indicator_name.length > 25
          ? r.pre.indicator_name.slice(0, 25) + "..."
          : r.pre.indicator_name,
      delta: r.delta ?? 0,
    }))
    .sort((a, b) => b.delta - a.delta);

  const selectedPO = pos.find((p) => p.id === selectedPoId);

  /* ─── Error state ─────────────────────────────────────── */
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

  /* ─── Render ──────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Pre-test vs Post-test Comparison
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Perbandingan skor terbobot sebelum dan sesudah program pengembangan
          </p>
        </div>
        <div className="w-56">
          <Select value={selectedPoId} onValueChange={setSelectedPoId}>
            <SelectTrigger className="bg-white" id="comparison-po">
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
      </div>

      {/* Empty state: no post-test */}
      {!loading && hasPostTest === false && (
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-10">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">
                Data Post-test Belum Tersedia
              </h2>
              <p className="text-slate-500 text-sm">
                Post-test akan dilakukan setelah program intervensi pasca pre
                test selesai dilaksanakan.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loaded: post-test exists */}
      {!loading && hasPostTest && (
        <>
          {/* Period info badges */}
          <div className="flex gap-3 flex-wrap">
            {prePeriod && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" />
                Pre-test:{" "}
                <span className="font-medium">{prePeriod.name}</span>
              </div>
            )}
            {postPeriod && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                Post-test:{" "}
                <span className="font-medium">{postPeriod.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
              Skor menggunakan pembobotan per kategori
            </div>
          </div>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Perbandingan Skor Terbobot - {selectedPO?.name}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Skor Tim sudah dihitung dengan pembobotan Lead PO vs Tim
                Operasional per kategori.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Indikator</TableHead>
                      <TableHead className="text-right">Pre-test</TableHead>
                      <TableHead className="text-right">Post-test</TableHead>
                      <TableHead className="text-right">Δ Delta</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonRows.map((row) => (
                      <TableRow key={row.pre.indicator_id}>
                        <TableCell className="text-slate-400 text-xs">
                          {row.pre.indicator_id}
                        </TableCell>
                        <TableCell className="text-slate-800 font-medium text-sm">
                          {row.pre.indicator_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {row.pre.actual_score?.toFixed(2) ?? "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {row.post?.actual_score?.toFixed(2) ?? "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {row.delta !== null ? (
                            <span
                              className={
                                row.delta > 0
                                  ? "text-green-600 font-medium"
                                  : row.delta < 0
                                    ? "text-red-600 font-medium"
                                    : "text-slate-500"
                              }
                            >
                              {row.delta > 0 ? "+" : ""}
                              {row.delta.toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {row.delta === null ? (
                            <Badge variant="secondary">N/A</Badge>
                          ) : row.delta > 0 ? (
                            <Badge variant="success">↑ Improved</Badge>
                          ) : row.delta < 0 ? (
                            <Badge variant="destructive">↓ Declined</Badge>
                          ) : (
                            <Badge variant="secondary">→ Stagnant</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="font-semibold text-slate-700"
                      >
                        Overall Average
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {avgDelta !== null ? (
                          <span
                            className={
                              avgDelta >= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {avgDelta > 0 ? "+" : ""}
                            {avgDelta.toFixed(2)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Overlay Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Overlay Radar - Pre vs Post (Weighted)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Kedua radar menggunakan skor terbobot yang sama.
              </p>
            </CardHeader>
            <CardContent>
              {radarData.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  Tidak ada data radar.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={480}>
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
                      name="Pre-test (Weighted)"
                      dataKey="pre"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      fill="#94a3b8"
                      fillOpacity={0.05}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Post-test (Weighted)"
                      dataKey="post"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.15}
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
              )}
            </CardContent>
          </Card>

          {/* Delta Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Delta Score per Indikator (Weighted)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Hijau = peningkatan, Merah = penurunan dibanding pre-test.
                Dihitung dari skor terbobot.
              </p>
            </CardHeader>
            <CardContent>
              {deltaBarData.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  Tidak ada data delta.
                </p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(deltaBarData.length * 46, 250)}
                >
                  <BarChart
                    data={deltaBarData}
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
                        (v > 0 ? "+" : "") + v.toFixed(2),
                        "Delta (Weighted)",
                      ]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <ReferenceLine x={0} stroke="#1e293b" strokeWidth={2} />
                    <Bar dataKey="delta" radius={2}>
                      {deltaBarData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.delta >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                      <LabelList
                        dataKey="delta"
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
        </>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}