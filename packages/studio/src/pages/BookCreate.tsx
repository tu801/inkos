import { useEffect, useState } from "react";
import { BookPlus, CheckCircle2 } from "lucide-react";
import { fetchJson, useApi } from "../hooks/use-api";
import type { Theme } from "../hooks/use-theme";
import type { TFunction } from "../hooks/use-i18n";
import { useColors } from "../hooks/use-colors";

interface Nav {
  toDashboard: () => void;
  toBook: (id: string) => void;
}

interface PlatformOption {
  readonly value: string;
  readonly label: string;
}

export interface BookCreateFormState {
  readonly title: string;
  readonly genre: string;
  readonly platform: string;
  readonly targetChapters: string;
  readonly chapterWordCount: string;
  readonly brief: string;
}

export interface BookCreatePayload {
  readonly title: string;
  readonly genre: string;
  readonly platform: string;
  readonly language: "zh" | "en" | "vi";
  readonly targetChapters: number;
  readonly chapterWordCount: number;
  readonly blurb: string;
}

interface PlatformCopy {
  readonly heading: string;
  readonly hint: string;
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly genreLabel: string;
  readonly genrePlaceholder: string;
  readonly platformLabel: string;
  readonly targetChaptersLabel: string;
  readonly chapterWordCountLabel: string;
  readonly briefLabel: string;
  readonly briefPlaceholder: string;
  readonly createBook: string;
  readonly creatingBook: string;
  readonly creationStatus: string;
  readonly creationSteps: ReadonlyArray<string>;
}

const PLATFORMS_ZH: ReadonlyArray<PlatformOption> = [
  { value: "tomato", label: "番茄小说" },
  { value: "qidian", label: "起点中文网" },
  { value: "feilu", label: "飞卢" },
  { value: "other", label: "其他" },
];

const PLATFORMS_EN: ReadonlyArray<PlatformOption> = [
  { value: "royal-road", label: "Royal Road" },
  { value: "kindle-unlimited", label: "Kindle Unlimited" },
  { value: "scribble-hub", label: "Scribble Hub" },
  { value: "other", label: "Other" },
];

const PAGE_COPY: Record<"zh" | "en", PlatformCopy> = {
  zh: {
    heading: "创建长篇 Work",
    hint: "这里提交的是明确建书动作。想先讨论和完善方向，请回到 Studio Chat 自然交流，确认卡会携带同一份结构化建书参数。",
    titleLabel: "书名",
    titlePlaceholder: "例如：夜港账本",
    genreLabel: "题材 / 类型",
    genrePlaceholder: "例如：都市悬疑、玄幻、科幻、女频情感",
    platformLabel: "目标平台",
    targetChaptersLabel: "目标章数",
    chapterWordCountLabel: "每章字数",
    briefLabel: "故事简介 / 核心设定",
    briefPlaceholder: "写清世界观、主角、目标、核心冲突和第一阶段方向。",
    createBook: "创建书籍",
    creatingBook: "创建中…",
    creationStatus: "正在创建 Work，完成后会自动进入工作台。",
    creationSteps: ["保存 Work 配置", "生成基础设定", "登记创作资产"],
  },
  en: {
    heading: "Create a long-form Work",
    hint: "This surface submits an explicit creation action. Use Studio Chat to discuss the direction first; its confirmation card carries the same typed creation parameters.",
    titleLabel: "Title",
    titlePlaceholder: "Example: Ledger of the Night Port",
    genreLabel: "Genre",
    genrePlaceholder: "Example: mystery, urban fantasy, sci-fi, romance",
    platformLabel: "Target platform",
    targetChaptersLabel: "Target chapters",
    chapterWordCountLabel: "Words per chapter",
    briefLabel: "Story brief / core premise",
    briefPlaceholder: "Include the world, protagonist, goal, core conflict, and first arc direction.",
    createBook: "Create book",
    creatingBook: "Creating…",
    creationStatus: "Creating the Work. Its workspace will open when the artifact is ready.",
    creationSteps: ["Saving Work config", "Generating foundation", "Registering artifacts"],
  },
};

export function pickValidValue(current: string, available: ReadonlyArray<string>): string {
  return current && available.includes(current) ? current : available[0] ?? "";
}

export function defaultChapterWordsForLanguage(language: "zh" | "en" | "vi"): string {
  return language === "zh" ? "3000" : "2000";
}

<<<<<<< HEAD
export function platformOptionsForLanguage(language: "zh" | "en" | "vi"): ReadonlyArray<PlatformOption> {
  return language === "zh" ? PLATFORMS_ZH : PLATFORMS_EN;
}

