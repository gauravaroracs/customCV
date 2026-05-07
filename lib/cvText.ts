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
    cv.personal.linkedin,
    cv.personal.github,
    cv.personal.website
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
    section("SUMMARY", [cv.profile]),
    section("SKILLS", skills),
    section("EXPERIENCE", experience),
    section("EDUCATION", education),
    section("PROJECTS", projects),
    section("LANGUAGES", languages)
  ]
    .join("\n")
    .trim();
}

function compact(value: string, fallback = "") {
  return value.replace(/[^a-z0-9]+/gi, "").trim() || fallback;
}

function stripSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getATSFilename(cv: ResumeData, metadata: JobMetadata) {
  return `${compact(cv.personal.name, "CV")}_${compact(metadata.role, "Role")}_${compact(metadata.company, "Company")}_ATS.txt`;
}

export function getATSPdfFilename(cv: ResumeData, metadata: JobMetadata) {
  const name = compact(cv.personal.name) || "CV";
  const company = compact(metadata.company);
  return company ? `${name}_ATS_${company}.pdf` : `${name}_ATS.pdf`;
}

export function getATSPdfTitle(cv: ResumeData, metadata: JobMetadata) {
  const name = stripSpaces(cv.personal.name) || "CV";
  return metadata.company.trim() ? `${name} ATS ${metadata.company.trim()}` : `${name} ATS`;
}

/** Generate clean single-column ATS-safe HTML for print-to-PDF. */
export function generateATSHtml(cv: ResumeData): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const strip = (s: string) => s.replace(/\*\*/g, "").trim();
  const normalizeUrl = (url: string) =>
    /^https?:\/\//i.test(url) ? url : `https://${url}`;

  const contactLink = (value: string, label = value) =>
    value
      ? `<a href="${esc(normalizeUrl(value))}" style="color:#000;text-decoration:underline">${esc(label)}</a>`
      : "";

  const contact = [
    cv.personal.email ? `<a href="mailto:${esc(cv.personal.email)}" style="color:#000;text-decoration:underline">${esc(cv.personal.email)}</a>` : "",
    cv.personal.phone,
    cv.personal.location,
    contactLink(cv.personal.linkedin),
    contactLink(cv.personal.github),
    contactLink(cv.personal.website)
  ].filter(Boolean).join(" &middot; ");

  const skillsHtml = Object.entries(cv.skills)
    .map(([group, values]) =>
      `<p style="margin:3px 0"><strong>${esc(strip(group))}:</strong> ${esc(values.map(strip).join(", "))}</p>`
    ).join("");

  const expHtml = cv.experience.map(exp => {
    const bullets = exp.bullets.map(b =>
      `<li style="margin:2px 0">${esc(strip(b.replace(/^[\u2022\-*]\s*/, "")))}</li>`
    ).join("");
    return `
      <div style="margin-bottom:12px">
        <strong>${esc(strip(exp.role || ""))}</strong><br/>
        ${esc(strip(exp.company || ""))}${exp.location ? " | " + esc(strip(exp.location)) : ""}<br/>
        ${esc(strip(exp.dates || ""))}
        <ul style="margin:4px 0 0 16px;padding:0">${bullets}</ul>
      </div>`;
  }).join("");

  const projHtml = cv.projects.map(p => {
    const bullets = p.bullets.map(b =>
      `<li style="margin:2px 0">${esc(strip(b.replace(/^[\u2022\-*]\s*/, "")))}</li>`
    ).join("");
    return `
      <div style="margin-bottom:12px">
        <strong>${esc(strip(p.name || ""))}</strong>
        ${p.tech ? `<br/><em>${esc(strip(p.tech))}</em>` : ""}
        <ul style="margin:4px 0 0 16px;padding:0">${bullets}</ul>
      </div>`;
  }).join("");

  const eduHtml = cv.education.map(e => {
    const bullets = e.details.map(d =>
      `<li style="margin:2px 0">${esc(strip(d))}</li>`
    ).join("");
    return `
      <div style="margin-bottom:12px">
        <strong>${esc(strip(e.degree || ""))}</strong><br/>
        ${esc(strip(e.institution || ""))}${e.location ? " | " + esc(strip(e.location)) : ""}${e.dates ? " | " + esc(strip(e.dates)) : ""}
        ${bullets ? `<ul style="margin:4px 0 0 16px;padding:0">${bullets}</ul>` : ""}
      </div>`;
  }).join("");

  const langHtml = cv.languages
    .map(l => `${esc(strip(l.name))}: ${esc(strip(l.level))}`)
    .join(" | ");

  const hr = `<hr style="border:none;border-top:1px solid #000;margin:10px 0"/>`;

  const section = (title: string, body: string) =>
    `<section>${hr}<h2 style="font-size:13px;font-weight:bold;text-transform:uppercase;margin:6px 0;letter-spacing:0">${title}</h2>${body}</section>`;

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#000;background:none;width:100%">
  <h1 style="font-size:16px;font-weight:bold;text-align:center;margin:0 0 4px 0;letter-spacing:0">${esc(strip(cv.personal.name).toUpperCase())}</h1>
  <p style="text-align:center;font-size:11px;margin:0 0 4px 0">${contact}</p>
  ${cv.profile ? section("SUMMARY", `<p>${esc(strip(cv.profile))}</p>`) : ""}
  ${expHtml  ? section("EXPERIENCE", expHtml)  : ""}
  ${skillsHtml ? section("SKILLS",               skillsHtml) : ""}
  ${eduHtml  ? section("EDUCATION",               eduHtml)  : ""}
  ${projHtml ? section("PROJECTS",                projHtml) : ""}
  ${langHtml ? section("LANGUAGES",               `<p>${langHtml}</p>`) : ""}
</div>`;
}
