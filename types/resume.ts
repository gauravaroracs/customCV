export type ResumeSectionKey =
  | "personal"
  | "profile"
  | "skills"
  | "languages"
  | "education"
  | "experience"
  | "projects";

export type LanguageItem = {
  name: string;
  level: string;
};

export type EducationItem = {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  details: string[];
};

export type ExperienceItem = {
  role: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
};

export type ProjectItem = {
  name: string;
  tech: string;
  bullets: string[];
};

export type ResumeData = {
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    photoUrl: string;
  };
  profile: string;
  skills: Record<string, string[]>;
  languages: LanguageItem[];
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
};

export type RewriteRequest = {
  fullResume: ResumeData;
  selectedSectionKey?: ResumeSectionKey | null;
  selectedSectionContent?: ResumeData[ResumeSectionKey] | null;
  instruction: string;
  jobDescription?: string;
};

export type RewriteResponse = {
  updatedResume: ResumeData;
  changedSections: ResumeSectionKey[];
  summaryOfChanges: string[];
  warnings: string[];
};
