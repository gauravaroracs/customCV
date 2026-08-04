"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cvSettingsDefaults,
  normalizeCvPilotSettings,
  type CvPilotSettings
} from "./cvSettings";

type UseSettingsOptions = {
  /** Persist only after hydration is complete. */
  enabled: boolean;
  onPersist: (settings: CvPilotSettings) => void | Promise<void>;
};

/**
 * Holds all CV presentation settings (fonts, margins, version) and persists
 * them as one debounced patch. Callers update individual fields with
 * `updateSettings` and hydrate stored values once with `applyStoredSettings`.
 */
export function useSettings({ enabled, onPersist }: UseSettingsOptions) {
  const [settings, setSettings] = useState<CvPilotSettings>({ ...cvSettingsDefaults });
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;

  const applyStoredSettings = useCallback((stored: Partial<CvPilotSettings>) => {
    setSettings((previous) => {
      return normalizeCvPilotSettings(stored, previous);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<CvPilotSettings>) => {
    setSettings((previous) => normalizeCvPilotSettings(patch, previous));
  }, []);

  // Single debounced autosave for every setting.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      void onPersistRef.current(settings);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [enabled, settings]);

  return { settings, applyStoredSettings, updateSettings };
}
