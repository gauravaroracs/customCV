"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AiPanel } from "@/components/AiPanel";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ResumePreview } from "@/components/ResumePreview";
import { Toolbar } from "@/components/Toolbar";
import { sampleResume } from "@/sampleResume";
import {
  ResumeData,
  ResumeSectionKey,
  RewriteRequest,
  RewriteResponse
} from "@/types/resume";

const STORAGE_KEY = "cvpilot-resume";
const VERSION_STORAGE_KEY = "cvpilot-version";

const versions = ["Java Backend Heavy", "General Tech", "Germany Targeted"];

const sectionLabels: Record<ResumeSectionKey, string> = {
  personal: "Personal Information",
  profile: "Profile",
  skills: "Skills",
  languages: "Languages",
  education: "Education",
  experience: "Professional Experience",
  projects: "Projects"
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

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resume, setResume] = useState<ResumeData>(sampleResume);
  const [selectedVersion, setSelectedVersion] = useState(versions[0]);
  const [selectedSection, setSelectedSection] = useState<ResumeSectionKey | null>("profile");
  const [openSections, setOpenSections] =
    useState<Record<ResumeSectionKey, boolean>>(defaultOpenSections);
  const [instruction, setInstruction] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [suggestion, setSuggestion] = useState<RewriteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedResume = window.localStorage.getItem(STORAGE_KEY);
    const storedVersion = window.localStorage.getItem(VERSION_STORAGE_KEY);

    if (storedResume) {
      try {
        setResume(JSON.parse(storedResume) as ResumeData);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (storedVersion && versions.includes(storedVersion)) {
      setSelectedVersion(storedVersion);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
    } catch {
      setError("The resume could not be fully saved in browser storage. Try a smaller photo.");
    }
  }, [isHydrated, resume]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(VERSION_STORAGE_KEY, selectedVersion);
  }, [isHydrated, selectedVersion]);

  const handleResumeChange = (nextResume: ResumeData) => {
    setResume(nextResume);
    setSuggestion(null);
    setError(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cvpilot-resume.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ResumeData;
      setResume(parsed);
      setSuggestion(null);
      setError(null);
    } catch {
      setError("The imported file is not valid resume JSON.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = () => {
    setResume(sampleResume);
    setSuggestion(null);
    setInstruction("");
    setJobDescription("");
    setError(null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleResume));
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      setError("Add an instruction before generating a suggestion.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: RewriteRequest = {
        fullResume: resume,
        selectedSectionKey: selectedSection,
        selectedSectionContent: selectedSection ? resume[selectedSection] : null,
        instruction: instruction.trim(),
        jobDescription: jobDescription.trim()
      };

      const response = await fetch("/api/rewrite-section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as RewriteResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "The AI request failed.");
      }

      setSuggestion(result);
    } catch (requestError) {
      setSuggestion(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The AI request failed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (!suggestion) {
      return;
    }

    setResume(suggestion.updatedResume);
    setSuggestion(null);
    setInstruction("");
    setError(null);
  };

  const handleReject = () => {
    setSuggestion(null);
    setError(null);
  };

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
      setSuggestion(null);
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
    setSuggestion(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Toolbar
        selectedVersion={selectedVersion}
        versions={versions}
        onVersionChange={setSelectedVersion}
        onImportClick={handleImportClick}
        onExportClick={handleExport}
        onPrintClick={() => window.print()}
        onResetClick={handleReset}
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
            onSelectSection={(key) => {
              setSelectedSection(key);
              setSuggestion(null);
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
          <ResumePreview resume={resume} />
        </div>

        <AiPanel
          selectedSection={selectedSection}
          selectedSectionLabel={
            selectedSection ? sectionLabels[selectedSection] : "No section selected"
          }
          instruction={instruction}
          jobDescription={jobDescription}
          suggestion={suggestion}
          isLoading={isLoading}
          error={error}
          onInstructionChange={setInstruction}
          onJobDescriptionChange={setJobDescription}
          onGenerate={handleGenerate}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
