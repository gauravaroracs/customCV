"use client";

import type { CSSProperties } from "react";
import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  Github,
  Languages,
  LucideIcon,
  LocateFixed,
  Mail,
  Phone,
  Star,
  Trophy,
  UserRound,
  Wrench,
  Linkedin,
  Globe
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { ResumeData } from "@/types/resume";

type ResumePreviewProps = {
  resume: ResumeData;
  isLoading?: boolean;
  cvFontSize: string;
  cvFontWeight: string;
  cvLineHeight: string;
  cvSectionGap: string;
  cvTopMargin?: string;
  cvBottomMargin?: string;
  onOverflowChange?: (overflowAmount: number) => void;
};

type HeadingProps = {
  title: string;
  icon: LucideIcon;
};

function SectionHeading({ title, icon: Icon }: HeadingProps) {
  return (
    <div style={{ marginBottom: "calc(var(--cv-section-gap, 14px) * 0.75)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "var(--cv-font-size-h, 9px)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#111111"
        }}
      >
        <Icon size={11} color="#1a6b9e" />
        <span>{title}</span>
      </div>
      <div
        style={{
          marginTop: "6px",
          width: "100%",
          borderTop: "1.5px solid #2b8bc1"
        }}
      />
    </div>
  );
}

function ContactItem({
  icon: Icon,
  text
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        fontSize: "var(--cv-font-size-sm, 9px)",
        fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
        lineHeight: "var(--cv-line-height, 1.6)",
        color: "#0d0d0d"
      }}
    >
      <Icon size={11} color="#1a6b9e" style={{ marginTop: "1px", flexShrink: 0 }} />
      <span style={{ wordBreak: "break-all" }}>{text}</span>
    </div>
  );
}

