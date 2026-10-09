import React, { useState } from "react";
import {
  SchoolProfile,
  Employee,
  SKDocument,
  NumberingConfig,
  SKDiktum,
  SKAttachment,
} from "../types";
import { skCategories } from "../data/initialData";
import { generateNextSKNumber } from "../utils/numberGenerator";
import { cleanSKJudul } from "../utils/skFormatter";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Building2,
  Calendar,
  Send,
  Loader2,
  Wand2,
  Eye,
  Plus,
  Trash2,
  BookmarkCheck,
  Check,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Upload,
  FileUp,
  X,
} from "lucide-react";
import { getSavedDefaultSKParams, saveDefaultSKParams, loadActiveKopImage } from "../utils/storage";
import { defaultKopSuratSDN3LoloanTimur } from "../data/defaultKopImage";

interface SKBuilderWizardProps {
  initialDoc?: SKDocument | null;
  profile: SchoolProfile;
  employees: Employee[];
  numberingConfig: NumberingConfig;
  existingDocuments?: SKDocument[];
  onSaveSK: (doc: SKDocument) => void;
  onPreviewSK: (doc: SKDocument) => void;
  onCancel: () => void;
}

export const SKBuilderWizard: React.FC<SKBuilderWizardProps> = ({
  initialDoc,
  profile,
  employees,
  numberingConfig,
  existingDocuments,
  onSaveSK,
  onPreviewSK,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialDoc ? 5 : 1);
  const [creationMode, setCreationMode] = useState<"kategori" | "kebutuhan" | "gambar">("kategori");
  const [selectedSKType, setSelectedSKType] = useState<string>(
    initialDoc?.jenisSK || skCategories[0].nama
  );
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(
    initialDoc?.jenisSK === "SK Lainnya (Custom AI)"
  );

  // States untuk Fitur "Susun Sesuai Gambar / Foto Dokumen SK" (AI Vision OCR)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [imageAdditionalNote, setImageAdditionalNote] = useState<string>("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(null);

  // Kop Surat resolved image
  const [activeKopUrl, setActiveKopUrl] = useState<string | null>(() => {
    return profile.kopSuratUrl && !profile.kopSuratUrl.startsWith("indexeddb:")
      ? profile.kopSuratUrl
      : defaultKopSuratSDN3LoloanTimur;
  });

  React.useEffect(() => {
    loadActiveKopImage(profile.kopSuratUrl || defaultKopSuratSDN3LoloanTimur).then((resolved) => {
      if (resolved && !resolved.startsWith("indexeddb:")) {
        setActiveKopUrl(resolved);
      }
    });
  }, [profile.kopSuratUrl]);

  // Step 3: Specific Data - Muat dari data bawaan yang sudah diisikan pengguna
  const defaultParams = getSavedDefaultSKParams(initialDoc || existingDocuments?.[0]);
  const defaultNum = generateNextSKNumber(numberingConfig).formattedNumber;
  const [nomorSK, setNomorSK] = useState<string>(initialDoc?.nomor || defaultNum);
  const [tahunAjaran, setTahunAjaran] = useState<string>(
    initialDoc?.tahunAjaran || defaultParams.tahunAjaran
  );
  const [tanggalTetap, setTanggalTetap] = useState<string>(
    initialDoc?.tanggalTetap || defaultParams.tanggalTetap
  );
  const [tempatTetap, setTempatTetap] = useState<string>(
    initialDoc?.tempatTetap || defaultParams.tempatTetap || profile.desa || "Loloan Timur"
  );
  const [tanggalRapat, setTanggalRapat] = useState<string>(
    initialDoc?.tanggalRapat || (initialDoc?.memperhatikan ? initialDoc.memperhatikan : defaultParams.tanggalRapat)
  );
  const [keteranganTambahan, setKeteranganTambahan] = useState<string>("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    employees.map((e) => e.id)
  );
  const [defaultSavedSuccess, setDefaultSavedSuccess] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Step 4 & 5: AI Generated Draft & Refinements
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [draftDoc, setDraftDoc] = useState<SKDocument | null>(initialDoc || null);
  const [draftSource, setDraftSource] = useState<string>(initialDoc ? "arsip" : "");
  const [refineInstruction, setRefineInstruction] = useState<string>("");
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineHistory, setRefineHistory] = useState<string[]>([]);

  // Step 1: Select Type
  const handleSelectType = (typeName: string) => {
    setSelectedSKType(typeName);
    setIsCustomMode(typeName === "SK Lainnya (Custom AI)");
    // Update existing draft title and category in real-time
    if (draftDoc) {
      const categoryObj = skCategories.find((c) => c.nama === typeName);
      const defaultJudul = categoryObj ? categoryObj.defaultJudul : typeName.toUpperCase();
      setDraftDoc((prev) =>
        prev
          ? {
              ...prev,
              jenisSK: typeName,
              judul: cleanSKJudul(defaultJudul, prev.tahunAjaran || tahunAjaran),
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    }
  };

  // Helper format Memperhatikan secara rapi dan menjaga data bawaan
  const formatMemperhatikanText = (
    rawInput: string,
    sekolahNama: string,
    skType?: string
  ): string => {
    const trimmed = (rawInput || "").trim();
    if (!trimmed) {
      return `Saran, usul dan Keputusan Rapat Dewan Guru ${sekolahNama}`;
    }
    const lower = trimmed.toLowerCase();
    // Jika user sudah menulis format lengkap
    if (
      lower.startsWith("saran") ||
      lower.startsWith("hasil") ||
      lower.startsWith("keputusan") ||
      lower.startsWith("berdasarkan")
    ) {
      return trimmed;
    }
    if (lower.includes("rapat dewan guru")) {
      return `Saran, usul dan Keputusan ${trimmed}`;
    }
    if (lower.includes("tentang")) {
      return `Saran, usul dan Keputusan Rapat Dewan Guru ${sekolahNama} tanggal ${trimmed}`;
    }
    return `Saran, usul dan Keputusan Rapat Dewan Guru ${sekolahNama} tanggal ${trimmed}${
      skType ? ` tentang ${skType}` : ""
    }`;
  };

  // Helper membuat tabel lampiran aman untuk berbagai kategori SK
  const createSafeLampiran = (jenis: string, relevantList: Employee[]): SKAttachment[] => {
    const lower = (jenis || "").toLowerCase();
    if (lower.includes("bosp") || lower.includes("bos")) {
      return [
        {
          id: "att-1",
          nomorLampiran: "Lampiran I",
          judul: "Susunan Tim Pengelola Bantuan Operasional Satuan Pendidikan (BOSP)",
          jenisLampiran: "susunan_panitia",
          headers: ["No", "Nama / NIP", "Jabatan Kedinasan", "Jabatan dalam Tim", "Uraian Tugas Pokok"],
          rows:
            relevantList.length > 0
              ? relevantList.map((e, i) => [
                  String(i + 1),
                  `${e.nama}\n${e.nip && e.nip !== "-" ? (e.statusKepegawaian === "PPPK" ? `NIPPPK. ${e.nip}` : `NIP. ${e.nip}`) : "NIP. -"}`,
                  e.jabatan || "Guru Kelas",
                  i === 0 ? "Bendahara BOSP" : i === 1 ? "Anggota (Perencana)" : "Anggota Tim",
                  i === 0
                    ? "Mengelola pembukuan, pembayaran, pajak, dan laporan BKU/K7"
                    : "Membantu penyusunan RKAS & verifikasi bukti transaksi",
                ])
              : [
                  ["1", "Bendahara BOSP\nNIP. -", "Guru Kelas", "Bendahara BOSP", "Mengelola pembukuan dan SPJ"],
                ],
          footerNote: "Tim bekerja secara kolektif kolegial dan bertanggung jawab kepada Kepala Sekolah.",
        },
      ];
    }

    if (lower.includes("tppk") || lower.includes("kekerasan")) {
      return [
        {
          id: "att-1",
          nomorLampiran: "Lampiran I",
          judul: "Susunan Tim Pencegahan dan Penanganan Kekerasan (TPPK)",
          jenisLampiran: "susunan_panitia",
          headers: ["No", "Nama / NIP", "Unsur Keterwakilan", "Jabatan dalam Tim", "Keterangan"],
          rows:
            relevantList.length > 0
              ? relevantList.map((e, i) => [
                  String(i + 1),
                  `${e.nama}\n${e.nip && e.nip !== "-" ? (e.statusKepegawaian === "PPPK" ? `NIPPPK. ${e.nip}` : `NIP. ${e.nip}`) : "NIP. -"}`,
                  "Pendidik / Satuan Pendidikan",
                  i === 0 ? "Koordinator TPPK" : "Anggota",
                  "Unsur Guru",
                ])
              : [
                  ["1", "Guru Koordinator\nNIP. -", "Pendidik", "Koordinator", "Unsur Guru"],
                ],
          footerNote: "Keanggotaan TPPK wajib didaftarkan pada Portal Resmi Kemendikbudristek/Dapodik.",
        },
      ];
    }

    if (lower.includes("kurikulum") || lower.includes("tpk") || lower.includes("ksp") || lower.includes("kosp")) {
      return [
        {
          id: "att-1",
          nomorLampiran: "Lampiran I",
          judul: "Susunan Tim Pengembang Kurikulum Satuan Pendidikan (TPK)",
          jenisLampiran: "susunan_panitia",
          headers: ["No", "Nama / NIP", "Pangkat / Gol", "Jabatan Kedinasan", "Jabatan dalam Tim"],
          rows:
            relevantList.length > 0
              ? relevantList.map((e, i) => [
                  String(i + 1),
                  `${e.nama}\n${e.nip && e.nip !== "-" ? (e.statusKepegawaian === "PPPK" ? `NIPPPK. ${e.nip}` : `NIP. ${e.nip}`) : "NIP. -"}`,
                  e.golongan ? `${e.pangkat || "-"}\n/${e.golongan}` : "-",
                  e.jabatan || "Guru Kelas",
                  i === 0 ? "Ketua Tim Pengembang" : i === 1 ? "Sekretaris Tim" : "Anggota",
                ])
              : [
                  ["1", "Ketua Tim\nNIP. -", "Ahli Pertama / IX", "Guru Kelas", "Ketua Tim"],
                ],
          footerNote: "Dokumen kurikulum disahkan oleh Kepala Sekolah dan divalidasi Pengawas Pembina.",
        },
      ];
    }

    // Default: Pembagian Tugas Guru KBM
    return [
      {
        id: "att-1",
        nomorLampiran: "Lampiran I",
        judul: "Pembagian Tugas Pembelajaran dan Tugas Tambahan",
        jenisLampiran: "pembagian_tugas_guru",
        headers: ["No", "Nama / NIP", "Pangkat / Gol", "Jabatan Kedinasan", "Tugas Utama", "Keterangan"],
        rows:
          relevantList.length > 0
            ? relevantList.map((e, i) => [
                String(i + 1),
                `${e.nama}\n${e.nip && e.nip !== "-" ? (e.statusKepegawaian === "PPPK" ? `NIPPPK. ${e.nip}` : `NIP. ${e.nip}`) : "NIP. -"}`,
                e.golongan ? `${e.pangkat || "-"}\n/${e.golongan}` : "-",
                e.jabatan || "Guru Kelas",
                e.mapel || "Tematik / Semua Mata Pelajaran",
                e.kelas ? `Kelas ${e.kelas}` : "Aktif",
              ])
            : [
                ["1", "Guru Kelas\nNIP. -", "-", "Guru Kelas", "Tematik", "Kelas I"],
              ],
        footerNote: "Beban kerja guru telah disesuaikan dengan ketentuan regulasi pemenuhan jam kerja.",
      },
    ];
  };

  // Helper membangun naskah draf formal lengkap untuk client fallback
  const createSafeClientSKDraft = (params: {
    id: string;
    nomorSK: string;
    judul: string;
    selectedSKType: string;
    tahunAjaran: string;
    tanggalTetap: string;
    tempatTetap: string;
    tanggalRapat: string;
    profile: SchoolProfile;
    relevantEmployees: Employee[];
    status?: "draft" | "siap_cetak" | "disahkan" | "diarsipkan" | "published";
  }): SKDocument => {
    const {
      id,
      nomorSK: curNomor,
      judul: curJudul,
      selectedSKType: curJenis,
      tahunAjaran: curTahun,
      tanggalTetap: curTglTetap,
      tempatTetap: curTempat,
      tanggalRapat: curTglRapat,
      profile: curProf,
      relevantEmployees: curEmps,
      status: curStatus = "draft",
    } = params;

    const lower = (curJenis || "").toLowerCase();
    let menimbang = [
      `Bahwa untuk memperlancar jalannya kegiatan belajar mengajar dan tertib administrasi di ${curProf.nama}, dipandang perlu menetapkan keputusan kepala sekolah.`,
      `Bahwa yang namanya tercantum dalam lampiran keputusan ini dipandang cakap dan memenuhi syarat untuk melaksanakan tugas yang diamanahkan.`,
    ];
    let mengingat = [
      "Undang-undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
      "Peraturan Pemerintah Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan;",
      "Peraturan Menteri Pendidikan Dasar dan Menengah RI Nomor 12 Tahun 2025 tentang Standar Isi;",
      "Peraturan Menteri Pendidikan Dasar dan Menengah RI Nomor 13 Tahun 2025 tentang Kurikulum;",
    ];
    let diktum: SKDiktum[] = [
      { poin: "KESATU", isi: `Menetapkan keputusan tentang ${curJenis} sebagaimana tercantum dalam lampiran keputusan ini.` },
      { poin: "KEDUA", isi: "Masing-masing pendidik dan tenaga kependidikan wajib melaporkan pelaksanaan tugasnya secara tertulis dan berkala." },
      { poin: "KETIGA", isi: "Segala biaya yang timbul dibebankan pada anggaran sekolah yang relevan." },
      { poin: "KEEMPAT", isi: "Keputusan ini berlaku sejak tanggal ditetapkan." },
    ];

    if (lower.includes("bosp") || lower.includes("bos")) {
      menimbang = [
        `Bahwa dalam rangka memperlancar pengelolaan dan pertanggungjawaban dana Bantuan Operasional Satuan Pendidikan (BOSP) di ${curProf.nama}, dipandang perlu membentuk Tim Pengelola BOSP.`,
        `Bahwa mereka yang namanya tercantum dalam lampiran keputusan ini dianggap mampu dan memenuhi syarat untuk melaksanakan tugas pengelolaan dana BOSP.`,
        `Bahwa berdasarkan pertimbangan sebagaimana dimaksud, perlu menetapkan Keputusan Kepala Sekolah tentang Tim Pengelola BOSP.`,
      ];
      mengingat = [
        "Undang-undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
        "Peraturan Pemerintah Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan;",
        "Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi RI Nomor 63 Tahun 2022 jo Nomor 63 Tahun 2023 tentang Petunjuk Teknis Pengelolaan Dana BOSP;",
        "Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 18 Tahun 2023 tentang Standar Pembiayaan;",
        `Keputusan Bupati ${curProf.kabupaten} tentang Alokasi Dana BOSP Satuan Pendidikan Dasar.`,
      ];
      diktum = [
        { poin: "KESATU", isi: "Membentuk Tim Pengelola Bantuan Operasional Satuan Pendidikan (BOSP) sebagaimana tercantum pada lampiran keputusan ini." },
        { poin: "KEDUA", isi: "Tim Pengelola BOSP bertugas merencanakan (RKT/RKAS), mengelola, membukukan, serta mempertanggungjawabkan penggunaan dana BOSP sesuai ketentuan petunjuk teknis." },
        { poin: "KETIGA", isi: "Segala biaya yang timbul dibebankan pada anggaran BOSP yang bersangkutan." },
        { poin: "KEEMPAT", isi: "Keputusan ini berlaku sejak tanggal ditetapkan." },
      ];
    } else if (lower.includes("tppk") || lower.includes("kekerasan")) {
      menimbang = [
        `Bahwa peserta didik, pendidik, dan tenaga kependidikan berhak mendapatkan perlindungan dari segala bentuk kekerasan di lingkungan satuan pendidikan.`,
        `Bahwa untuk mewujudkan lingkungan satuan pendidikan yang aman, ramah, dan inklusif di ${curProf.nama}, perlu dibentuk Tim Pencegahan dan Penanganan Kekerasan (TPPK).`,
      ];
      mengingat = [
        "Undang-undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
        "Undang-undang Nomor 35 Tahun 2014 tentang Perubahan atas UU Nomor 23 Tahun 2002 tentang Perlindungan Anak;",
        "Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 46 Tahun 2023 tentang Pencegahan dan Penanganan Kekerasan di Satuan Pendidikan (PPKSP);",
      ];
      diktum = [
        { poin: "KESATU", isi: "Membentuk Tim Pencegahan dan Penanganan Kekerasan (TPPK) sebagaimana tercantum dalam lampiran keputusan ini." },
        { poin: "KEDUA", isi: "TPPK bertugas mengoordinasikan pencegahan kekerasan, menerima laporan, memfasilitasi penanganan, dan berkoordinasi dengan dinas terkait." },
        { poin: "KETIGA", isi: "Masa tugas TPPK adalah 2 (dua) tahun sejak tanggal ditetapkan." },
        { poin: "KEEMPAT", isi: "Keputusan ini berlaku sejak tanggal ditetapkan." },
      ];
    }

    return {
      id,
      nomor: curNomor || `421.2/08/SDN3LT/${curTahun}`,
      judul: cleanSKJudul(curJudul, curTahun) || curJenis.toUpperCase(),
      jenisSK: curJenis,
      tahunAjaran: curTahun,
      tanggalTetap: curTglTetap,
      tempatTetap: curTempat,
      tanggalRapat: curTglRapat,
      perihalRapat: `Rapat Dewan Guru tentang ${curJenis}`,
      menimbang,
      mengingat,
      memperhatikan: formatMemperhatikanText(curTglRapat, curProf.nama, curJenis),
      diktum,
      tembusan: [
        `Kepala Dinas Pendidikan Kepemudaan dan Olahraga Kabupaten ${curProf.kabupaten}`,
        `Korwil Satuan Pendidikan Formal Kecamatan ${curProf.kecamatan}`,
        "Pengawas Sekolah Pembina",
        "Ketua Komite Sekolah",
        "Arsip Sekolah",
      ],
      lampiranList: createSafeLampiran(curJenis, curEmps),
      status: curStatus,
      kepalaSekolah: curProf.kepalaSekolah,
      sekolah: {
        nama: curProf.nama,
        alamat: curProf.alamat,
        kabupaten: curProf.kabupaten,
        kecamatan: curProf.kecamatan,
      },
      aiNotes: ["Draf telah diselaraskan dengan tata naskah dinas resmi dan regulasi kependidikan."],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Helper sinkronisasi aktif: menjamin seluruh perubahan di Tahap 1, 2, dan 3 selalu tersinkron ke draftDoc
  const syncCurrentDraft = (customBase?: SKDocument | null): SKDocument => {
    const base = customBase || draftDoc || initialDoc;
    const relevantEmployees = employees.filter((e) =>
      selectedEmployeeIds.includes(e.id)
    );
    const categoryObj = skCategories.find((c) => c.nama === selectedSKType);
    const judul = categoryObj ? categoryObj.defaultJudul : selectedSKType.toUpperCase();
    const docId = initialDoc?.id || draftDoc?.id || `sk-${Date.now()}`;
    const docStatus = (initialDoc?.status || draftDoc?.status || "draft") as any;

    if (!base) {
      const created = createSafeClientSKDraft({
        id: docId,
        nomorSK,
        judul,
        selectedSKType,
        tahunAjaran,
        tanggalTetap,
        tempatTetap,
        tanggalRapat,
        profile,
        relevantEmployees,
        status: docStatus,
      });
      setDraftDoc(created);
      return created;
    }

    const updatedLampiran =
      base.lampiranList && base.lampiranList.length > 0
        ? base.lampiranList.map((att, idx) => {
            if (idx === 0) {
              return {
                ...att,
                rows:
                  relevantEmployees.length > 0
                    ? relevantEmployees.map((e, i) => [
                        String(i + 1),
                        `${e.nama}\n${e.nip && e.nip !== "-" ? (e.statusKepegawaian === "PPPK" ? `NIPPPK. ${e.nip}` : `NIP. ${e.nip}`) : "NIP. -"}`,
                        e.golongan ? `${e.pangkat || "-"}\n/${e.golongan}` : "-",
                        e.jabatan || "Guru Kelas",
                        e.mapel || "Tematik / Semua Mata Pelajaran",
                        e.kelas ? `Kelas ${e.kelas}` : "Aktif",
                      ])
                    : att.rows,
              };
            }
            return att;
          })
        : createSafeLampiran(selectedSKType, relevantEmployees);

    const synced: SKDocument = {
      ...base,
      id: docId,
      nomor: nomorSK,
      tahunAjaran,
      tanggalTetap,
      tempatTetap,
      tanggalRapat,
      perihalRapat: `Rapat Dewan Guru tentang ${selectedSKType}`,
      memperhatikan: formatMemperhatikanText(tanggalRapat, profile.nama, selectedSKType),
      jenisSK: selectedSKType,
      judul: cleanSKJudul(base.judul || judul, tahunAjaran),
      sekolah: {
        nama: profile.nama,
        alamat: profile.alamat,
        kabupaten: profile.kabupaten,
        kecamatan: profile.kecamatan,
      },
      kepalaSekolah: profile.kepalaSekolah,
      lampiranList: updatedLampiran,
      status: docStatus,
      updatedAt: new Date().toISOString(),
    };

    setDraftDoc(synced);
    return synced;
  };

  // Helper membaca file gambar menjadi DataURL Base64
  const handleImageFileSelect = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageAnalysisError("File harus berupa gambar (JPG, PNG, WebP).");
      return;
    }
    setImageAnalysisError(null);
    setImageFileName(file.name);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreviewUrl(result);
    };
    reader.onerror = () => {
      setImageAnalysisError("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI Draft Generation Sesuai Gambar / Foto Dokumen SK (Vision OCR)
  const handleGenerateDraftFromImage = async () => {
    if (!imagePreviewUrl) {
      setImageAnalysisError("Silakan pilih atau unggah foto gambar SK terlebih dahulu.");
      return;
    }

    setIsGenerating(true);
    setIsAnalyzingImage(true);
    setImageAnalysisError(null);
    setCurrentStep(4);

    const relevantEmployees = employees.filter((e) =>
      selectedEmployeeIds.includes(e.id)
    );
    const docId = initialDoc?.id || draftDoc?.id || `sk-${Date.now()}`;
    const docStatus = (initialDoc?.status || draftDoc?.status || "draft") as any;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch("/api/gemini/generate-sk-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: imagePreviewUrl,
          imageMimeType,
          sekolah: profile,
          tahunAjaran,
          keteranganTambahan: imageAdditionalNote || keteranganTambahan,
          employees: relevantEmployees,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const data = resJson.data;
        const usedSrc = resJson.source || "gemini-vision";
        setDraftSource(usedSrc);

        if (data.jenisSK) setSelectedSKType(data.jenisSK);
        if (data.nomor) setNomorSK(data.nomor);
        if (data.tahunAjaran) setTahunAjaran(data.tahunAjaran);
        if (data.tanggalTetap) setTanggalTetap(data.tanggalTetap);
        if (data.tempatTetap) setTempatTetap(data.tempatTetap);
        if (data.tanggalRapat) setTanggalRapat(data.tanggalRapat);

        const newDoc: SKDocument = {
          id: docId,
          nomor: data.nomor || nomorSK,
          judul: cleanSKJudul(data.judul || selectedSKType.toUpperCase(), data.tahunAjaran || tahunAjaran),
          jenisSK: data.jenisSK || selectedSKType,
          tahunAjaran: data.tahunAjaran || tahunAjaran,
          tanggalTetap: data.tanggalTetap || tanggalTetap,
          tempatTetap: data.tempatTetap || tempatTetap,
          tanggalRapat: data.tanggalRapat || tanggalRapat,
          perihalRapat: `Rapat Dewan Guru tentang ${data.jenisSK || selectedSKType}`,
          menimbang: data.menimbang || [
            `Bahwa untuk memperlancar kegiatan di ${profile.nama}, perlu diterbitkan surat keputusan.`,
          ],
          mengingat: data.mengingat || [
            "Undang-undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
            "Peraturan Pemerintah Nomor 4 Tahun 2022 tentang Perubahan atas PP 57 Tahun 2021 tentang Standar Nasional Pendidikan;",
          ],
          memperhatikan:
            data.memperhatikan ||
            formatMemperhatikanText(tanggalRapat, profile.nama, data.jenisSK || selectedSKType),
          diktum: data.diktum || [
            { poin: "KESATU", isi: "Menetapkan keputusan sebagaimana tercantum dalam lampiran ini." },
            { poin: "KEDUA", isi: "Keputusan ini berlaku sejak tanggal ditetapkan." },
          ],
          tembusan: data.tembusan || [
            `Kepala Dinas Pendidikan Kabupaten ${profile.kabupaten}`,
            `Korwil SPF Kecamatan ${profile.kecamatan}`,
            "Arsip",
          ],
          lampiranList:
            data.lampiranList && data.lampiranList.length > 0
              ? data.lampiranList
              : createSafeLampiran(data.jenisSK || selectedSKType, relevantEmployees),
          status: docStatus,
          kepalaSekolah: profile.kepalaSekolah,
          sekolah: {
            nama: profile.nama,
            alamat: profile.alamat,
            kabupaten: profile.kabupaten,
            kecamatan: profile.kecamatan,
          },
          aiNotes: [
            ...(data.aiNotes || []),
            "Naskah SK berhasil diekstrak dan diselaraskan secara otomatis dari gambar dokumen.",
          ],
          createdAt: draftDoc?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setDraftDoc(newDoc);
      } else {
        throw new Error("Respon analisis gambar tidak valid");
      }
    } catch (err: any) {
      console.warn("Gagal mengekstrak draf dari gambar:", err);
      setDraftSource("local-vision-fallback");
      const clientFallback = createSafeClientSKDraft({
        id: docId,
        nomorSK,
        judul: selectedSKType.toUpperCase(),
        selectedSKType,
        tahunAjaran,
        tanggalTetap,
        tempatTetap,
        tanggalRapat,
        profile,
        relevantEmployees,
        status: docStatus,
      });
      clientFallback.aiNotes = [
        "Analisis gambar dialihkan ke standar tata naskah dinas pendidikan (offline fallback).",
      ];
      setDraftDoc(clientFallback);
    } finally {
      setIsGenerating(false);
      setIsAnalyzingImage(false);
    }
  };

  // Trigger AI Draft Generation (Step 4)
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setCurrentStep(4);

    // Otomatis simpan isian saat ini ke data bawaan agar diingat untuk pembuatan berikutnya
    saveDefaultSKParams({
      tahunAjaran,
      tanggalTetap,
      tempatTetap,
      tanggalRapat,
    });

    const relevantEmployees = employees.filter((e) =>
      selectedEmployeeIds.includes(e.id)
    );

    const categoryObj = skCategories.find((c) => c.nama === selectedSKType);
    const judul = categoryObj ? categoryObj.defaultJudul : selectedSKType.toUpperCase();
    const docId = initialDoc?.id || draftDoc?.id || `sk-${Date.now()}`;
    const docStatus = (initialDoc?.status || draftDoc?.status || "draft") as any;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch("/api/gemini/generate-sk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          jenisSK: selectedSKType,
          judulSK: judul,
          tahunAjaran,
          sekolah: profile,
          kepalaSekolah: profile.kepalaSekolah,
          dataKhusus: {
            tanggalRapat,
            nomorSK,
            tempatTetap,
            tanggalTetap,
            keteranganTambahan,
          },
          employees: relevantEmployees,
          userPrompt: isCustomMode ? customPrompt : "",
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const data = resJson.data;
        setDraftSource(resJson.source || "gemini");
        const newDoc: SKDocument = {
          id: docId,
          nomor: nomorSK,
          judul: cleanSKJudul(data.judul || judul, tahunAjaran),
          jenisSK: selectedSKType,
          tahunAjaran,
          tanggalTetap,
          tempatTetap,
          tanggalRapat,
          perihalRapat: `Rapat Dewan Guru tentang ${selectedSKType}`,
          menimbang: data.menimbang || [
            `Bahwa dalam rangka peningkatan mutu di ${profile.nama}, maka perlu diterbitkan keputusan kepala sekolah.`,
          ],
          mengingat: data.mengingat || [
            "Undang-undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
            "Peraturan Pemerintah Nomor 4 Tahun 2022 tentang Perubahan atas PP 57 Tahun 2021 tentang Standar Nasional Pendidikan;",
          ],
          memperhatikan:
            data.memperhatikan ||
            formatMemperhatikanText(tanggalRapat, profile.nama, selectedSKType),
          diktum: data.diktum || [
            { poin: "KESATU", isi: "Menetapkan pembagian tugas sebagaimana terlampir." },
            {
              poin: "KEDUA",
              isi: "Masing-masing melaporkan pelaksanaan tugas secara berkala.",
            },
            {
              poin: "KETIGA",
              isi: "Keputusan ini mulai berlaku sejak tanggal ditetapkan.",
            },
          ],
          tembusan: data.tembusan || [
            `Kepala Dinas Pendidikan Kabupaten ${profile.kabupaten}`,
            `Korwil SPF Kecamatan ${profile.kecamatan}`,
            "Arsip",
          ],
          lampiranList:
            data.lampiranList && data.lampiranList.length > 0
              ? (data.lampiranList || []).map((att: any, idx: number) => ({
                  id: `att-${idx + 1}`,
                  nomorLampiran: att.nomorLampiran || `Lampiran ${idx + 1}`,
                  judul: att.judul || "Daftar Pembagian Tugas",
                  jenisLampiran: att.jenisLampiran || "pembagian_tugas_guru",
                  headers: att.headers || ["No", "Nama", "Jabatan", "Tugas"],
                  rows:
                    att.rows && att.rows.length > 0
                      ? att.rows
                      : relevantEmployees.map((e, i) => [
                          String(i + 1),
                          `${e.nama}\n${e.nip && e.nip !== "-" ? (e.statusKepegawaian === "PPPK" ? `NIPPPK. ${e.nip}` : `NIP. ${e.nip}`) : "NIP. -"}`,
                          e.golongan ? `${e.pangkat || "-"}\n/${e.golongan}` : "-",
                          e.jabatan || "Guru Kelas",
                          e.mapel || "Tematik / Semua Mata Pelajaran",
                          e.kelas ? `Kelas ${e.kelas}` : "Aktif",
                        ]),
                  footerNote: att.footerNote || "",
                }))
              : createSafeLampiran(selectedSKType, relevantEmployees),
          status: docStatus,
          kepalaSekolah: profile.kepalaSekolah,
          sekolah: {
            nama: profile.nama,
            alamat: profile.alamat,
            kabupaten: profile.kabupaten,
            kecamatan: profile.kecamatan,
          },
          aiNotes: data.aiNotes || (resJson.warning ? [resJson.warning] : []),
          createdAt: draftDoc?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setDraftDoc(newDoc);
      } else {
        throw new Error("Respon tidak valid");
      }
    } catch (err) {
      console.warn("Generating client-side safe default draft:", err);
      setDraftSource("local-fallback");
      // Construct complete safe official fallback draft for the exact selected category
      const clientFallbackDoc = createSafeClientSKDraft({
        id: docId,
        nomorSK,
        judul,
        selectedSKType,
        tahunAjaran,
        tanggalTetap,
        tempatTetap,
        tanggalRapat,
        profile,
        relevantEmployees,
        status: docStatus,
      });
      setDraftDoc(clientFallbackDoc);
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 5: Refine Draft with AI Prompt
  const handleRefine = async (customInstruction?: string) => {
    const textToApply = customInstruction || refineInstruction;
    if (!textToApply.trim() || !draftDoc) return;

    setIsRefining(true);
    try {
      const response = await fetch("/api/gemini/refine-sk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDoc: draftDoc,
          instruction: textToApply,
        }),
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        setDraftDoc((prev) => ({
          ...prev!,
          ...resJson.data,
          updatedAt: new Date().toISOString(),
        }));
        setRefineHistory((prev) => [textToApply, ...prev]);
        setRefineInstruction("");
      }
    } catch (err) {
      console.error("Refine error:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleToggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step Indicator Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-emerald-700 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-emerald-600" />
              <span>AI Form Builder: Langkah {currentStep} dari 5</span>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {currentStep === 1 && "Pilih Jenis Surat Keputusan (SK)"}
              {currentStep === 2 && "Konfirmasi Data Satuan Pendidikan & Kepala Sekolah"}
              {currentStep === 3 && "Pengisian Data Khusus & Komposisi Penugasan"}
              {currentStep === 4 && "Penyusunan Draf Formal oleh AI"}
              {currentStep === 5 && "Penyempurnaan Interaktif (AI Refiner) & Finalisasi"}
            </h2>
          </div>

          {/* Interactive Step Navigation Bar (Aktif di Semua Perangkat) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { num: 1, label: "Jenis SK" },
              { num: 2, label: "Data Sekolah" },
              { num: 3, label: "Data Khusus" },
              { num: 4, label: "Draf Formal AI" },
              { num: 5, label: "AI Refiner" },
            ].map(({ num: s, label }) => {
              const isActive = currentStep === s;
              const isPast = currentStep > s;
              return (
                <button
                  key={s}
                  type="button"
                  id={`btn-step-nav-${s}`}
                  onClick={() => {
                    syncCurrentDraft();
                    if (s === 4 && !draftDoc) {
                      handleGenerateDraft();
                    } else if (s === 5 && !draftDoc) {
                      handleGenerateDraft();
                    } else {
                      setCurrentStep(s);
                    }
                  }}
                  title={`Langkah ${s}: ${label} (Klik untuk beralih)`}
                  className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500"
                      : isPast
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-white text-emerald-700"
                        : isPast
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isPast ? "✓" : s}
                  </span>
                  <span className="hidden md:inline whitespace-nowrap text-[11px]">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 1: PILIH METODE & JENIS SK */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pilih Metode Penyusunan Surat Keputusan (SK) Sekolah:
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pilih format baku dinas, ketik kebutuhan sendiri, atau unggah foto/pindaian dokumen fisik untuk disusun otomatis oleh AI Vision.
              </p>
            </div>
          </div>

          {/* Navigasi Pilihan Metode */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              id="tab-mode-kategori"
              onClick={() => {
                setCreationMode("kategori");
                setIsCustomMode(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                creationMode === "kategori"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>25 Format SK Baku SD</span>
            </button>

            <button
              type="button"
              id="tab-mode-kebutuhan"
              onClick={() => {
                setCreationMode("kebutuhan");
                setIsCustomMode(true);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                creationMode === "kebutuhan"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Ketik Kebutuhan Sendiri</span>
            </button>

            <button
              type="button"
              id="tab-mode-gambar"
              onClick={() => setCreationMode("gambar")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                creationMode === "gambar"
                  ? "bg-white text-indigo-800 shadow-xs border border-indigo-200 ring-1 ring-indigo-300"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Susun Sesuai Foto / Gambar SK</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                AI Vision
              </span>
            </button>
          </div>

          {/* METODE 1: 25 FORMAT SK BAKU SD */}
          {creationMode === "kategori" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {skCategories.map((cat) => {
                  const isSelected = selectedSKType === cat.nama && !customPrompt;
                  return (
                    <div
                      key={cat.id}
                      id={`sk-category-${cat.id}`}
                      onClick={() => {
                        handleSelectType(cat.nama);
                        setCustomPrompt("");
                      }}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {cat.kategori}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">#{cat.id}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{cat.nama}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{cat.deskripsi}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* METODE 2: PROMPT KEBUTUHAN SENDIRI */}
          {creationMode === "kebutuhan" && (
            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Susun SK Berdasarkan Kebutuhan & Bahasa Sehari-hari
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Ketik tujuan SK yang Anda inginkan, AI akan merumuskan judul, dasar hukum, konsiderans, dan diktum formalnya secara otomatis.
                  </p>
                </div>
              </div>
              <textarea
                id="input-custom-sk-prompt"
                rows={4}
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  setIsCustomMode(true);
                  setSelectedSKType("SK Lainnya (Custom AI)");
                }}
                placeholder="Contoh: Saya butuh SK Pembentukan Panitia Pelaksana Perayaan Hari Guru Nasional dan Gebyar Literasi Sekolah Dasar Tahun 2025/2026 yang terdiri dari ketua, sekretaris, bendahara, dan seksi acara..."
                className="w-full text-xs p-3 rounded-lg border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  id="btn-use-custom-prompt"
                  onClick={() => {
                    if (customPrompt.trim()) {
                      setSelectedSKType("SK Lainnya (Custom AI)");
                      setIsCustomMode(true);
                      setCurrentStep(2);
                    }
                  }}
                  disabled={!customPrompt.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Lanjut ke Data Sekolah</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* METODE 3: SUSUN SESUAI FOTO / GAMBAR DOKUMEN SK (AI VISION OCR) */}
          {creationMode === "gambar" && (
            <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-5 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Susun Sesuai Foto / Gambar Dokumen SK Fisik</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Gemini Vision OCR
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Unggah foto kertas SK atau pindaian dokumen Surat Keputusan. AI Vision akan membaca naskah, nomor surat, konsiderans menimbang, dasar hukum mengingat, diktum memutuskan, serta tabel lampiran guru secara otomatis.
                  </p>
                </div>
              </div>

              {/* Upload Dropzone */}
              {!imagePreviewUrl ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-xl p-8 text-center transition-all space-y-4"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Tarik & lepas foto dokumen SK di sini, atau pilih dari perangkat
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Mendukung format JPG, PNG, atau WebP (dokumen pindaian atau foto kamera ponsel)
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    <label
                      htmlFor="input-file-sk-image"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Pilih File Gambar</span>
                    </label>
                    <input
                      id="input-file-sk-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <label
                      htmlFor="input-camera-sk-image"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Ambil Foto dengan Kamera</span>
                    </label>
                    <input
                      id="input-camera-sk-image"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                /* Preview Gambar yang Dipilih */
                <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-48 h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                      <img
                        src={imagePreviewUrl}
                        alt="Foto Dokumen SK"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreviewUrl(null);
                          setImageFileName(null);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                        title="Hapus foto ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">
                          {imageFileName || "Foto Dokumen SK Siap Diproses"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Foto berhasil dimuat. Tambahkan catatan khusus jika ingin menyelaraskan nama guru atau data tertentu:
                      </p>
                      <input
                        type="text"
                        value={imageAdditionalNote}
                        onChange={(e) => setImageAdditionalNote(e.target.value)}
                        placeholder="Contoh: 'Tahun ajaran 2025/2026, sertakan daftar 11 guru SD Negeri 3 Loloan Timur'"
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap justify-between items-center gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreviewUrl(null);
                        setImageFileName(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Ganti Foto Lain
                    </button>

                    <button
                      type="button"
                      id="btn-process-sk-image"
                      onClick={handleGenerateDraftFromImage}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Ekstrak & Susun Draf SK Sesuai Gambar Ini</span>
                    </button>
                  </div>
                </div>
              )}

              {imageAnalysisError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2 animate-fade-in font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{imageAnalysisError}</span>
                </div>
              )}
            </div>
          )}

          {/* Tombol Navigasi Bawah Step 1 */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
            >
              Batal
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-step1-quick-ai"
                onClick={handleGenerateDraft}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Langsung susun draf formal SK dengan AI tanpa melewati Langkah 2 & 3"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Langsung Susun Draf Formal AI (1-Klik)</span>
              </button>
              <button
                id="btn-step1-next"
                onClick={() => {
                  syncCurrentDraft();
                  setCurrentStep(2);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm cursor-pointer"
              >
                <span>Langkah 2: Data Sekolah</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: KONFIRMASI DATA SEKOLAH */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Data Sekolah yang Tersimpan untuk SK Ini</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              AI akan otomatis menyematkan data identitas satuan pendidikan ini ke dalam kop surat
              dan kalimat konsiderans SK.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <p className="text-slate-500">Nama Sekolah:</p>
              <p className="font-bold text-slate-900">{profile.nama}</p>
            </div>
            <div>
              <p className="text-slate-500">NPSN / NSS:</p>
              <p className="font-bold text-slate-900">
                {profile.npsn} / {profile.nssNis}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Alamat Lengkap:</p>
              <p className="font-bold text-slate-900">
                {profile.alamat}, Desa {profile.desa}, Kec. {profile.kecamatan}, Kab.{" "}
                {profile.kabupaten}, {profile.provinsi}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Kontak Resmi:</p>
              <p className="font-bold text-slate-900">
                {profile.email} | {profile.telepon || "-"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Nama Kepala Sekolah (Pejabat Penetap):</p>
              <p className="font-bold text-slate-900">{profile.kepalaSekolah.nama}</p>
            </div>
            <div>
              <p className="text-slate-500">NIP & Pangkat/Golongan:</p>
              <p className="font-bold text-slate-900">
                NIP. {profile.kepalaSekolah.nip} ({profile.kepalaSekolah.pangkat}{" "}
                {profile.kepalaSekolah.golongan})
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800">
            💡 Jika ingin memperbarui data sekolah atau kepala sekolah di atas, Anda dapat
            mengubahnya kapan saja di menu <strong>Data Sekolah</strong>.
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-step2-quick-ai"
                onClick={handleGenerateDraft}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Langsung susun draf formal SK dengan AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Langsung Susun Draf Formal AI</span>
              </button>
              <button
                id="btn-step2-next"
                onClick={() => {
                  syncCurrentDraft();
                  setCurrentStep(3);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm cursor-pointer"
              >
                <span>Langkah 3: Data Khusus SK</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DATA KHUSUS SK */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Parameter Khusus untuk {selectedSKType}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lengkapi nomor surat keputusan, tanggal rapat dewan guru, dan pilih daftar guru yang
                akan dicantumkan di lampiran.
              </p>
            </div>
            <button
              type="button"
              id="btn-step3-quick-generate-top"
              onClick={handleGenerateDraft}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              title="Lompat langsung ke Langkah 4 dan susun draf formal"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Susun Draf Formal Sekarang (Langkah 4)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor SK *</label>
              <input
                id="input-builder-nomor-sk"
                type="text"
                value={nomorSK}
                onChange={(e) => setNomorSK(e.target.value)}
                placeholder="062/SD3LT.01/VII/2025"
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format nomor otomatis disesuaikan dengan pola penomoran sekolah.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tahun Ajaran / Periode *
              </label>
              <input
                id="input-builder-tahun-ajaran"
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="2025/2026"
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Penetapan SK *
              </label>
              <input
                id="input-builder-tanggal-tetap"
                type="text"
                value={tanggalTetap}
                onChange={(e) => setTanggalTetap(e.target.value)}
                placeholder="19 Juni 2025"
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tempat Penetapan *
              </label>
              <input
                id="input-builder-tempat-tetap"
                type="text"
                value={tempatTetap}
                onChange={(e) => setTempatTetap(e.target.value)}
                placeholder="Loloan Timur"
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Tanggal & Pembahasan Rapat Dewan Guru (Untuk Bagian MEMPERHATIKAN) *
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                  Konsiderans Memperhatikan
                </span>
              </div>
              <textarea
                id="input-builder-tanggal-rapat"
                rows={2}
                value={tanggalRapat}
                onChange={(e) => setTanggalRapat(e.target.value)}
                placeholder="18 Juni 2025 tentang Pembagian Tugas Guru dalam kegiatan proses belajar mengajar atau bimbingan dan tugas tenaga kependidikan di SD Negeri 3 Loloan Timur Tahun Ajaran 2025/2026"
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs text-slate-800"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Isian ini akan otomatis diformat dan dicantumkan pada konsiderans <strong>MEMPERHATIKAN</strong> di naskah surat keputusan.
              </span>
            </div>

            {/* Box Kunci Data Bawaan Default */}
            <div className="sm:col-span-2 bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                    <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Data Bawaan (Default): Tahun Ajaran, Tanggal Penetapan, & Rapat Guru</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                    Data yang sedang Anda isikan ini akan otomatis dijadikan data baku untuk pembuatan SK berikutnya. Anda juga dapat memperbaruinya secara manual kapan saja.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-save-sk-params-default"
                  onClick={() => {
                    saveDefaultSKParams({
                      tahunAjaran,
                      tanggalTetap,
                      tempatTetap,
                      tanggalRapat,
                    });
                    setDefaultSavedSuccess("Isian tahun ajaran, tanggal penetapan, dan rapat dewan guru berhasil disimpan sebagai data bawaan default!");
                    setTimeout(() => setDefaultSavedSuccess(null), 4500);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Jadikan Data Ini Bawaan Default</span>
                </button>
              </div>

              {defaultSavedSuccess && (
                <div className="flex items-center gap-2 bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs px-3 py-2 rounded-lg animate-fade-in font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{defaultSavedSuccess}</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Kebutuhan Khusus / Catatan Tambahan (Opsional)
              </label>
              <textarea
                id="textarea-builder-catatan"
                rows={2}
                value={keteranganTambahan}
                onChange={(e) => setKeteranganTambahan(e.target.value)}
                placeholder="Contoh: Lampiran mencakup 4 tabel (tugas mengajar, wali kelas/KKG, tenaga kependidikan, tugas tambahan PTK)."
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* PTK Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Pilih Guru / PTK yang Dilibatkan ({selectedEmployeeIds.length} dipilih)</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeIds(employees.map((e) => e.id))}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeIds([])}
                  className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
              {employees.map((emp) => {
                const isChecked = selectedEmployeeIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleToggleEmployee(emp.id)}
                    className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all text-xs ${
                      isChecked
                        ? "bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-400"
                        : "bg-white/60 border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 text-emerald-600 rounded"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{emp.nama}</p>
                      <p className="text-[11px] text-slate-500">
                        {emp.jabatan} • {emp.kelas !== "-" ? `Kelas ${emp.kelas}` : emp.jenisPTK}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-step3-next-sync"
                onClick={() => {
                  syncCurrentDraft();
                  setCurrentStep(4);
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                title="Lanjut ke Langkah 4 dengan data saat ini yang telah disinkronkan"
              >
                <span>Langkah 4: Tinjau Draf SK</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                id="btn-step3-generate-ai"
                onClick={handleGenerateDraft}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Susun SK Otomatis dengan AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: AI GENERATING / DRAFT REVIEW */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 animate-fade-in">
          {syncNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          {isGenerating ? (
            <div className="py-12 space-y-4 text-center">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  {isAnalyzingImage
                    ? "AI Gemini Vision sedang membaca foto dokumen SK..."
                    : "AI sedang menyusun draf Surat Keputusan resmi..."}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAnalyzingImage
                    ? "Mengekstrak kop, judul, nomor, konsiderans menimbang, dasar hukum mengingat, diktum memutuskan, serta tabel lampiran guru langsung dari gambar."
                    : "Menyusun konsiderans Menimbang, memeriksa dasar hukum Mengingat terkini, merumuskan diktum MEMUTUSKAN KESATU - KEDELAPAN, serta mengompilasi lampiran tabel guru dan PTK."}
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {isAnalyzingImage
                      ? "Sedang memproses OCR & ekstraksi cerdas AI (rata-rata 5-15 detik)..."
                      : "Sedang diproses oleh Gemini AI (rata-rata 3-8 detik)..."}
                  </span>
                </div>
              </div>
            </div>
          ) : draftDoc ? (
            <div className="space-y-6 text-left">
              {/* Pratinjau Kop Surat Resmi jika Mode Gambar Aktif */}
              {profile.kopMode === "gambar" && activeKopUrl && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                  <img
                    src={activeKopUrl}
                    alt="Kop Surat Satuan Pendidikan"
                    className="max-h-24 sm:max-h-28 mx-auto object-contain"
                  />
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-medium mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Kop Surat Resmi Sekolah (Mode Gambar) Aktif</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Draf Formal SK Sesuai Regulasi Dinas</span>
                    </div>
                    {draftSource && draftSource.includes("vision") ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        <Camera className="w-3 h-3 text-indigo-600" />
                        Disusun dari Foto Gambar oleh AI Vision ({draftSource})
                      </span>
                    ) : draftSource && (draftSource.includes("gemini") || draftSource.includes("flash")) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Disusun oleh AI Gemini ({draftSource})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                        Format Standar Tata Naskah
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {draftDoc.judul}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nomor: <span className="font-mono font-semibold text-slate-700">{draftDoc.nomor}</span> • Tahun Ajaran {draftDoc.tahunAjaran} • Ditetapkan di {draftDoc.tempatTetap}, {draftDoc.tanggalTetap}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-step4-regenerate-ai"
                    onClick={handleGenerateDraft}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                    title="Susun ulang naskah draf dengan AI Gemini menggunakan data terkini"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Susun Ulang AI</span>
                  </button>
                  <button
                    id="btn-step4-sync-now"
                    onClick={() => {
                      syncCurrentDraft();
                      setSyncNotice("Data Tahap 1, 2, dan 3 berhasil disinkronkan ke dalam naskah draf!");
                      setTimeout(() => setSyncNotice(null), 3000);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    title="Sinkronkan data nomor, tanggal, dan guru dari Tahap 1-3"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sinkronkan Data</span>
                  </button>
                  <button
                    id="btn-preview-draft"
                    onClick={() => onPreviewSK(syncCurrentDraft())}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Pratinjau A4</span>
                  </button>
                  <button
                    id="btn-step4-next-refine"
                    onClick={() => {
                      syncCurrentDraft();
                      setCurrentStep(5);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm cursor-pointer"
                  >
                    <span>Langkah 5: AI Refiner</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Summary of Draft */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-800">Ringkasan Konsiderans:</h4>
                  <p className="text-slate-600">
                    <strong>Menimbang:</strong> {draftDoc.menimbang.length} butir konsiderans
                  </p>
                  <p className="text-slate-600">
                    <strong>Mengingat:</strong> {draftDoc.mengingat.length} butir dasar hukum
                    pendidikan nasional
                  </p>
                  <p className="text-slate-600">
                    <strong>Memperhatikan:</strong> {draftDoc.memperhatikan}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-800">Diktum & Lampiran:</h4>
                  <p className="text-slate-600">
                    <strong>Diktum Putusan:</strong> {draftDoc.diktum.length} butir (
                    {draftDoc.diktum.map((d) => d.poin).join(", ")})
                  </p>
                  <p className="text-slate-600">
                    <strong>Lampiran Tabel:</strong> {draftDoc.lampiranList.length} lampiran resmi (
                    {draftDoc.lampiranList.map((l) => l.nomorLampiran).join(", ")})
                  </p>
                  <p className="text-slate-600">
                    <strong>Tembusan:</strong> {draftDoc.tembusan.length} instansi/pihak terkait
                  </p>
                </div>
              </div>

              {draftDoc.aiNotes && draftDoc.aiNotes.length > 0 && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Catatan Regulasi AI:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                    {draftDoc.aiNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 max-w-lg mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Penyusunan Draf Formal oleh AI Siap Dijalankan
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sistem siap merumuskan draf baku <strong>{selectedSKType}</strong> dengan konsiderans Menimbang, dasar hukum Mengingat, Diktum Memutuskan, dan tabel penugasan guru secara otomatis.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  id="btn-step4-trigger-ai"
                  onClick={() => handleGenerateDraft()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mulai Susun Draf Formal dengan AI Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Langkah 3</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: AI REFINER & CHAT REFINEMENT */}
      {currentStep === 5 && draftDoc && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                <Wand2 className="w-4 h-4" />
                <span>AI Refiner & Editor Dokumen</span>
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Perbaiki atau Tambah Rincian SK Secara Fleksibel
              </h3>
              <p className="text-xs text-slate-500">
                Ketik instruksi perbaikan dalam bahasa sehari-hari tanpa mengetik ulang seluruh
                dokumen.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                id="btn-preview-refine"
                onClick={() => {
                  const finalDoc = syncCurrentDraft(draftDoc);
                  saveDefaultSKParams({
                    tahunAjaran: finalDoc.tahunAjaran,
                    tanggalTetap: finalDoc.tanggalTetap,
                    tempatTetap: finalDoc.tempatTetap,
                    tanggalRapat: finalDoc.tanggalRapat || finalDoc.memperhatikan,
                    memperhatikan: finalDoc.memperhatikan,
                  });
                  onPreviewSK(finalDoc);
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Pratinjau SK</span>
              </button>
              <button
                id="btn-save-to-archive"
                onClick={() => {
                  const finalDoc = syncCurrentDraft(draftDoc);
                  saveDefaultSKParams({
                    tahunAjaran: finalDoc.tahunAjaran,
                    tanggalTetap: finalDoc.tanggalTetap,
                    tempatTetap: finalDoc.tempatTetap,
                    tanggalRapat: finalDoc.tanggalRapat || finalDoc.memperhatikan,
                    memperhatikan: finalDoc.memperhatikan,
                  });
                  onSaveSK(finalDoc);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan ke Arsip & Final</span>
              </button>
            </div>
          </div>

          {/* Quick Command Pills from User Prompt Section 13 */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Contoh Perintah Cepat yang Dapat Digunakan:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "buat lebih formal dan sesuaikan bahasa tata naskah dinas",
                "tambahkan dasar hukum Permendikbudristek Kurikulum Merdeka",
                "tambahkan guru kelas III ke dalam susunan tim",
                "ubah tanggal penetapan menjadi 20 Juni 2025",
                "perbaiki bahasa konsiderans Menimbang agar lebih lugas",
                "tambahkan tembusan ke Pengawas Sekolah Pembina",
                "periksa kesesuaian total jam mengajar di lampiran I",
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRefine(cmd)}
                  disabled={isRefining}
                  className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[11px] px-2.5 py-1 rounded-full border border-slate-200 transition-colors cursor-pointer"
                >
                  + "{cmd}"
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Refine Input */}
          <div className="flex gap-2">
            <input
              id="input-ai-refine-prompt"
              type="text"
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRefine();
              }}
              placeholder="Ketik instruksi pembaruan, misal: 'tambahkan pasal ketentuan penutup' atau 'ubah nama seksi'..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              id="btn-send-refine"
              onClick={() => handleRefine()}
              disabled={isRefining || !refineInstruction.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memperbarui...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Perbarui Draf</span>
                </>
              )}
            </button>
          </div>

          {/* Refine History */}
          {refineHistory.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <span className="font-bold text-slate-700">Riwayat Perubahan AI:</span>
              <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5">
                {refineHistory.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Inline Editor for manual touch-ups */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tinjauan Cepat Isi Draf (Dapat Diedit Langsung):
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Materi Pokok / Tentang SK:
                  <span className="text-[11px] font-normal text-slate-500 ml-1">
                    (Langsung isikan substansi, tanpa kata 'KEPUTUSAN KEPALA', 'TENTANG', atau 'TAHUN AJARAN')
                  </span>
                </label>
                <input
                  type="text"
                  value={draftDoc.judul}
                  onChange={(e) =>
                    setDraftDoc({ ...draftDoc, judul: e.target.value })
                  }
                  onBlur={() =>
                    setDraftDoc({ ...draftDoc, judul: cleanSKJudul(draftDoc.judul, draftDoc.tahunAjaran) })
                  }
                  placeholder="Contoh: PEMBAGIAN TUGAS GURU DALAM KEGIATAN PROSES BELAJAR MENGAJAR DAN TUGAS TERTENTU"
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor SK:</label>
                  <input
                    type="text"
                    value={draftDoc.nomor}
                    onChange={(e) => {
                      setNomorSK(e.target.value);
                      setDraftDoc({ ...draftDoc, nomor: e.target.value });
                    }}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Penetapan:
                  </label>
                  <input
                    type="text"
                    value={draftDoc.tanggalTetap}
                    onChange={(e) => {
                      setTanggalTetap(e.target.value);
                      setDraftDoc({ ...draftDoc, tanggalTetap: e.target.value });
                    }}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Konsiderans Menimbang:
                </label>
                {draftDoc.menimbang.map((m, idx) => (
                  <div key={idx} className="flex gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-500 mt-2">
                      {String.fromCharCode(97 + idx)}.
                    </span>
                    <textarea
                      rows={2}
                      value={m}
                      onChange={(e) => {
                        const updated = [...draftDoc.menimbang];
                        updated[idx] = e.target.value;
                        setDraftDoc({ ...draftDoc, menimbang: updated });
                      }}
                      className="w-full p-2 border border-slate-300 rounded text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
