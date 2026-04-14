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
import { DownloadCloud, UploadCloud, AlertCircle, CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EvaluationPeriod, ProductOwner } from "@/lib/types";

export default function BulkImport() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [pos, setPos] = useState<ProductOwner[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Status reporting
  const [progress, setProgress] = useState<{ total: number; success: number; failed: number } | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: periodsData }, { data: posData }] = await Promise.all([
        supabase.from("evaluation_periods").select("*").eq("is_active", true),
        supabase.from("product_owners").select("*")
      ]);
      if (periodsData) setPeriods(periodsData);
      if (periodsData && periodsData.length > 0) setSelectedPeriod(periodsData[0].id);
      if (posData) setPos(posData);
    };
    fetchData();
  }, []);

  const handleDownloadTemplate = () => {
    const headers = [
                "PO Name",
      "Rater Role",
      "Qualitative Note",
      ...Array.from({ length: 15 }, (_, i) => `Ind${i + 1}_Score`)
    ];
    
    // Provide a sample row
    const sampleRow = [
      pos[0]?.name || "John Doe",
      "sa",
      "Catatan/Feedback kualitatif",
      "4", "5", "6", "NA", "5", "7", "4", "4", "4", "4", "4", "4", "4", "4", "4"
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(",") + "\n" + 
      sampleRow.join(",");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Bulk_Import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessImport = () => {
    if (!file || !selectedPeriod) {
      toast.error("Pilih siklus evaluasi dan file CSV yang valid.");
      return;
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

        for (const row of rows) {
          try {
            const poName = row["PO Name"]?.toString().trim();
            const raterRole = row["Rater Role"]?.toString().trim().toLowerCase();
            const qualitativeNote = row["Qualitative Note"]?.toString().trim() || null;

            // Find matching PO
            const matchedPo = pos.find((p) => p.name.toLowerCase() === poName?.toLowerCase());
            
            if (!matchedPo || !raterRole) {
              failedCount++;
              continue;
            }

            // Valid roles verification mapping can be basic:
            const validRoles = ["self", "cpo", "lead_po", "sa", "ui_ux", "dev", "qa", "pm"];
            if (!validRoles.includes(raterRole)) {
              failedCount++;
              continue; // Skip invalid role
            }

            // Insert Response
            const responseId = crypto.randomUUID();
            const { error: responseError } = await supabase.from("responses").insert({
              id: responseId,
              period_id: selectedPeriod,
              po_id: matchedPo.id,
              rater_role: raterRole,
              qualitative_note: qualitativeNote,
              submitted_at: new Date().toISOString()
            });

            if (responseError) throw responseError;

            // Prepare Scores
            const scoresToInsert = [];
            for (let i = 1; i <= 15; i++) {
              const scoreRaw = row[`Ind${i}_Score`]?.toString().trim();
              const isNa = scoreRaw === "" || scoreRaw?.toUpperCase() === "NA";
              let scoreVal = parseInt(scoreRaw, 10);
              
              if (isNa || isNaN(scoreVal)) {
                scoreVal = 1;
              }

              // Restrict to 1-7 bounds if not NA
              if (!isNa && scoreVal < 1) scoreVal = 1;
              if (!isNa && scoreVal > 7) scoreVal = 7;

              scoresToInsert.push({
                id: crypto.randomUUID(),
                response_id: responseId,
                indicator_id: i,
                score: scoreVal,
                is_na: isNa
              });
            }

            const { error: scoresError } = await supabase.from("scores").insert(scoresToInsert);
            if (scoresError) throw scoresError;

            successCount++;
          } catch (err) {
            console.error("Row import failed:", err);
            failedCount++;
          }
        }

        setProgress({ total: rows.length, success: successCount, failed: failedCount });
        setIsUploading(false);
        setFile(null); // Reset file input
        
        if (failedCount > 0) {
          toast.warning(`Selesai. ${successCount} berhasil, ${failedCount} gagal dari total ${rows.length} baris.`);
        } else {
          toast.success(`Berhasil! ${successCount} data respon berhasil dimasukkan.`);
        }
      },
      error: (err) => {
        toast.error(`Terjadi kesalahan mem-parsing CSV: ${err.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">
          Imigrasi Data Massal (Bulk Import)
        </CardTitle>
        <CardDescription className="text-sm">
          Unggah puluhan atau ratusan evaluasi penilaian PO sekaligus via file CSV. Hal ini memangkas waktu input satu-per-satu dari form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm shrink-0 border border-slate-100">
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">Format Template Dokumen</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Pastikan *Header* kolom persis menyerupai template yang diunduh. Nama PO (PO Name) harus cocok/identik spesifikannya sesuai dengan nama yang Anda patok di <b>Daftar PO</b>. Peran Rater (Rater Role) harus menggunakan kode bawaan: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">self, cpo, lead_po, sa, ui_ux, dev, qa, pm</code>.
              </p>
              <Button onClick={handleDownloadTemplate} variant="outline" size="sm" className="mt-3 text-xs">
                <DownloadCloud className="h-4 w-4 mr-2 text-emerald-600" /> Unduh Template CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Siklus Target Evaluasi</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih yang sedang aktif..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.length === 0 && <SelectItem value="none" disabled>Tidak ada periode aktif</SelectItem>}
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

          {progress && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 border ${progress.failed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
              {progress.failed > 0 ? (
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">Impor Selesai</p>
                <p className="text-xs text-slate-600">
                  Total baris: {progress.total} | 
                  <span className="text-emerald-600 font-medium ml-1">Sukses: {progress.success}</span> | 
                  <span className="text-red-600 font-medium ml-1">Gagal/Lewat: {progress.failed}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end p-4">
        <Button 
          onClick={handleProcessImport} 
          disabled={isUploading || !file || !selectedPeriod}
          className="bg-blue-600 min-w-32"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4 mr-2" />
          )}
          {isUploading ? "Memproses..." : "Mulai Upload"}
        </Button>
      </CardFooter>
    </Card>
  );
}
