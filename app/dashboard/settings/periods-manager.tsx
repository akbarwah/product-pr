"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { EvaluationPeriod } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSortableTable, SortableHead } from "@/components/sortable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PeriodsManager() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { sorted: sortedPeriods, sort: periodSort, handleSort: handlePeriodSort } = useSortableTable(periods, { column: "start_date", direction: "desc" });
  
  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"pre_test" | "post_test">("post_test");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient();

  const fetchPeriods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluation_periods")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      toast.error("Gagal memuat siklus evaluasi.");
    } else {
      setPeriods(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      toast.error("Mohon lengkapi semua field yang wajib.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("evaluation_periods").insert({
      id: crypto.randomUUID(), // Manual UUID mapping just in case
      name,
      type,
      start_date: startDate,
      end_date: endDate,
      is_active: false, // Default newly created cycle to inactive
    });

    if (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } else {
      toast.success("Periode berhasil ditambahkan.");
      setIsDialogOpen(false);
      setName("");
      setStartDate("");
      setEndDate("");
      fetchPeriods();
    }
    setIsSubmitting(false);
  };

  const toggleActiveStatus = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("evaluation_periods")
      .update({ is_active: !currentActive })
      .eq("id", id);
    
    if (error) {
      toast.error("Berlangsung kegagalan saat mengubah status.");
    } else {
      toast.success("Status diubah.");
      setPeriods(periods.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus siklus "${name}" dan SEMUA data penilaian terkait secara permanen?\n\nTindakan ini TIDAK BISA dibatalkan.`)) return;
    
    // Delete cascade: scores → responses → period
    try {
      // Get all responses for this period
      const { data: responses } = await supabase
        .from("responses")
        .select("id")
        .eq("period_id", id);
      
      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);
        await supabase.from("scores").delete().in("response_id", responseIds);
        await supabase.from("responses").delete().eq("period_id", id);
      }

      const { error } = await supabase.from("evaluation_periods").delete().eq("id", id);
      if (error) throw error;
      
      toast.success(`Siklus "${name}" berhasil dihapus.`);
      setPeriods(periods.filter(p => p.id !== id));
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-800">
            Daftar Siklus (Evaluation Periods)
          </CardTitle>
          <CardDescription className="text-sm">
            Atur kalender evaluasi yang aktif di perusahaan.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Siklus Evaluasi Baru</DialogTitle>
              <DialogDescription>
                Periode baru secara konstan akan berstatus INACTIVE awalnya. Aktifkan saklar nanti bila sudah siap.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPeriod} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Siklus</Label>
                <Input
                  id="name"
                  placeholder="Contoh: H2 2025 Performance Review"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipe Periode</Label>
                <Select
                  value={type}
                  onValueChange={(val: "pre_test" | "post_test") => setType(val)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Pilih tipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post_test">Post-Test (Review Akhir)</SelectItem>
                    <SelectItem value="pre_test">Pre-Test (Baseline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Berakhir</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Belum ada siklus evaluasi. Silakan buat baru.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border mt-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <SortableHead column="name" label="Nama Siklus" currentSort={periodSort} onSort={handlePeriodSort} />
                  <SortableHead column="type" label="Tipe" currentSort={periodSort} onSort={handlePeriodSort} />
                  <SortableHead column="start_date" label="Masa Periode" currentSort={periodSort} onSort={handlePeriodSort} />
                  <SortableHead column="is_active" label="Status" currentSort={periodSort} onSort={handlePeriodSort} className="text-center" />
                  <SortableHead column="" label="Aksi" currentSort={{ column: null, direction: null }} onSort={() => {}} className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPeriods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-slate-600 bg-white">
                        {p.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {p.start_date} <br/>s/d {p.end_date}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.is_active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 shadow-none">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 shadow-none">Arsip</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant={p.is_active ? "outline" : "default"}
                          size="sm"
                          className={p.is_active ? "text-slate-600" : "bg-blue-600"}
                          onClick={() => toggleActiveStatus(p.id, p.is_active)}
                        >
                          {p.is_active ? (
                            <><PowerOff className="h-3 w-3 mr-1" /> Nonaktifkan</>
                          ) : (
                            <><Power className="h-3 w-3 mr-1" /> Aktifkan</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(p.id, p.name)}
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
