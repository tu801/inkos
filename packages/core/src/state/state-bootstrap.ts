import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
<<<<<<< HEAD
=======
import {
  ChapterSummariesStateSchema,
  CurrentStateStateSchema,
  HooksStateSchema,
  StateManifestSchema,
  type ChapterSummariesState,
  type CurrentStateState,
  type HooksState,
  type HookStatus,
  type StateManifest,
} from "../models/runtime-state.js";
import type { Fact, StoredHook } from "./memory-db.js";
import { normalizeHookPayoffTiming } from "../utils/hook-lifecycle.js";
import { normalizeWritingLanguage, type WritingLanguage } from "../utils/language.js";
import {
  inferFactSubject,
  isCurrentChapterLabel,
  isStateTableHeaderRow,
  normalizeHookId,
  parseChapterSummariesMarkdown,
  parseInteger,
  parseMarkdownTableRows,
  parsePendingHooksMarkdown,
} from "../utils/story-markdown.js";

export {
  normalizeHookId,
  parseChapterSummariesMarkdown,
  parseCurrentStateFacts,
  parsePendingHooksMarkdown,
} from "../utils/story-markdown.js";

export interface BootstrapStructuredStateResult {
  readonly createdFiles: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly manifest: StateManifest;
}

interface MarkdownBootstrapState {
  readonly summariesState: ChapterSummariesState;
  readonly hooksState: { readonly hooks: ReadonlyArray<StoredHook> };
  readonly currentState: CurrentStateState;
  readonly durableStoryProgress: number;
}

export async function bootstrapStructuredStateFromMarkdown(params: {
  readonly bookDir: string;
  readonly fallbackChapter?: number;
}): Promise<BootstrapStructuredStateResult> {
  const storyDir = join(params.bookDir, "story");
  const stateDir = join(storyDir, "state");
  const manifestPath = join(stateDir, "manifest.json");
  const currentStatePath = join(stateDir, "current_state.json");
  const hooksPath = join(stateDir, "hooks.json");
  const summariesPath = join(stateDir, "chapter_summaries.json");

  await mkdir(stateDir, { recursive: true });

  const createdFiles: string[] = [];
  const warnings: string[] = [];
  const existingManifest = await loadJsonIfValid(manifestPath, StateManifestSchema, warnings, "manifest.json");
  const language = await resolveRuntimeLanguage(params.bookDir);
  if (existingManifest && existingManifest.language !== language) {
    appendWarning(warnings, `manifest language synchronized from ${existingManifest.language} to ${language} using book.json`);
  }
  const markdownState = await loadMarkdownBootstrapState({
    bookDir: params.bookDir,
    storyDir,
    fallbackChapter: params.fallbackChapter ?? 0,
    warnings,
  });

  const summariesState = await loadOrBootstrapSummaries({
    storyDir,
    statePath: summariesPath,
    createdFiles,
    warnings,
    bootstrapState: markdownState.summariesState,
  });
  const hooksState = await loadOrBootstrapHooks({
    storyDir,
    statePath: hooksPath,
    createdFiles,
    warnings,
    bootstrapState: markdownState.hooksState,
  });
  const currentState = await loadOrBootstrapCurrentState({
    storyDir,
    statePath: currentStatePath,
    fallbackChapter: markdownState.durableStoryProgress,
    createdFiles,
    warnings,
    bootstrapState: markdownState.currentState,
  });
  // Only trust durable artifact progress (chapter files + index).
  // currentState.chapter comes from markdown which can contain
  // hallucinated numbers (e.g. year 1988 parsed as chapter 1988).
  const derivedProgress = markdownState.durableStoryProgress;
  if ((existingManifest?.lastAppliedChapter ?? 0) > derivedProgress) {
    appendWarning(
      warnings,
      `manifest lastAppliedChapter normalized from ${existingManifest?.lastAppliedChapter ?? 0} to ${derivedProgress}`,
    );
  }

  const manifest = StateManifestSchema.parse({
    schemaVersion: 2,
    language,
    lastAppliedChapter: derivedProgress,
    projectionVersion: existingManifest?.projectionVersion ?? 1,
    migrationWarnings: uniqueStrings([
      ...(existingManifest?.migrationWarnings ?? []),
      ...warnings,
    ]),
  });

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  if (!existingManifest) {
    createdFiles.push("manifest.json");
  }

  return {
    createdFiles,
    warnings: manifest.migrationWarnings,
    manifest,
  };
}