function renderInlineText(text: string) {
  if (!text || typeof text !== "string") return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} style={{ fontWeight: 600, color: "#111111" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function getLanguageName(item: ResumeData["languages"][number] & { language?: string }) {
  return item.language || item.name || "";
}

function getExperienceTitle(item: ResumeData["experience"][number] & { title?: string }) {
  return item.title || item.role || "";
}

function getExperienceDates(
  item: ResumeData["experience"][number] & { start?: string; end?: string }
) {
  if (item.start || item.end) {
    return `${item.start ?? ""} – ${item.end ?? ""}`.trim();
  }

  return item.dates;
}

function getSkillDisplayLabel(skill: string) {
  return skill
    .replace(/\*\*/g, "")
    .replace(/\s*\((Advanced|Intermediate|Basic|Beginner|Expert)\)\s*/gi, "")
    .trim();
}

export function ResumePreview({
  resume,
  isLoading = false,
  cvFontSize,
  cvFontWeight,
  cvLineHeight,
  cvSectionGap,
  cvTopMargin = "12px",
  cvBottomMargin = "12px",
  onOverflowChange
}: ResumePreviewProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowAmount, setOverflowAmount] = useState(0);

  useEffect(() => {
    const measureOverflow = () => {
      const page = pageRef.current;
      const content = contentRef.current;

      if (!page || !content) {
        return;
      }

      const contentHeight = content.scrollHeight;
      const previewHeight = page.scrollHeight;
      const availableHeight = 1123;
      const nextOverflowing = contentHeight > availableHeight || previewHeight > availableHeight;
      const nextOverflowAmount = Math.max(
        0,
        Math.max(contentHeight, previewHeight) - availableHeight
      );

      setIsOverflowing((current) => (current === nextOverflowing ? current : nextOverflowing));
      setOverflowAmount((current) =>
        Math.abs(current - nextOverflowAmount) < 1 ? current : nextOverflowAmount
      );
      onOverflowChange?.(nextOverflowAmount);
    };

    measureOverflow();

    const observer = new ResizeObserver(() => {
      measureOverflow();
    });

    if (pageRef.current) {
      observer.observe(pageRef.current);
    }

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    window.addEventListener("resize", measureOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [cvFontSize, cvLineHeight, cvSectionGap, onOverflowChange, resume]);

  const initials = resume.personal.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="print-shell flex flex-col items-center px-4 py-8">
      <div className="no-print mb-4 flex w-full max-w-[794px] items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm">
        <div className="font-medium text-slate-700">A4 preview boundary: 794 × 1123 px</div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${isOverflowing ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
            }`}
        >
          {isOverflowing
            ? `Overflowing A4 by ${Math.round(overflowAmount)} px`
            : "Fits on one A4 page"}
        </div>
      </div>

      <div className="no-print mb-4 h-px w-full max-w-[794px] border-t border-dashed border-slate-400/70" />

      <div
        id="cv-preview"
        ref={pageRef}
        className="resume-page print-area relative overflow-hidden rounded-[24px] border border-slate-300/80 bg-white shadow-page"
        style={
          {
            width: "794px",
            minHeight: "1123px",
            overflow: "hidden",
            ["--cv-font-size" as string]: cvFontSize,
            ["--cv-font-size-sm" as string]: "calc(var(--cv-font-size) - 0.5px)",
            ["--cv-font-size-lg" as string]: "calc(var(--cv-font-size) + 0.5px)",
            ["--cv-font-size-xl" as string]: "calc(var(--cv-font-size) + 2px)",
            ["--cv-font-size-h" as string]: "calc(var(--cv-font-size) - 0.5px)",
            ["--cv-font-weight" as string]: cvFontWeight,
            ["--cv-line-height" as string]: cvLineHeight,
            ["--cv-section-gap" as string]: `${cvSectionGap}px`,
            ["--cv-top-margin" as string]: cvTopMargin,
            ["--cv-bottom-margin" as string]: cvBottomMargin
          } as CSSProperties
        }
      >
        {isLoading ? (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-white/70">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>
        ) : null}
        <div className="no-print absolute inset-x-0 bottom-0 z-10 border-t-2 border-dashed border-rose-400/90" />
        <div className="no-print absolute bottom-2 right-4 z-10 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-rose-700 shadow-sm">
          A4 ends here
        </div>

        <div className="min-h-full">
          <div ref={contentRef} className="min-h-full" style={{ display: "flex", alignItems: "stretch", minHeight: "1091px" }}>
            <aside style={{ borderRight: "1px solid #e2e8f0", background: "#fcfbf7", paddingLeft: "12px", paddingRight: "12px", paddingTop: "var(--cv-top-margin, 12px)", paddingBottom: "var(--cv-bottom-margin, 12px)", display: "flex", flexDirection: "column", minHeight: "100%", width: "38%" }}>
              <div style={{ marginBottom: "12px", textAlign: "center" }}>
                {resume.personal.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      margin: "0 auto 10px auto",
                      display: "block",
                      border: "2px solid #e2e8f0"
                    }}
                  >
                    <img
                      src={resume.personal.photoUrl}
                      alt={resume.personal.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top"
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      margin: "0 auto 10px auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px dashed #cbd5e1",
                      background: "#f1f5f9",
                      color: "#64748b",
                      fontSize: "var(--cv-font-size-xl, 11.5px)",
                      fontWeight: 600
                    }}
                  >
                    {initials}
                  </div>
                )}

                <span
                  style={{
                    display: "block",
                    clear: "both",
                    textAlign: "center",
                    marginTop: "8px",
                    fontSize: "calc(var(--cv-font-size) + 7px)",
                    fontWeight: 700,
                    color: "#0d1117",
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em"
                  }}
                >
                  {resume.personal.name}
                </span>
                <div
                  style={{
                    marginTop: "10px",
                    height: "2px",
                    width: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #1a6b9e, #6fa9c8, transparent)"
                  }}
                />
              </div>

              <section style={{ marginBottom: "var(--cv-section-gap, 14px)" }}>
                <SectionHeading title="Contact" icon={UserRound} />
                <div className="space-y-2">
                  <ContactItem icon={Mail} text={resume.personal.email.replace(/\*\*/g, "")} />
                  <ContactItem icon={Phone} text={resume.personal.phone.replace(/\*\*/g, "")} />
                  <ContactItem
                    icon={LocateFixed}
                    text={resume.personal.location.replace(/\*\*/g, "")}
                  />
                  <ContactItem
                    icon={Linkedin}
                    text={resume.personal.linkedin.replace(/\*\*/g, "")}
                  />
                  {resume.personal.github && (
                    <ContactItem
                      icon={Github}
                      text={resume.personal.github.replace(/\*\*/g, "")}
                    />
                  )}
                  {resume.personal.website && (
                    <ContactItem
                      icon={Globe}
                      text={resume.personal.website.replace(/\*\*/g, "")}
                    />
                  )}
                </div>
              </section>

              <section style={{ marginBottom: "var(--cv-section-gap, 14px)" }}>
                <SectionHeading title="Skills" icon={Wrench} />
                <div className="space-y-3">
                  {Object.entries(resume.skills).map(([group, values]) => (
                    <div key={group}>
                      <div
                        style={{
                          fontSize: "var(--cv-font-size-sm, 9px)",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#111111"
                        }}
                      >
                        {group.replace(/\*\*/g, "")}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          marginTop: "5px"
                        }}
                      >
                        {values.map((skill) => (
                          <span
                            key={`${group}-${skill}`}
                            style={{
                              border: "1px solid #c7d7e4",
                              borderRadius: "4px",
                              background: "#f6fafc",
                              color: "#0d0d0d",
                              display: "inline-flex",
                              alignItems: "center",
                              fontSize: "var(--cv-font-size-sm, 9px)",
                              fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
                              lineHeight: 1.25,
                              padding: "2px 5px"
                            }}
                          >
                            {getSkillDisplayLabel(skill)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ marginBottom: "var(--cv-section-gap, 14px)" }}>
                <SectionHeading title="Languages" icon={Languages} />
                <div className="space-y-2">
                  {resume.languages.map((lang) => (
                    <div
                      key={`${getLanguageName(lang)}-${lang.level}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        fontSize: "var(--cv-font-size-sm, 9px)",
                        lineHeight: "var(--cv-line-height, 1.6)"
                      }}
                    >
                      <span style={{ minWidth: "60px", color: "#1a1a1a" }}>
                        {getLanguageName(lang)}
                      </span>
                      <span style={{ color: "#1a1a1a" }}>{lang.level}</span>
                    </div>
                  ))}
                </div>
              </section>
              <div style={{ flex: 1 }} />
            </aside>

            <main style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "var(--cv-top-margin, 12px)", paddingBottom: "var(--cv-bottom-margin, 12px)", width: "62%", display: "flex", flexDirection: "column", flex: 1, rowGap: "var(--cv-section-gap, 14px)" }}>
              <section>
                <SectionHeading title="Summary" icon={Star} />
                <p
                  style={{
                    fontSize: "var(--cv-font-size, 9.5px)",
                    fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
                    lineHeight: "var(--cv-line-height, 1.6)",
                    color: "#0d0d0d"
                  }}
                >
                  {renderInlineText(resume.profile)}
                </p>
              </section>

              <section>
                <SectionHeading title="Experience" icon={Briefcase} />
                <div>
                  {resume.experience.map((exp, index) => (
                    <article key={`${exp.company}-${index}`} style={{ marginBottom: "var(--cv-section-gap, 14px)" }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--cv-font-size-lg, 10px)", color: "#111111", marginBottom: "1px" }}>
                        {getExperienceTitle(exp)}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          style={{
                            fontSize: "var(--cv-font-size, 9.5px)",
                            fontWeight: 400,
                            fontStyle: "italic",
                            color: "#1a6b9e"
                          }}
                        >
                          {renderInlineText(exp.company)} ·{" "}
                          <span style={{ color: "#555555" }}>{renderInlineText(exp.location)}</span>
                        </div>
                        <div style={{ fontSize: "var(--cv-font-size-sm, 9px)", color: "#1a6b9e" }}>
                          {getExperienceDates(exp).replace(/\*\*/g, "")}
                        </div>
                      </div>
                      <ul
                        style={{
                          listStyle: "disc",
                          paddingLeft: "14px",
                          fontSize: "var(--cv-font-size, 9.5px)",
                          fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
                          lineHeight: "var(--cv-line-height, 1.6)",
                          color: "#0d0d0d"
                        }}
                      >
                        {exp.bullets.map((bullet, bulletIndex) => (
                          <li key={`${exp.company}-bullet-${bulletIndex}`} style={{ margin: "3px 0" }}>
                            {renderInlineText(bullet)}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <SectionHeading title="Education" icon={GraduationCap} />
                <div>
                  {resume.education.map((item, index) => (
                    <article
                      key={`${item.institution}-${index}`}
                      style={{
                        marginBottom: "calc(var(--cv-section-gap, 14px) * 1.05)"
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "var(--cv-font-size-lg, 10px)",
                              color: "#111111"
                            }}
                          >
                            {renderInlineText(item.degree)}
                          </div>
                          <div
                            style={{
                              fontSize: "var(--cv-font-size, 9.5px)",
                              fontWeight: 400,
                              fontStyle: "italic",
                              color: "#2a6496"
                            }}
                          >
                            {renderInlineText(item.institution)} ·{" "}
                            <span style={{ color: "#555555" }}>{renderInlineText(item.location)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: "var(--cv-font-size-sm, 9px)", color: "#1a6b9e" }}>
                          {item.dates.replace(/\*\*/g, "")}
                        </div>
                      </div>
                      {item.details.length > 0 ? (
                        <ul
                          style={{
                            listStyle: "disc",
                            paddingLeft: "14px",
                            fontSize: "var(--cv-font-size, 9.5px)",
                            fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
                            lineHeight: "var(--cv-line-height, 1.6)",
                            color: "#0d0d0d"
                          }}
                        >
                          {item.details.map((detail, detailIndex) => (
                            <li key={`${item.institution}-detail-${detailIndex}`} style={{ margin: "3px 0" }}>
                              {renderInlineText(detail)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              {resume.awards.length > 0 ? (
                <section>
                  <SectionHeading title="Awards" icon={Trophy} />
                  <div>
                    {resume.awards.map((award, index) => (
                      <article key={`${award.title}-${index}`} style={{ marginBottom: "calc(var(--cv-section-gap, 14px) * 0.85)" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "var(--cv-font-size-lg, 10px)",
                                color: "#111111"
                              }}
                            >
                              {renderInlineText(award.title)}
                            </div>
                            <div
                              style={{
                                fontSize: "var(--cv-font-size, 9.5px)",
                                fontWeight: 400,
                                fontStyle: "italic",
                                color: "#2a6496"
                              }}
                            >
                              {renderInlineText(award.event)}
                              {award.organizer ? (
                                <span style={{ color: "#555555" }}> · {renderInlineText(award.organizer)}</span>
                              ) : null}
                            </div>
                          </div>
                          <div style={{ fontSize: "var(--cv-font-size-sm, 9px)", color: "#1a6b9e" }}>
                            {award.date.replace(/\*\*/g, "")}
                          </div>
                        </div>
                        {award.description ? (
                          <p
                            style={{
                              marginTop: "3px",
                              fontSize: "var(--cv-font-size, 9.5px)",
                              fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
                              lineHeight: "var(--cv-line-height, 1.6)",
                              color: "#0d0d0d"
                            }}
                          >
                            {renderInlineText(award.description)}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <SectionHeading title="Projects" icon={FolderKanban} />
                <div>
                  {resume.projects.map((project, index) => (
                    <article key={`${project.name}-${index}`} style={{ marginBottom: "calc(var(--cv-section-gap, 14px) * 0.85)" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "var(--cv-font-size-lg, 10px)",
                          color: "#111111"
                        }}
                      >
                        {renderInlineText(project.name)}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--cv-font-size, 9.5px)",
                          fontWeight: 400,
                          fontStyle: "italic",
                          color: "#1a6b9e"
                        }}
                      >
                        {renderInlineText(project.tech)}
                      </div>
                      <ul
                        style={{
                          listStyle: "disc",
                          paddingLeft: "14px",
                          fontSize: "var(--cv-font-size, 9.5px)",
                          fontWeight: ("var(--cv-font-weight, 400)" as unknown) as number,
                          lineHeight: "var(--cv-line-height, 1.6)",
                          color: "#0d0d0d"
                        }}
                      >
                        {project.bullets.map((bullet, bulletIndex) => (
                          <li key={`${project.name}-bullet-${bulletIndex}`} style={{ margin: "3px 0" }}>
                            {renderInlineText(bullet)}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>

        <div className="cv-page-end-marker" />
      </div>
    </div>
  );
}
