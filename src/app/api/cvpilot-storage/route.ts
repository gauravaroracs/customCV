import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { Pool, type QueryResultRow } from "pg";

type CvPilotSettings = {
  selectedVersion?: string;
  cvFontSize?: string;
  cvFontWeight?: string;
  cvLineHeight?: string;
  cvSectionGap?: string;
  atsLineHeight?: string;
  atsSectionGap?: string;
  cvTopMargin?: string;
  cvBottomMargin?: string;
};

type CvPilotStorage = {
  masterCV?: unknown;
  workingCV?: unknown;
  recentApplications?: unknown[];
  settings?: CvPilotSettings;
  photo?: string;
  coverLetter?: string;
};

type StorageKey = keyof typeof files;

const storageDir = process.env.CVPILOT_STORAGE_DIR
  ? path.resolve(process.env.CVPILOT_STORAGE_DIR)
  : path.join(process.cwd(), "storage", "cvpilot");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const files = {
  masterCV: "master-cv.json",
  workingCV: "working-cv.json",
  recentApplications: "recent.json",
  settings: "settings.json",
  photo: "photo.txt",
  coverLetter: "cover-letter.txt"
} as const;

const storageKeys = Object.keys(files) as StorageKey[];
let writeQueue: Promise<unknown> = Promise.resolve();
let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function ensureDatabaseSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool().query(`
      CREATE TABLE IF NOT EXISTS cvpilot_storage (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).then(() => undefined);
  }

  await schemaPromise;
}

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(storageDir, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function readTextFile(filename: string): Promise<string> {
  try {
    return await fs.readFile(path.join(storageDir, filename), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function writeJsonFile(filename: string, value: unknown) {
  await ensureStorageDir();
  await writeFileAtomic(filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextFile(filename: string, value: string) {
  await ensureStorageDir();
  await writeFileAtomic(filename, value);
}

async function writeFileAtomic(filename: string, value: string) {
  const destination = path.join(storageDir, filename);
  const temporary = path.join(
    storageDir,
    `.${filename}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  await fs.writeFile(temporary, value, "utf8");
  await fs.rename(temporary, destination);
}

async function readFileStorage(): Promise<Required<CvPilotStorage>> {
  await ensureStorageDir();

  return {
    masterCV: await readJsonFile(files.masterCV, null),
    workingCV: await readJsonFile(files.workingCV, null),
    recentApplications: await readJsonFile(files.recentApplications, []),
    settings: await readJsonFile(files.settings, {}),
    photo: await readTextFile(files.photo),
    coverLetter: await readTextFile(files.coverLetter)
  };
}

function normalizeStorageValue(key: StorageKey, value: unknown) {
  if (key === "recentApplications") return Array.isArray(value) ? value : [];
  if (key === "settings") return value && typeof value === "object" ? value as CvPilotSettings : {};
  if (key === "photo" || key === "coverLetter") return typeof value === "string" ? value : "";
  return value ?? null;
}

async function writeFileStorageKey(key: StorageKey, value: unknown) {
  const normalized = normalizeStorageValue(key, value);
  if (key === "photo" || key === "coverLetter") {
    await writeTextFile(files[key], String(normalized ?? ""));
    return;
  }

  await writeJsonFile(files[key], normalized);
}

async function readDatabaseEntries() {
  await ensureDatabaseSchema();
  const result = await getPool().query<QueryResultRow & { key: StorageKey; value: unknown }>(
    "SELECT key, value FROM cvpilot_storage WHERE key = ANY($1::text[])",
    [storageKeys]
  );
  const values: Partial<Record<StorageKey, unknown>> = {};
  const found = new Set<StorageKey>();

  for (const row of result.rows) {
    if (storageKeys.includes(row.key)) {
      found.add(row.key);
      values[row.key] = normalizeStorageValue(row.key, row.value);
    }
  }

  return { values, found };
}

async function writeDatabaseKey(key: StorageKey, value: unknown) {
  await ensureDatabaseSchema();
  await getPool().query(
    `INSERT INTO cvpilot_storage (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(normalizeStorageValue(key, value))]
  );
}

async function writeStorageKey(key: StorageKey, value: unknown) {
  const normalized = normalizeStorageValue(key, value);

  if (hasDatabase()) {
    await writeDatabaseKey(key, normalized);
  }

  await writeFileStorageKey(key, normalized);
}

async function readStorage(): Promise<Required<CvPilotStorage>> {
  const fileStorage = await readFileStorage();

  if (!hasDatabase()) {
    return fileStorage;
  }

  const { values, found } = await readDatabaseEntries();
  const merged = { ...fileStorage };

  for (const key of storageKeys) {
    if (found.has(key)) {
      (merged as Record<StorageKey, unknown>)[key] = normalizeStorageValue(key, values[key]);
    } else {
      await writeDatabaseKey(key, fileStorage[key]);
    }
  }

  return merged;
}

function stringifyForGuard(value: unknown) {
  try {
    return JSON.stringify(value ?? "").toLowerCase();
  } catch {
    return "";
  }
}

function isKnownStaleBackendCv(value: unknown) {
  const text = stringifyForGuard(value);
  return (
    text.includes("currently upskilling into ml") ||
    text.includes("b1 learning") ||
    (text.includes("programming") && text.includes("soft skills") && !text.includes("fraunhofer sit"))
  );
}

export async function GET() {
  try {
    return NextResponse.json(await readStorage());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read CVPilot storage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as CvPilotStorage;
    const nextWrite = writeQueue
      .catch(() => undefined)
      .then(async () => {
        const current = await readStorage();

        if ("masterCV" in body) {
          await writeStorageKey("masterCV", body.masterCV ?? null);
        }

        if ("workingCV" in body) {
          const isExplicitMasterAndWorkingPair = "masterCV" in body;
          const shouldIgnoreStaleWorkingCv =
            !isExplicitMasterAndWorkingPair && isKnownStaleBackendCv(body.workingCV);

          if (!shouldIgnoreStaleWorkingCv) {
            await writeStorageKey("workingCV", body.workingCV ?? null);
          }
        }

        if ("recentApplications" in body) {
          await writeStorageKey("recentApplications", body.recentApplications ?? []);
        }

        if ("settings" in body) {
          await writeStorageKey("settings", {
            ...current.settings,
            ...body.settings
          });
        }

        if ("photo" in body) {
          await writeStorageKey("photo", body.photo ?? "");
        }

        if ("coverLetter" in body) {
          await writeStorageKey("coverLetter", body.coverLetter ?? "");
        }
      });

    writeQueue = nextWrite;
    await nextWrite;

    return NextResponse.json(await readStorage());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write CVPilot storage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
