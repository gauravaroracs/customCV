"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MasterCvModal } from "@/components/MasterCvModal";
import { CvChatPanel, type CvChatMessage } from "@/components/CvChatPanel";
import { ResumePreview } from "@/components/ResumePreview";
import { Toolbar } from "@/components/Toolbar";
import { generateATSText, generateATSHtml, getATSPdfTitle } from "@/lib/cvText";
import { resumeToEditorJson } from "@/lib/resumeEditorJson";
import { sampleResume } from "@/sampleResume";
import {
  JobMetadata,
  RecentApplication,
  ResumeData,
  TailorResponse
} from "@/types/resume";

const CvJsonEditor = dynamic(
  () => import("@/components/CvJsonEditor").then((mod) => ({ default: mod.CvJsonEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[1123px] min-h-[1123px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-500 shadow-panel">
        Loading editor…
      </div>
    )
  }
);

// ── Legacy localStorage keys used only for one-time migration fallback ──────
const LEGACY_STORAGE_KEY        = "cvpilot-resume";
const WORKING_CV_STORAGE_KEY    = "cvPilot_workingCV";
const MASTER_CV_STORAGE_KEY     = "cvPilot_masterCV";
const VERSION_STORAGE_KEY       = "cvpilot-version";
const RECENT_APPS_STORAGE_KEY   = "cvPilot_recent";
const FONT_SIZE_STORAGE_KEY     = "cvPilot_fontSize";
const FONT_WEIGHT_STORAGE_KEY   = "cvFontWeight";
const LINE_HEIGHT_STORAGE_KEY   = "cvPilot_lineHeight";
const SECTION_GAP_STORAGE_KEY   = "cvPilot_sectionGap";
const ATS_LINE_HEIGHT_STORAGE_KEY = "cvPilot_atsLineHeight";
const ATS_SECTION_GAP_STORAGE_KEY = "cvPilot_atsSectionGap";
const PHOTO_STORAGE_KEY         = "cvPilot_photo";
const ATS_PRINT_STYLE_ID        = "cvpilot-ats-print-style";

type CvPilotSettings = {
  selectedVersion?: string;
  cvFontSize?: string;
  cvFontWeight?: string;
  cvLineHeight?: string;
  cvSectionGap?: string;
  atsLineHeight?: string;
  atsSectionGap?: string;
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

function compactFilenamePart(value: string, fallback: string) {
  return value.replace(/[^a-z0-9]+/gi, "").trim() || fallback;
}

function withoutDownloadOnlyFields(cv: ResumeData): ResumeData {
  return {
    ...cv,
    personal: {
      ...cv.personal,
      photoUrl: ""
    }
  };
}

function parseStoredJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readBrowserStorage(): CvPilotStorageSnapshot {
  if (typeof window === "undefined") {
    return {};
  }

  const selectedVersion = window.localStorage.getItem(VERSION_STORAGE_KEY) ?? undefined;
  const cvFontSize =
    window.localStorage.getItem(FONT_SIZE_STORAGE_KEY) ??
    window.localStorage.getItem("cvFontSize") ??
    undefined;
  const cvFontWeight = window.localStorage.getItem(FONT_WEIGHT_STORAGE_KEY) ?? undefined;
  const cvLineHeight = window.localStorage.getItem(LINE_HEIGHT_STORAGE_KEY) ?? undefined;
  const cvSectionGap = window.localStorage.getItem(SECTION_GAP_STORAGE_KEY) ?? undefined;
  const atsLineHeight = window.localStorage.getItem(ATS_LINE_HEIGHT_STORAGE_KEY) ?? undefined;
  const atsSectionGap = window.localStorage.getItem(ATS_SECTION_GAP_STORAGE_KEY) ?? undefined;
  const cvTopMargin =
    window.localStorage.getItem("cvTopMargin") ??
    window.localStorage.getItem("cvPageMargin") ??
    undefined;
  const cvBottomMargin =
    window.localStorage.getItem("cvBottomMargin") ??
    window.localStorage.getItem("cvPageMargin") ??
    undefined;

  return {
    masterCV: parseStoredJson(
      window.localStorage.getItem(MASTER_CV_STORAGE_KEY) ?? window.localStorage.getItem("masterCV"),
      null
    ),
    workingCV: parseStoredJson(
      window.localStorage.getItem(WORKING_CV_STORAGE_KEY) ??
        window.localStorage.getItem("cvpilot-working-cv") ??
        window.localStorage.getItem(LEGACY_STORAGE_KEY),
      null
    ),
    recentApplications: parseStoredJson(
      window.localStorage.getItem(RECENT_APPS_STORAGE_KEY) ?? window.localStorage.getItem("recentApps"),
      []
    ),
    photo:
      window.localStorage.getItem(PHOTO_STORAGE_KEY) ??
      window.localStorage.getItem("cvPhoto") ??
      "",
    settings: {
      selectedVersion,
      cvFontSize,
      cvFontWeight,
      cvLineHeight,
      cvSectionGap,
      atsLineHeight,
      atsSectionGap,
      cvTopMargin,
      cvBottomMargin
    }
  };
}

function patchBrowserStorage(payload: CvPilotStorageSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  if ("masterCV" in payload) {
    window.localStorage.setItem(MASTER_CV_STORAGE_KEY, JSON.stringify(payload.masterCV ?? null));
  }

  if ("workingCV" in payload) {
    window.localStorage.setItem(WORKING_CV_STORAGE_KEY, JSON.stringify(payload.workingCV ?? null));
  }

  if ("recentApplications" in payload) {
    window.localStorage.setItem(
      RECENT_APPS_STORAGE_KEY,
      JSON.stringify(payload.recentApplications ?? [])
    );
  }

  if ("photo" in payload) {
    window.localStorage.setItem(PHOTO_STORAGE_KEY, payload.photo ?? "");
  }

  if (payload.settings) {
    const {
      selectedVersion,
      cvFontSize,
      cvFontWeight,
      cvLineHeight,
      cvSectionGap,
      atsLineHeight,
      atsSectionGap,
      cvTopMargin,
      cvBottomMargin
    } = payload.settings;

    if (selectedVersion) {
      window.localStorage.setItem(VERSION_STORAGE_KEY, selectedVersion);
    }

    if (cvFontSize) {
      window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, cvFontSize);
    }

    if (cvFontWeight) {
      window.localStorage.setItem(FONT_WEIGHT_STORAGE_KEY, cvFontWeight);
    }

    if (cvLineHeight) {
      window.localStorage.setItem(LINE_HEIGHT_STORAGE_KEY, cvLineHeight);
    }

    if (cvSectionGap) {
      window.localStorage.setItem(SECTION_GAP_STORAGE_KEY, cvSectionGap);
    }

    if (atsLineHeight) {
      window.localStorage.setItem(ATS_LINE_HEIGHT_STORAGE_KEY, atsLineHeight);
    }

    if (atsSectionGap) {
      window.localStorage.setItem(ATS_SECTION_GAP_STORAGE_KEY, atsSectionGap);
    }

    if (cvTopMargin) {
      window.localStorage.setItem("cvTopMargin", cvTopMargin);
    }

    if (cvBottomMargin) {
      window.localStorage.setItem("cvBottomMargin", cvBottomMargin);
    }
  }
}

async function readRepoStorage(signal?: AbortSignal): Promise<CvPilotStorageSnapshot> {
  let response: Response;

  try {
    response = await fetch("/api/cvpilot-storage", {
      cache: "no-store",
      ...(signal ? { signal } : {})
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    return readBrowserStorage();
  }

  if (!response.ok) {
    return readBrowserStorage();
  }

  return response.json() as Promise<CvPilotStorageSnapshot>;
}

async function patchRepoStorage(payload: CvPilotStorageSnapshot) {
  patchBrowserStorage(payload);

  let response: Response;

  try {
    response = await fetch("/api/cvpilot-storage", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    return;
  }

  if (!response.ok) {
    return;
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
      github:
        typeof personal.github === "string"
          ? personal.github
          : sampleResume.personal.github,
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
    awards: Array.isArray(source.awards)
      ? source.awards.map((item) => {
          const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            title: String(entry.title ?? ""),
            event: String(entry.event ?? ""),
            organizer: String(entry.organizer ?? ""),
            date: String(entry.date ?? ""),
            description: String(entry.description ?? "")
          };
        })
      : sampleResume.awards,
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

function getResumeSyncSignature(cv: ResumeData) {
  return JSON.stringify({
    personal: {
      name: cv.personal.name,
      email: cv.personal.email,
      phone: cv.personal.phone,
      location: cv.personal.location,
      linkedin: cv.personal.linkedin,
      website: cv.personal.website,
      github: cv.personal.github
    },
    profile: cv.profile,
    skills: cv.skills,
    languages: cv.languages,
    education: cv.education,
    awards: cv.awards,
    experience: cv.experience,
    projects: cv.projects
  });
}

function isFraunhoferNlpResume(cv: ResumeData) {
  const text = getResumeSyncSignature(cv).toLowerCase();
  return (
    text.includes("fraunhofer sit") ||
    text.includes("introduction to large language models") ||
    text.includes("ai / ml / nlp")
  );
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
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const generateShortcutRef = useRef<(() => void) | null>(null);
  const handleCvChatSendRef = useRef<() => Promise<void>>(async () => {});
  const copyShortcutRef = useRef<(() => Promise<void>) | null>(null);
  const downloadPdfRef = useRef<(() => void) | null>(null);
  const storedPhotoRef = useRef("");
  const resumeRef = useRef<ResumeData>(sampleResume);
  const loadGenerationRef = useRef(0);
  const importTargetRef = useRef<"working" | "master">("working");
  const [resume, setResume] = useState<ResumeData>(sampleResume);
  resumeRef.current = resume;
  const [masterCV, setMasterCV] = useState<ResumeData | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(versions[0]);
  const [editorSyncNonce, setEditorSyncNonce] = useState(0);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [cvChatMessages, setCvChatMessages] = useState<CvChatMessage[]>([]);
  const [cvChatDraft, setCvChatDraft] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [jobMetadata, setJobMetadata] = useState<JobMetadata>(emptyMetadata);
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterModalMode, setMasterModalMode] = useState<"setup" | "update">("setup");
  const [hasStoredMasterCV, setHasStoredMasterCV] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [cvFontSize, setCvFontSize] = useState("9.5px");
  const [cvFontWeight, setCvFontWeight] = useState("400");
  const [cvLineHeight, setCvLineHeight] = useState("1.6");
  const [cvSectionGap, setCvSectionGap] = useState("14");
  const [atsLineHeight, setAtsLineHeight] = useState("1.25");
  const [atsSectionGap, setAtsSectionGap] = useState("7");
  const [cvTopMargin, setCvTopMargin] = useState("12px");
  const [cvBottomMargin, setCvBottomMargin] = useState("12px");
  const [previewOverflowAmount, setPreviewOverflowAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRescoring, setIsRescoring] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [applicationElapsedMs, setApplicationElapsedMs] = useState(0);
  const [applicationTimerStartedAt, setApplicationTimerStartedAt] = useState<number | null>(null);

  const bumpEditorSync = useCallback(() => {
    setEditorSyncNonce((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (applicationTimerStartedAt === null) {
      return;
    }

    const interval = window.setInterval(() => {
      setApplicationElapsedMs(Date.now() - applicationTimerStartedAt);
    }, 250);

    return () => window.clearInterval(interval);
  }, [applicationTimerStartedAt]);

  useLayoutEffect(() => {
    if (!isHydrated) {
      return;
    }

    setJsonDraft(resumeToEditorJson(resumeRef.current));
    setJsonError(null);
  }, [editorSyncNonce, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !jsonDraft.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        const parsed = normalizeResumeInput(JSON.parse(jsonDraft));
        const merged = withStoredPhoto(parsed, storedPhotoRef.current);
        setResume(merged);
        setJsonError(null);
      } catch {
        setJsonError("Invalid JSON");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [jsonDraft, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let isCancelled = false;
    let interval: number | undefined;
    let attempts = 0;

    const syncFromRepoStorage = async () => {
      try {
        attempts += 1;
        const repoStorage = await readRepoStorage();
        if (isCancelled || !repoStorage.workingCV) {
          return;
        }

        const serverResume = withStoredPhoto(
          normalizeResumeInput(repoStorage.workingCV),
          storedPhotoRef.current
        );
        const currentResume = resumeRef.current;

        if (
          isFraunhoferNlpResume(serverResume) &&
          getResumeSyncSignature(serverResume) !== getResumeSyncSignature(currentResume)
        ) {
          setResume(serverResume);
          setJsonDraft(resumeToEditorJson(serverResume));
          setJsonError(null);
          if (interval) {
            window.clearInterval(interval);
          }
        } else if (isFraunhoferNlpResume(serverResume) || attempts >= 20) {
          if (interval) {
            window.clearInterval(interval);
          }
        }
      } catch {
        // Keep local editing responsive if a background reconciliation request fails.
        if (attempts >= 20 && interval) {
          window.clearInterval(interval);
        }
      }
    };

    void syncFromRepoStorage();
    interval = window.setInterval(() => {
      void syncFromRepoStorage();
    }, 1500);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [isHydrated]);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;
    const abortController = new AbortController();
    const failsafeId = window.setTimeout(() => {
      if (loadGenerationRef.current !== generation) {
        return;
      }

      setIsHydrated(true);
      setError(
        (previous) =>
          previous ??
          "Timed out loading CV storage — check that `npm run dev` is running and refresh."
      );
      setMasterModalMode("setup");
      setShowMasterModal(true);
    }, 15_000);

    const loadStoredState = async () => {
      try {
        const repoStorage = await readRepoStorage(abortController.signal);
        if (loadGenerationRef.current !== generation) {
          return;
        }
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
        const nextLineHeight = repoSettings.cvLineHeight ?? window.localStorage.getItem(LINE_HEIGHT_STORAGE_KEY) ?? undefined;
        const nextSectionGap = repoSettings.cvSectionGap ?? window.localStorage.getItem(SECTION_GAP_STORAGE_KEY) ?? undefined;
        const nextAtsLineHeight =
          repoSettings.atsLineHeight ??
          window.localStorage.getItem(ATS_LINE_HEIGHT_STORAGE_KEY) ??
          undefined;
        const nextAtsSectionGap =
          repoSettings.atsSectionGap ??
          window.localStorage.getItem(ATS_SECTION_GAP_STORAGE_KEY) ??
          undefined;
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

        if (nextLineHeight) {
          setCvLineHeight(nextLineHeight);
        }

        if (nextSectionGap) {
          setCvSectionGap(nextSectionGap);
        }

        if (nextAtsLineHeight) {
          setAtsLineHeight(nextAtsLineHeight);
        }

        if (nextAtsSectionGap) {
          setAtsSectionGap(nextAtsSectionGap);
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
              cvLineHeight: nextLineHeight,
              cvSectionGap: nextSectionGap,
              atsLineHeight: nextAtsLineHeight,
              atsSectionGap: nextAtsSectionGap,
              cvTopMargin: nextTopMargin,
              cvBottomMargin: nextBottomMargin
            }
          });
        }
      } catch (storageError) {
        if (loadGenerationRef.current !== generation) {
          return;
        }

        setError(storageError instanceof Error ? storageError.message : "Could not load saved CVPilot data.");
        setMasterModalMode("setup");
        setShowMasterModal(true);
        setIsHydrated(true);
      } finally {
        window.clearTimeout(failsafeId);
      }
    };

    void loadStoredState();

    return () => {
      abortController.abort();
      window.clearTimeout(failsafeId);
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

    void patchRepoStorage({ settings: { cvLineHeight } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The line spacing preference could not be saved.");
    });
  }, [cvLineHeight, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { cvSectionGap } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The section spacing preference could not be saved.");
    });
  }, [cvSectionGap, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { atsLineHeight } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The ATS line spacing preference could not be saved.");
    });
  }, [atsLineHeight, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void patchRepoStorage({ settings: { atsSectionGap } }).catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "The ATS section spacing preference could not be saved.");
    });
  }, [atsSectionGap, isHydrated]);

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
    bumpEditorSync();
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

  const handleExport = () => {
    downloadResumeJson();
  };

  const getResumeJsonFilename = useCallback(() => {
    const name = compactFilenamePart(resume.personal.name, "CV");
    const company = compactFilenamePart(jobMetadata.company, "");
    const role = compactFilenamePart(jobMetadata.role, "");
    const context = [company, role].filter(Boolean).join("_");

    return context ? `${name}_${context}.json` : `${name}_CV.json`;
  }, [jobMetadata.company, jobMetadata.role, resume.personal.name]);

  const downloadResumeJson = useCallback(() => {
    downloadTextFile(
      JSON.stringify(withoutDownloadOnlyFields(resume), null, 2),
      getResumeJsonFilename(),
      "application/json"
    );
  }, [getResumeJsonFilename, resume]);

  const handleToggleApplicationTimer = useCallback(() => {
    setApplicationTimerStartedAt((currentStartedAt) => {
      if (currentStartedAt !== null) {
        setApplicationElapsedMs(Date.now() - currentStartedAt);
        return null;
      }

      return Date.now() - applicationElapsedMs;
    });
  }, [applicationElapsedMs]);

  const handleResetApplicationTimer = useCallback(() => {
    setApplicationTimerStartedAt(null);
    setApplicationElapsedMs(0);
  }, []);

  const handleImportClick = (target: "working" | "master" = "working") => {
    importTargetRef.current = target;
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

      if (importTargetRef.current === "master") {
        await persistMasterCV(parsed);
      } else {
        setResume(parsed);
        bumpEditorSync();
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
      bumpEditorSync();
      setResult(null);
      setError(null);
      return;
    }

    setResume(masterCV);
    bumpEditorSync();
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

  const handleCvChatSend = useCallback(async () => {
    if (isChatLoading) {
      return;
    }

    const text = cvChatDraft.trim();
    if (!text) {
      return;
    }

    const userMessage: CvChatMessage = { role: "user", content: text };
    const transcript = [...cvChatMessages, userMessage];

    setCvChatDraft("");
    setCvChatMessages(transcript);
    setIsChatLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cv-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume,
          jobDescription: jobDescription.trim() || undefined,
          messages: transcript.map((message) => ({ role: message.role, content: message.content }))
        })
      });

      const parsed = (await response.json()) as {
        assistantMessage?: string;
        resume?: ResumeData;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(parsed.error ?? "Chat failed.");
      }

      if (!parsed.resume || typeof parsed.resume !== "object") {
        throw new Error("Model did not return a valid resume.");
      }

      const merged = withStoredPhoto(normalizeResumeInput(parsed.resume), storedPhotoRef.current);
      setResume(merged);
      setCvChatMessages([
        ...transcript,
        {
          role: "assistant",
          content:
            typeof parsed.assistantMessage === "string"
              ? parsed.assistantMessage
              : "Updated your CV JSON."
        }
      ]);
      setResult(null);
      bumpEditorSync();
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Chat failed.");
    } finally {
      setIsChatLoading(false);
    }
  }, [
    bumpEditorSync,
    cvChatDraft,
    cvChatMessages,
    isChatLoading,
    jobDescription,
    resume
  ]);

  const handleSelectRecent = (timestamp: string) => {
    const selectedApplication = recentApplications.find((item) => item.timestamp === timestamp);
    if (!selectedApplication) {
      return;
    }

    setResume(withStoredPhoto(selectedApplication.tailoredCV, storedPhotoRef.current));
    bumpEditorSync();
    setJobDescription(selectedApplication.jdSnapshot);
    setJobMetadata({
      company: selectedApplication.company,
      role: selectedApplication.role,
      location: selectedApplication.location
    });
    setResult(null);
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

  handleCvChatSendRef.current = handleCvChatSend;
  generateShortcutRef.current = () => {
    void handleCvChatSendRef.current();
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
        if (!isChatLoading) {
          generateShortcutRef.current?.();
        }
      }

      if (hasModifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (!isChatLoading) {
          void downloadPdfRef.current?.();
        }
      }

      if (hasModifier && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (!isChatLoading) {
          void copyShortcutRef.current?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatLoading]);

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

  const handlePhotoInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handlePhotoUpload(file);
    event.target.value = "";
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
  const atsHtml = generateATSHtml(resume, {
    lineHeight: atsLineHeight,
    sectionGap: atsSectionGap
  });

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
        disabled={!isHydrated || isChatLoading}
        masterCvName={hasStoredMasterCV && masterCV ? (masterCV.personal.name || "Set") : null}
        recentApplications={recentApplications}
        applicationElapsedMs={applicationElapsedMs}
        isApplicationTimerRunning={applicationTimerStartedAt !== null}
        hasPhoto={Boolean(resume.personal.photoUrl)}
        cvFontSize={cvFontSize}
        cvFontWeight={cvFontWeight}
        cvLineHeight={cvLineHeight}
        cvSectionGap={cvSectionGap}
        atsLineHeight={atsLineHeight}
        atsSectionGap={atsSectionGap}
        cvTopMargin={cvTopMargin}
        cvBottomMargin={cvBottomMargin}
        onVersionChange={setSelectedVersion}
        onFontSizeChange={setCvFontSize}
        onFontWeightChange={setCvFontWeight}
        onLineHeightChange={setCvLineHeight}
        onSectionGapChange={setCvSectionGap}
        onAtsLineHeightChange={setAtsLineHeight}
        onAtsSectionGapChange={setAtsSectionGap}
        onTopMarginChange={setCvTopMargin}
        onBottomMarginChange={setCvBottomMargin}
        onImportClick={() => handleImportClick("working")}
        onExportClick={handleExport}
        onCopyPlainText={handleCopyPlainText}
        onResetClick={handleResetToMaster}
        onUpdateMaster={handleUpdateMaster}
        onSelectRecent={handleSelectRecent}
        onToggleApplicationTimer={handleToggleApplicationTimer}
        onResetApplicationTimer={handleResetApplicationTimer}
        onPickPhoto={() => photoInputRef.current?.click()}
        onRemovePhoto={handlePhotoRemove}
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

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          void handlePhotoInputChange(event);
        }}
        className="hidden"
      />

      <div className="mx-auto max-w-[1800px] space-y-6 px-5 py-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
          <div className="no-print min-w-0">
            {isHydrated ? (
              <CvJsonEditor value={jsonDraft} onChange={setJsonDraft} jsonError={jsonError} />
            ) : (
              <div className="flex h-[1123px] min-h-[1123px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-panel">
                Loading CV…
              </div>
            )}
          </div>

          <div className="min-w-0 overflow-x-auto">
            <div className="no-print mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
              Save as PDF → Margins: None → Background graphics: ON → Save
            </div>
            <ResumePreview
              resume={resume}
              isLoading={isChatLoading}
              cvFontSize={cvFontSize}
              cvFontWeight={cvFontWeight}
              cvLineHeight={cvLineHeight}
              cvSectionGap={cvSectionGap}
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
                  disabled={isChatLoading}
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
                  disabled={isChatLoading}
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

              <button
                type="button"
                onClick={() => void handleCopyPlainText()}
                disabled={isChatLoading}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ⧉ Copy plain text
              </button>
            </div>
          </div>
        </div>

        <CvChatPanel
          messages={cvChatMessages}
          jobDescription={jobDescription}
          metadata={jobMetadata}
          draft={cvChatDraft}
          isLoading={isChatLoading}
          isScoring={isRescoring}
          isSaveSuccess={isSaveSuccess}
          error={error}
          onDraftChange={setCvChatDraft}
          onJobDescriptionChange={setJobDescription}
          onJobDescriptionPaste={(value) => {
            void handleExtractMetadata(value);
          }}
          onMetadataChange={(key, value) =>
            setJobMetadata((current) => ({ ...current, [key]: value }))
          }
          onSend={() => {
            void handleCvChatSend();
          }}
          onScore={() => {
            void handleRescore();
          }}
          onSaveApplication={handleSaveApplication}
        />
      </div>
    </div>
  );
}
