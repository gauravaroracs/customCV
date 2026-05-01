"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { MasterCvModal } from "@/components/MasterCvModal";
import { QuickApplyPanel } from "@/components/QuickApplyPanel";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ResumePreview } from "@/components/ResumePreview";
import { Toolbar } from "@/components/Toolbar";
import { generateATSText, getATSFilename } from "@/lib/cvText";
import { sampleResume } from "@/sampleResume";
import {
  JobMetadata,
  RecentApplication,
  ResumeData,
  ResumeSectionKey,
  TailorResponse
} from "@/types/resume";

const LEGACY_STORAGE_KEY = "cvpilot-resume";
const WORKING_CV_STORAGE_KEY = "cvpilot-working-cv";
const MASTER_CV_STORAGE_KEY = "masterCV";
const VERSION_STORAGE_KEY = "cvpilot-version";
const RECENT_APPS_STORAGE_KEY = "recentApps";
const FONT_SIZE_STORAGE_KEY = "cvFontSize";

const versions = ["Java Backend Heavy", "General Tech", "Germany Targeted"];

const emptyMetadata: JobMetadata = {
  company: "",
  role: "",
  location: ""
};

const defaultOpenSections: Record<ResumeSectionKey, boolean> = {
  personal: true,
  profile: true,
  skills: true,
  languages: false,
  education: true,
  experience: true,
  projects: false
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read the selected image."));
    };
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}

async function compressProfilePhoto(file: File) {
  const dataUrl = await readFileAsDataUrl(file);

  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const maxSize = 256;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Failed to process the selected image."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.78));
    };

    image.onerror = () => reject(new Error("Failed to load the selected image."));
    image.src = dataUrl;
  });
}

