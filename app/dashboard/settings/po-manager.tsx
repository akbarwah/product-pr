"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { ProductOwner } from "@/lib/types";
import type { Employee } from "@/lib/employees";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
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
import { Plus, Power, PowerOff, RefreshCw, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function PoManager() {
  const [pos, setPos] = useState<ProductOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filtered POs (search)
  const filteredPos = useMemo(() => {
    if (!searchQuery.trim()) return pos;
    const q = searchQuery.toLowerCase();
    return pos.filter(p => p.name.toLowerCase().includes(q) || p.squad.toLowerCase().includes(q));
  }, [pos, searchQuery]);

  const { sorted: sortedPos, sort: poSort, handleSort: handlePoSort } = useSortableTable(filteredPos, { column: "name", direction: "asc" });
  
  // Form state
  const [name, setName] = useState("");
  const [squad, setSquad] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient();

  const fetchPos = async () => {
    setLoading(true);
    const [{ data: posData, error }, { data: empData }] = await Promise.all([
      supabase.from("product_owners").select("*").order("name", { ascending: true }),
      supabase.from("employees").select("*").eq("is_active", true).order("name"),
    ]);

    if (error) {
      toast.error("Gagal memuat direktori PO.");
    } else {
      setPos(posData || []);
    }
    if (empData) setEmployees(empData);
    setLoading(false);
  };

  useEffect(() => {
    fetchPos();
  }, []);

  const suggestions = useMemo(() => {
    if (!name.trim() || name.trim().length < 2) return [];
    return employees
      .filter((e) => e.name.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 6);
  }, [name, employees]);

  const handleSelectSuggestion = (emp: Employee) => {
    setName(emp.name);
    setShowSuggestions(false);
  };

  const handleAddPo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !squad) {
      toast.error("Mohon lengkapi Nama dan Squad.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("product_owners").insert({
      id: crypto.randomUUID(),
      name,
      squad,
      is_active: false,
    });

    if (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } else {
      toast.success("PO berhasil ditambahkan.");
      setIsDialogOpen(false);
      setName("");
      setSquad("");
      fetchPos();
    }
    setIsSubmitting(false);
  };

  const toggleActiveStatus = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("product_owners")
      .update({ is_active: !currentActive })
      .eq("id", id);
    
    if (error) {
      toast.error("Gagal mengubah status PO.");
    } else {
      toast.success(`Status PO ${currentActive ? "disembunyikan" : "diaktifkan"}.`);
      setPos(pos.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
    }
  };

  const handleDelete = async (id: string, poName: string) => {
    if (!window.confirm(`Hapus PO "${poName}" dan SEMUA data penilaiannya secara permanen?\n\nTindakan ini TIDAK BISA dibatalkan.`)) return;
    
    try {
      const { data: responses } = await supabase
        .from("responses")
        .select("id")
        .eq("po_id", id);
      
      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);
        await supabase.from("scores").delete().in("response_id", responseIds);
        await supabase.from("responses").delete().eq("po_id", id);
      }

      const { error } = await supabase.from("product_owners").delete().eq("id", id);
      if (error) throw error;
      
      toast.success(`PO "${poName}" berhasil dihapus.`);
      setPos(pos.filter(p => p.id !== id));
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-800">
            Direktori Product Owner
          </CardTitle>
          <CardDescription className="text-sm">
            Manajemen daftar PO aktif yang berhak dievaluasi dan muncul di dasbor.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setShowSuggestions(false); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              PO Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrasi Product Owner</DialogTitle>
              <DialogDescription>
                Ketik nama untuk melihat sugesti dari direktori karyawan. Status default nonaktif.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPo} className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="po-name">Nama Lengkap</Label>
                <Input
                  id="po-name"
                  placeholder="Ketik nama..."
                  value={name}
                  onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-sm transition-colors"
                        onClick={() => handleSelectSuggestion(emp)}
                      >
                        <span className="font-medium text-slate-700">{emp.name}</span>
                        <span className="text-[11px] text-slate-400">{emp.position}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="squad">Tribe / Squad</Label>
                <Input
                  id="squad"
                  placeholder="Contoh: Core Banking / Lending"
                  value={squad}
                  onChange={(e) => setSquad(e.target.value)}
                />
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
        <div className="mb-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari nama atau squad..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : sortedPos.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            {searchQuery ? "Tidak ditemukan." : "Belum ada direktori PO. Silakan daftar baru."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border mt-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <SortableHead column="name" label="Nama Individu" currentSort={poSort} onSort={handlePoSort} />
                  <SortableHead column="squad" label="Squad / Tribe" currentSort={poSort} onSort={handlePoSort} />
                  <SortableHead column="is_active" label="Visibilitas" currentSort={poSort} onSort={handlePoSort} className="text-center" />
                  <SortableHead column="" label="Aksi" currentSort={{ column: null, direction: null }} onSort={() => {}} className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                    <TableCell className="text-slate-600">{p.squad}</TableCell>
                    <TableCell className="text-center">
                      {p.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none">Muncul</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-400 shadow-none">Disembunyikan</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant={p.is_active ? "ghost" : "outline"}
                          size="sm"
                          className={p.is_active ? "text-slate-400 hover:text-red-600" : "text-blue-600"}
                          onClick={() => toggleActiveStatus(p.id, p.is_active)}
                        >
                          {p.is_active ? (
                            <><PowerOff className="h-3 w-3 mr-1" /> Sembunyikan</>
                          ) : (
                            <><Power className="h-3 w-3 mr-1" /> Munculkan</>
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
