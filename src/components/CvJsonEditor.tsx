"use client";

import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { useCallback } from "react";
import { configureResumeJsonSchema } from "@/lib/configureMonacoResumeSchema";

type CvJsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  jsonError: string | null;
};

/** Stable model URI — scoped validation + avoids ambiguous multi-model conflicts during HMR. */
const WORKING_CV_MODEL_PATH = "inmemory://cvpilot/working-cv.json";

export function CvJsonEditor({ value, onChange, jsonError }: CvJsonEditorProps) {
  const handleBeforeMount = useCallback((monaco: Monaco) => {
    configureResumeJsonSchema(monaco);
  }, []);

  return (
    <div className="flex h-[1123px] min-h-[1123px] flex-col rounded-[24px] border border-slate-200/80 bg-white shadow-panel">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">CV JSON</div>
          <p className="text-sm text-slate-600">
            Schema-aware editor · <span className="text-slate-500">photo lives in toolbar upload, not in JSON</span>
          </p>
        </div>
        {jsonError ? (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">{jsonError}</span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">JSON OK</span>
        )}
      </div>
      {/* Explicit outer height so Monaco's height="100%" resolves — flex-only min-heights collapse to 0. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          path={WORKING_CV_MODEL_PATH}
          defaultLanguage="json"
          theme="vs-light"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          beforeMount={handleBeforeMount}
          saveViewState={false}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: false
          }}
        />
      </div>
    </div>
  );
}
