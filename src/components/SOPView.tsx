import React, { useState } from "react";
import { BookOpen, FileCheck, ShieldAlert, Clock, ArrowRight, Sparkles, Plus, X, Loader2, Copy, Check, Printer } from "lucide-react";

interface SOPItem {
  id: string;
  kode: string;
  judul: string;
  tujuan: string;
  skPenetapan: string;
  dasarHukum?: string[];
  langkahProsedur?: Array<{
    no: number;
    kegiatan: string;
    pelaksana: string;
    kelengkapan: string;
    waktu: string;
    output: string;
  }>;
}

export const SOPView: React.FC<{ onDraftSK: (title: string) => void }> = ({ onDraftSK }) => {
  const [sops, setSops] = useState<SOPItem[]>([
    {
      id: "sop-1",
      kode: "SOP-SD-01",
      judul: "SOP Pelaksanaan Kegiatan Belajar Mengajar (KBM) Kurikulum Merdeka",
      tujuan: "Menstandarkan ketepatan waktu jam masuk, presensi guru, serta modul ajar harian.",
      skPenetapan: "SK Pembagian Tugas Guru dalam KBM",
    },
    {
      id: "sop-2",
      kode: "SOP-SD-02",
      judul: "SOP Penerimaan dan Pengeluaran Dana Bantuan Operasional Satuan Pendidikan (BOSP)",
      tujuan: "Memastikan akuntabilitas belanja barang/jasa sesuai nota dinas dan juknis kemendikbud.",
      skPenetapan: "SK Tim BOS / Pengelola BOSP",
    },
    {
      id: "sop-3",
      kode: "SOP-SD-03",
      judul: "SOP Penanganan Pengaduan dan Kekerasan di Lingkungan Satuan Pendidikan",
      tujuan: "Mekanisme pelaporan cepat dan perlindungan hak anak atas perundungan fisik/psikologis.",
      skPenetapan: "SK Tim Pencegahan dan Penanganan Kekerasan (TPPK)",
    },
    {
      id: "sop-4",
      kode: "SOP-SD-04",
      judul: "SOP Pelayanan Sirkulasi Buku dan Literasi Perpustakaan Sekolah",
      tujuan: "Peminjaman buku teks pelajaran dan buku bacaan bermutu bagi seluruh siswa.",
      skPenetapan: "SK Pengelola Perpustakaan Sekolah",
    },
    {
      id: "sop-5",
      kode: "SOP-SD-05",
      judul: "SOP Pelaksanaan Ujian Sekolah & Asesmen Sumatif Akhir Jenjang",
      tujuan: "Penyusunan naskah soal, pengawasan ruang ujian, hingga pengolahan nilai ijazah.",
      skPenetapan: "SK Panitia Ujian Sekolah",
    },
  ]);

  const [showAIModal, setShowAIModal] = useState(false);
  const [topikInput, setTopikInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<SOPItem | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateSOP = async (presetTopic?: string) => {
    const topic = presetTopic || topikInput;
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/gemini/generate-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topikSOP: topic,
          jenis: "SOP Satuan Pendidikan Dasar",
        }),
      });
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        const d = resJson.data;
        const newSop: SOPItem = {
          id: `sop-ai-${Date.now()}`,
          kode: `SOP-SD-0${sops.length + 1}`,
          judul: d.judul || `SOP ${topic}`,
          tujuan: d.tujuan || `Menstandarkan pelaksanaan ${topic}`,
          skPenetapan: `SK Penetapan SOP ${topic}`,
          dasarHukum: d.dasarHukum,
          langkahProsedur: d.langkahProsedur,
        };
        setSops((prev) => [newSop, ...prev]);
        setSelectedSOP(newSop);
        setShowAIModal(false);
        setTopikInput("");
      }
    } catch (e) {
      console.warn("Gagal membuat SOP AI:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySOP = () => {
    if (!selectedSOP) return;
    const text = `STANDAR OPERASIONAL PROSEDUR (SOP)
Nomor: ${selectedSOP.kode}
Judul: ${selectedSOP.judul}
Tujuan: ${selectedSOP.tujuan}
Dasar Hukum:
${(selectedSOP.dasarHukum || []).map((d) => `• ${d}`).join("\n")}

Langkah-langkah Prosedur:
${(selectedSOP.langkahProsedur || []).map((l) => `${l.no}. ${l.kegiatan} (Pelaksana: ${l.pelaksana}, Waktu: ${l.waktu}, Output: ${l.output})`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Standar Operasional Prosedur (SOP) Satuan Pendidikan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Daftar SOP Administrasi & Penjaminan Mutu Sekolah
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            SOP merupakan instrumen kendali mutu pelaksanaan tupoksi pendidik dan tenaga kependidikan
            yang dilegalisasi melalui Surat Keputusan Kepala Sekolah.
          </p>
        </div>

        <button
          onClick={() => setShowAIModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Susun SOP dengan AI</span>
        </button>
      </div>

      <div className="space-y-3">
        {sops.map((sop) => (
          <div
            key={sop.id}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {sop.kode}
                </span>
                <span className="text-[11px] text-slate-500">
                  Legalitas: {sop.skPenetapan}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{sop.judul}</h3>
              <p className="text-xs text-slate-600">{sop.tujuan}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {sop.langkahProsedur && (
                <button
                  onClick={() => setSelectedSOP(sop)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
                >
                  <span>Lihat Prosedur</span>
                </button>
              )}
              <button
                onClick={() => onDraftSK(sop.skPenetapan)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
              >
                <span>SK Terkait</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: AI SOP Generator */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in duration-200 border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 to-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    Generator SOP Sekolah Berbasis AI
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Susun dokumen SOP lengkap dengan dasar hukum & alur langkah terstruktur
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isGenerating && setShowAIModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Topik / Kegiatan yang Ingin Dibuatkan SOP:
                </label>
                <textarea
                  rows={3}
                  value={topikInput}
                  onChange={(e) => setTopikInput(e.target.value)}
                  placeholder="Contoh: Penanganan Kekerasan dan Bullying di Sekolah Dasar..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Topik Rekomendasi:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Penanganan Bullying & Pengaduan Kekerasan (TPPK)",
                    "Pengelolaan & Pertanggungjawaban Belanja BOSP",
                    "Pelaksanaan Ujian & Asesmen Sumatif (ANBK)",
                    "Pelayanan Sirkulasi & Peminjaman Perpustakaan",
                    "Supervisi Akademik & Kinerja Pembelajaran Guru",
                  ].map((topic, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setTopikInput(topic)}
                      className="text-[11px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors text-left cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAIModal(false)}
                disabled={isGenerating}
                className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleGenerateSOP()}
                disabled={isGenerating || !topikInput.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Menyusun Rincian SOP...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Susun SOP Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pratinjau Rincian SOP */}
      {selectedSOP && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in duration-200 border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedSOP.judul}</h4>
                  <span className="text-[11px] text-slate-500 font-mono">{selectedSOP.kode}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySOP}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Tersalin!" : "Salin Teks"}</span>
                </button>
                <button
                  onClick={() => setSelectedSOP(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                  Tujuan & Ruang Lingkup
                </h5>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedSOP.tujuan}
                </p>
              </div>

              {selectedSOP.dasarHukum && selectedSOP.dasarHukum.length > 0 && (
                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                    Dasar Hukum Acuan
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                    {selectedSOP.dasarHukum.map((dh, i) => (
                      <li key={i}>{dh}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSOP.langkahProsedur && (
                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                    Tabel Prosedur Langkah Kegiatan
                  </h5>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="p-2 w-8 text-center">No</th>
                          <th className="p-2">Uraian Prosedur Kegiatan</th>
                          <th className="p-2">Pelaksana</th>
                          <th className="p-2">Kelengkapan</th>
                          <th className="p-2">Waktu</th>
                          <th className="p-2">Output</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {selectedSOP.langkahProsedur.map((lp) => (
                          <tr key={lp.no}>
                            <td className="p-2 text-center font-bold text-slate-500">{lp.no}</td>
                            <td className="p-2 font-medium">{lp.kegiatan}</td>
                            <td className="p-2 text-slate-600">{lp.pelaksana}</td>
                            <td className="p-2 text-slate-600">{lp.kelengkapan}</td>
                            <td className="p-2 text-slate-600">{lp.waktu}</td>
                            <td className="p-2 font-semibold text-emerald-800">{lp.output}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
