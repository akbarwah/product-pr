"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Target, Scaling, Layers, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GuidePage() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Panduan & Glosarium Sistem
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Penjelasan metodologi skoring dan cara membaca hasil penilaian kinerja
          Product Owner.
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
            <h3 className="font-semibold text-slate-800 mb-2">
              A. Targeted Review
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Sistem ini dirancang supaya penilaian dilakukan secara presisi dan
              objektif sesuai domainnya. Setiap penilai <i>(Rater)</i> hanya
              bisa menilai indikator yang memang mereka ketahui dan alami
              langsung dalam pekerjaan sehari-hari bersama PO yang bersangkutan.
              Pembatasan ini diatur lewat <strong>Role Matrix</strong>.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
              <strong>Contoh:</strong> Developer tidak akan diminta menilai
              &quot;Kemampuan Lobby Stakeholder & Regulator Eksternal&quot;
              karena mereka tidak ikut ada di proses tersebut. Sebaliknya,
              mereka fokus menilai hal yang mereka rasakan langsung, seperti
              &quot;Kelengkapan PRD & Eksekusi Sprint&quot;.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">
              B. Skala BARS (Behaviorally Anchored Rating Scale)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Skala yang dipakai adalah <strong>1 sampai 7</strong>. Setiap
              angka punya patokan perilaku konkret, bukan sekadar &quot;bagus&quot;
              atau &quot;kurang&quot;. Jadi penilai harus mengacu pada kejadian
              nyata di lapangan, bukan perasaan.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 ml-5 list-disc">
              <li>
                <strong className="text-red-600">Nilai 1 (Kritis):</strong>{" "}
                Secara konsisten menghambat kelancaran produk atau tim.
              </li>
              <li>
                <strong className="text-blue-600">
                  Nilai 4 (Memenuhi Ekspektasi):
                </strong>{" "}
                Menjalankan fungsinya dengan baik sesuai standar.
              </li>
              <li>
                <strong className="text-emerald-600">
                  Nilai 7 (Luar Biasa):
                </strong>{" "}
                Melampaui ekspektasi, proaktif mengubah masalah jadi peluang
                bisnis.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: ROLE MATRIX */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            2. Role Matrix: Siapa Menilai Apa
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Tidak semua role menilai semua 15 indikator. Tabel di bawah
            menunjukkan indikator mana saja yang bisa dinilai oleh tiap role.
            Di halaman Detail PO, cell yang bertanda{" "}
            <span className="text-slate-400 italic text-xs border border-dashed border-slate-200 rounded px-1">
              N/A
            </span>{" "}
            artinya role tersebut memang tidak menilai indikator itu. Sedangkan{" "}
            <span className="text-amber-500 font-semibold text-xs border border-dashed border-amber-200 rounded px-1">
              -
            </span>{" "}
            artinya role tersebut seharusnya menilai, tapi datanya belum masuk.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-2 border font-semibold text-left w-10">
                    #
                  </th>
                  <th className="p-2 border font-semibold text-left">
                    Indikator
                  </th>
                  <th className="p-2 border font-semibold">Self</th>
                  <th className="p-2 border font-semibold">Lead PO</th>
                  <th className="p-2 border font-semibold">SA</th>
                  <th className="p-2 border font-semibold">UI/UX</th>
                  <th className="p-2 border font-semibold">Dev</th>
                  <th className="p-2 border font-semibold">QA</th>
                  <th className="p-2 border font-semibold">PM</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  { id: 1, name: "Problem Decomposition", self: true, lead: true, sa: true, uiux: false, dev: false, qa: false, pm: true },
                  { id: 2, name: "Data-Driven Validation", self: true, lead: true, sa: true, uiux: true, dev: false, qa: false, pm: true },
                  { id: 3, name: "Edge-Case & Risk Mapping", self: true, lead: true, sa: true, uiux: false, dev: false, qa: true, pm: true },
                  { id: 4, name: "Market & Competitor Intel", self: true, lead: true, sa: true, uiux: true, dev: false, qa: false, pm: true },
                  { id: 5, name: "Decision-Making Speed", self: true, lead: true, sa: true, uiux: false, dev: true, qa: true, pm: true },
                  { id: 6, name: "Problem Framing (Why→What)", self: true, lead: true, sa: true, uiux: true, dev: true, qa: true, pm: true },
                  { id: 7, name: "PRD Quality & Precision", self: true, lead: true, sa: true, uiux: true, dev: true, qa: true, pm: true },
                  { id: 8, name: "Technical Literacy", self: true, lead: true, sa: true, uiux: false, dev: true, qa: false, pm: true },
                  { id: 9, name: "System Flow Understanding", self: true, lead: true, sa: true, uiux: false, dev: false, qa: false, pm: true },
                  { id: 10, name: "Timeline & Blocker Mgmt", self: true, lead: true, sa: true, uiux: false, dev: true, qa: true, pm: true },
                  { id: 11, name: "End-to-End Ownership", self: true, lead: true, sa: true, uiux: false, dev: false, qa: false, pm: true },
                  { id: 12, name: "Backlog & Ceremony Hygiene", self: true, lead: true, sa: true, uiux: true, dev: true, qa: true, pm: true },
                  { id: 13, name: "Biz-Tech-Product Bridging", self: true, lead: true, sa: true, uiux: false, dev: true, qa: true, pm: true },
                  { id: 14, name: "External Stakeholder Mgmt", self: true, lead: true, sa: true, uiux: false, dev: false, qa: false, pm: true },
                  { id: 15, name: "User Advocacy", self: true, lead: true, sa: true, uiux: true, dev: false, qa: false, pm: true },
                ].map((row) => (
                  <tr key={row.id} className={row.id % 2 === 0 ? "bg-slate-50/50" : ""}>
                    <td className="p-2 border text-slate-400">{row.id}</td>
                    <td className="p-2 border text-left font-medium text-slate-700">
                      {row.name}
                    </td>
                    <td className="p-2 border">{row.self ? "✓" : <span className="text-slate-300">-</span>}</td>
                    <td className="p-2 border">{row.lead ? "✓" : <span className="text-slate-300">-</span>}</td>
                    <td className="p-2 border">{row.sa ? "✓" : <span className="text-slate-300">-</span>}</td>
                    <td className="p-2 border">{row.uiux ? "✓" : <span className="text-slate-300">-</span>}</td>
                    <td className="p-2 border">{row.dev ? "✓" : <span className="text-slate-300">-</span>}</td>
                    <td className="p-2 border">{row.qa ? "✓" : <span className="text-slate-300">-</span>}</td>
                    <td className="p-2 border">{row.pm ? "✓" : <span className="text-slate-300">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            ✓ = role tersebut menilai indikator ini. Kosong = role tidak diminta
            menilai (akan tampil sebagai N/A di dashboard).
          </p>
        </CardContent>
      </Card>

      {/* SECTION 3: WEIGHTING */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Scaling className="h-5 w-5 text-purple-600" />
            3. Cara Menghitung Skor &quot;Tim&quot;
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Skor <strong>Tim</strong> merupakan rata-rata terbobot (
            <i>Weighted Average</i>) yang menggabungkan dua sudut pandang: dari
            atas (Lead PO / CPO) dan dari rekan kerja (SA, Developer, QA,
            UI/UX, Project Manager). Bobotnya disesuaikan dengan siapa yang
            paling relevan menilai indikator tersebut:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-3 border font-semibold w-1/4">
                    Kategori Indikator
                  </th>
                  <th className="p-3 border font-semibold text-center w-[160px]">
                    Bobot Lead PO / CPO
                  </th>
                  <th className="p-3 border font-semibold text-center w-[180px]">
                    Bobot Tim Operasional
                  </th>
                  <th className="p-3 border font-semibold">Rasionalisasi</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 align-top">
                <tr>
                  <td className="p-3 border font-medium">
                    I. Strategic &amp; Analytical Rigor
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    50%
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    50%
                  </td>
                  <td className="p-3 border text-xs">
                    Visi strategis harus tajam di mata manajemen yang
                    berhubungan langsung dengan eksekusi di lapangan. Bobotnya
                    seimbang.
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border font-medium">
                    II. Product Rigor &amp; Specification
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    30%
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    70%
                  </td>
                  <td className="p-3 border text-xs">
                    PRD dan spesifikasi produk adalah &quot;makanan
                    sehari-hari&quot; engineer dan desainer. Mereka yang paling
                    merasakan jika dokumennya kurang jelas atau berubah-ubah.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">
                    III. Operational Execution
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    30%
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    70%
                  </td>
                  <td className="p-3 border text-xs">
                    Soal manajemen timeline dan ritme sprint, tim operasional
                    yang paling kena dampaknya langsung setiap hari.
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border font-medium">
                    IV. Stakeholder &amp; Market Advocacy
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    60%
                  </td>
                  <td className="p-3 border text-center font-bold text-slate-800">
                    40%
                  </td>
                  <td className="p-3 border text-xs">
                    Urusan lobby internal dan diplomasi ke pihak luar (regulator,
                    partner) lebih banyak terpantau oleh Lead dan VP.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Penjelasan alur perhitungan */}
          <div className="mt-5 bg-purple-50 border border-purple-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-800 mb-2">
              Alur Perhitungan per Indikator
            </h4>
            <ol className="text-xs text-purple-700 space-y-1.5 list-decimal ml-4">
              <li>
                Ambil skor <strong>Lead PO</strong> untuk indikator tersebut.
              </li>
              <li>
                Hitung rata-rata skor <strong>Tim Operasional</strong> (SA,
                UI/UX, Dev, QA, PM), tapi hanya dari role yang memang{" "}
                <strong>boleh menilai</strong> indikator itu (sesuai Role
                Matrix) dan yang <strong>datanya sudah masuk</strong>.
              </li>
              <li>
                Kalikan masing-masing dengan bobot kategori di atas.
                <br />
                <span className="font-mono bg-purple-100 px-1 rounded mt-1 inline-block">
                  Skor Tim = (Lead PO × bobot_lead) + (Rata-rata Tim ×
                  bobot_tim)
                </span>
              </li>
              <li>
                <strong>Fallback:</strong> Kalau Lead PO belum mengisi, pakai
                100% rata-rata Tim. Kalau Tim belum ada yang mengisi, pakai 100%
                Lead PO. Kalau dua-duanya kosong, skor = null.
              </li>
            </ol>
          </div>

          <p className="text-xs text-slate-400 mt-3 italic">
            * Mekanisme fallback ini memastikan data tetap bisa dibaca meskipun
            belum semua pihak mengisi penilaian.
          </p>
        </CardContent>
      </Card>

      {/* SECTION 4: GAP ANALYSIS */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            4. Cara Membaca Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Rumusnya:{" "}
            <strong className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Gap = Skor Self - Skor Tim (Weighted)
            </strong>
            . Jangan hanya berfokus pada siapa yang skornya paling tinggi. Yang
            lebih penting untuk ditindaklanjuti adalah{" "}
            <strong>
              seberapa jauh jarak antara penilaian diri sendiri dengan penilaian
              orang lain
            </strong>
            . Sistem menandai setiap indikator dengan flag berikut:
          </p>

          <div className="space-y-4">
            {/* Critical */}
            <div className="flex gap-4 p-4 border border-red-100 bg-red-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="destructive">Critical</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-red-900 text-sm">
                  Gap ≥ 1.5 (positif atau negatif)
                </h4>
                <p className="text-sm text-red-800/80 mt-1">
                  Artinya PO merasa performanya sudah bagus, padahal tim menilai
                  sebaliknya (atau sebaliknya, PO terlalu merendah). Misalnya
                  dia kasih dirinya skor 6.5, tapi tim cuma kasih rata-rata 4.
                  Kalau ada indikator yang masuk zona ini,{" "}
                  <strong>perlu dijadwalkan sesi 1-on-1</strong> untuk
                  membahasnya.
                </p>
              </div>
            </div>

            {/* Moderate */}
            <div className="flex gap-4 p-4 border border-orange-100 bg-orange-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge variant="warning">Moderate</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-orange-900 text-sm">
                  Gap 0.75 s/d 1.49
                </h4>
                <p className="text-sm text-orange-800/80 mt-1">
                  Masih wajar terjadi, tapi sudah mulai ada selisih antara
                  ekspektasi PO dengan kenyataan di tim. Perlu diselaraskan
                  lewat obrolan ringan atau alignment session supaya tidak makin
                  melebar.
                </p>
              </div>
            </div>

            {/* Consistent */}
            <div className="flex gap-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl items-start">
              <div className="shrink-0 pt-0.5">
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                >
                  Consistent
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900 text-sm">
                  Gap &lt; 0.75
                </h4>
                <p className="text-sm text-emerald-800/80 mt-1">
                  Ini kondisi ideal. Penilaian PO terhadap dirinya sendiri
                  sejalan dengan apa yang dirasakan tim. Kalau gap-nya bahkan
                  minus (skor self lebih rendah dari skor tim), itu pertanda
                  bagus. PO-nya cenderung rendah hati dan tidak over-claim soal
                  kemampuannya.
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan threshold */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-3 border font-semibold">Flag</th>
                  <th className="p-3 border font-semibold">
                    Threshold (Gap)
                  </th>
                  <th className="p-3 border font-semibold">Arti</th>
                  <th className="p-3 border font-semibold">Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 text-xs align-top">
                <tr className="bg-red-50/50">
                  <td className="p-3 border">
                    <Badge variant="destructive">Critical</Badge>
                  </td>
                  <td className="p-3 border font-mono font-bold">≥ 1.50</td>
                  <td className="p-3 border">
                    Blind spot besar atau underconfidence ekstrim
                  </td>
                  <td className="p-3 border">Wajib sesi 1-on-1 coaching</td>
                </tr>
                <tr className="bg-orange-50/50">
                  <td className="p-3 border">
                    <Badge variant="warning">Moderate</Badge>
                  </td>
                  <td className="p-3 border font-mono font-bold">
                    0.75 - 1.49
                  </td>
                  <td className="p-3 border">
                    Mulai ada selisih persepsi, perlu perhatian
                  </td>
                  <td className="p-3 border">Alignment session / obrolan ringan</td>
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="p-3 border">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700"
                    >
                      Consistent
                    </Badge>
                  </td>
                  <td className="p-3 border font-mono font-bold">&lt; 0.75</td>
                  <td className="p-3 border">
                    Persepsi selaras, performa terkonfirmasi
                  </td>
                  <td className="p-3 border">Apresiasi & pertahankan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TIP FOOTER */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-8">
        <Info className="h-6 w-6 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Tips untuk HR / User:</strong> Mulai dari halaman{" "}
          <strong>Rekap Overview</strong>, lalu masuk ke grafik Radar per
          individu untuk melihat di mana gap terbesar masing-masing PO. Jangan
          lupa cek juga <strong>Raw Responses</strong>. Di sana ada catatan
          kualitatif dari rater yang sering kali lebih kaya konteks daripada
          sekadar angka.
        </p>
      </div>
    </div>
  );
}