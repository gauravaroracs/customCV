"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { MasterCvModal } from "@/components/MasterCvModal";
import { QuickApplyPanel } from "@/components/QuickApplyPanel";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ResumePreview } from "@/components/ResumePreview";
import { Toolbar } from "@/components/Toolbar";
import { generateATSText, generateATSHtml, getATSPdfFilename, getATSPdfTitle } from "@/lib/cvText";
import { sampleResume } from "@/sampleResume";
import {
  JobMetadata,
  RecentApplication,
  ResumeData,
  ResumeSectionKey,
  TailorResponse
} from "@/types/resume";

// ── Legacy localStorage keys used only for one-time migration fallback ──────
const LEGACY_STORAGE_KEY        = "cvpilot-resume";
const WORKING_CV_STORAGE_KEY    = "cvPilot_workingCV";
const MASTER_CV_STORAGE_KEY     = "cvPilot_masterCV";
const VERSION_STORAGE_KEY       = "cvpilot-version";
const RECENT_APPS_STORAGE_KEY   = "cvPilot_recent";
const FONT_SIZE_STORAGE_KEY     = "cvPilot_fontSize";
const FONT_WEIGHT_STORAGE_KEY   = "cvFontWeight";
const PHOTO_STORAGE_KEY         = "cvPilot_photo";
const ATS_PRINT_STYLE_ID        = "cvpilot-ats-print-style";

type CvPilotSettings = {
  selectedVersion?: string;
  cvFontSize?: string;
  cvFontWeight?: string;
  cvTopMargin?: string;
  cvBottomMargin?: string;
};

type CvPilotStorageSnapshot = {
  masterCV?: unknown;
  workingCV?: unknown;
  recentApplications?: unknown[];
  settings?: CvPilotSettings;
  photo?: string;
};

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
      const maxSize = 600;
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
      resolve(canvas.toDataURL("image/webp", 0.93));
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

async function readRepoStorage(): Promise<CvPilotStorageSnapshot> {
  const response = await fetch("/api/cvpilot-storage", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Could not read repo-backed CVPilot storage.");
  }

  return response.json() as Promise<CvPilotStorageSnapshot>;
}