=======
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
export function defaultBookCreateForm(language: "zh" | "en" | "vi"): BookCreateFormState {
  return {
    title: "",
    genre: "",
    platform: platformOptionsForLanguage(language)[0]?.value ?? "other",
    targetChapters: "200",
    chapterWordCount: defaultChapterWordsForLanguage(language),
    brief: "",
  };
}

<<<<<<< HEAD
=======
export function platformOptionsForLanguage(language: "zh" | "en" | "vi"): ReadonlyArray<PlatformOption> {
  return language === "zh" ? PLATFORMS_ZH : PLATFORMS_EN;
}

>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
function parsePositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isBookCreateFormReady(form: BookCreateFormState): boolean {
  return Boolean(
    form.title.trim()
      && form.genre.trim()
      && form.platform.trim()
      && form.brief.trim()
      && parsePositiveInteger(form.targetChapters)
      && parsePositiveInteger(form.chapterWordCount),
  );
}

<<<<<<< HEAD
export function buildBookCreatePayload(form: BookCreateFormState, language: "zh" | "en" | "vi"): BookCreatePayload {
=======
export function buildBookCreatePayload(
  form: BookCreateFormState,
  language: "zh" | "en" | "vi",
): BookCreatePayload {
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  const targetChapters = parsePositiveInteger(form.targetChapters);
  const chapterWordCount = parsePositiveInteger(form.chapterWordCount);
  if (!targetChapters || !chapterWordCount || !isBookCreateFormReady(form)) {
    throw new Error(language === "zh" ? "请先补齐建书表单。" : "Complete the book creation form first.");
  }
  return {
    title: form.title.trim(),
    genre: form.genre.trim(),
    platform: form.platform.trim(),
    language,
    targetChapters,
    chapterWordCount,
    blurb: form.brief.trim(),
  };
}

<<<<<<< HEAD
=======
export function resolveDraftInstruction(input: string, _hasDraft: boolean): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed;
}

// The story core that must be present to create. Length
// (targetChapters/chapterWordCount) is a run parameter with editable defaults,
// so it never gates creation — it's only shown in the basics stage. Mirrors
// missingCoreDraftFields in core/interaction/project-tools.ts.
export function canCreateFromDraft(draft?: BookCreationDraft): boolean {
  if (!draft) {
    return false;
  }
  return Boolean(
    draft.title?.trim()
      && draft.genre?.trim()
      && draft.platform?.trim()
      && draft.worldPremise?.trim()
      && draft.protagonist?.trim()
      && draft.conflictCore?.trim(),
  );
}

const DRAFT_STAGE_LABELS: Record<"zh" | "en", Record<string, string>> = {
  zh: {
    basic: "基础信息",
    world: "世界观与规则",
    characters: "主角与角色",
    conflict: "冲突与回报",
    structure: "结构与写作约束",
    title: "书名",
    genre: "题材",
    platform: "平台",
    language: "语言",
    targetChapters: "目标章数",
    chapterWordCount: "每章字数",
    worldPremise: "世界观",
    settingNotes: "设定补充",
    protagonist: "主角",
    supportingCast: "配角",
    conflictCore: "核心冲突",
    blurb: "简介",
    authorIntent: "作者意图",
    volumeOutline: "卷纲方向",
    currentFocus: "当前重点",
    constraints: "写作约束",
  },
  en: {
    basic: "Basics",
    world: "World & Rules",
    characters: "Protagonist & Cast",
    conflict: "Conflict & Payoff",
    structure: "Structure & Constraints",
    title: "Title",
    genre: "Genre",
    platform: "Platform",
    language: "Language",
    targetChapters: "Target Chapters",
    chapterWordCount: "Words per Chapter",
    worldPremise: "World",
    settingNotes: "Setting Notes",
    protagonist: "Protagonist",
    supportingCast: "Supporting Cast",
    conflictCore: "Core Conflict",
    blurb: "Blurb",
    authorIntent: "Author Intent",
    volumeOutline: "Volume Direction",
    currentFocus: "Current Focus",
    constraints: "Constraints",
  },
};

const DRAFT_STAGE_FIELDS: ReadonlyArray<{
  readonly key: string;
  readonly fields: ReadonlyArray<keyof BookCreationDraft>;
}> = [
  { key: "basic", fields: ["title", "genre", "platform", "targetChapters", "chapterWordCount", "language"] },
  { key: "world", fields: ["worldPremise", "settingNotes"] },
  { key: "characters", fields: ["protagonist", "supportingCast"] },
  { key: "conflict", fields: ["conflictCore", "blurb", "authorIntent"] },
  { key: "structure", fields: ["volumeOutline", "currentFocus", "constraints"] },
];

