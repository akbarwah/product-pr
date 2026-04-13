"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
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
import type { GapAnalysis, ProductOwner } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  "I. Strategic & Analytical Rigor": "bg-blue-100 text-blue-800",
  "II. Product Rigor & Specification": "bg-purple-100 text-purple-800",
  "III. Operational Execution": "bg-green-100 text-green-800",
  "IV. Stakeholder & Market Advocacy": "bg-orange-100 text-orange-800",
};

const INDICATOR_DESC: Record<number, string> = {
  1: "Memecah masalah kompleks menjadi logis untuk menemukan akar masalah.",
  2: "Memvalidasi asumsi dengan data/eksperimen sebelum eksekusi fitur secara penuh.",
  3: "Memetakan edge-cases teknis/bisnis dan merancang rencana mitigasi (What-If).",
  4: "Memantau pasar/kompetitor untuk mengidentifikasi celah strategis pengembangan produk.",
  5: "Kecepatan & ketajaman mengambil keputusan sulit dengan menyeimbangkan trade-off.",
  6: "Kejelasan mendefinisikan masalah (\"Why\") sebelum mendikte spesifikasi solusi (\"What\").",
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

function getCategoryBadgeClass(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-800";
}

function truncateLabel(name: string, max = 20): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

export default function DetailPOPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createBrowserClient();

  const poIdFromUrl = searchParams.get("po");

  const [pos, setPOs] = useState<ProductOwner[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>(poIdFromUrl ?? "");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [periods, setPeriods] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [gapData, setGapData] = useState<GapAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch periods + POs
  useEffect(() => {
    const fetchMeta = async () => {
      const [posRes, periodRes] = await Promise.all([
        supabase.from("product_owners").select("*").eq("is_active", true).order("name"),
        supabase.from("evaluation_periods").select("id, name, is_active").order("start_date", { ascending: false }),
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
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedPoId || !selectedPeriodId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("vw_gap_analysis")
        .select("*")
        .eq("period_id", selectedPeriodId)
        .eq("po_id", selectedPoId)
        .order("indicator_id");

      if (error) throw error;

      setGapData((data as GapAnalysis[]) ?? []);
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

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    router.push(`/dashboard/detail?po=${poId}`);
  };

  const selectedPO = pos.find((p) => p.id === selectedPoId);

  // Radar chart data
  const radarData = gapData.map((d) => ({
    indicator_name: truncateLabel(d.indicator_name),
    avg_self: d.avg_self ?? 0,
    actual_score: d.actual_score ?? 0,
  }));

  // Group by category for table
  const categories = Array.from(new Set(gapData.map((d) => d.category)));

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-red-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-600 font-medium">{error}</p>
            <button onClick={fetchData} className="mt-4 text-sm text-blue-600 font-medium hover:underline">
              Coba lagi
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <h1 className="text-2xl font-bold text-slate-800">Detail Product Owner</h1>
        </div>
        <div className="flex gap-3">
          <div className="w-48">
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
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
        </div>
      </div>

      {!selectedPoId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-500 text-sm">
              Pilih Product Owner dari dropdown di atas untuk menampilkan detail evaluasi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Profil Kompetensi — {selectedPO?.name}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Perbandingan perspektif Self dan Aktual (Peer Average) pada 15 indikator
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
                    <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
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
                        name="Aktual (Peer)"
                        dataKey="actual_score"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
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

          {/* Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Skor Detail per Indikator
              </CardTitle>
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
                        <TableHead className="w-[300px]">Deskripsi Indikator</TableHead>
                        <TableHead className="text-right">Self</TableHead>
                        <TableHead className="text-right">Lead PO</TableHead>
                        <TableHead className="text-right">SA</TableHead>
                        <TableHead className="text-right">UI/UX</TableHead>
                        <TableHead className="text-right">Dev</TableHead>
                        <TableHead className="text-right">QA</TableHead>
                        <TableHead className="text-right">PM</TableHead>
                        <TableHead className="text-right">Skor Aktual</TableHead>
                        <TableHead className="text-right">Gap</TableHead>
                        <TableHead>Flag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => {
                        const rows = gapData.filter((d) => d.category === cat);
                        return (
                          <>
                            {/* Category group header */}
                            <TableRow key={`cat-${cat}`} className="bg-slate-100 hover:bg-slate-100">
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
                                <TableCell className="text-slate-600 text-xs pr-4" title={INDICATOR_DESC[row.indicator_id] ?? ""}>
                                  {INDICATOR_DESC[row.indicator_id] ?? "Deskripsi tidak tersedia"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_self?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_lead_po?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_sa?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_ui_ux?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_dev?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_qa?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {row.avg_pm?.toFixed(1) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm font-bold text-slate-800">
                                  {row.actual_score?.toFixed(2) ?? "—"}
                                </TableCell>
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
                                    {(row.gap_self_vs_actual ?? 0) > 0 ? "+" : ""}
                                    {row.gap_self_vs_actual?.toFixed(2) ?? "—"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {row.gap_flag === "critical" ? (
                                    <Badge variant="destructive">Critical</Badge>
                                  ) : row.gap_flag === "moderate" ? (
                                    <Badge variant="warning">Moderate</Badge>
                                  ) : row.gap_flag === "consistent" ? (
                                    <Badge variant="success">Consistent</Badge>
                                  ) : (
                                    <Badge variant="secondary">N/A</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <RawResponsesTable 
            periodId={selectedPeriodId} 
            poId={selectedPoId} 
            onDataChanged={fetchData} 
          />
        </>
      )}
    </div>
  );
}
