"use client";

import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  Languages,
  LucideIcon,
  LocateFixed,
  Mail,
  Phone,
  Star,
  UserRound,
  Wrench,
  Linkedin
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { ResumeData } from "@/types/resume";

type ResumePreviewProps = {
  resume: ResumeData;
};

type HeadingProps = {
  title: string;
  icon: LucideIcon;
};

function SectionHeading({ title, icon: Icon }: HeadingProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.26em] text-slate-800">
        <Icon size={14} className="text-blue-600" />
        <span>{title}</span>
      </div>
      <div className="mt-2 h-[2px] w-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-transparent" />
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
    <div className="flex items-start gap-2 text-[12px] leading-5 text-slate-600">
      <Icon size={14} className="mt-[2px] shrink-0 text-blue-600" />
      <span className="break-all">{text}</span>
    </div>
  );
}

function renderInlineText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export function ResumePreview({ resume }: ResumePreviewProps) {
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

      const naturalHeight = content.scrollHeight;
      const availableHeight = page.clientHeight;
      const nextOverflowing = naturalHeight > availableHeight;
      const nextOverflowAmount = Math.max(0, naturalHeight - availableHeight);

      setIsOverflowing((current) =>
        current === nextOverflowing ? current : nextOverflowing
      );
      setOverflowAmount((current) =>
        Math.abs(current - nextOverflowAmount) < 1 ? current : nextOverflowAmount
      );
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
  }, [resume]);

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
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isOverflowing
              ? "bg-rose-100 text-rose-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {isOverflowing
            ? `Overflowing A4 by ${Math.round(overflowAmount)} px`
            : "Fits on one A4 page"}
        </div>
      </div>

      <div className="no-print mb-4 h-px w-full max-w-[794px] border-t border-dashed border-slate-400/70" />

      <div
        ref={pageRef}
        className="resume-page print-area relative overflow-hidden rounded-[24px] border border-slate-300/80 bg-white shadow-page"
      >
        <div className="no-print absolute inset-x-0 bottom-0 z-10 border-t-2 border-dashed border-rose-400/90" />
        <div className="no-print absolute bottom-2 right-4 z-10 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-rose-700 shadow-sm">
          A4 ends here
        </div>
        <div className="min-h-full">
          <div ref={contentRef} className="grid min-h-full grid-cols-[38%_62%]">
            <aside className="border-r border-slate-200 bg-[#fcfbf7] px-9 py-10">
              <div className="mb-8 flex flex-col items-start">
                {resume.personal.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resume.personal.photoUrl}
                    alt={resume.personal.name}
                    className="mb-5 h-[120px] w-[120px] rounded-full border border-slate-200 object-cover shadow-sm"
                  />
                ) : (
                  <div className="mb-5 flex h-[120px] w-[120px] items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-100 text-2xl font-semibold text-slate-500">
                    {initials}
                  </div>
                )}

                <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-slate-900">
                  {resume.personal.name}
                </h1>
              </div>

              <div className="space-y-6">
                <section>
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
                  </div>
                </section>

                <section>
                  <SectionHeading title="Skills" icon={Wrench} />
                  <div className="space-y-3">
                    {Object.entries(resume.skills).map(([group, values]) => (
                      <div key={group}>
                        <div className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-slate-800">
                          {group.replace(/\*\*/g, "")}
                        </div>
                        <p className="mt-1 text-[11.8px] leading-5 text-slate-600">
                          {renderInlineText(values.join(" • "))}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <SectionHeading title="Languages" icon={Languages} />
                  <div className="space-y-2">
                    {resume.languages.map((item) => (
                      <div
                        key={`${item.name}-${item.level}`}
                        className="flex items-center justify-between gap-4 text-[12.5px]"
                      >
                        <span className="font-medium text-slate-800">
                          {renderInlineText(item.name)}
                        </span>
                        <span className="text-slate-500">{renderInlineText(item.level)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </aside>

            <main className="px-10 py-10">
              <section className="mb-6">
                <SectionHeading title="Profile" icon={Star} />
                <p className="text-[13.2px] leading-6 text-slate-700">
                  {renderInlineText(resume.profile)}
                </p>
              </section>

              <section className="mb-6">
                <SectionHeading title="Professional Experience" icon={Briefcase} />
                <div className="space-y-5">
                  {resume.experience.map((item, index) => (
                    <article key={`${item.company}-${index}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[13.6px] font-extrabold text-slate-900">
                            {renderInlineText(item.role)}
                          </div>
                          <div className="text-[12.5px] font-semibold text-slate-700">
                            {renderInlineText(item.company)} · {renderInlineText(item.location)}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11.2px] font-semibold uppercase tracking-[0.1em] text-blue-600">
                          {item.dates.replace(/\*\*/g, "")}
                        </div>
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.1px] leading-5 text-slate-700 marker:text-blue-600">
                        {item.bullets.map((bullet, bulletIndex) => (
                          <li key={`${item.company}-bullet-${bulletIndex}`}>
                            {renderInlineText(bullet)}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mb-6">
                <SectionHeading title="Projects" icon={FolderKanban} />
                <div className="space-y-4">
                  {resume.projects.map((project, index) => (
                    <article key={`${project.name}-${index}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[13.6px] font-extrabold text-slate-900">
                            {renderInlineText(project.name)}
                          </div>
                          <div className="text-[12px] font-medium text-slate-600">
                            {renderInlineText(project.tech)}
                          </div>
                        </div>
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.1px] leading-5 text-slate-700 marker:text-blue-600">
                        {project.bullets.map((bullet, bulletIndex) => (
                          <li key={`${project.name}-bullet-${bulletIndex}`}>
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
                <div className="space-y-4">
                  {resume.education.map((item, index) => (
                    <article key={`${item.institution}-${index}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[13.6px] font-extrabold text-slate-900">
                            {renderInlineText(item.degree)}
                          </div>
                          <div className="text-[12.5px] font-semibold text-slate-700">
                            {renderInlineText(item.institution)} · {renderInlineText(item.location)}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11.2px] font-semibold uppercase tracking-[0.1em] text-blue-600">
                          {item.dates.replace(/\*\*/g, "")}
                        </div>
                      </div>
                      {item.details.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.1px] leading-5 text-slate-700 marker:text-blue-600">
                          {item.details.map((detail, detailIndex) => (
                            <li key={`${item.institution}-detail-${detailIndex}`}>
                              {renderInlineText(detail)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
