import React, { useState, useRef, useEffect } from "react";
import { SchoolProfile, Employee } from "../types";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  FileText,
  BookOpen,
  ArrowRight,
  Lightbulb,
  RefreshCw,
  Wifi,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isOfflineFallback?: boolean;
  canRetryPrompt?: string;
  suggestedAction?: {
    label: string;
    skType: string;
    actionType?: "sk" | "surat-tugas";
    initialPrompt?: string;
  };
}

interface AIAssistantViewProps {
  schoolProfile: SchoolProfile;
  employees: Employee[];
  onStartSKFromAssistant: (skType: string) => void;
  onOpenSuratTugas?: (prompt?: string) => void;
}

// Client-side intelligent regulation knowledge engine for seamless multi-device & offline support
function getClientLocalAssistantReply(
  text: string,
  school: SchoolProfile,
  totalGuru: number
): string {
  const low = (text || "").toLowerCase();
  if (low.includes("pembagian tugas") || low.includes("kbm") || low.includes("mengajar") || low.includes("jam")) {
    return `📌 **Panduan Pembagian Tugas Guru & KBM (${school.nama}):**\n\n1. **Beban Kerja Wajib:** Berdasarkan Permendikbudristek dan petunjuk teknis linieritas sertifikasi guru, guru kelas & mata pelajaran wajib memenuhi beban mengajar minimal 24 jam tatap muka per minggu (maksimal 40 jam).\n2. **Ekuivalensi Beban Tambahan yang Diakui:**\n   • Wakil Kepala Sekolah: 12 jam tatap muka\n   • Kepala Perpustakaan Sekolah: 12 jam tatap muka\n   • Pembina Pramuka / Ekstrakurikuler: 2 jam tatap muka\n   • Koordinator P5 (Projek Penguatan Profil Pelajar Pancasila): 2 jam per rombongan belajar\n3. **Format Lampiran SK Resmi:**\n   • Lampiran I: Rincian Jadwal & Mata Pelajaran KBM\n   • Lampiran II: Pembagian Tugas Wali Kelas & Pembina Kegiatan\n   • Lampiran III: Penugasan Tenaga Kependidikan (Operator & Penjaga)\n   • Lampiran IV: Tugas Tambahan Khusus`;
  }
  if (low.includes("bos") || low.includes("bosp") || low.includes("anggaran") || low.includes("arkas")) {
    return `📌 **Pedoman SK Tim Pengelola BOSP Reguler (${school.nama}):**\n\n1. **Regulasi Acuan:** Petunjuk Teknis Pengelolaan Dana BOSP terbaru dari Kemendikdasmen.\n2. **Susunan Tim Resmi di SD:**\n   • **Penanggung Jawab:** Kepala Sekolah (${school.kepalaSekolah.nama})\n   • **Bendahara BOSP:** Guru PNS/PPPK atau Tenaga Kependidikan yang cakap tata kelola keuangan\n   • **Anggota:** 1 orang perwakilan Guru dan 1 orang perwakilan Komite Sekolah / Wali Murid\n3. **Tupoksi Tim:** Menyusun perencanaan anggaran melalui aplikasi ARKAS, mengontrol realisasi belanja, menyusun SPJ, dan melaporkan secara transparan pada papan informasi sekolah.`;
  }
  if (low.includes("tppk") || low.includes("kekerasan") || low.includes("bully") || low.includes("perundungan")) {
    return `📌 **Pedoman Pembentukan TPPK SD (${school.nama}):**\n\n1. **Dasar Hukum:** Permendikbudristek No. 46 Tahun 2023 tentang Pencegahan dan Penanganan Kekerasan di Lingkungan Satuan Pendidikan.\n2. **Ketentuan Anggota:**\n   • Jumlah anggota wajib **ganjil** (minimal 3 orang).\n   • Unsur wajib: Perwakilan Pendidik (bukan Kepala Sekolah), Tenaga Kependidikan, dan Komite Sekolah / Orang Tua.\n   • Masa tugas: **2 tahun** dan dapat diperpanjang.\n3. **Kewajiban Pengesahan:** SK yang ditandatangani Kepala Sekolah wajib diunggah ke Portal Pencegahan Kekerasan (Kemendikdasmen) dan tersinkronisasi dengan Dapodik.`;
  }
  if (low.includes("anbk") || low.includes("asesmen") || low.includes("sulingjar")) {
    return `📌 **Pedoman Panitia Asesmen Nasional (ANBK) SD:**\n\n1. **Susunan Panitia:**\n   • Penanggung Jawab: Kepala Sekolah\n   • Ketua Pelaksana: Guru Senior / Urusan Kurikulum\n   • Proktor: 1 orang (menguasai teknis aplikasi web ANBK & Exambro)\n   • Teknisi: 1 orang (memastikan kesiapan perangkat Chromebook/PC dan koneksi internet)\n   • Pengawas Ruang: Pengawas silang dari sekolah sekitar.\n2. **Cakupan Agenda:** Simulasi, Gladi Bersih, Pelaksanaan ANBK Literasi & Numerasi, serta Survei Lingkungan Belajar (Sulingjar).`;
  }
  if (low.includes("dasar hukum") || low.includes("regulasi") || low.includes("mengingat") || low.includes("konsiderans")) {
    return `📌 **Rujukan Dasar Hukum Tata Naskah Dinas SK SD (${school.nama}):**\n\n1. **UU No. 20 Tahun 2003** tentang Sistem Pendidikan Nasional;\n2. **PP No. 57 Tahun 2021 jo PP No. 4 Tahun 2022** tentang Standar Nasional Pendidikan;\n3. **Permendikdasmen No. 10 Tahun 2025** tentang Standar Kompetensi Lulusan (SKL);\n4. **Permendikdasmen No. 12 Tahun 2025** tentang Standar Isi Pendidikan Dasar;\n5. **Permendikdasmen No. 13 Tahun 2025** tentang Struktur & Pedoman Implementasi Kurikulum;\n6. **Keputusan Kepala Dinas Pendidikan Kabupaten ${school.kabupaten}** tentang Kalender Pendidikan Tahun Ajaran Berjalan.`;
  }
  return `Halo Bapak/Ibu Kepala Sekolah ${school.nama}! Saya Asisten AI Administrasi Pendidikan SD.\n\nSaya siap mendampingi pengelolaan administrasi ${totalGuru} orang PTK di sekolah Anda. Anda dapat mendiskusikan:\n• Perhitungan beban kerja 24-40 jam & linieritas sertifikasi guru\n• Susunan tim dan dasar hukum SK TPPK, Tim BOS, atau ANBK\n• Penyusunan konsiderans Menimbang, Mengingat, dan Diktum keputusan\n• Penyesuaian tata naskah dinas Kurikulum Merdeka.\n\nSilakan ajukan pertanyaan atau klik topik rekomendasi di bawah!`;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  schoolProfile,
  employees,
  onStartSKFromAssistant,
  onOpenSuratTugas,
}) => {
  const [activeModel, setActiveModel] = useState<string>("gemini-3.8-flash");
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Periksa status kesehatan koneksi AI ke server
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.model) setActiveModel(data.model);
        if (typeof data.hasApiKey === "boolean") setHasApiKey(data.hasApiKey);
      })
      .catch(() => {});
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-welcome",
      sender: "ai",
      text: `Halo Bapak/Ibu Kepala Sekolah ${schoolProfile.nama} (${schoolProfile.kepalaSekolah.nama}).\n\nSaya adalah Asisten AI Administrasi Kepala Sekolah SD (didukung ${activeModel}). Saya siap membantu Anda dalam:\n1. Menyusun Surat Keputusan (SK) dan Surat Perintah Tugas (SPT) resmi.\n2. Memberikan rujukan regulasi pendidikan terkini (Kurikulum Merdeka, Juknis BOSP, TPPK, Beban Kerja Guru 24-40 Jam Tatap Muka).\n3. Menyusun kalimat konsiderans Menimbang, Mengingat, Diktum, dan lampiran pembagian tugas PTK.\n4. Merancang Program Kerja Sekolah dan Standar Operasional Prosedur (SOP).\n\nApa yang dapat saya bantu hari ini?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectSuggestedAction = (text: string) => {
    const lowText = text.toLowerCase();
    if (lowText.includes("foto") || lowText.includes("gambar") || lowText.includes("scan") || lowText.includes("kamera")) {
      return {
        label: "📸 Buka Pembuat SK & Susun Sesuai Foto/Gambar Dokumen",
        skType: "SK Pembagian Tugas Guru dalam KBM",
        actionType: "sk" as const,
      };
    } else if (lowText.includes("surat tugas") || lowText.includes("spt") || lowText.includes("bimtek") || lowText.includes("pelatihan") || lowText.includes("lomba") || lowText.includes("workshop")) {
      return {
        label: "Buat Surat Tugas (SPT) ini Sekarang",
        skType: "Surat Tugas",
        actionType: "surat-tugas" as const,
        initialPrompt: text,
      };
    } else if (lowText.includes("pembagian tugas") || lowText.includes("kbm")) {
      return {
        label: "Buat SK Pembagian Tugas KBM Sekarang",
        skType: "SK Pembagian Tugas Guru dalam KBM",
        actionType: "sk" as const,
      };
    } else if (lowText.includes("bos") || lowText.includes("bosp")) {
      return {
        label: "Buat SK Tim BOS Sekarang",
        skType: "SK Tim BOS / Pengelola BOSP",
        actionType: "sk" as const,
      };
    } else if (lowText.includes("tppk") || lowText.includes("kekerasan")) {
      return {
        label: "Buat SK TPPK Sekarang",
        skType: "SK Tim Pencegahan dan Penanganan Kekerasan (TPPK)",
        actionType: "sk" as const,
      };
    } else if (lowText.includes("anbk") || lowText.includes("asesmen")) {
      return {
        label: "Buat SK Panitia Asesmen Nasional Sekarang",
        skType: "SK Panitia Asesmen Nasional (ANBK)",
        actionType: "sk" as const,
      };
    }
    return undefined;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    // Sanitize conversation history: exclude error messages and non-substantive notices
    const cleanHistory = messages
      .filter((m) => !m.id.startsWith("ai-err-") && !m.text.includes("gangguan koneksi"))
      .slice(-6)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        content: m.text,
      }));

    try {
      // 35-second timeout to give Gemini ample time for comprehensive responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch("/api/gemini/assistant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text.trim(),
          history: cleanHistory,
          context: {
            sekolah: schoolProfile.nama,
            kepalaSekolah: schoolProfile.kepalaSekolah.nama,
            totalGuru: employees.length,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.reply) {
        const suggestedAction = detectSuggestedAction(text);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: resJson.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedAction,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(resJson.error || "No reply returned");
      }
    } catch (err) {
      console.warn("Assistant connection dropped, using intelligent local engine:", err);
      // Fallback seamlessly to local regulation knowledge so user is never blocked on other devices
      const fallbackReply = getClientLocalAssistantReply(text.trim(), schoolProfile, employees.length);
      const suggestedAction = detectSuggestedAction(text);

      const smartMsg: Message = {
        id: `ai-local-${Date.now()}`,
        sender: "ai",
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOfflineFallback: true,
        canRetryPrompt: text.trim(),
        suggestedAction,
      };
      setMessages((prev) => [...prev, smartMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Dasar hukum terbaru untuk SK Pembagian Tugas Guru Kurikulum Merdeka",
    "Bagaimana susunan tim dan syarat SK TPPK SD tahun 2025?",
    "Pedoman beban mengajar 24 jam guru sertifikasi dan linieritas tugas tambahan",
    "Apa saja susunan tim pengelola BOSP reguler di SD Negeri?",
    "Contoh konsiderans Menimbang untuk SK Panitia Asesmen Nasional (ANBK)",
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Assistant Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Asisten Administrasi Kepala Sekolah SD</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-semibold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                AI Multi-Perangkat Siap
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Konsultasi regulasi, dasar hukum, pembagian tugas guru, & penyusunan SK
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 max-w-3xl ${
              msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-purple-600 text-white"
              }`}
            >
              {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className="space-y-1.5 max-w-full">
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none shadow-xs"
                    : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs whitespace-pre-line"
                }`}
              >
                {msg.text}
              </div>

              {/* Offline fallback indicator & retry button */}
              {msg.isOfflineFallback && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5 px-1">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                    <Wifi className="w-3 h-3 text-amber-600" />
                    Mode Mandiri (Koneksi jaringan terputus)
                  </span>
                  {msg.canRetryPrompt && (
                    <button
                      onClick={() => handleSendMessage(msg.canRetryPrompt)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 text-[10px] text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Coba Hubungkan AI Online Lagi
                    </button>
                  )}
                </div>
              )}

              {msg.suggestedAction && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (msg.suggestedAction?.actionType === "surat-tugas" && onOpenSuratTugas) {
                        onOpenSuratTugas(msg.suggestedAction.initialPrompt || msg.suggestedAction.skType);
                      } else {
                        onStartSKFromAssistant(msg.suggestedAction!.skType);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{msg.suggestedAction.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <span className="text-[10px] text-slate-400 block px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5 max-w-md">
            <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>AI sedang memproses konsultasi regulasi pendidikan...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2.5 bg-white border-t border-slate-100 overflow-x-auto scrollbar-none flex gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center px-1 shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-500" />
          Topik:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp)}
            className="text-[11px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap border border-slate-200 transition-colors cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            id="input-assistant-chat"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Tanyakan regulasi sekolah atau minta AI susun SK..."
            className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <button
            id="btn-send-assistant-chat"
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
};