export async function rewriteStructuredStateFromMarkdown(params: {
  readonly bookDir: string;
  readonly fallbackChapter?: number;
}): Promise<BootstrapStructuredStateResult> {
  const storyDir = join(params.bookDir, "story");
  const stateDir = join(storyDir, "state");
  const manifestPath = join(stateDir, "manifest.json");
  const currentStatePath = join(stateDir, "current_state.json");
  const hooksPath = join(stateDir, "hooks.json");
  const summariesPath = join(stateDir, "chapter_summaries.json");

  await mkdir(stateDir, { recursive: true });

  const warnings: string[] = [];
  const existingManifest = await loadJsonIfValid(manifestPath, StateManifestSchema, warnings, "manifest.json");
  const language = await resolveRuntimeLanguage(params.bookDir);
  if (existingManifest && existingManifest.language !== language) {
    appendWarning(warnings, `manifest language synchronized from ${existingManifest.language} to ${language} using book.json`);
  }
  const markdownState = await loadMarkdownBootstrapState({
    bookDir: params.bookDir,
    storyDir,
    fallbackChapter: params.fallbackChapter ?? 0,
    warnings,
  });
  const summariesState = markdownState.summariesState;
  const hooksState = markdownState.hooksState;
  const currentState = markdownState.currentState;

  const manifest = StateManifestSchema.parse({
    schemaVersion: 2,
    language,
    lastAppliedChapter: markdownState.durableStoryProgress,
    projectionVersion: existingManifest?.projectionVersion ?? 1,
    migrationWarnings: uniqueStrings([
      ...(existingManifest?.migrationWarnings ?? []),
      ...warnings,
    ]),
  });

  await Promise.all([
    writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8"),
    writeFile(currentStatePath, JSON.stringify(currentState, null, 2), "utf-8"),
    writeFile(hooksPath, JSON.stringify(hooksState, null, 2), "utf-8"),
    writeFile(summariesPath, JSON.stringify(summariesState, null, 2), "utf-8"),
  ]);

  return {
    createdFiles: [],
    warnings: manifest.migrationWarnings,
    manifest,
  };
}

async function loadOrBootstrapCurrentState(params: {
  readonly storyDir: string;
  readonly statePath: string;
  readonly fallbackChapter: number;
  readonly createdFiles: string[];
  readonly warnings: string[];
  readonly bootstrapState?: CurrentStateState;
  readonly forceBootstrapFromMarkdown?: boolean;
}): Promise<CurrentStateState> {
  if (!params.forceBootstrapFromMarkdown) {
    const existing = await loadJsonIfValid(
      params.statePath,
      CurrentStateStateSchema,
      params.warnings,
      "current_state.json",
    );
    if (existing) {
      return existing;
    }
  }

  const currentState = params.bootstrapState ?? await loadMarkdownCurrentState({
    storyDir: params.storyDir,
    fallbackChapter: params.fallbackChapter,
    warnings: params.warnings,
  });
  const existed = await pathExists(params.statePath);
  await writeFile(params.statePath, JSON.stringify(currentState, null, 2), "utf-8");
  if (!existed) {
    params.createdFiles.push("current_state.json");
  }
  return currentState;
}

async function loadOrBootstrapHooks(params: {
  readonly storyDir: string;
  readonly statePath: string;
  readonly createdFiles: string[];
  readonly warnings: string[];
  readonly bootstrapState?: { readonly hooks: ReadonlyArray<StoredHook> };
  readonly forceBootstrapFromMarkdown?: boolean;
}) {
  if (!params.forceBootstrapFromMarkdown) {
    const existing = await loadHooksStateIfValid(
      params.statePath,
      params.warnings,
      "hooks.json",
    );
    if (existing) {
      if (existing.repaired) {
        await writeFile(params.statePath, JSON.stringify(existing.state, null, 2), "utf-8");
      }
      return existing.state;
    }
  }

  const hooksState = params.bootstrapState ?? await loadMarkdownHooksState({
    storyDir: params.storyDir,
    warnings: params.warnings,
  });
  const existed = await pathExists(params.statePath);
  await writeFile(params.statePath, JSON.stringify(hooksState, null, 2), "utf-8");
  if (!existed) {
    params.createdFiles.push("hooks.json");
  }
  return hooksState;
}

async function loadOrBootstrapSummaries(params: {
  readonly storyDir: string;
  readonly statePath: string;
  readonly createdFiles: string[];
  readonly warnings: string[];
  readonly bootstrapState?: ChapterSummariesState;
  readonly forceBootstrapFromMarkdown?: boolean;
}): Promise<ChapterSummariesState> {
  if (!params.forceBootstrapFromMarkdown) {
    const existing = await loadJsonIfValid(
      params.statePath,
      ChapterSummariesStateSchema,
      params.warnings,
      "chapter_summaries.json",
    );
    if (existing) {
      // Always deduplicate even when loading from JSON (stale data may have duplicates)
      const dedupedExisting = deduplicateSummaryRows(existing.rows);
      if (dedupedExisting.length < existing.rows.length) {
        const repaired = ChapterSummariesStateSchema.parse({ rows: dedupedExisting });
        await writeFile(params.statePath, JSON.stringify(repaired, null, 2), "utf-8");
        return repaired;
      }
      return existing;
    }
  }

  const summariesState = params.bootstrapState ?? await loadMarkdownSummariesState(params.storyDir);
  const existed = await pathExists(params.statePath);
  await writeFile(params.statePath, JSON.stringify(summariesState, null, 2), "utf-8");
  if (!existed) {
    params.createdFiles.push("chapter_summaries.json");
  }
  return summariesState;
}

