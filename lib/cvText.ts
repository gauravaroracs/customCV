import { JobMetadata, ResumeData } from "@/types/resume";

function normalizeSkill(skill: string) {
  return skill.replace(/\(([^)]+)\)/g, " - $1").replace(/\s+/g, " ").trim();
}

function section(title: string, lines: string[]) {
  return [title, "-".repeat(title.length), ...lines.filter(Boolean), ""].join("\n");
}

export function generateATSText(cv: ResumeData) {
  const personal = [
    cv.personal.name,
    cv.personal.email,
    cv.personal.phone,
    cv.personal.location,
    cv.personal.linkedin
  ];

  const skills = Object.entries(cv.skills).flatMap(([group, values]) => [
    `${group}:`,
    ...values.map((value) => `- ${normalizeSkill(value)}`)
  ]);

  const experience = cv.experience.flatMap((item) => [
    `${item.role} | ${item.company} | ${item.location} | ${item.dates}`,
    ...item.bullets.map((bullet) => `- ${bullet.replace(/^[•*-]\s*/, "")}`)
  ]);

  const projects = cv.projects.flatMap((item) => [
    `${item.name} | ${item.tech}`,
    ...item.bullets.map((bullet) => `- ${bullet.replace(/^[•*-]\s*/, "")}`)
  ]);

  const education = cv.education.flatMap((item) => [
    `${item.degree} | ${item.institution} | ${item.location} | ${item.dates}`,
    ...item.details.map((detail) => `- ${detail.replace(/^[•*-]\s*/, "")}`)
  ]);

  const languages = cv.languages.map((item) => `${item.name} - ${item.level}`);

  return [
    section("CONTACT", personal),
    section("PROFILE", [cv.profile]),
    section("SKILLS", skills),
    section("EXPERIENCE", experience),
    section("PROJECTS", projects),
    section("EDUCATION", education),
    section("LANGUAGES", languages)
  ]
    .join("\n")
    .trim();
}

function compact(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "").trim() || "Role";
}

export function getATSFilename(cv: ResumeData, metadata: JobMetadata) {
  return `${compact(cv.personal.name)}_${compact(metadata.role)}_${compact(metadata.company)}_ATS.txt`;
}
