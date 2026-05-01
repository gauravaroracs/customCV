"use client";

type MasterCvModalProps = {
  isOpen: boolean;
  mode: "setup" | "update";
  onImportClick: () => void;
  onUseCurrent: () => void;
  onClose: () => void;
};

export function MasterCvModal({
  isOpen,
  mode,
  onImportClick,
  onUseCurrent,
  onClose
}: MasterCvModalProps) {
  if (!isOpen) {
    return null;
  }

  const isSetup = mode === "setup";

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              {isSetup ? "One-Time Setup" : "Update Master CV"}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {isSetup ? "Set your Master CV" : "Replace your Master CV"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isSetup
                ? "This is your base. You&apos;ll only do this once."
                : "Import a fresh JSON file or use the current working copy as the new base."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            Esc
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onImportClick}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={onUseCurrent}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Use current CV
          </button>
        </div>
      </div>
    </div>
  );
}