async function patchRepoStorage(payload: CvPilotStorageSnapshot) {
  const response = await fetch("/api/cvpilot-storage", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Could not write repo-backed CVPilot storage.");
  }
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
      website: typeof personal.website === "string" ? personal.website : "",
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

function withStoredPhoto(cv: ResumeData, storedPhoto: string | null) {
  return {
    ...cv,
    personal: {
      ...cv.personal,
      photoUrl: storedPhoto ?? cv.personal.photoUrl
    }
  };
}

function normalizeRecentApplications(value: unknown): RecentApplication[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = item && typeof item === "object" ? item as Record<string, unknown> : null;
      if (!source || !source.tailoredCV) {
        return null;
      }

      return {
        id: typeof source.id === "number" ? source.id : Date.now(),
        company: typeof source.company === "string" ? source.company : "",
        role: typeof source.role === "string" ? source.role : "",
        location: typeof source.location === "string" ? source.location : "",
        timestamp: typeof source.timestamp === "string" ? source.timestamp : new Date().toISOString(),
        tailoredCV: normalizeResumeInput(source.tailoredCV),
        matchScore: typeof source.matchScore === "number" ? source.matchScore : 0,
        jdSnapshot: typeof source.jdSnapshot === "string" ? source.jdSnapshot.slice(0, 500) : ""
      };
    })
    .filter((item): item is RecentApplication => Boolean(item))
    .slice(0, 10);
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const generateShortcutRef = useRef<(() => void) | null>(null);
  const copyShortcutRef = useRef<(() => Promise<void>) | null>(null);
  const downloadPdfRef = useRef<(() => void) | null>(null);
  const storedPhotoRef = useRef("");
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
  const [hasStoredMasterCV, setHasStoredMasterCV] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [cvFontSize, setCvFontSize] = useState("9.5px");
  const [cvFontWeight, setCvFontWeight] = useState("400");
  const [cvTopMargin, setCvTopMargin] = useState("12px");
  const [cvBottomMargin, setCvBottomMargin] = useState("12px");
  const [previewOverflowAmount, setPreviewOverflowAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isRescoring, setIsRescoring] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStoredState = async () => {
      try {
        const repoStorage = await readRepoStorage();
        const legacyStoredMaster = window.localStorage.getItem(MASTER_CV_STORAGE_KEY)
          ?? window.localStorage.getItem("masterCV");
        const legacyStoredWorking =
          window.localStorage.getItem(WORKING_CV_STORAGE_KEY) ??
          window.localStorage.getItem("cvpilot-working-cv") ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        const legacyStoredRecentApps =
          window.localStorage.getItem(RECENT_APPS_STORAGE_KEY) ??
          window.localStorage.getItem("recentApps");
        const legacyPhoto =
          window.localStorage.getItem(PHOTO_STORAGE_KEY) ??
          window.localStorage.getItem("cvPhoto") ??
          "";

        const storedPhoto = repoStorage.photo || legacyPhoto;
        storedPhotoRef.current = storedPhoto;

        const repoMaster = repoStorage.masterCV || null;
        const repoWorking = repoStorage.workingCV || null;
        const repoRecent = Array.isArray(repoStorage.recentApplications)
          ? repoStorage.recentApplications
          : null;

        let nextMaster: ResumeData | null = null;
        let nextResume: ResumeData | null = null;
        let didMigrate = false;

        if (repoMaster) {
          nextMaster = withStoredPhoto(normalizeResumeInput(repoMaster), storedPhoto);
        } else if (legacyStoredMaster) {
          nextMaster = withStoredPhoto(normalizeResumeInput(JSON.parse(legacyStoredMaster)), storedPhoto);
          didMigrate = true;
        }

        if (repoWorking) {
          nextResume = withStoredPhoto(normalizeResumeInput(repoWorking), storedPhoto);
        } else if (legacyStoredWorking) {
          nextResume = withStoredPhoto(normalizeResumeInput(JSON.parse(legacyStoredWorking)), storedPhoto);
          didMigrate = true;
        } else if (nextMaster) {
          nextResume = nextMaster;
        } else if (storedPhoto) {
          nextResume = withStoredPhoto(sampleResume, storedPhoto);
          didMigrate = true;
        }

        const repoSettings = repoStorage.settings ?? {};
        const legacyStoredVersion = window.localStorage.getItem(VERSION_STORAGE_KEY);
        const legacyStoredFontSize =
          window.localStorage.getItem(FONT_SIZE_STORAGE_KEY) ??
          window.localStorage.getItem("cvFontSize");
        const legacyStoredFontWeight = window.localStorage.getItem(FONT_WEIGHT_STORAGE_KEY);
        const legacyStoredPageMargin = window.localStorage.getItem("cvPageMargin");
        const legacyStoredTopMargin = window.localStorage.getItem("cvTopMargin");
        const legacyStoredBottomMargin = window.localStorage.getItem("cvBottomMargin");

        const nextSelectedVersion =
          repoSettings.selectedVersion ??
          (legacyStoredVersion && versions.includes(legacyStoredVersion) ? legacyStoredVersion : undefined);
        const nextFontSize = repoSettings.cvFontSize ?? legacyStoredFontSize ?? undefined;
        const nextFontWeight = repoSettings.cvFontWeight ?? legacyStoredFontWeight ?? undefined;
        const nextTopMargin =
          repoSettings.cvTopMargin ?? legacyStoredTopMargin ?? legacyStoredPageMargin ?? undefined;
        const nextBottomMargin =
          repoSettings.cvBottomMargin ?? legacyStoredBottomMargin ?? legacyStoredPageMargin ?? undefined;

        const nextRecentApplications = repoRecent
          ? normalizeRecentApplications(repoRecent)
          : legacyStoredRecentApps
            ? normalizeRecentApplications(JSON.parse(legacyStoredRecentApps))
            : [];

        if (legacyStoredRecentApps && !repoRecent) {
          didMigrate = true;
        }

        if (!isMounted) {
          return;
        }

        if (nextMaster) {
          setMasterCV(nextMaster);
          setHasStoredMasterCV(true);
        } else {
          setMasterModalMode("setup");
          setShowMasterModal(true);
        }

        if (nextResume) {
          setResume(nextResume);
        }

        if (nextSelectedVersion && versions.includes(nextSelectedVersion)) {
          setSelectedVersion(nextSelectedVersion);
        }

        if (nextFontSize) {
          setCvFontSize(nextFontSize);
        }

        if (nextFontWeight) {
          setCvFontWeight(nextFontWeight);
        }

        if (nextTopMargin) {
          setCvTopMargin(nextTopMargin);
        }

        if (nextBottomMargin) {
          setCvBottomMargin(nextBottomMargin);
        }

        setRecentApplications(nextRecentApplications);
        setIsHydrated(true);

        if (didMigrate || (storedPhoto && !repoStorage.photo)) {
          void patchRepoStorage({
            masterCV: nextMaster,
            workingCV: nextResume,
            recentApplications: nextRecentApplications,
            photo: storedPhoto,
            settings: {
              selectedVersion: nextSelectedVersion,
              cvFontSize: nextFontSize,
              cvFontWeight: nextFontWeight,
              cvTopMargin: nextTopMargin,
              cvBottomMargin: nextBottomMargin
            }
          });
        }
      } catch (storageError) {
        if (!isMounted) {
          return;
        }

        setError(storageError instanceof Error ? storageError.message : "Could not load saved CVPilot data.");
        setMasterModalMode("setup");
        setShowMasterModal(true);
        setIsHydrated(true);
      }
    };

    void loadStoredState();

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-save of working CV (500 ms)
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      void patchRepoStorage({ workingCV: resume }).catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : "The working CV could not be saved.");
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [isHydrated, resume]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { selectedVersion } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The version preference could not be saved.");
    });
  }, [isHydrated, selectedVersion]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { cvFontSize } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The font size preference could not be saved.");
    });
  }, [cvFontSize, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { cvFontWeight } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The font weight preference could not be saved.");
    });
  }, [cvFontWeight, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { cvTopMargin } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The top margin preference could not be saved.");
    });
  }, [cvTopMargin, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { cvBottomMargin } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The bottom margin preference could not be saved.");
    });
  }, [cvBottomMargin, isHydrated]);

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

    void patchRepoStorage({ recentApplications }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "Recent applications could not be saved.");
    });
  }, [isHydrated, recentApplications]);

  const persistMasterCV = async (nextMasterCV: ResumeData) => {
    setMasterCV(nextMasterCV);
    setResume(nextMasterCV);
    try {
      await patchRepoStorage({
        masterCV: nextMasterCV,
        workingCV: nextMasterCV
      });
      setHasStoredMasterCV(true);
      setError(null);
    } catch {
      setHasStoredMasterCV(false);
      setError("The master CV could not be saved in repo storage.");
    }
    setResult(null);
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
        await persistMasterCV(parsed);
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
      // Re-inject persisted photo so it survives the API round-trip.
      tailored.personal.photoUrl = storedPhotoRef.current || "";

      setResume(tailored);
      setResult(parsed);
      setActiveResultTab("changes");

      setRecentApplications((current) => {
        const nextItem: RecentApplication = {
          id: Date.now(),
          company: jobMetadata.company,
          role: jobMetadata.role,
          location: jobMetadata.location,
          timestamp: new Date().toISOString(),
          tailoredCV: parsed.tailoredCV,
          matchScore: parsed.matchScore ?? 0,
          jdSnapshot: jobDescription.slice(0, 500)
        };

        return [nextItem, ...current].slice(0, 10);
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

  const handleApplyEdit = async (instruction: string) => {
    setIsEditLoading(true);
    setEditSuccess(null);
    try {
      const response = await fetch("/api/rewrite-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullResume: resume,
          instruction,
          jobDescription: jobDescription.trim() || undefined
        })
      });
      const parsed = (await response.json()) as {
        updatedResume: ResumeData;
        summaryOfChanges: string[];
        warnings: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(parsed.error ?? "Edit failed.");
      const edited = parsed.updatedResume;
      edited.personal.photoUrl = resume.personal.photoUrl;
      setResume(edited);
      setEditSuccess(parsed.summaryOfChanges?.[0] ?? "Done!");
      setTimeout(() => setEditSuccess(null), 4000);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Edit failed.");
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleRescore = async () => {
    if (!jobDescription.trim()) {
      setError("Paste a job description to score against.");
      return;
    }
    setIsRescoring(true);
    setError(null);
    try {
      const response = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription: jobDescription.trim() })
      });
      const parsed = (await response.json()) as {
        matchScore: number;
        matchBreakdown: { keywords: number; experience: number; skills: number; overall: number };
        warnings: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(parsed.error ?? "Scoring failed.");
      // Merge the new score into the existing result (keep changes log), or create a minimal result
      setResult((current) =>
        current
          ? { ...current, matchScore: parsed.matchScore, matchBreakdown: parsed.matchBreakdown, warnings: parsed.warnings }
          : { tailoredCV: resume, changes: [], warnings: parsed.warnings, matchScore: parsed.matchScore, matchBreakdown: parsed.matchBreakdown }
      );
      setActiveResultTab("changes");
    } catch (rescoreError) {
      setError(rescoreError instanceof Error ? rescoreError.message : "Scoring failed.");
    } finally {
      setIsRescoring(false);
    }
  };

  const handleSaveApplication = () => {
    const newEntry: RecentApplication = {
      id: Date.now(),
      company: jobMetadata.company || "Unknown company",
      role: jobMetadata.role || "Untitled role",
      location: jobMetadata.location || "",
      timestamp: new Date().toISOString(),
      tailoredCV: resume,
      matchScore: result?.matchScore ?? 0,
      jdSnapshot: jobDescription.slice(0, 500)
    };
    setRecentApplications((current) => [newEntry, ...current].slice(0, 10));
    setIsSaveSuccess(true);
    setTimeout(() => setIsSaveSuccess(false), 3000);
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const photoUrl = await compressProfilePhoto(file);
      storedPhotoRef.current = photoUrl;
      setResume((currentResume) => ({
        ...currentResume,
        personal: {
          ...currentResume.personal,
          photoUrl
        }
      }));
      await patchRepoStorage({ photo: photoUrl });
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
    storedPhotoRef.current = "";
    setResume((currentResume) => ({
      ...currentResume,
      personal: {
        ...currentResume.personal,
        photoUrl: ""
      }
    }));
    void patchRepoStorage({ photo: "" }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The photo could not be removed from repo storage.");
    });
    setResult(null);
    setError(null);
  };

  // ── ATS Print-PDF download ───────────────────────────────────────────────
  const handleDownloadATSPdf = useCallback(() => {
    const originalTitle = document.title;
    const atsPreview = document.getElementById("ats-preview");
    const cvPreview = document.getElementById("cv-preview");
    const originalAtsDisplay = atsPreview?.style.display ?? "";
    const originalCvDisplay = cvPreview?.style.display ?? "";
    const styleElement = document.createElement("style");
    let restored = false;

    document.title = getATSPdfTitle(resume, jobMetadata);
    styleElement.id = ATS_PRINT_STYLE_ID;
    styleElement.textContent = `
@media print {
  @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
  body { font-family: Arial, sans-serif; color: #000; }
  * { color: #000 !important; background: none !important; }
}
`;

    document.getElementById(ATS_PRINT_STYLE_ID)?.remove();
    document.head.appendChild(styleElement);

    if (atsPreview) {
      atsPreview.style.display = "block";
    }

    if (cvPreview) {
      cvPreview.style.display = "none";
    }

    document.body.setAttribute("data-ats-print", "1");

    const restore = () => {
      if (restored) {
        return;
      }

      restored = true;
      document.body.removeAttribute("data-ats-print");
      styleElement.remove();

      if (atsPreview) {
        atsPreview.style.display = originalAtsDisplay;
      }

      if (cvPreview) {
        cvPreview.style.display = originalCvDisplay;
      }

      document.title = originalTitle;
      window.removeEventListener("afterprint", restore);
    };

    window.addEventListener("afterprint", restore, { once: true });
    window.print();
    window.setTimeout(restore, 0);
  }, [resume, jobMetadata]);

  // Build the ATS HTML whenever resume changes
  const atsHtml = generateATSHtml(resume);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hidden ATS preview div — shown only during print */}
      <div
        id="ats-preview"
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: atsHtml }}
      />

      <Toolbar
        selectedVersion={selectedVersion}
        versions={versions}
        disabled={isLoading}
        masterCvName={hasStoredMasterCV && masterCV ? (masterCV.personal.name || "Set") : null}
        recentApplications={recentApplications}
        cvFontSize={cvFontSize}
        cvFontWeight={cvFontWeight}
        cvTopMargin={cvTopMargin}
        cvBottomMargin={cvBottomMargin}
        onVersionChange={setSelectedVersion}
        onFontSizeChange={setCvFontSize}
        onFontWeightChange={setCvFontWeight}
        onTopMarginChange={setCvTopMargin}
        onBottomMarginChange={setCvBottomMargin}
        onImportClick={() => handleImportClick("working")}
        onExportClick={handleExport}
        onCopyPlainText={handleCopyPlainText}
        onResetClick={handleResetToMaster}
        onUpdateMaster={handleUpdateMaster}
        onSelectRecent={handleSelectRecent}
      />

      <MasterCvModal
        isOpen={showMasterModal}
        mode={masterModalMode}
        onImportClick={() => handleImportClick("master")}
        onUseCurrent={() => { void persistMasterCV(resume); }}
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
            cvFontWeight={cvFontWeight}
            cvTopMargin={cvTopMargin}
            cvBottomMargin={cvBottomMargin}
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
          <div className="no-print mt-4 flex flex-wrap items-start justify-center gap-3">
            <div className="group relative">
              <button
                type="button"
                onClick={downloadPDF}
                disabled={isLoading}
                className="flex min-h-[96px] w-[210px] flex-col items-start justify-center rounded-lg bg-slate-900 px-5 py-4 text-left text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <span className="text-sm font-bold">⬇ Download PDF</span>
                <span className="mt-1 text-xs font-semibold text-slate-200">For emailing</span>
                <span className="mt-0.5 text-xs text-slate-300">Two-column, photo</span>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl group-hover:block">
                Best for emailing recruiters directly. Looks professional, includes photo.
              </div>
            </div>

            <div className="group relative">
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300">
                Recommended for portals
              </span>
              <button
                type="button"
                onClick={handleDownloadATSPdf}
                disabled={isLoading}
                className="flex min-h-[96px] w-[210px] flex-col items-start justify-center rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-left text-amber-950 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-sm font-bold">⬇ Download ATS</span>
                <span className="mt-1 text-xs font-semibold text-amber-900">For job portals</span>
                <span className="mt-0.5 text-xs text-amber-800">Single-col, no photo</span>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl group-hover:block">
                Best for uploading to Workday, Greenhouse, Lever, SAP. Plain layout, no photo, maximum parser compatibility.
              </div>
            </div>

            {/* ── Copy plain text ── */}
            <button
              type="button"
              onClick={() => void handleCopyPlainText()}
              disabled={isLoading}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
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
          isEditLoading={isEditLoading}
          editSuccess={editSuccess}
          isRescoring={isRescoring}
          isSaveSuccess={isSaveSuccess}
          disabled={isLoading || isEditLoading}
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
          onApplyEdit={(instruction) => { void handleApplyEdit(instruction); }}
          onRescore={() => { void handleRescore(); }}
          onSaveApplication={handleSaveApplication}
        />
      </div>
    </div>
  );
}
