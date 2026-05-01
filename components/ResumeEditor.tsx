"use client";

import { ResumeData, ResumeSectionKey } from "@/types/resume";
import { SectionCard } from "@/components/SectionCard";

type ResumeEditorProps = {
  resume: ResumeData;
  selectedSection: ResumeSectionKey | null;
  openSections: Record<ResumeSectionKey, boolean>;
  onSelectSection: (key: ResumeSectionKey) => void;
  onToggleSection: (key: ResumeSectionKey) => void;
  onResumeChange: (resume: ResumeData) => void;
  onPhotoUpload: (file: File) => void;
  onPhotoRemove: () => void;
};

function updateArrayItem<T>(items: T[], index: number, updater: (item: T) => T) {
  return items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item));
}

function fieldClassName(selected: boolean) {
  return `w-full rounded-2xl border px-3 py-2 text-sm text-slate-700 outline-none transition ${
    selected
      ? "border-blue-200 bg-blue-50/40 focus:border-blue-400"
      : "border-slate-200 bg-slate-50/60 focus:border-slate-300"
  }`;
}

export function ResumeEditor({
  resume,
  selectedSection,
  openSections,
  onSelectSection,
  onToggleSection,
  onResumeChange,
  onPhotoUpload,
  onPhotoRemove
}: ResumeEditorProps) {
  const updateResume = <K extends ResumeSectionKey>(key: K, value: ResumeData[K]) => {
    onResumeChange({ ...resume, [key]: value });
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Personal Information"
        description="Identity, contact details, and profile photo."
        isSelected={selectedSection === "personal"}
        isOpen={openSections.personal}
        onSelect={() => onSelectSection("personal")}
        onToggle={() => onToggleSection("personal")}
      >
        <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center gap-4">
            {resume.personal.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resume.personal.photoUrl}
                alt={resume.personal.name}
                className="h-20 w-20 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-xs font-semibold uppercase tracking-wide text-slate-400">
                No Photo
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onPhotoUpload(file);
                    }
                    event.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={onPhotoRemove}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Remove photo
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["linkedin", "LinkedIn"]
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </span>
              <input
                value={resume.personal[key]}
                onChange={(event) =>
                  updateResume("personal", {
                    ...resume.personal,
                    [key]: event.target.value
                  })
                }
                className={fieldClassName(selectedSection === "personal")}
              />
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Profile"
        description="Your top-level positioning statement."
        isSelected={selectedSection === "profile"}
        isOpen={openSections.profile}
        onSelect={() => onSelectSection("profile")}
        onToggle={() => onToggleSection("profile")}
      >
        <textarea
          value={resume.profile}
          onChange={(event) => updateResume("profile", event.target.value)}
          rows={6}
          className={fieldClassName(selectedSection === "profile")}
        />
      </SectionCard>

      <SectionCard
        title="Skills"
        description="Grouped keywords and capability clusters."
        isSelected={selectedSection === "skills"}
        isOpen={openSections.skills}
        onSelect={() => onSelectSection("skills")}
        onToggle={() => onToggleSection("skills")}
      >
        <div className="space-y-4">
          {Object.entries(resume.skills).map(([groupName, values]) => (
            <div key={groupName} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <input
                value={groupName}
                readOnly
                className="mb-3 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
              />
              <textarea
                value={values.join(", ")}
                onChange={(event) => {
                  const updatedSkills = { ...resume.skills };
                  updatedSkills[groupName] = event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean);
                  updateResume("skills", updatedSkills);
                }}
                rows={3}
                className={fieldClassName(selectedSection === "skills")}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Languages"
        description="Language proficiency in a compact list."
        isSelected={selectedSection === "languages"}
        isOpen={openSections.languages}
        onSelect={() => onSelectSection("languages")}
        onToggle={() => onToggleSection("languages")}
      >
        <div className="space-y-3">
          {resume.languages.map((language, index) => (
            <div key={`${language.name}-${index}`} className="grid grid-cols-2 gap-3">
              <input
                value={language.name}
                onChange={(event) =>
                  updateResume(
                    "languages",
                    updateArrayItem(resume.languages, index, (item) => ({
                      ...item,
                      name: event.target.value
                    }))
                  )
                }
                className={fieldClassName(selectedSection === "languages")}
              />
              <input
                value={language.level}
                onChange={(event) =>
                  updateResume(
                    "languages",
                    updateArrayItem(resume.languages, index, (item) => ({
                      ...item,
                      level: event.target.value
                    }))
                  )
                }
                className={fieldClassName(selectedSection === "languages")}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Education"
        description="Degrees, dates, locations, and supporting details."
        isSelected={selectedSection === "education"}
        isOpen={openSections.education}
        onSelect={() => onSelectSection("education")}
        onToggle={() => onToggleSection("education")}
      >
        <div className="space-y-4">
          {resume.education.map((item, index) => (
            <div key={`${item.institution}-${index}`} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <input
                value={item.degree}
                onChange={(event) =>
                  updateResume(
                    "education",
                    updateArrayItem(resume.education, index, (entry) => ({
                      ...entry,
                      degree: event.target.value
                    }))
                  )
                }
                className={fieldClassName(selectedSection === "education")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={item.institution}
                  onChange={(event) =>
                    updateResume(
                      "education",
                      updateArrayItem(resume.education, index, (entry) => ({
                        ...entry,
                        institution: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "education")}
                />
                <input
                  value={item.location}
                  onChange={(event) =>
                    updateResume(
                      "education",
                      updateArrayItem(resume.education, index, (entry) => ({
                        ...entry,
                        location: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "education")}
                />
              </div>
              <input
                value={item.dates}
                onChange={(event) =>
                  updateResume(
                    "education",
                    updateArrayItem(resume.education, index, (entry) => ({
                      ...entry,
                      dates: event.target.value
                    }))
                  )
                }
                className={fieldClassName(selectedSection === "education")}
              />
              <textarea
                value={item.details.join("\n")}
                onChange={(event) =>
                  updateResume(
                    "education",
                    updateArrayItem(resume.education, index, (entry) => ({
                      ...entry,
                      details: event.target.value
                        .split("\n")
                        .map((detail) => detail.trim())
                        .filter(Boolean)
                    }))
                  )
                }
                rows={3}
                className={fieldClassName(selectedSection === "education")}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Professional Experience"
        description="Core work history and impact bullets."
        isSelected={selectedSection === "experience"}
        isOpen={openSections.experience}
        onSelect={() => onSelectSection("experience")}
        onToggle={() => onToggleSection("experience")}
      >
        <div className="space-y-4">
          {resume.experience.map((item, index) => (
            <div key={`${item.company}-${index}`} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={item.role}
                  onChange={(event) =>
                    updateResume(
                      "experience",
                      updateArrayItem(resume.experience, index, (entry) => ({
                        ...entry,
                        role: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "experience")}
                />
                <input
                  value={item.company}
                  onChange={(event) =>
                    updateResume(
                      "experience",
                      updateArrayItem(resume.experience, index, (entry) => ({
                        ...entry,
                        company: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "experience")}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={item.location}
                  onChange={(event) =>
                    updateResume(
                      "experience",
                      updateArrayItem(resume.experience, index, (entry) => ({
                        ...entry,
                        location: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "experience")}
                />
                <input
                  value={item.dates}
                  onChange={(event) =>
                    updateResume(
                      "experience",
                      updateArrayItem(resume.experience, index, (entry) => ({
                        ...entry,
                        dates: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "experience")}
                />
              </div>
              <textarea
                value={item.bullets.join("\n")}
                onChange={(event) =>
                  updateResume(
                    "experience",
                    updateArrayItem(resume.experience, index, (entry) => ({
                      ...entry,
                      bullets: event.target.value
                        .split("\n")
                        .map((bullet) => bullet.trim())
                        .filter(Boolean)
                    }))
                  )
                }
                rows={5}
                className={fieldClassName(selectedSection === "experience")}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Projects"
        description="Selected projects with tech context and proof."
        isSelected={selectedSection === "projects"}
        isOpen={openSections.projects}
        onSelect={() => onSelectSection("projects")}
        onToggle={() => onToggleSection("projects")}
      >
        <div className="space-y-4">
          {resume.projects.map((item, index) => (
            <div key={`${item.name}-${index}`} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={item.name}
                  onChange={(event) =>
                    updateResume(
                      "projects",
                      updateArrayItem(resume.projects, index, (entry) => ({
                        ...entry,
                        name: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "projects")}
                />
                <input
                  value={item.tech}
                  onChange={(event) =>
                    updateResume(
                      "projects",
                      updateArrayItem(resume.projects, index, (entry) => ({
                        ...entry,
                        tech: event.target.value
                      }))
                    )
                  }
                  className={fieldClassName(selectedSection === "projects")}
                />
              </div>
              <textarea
                value={item.bullets.join("\n")}
                onChange={(event) =>
                  updateResume(
                    "projects",
                    updateArrayItem(resume.projects, index, (entry) => ({
                      ...entry,
                      bullets: event.target.value
                        .split("\n")
                        .map((bullet) => bullet.trim())
                        .filter(Boolean)
                    }))
                  )
                }
                rows={4}
                className={fieldClassName(selectedSection === "projects")}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