function draftValueAsText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function buildCreationDraftStages(
  draft: BookCreationDraft,
  language: "zh" | "en" | "vi",
): ReadonlyArray<DraftSummaryStage> {
  const labels = DRAFT_STAGE_LABELS[language === "zh" ? "zh" : "en"];
  const missingSet = new Set(draft.missingFields ?? []);

  return DRAFT_STAGE_FIELDS.map((stage) => {
    const rows: DraftSummaryRow[] = [];
    for (const field of stage.fields) {
      const value = draftValueAsText(draft[field]);
      if (value) {
        rows.push({ key: String(field), label: labels[field] ?? String(field), value });
      }
    }
    const missing = stage.fields
      .filter((field) => missingSet.has(field))
      .map((field) => labels[field] ?? String(field));
    const status = rows.length === 0
      ? "missing"
      : missing.length > 0
        ? "partial"
        : "complete";

    return {
      key: stage.key,
      label: labels[stage.key] ?? stage.key,
      status,
      rows,
      missing,
    };
  });
}

export function buildCreationDraftSummary(
  draft: BookCreationDraft,
  language: "zh" | "en" | "vi",
): ReadonlyArray<DraftSummaryRow> {
  const rows = language !== "zh"
    ? [
        draft.title ? { key: "title", label: "Title", value: draft.title } : undefined,
        draft.worldPremise ? { key: "worldPremise", label: "World", value: draft.worldPremise } : undefined,
        draft.protagonist ? { key: "protagonist", label: "Protagonist", value: draft.protagonist } : undefined,
        draft.conflictCore ? { key: "conflictCore", label: "Core Conflict", value: draft.conflictCore } : undefined,
        draft.volumeOutline ? { key: "volumeOutline", label: "Volume Direction", value: draft.volumeOutline } : undefined,
        draft.blurb ? { key: "blurb", label: "Blurb", value: draft.blurb } : undefined,
        draft.nextQuestion ? { key: "nextQuestion", label: "Next", value: draft.nextQuestion } : undefined,
      ]
    : [
        draft.title ? { key: "title", label: "书名", value: draft.title } : undefined,
        draft.worldPremise ? { key: "worldPremise", label: "世界观", value: draft.worldPremise } : undefined,
        draft.protagonist ? { key: "protagonist", label: "主角", value: draft.protagonist } : undefined,
        draft.conflictCore ? { key: "conflictCore", label: "核心冲突", value: draft.conflictCore } : undefined,
        draft.volumeOutline ? { key: "volumeOutline", label: "卷纲方向", value: draft.volumeOutline } : undefined,
        draft.blurb ? { key: "blurb", label: "简介", value: draft.blurb } : undefined,
        draft.nextQuestion ? { key: "nextQuestion", label: "下一步", value: draft.nextQuestion } : undefined,
      ];

  return rows.filter((row): row is DraftSummaryRow => Boolean(row));
}

>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
interface WaitForBookReadyOptions {
  readonly fetchBook?: (bookId: string) => Promise<unknown>;
  readonly fetchStatus?: (bookId: string) => Promise<{ status: string; error?: string }>;
  readonly maxAttempts?: number;
  readonly delayMs?: number;
  readonly waitImpl?: (ms: number) => Promise<void>;
}

export async function waitForBookReady(bookId: string, options: WaitForBookReadyOptions = {}): Promise<void> {
  const fetchBook = options.fetchBook ?? ((id: string) => fetchJson(`/books/${id}`));
  const fetchStatus = options.fetchStatus ?? ((id: string) => fetchJson<{ status: string; error?: string }>(`/books/${id}/create-status`));
  const maxAttempts = options.maxAttempts ?? 120;
  const delayMs = options.delayMs ?? 250;
  const waitImpl = options.waitImpl ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  let lastKnownStatus: string | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await fetchBook(bookId);
      return;
    } catch (error) {
      lastError = error;
      try {
        const result = await fetchStatus(bookId);
        lastKnownStatus = result.status;
        if (result.status === "error") throw new Error(result.error ?? `Book "${bookId}" failed to create`);
      } catch (statusError) {
        if (statusError instanceof Error && statusError.message !== "404 Not Found") throw statusError;
      }
      if (attempt === maxAttempts - 1 && lastKnownStatus !== "creating") throw error;
      if (attempt < maxAttempts - 1) await waitImpl(delayMs);
    }
  }
  if (lastKnownStatus === "creating") {
    throw new Error(`Book "${bookId}" is still being created. Wait a moment and refresh.`);
  }
  throw lastError instanceof Error ? lastError : new Error(`Book "${bookId}" was not ready`);
}

