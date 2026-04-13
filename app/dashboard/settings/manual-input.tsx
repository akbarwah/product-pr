"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { EvaluationPeriod, ProductOwner } from "@/lib/types";
import { ROLE_MATRIX } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/employees";
import type { Employee } from "@/lib/employees";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Save,
  Loader2,
  User,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const INDICATOR_NAMES: Record<number, { name: string; category: string }> = {
  1: { name: "Analytical Thinking & Problem Decomposition", category: "Strategic Thinking" },
  2: { name: "Hypothesis-Driven Validation", category: "Strategic Thinking" },
  3: { name: "Risk Mapping & Contingency Planning", category: "Strategic Thinking" },
  4: { name: "Market & Competitive Awareness", category: "Strategic Thinking" },
  5: { name: "Decisive Judgment Under Ambiguity", category: "Product Mastery" },
  6: { name: 'Problem Framing ("Why" before "What")', category: "Product Mastery" },
  7: { name: "PRD Quality & Precision", category: "Product Mastery" },
  8: { name: "Technical Literacy (Architecture Awareness)", category: "Product Mastery" },
  9: { name: "Systemic Product Understanding & Benchmarking", category: "Product Mastery" },
  10: { name: "Timeline & Blocker Management", category: "Operational Execution" },
  11: { name: "End-to-End Ownership & Accountability", category: "Operational Execution" },
  12: { name: "Backlog Hygiene & Sprint Efficiency", category: "Operational Execution" },
  13: { name: "Cross-Functional Alignment (Biz ↔ Tech ↔ Product)", category: "Stakeholder & User" },
  14: { name: "External Stakeholder Communication", category: "Stakeholder & User" },
  15: { name: "User Empathy & Advocacy", category: "Stakeholder & User" },
};

type Step = "select" | "scores" | "done";

