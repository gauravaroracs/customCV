import { JobMetadata, ResumeData } from "@/types/resume";

export type ATSLayoutOptions = {
  lineHeight?: string;
  sectionGap?: string;
};

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

  const awards = cv.awards.flatMap((item) => [
    `${item.title} | ${item.event} | ${item.organizer} | ${item.date}`,
    item.description ? `- ${item.description.replace(/^[•*-]\s*/, "")}` : ""
  ]);

  const languages = cv.languages.map((item) => `${item.name} - ${item.level}`);

  return [
    section("CONTACT", personal),
    section("SUMMARY", [cv.profile]),
    section("EXPERIENCE", experience),
    section("EDUCATION", education),
    section("AWARDS", awards),
    section("SKILLS", skills),
    section("LANGUAGES", languages),
    section("PROJECTS", projects)
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
export function generateATSHtml(cv: ResumeData, options: ATSLayoutOptions = {}): string {
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

  const lineHeight = options.lineHeight ?? "1.25";
  const sectionGap = Number(options.sectionGap ?? "7");
  const sectionHeadingGap = Math.max(2, Math.round(sectionGap * 0.45));
  const dividerTopGap = Math.max(4, Math.round(sectionGap * 0.85));
  const dividerBottomGap = Math.max(3, Math.round(sectionGap * 0.55));
  const listTopGap = Math.max(2, Math.round(sectionGap * 0.3));

  const skillsHtml = Object.entries(cv.skills)
    .map(([group, values]) =>
      `<p style="margin:2px 0"><strong>${esc(strip(group))}:</strong> ${esc(values.map(strip).join(", "))}</p>`
    ).join("");

  const expHtml = cv.experience.map(exp => {
    const bullets = exp.bullets.map(b =>
      `<li style="margin:1px 0">${esc(strip(b.replace(/^[\u2022\-*]\s*/, "")))}</li>`
    ).join("");
    return `
      <div style="margin-bottom:${sectionGap}px">
        <strong>${esc(strip(exp.role || ""))}</strong><br/>
        ${esc(strip(exp.company || ""))}${exp.location ? " | " + esc(strip(exp.location)) : ""}<br/>
        ${esc(strip(exp.dates || ""))}
        <ul style="margin:${listTopGap}px 0 0 16px;padding:0">${bullets}</ul>
      </div>`;
  }).join("");

  const projHtml = cv.projects.map(p => {
    const bullets = p.bullets.map(b =>
      `<li style="margin:1px 0">${esc(strip(b.replace(/^[\u2022\-*]\s*/, "")))}</li>`
    ).join("");
    return `
      <div style="margin-bottom:${sectionGap}px">
        <strong>${esc(strip(p.name || ""))}</strong>
        ${p.tech ? `<br/><em>${esc(strip(p.tech))}</em>` : ""}
        <ul style="margin:${listTopGap}px 0 0 16px;padding:0">${bullets}</ul>
      </div>`;
  }).join("");

  const eduHtml = cv.education.map(e => {
    const bullets = e.details.map(d =>
      `<li style="margin:1px 0">${esc(strip(d))}</li>`
    ).join("");
    return `
      <div style="margin-bottom:${sectionGap}px">
        <strong>${esc(strip(e.degree || ""))}</strong><br/>
        ${esc(strip(e.institution || ""))}${e.location ? " | " + esc(strip(e.location)) : ""}${e.dates ? " | " + esc(strip(e.dates)) : ""}
        ${bullets ? `<ul style="margin:${listTopGap}px 0 0 16px;padding:0">${bullets}</ul>` : ""}
      </div>`;
  }).join("");

  const awardsHtml = cv.awards.map(award => `
      <div style="margin-bottom:${sectionGap}px">
        <strong>${esc(strip(award.title || ""))}</strong><br/>
        ${esc(strip(award.event || ""))}${award.organizer ? " | " + esc(strip(award.organizer)) : ""}${award.date ? " | " + esc(strip(award.date)) : ""}
        ${award.description ? `<p style="margin:${listTopGap}px 0 0 0">${esc(strip(award.description))}</p>` : ""}
      </div>`
  ).join("");

  const langHtml = cv.languages
    .map(l => `${esc(strip(l.name))}: ${esc(strip(l.level))}`)
    .join(" | ");

  const hr = `<hr style="border:none;border-top:1px solid #000;margin:${dividerTopGap}px 0 ${dividerBottomGap}px"/>`;

  const section = (title: string, body: string) =>
    `<section>${hr}<h2 style="font-size:12px;font-weight:bold;text-transform:uppercase;margin:${sectionHeadingGap}px 0;letter-spacing:0">${title}</h2>${body}</section>`;

  const headerPhoto = cv.personal.photoUrl
    ? `<img src="${esc(cv.personal.photoUrl)}" alt="${esc(strip(cv.personal.name))}" style="width:72px;height:72px;object-fit:cover;object-position:center top;border-radius:8px;flex-shrink:0"/>`
    : "";

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:${lineHeight};color:#000;background:none;width:100%">
  <div style="display:flex;align-items:flex-start;justify-content:${headerPhoto ? "flex-start" : "center"};gap:14px;margin:0 0 4px 0">
    ${headerPhoto}
    <div style="flex:1;min-width:0;text-align:${headerPhoto ? "left" : "center"}">
      <h1 style="font-size:16px;font-weight:bold;text-align:${headerPhoto ? "left" : "center"};margin:0 0 3px 0;letter-spacing:0">${esc(strip(cv.personal.name).toUpperCase())}</h1>
      <p style="text-align:${headerPhoto ? "left" : "center"};font-size:11px;margin:0">${contact}</p>
    </div>
  </div>
  ${cv.profile ? section("SUMMARY", `<p style="margin:0">${esc(strip(cv.profile))}</p>`) : ""}
  ${expHtml  ? section("EXPERIENCE", expHtml)  : ""}
  ${eduHtml  ? section("EDUCATION",               eduHtml)  : ""}
  ${awardsHtml ? section("AWARDS",                awardsHtml) : ""}
  ${skillsHtml ? section("SKILLS",               skillsHtml) : ""}
  ${langHtml ? section("LANGUAGES",               `<p style="margin:0">${langHtml}</p>`) : ""}
  ${projHtml ? section("PROJECTS",                projHtml) : ""}
</div>`;
}