export function BookCreate({ nav, theme, t: _t }: { nav: Nav; theme: Theme; t: TFunction }) {
  const c = useColors(theme);
  const { data: project } = useApi<{ language: string }>("/project");
<<<<<<< HEAD
  const projectLang = project?.language === "en" || project?.language === "vi" ? project.language : "zh";
  const copy = PAGE_COPY[projectLang === "zh" ? "zh" : "en"];
=======
  const projectLang = (project?.language === "en" || project?.language === "vi" ? project.language : "zh") as "zh" | "en" | "vi";
  const uiLang = projectLang === "zh" ? "zh" : "en";
  const copy = PAGE_COPY[uiLang];
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  const platformChoices = platformOptionsForLanguage(projectLang);
  const [form, setForm] = useState<BookCreateFormState>(() => defaultBookCreateForm(projectLang));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      platform: pickValidValue(current.platform, platformOptionsForLanguage(projectLang).map((option) => option.value)),
      chapterWordCount: current.chapterWordCount || defaultChapterWordsForLanguage(projectLang),
    }));
  }, [projectLang]);

  const updateForm = (patch: Partial<BookCreateFormState>) => setForm((current) => ({ ...current, ...patch }));

  const create = async () => {
    if (!isBookCreateFormReady(form)) return;
    setCreating(true);
    setError(null);
    setStatus(copy.creationStatus);
    try {
      const data = await fetchJson<{ bookId?: string }>("/books/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBookCreatePayload(form, projectLang)),
      });
      if (!data.bookId) throw new Error(projectLang === "zh" ? "创建动作没有返回 Work ID。" : "Creation did not return a Work ID.");
      await waitForBookReady(data.bookId);
      nav.toBook(data.bookId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus(null);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl font-semibold">{copy.heading}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{copy.hint}</p>
        </header>
        <section className="space-y-5 rounded-xl border border-border/60 bg-card/80 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{copy.titleLabel}</span>
              <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} className={`w-full ${c.input} rounded-md px-3 py-2.5 text-sm focus:outline-none`} placeholder={copy.titlePlaceholder} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{copy.genreLabel}</span>
              <input value={form.genre} onChange={(event) => updateForm({ genre: event.target.value })} className={`w-full ${c.input} rounded-md px-3 py-2.5 text-sm focus:outline-none`} placeholder={copy.genrePlaceholder} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{copy.platformLabel}</span>
              <select value={form.platform} onChange={(event) => updateForm({ platform: event.target.value })} className={`w-full ${c.input} rounded-md bg-background px-3 py-2.5 text-sm focus:outline-none`}>
                {platformChoices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{copy.targetChaptersLabel}</span>
              <input type="number" min={1} value={form.targetChapters} onChange={(event) => updateForm({ targetChapters: event.target.value })} className={`w-full ${c.input} rounded-md px-3 py-2.5 text-sm focus:outline-none`} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{copy.chapterWordCountLabel}</span>
              <input type="number" min={1} value={form.chapterWordCount} onChange={(event) => updateForm({ chapterWordCount: event.target.value })} className={`w-full ${c.input} rounded-md px-3 py-2.5 text-sm focus:outline-none`} />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">{copy.briefLabel}</span>
            <textarea value={form.brief} onChange={(event) => updateForm({ brief: event.target.value })} rows={10} className={`w-full ${c.input} resize-y rounded-md px-3 py-3 text-sm leading-7 focus:outline-none`} placeholder={copy.briefPlaceholder} />
          </label>
          {creating ? <div className="grid gap-2 sm:grid-cols-3">{copy.creationSteps.map((step) => <div key={step} className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><CheckCircle2 size={14} /><span>{step}</span></div>)}</div> : null}
          {status ? <p className="text-sm text-primary">{status}</p> : null}
          {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <button onClick={create} disabled={!isBookCreateFormReady(form) || creating} className={`inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-medium disabled:opacity-50 ${c.btnPrimary}`}>
            <BookPlus size={16} />
            {creating ? copy.creatingBook : copy.createBook}
          </button>
        </section>
      </div>
    </div>
  );
}
