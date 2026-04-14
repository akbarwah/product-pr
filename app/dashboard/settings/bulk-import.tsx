"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { createBrowserClient } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DownloadCloud,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { EvaluationPeriod, ProductOwner } from "@/lib/types";

export default function BulkImport() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [pos, setPos] = useState<ProductOwner[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [overwriteEnabled, setOverwriteEnabled] = useState(false);

  // Status reporting
  const [progress, setProgress] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  // Existing data count for selected period
  const [existingCount, setExistingCount] = useState(0);

  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: periodsData }, { data: posData }] = await Promise.all([
        supabase.from("evaluation_periods").select("*").eq("is_active", true),
        supabase.from("product_owners").select("*"),
      ]);
      if (periodsData) setPeriods(periodsData);
      if (periodsData && periodsData.length > 0)
        setSelectedPeriod(periodsData[0].id);
      if (posData) setPos(posData);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch existing response count when period changes
  useEffect(() => {
    const fetchExistingCount = async () => {
      if (!selectedPeriod) {
        setExistingCount(0);
        return;
      }
      const { count } = await supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .eq("period_id", selectedPeriod);
      setExistingCount(count ?? 0);
    };
    fetchExistingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  /* ============================================================
     EXPORT: Template + Current Data
     ============================================================ */
  const handleExportWithData = async () => {
    if (!selectedPeriod) {
      toast.error("Pilih siklus evaluasi terlebih dahulu.");
      return;
    }

    setIsExporting(true);

    try {
      // Fetch all responses with scores for the selected period
      const { data: responses, error } = await supabase
        .from("responses")
        .select(
          `
          id, po_id, rater_role, rater_name, qualitative_note,
          scores (indicator_id, score, is_na)
        `
        )
        .eq("period_id", selectedPeriod)
        .order("po_id");

      if (error) throw error;

      const headers = [
        "PO Name",
        "Rater Role",
        "Rater Name",
        "Qualitative Note",
        ...Array.from({ length: 15 }, (_, i) => `Ind${i + 1}_Score`),
      ];

      const rows: string[][] = [];

      if (responses && responses.length > 0) {
        // Map existing responses to CSV rows
        for (const res of responses) {
          const matchedPo = pos.find((p) => p.id === res.po_id);
          const poName = matchedPo?.name ?? res.po_id;

          const scoreMap: Record<number, { score: number; is_na: boolean }> =
            {};
          if (res.scores) {
            for (const s of res.scores as any[]) {
              scoreMap[s.indicator_id] = {
                score: s.score,
                is_na: s.is_na,
              };
            }
          }

          const row = [
            poName,
            res.rater_role,
            (res as any).rater_name ?? "",
            res.qualitative_note ?? "",
          ];

          for (let i = 1; i <= 15; i++) {
            const entry = scoreMap[i];
            if (!entry || entry.is_na) {
              row.push("NA");
            } else {
              row.push(String(entry.score));
            }
          }

          rows.push(row);
        }
      } else {
        // No existing data, add a sample row as guidance
        rows.push([
          pos[0]?.name || "Nama PO",
          "sa",
          "Nama Penilai",
          "Catatan kualitatif di sini",
          "4",
          "5",
          "6",
          "NA",
          "5",
          "7",
          "4",
          "4",
          "4",
          "4",
          "4",
          "4",
          "4",
          "4",
          "4",
        ]);
      }

      // Build CSV
      const periodName =
        periods.find((p) => p.id === selectedPeriod)?.name ?? "export";
      const safeName = periodName.replace(/[^a-zA-Z0-9_-]/g, "_");

      const csvString = Papa.unparse({
        fields: headers,
        data: rows,
      });

      const blob = new Blob(["\uFEFF" + csvString], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Evaluasi_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const rowCount = responses?.length ?? 0;
      if (rowCount > 0) {
        toast.success(
          `Berhasil mengekspor ${rowCount} data evaluasi dari siklus "${periodName}".`
        );
      } else {
        toast.info(
          "Belum ada data di siklus ini. Template kosong dengan contoh baris telah diunduh."
        );
      }
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(err.message || "Gagal mengekspor data.");
    } finally {
      setIsExporting(false);
    }
  };

  /* ============================================================
     OVERWRITE: Delete existing data for the period
     ============================================================ */
  const deleteExistingData = async () => {
    // Get all response IDs for this period
    const { data: existingResponses, error: fetchErr } = await supabase
      .from("responses")
      .select("id")
      .eq("period_id", selectedPeriod);

    if (fetchErr) throw fetchErr;

    if (existingResponses && existingResponses.length > 0) {
      const responseIds = existingResponses.map((r) => r.id);

      // Delete scores first (in case no CASCADE)
      const { error: scoreDelErr } = await supabase
        .from("scores")
        .delete()
        .in("response_id", responseIds);
      if (scoreDelErr) throw scoreDelErr;

      // Delete responses
      const { error: respDelErr } = await supabase
        .from("responses")
        .delete()
        .eq("period_id", selectedPeriod);
      if (respDelErr) throw respDelErr;
    }
  };

  /* ============================================================
     IMPORT: Process CSV Upload
     ============================================================ */
  const handleProcessImport = () => {
    if (!file || !selectedPeriod) {
      toast.error("Pilih siklus evaluasi dan file CSV yang valid.");
      return;
    }

    // Confirmation when overwrite is enabled
    if (overwriteEnabled && existingCount > 0) {
      const confirmed = window.confirm(
        `PERINGATAN: Anda akan MENGHAPUS ${existingCount} data evaluasi yang sudah ada di siklus ini sebelum mengimpor data baru.\n\nTindakan ini TIDAK DAPAT dibatalkan.\n\nLanjutkan?`
      );
      if (!confirmed) return;
    }

    setIsUploading(true);
    setProgress(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let failedCount = 0;

        try {
          // Step 1: Delete existing data if overwrite enabled
          if (overwriteEnabled) {
            try {
              await deleteExistingData();
              toast.info(
                `Data lama (${existingCount} respon) berhasil dihapus. Mengimpor data baru...`
              );
            } catch (err: any) {
              toast.error(
                "Gagal menghapus data lama: " + (err.message || "Unknown error")
              );
              setIsUploading(false);
              return;
            }
          }

          // Step 2: Process each row
          for (const row of rows) {
            try {
              const poName = row["PO Name"]?.toString().trim();
              const raterRole = row["Rater Role"]
                ?.toString()
                .trim()
                .toLowerCase();
              const raterName =
                row["Rater Name"]?.toString().trim() || null;
              const qualitativeNote =
                row["Qualitative Note"]?.toString().trim() || null;

              // Find matching PO
              const matchedPo = pos.find(
                (p) => p.name.toLowerCase() === poName?.toLowerCase()
              );

              if (!matchedPo || !raterRole) {
                failedCount++;
                continue;
              }

              // Valid roles verification
              const validRoles = [
                "self",
                "cpo",
                "lead_po",
                "sa",
                "ui_ux",
                "dev",
                "qa",
                "pm",
              ];
              if (!validRoles.includes(raterRole)) {
                failedCount++;
                continue;
              }

              // Insert Response
              const responseId = crypto.randomUUID();
              const { error: responseError } = await supabase
                .from("responses")
                .insert({
                  id: responseId,
                  period_id: selectedPeriod,
                  po_id: matchedPo.id,
                  rater_role: raterRole,
                  rater_name: raterName,
                  qualitative_note: qualitativeNote,
                  submitted_at: new Date().toISOString(),
                });

              if (responseError) throw responseError;

              // Prepare Scores
              const scoresToInsert = [];
              for (let i = 1; i <= 15; i++) {
                const scoreRaw = row[`Ind${i}_Score`]?.toString().trim();
                const isNa =
                  scoreRaw === "" || scoreRaw?.toUpperCase() === "NA";
                let scoreVal = parseInt(scoreRaw, 10);

                if (isNa || isNaN(scoreVal)) {
                  scoreVal = 1;
                }

                if (!isNa && scoreVal < 1) scoreVal = 1;
                if (!isNa && scoreVal > 7) scoreVal = 7;

                scoresToInsert.push({
                  id: crypto.randomUUID(),
                  response_id: responseId,
                  indicator_id: i,
                  score: scoreVal,
                  is_na: isNa,
                });
              }

              const { error: scoresError } = await supabase
                .from("scores")
                .insert(scoresToInsert);
              if (scoresError) throw scoresError;

              successCount++;
            } catch (err) {
              console.error("Row import failed:", err);
              failedCount++;
            }
          }
        } finally {
          setProgress({
            total: rows.length,
            success: successCount,
            failed: failedCount,
          });
          setIsUploading(false);
          setFile(null);

          // Refresh existing count
          const { count } = await supabase
            .from("responses")
            .select("id", { count: "exact", head: true })
            .eq("period_id", selectedPeriod);
          setExistingCount(count ?? 0);

          if (failedCount > 0) {
            toast.warning(
              `Selesai. ${successCount} berhasil, ${failedCount} gagal dari total ${rows.length} baris.`
            );
          } else {
            toast.success(
              `Berhasil! ${successCount} data respon berhasil dimasukkan.`
            );
          }
        }
      },
      error: (err) => {
        toast.error(`Terjadi kesalahan mem-parsing CSV: ${err.message}`);
        setIsUploading(false);
      },
    });
  };

  const selectedPeriodName =
    periods.find((p) => p.id === selectedPeriod)?.name ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">
          Imigrasi Data Massal (Bulk Import)
        </CardTitle>
        <CardDescription className="text-sm">
          Unggah puluhan atau ratusan evaluasi penilaian PO sekaligus via file
          CSV. Hal ini memangkas waktu input satu-per-satu dari form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ============================================================
            TEMPLATE / EXPORT SECTION
            ============================================================ */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm shrink-0 border border-slate-100">
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-semibold text-slate-800">
                Export Template + Data Existing
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Klik tombol di bawah untuk mengunduh file CSV yang berisi{" "}
                <b>data evaluasi yang sudah ada</b> di siklus yang dipilih. Jika
                belum ada data, file akan berisi contoh baris sebagai panduan.
                Anda bisa mengedit file ini lalu mengunggahnya kembali.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mt-1">
                Header kolom harus persis sesuai template. Nama PO (PO Name)
                harus cocok dengan nama di{" "}
                <b>Daftar PO</b>. Rater Role menggunakan kode:{" "}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">
                  self, cpo, lead_po, sa, ui_ux, dev, qa, pm
                </code>
                .
              </p>

              {selectedPeriod && (
                <p className="text-xs text-slate-600 mt-2">
                  Siklus:{" "}
                  <span className="font-semibold">{selectedPeriodName}</span>{" "}
                  &bull; Data existing:{" "}
                  <span className="font-semibold">{existingCount} respon</span>
                </p>
              )}

              <Button
                onClick={handleExportWithData}
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                disabled={isExporting || !selectedPeriod}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DownloadCloud className="h-4 w-4 mr-2 text-emerald-600" />
                )}
                {isExporting
                  ? "Mengekspor..."
                  : existingCount > 0
                    ? `Unduh Data (${existingCount} respon)`
                    : "Unduh Template Kosong"}
              </Button>
            </div>
          </div>
        </div>

        {/* ============================================================
            IMPORT FORM
            ============================================================ */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Siklus Target Evaluasi</Label>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih yang sedang aktif..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.length === 0 && (
                    <SelectItem value="none" disabled>
                      Tidak ada periode aktif
                    </SelectItem>
                  )}
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File CSV (*.csv)</Label>
              <Input
                type="file"
                accept=".csv"
                className="cursor-pointer text-slate-600"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFile(e.target.files[0]);
                  } else {
                    setFile(null);
                  }
                }}
              />
            </div>
          </div>

          {/* ============================================================
              OVERWRITE TOGGLE
              ============================================================ */}
          <div
            className={`rounded-lg border p-4 ${overwriteEnabled
              ? "bg-red-50 border-red-300"
              : "bg-white border-slate-200"
              }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="overwrite-check"
                checked={overwriteEnabled}
                onChange={(e) => setOverwriteEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <div className="flex-1">
                <label
                  htmlFor="overwrite-check"
                  className="text-sm font-medium text-slate-800 cursor-pointer"
                >
                  Timpa data existing (Overwrite)
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jika dicentang, semua data evaluasi yang sudah ada di siklus
                  ini akan <b>dihapus terlebih dahulu</b> sebelum data baru dari
                  CSV diimpor. Gunakan opsi ini jika Anda ingin mengganti
                  seluruh data, bukan menambahkan.
                </p>

                {overwriteEnabled && existingCount > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-700 font-medium bg-red-100 px-3 py-2 rounded">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      {existingCount} data respon di siklus "
                      {selectedPeriodName}" akan dihapus saat import dimulai.
                      Pastikan Anda sudah mengekspor backup jika diperlukan.
                    </span>
                  </div>
                )}

                {overwriteEnabled && existingCount === 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Belum ada data di siklus ini. Overwrite tidak berpengaruh.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================
              PROGRESS RESULT
              ============================================================ */}
          {progress && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-center gap-3 border ${progress.failed > 0
                ? "bg-orange-50 border-orange-200"
                : "bg-emerald-50 border-emerald-200"
                }`}
            >
              {progress.failed > 0 ? (
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Impor Selesai
                </p>
                <p className="text-xs text-slate-600">
                  Total baris: {progress.total} |
                  <span className="text-emerald-600 font-medium ml-1">
                    Sukses: {progress.success}
                  </span>{" "}
                  |
                  <span className="text-red-600 font-medium ml-1">
                    Gagal/Lewat: {progress.failed}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-between items-center p-4">
        <div className="text-xs text-slate-400">
          {file && (
            <span>
              File: <b>{file.name}</b> ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>
        <Button
          onClick={handleProcessImport}
          disabled={isUploading || !file || !selectedPeriod}
          className={`min-w-36 ${overwriteEnabled
            ? "bg-red-600 hover:bg-red-700"
            : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : overwriteEnabled ? (
            <Trash2 className="h-4 w-4 mr-2" />
          ) : (
            <UploadCloud className="h-4 w-4 mr-2" />
          )}
          {isUploading
            ? "Memproses..."
            : overwriteEnabled
              ? "Timpa & Upload"
              : "Mulai Upload"}
        </Button>
      </CardFooter>
    </Card>
  );
}