function parsePendingHooksStateMarkdown(markdown: string, warnings: string[]) {
  const parsedHooks = parsePendingHooksMarkdown(markdown);
  if (parsedHooks.length > 0) {
    return HooksStateSchema.parse({
      hooks: parsedHooks.map((hook) => ({
        ...hook,
        type: normalizeHookType(hook.type, warnings, hook.hookId),
        status: normalizeHookStatus(hook.status, warnings, hook.hookId),
      })),
    });
  }

  return HooksStateSchema.parse({
    hooks: markdown
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-\s*/, ""))
      .filter(Boolean)
      .map((line, index) => ({
        hookId: `hook-${index + 1}`,
        startChapter: 0,
        type: "unspecified",
        status: "open" as HookStatus,
        lastAdvancedChapter: 0,
        expectedPayoff: "",
        payoffTiming: undefined,
        notes: line,
      })),
  });
}

function parseCurrentStateStateMarkdown(
  markdown: string,
  fallbackChapter: number,
  warnings: string[],
): CurrentStateState {
  const tableRows = parseMarkdownTableRows(markdown);
  const fieldValueRows = tableRows
    .filter((row) => row.length >= 2)
    .filter((row) => !isStateTableHeaderRow(row));

  if (fieldValueRows.length > 0) {
    const chapterFromTable = fieldValueRows.find((row) => isCurrentChapterLabel(row[0] ?? ""));
    const stateChapter = parseIntegerWithFallback(
      chapterFromTable?.[1],
      fallbackChapter,
      warnings,
      "current_state:chapter",
    );

    return CurrentStateStateSchema.parse({
      chapter: stateChapter,
      facts: fieldValueRows
        .filter((row) => !isCurrentChapterLabel(row[0] ?? ""))
        .flatMap((row): Fact[] => {
          const label = (row[0] ?? "").trim();
          const value = (row[1] ?? "").trim();
          if (!label || !value) return [];

          return [{
            subject: inferFactSubject(label),
            predicate: label,
            object: value,
            validFromChapter: stateChapter,
            validUntilChapter: null,
            sourceChapter: stateChapter,
          }];
        }),
    });
  }

  const bulletFacts = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-\s*/, ""))
    .filter(Boolean);

  return CurrentStateStateSchema.parse({
    chapter: Math.max(0, fallbackChapter),
    facts: bulletFacts.map((line, index) => ({
      subject: "current_state",
      predicate: `note_${index + 1}`,
      object: line,
      validFromChapter: Math.max(0, fallbackChapter),
      validUntilChapter: null,
      sourceChapter: Math.max(0, fallbackChapter),
    })),
  });
}

async function resolveRuntimeLanguage(bookDir: string): Promise<WritingLanguage> {
  try {
    const raw = await readFile(join(bookDir, "book.json"), "utf-8");
    const parsed = JSON.parse(raw) as { language?: unknown };
    return normalizeWritingLanguage(parsed.language) ?? "en";
  } catch {
    return "en";
  }
}
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec

export async function resolveDurableStoryProgress(params: {
  readonly bookDir: string;
}): Promise<number> {
  const chaptersDir = join(params.bookDir, "chapters");
  let indexNumbers: number[];
  let fileNumbers: number[];
  try {
    const [indexRaw, entries] = await Promise.all([
      readFile(join(chaptersDir, "index.json"), "utf-8"),
      readdir(chaptersDir),
    ]);
    const parsed = JSON.parse(indexRaw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Chapter index must be an array.");
    indexNumbers = parsed.map((entry) => {
      const number = (entry as { number?: unknown })?.number;
      if (!Number.isInteger(number) || (number as number) <= 0) throw new Error("Chapter index contains an invalid number.");
      return number as number;
    });
    fileNumbers = entries.flatMap((entry) => {
      const match = /^(\d+)_/u.exec(entry);
      return match ? [Number.parseInt(match[1]!, 10)] : [];
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
  const indexed = new Set(indexNumbers);
  const files = new Set(fileNumbers);
  const orphaned = [...files].filter((number) => !indexed.has(number));
  const missing = [...indexed].filter((number) => !files.has(number));
  if (orphaned.length > 0 || missing.length > 0) {
    throw new Error(`Chapter index/files disagree (orphaned=${orphaned.join(",") || "none"}; missing=${missing.join(",") || "none"}).`);
  }
  return resolveContiguousChapterPrefix(indexNumbers);
}

export function resolveContiguousChapterPrefix(chapterNumbers: ReadonlyArray<number>): number {
  const chapters = new Set(
    chapterNumbers.filter((chapter): chapter is number => Number.isInteger(chapter) && chapter > 0),
  );
  let contiguousChapter = 0;
  while (chapters.has(contiguousChapter + 1)) contiguousChapter += 1;
  return contiguousChapter;
}
