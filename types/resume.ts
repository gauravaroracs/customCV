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
    website: string;
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

export type JobMetadata = {
  company: string;
  role: string;
  location: string;
};

export type TailorRequest = {
  masterCV: ResumeData;
  jobDescription: string;
};

export type MatchBreakdown = {
  keywords: number;
  experience: number;
  skills: number;
  overall: number;
};

export type TailorResponse = {
  tailoredCV: ResumeData;
  changes: string[];
  warnings: string[];
  matchScore: number;
  matchBreakdown: MatchBreakdown;
};

/** Discrete JD-driven patch for review before merging into the working CV */
export type CvProposalPatchType =
  | "profile"
  | "skills"
  | "experience_bullets"
  | "projects_list"
  | "languages";

export type CvSkillGroupPatch = {
  groupName: string;
  items: string[];
};

export type CvEditProposal = {
  id: string;
  title: string;
  rationale: string;
  patchType: CvProposalPatchType;
  /** Short excerpt of current content this replaces (may be empty if additive) */
  beforeSummary: string;
  profileText: string;
  /** Match substring against role or company (case-insensitive) */
  experienceRoleHint: string;
  experienceBullets: string[];
  projectItems: ProjectItem[];
  languageItems: LanguageItem[];
  skillGroups: CvSkillGroupPatch[];
};

export type ProposeEditsRequest = {
  baseCV: ResumeData;
  jobDescription: string;
  /** Optional user steer e.g. "keep internship short", "emphasize Kubernetes" */
  userNotes?: string;
};

export type ProposeEditsResponse = {
  coachingSummary: string;
  proposals: CvEditProposal[];
  warnings: string[];
};

export type RecentApplication = JobMetadata & {
  id: number;
  timestamp: string;
  tailoredCV: ResumeData;
  matchScore: number;
  jdSnapshot: string;
};