function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeResumeInput(value: unknown): ResumeData {
  const candidate =
    value &&
    typeof value === "object" &&
    "tailoredCV" in value &&
    value.tailoredCV &&
    typeof value.tailoredCV === "object"
      ? value.tailoredCV
      : value;

  const source = (candidate && typeof candidate === "object" ? candidate : {}) as Partial<ResumeData>;
  const personal = (source.personal && typeof source.personal === "object"
    ? source.personal
    : {}) as Partial<ResumeData["personal"]>;

  const rawSkills =
    source.skills && typeof source.skills === "object" && !Array.isArray(source.skills)
      ? source.skills
      : {};

  const normalizedSkills = Object.fromEntries(
    Object.entries(rawSkills).map(([groupName, groupValues]) => [groupName, toStringArray(groupValues)])
  );

  return {
    personal: {
      name: typeof personal.name === "string" ? personal.name : sampleResume.personal.name,
      email: typeof personal.email === "string" ? personal.email : sampleResume.personal.email,
      phone: typeof personal.phone === "string" ? personal.phone : sampleResume.personal.phone,
      location:
        typeof personal.location === "string"
          ? personal.location
          : sampleResume.personal.location,
      linkedin:
        typeof personal.linkedin === "string"
          ? personal.linkedin
          : sampleResume.personal.linkedin,
      photoUrl: typeof personal.photoUrl === "string" ? personal.photoUrl : ""
    },
    profile: typeof source.profile === "string" ? source.profile : sampleResume.profile,
    skills:
      Object.keys(normalizedSkills).length > 0 ? normalizedSkills : { ...sampleResume.skills },
    languages: Array.isArray(source.languages)
      ? source.languages.map((item) => ({
          name:
            item && typeof item === "object"
              ? String(
                  ("language" in item ? item.language : "name" in item ? item.name : "") ?? ""
                )
              : "",
          level:
            item && typeof item === "object" && "level" in item ? String(item.level ?? "") : ""
        }))
      : sampleResume.languages,
    education: Array.isArray(source.education)
      ? source.education.map((item) => ({
          degree:
            item && typeof item === "object" && "degree" in item ? String(item.degree ?? "") : "",
          institution:
            item && typeof item === "object" && "institution" in item
              ? String(item.institution ?? "")
              : "",
          location:
            item && typeof item === "object" && "location" in item
              ? String(item.location ?? "")
              : "",
          dates:
            item && typeof item === "object" && "dates" in item ? String(item.dates ?? "") : "",
          details:
            item && typeof item === "object" && "details" in item
              ? toStringArray(item.details)
              : []
        }))
      : sampleResume.education,
    experience: Array.isArray(source.experience)
      ? source.experience.map((item) => {
          const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
          role: String((entry.title ?? entry.role ?? "") as string),
          company: String((entry.company ?? "") as string),
          location: String((entry.location ?? "") as string),
          dates: String(
            (entry.dates ??
              ((entry.start || entry.end)
                ? `${String(entry.start ?? "")} – ${String(entry.end ?? "")}`.trim()
                : "")) as string
          ),
          bullets:
              "bullets" in entry
              ? toStringArray(entry.bullets)
              : []
        };
      })
      : sampleResume.experience,
    projects: Array.isArray(source.projects)
      ? source.projects.map((item) => ({
          name:
            item && typeof item === "object" && "name" in item ? String(item.name ?? "") : "",
          tech:
            item && typeof item === "object" && "tech" in item ? String(item.tech ?? "") : "",
          bullets:
            item && typeof item === "object" && "bullets" in item
              ? toStringArray(item.bullets)
              : []
        }))
      : sampleResume.projects
  };
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const generateShortcutRef = useRef<(() => void) | null>(null);
  const copyShortcutRef = useRef<(() => Promise<void>) | null>(null);
  const downloadPdfRef = useRef<(() => void) | null>(null);
  const [importTarget, setImportTarget] = useState<"working" | "master">("working");
  const [resume, setResume] = useState<ResumeData>(sampleResume);
  const [masterCV, setMasterCV] = useState<ResumeData | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(versions[0]);
  const [selectedSection, setSelectedSection] = useState<ResumeSectionKey | null>("profile");
  const [openSections, setOpenSections] =
    useState<Record<ResumeSectionKey, boolean>>(defaultOpenSections);
  const [jobDescription, setJobDescription] = useState("");
  const [jobMetadata, setJobMetadata] = useState<JobMetadata>(emptyMetadata);
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"preview" | "changes">("preview");
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterModalMode, setMasterModalMode] = useState<"setup" | "update">("setup");
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [cvFontSize, setCvFontSize] = useState("9.5px");
  const [previewOverflowAmount, setPreviewOverflowAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedMaster = window.localStorage.getItem(MASTER_CV_STORAGE_KEY);
    const storedWorking =
      window.localStorage.getItem(WORKING_CV_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const storedVersion = window.localStorage.getItem(VERSION_STORAGE_KEY);
    const storedRecentApps = window.localStorage.getItem(RECENT_APPS_STORAGE_KEY);

    if (storedMaster) {
      try {
        const parsedMaster = normalizeResumeInput(JSON.parse(storedMaster));
        setMasterCV(parsedMaster);

        let initialResume = parsedMaster;
        if (storedWorking) {
          initialResume = normalizeResumeInput(JSON.parse(storedWorking));
        }
        
        const savedPhoto = window.localStorage.getItem('cvPhoto');
        if (savedPhoto) {
          initialResume.personal.photoUrl = savedPhoto;
        }
        setResume(initialResume);
      } catch {
        window.localStorage.removeItem(MASTER_CV_STORAGE_KEY);
        setMasterModalMode("setup");
        setShowMasterModal(true);
      }
    } else {
      if (storedWorking) {
        try {
          const initialResume = normalizeResumeInput(JSON.parse(storedWorking));
          const savedPhoto = window.localStorage.getItem('cvPhoto');
          if (savedPhoto) {
            initialResume.personal.photoUrl = savedPhoto;
          }
          setResume(initialResume);
        } catch {
          window.localStorage.removeItem(WORKING_CV_STORAGE_KEY);
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }

      setMasterModalMode("setup");
      setShowMasterModal(true);
    }

    if (storedVersion && versions.includes(storedVersion)) {
      setSelectedVersion(storedVersion);
    }

    const storedFontSize = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (storedFontSize) {
      setCvFontSize(storedFontSize);
    }

    if (storedRecentApps) {
      try {
        setRecentApplications(JSON.parse(storedRecentApps) as RecentApplication[]);
      } catch {
        window.localStorage.removeItem(RECENT_APPS_STORAGE_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(WORKING_CV_STORAGE_KEY, JSON.stringify(resume));
    } catch {
      setError("The working CV could not be saved in browser storage. Try a smaller photo.");
    }
  }, [isHydrated, resume]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(VERSION_STORAGE_KEY, selectedVersion);
  }, [isHydrated, selectedVersion]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, cvFontSize);
  }, [cvFontSize, isHydrated]);

  useEffect(() => {
    const previewElement = document.getElementById("cv-preview");
    if (!previewElement) {
      return;
    }

    previewElement.style.setProperty("--cv-font-size", cvFontSize);
  }, [cvFontSize, resume]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(RECENT_APPS_STORAGE_KEY, JSON.stringify(recentApplications));
  }, [isHydrated, recentApplications]);

  const persistMasterCV = (nextMasterCV: ResumeData) => {
    setMasterCV(nextMasterCV);
    setResume(nextMasterCV);
    window.localStorage.setItem(MASTER_CV_STORAGE_KEY, JSON.stringify(nextMasterCV));
    window.localStorage.setItem(WORKING_CV_STORAGE_KEY, JSON.stringify(nextMasterCV));
    setResult(null);
    setError(null);
    setMasterModalMode("update");
    setShowMasterModal(false);
  };

  const handleResumeChange = (nextResume: ResumeData) => {
    setResume(nextResume);
    setResult(null);
    setError(null);
  };

  const handleExport = () => {
    downloadTextFile(
      JSON.stringify(resume, null, 2),
      "cvpilot-resume.json",
      "application/json"
    );
  };

  const handleImportClick = (target: "working" | "master" = "working") => {
    setImportTarget(target);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = normalizeResumeInput(JSON.parse(text));

      if (importTarget === "master") {
        persistMasterCV(parsed);
      } else {
        setResume(parsed);
        setResult(null);
        setError(null);
      }
    } catch {
      setError("The imported file is not valid resume JSON.");
    } finally {
      event.target.value = "";
    }
  };

  const handleResetToMaster = () => {
    if (!masterCV) {
      setResume(sampleResume);
      return;
    }

    setResume(masterCV);
    setResult(null);
    setError(null);
  };

  const handleUpdateMaster = () => {
    setMasterModalMode("update");
    setShowMasterModal(true);
  };

  const handleExtractMetadata = async (pastedText: string) => {
    try {
      const response = await fetch("/api/extract-job-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: pastedText.slice(0, 500) })
      });

      const parsed = (await response.json()) as JobMetadata & { error?: string };
      if (!response.ok) {
        throw new Error(parsed.error ?? "Failed to extract job metadata.");
      }

      setJobMetadata({
        company: parsed.company ?? "",
        role: parsed.role ?? "",
        location: parsed.location ?? ""
      });
    } catch {
      // Keep the workflow moving even if metadata extraction fails.
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setError("Paste a job description before tailoring the CV.");
      return;
    }

    if (!masterCV) {
      setError("Set a master CV before generating a tailored version.");
      setShowMasterModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tailor-cv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          masterCV,
          jobDescription: jobDescription.trim()
        })
      });

      const parsed = (await response.json()) as TailorResponse & { error?: string };
      if (!response.ok) {
        throw new Error(parsed.error ?? "The AI request failed.");
      }

      const tailored = parsed.tailoredCV;
      tailored.personal.photoUrl = resume.personal.photoUrl;

      setResume(tailored);
      setResult(parsed);
      setActiveResultTab("changes");

      setRecentApplications((current) => {
        const nextItem: RecentApplication = {
          company: jobMetadata.company,
          role: jobMetadata.role,
          location: jobMetadata.location,
          timestamp: new Date().toISOString(),
          tailoredCV: parsed.tailoredCV,
          jdSnapshot: jobDescription
        };

        return [nextItem, ...current].slice(0, 5);
      });
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof Error ? requestError.message : "The AI request failed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecent = (timestamp: string) => {
    const selectedApplication = recentApplications.find((item) => item.timestamp === timestamp);
    if (!selectedApplication) {
      return;
    }

    setResume(selectedApplication.tailoredCV);
    setJobDescription(selectedApplication.jdSnapshot);
    setJobMetadata({
      company: selectedApplication.company,
      role: selectedApplication.role,
      location: selectedApplication.location
    });
    setResult(null);
    setActiveResultTab("preview");
    setError(null);
  };

  const handleDownloadATS = () => {
    const text = generateATSText(resume);
    downloadTextFile(text, getATSFilename(resume, jobMetadata), "text/plain;charset=utf-8");
  };

  const downloadPDF = () => {
    const originalTitle = document.title;
    const name = resume.personal.name.replace(/\s+/g, "");
    document.title = `${name}_CV`;
    window.print();
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 0);
  };

  const handleCopyPlainText = async () => {
    const text = generateATSText(resume);
    await navigator.clipboard.writeText(text);
  };

  generateShortcutRef.current = () => {
    void handleGenerate();
  };
  copyShortcutRef.current = handleCopyPlainText;
  downloadPdfRef.current = downloadPDF;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        setShowMasterModal(false);
      }

      if (hasModifier && event.key === "Enter") {
        event.preventDefault();
        if (!isLoading) {
          generateShortcutRef.current?.();
        }
      }

      if (hasModifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (!isLoading) {
          void downloadPdfRef.current?.();
        }
      }

      if (hasModifier && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (!isLoading) {
          void copyShortcutRef.current?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading]);

  const handlePhotoUpload = async (file: File) => {
    try {
      const photoUrl = await compressProfilePhoto(file);
      setResume((currentResume) => ({
        ...currentResume,
        personal: {
          ...currentResume.personal,
          photoUrl
        }
      }));
      window.localStorage.setItem('cvPhoto', photoUrl);
      setResult(null);
      setError(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to process the selected image."
      );
    }
  };

  const handlePhotoRemove = () => {
    setResume((currentResume) => ({
      ...currentResume,
      personal: {
        ...currentResume.personal,
        photoUrl: ""
      }
    }));
    window.localStorage.removeItem('cvPhoto');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Toolbar
        selectedVersion={selectedVersion}
        versions={versions}
        disabled={isLoading}
        masterCvName={masterCV?.personal.name || resume.personal.name || "Not set"}
        recentApplications={recentApplications}
        cvFontSize={cvFontSize}
        onVersionChange={setSelectedVersion}
        onFontSizeChange={setCvFontSize}
        onImportClick={() => handleImportClick("working")}
        onExportClick={handleExport}
        onPrintClick={downloadPDF}
        onDownloadATS={handleDownloadATS}
        onCopyPlainText={handleCopyPlainText}
        onResetClick={handleResetToMaster}
        onUpdateMaster={handleUpdateMaster}
        onSelectRecent={handleSelectRecent}
      />

      <MasterCvModal
        isOpen={showMasterModal}
        mode={masterModalMode}
        onImportClick={() => handleImportClick("master")}
        onUseCurrent={() => persistMasterCV(resume)}
        onClose={() => setShowMasterModal(false)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportFile}
        className="hidden"
      />

      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 px-5 py-6 xl:grid-cols-[420px_minmax(0,1fr)_420px]">
        <div className="no-print">
          <ResumeEditor
            resume={resume}
            selectedSection={selectedSection}
            openSections={openSections}
            disabled={isLoading}
            onSelectSection={(key) => {
              setSelectedSection(key);
              setResult(null);
              setError(null);
            }}
            onToggleSection={(key) =>
              setOpenSections((current) => ({ ...current, [key]: !current[key] }))
            }
            onResumeChange={handleResumeChange}
            onPhotoUpload={handlePhotoUpload}
            onPhotoRemove={handlePhotoRemove}
          />
        </div>

        <div className="overflow-x-auto">
          <div className="no-print mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
            Save as PDF → Margins: None → Background graphics: ON → Save
          </div>
          <ResumePreview
            resume={resume}
            isLoading={isLoading}
            cvFontSize={cvFontSize}
            onOverflowChange={setPreviewOverflowAmount}
          />
          <div className="no-print mt-3 flex justify-center">
            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                previewOverflowAmount > 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {previewOverflowAmount > 0
                ? `⚠ Overflowing by ${Math.round(previewOverflowAmount)}px — reduce font size or content`
                : "Fits within exact A4 height"}
            </div>
          </div>
          <div className="no-print mt-4 flex flex-wrap justify-center gap-3">
            <div className="group relative">
              <button
                type="button"
                onClick={downloadPDF}
                disabled={isLoading}
                className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                ⬇ Download PDF
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl group-hover:block">
                When the print dialog opens: set Destination to &quot;Save as PDF&quot;, Margins to &quot;None&quot;, and check &quot;Background graphics&quot;
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadATS}
              disabled={isLoading}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ⬇ Download ATS .txt
            </button>
            <button
              type="button"
              onClick={() => void handleCopyPlainText()}
              disabled={isLoading}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ⧉ Copy plain text
            </button>
          </div>
        </div>

        <QuickApplyPanel
          jobDescription={jobDescription}
          metadata={jobMetadata}
          result={result}
          error={error}
          isLoading={isLoading}
          disabled={isLoading}
          activeTab={activeResultTab}
          onJobDescriptionChange={setJobDescription}
          onJobDescriptionPaste={(value) => {
            void handleExtractMetadata(value);
          }}
          onMetadataChange={(key, value) =>
            setJobMetadata((current) => ({ ...current, [key]: value }))
          }
          onGenerate={() => {
            void handleGenerate();
          }}
          onTabChange={setActiveResultTab}
        />
      </div>
    </div>
  );
}
