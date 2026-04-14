"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
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
import type { EvaluationPeriod, GapAnalysis } from "@/lib/types";

function getBarColor(score: number | null): string {
  if (!score) return "#e2e8f0";
  if (score >= 4.0) return "#10b981"; 
  if (score >= 3.0) return "#f59e0b"; 
  return "#ef4444"; 
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} shadow-sm`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [gapData, setGapData] = useState<GapAnalysis[]>([]);
  const [totalRaters, setTotalRaters] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch periods
  useEffect(() => {
    const fetchPeriods = async () => {
      const { data, error } = await supabase
        .from("evaluation_periods")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) {
        console.error("fetchPeriods:", error);
        toast.error("Gagal memuat data periode evaluasi.");
        setError("Gagal memuat data periode.");
        return;
      }

      const periods = (data as EvaluationPeriod[]) ?? [];
      setPeriods(periods);

      // Default: active period or first
      const active = periods.find((p) => p.is_active) ?? periods[0];
      if (active) setSelectedPeriodId(active.id);
    };
    fetchPeriods();
  }, []);

  // Fetch gap data when period changes
  const fetchData = useCallback(async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    setError(null);

    try {
      const [gapRes, raterRes] = await Promise.all([
        supabase
          .from("vw_gap_analysis")
          .select("*")
          .eq("period_id", selectedPeriodId),
        supabase
          .from("responses")
          .select("*", { count: "exact", head: true })
          .eq("period_id", selectedPeriodId)
          .neq("rater_role", "self"),
      ]);

      if (gapRes.error) throw gapRes.error;
      if (raterRes.error) throw raterRes.error;

      setGapData((gapRes.data as GapAnalysis[]) ?? []);
      setTotalRaters(raterRes.count ?? 0);
    } catch (err: any) {
      console.error("fetchData:", err);
      toast.error(err.message || "Gagal memuat data dashboard.");
      setError("Gagal memuat data. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute stat card values
  const totalPOs = new Set(gapData.map((d) => d.po_id)).size;
  const avgScore =
    gapData.length > 0
      ? gapData
          .filter((d) => d.actual_score !== null)
          .reduce((sum, d) => sum + (d.actual_score ?? 0), 0) /
        gapData.filter((d) => d.actual_score !== null).length
      : 0;
  const gapAlerts = gapData.filter(
    (d) => d.gap_flag === "critical" || d.gap_flag === "moderate"
  ).length;

  // Ranking chart data
  const poScores = Array.from(
    gapData.reduce((map, d) => {
      if (!map.has(d.po_id)) {
        map.set(d.po_id, { po_name: d.po_name, scores: [] });
      }
      if (d.actual_score !== null) {
        map.get(d.po_id)!.scores.push(d.actual_score);
      }
      return map;
    }, new Map<string, { po_name: string; scores: number[] }>())
  )
    .map(([, v]) => ({
      po_name: v.po_name,
      avg_score:
        v.scores.length > 0
          ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length
          : 0,
    }))
    .sort((a, b) => b.avg_score - a.avg_score);

  // Gap alerts for table
  const alertRows = gapData
    .filter((d) => d.gap_flag !== "consistent" && d.gap_flag !== null)
    .sort(
      (a, b) =>
        Math.abs(b.gap_self_vs_actual ?? 0) -
        Math.abs(a.gap_self_vs_actual ?? 0)
    );

  const chartHeight = Math.max(poScores.length * 50, 200);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-red-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 text-sm text-blue-600 hover:underline font-medium"
            >
              Coba lagi
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Performance Evaluation Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Ringkasan evaluasi performa Product Owner
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={selectedPeriodId}
            onValueChange={setSelectedPeriodId}
          >
            <SelectTrigger id="period-select" className="bg-white">
              <SelectValue placeholder="Pilih periode..." />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}{" "}
                  {p.is_active && (
                    <span className="text-green-600 text-xs ml-1">(Aktif)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={Users}
              label="Total PO"
              value={totalPOs}
              color="bg-blue-500"
            />
            <StatCard
              icon={UserCheck}
              label="Total Rater"
              value={totalRaters}
              color="bg-emerald-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Score"
              value={avgScore.toFixed(1)}
              color="bg-violet-500"
            />
            <StatCard
              icon={AlertTriangle}
              label="Gap Alerts"
              value={gapAlerts}
              color="bg-orange-500"
            />
          </>
        )}
      </div>

      {/* Ranking Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">
            Ranking Product Owner
          </CardTitle>
          <p className="text-xs text-slate-500">
            Rata-rata weighted score per PO, diurutkan dari tertinggi
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : poScores.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              Belum ada data untuk periode ini.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={poScores}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  domain={[0, 7]}
                  tickCount={8}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  type="category"
                  dataKey="po_name"
                  width={120}
                  tick={{ fontSize: 12, fill: "#334155" }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toFixed(2),
                    "Avg Score",
                  ]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                  {poScores.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={getBarColor(entry.avg_score)}
                    />
                  ))}
                  <LabelList
                    dataKey="avg_score"
                    position="right"
                    formatter={(v: number) => v.toFixed(2)}
                    style={{ fontSize: 11, fill: "#64748b" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Gap Alert Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">
            ⚠️ Gap Alerts
          </CardTitle>
          <p className="text-xs text-slate-500">
            Indikator dengan kesenjangan persepsi signifikan (critical /
            moderate)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : alertRows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <p className="text-sm">
                ✅ Tidak ada gap signifikan ditemukan
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Indikator</TableHead>
                    <TableHead className="whitespace-nowrap">Kategori</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Self</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Tim</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Gap</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertRows.map((row, i) => (
                    <TableRow
                      key={`${row.po_id}-${row.indicator_id}-${i}`}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/detail?po=${row.po_id}`)
                      }
                    >
                      <TableCell className="font-medium text-slate-900">
                        {row.po_name}
                      </TableCell>
                      <TableCell 
                        className="text-slate-600 text-sm max-w-[150px] sm:max-w-[250px] truncate" 
                        title={row.indicator_name}
                      >
                        {row.indicator_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600">
                        {row.avg_self?.toFixed(1) ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-slate-800">
                        {row.actual_score?.toFixed(2) ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            (row.gap_self_vs_actual ?? 0) > 0
                              ? "text-red-500 font-medium"
                              : "text-emerald-500 font-medium"
                          }
                        >
                          {(row.gap_self_vs_actual ?? 0) > 0 ? "+" : ""}
                          {row.gap_self_vs_actual?.toFixed(2) ?? "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.gap_flag === "critical" ? (
                          <Badge variant="destructive">Critical</Badge>
                        ) : (
                          <Badge variant="warning">Moderate</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
