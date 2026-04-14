"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Response, Score, ROLE_MATRIX } from "@/lib/types";

// Note: Re-using exact same INDICATOR_DESC
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

interface RawResponsesTableProps {
  periodId: string;
  poId: string;
  onDataChanged: () => void;
}

export function RawResponsesTable({ periodId, poId, onDataChanged }: RawResponsesTableProps) {
  const supabase = createBrowserClient();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [raterRole, setRaterRole] = useState<string>("");
  const [raterName, setRaterName] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [scores, setScores] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const ROLES = [
    { value: "self", label: "Self" },
    { value: "cpo", label: "CPO" },
    { value: "lead_po", label: "Lead PO" },
    { value: "sa", label: "System Analyst (SA)" },
    { value: "ui_ux", label: "UI/UX" },
    { value: "dev", label: "Developer" },
    { value: "qa", label: "QA" },
    { value: "pm", label: "Project Manager (PM)" },
  ];

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("responses")
        .select(`
          id, period_id, po_id, rater_role, rater_name, submitted_at, qualitative_note,
          scores (id, response_id, indicator_id, score, is_na)
        `)
        .eq("period_id", periodId)
        .eq("po_id", poId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setResponses((data as Response[]) ?? []);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengambil data raw responses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (periodId && poId) {
      fetchResponses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId, poId]);

  const openNewForm = () => {
    setEditingId(null);
    setRaterRole("");
    setRaterName("");
    setNote("");
    setScores({});
    setIsModalOpen(true);
  };

  const openEditForm = (response: Response) => {
    setEditingId(response.id);
    setRaterRole(response.rater_role);
    setRaterName(response.rater_name || "");
    setNote(response.qualitative_note || "");
    const scoreMap: Record<number, number> = {};
    if (response.scores) {
      response.scores.forEach((s) => {
        if (!s.is_na) scoreMap[s.indicator_id] = s.score;
      });
    }
    setScores(scoreMap);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menghapus evaluasi ini? (Tindakan ini tidak dapat dibatalkan)"
      )
    )
      return;
    try {
      // First delete scores (if ON DELETE CASCADE is missing)
      await supabase.from("scores").delete().eq("response_id", id);
      const { error } = await supabase.from("responses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Evaluasi berhasil dihapus.");
      fetchResponses();
      onDataChanged();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus evaluasi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raterRole) {
      toast.error("Pilih peran evaluator terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      let currentResponseId = editingId;

      if (!editingId) {
        // Create new
        const newId = crypto.randomUUID();
        const { error: insErr } = await supabase.from("responses").insert({
          id: newId,
          period_id: periodId,
          po_id: poId,
          rater_role: raterRole,
          rater_name: raterName || null,
          qualitative_note: note,
        });
        if (insErr) throw insErr;
        currentResponseId = newId;
      } else {
        // Update
        const { error: updErr } = await supabase
          .from("responses")
          .update({
            rater_role: raterRole,
            rater_name: raterName || null,
            qualitative_note: note,
          })
          .eq("id", editingId);
        if (updErr) throw updErr;

        // Wipe old scores to replace cleanly
        await supabase.from("scores").delete().eq("response_id", editingId);
      }

      // Insert new scores
      const scoreInserts = [];
      for (let i = 1; i <= 15; i++) {
        const allowedRoles = ROLE_MATRIX[i];
        if (allowedRoles.includes(raterRole)) {
          const val = scores[i];
          scoreInserts.push({
            response_id: currentResponseId,
            indicator_id: i,
            score: val !== undefined ? val : 4, // Default to 4 if left blank somehow
            is_na: false,
          });
        }
      }

      if (scoreInserts.length > 0) {
        const { error: scoreErr } = await supabase
          .from("scores")
          .insert(scoreInserts);
        if (scoreErr) throw scoreErr;
      }

      toast.success(
        editingId
          ? "Evaluasi berhasil diubah."
          : "Evaluasi berhasil ditambahkan."
      );
      setIsModalOpen(false);
      fetchResponses();
      onDataChanged();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan evaluasi.");
    } finally {
      setSaving(false);
    }
  };

  const handleScoreChange = (indicatorId: number, val: string) => {
    let num = parseInt(val);
    if (!isNaN(num)) {
      if (num < 1) num = 1;
      if (num > 7) num = 7;
      setScores((prev) => ({ ...prev, [indicatorId]: num }));
    } else {
      const next = { ...scores };
      delete next[indicatorId];
      setScores(next);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-800">
            Riwayat Evaluasi Mentah (CRUD)
          </CardTitle>
          <p className="text-xs text-slate-500">
            Daftar lengkap evaluator & respons kualitatif.
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={openNewForm}
              className="bg-blue-600 hover:bg-blue-700 h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Evaluasi Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Evaluasi" : "Tambah Evaluasi Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peran Evaluator</Label>
                  <Select
                    value={raterRole}
                    onValueChange={setRaterRole}
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Pilih Peran..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!raterRole && (
                    <p className="text-xs text-orange-500">
                      Pilih peran untuk membuka akses indikator berdasarkan
                      Matrix.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nama Penilai</Label>
                  <Input
                    placeholder="Nama evaluator (opsional)"
                    value={raterName}
                    onChange={(e) => setRaterName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan Kualitatif</Label>
                <Textarea
                  placeholder="Berikan observasi Anda..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>

              {raterRole && (
                <div className="border rounded-md overflow-hidden">
                  <Table className="text-sm">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10">ID</TableHead>
                        <TableHead>Indikator</TableHead>
                        <TableHead className="w-[120px] text-center">
                          Skor (1-7)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(INDICATOR_DESC).map(([idxStr, desc]) => {
                        const i = parseInt(idxStr);
                        const isAllowed =
                          ROLE_MATRIX[i].includes(raterRole);
                        return (
                          <TableRow
                            key={i}
                            className={
                              isAllowed ? "" : "bg-slate-100 opacity-50"
                            }
                          >
                            <TableCell>{i}</TableCell>
                            <TableCell className="max-w-md">
                              <p className="text-xs text-slate-700">{desc}</p>
                              {!isAllowed && (
                                <span className="text-[10px] text-red-500 font-medium">
                                  Terkunci (Di luar Matrix)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={1}
                                max={7}
                                value={scores[i] || ""}
                                onChange={(e) =>
                                  handleScoreChange(i, e.target.value)
                                }
                                disabled={!isAllowed}
                                className="w-16 mx-auto text-center h-8"
                                placeholder={isAllowed ? "4" : "N/A"}
                                required={isAllowed}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !raterRole}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Menyimpan..." : "Simpan Evaluasi"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : responses.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Belum ada evaluasi untuk PO ini di periode aktif.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluator Role</TableHead>
                  <TableHead>Nama Penilai</TableHead>
                  <TableHead className="w-[300px]">Catatan</TableHead>
                  <TableHead>Tanggal Submit</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium capitalize text-slate-800">
                      {res.rater_role.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {res.rater_name || (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {res.qualitative_note ? (
                        <p
                          className="truncate max-w-[400px]"
                          title={res.qualitative_note}
                        >
                          {res.qualitative_note}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic">
                          Tidak ada catatan
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs tabular-nums">
                      {new Date(res.submitted_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600"
                          onClick={() => openEditForm(res)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDelete(res.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}