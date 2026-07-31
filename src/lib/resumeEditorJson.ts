import { ResumeData } from "@/types/resume";

/** Strip bulky photo from JSON shown in editor; preview merges stored photo separately. */
export function resumeToEditorJson(resume: ResumeData): string {
  const clone: ResumeData = {
    ...resume,
    personal: { ...resume.personal, photoUrl: "" }
  };
  return `${JSON.stringify(clone, null, 2)}\n`;
}