export default function ManualInput() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [pos, setPos] = useState<ProductOwner[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Step management
  const [step, setStep] = useState<Step>("select");

  // Step 1: Selection
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedPo, setSelectedPo] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Step 2: Scoring
  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: periodsData }, { data: posData }, { data: empData }] = await Promise.all([
        supabase.from("evaluation_periods").select("*").order("start_date", { ascending: false }),
        supabase.from("product_owners").select("*").order("name"),
        supabase.from("employees").select("*").eq("is_active", true).order("name"),
      ]);
      if (periodsData) {
        setPeriods(periodsData);
        const activePeriod = periodsData.find((p: EvaluationPeriod) => p.is_active);
        if (activePeriod) setSelectedPeriod(activePeriod.id);
      }
      if (posData) setPos(posData);
      if (empData) setEmployees(empData);
      setLoadingEmployees(false);
    };
    fetchData();
  }, []);

  const selectedEmployeeObj = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [selectedEmployeeId, employees]
  );

  const resolvedRole = selectedEmployeeObj?.rater_role ?? "";

  const canProceed = selectedPeriod && selectedPo && selectedEmployeeId && resolvedRole;

  const handleProceedToScoring = () => {
    if (!canProceed) {
      toast.error("Lengkapi seluruh seleksi terlebih dahulu.");
      return;
    }
    const initial: Record<number, number | null> = {};
    for (let i = 1; i <= 15; i++) {
      initial[i] = null;
    }
    setScores(initial);
    setNote("");
    setStep("scores");
  };

  const handleScoreChange = (indicatorId: number, val: string) => {
    const num = parseInt(val);
    if (!isNaN(num)) {
      setScores((prev) => ({ ...prev, [indicatorId]: Math.max(1, Math.min(7, num)) }));
    } else {
      setScores((prev) => ({ ...prev, [indicatorId]: null }));
    }
  };

  const handleSubmit = async () => {
    const missingScores: number[] = [];
    for (let i = 1; i <= 15; i++) {
      if (ROLE_MATRIX[i].includes(resolvedRole) && (scores[i] === null || scores[i] === undefined)) {
        missingScores.push(i);
      }
    }
    if (missingScores.length > 0) {
      toast.error(`Nilai indikator #${missingScores.join(", ")} belum diisi.`);
      return;
    }

    setSaving(true);
    try {
      const responseId = crypto.randomUUID();
      const { error: resErr } = await supabase.from("responses").insert({
        id: responseId,
        period_id: selectedPeriod,
        po_id: selectedPo,
        rater_role: resolvedRole,
        qualitative_note: note || null,
        submitted_at: new Date().toISOString(),
      });
      if (resErr) throw resErr;

      const scoreInserts = [];
      for (let i = 1; i <= 15; i++) {
        const isAllowed = ROLE_MATRIX[i].includes(resolvedRole);
        scoreInserts.push({
          id: crypto.randomUUID(),
          response_id: responseId,
          indicator_id: i,
          score: isAllowed ? (scores[i] ?? 4) : 0,
          is_na: !isAllowed,
        });
      }

      const { error: scoreErr } = await supabase.from("scores").insert(scoreInserts);
      if (scoreErr) throw scoreErr;

      toast.success("Evaluasi berhasil disimpan!");
      setStep("done");
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep("select");
    setSelectedEmployeeId("");
    setScores({});
    setNote("");
  };

  const selectedPoName = pos.find((p) => p.id === selectedPo)?.name ?? "-";
  const selectedPeriodName = periods.find((p) => p.id === selectedPeriod)?.name ?? "-";

  // ── STEP 3: DONE ──
  if (step === "done") {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-16 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Evaluasi Berhasil Disimpan!</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Penilaian dari <strong>{selectedEmployeeObj?.name}</strong> ({selectedEmployeeObj?.position}) untuk{" "}
            <strong>{selectedPoName}</strong> pada siklus <strong>{selectedPeriodName}</strong> telah tercatat.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Button onClick={handleReset} className="bg-blue-600 hover:bg-blue-700">
              Input Evaluasi Lain
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── STEP 2: SCORING ──
  if (step === "scores") {
    const categories = Array.from(new Set(Object.values(INDICATOR_NAMES).map((v) => v.category)));
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-800">Form Penilaian Manual</CardTitle>
              <CardDescription className="text-sm">Isikan skor 1—7 (BARS) untuk setiap indikator.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep("select")}>← Kembali</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 bg-slate-50 border rounded-lg p-3 text-xs text-slate-600">
            <div><span className="text-slate-400">Siklus:</span> <span className="font-medium text-slate-700">{selectedPeriodName}</span></div>
            <div className="text-slate-300">|</div>
            <div><span className="text-slate-400">Target PO:</span> <span className="font-medium text-slate-700">{selectedPoName}</span></div>
            <div className="text-slate-300">|</div>
            <div><span className="text-slate-400">Penilai:</span> <span className="font-medium text-slate-700">{selectedEmployeeObj?.name} ({selectedEmployeeObj?.position})</span></div>
            <div className="text-slate-300">|</div>
            <div><span className="text-slate-400">Role:</span> <Badge variant="outline" className="text-[10px] ml-1 capitalize">{ROLE_LABELS[resolvedRole] || resolvedRole}</Badge></div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {categories.map((cat) => {
            const indicators = Object.entries(INDICATOR_NAMES).filter(([, v]) => v.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">{cat}</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table className="text-sm">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Indikator</TableHead>
                        <TableHead className="w-[110px] text-center">Skor (1-7)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indicators.map(([idxStr, meta]) => {
                        const i = parseInt(idxStr);
                        const isAllowed = ROLE_MATRIX[i].includes(resolvedRole);
                        return (
                          <TableRow key={i} className={isAllowed ? "" : "bg-slate-100/50 opacity-40"}>
                            <TableCell className="font-mono text-slate-400 text-xs">{i}</TableCell>
                            <TableCell>
                              <p className="text-xs font-medium text-slate-700">{meta.name}</p>
                              {!isAllowed && <span className="text-[10px] text-red-400">N/A — Di luar hak evaluasi role ini</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Input type="number" min={1} max={7} value={scores[i] ?? ""} onChange={(e) => handleScoreChange(i, e.target.value)} disabled={!isAllowed} className="w-16 mx-auto text-center h-8" placeholder={isAllowed ? "—" : "N/A"} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
          <div className="space-y-2">
            <Label>Catatan Kualitatif (Opsional)</Label>
            <Textarea placeholder="Masukkan observasi naratif, kelebihan, atau saran..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end gap-3 p-4">
          <Button variant="outline" onClick={() => setStep("select")}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 min-w-36">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Menyimpan..." : "Simpan Evaluasi"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ── STEP 1: SELECTION ──
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">Input Evaluasi Manual</CardTitle>
        <CardDescription className="text-sm">
          Pilih siklus, PO target, dan penilai dari direktori karyawan. Role otomatis dideteksi berdasarkan jabatan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Siklus Evaluasi</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue placeholder="Pilih siklus..." /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.is_active && " ✦"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target PO yang Dinilai</Label>
            <Select value={selectedPo} onValueChange={setSelectedPo}>
              <SelectTrigger><SelectValue placeholder="Pilih PO..." /></SelectTrigger>
              <SelectContent>
                {pos.filter(p => p.is_active).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.squad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Penilai (Rater)</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} — {emp.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedEmployeeObj && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">{selectedEmployeeObj.name}</p>
              <p className="text-xs text-slate-500">
                {selectedEmployeeObj.position} → Role:{" "}
                <Badge variant="outline" className="text-[10px] ml-1 capitalize bg-blue-100 text-blue-700 border-blue-300">
                  {ROLE_LABELS[resolvedRole] || resolvedRole}
                </Badge>
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end p-4">
        <Button onClick={handleProceedToScoring} disabled={!canProceed} className="bg-blue-600 min-w-40">
          Lanjut ke Form Penilaian <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
