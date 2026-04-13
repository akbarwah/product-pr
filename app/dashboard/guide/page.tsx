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
          Basis metodologi skoring dan panduan analitik untuk membaca kinerja Product Owner.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            1. Latar Belakang & Pendekatan Utama
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">A. Targeted Review</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Metode evaluasi yang dikembangkan diutamakan membasmi bias (penilaian subyektif membabi buta). Penilai <i>(Rater)</i> diawasi oleh <strong>Role Matrix</strong>: mereka HANYA diperbolehkan menilai indikator yang betul-betul dikomunikasikan dan terpapar di keseharian pekerjaan mereka dengan sang PO.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
              <strong>Contoh:</strong> Seorang Developer tidak dirancang untuk menilai &quot;Taktik Stakeholder &amp; Regulator Eksternal&quot;, karena ia tidak hadir di <i>meeting</i> tersebut. Mereka akan difokuskan untuk menilai &quot;Kelengkapan PRD &amp; Eksekusi Sprint&quot;.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">B. Skala BARS (Behaviorally Anchored Rating Scale)</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Skor bernilai <strong>1 hingga 7</strong> yang digunakan saat ini bukan bertumpu pada indikator <i>feeling</i> bebas, melainkan berjangkar kuat atas manifestasi perilaku nyata (<i>Behavioral Anchors</i>). Semua individu yang mengisi wajib memutus nilai dari ingatan akan praktik nyata di operasional.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 ml-5 list-disc">
              <li><strong className="text-red-600">Nilai 1-2 (Kritis):</strong> Secara konsisten menghambat kelancaran produk/tim.</li>
              <li><strong className="text-blue-600">Nilai 4 (Standar/Baik):</strong> Berjalan kompeten memenuhi segala ekspektasi fungsi harian.</li>
              <li><strong className="text-emerald-600">Nilai 7 (Luar Biasa/Role Model):</strong> Sangat proaktif mentransformasi masalah menjadi sebuah keunggulan bisnis (<i>beyond expectations</i>).</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Scaling className="h-5 w-5 text-purple-600" />
            2. Rumus Konstruksi Penilaian "Aktual (Peer)"
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Rapor kolom pilar <strong>Aktual (Peer)</strong> adalah perpaduan skor terbobot <i>(Weighted Average)</i> dari sudut pandang manajerial atas (Lead PO) dan sudut pandang eksekutor bawah (Developer/QA/UIUX). Bobot suara divariasikan secara logis menyesuaikan dengan siapa ranah indikator itu lebih condong:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-3 border font-semibold w-1/4">Kategori Indikator</th>
                  <th className="p-3 border font-semibold text-center w-[160px]">Bobot Kacamata Lead PO</th>
                  <th className="p-3 border font-semibold text-center w-[180px]">Bobot Kacamata Tim Operasional</th>
                  <th className="p-3 border font-semibold">Tujuan Logika (<i>Rationale</i>)</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 align-top">
                <tr>
                  <td className="p-3 border font-medium">Strategic &amp; Analytical Rigor</td>
                  <td className="p-3 border text-center font-bold text-slate-800">50%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">50%</td>
                  <td className="p-3 border text-xs">Visi strategis dituntut terbukti tajam di mata eksekutif, sekaligus tertransformasi secara analitis ke lapangan.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border font-medium">Product Rigor &amp; Specification</td>
                  <td className="p-3 border text-center font-bold text-slate-800">30%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">70%</td>
                  <td className="p-3 border text-xs">Desain produk (PRD/GTM) merupakan nyawa bagi <i>engineers</i> &amp; desainer, mereka berhak mendapat porsi keluh kesah tertinggi.</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Operational Execution</td>
                  <td className="p-3 border text-center font-bold text-slate-800">30%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">70%</td>
                  <td className="p-3 border text-xs">Manajemen <i>timeline sprint daily</i> seutuhnya dirasakan secara psikologis oleh ritme tenaga gerak dalam <i>squad</i>.</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border font-medium">Stakeholder &amp; Market Advocacy</td>
                  <td className="p-3 border text-center font-bold text-slate-800">60%</td>
                  <td className="p-3 border text-center font-bold text-slate-800">40%</td>
                  <td className="p-3 border text-xs">Lobi politik internal perusahaan &amp; diplomasi luar (Regulator) utamanya dipantau oleh struktur Lead &amp; VPs.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">* Catatan: Jika entitas penilai kosong pada salah satu spektrum (misal: Lead PO belum turut serta menilai), matriks akan dinamis menarik porsi rata-rata murni 100% dari kolom ketersediaan data guna menjaga data agar tidak patah.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            3. Pemahaman Indikator <i>Gap Analysis</i>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Secara fundamental, <strong className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Gap = Skor Diri Sendiri (Self) − Skor Aktual Gabungan</strong>. Menilai rapor bukan sekadar mencari siapa dengan nilai aktual tertumpuk tertinggi, tetapi krusial menilik <i>Blind Spot</i>/Kesenjangan kematangan empati profesionalnya dengan parameter penanda (Flag) perindikator berikut:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 border border-red-100 bg-red-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="destructive">Critical</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-red-900 text-sm">Gap Positif Ekstrim (≥ 1.5)</h4>
                <p className="text-sm text-red-800/80 mt-1">
                  Karakter <strong>Overconfident</strong> (terlalu percaya diri membabi buta). Sang Evaluator PO menganggap karyanya nir-kerapuhan (misal memberi poin dirinya 6.5), sedangkan satu divisi secara solid frustrasi hanya memberinya poin rata-rata 4. Menemukan area berlabel "Critical" mewajibkan agenda tatap muka 1-on-1 (<i>Coaching Session</i>) dalam perbaikannya.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-orange-100 bg-orange-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="warning">Moderate</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-orange-900 text-sm">Gap Jarak Sedang (0.5 s/d 1.49)</h4>
                <p className="text-sm text-orange-800/80 mt-1">
                  Kesenjangan batas transisi yang cukup kasual (biasa terjadi). Memberi tanda bahwa ego ekspektasi personal PO sedikit mulai membelok jauh (<i>drifting</i>) dari apresiasi ritme teman sejawat. Butuh diselaraskan pemahaman ekspektasi teknisnya (<i>alignment</i>).
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Consistent</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900 text-sm">Validitas Identik / Kolaborasi Kuat (&lt; 0.5 &amp; Skor Mendekati Negatif)</h4>
                <p className="text-sm text-emerald-800/80 mt-1">
                  Tingkat kematangan integritas observasi profesional yang sangat luhur. Apa yang diyakini si PO mengenai "kepiawaiannya" dinilai persis sama selaras oleh pihak bawahan / atasan. Termasuk apabila gap tersebut jatuh memminus (Skor Diri Sendiri &lt; Penilaian Orang), itu merefleksikan rasa kerendahan hatian yang matang (<i>Humble / Empathetic Underconfidence</i>).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-8">
        <Info className="h-6 w-6 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Tip bagi HR/Lead:</strong> Selalu mulai periksa dari halaman Rekap Overview menuju grafik Radar individual untuk menguak fenomena <i>"Blind Spot Ego"</i> para Product Owner Anda, selidiki pula <i>Raw Responses</i> (tulisan tangan kualitatif dari Penilai yang disajikan anonim).
        </p>
      </div>
    </div>
  );
}
