"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description: string;
  isSelected: boolean;
  isOpen: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onToggle: () => void;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  isSelected,
  isOpen,
  disabled = false,
  onSelect,
  onToggle,
  children
}: SectionCardProps) {
  return (
    <section
      className={`rounded-[24px] border bg-white shadow-panel transition ${
        isSelected ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className="flex-1 text-left disabled:cursor-not-allowed"
        >
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="mt-1 rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isOpen ? <div className="border-t border-slate-100 px-5 py-5">{children}</div> : null}
    </section>
  );
}
