"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyPlus, FileSpreadsheet, Users, ClipboardEdit, UserCog } from "lucide-react";

import PeriodsManager from "./periods-manager";
import PoManager from "./po-manager";
import EmployeesManager from "./employees-manager";
import ManualInput from "./manual-input";
import BulkImport from "./bulk-import";

export default function SettingsPage() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manajemen master data siklus evaluasi, profil PO, direktori karyawan, input penilaian, dan impor data massal.
        </p>
      </div>

      <Tabs defaultValue="periods" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="periods" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <CopyPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Siklus</span>
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Daftar PO</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Karyawan</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ClipboardEdit className="h-4 w-4" />
            <span className="hidden sm:inline">Input Manual</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="periods">
          <PeriodsManager />
        </TabsContent>
        <TabsContent value="pos">
          <PoManager />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesManager />
        </TabsContent>
        <TabsContent value="manual">
          <ManualInput />
        </TabsContent>
        <TabsContent value="bulk">
          <BulkImport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
