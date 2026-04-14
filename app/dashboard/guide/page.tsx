"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Target, AlertTriangle, BookOpen, Scaling, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GuidePage() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panduan & Glosarium Sistem</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Penjelasan metodologi skoring dan cara membaca hasil penilaian kinerja Product Owner.
        </p>
      </div>

      {/* SECTION 1 */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            1. Latar Belakang & Pendekatan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">A. Targeted Review</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Sistem ini dirancang supaya penilaian dilakukan secara presisi dan objektif sesuai domainnya. Setiap penilai <i>(Rater)</i> hanya bisa menilai indikator yang memang mereka ketahui dan alami langsung dalam pekerjaan sehari-hari bersama PO yang bersangkutan. Pembatasan ini diatur lewat <strong>Role Matrix</strong>.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
              <strong>Contoh:</strong> Developer tidak akan diminta menilai &quot;Kemampuan Lobby Stakeholder & Regulator Eksternal&quot; karena mereka tidak ikut ada di proses tersebut. Sebaliknya, mereka fokus menilai hal yang mereka rasakan langsung, seperti &quot;Kelengkapan PRD & Eksekusi Sprint&quot;.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">B. Skala BARS (Behaviorally Anchored Rating Scale)</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Skala yang dipakai adalah <strong>1 sampai 7</strong>. Setiap angka punya patokan perilaku konkret, bukan sekadar &quot;bagus&quot; atau &quot;kurang&quot;. Jadi penilai harus mengacu pada kejadian nyata di lapangan, bukan perasaan.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 ml-5 list-disc">
              <li><strong className="text-red-600">Nilai 1 (Kritis):</strong> Secara konsisten menghambat kelancaran produk atau tim.</li>
              <li><strong className="text-blue-600">Nilai 4 (Memenuhi Ekspektasi):</strong> Menjalankan fungsinya dengan baik sesuai standar.</li>
              <li><strong className="text-emerald-600">Nilai 7 (Luar Biasa):</strong> Melampaui ekspektasi, proaktif mengubah masalah jadi peluang bisnis.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Scaling className="h-5 w-5 text-purple-600" />
            2. Cara Menghitung Skor &quot;Tim&quot;
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Skor <strong>Tim</strong> merupakan rata-rata terbobot (<i>Weighted Average</i>) yang menggabungkan dua sudut pandang: dari atas (Lead PO / CPO) dan dari rekan kerja (Developer, QA, UI/UX, SA, Project Manager). Bobotnya disesuaikan dengan siapa yang paling relevan menilai indikator tersebut:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-3 border font-semibold w-1/4">Kategori Indikator</th>
                  <th className="p-3 border font-semibold text-center w-[160px]">Bobot Lead PO / CPO</th>
                  <th className="p-3 border font-semibold text-center w-[180px]">Bobot Tim Operasional</th>
                  <th className="p-3 border font-semibold">Rasionalisasi</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 align-top">
                <tr>
                  <td className="p-3 border font-medium">Strategic &amp; Analytical Rigor</td>
                  <td className="p-3 border text-center font-bold text-slate-800">50%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">50%</td>
                  <td className="p-3 border text-xs">Visi strategis harus tajam di mata manajemen yang berhubungan langsung dengan eksekusi di lapangan.   bobotnya seimbang.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border font-medium">Product Rigor &amp; Specification</td>
                  <td className="p-3 border text-center font-bold text-slate-800">30%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">70%</td>
                  <td className="p-3 border text-xs">PRD dan spesifikasi produk adalah &quot;makanan sehari-hari&quot; engineer dan desainer. Mereka yang paling merasakan jika dokumennya kurang jelas atau berubah-ubah.</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Operational Execution</td>
                  <td className="p-3 border text-center font-bold text-slate-800">30%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">70%</td>
                  <td className="p-3 border text-xs">Soal manajemen timeline dan ritme sprint, tim operasional yang paling kena dampaknya langsung setiap hari.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border font-medium">Stakeholder &amp; Market Advocacy</td>
                  <td className="p-3 border text-center font-bold text-slate-800">60%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">40%</td>
                  <td className="p-3 border text-xs">Urusan lobby internal dan diplomasi ke pihak luar (regulator, partner) lebih banyak terpantau oleh Lead dan VP.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            * Kalau salah satu pihak belum mengisi (misal: Lead PO belum menilai), sistem otomatis pakai rata-rata murni dari data yang tersedia supaya hasilnya tetap bisa dibaca.
          </p>
        </CardContent>
      </Card>

      {/* SECTION 3 */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            3. Cara Membaca Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Secara fundamental, <strong className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Gap = Skor Self - Skor Tim</strong>. Namun jangan hanya berfokus pada siapa yang skornya paling tinggi. Karena yang lebih penting untuk ditindaklanjuti adalah <strong>seberapa jauh jarak (gap) antara penilaian diri sendiri dengan penilaian orang lain</strong>. Berikut panduannya:
          </p>

          <div className="space-y-4">
            {/* Critical */}
            <div className="flex gap-4 p-4 border border-red-100 bg-red-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="destructive">Critical</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-red-900 text-sm">Gap Positif Ekstrim (≥ 1.5)</h4>
                <p className="text-sm text-red-800/80 mt-1">
                  Artinya PO merasa performanya sudah bagus, padahal tim menilai sebaliknya. Ini tanda <strong>overconfident</strong> atau blind spot. Misalnya dia kasih dirinya skor 6.5, tapi tim cuma kasih rata-rata 4. Kalau ada indikator yang masuk zona ini, <strong>perlu dijadwalkan sesi 1-on-1</strong> untuk membahasnya.
                </p>
              </div>
            </div>

            {/* Moderate */}
            <div className="flex gap-4 p-4 border border-orange-100 bg-orange-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="warning">Moderate</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-orange-900 text-sm">Gap Sedang (0.5 s/d 1.49)</h4>
                <p className="text-sm text-orange-800/80 mt-1">
                  Masih wajar terjadi, tapi sudah mulai ada selisih antara ekspektasi PO dengan kenyataan di tim. Perlu diselaraskan lewat obrolan ringan atau alignment session supaya tidak makin melebar.
                </p>
              </div>
            </div>

            {/* Consistent */}
            <div className="flex gap-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Consistent</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900 text-sm">Gap Kecil atau Negatif (&lt; 0.5)</h4>
                <p className="text-sm text-emerald-800/80 mt-1">
                  Ini kondisi ideal. Penilaian PO terhadap dirinya sendiri sejalan dengan apa yang dirasakan tim. Kalau gap-nya bahkan minus (skor self lebih rendah dari skor tim), itu pertanda bagus. PO-nya cenderung rendah hati dan tidak over-claim soal kemampuannya.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TIP FOOTER */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-8">
        <Info className="h-6 w-6 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Tips untuk HR / User:</strong> Mulai dari halaman <strong>Rekap Overview</strong>, lalu masuk ke grafik Radar per individu untuk melihat di mana gap terbesar masing-masing PO. Jangan lupa cek juga <strong>Raw Responses</strong>. Di sana ada catatan kualitatif dari rater yang sering kali lebih kaya konteks daripada sekedar   angka.
        </p>
      </div>
    </div>
  );
}