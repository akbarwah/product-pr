"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { Employee } from "@/lib/employees";
import { ROLE_LABELS, mapPositionToRole } from "@/lib/employees";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function EmployeesManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [raterRole, setRaterRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient();

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Gagal memuat daftar karyawan.");
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !position || !raterRole) {
      toast.error("Mohon lengkapi Nama, Jabatan, dan Role.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("employees").insert({
      name,
      position,
      rater_role: raterRole,
      is_active: true,
    });

    if (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } else {
      toast.success("Karyawan berhasil ditambahkan.");
      setIsDialogOpen(false);
      setName("");
      setPosition("");
      setRaterRole("");
      fetchEmployees();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, empName: string) => {
    if (!window.confirm(`Hapus karyawan "${empName}" secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast.error(`Gagal menghapus: ${error.message}`);
    } else {
      toast.success(`${empName} berhasil dihapus.`);
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  // Auto-detect role from position input
  const handlePositionChange = (val: string) => {
    setPosition(val);
    if (val.trim().length > 3) {
      setRaterRole(mapPositionToRole(val));
    }
  };

  // Duplicate checker: show existing employees matching the typed name
  const nameSuggestions = useMemo(() => {
    if (!name.trim() || name.trim().length < 2) return [];
    return employees
      .filter((e) => e.name.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5);
  }, [name, employees]);

  const handleSelectExisting = (emp: Employee) => {
    setName(emp.name);
    setPosition(emp.position);
    setRaterRole(emp.rater_role);
    setShowSuggestions(false);
  };

  const filtered = searchQuery.trim()
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : employees;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-800">
            Direktori Karyawan (Rater)
          </CardTitle>
          <CardDescription className="text-sm">
            Daftar penilai yang terdaftar. Role otomatis terdeteksi dari jabatan.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setShowSuggestions(false); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Karyawan Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Karyawan</DialogTitle>
              <DialogDescription>
                Ketik nama untuk cek duplikasi. Jabatan akan otomatis mendeteksi role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="emp-name">Nama Lengkap</Label>
                <Input
                  id="emp-name"
                  placeholder="Ketik nama..."
                  value={name}
                  onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                />
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    <p className="px-3 py-1.5 text-[10px] text-orange-500 font-medium bg-orange-50 border-b">⚠ Karyawan yang cocok sudah ada:</p>
                    {nameSuggestions.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-sm transition-colors"
                        onClick={() => handleSelectExisting(emp)}
                      >
                        <span className="font-medium text-slate-700">{emp.name}</span>
                        <span className="text-[11px] text-slate-400">{emp.position}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-position">Jabatan</Label>
                <Input id="emp-position" placeholder="Contoh: Back End Developer" value={position} onChange={(e) => handlePositionChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role Evaluasi (Auto-detect)</Label>
                <Select value={raterRole} onValueChange={setRaterRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Otomatis dari jabatan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).filter(([k]) => k !== "self").map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {raterRole && (
                  <p className="text-xs text-emerald-600">
                    Terdeteksi: <strong>{ROLE_LABELS[raterRole]}</strong>
                  </p>
                )}
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
            <Input placeholder="Cari nama atau jabatan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            {searchQuery ? "Tidak ditemukan." : "Belum ada karyawan. Silakan tambah baru."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium text-slate-800">{emp.name}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{emp.position}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{ROLE_LABELS[emp.rater_role] || emp.rater_role}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-400 shadow-none">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(emp.id, emp.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">Total: {filtered.length} karyawan</p>
      </CardContent>
    </Card>
  );
}
