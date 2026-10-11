import { BaseAgent } from "./base.js";
import {renderChapterDocument} from '../utils/chapter-document.js';
import type { BookConfig } from "../models/book.js";
import type { BookRules } from "../models/book-rules.js";
import { buildWriterSystemPrompt } from "./writer-prompts.js";
import { buildSettlerSystemPrompt, buildSettlerUserPrompt } from "./settler-prompts.js";
import { createSettlementToolSchema } from "./settler-tool.js";
import { ChapterDraftToolSchema } from "./writer-tool.js";
import { readBookRules } from "./rules-reader.js";
import type { ChapterIntent, ChapterMemo, ContextPackage } from "../models/input-governance.js";
import type { LengthSpec } from "../models/length-governance.js";
<<<<<<< HEAD
import type { ChapterMeta } from "../models/chapter.js";
import { RuntimeStateDeltaSchema, type RuntimeStateDelta } from "../models/runtime-state.js";
=======
import type { RuntimeStateDelta } from "../models/runtime-state.js";
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
import { buildLengthSpec, countChapterLength, resolveLengthCountingMode } from "../utils/length-metrics.js";
import {
  buildRuntimeStateArtifacts,
  buildRuntimeStateArtifactsFromSnapshot,
  loadRuntimeStateSnapshot,
  loadRuntimeStateSnapshotAtChapter,
  type RuntimeStateArtifacts,
} from "../state/runtime-state-store.js";
import type { RuntimeStateSnapshot } from "../state/state-reducer.js";
import { renderMemoAsNarrativeBlock, renderNarrativeSelectedContext } from "../utils/narrative-control.js";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { commitAtomicFileSet, type AtomicFileWrite } from "../utils/atomic-file-set.js";
import {
  renderChapterSummariesProjection,
  renderCurrentStateProjection,
  renderHooksProjection,
} from "../state/state-projections.js";


export interface WriteChapterInput {
  readonly book: BookConfig;
  readonly bookDir: string;
  readonly chapterNumber: number;
  readonly externalContext?: string;
  readonly chapterIntent: string;
  readonly chapterMemo: ChapterMemo;
  readonly chapterIntentData?: ChapterIntent;
  readonly contextPackage: ContextPackage;
  readonly lengthSpec?: LengthSpec;
  readonly wordCountOverride?: number;
  readonly temperatureOverride?: number;
}

export interface SettleChapterStateInput {
  readonly book: BookConfig;
  readonly bookDir: string;
  readonly chapterNumber: number;
  readonly title: string;
  readonly content: string;
  readonly allowReapply?: boolean;
  readonly allowNewHooks?: boolean;
  readonly baselineChapter?: number;
  readonly chapterIntent: string;
  readonly contextPackage: ContextPackage;
  readonly validationFeedback?: string;
}

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface WriteChapterOutput {
  readonly chapterNumber: number;
  readonly title: string;
  readonly content: string;
  readonly wordCount: number;
  readonly postSettlement: string;
  readonly runtimeStateDelta: RuntimeStateDelta;
  readonly runtimeStateSnapshot: RuntimeStateSnapshot;
  readonly updatedState: string;
  readonly updatedHooks: string;
  readonly updatedChapterSummaries: string;
  readonly runtimeStateApplied: boolean;
  readonly tokenUsage?: TokenUsage;
}

export class WriterAgent extends BaseAgent {
  get name(): string {
    return "writer";
  }

  private localize(language: "zh" | "en" | "vi", messages: { zh: string; en: string }): string {
    return language !== "zh" ? messages.en : messages.zh;
  }

  private logInfo(language: "zh" | "en" | "vi", messages: { zh: string; en: string }): void {
    this.ctx.logger?.info(this.localize(language, messages));
  }

  private logWarn(language: "zh" | "en" | "vi", messages: { zh: string; en: string }): void {
    this.ctx.logger?.warn(this.localize(language, messages));
  }

  async writeChapter(input: WriteChapterInput): Promise<WriteChapterOutput> {
    const { book, bookDir, chapterNumber } = input;

    const [styleGuide, runtimeSnapshot] = await Promise.all([
      this.readFileOrDefault(join(bookDir, "story/style_guide.md")),
      loadRuntimeStateSnapshot(bookDir),
    ]);

    const parsedBookRules = await readBookRules(bookDir);
    const bookRules = parsedBookRules.rules;
    const bookRulesBody = parsedBookRules.body;

    const resolvedLanguage = book.language;
    const targetWords = input.lengthSpec?.target ?? input.wordCountOverride ?? book.chapterWordCount;
<<<<<<< HEAD
    const resolvedLengthSpec = input.lengthSpec ?? buildLengthSpec(targetWords, resolvedLanguage, book);
    if (!input.chapterIntent || !input.chapterMemo || !input.contextPackage) {
      throw new Error("Writer requires governed chapter intent, memo, and context package.");
    }
=======
    const resolvedLengthSpec = input.lengthSpec ?? buildLengthSpec(targetWords, resolvedLanguage);
    const governedMemoryBlocks = input.contextPackage
      ? buildGovernedMemoryEvidenceBlocks(input.contextPackage, resolvedLanguage)
      : undefined;
    const englishVarianceBrief = resolvedLanguage !== "zh"
      ? await buildEnglishVarianceBrief({
          bookDir,
          chapterNumber,
        })
      : null;

    // Build fanfic context if fanfic_canon.md exists
    const fanficContext: FanficContext | undefined = hasFanficCanon && bookRules?.fanficMode
      ? {
          fanficCanon: fanficCanonRaw,
          fanficMode: bookRules.fanficMode,
          allowedDeviations: bookRules.allowedDeviations ?? [],
        }
      : undefined;

>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    // ── Phase 1: Creative writing (temperature 0.7) ──
    const creativeSystemPrompt = buildWriterSystemPrompt(
      book, bookRules, bookRulesBody, styleGuide,
      resolvedLanguage,
      resolvedLengthSpec,
    );

    const creativeUserPrompt = this.buildGovernedUserPrompt({
      chapterNumber,
      chapterMemo: input.chapterMemo,
      chapterIntentData: input.chapterIntentData,
      contextPackage: input.contextPackage,
      externalContext: input.externalContext,
      lengthSpec: resolvedLengthSpec,
      language: book.language,
    });

    const creativeTemperature = input.temperatureOverride ?? 0.7;

    this.logInfo(resolvedLanguage, {
      zh: `阶段 1：创作正文（第${chapterNumber}章）`,
      en: `Phase 1: creative writing for chapter ${chapterNumber}`,
    });

    const { result: creativeSubmission, usage: creativeUsage } = await this.submitStructured(
      [
        { role: "system", content: creativeSystemPrompt },
        { role: "user", content: creativeUserPrompt },
      ],
      {
        name: "submit_chapter_draft",
        label: resolvedLanguage === "en" ? "Submit chapter draft" : "提交章节初稿",
        description: resolvedLanguage === "en"
          ? "Submit the complete chapter title and prose."
          : "提交完整的章节标题和正文。",
        parameters: ChapterDraftToolSchema,
      },
      { temperature: creativeTemperature },
    );
    const creative = {
      title: creativeSubmission.title.trim(),
      content: creativeSubmission.content.trim(),
      wordCount: countChapterLength(creativeSubmission.content, resolvedLengthSpec.countingMode),
    };

    // ── Phase 2: State settlement (temperature 0.3) ──
    this.logInfo(resolvedLanguage, {
      zh: `阶段 2：状态结算（第${chapterNumber}章，${creative.wordCount}字）`,
      en: `Phase 2: state settlement for chapter ${chapterNumber} (${creative.wordCount} words)`,
    });
    const settleResult = await this.settle({
      book,
      bookDir,
      bookRules,
      language: resolvedLanguage,
      chapterNumber,
      title: creative.title,
      content: creative.content,
      chapterIntent: input.chapterIntent,
      contextPackage: input.contextPackage,
      validationFeedback: undefined,
      baselineSnapshot: runtimeSnapshot,
    });
    const settlement = settleResult.settlement;
    const settleUsage = settleResult.usage;
    const runtimeStateArtifacts = await this.buildRuntimeStateArtifactsIfPresent(
      bookDir,
      settlement.runtimeStateDelta,
      resolvedLanguage,
      chapterNumber,
    );
    const resolvedRuntimeStateDelta = runtimeStateArtifacts?.resolvedDelta ?? settlement.runtimeStateDelta;

    // ── Merge into WriteChapterOutput ──
    const tokenUsage: TokenUsage = {
      promptTokens: creativeUsage.promptTokens + settleUsage.promptTokens,
      completionTokens: creativeUsage.completionTokens + settleUsage.completionTokens,
      totalTokens: creativeUsage.totalTokens + settleUsage.totalTokens,
    };

    return {
      chapterNumber,
      title: creative.title,
      content: creative.content,
      wordCount: creative.wordCount,
      postSettlement: settlement.postSettlement,
      runtimeStateDelta: resolvedRuntimeStateDelta,
      runtimeStateSnapshot: runtimeStateArtifacts.snapshot,
      updatedState: runtimeStateArtifacts.currentStateMarkdown,
      updatedHooks: runtimeStateArtifacts.hooksMarkdown,
      updatedChapterSummaries: runtimeStateArtifacts.chapterSummariesMarkdown,
      runtimeStateApplied: true,
      tokenUsage,
    };
  }

  async settleChapterState(input: SettleChapterStateInput): Promise<WriteChapterOutput> {
    const runtimeSnapshot = await (input.baselineChapter === undefined
        ? loadRuntimeStateSnapshot(input.bookDir)
        : loadRuntimeStateSnapshotAtChapter({
            bookDir: input.bookDir,
            chapterNumber: input.baselineChapter,
            language: input.book.language,
          }));

    const parsedBookRules = await readBookRules(input.bookDir);
    const bookRules = parsedBookRules.rules;
    const resolvedLanguage = input.book.language;

    const settleResult = await this.settle({
      book: input.book,
      bookDir: input.bookDir,
      bookRules,
      language: resolvedLanguage,
      chapterNumber: input.chapterNumber,
      title: input.title,
      content: input.content,
      chapterIntent: input.chapterIntent,
      contextPackage: input.contextPackage,
      validationFeedback: input.validationFeedback,
      baselineSnapshot: runtimeSnapshot,
      allowNewHooks: input.allowNewHooks,
    });
    const settlement = settleResult.settlement;
    const runtimeStateArtifacts = await this.buildRuntimeStateArtifactsIfPresent(
      input.bookDir,
      settlement.runtimeStateDelta,
      resolvedLanguage,
      input.chapterNumber,
      input.allowReapply,
      input.baselineChapter,
      input.allowNewHooks,
    );

    return {
      chapterNumber: input.chapterNumber,
      title: input.title,
      content: input.content,
      wordCount: countChapterLength(
        input.content,
        resolveLengthCountingMode(resolvedLanguage),
      ),
      postSettlement: settlement.postSettlement,
      runtimeStateDelta: runtimeStateArtifacts?.resolvedDelta ?? settlement.runtimeStateDelta,
      runtimeStateSnapshot: runtimeStateArtifacts.snapshot,
      updatedState: runtimeStateArtifacts.currentStateMarkdown,
      updatedHooks: runtimeStateArtifacts.hooksMarkdown,
      updatedChapterSummaries: runtimeStateArtifacts.chapterSummariesMarkdown,
      runtimeStateApplied: true,
      tokenUsage: settleResult.usage,
    };
  }

  private async settle(params: {
    readonly book: BookConfig;
    readonly bookDir: string;
    readonly bookRules: BookRules | null;
    readonly language: "zh" | "en" | "vi";
    readonly chapterNumber: number;
    readonly title: string;
    readonly content: string;
    readonly chapterIntent: string;
    readonly contextPackage: ContextPackage;
    readonly validationFeedback?: string;
    readonly baselineSnapshot: RuntimeStateSnapshot;
    readonly allowNewHooks?: boolean;
  }): Promise<{
    settlement: {
      readonly postSettlement: string;
      readonly runtimeStateDelta: RuntimeStateDelta;
      readonly updatedState: string;
      readonly updatedHooks: string;
    };
    usage: TokenUsage;
  }> {
    const resolvedLang = params.language;
    this.logInfo(resolvedLang, {
      zh: `阶段 2：把第${params.chapterNumber}章事实投影到运行时状态`,
      en: `Phase 2: projecting chapter ${params.chapterNumber} facts into runtime state`,
    });
    const systemPrompt = buildSettlerSystemPrompt(params.book, params.bookRules, resolvedLang);
    const governedControlBlock = this.buildSettlerGovernedControlBlock(
      params.chapterIntent,
      params.contextPackage,
      resolvedLang,
    );
    const userPrompt = buildSettlerUserPrompt({
      chapterNumber: params.chapterNumber,
      title: params.title,
      content: params.content,
      governedControlBlock,
      validationFeedback: params.validationFeedback,
      language: resolvedLang,
    }) + `\n\n## Settlement baseline\nApply the delta to this exact baseline. Existing hook operations may name only its hook IDs. Later projections in retrieved context are references, not the baseline to be mutated.\n${JSON.stringify({ chapter: params.baselineSnapshot.manifest.lastAppliedChapter, currentState: params.baselineSnapshot.currentState, hooks: params.baselineSnapshot.hooks, allowNewHooks: params.allowNewHooks ?? true })}`;
    const knownHookIds = new Set(params.baselineSnapshot.hooks.hooks.map((hook) => hook.hookId));
    const { result, usage } = await this.submitStructured(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        name: "submit_runtime_state_delta",
        label: resolvedLang === "en" ? "Submit runtime state delta" : "提交运行时状态变更",
        description: resolvedLang === "en"
          ? "Submit only chapter-grounded incremental state changes. The host owns the chapter number."
          : "只提交正文有证据的增量状态变更；章节号由宿主持有。",
        parameters: createSettlementToolSchema(params.allowNewHooks),
        validate: (value) => validateSettlementHookIds(value, knownHookIds),
      },
      { temperature: 0.3, maxTokens: Math.min(16384, this.ctx.client.defaults.maxTokens) },
    );
    const runtimeStateDelta = RuntimeStateDeltaSchema.parse({
      chapter: params.chapterNumber,
      factOps: {
        upsert: result.factOps.upsert,
        expire: result.factOps.expire,
      },
      hookOps: {
        upsert: result.hookOps.upsert,
        mention: result.hookOps.mention,
        resolve: result.hookOps.resolve,
        defer: result.hookOps.defer,
      },
      newHookCandidates: result.newHookCandidates,
      chapterSummary: {
        chapter: params.chapterNumber,
        title: result.chapterSummary.title,
        characters: result.chapterSummary.characters,
        events: result.chapterSummary.events,
        stateChanges: result.chapterSummary.stateChanges,
        hookActivity: result.chapterSummary.hookActivity,
        mood: result.chapterSummary.mood,
        chapterType: result.chapterSummary.chapterType,
      },
    });

    return {
      settlement: {
        postSettlement: result.postSettlement,
        runtimeStateDelta,
        updatedState: "",
        updatedHooks: "",
      },
      usage,
    };
  }
  async saveChapter(
    bookDir: string,
    output: WriteChapterOutput,
<<<<<<< HEAD
    language: "zh" | "en" | "vi" = "zh",
    chapterIndex?: ReadonlyArray<ChapterMeta>,
=======
    numericalSystem: boolean = true,
    language: "zh" | "en" | "vi" = "zh",
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  ): Promise<void> {
    const chaptersDir = join(bookDir, "chapters");
    await mkdir(chaptersDir, { recursive: true });

    const paddedNum = String(output.chapterNumber).padStart(4, "0");
    const filename = `${paddedNum}_${this.sanitizeFilename(output.title)}.md`;
    let existingChapterFiles: string[] = [];
    try {
      existingChapterFiles = await readdir(chaptersDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const supersededChapterFiles = existingChapterFiles
      .filter((file) => file.startsWith(`${paddedNum}_`) && file.endsWith(".md") && file !== filename);

<<<<<<< HEAD
    const chapterContent = renderChapterDocument(output.chapterNumber,output.title,output.content,language);
=======
    const heading = language === "vi"
      ? `# Chương ${output.chapterNumber}: ${output.title}`
      : language !== "zh"
        ? `# Chapter ${output.chapterNumber}: ${output.title}`
        : `# 第${output.chapterNumber}章 ${output.title}`;
    const chapterContent = [
      heading,
      "",
      output.content,
    ].join("\n");
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    const runtimeStateArtifacts = await this.resolveRuntimeStateArtifactsForOutput(
      bookDir,
      output,
      language,
    );
    const chapterSummariesMarkdown = runtimeStateArtifacts.chapterSummariesMarkdown;

    const writes: AtomicFileWrite[] = [
      { relativePath: join("chapters", filename), content: chapterContent },
      {
        relativePath: join("story", "current_state.md"),
        content: runtimeStateArtifacts.currentStateMarkdown,
      },
      {
        relativePath: join("story", "pending_hooks.md"),
        content: runtimeStateArtifacts.hooksMarkdown,
      },
    ];

    writes.push({
      relativePath: join("story", "chapter_summaries.md"),
      content: chapterSummariesMarkdown,
    });

<<<<<<< HEAD
    const runtimeStateSnapshot = runtimeStateArtifacts.snapshot;
    writes.push(
        {
          relativePath: join("story", "state", "manifest.json"),
          content: JSON.stringify(runtimeStateSnapshot.manifest, null, 2),
        },
        {
          relativePath: join("story", "state", "current_state.json"),
          content: JSON.stringify(runtimeStateSnapshot.currentState, null, 2),
        },
        {
          relativePath: join("story", "state", "hooks.json"),
          content: JSON.stringify(runtimeStateSnapshot.hooks, null, 2),
        },
        {
          relativePath: join("story", "state", "chapter_summaries.json"),
          content: JSON.stringify(runtimeStateSnapshot.chapterSummaries, null, 2),
        },
=======
    if (runtimeStateArtifacts?.snapshot ?? output.runtimeStateSnapshot) {
      writes.push(saveRuntimeStateSnapshot(bookDir, runtimeStateArtifacts?.snapshot ?? output.runtimeStateSnapshot!));
    }

    if (numericalSystem) {
      writes.push(
        writeFile(join(storyDir, "particle_ledger.md"), output.updatedLedger, "utf-8"),
      );
    }

    await Promise.all(writes);
  }

  private buildUserPrompt(params: {
    readonly chapterNumber: number;
    readonly storyBible: string;
    readonly currentState: string;
    readonly ledger: string;
    readonly hooks: string;
    readonly recentChapters: string;
    readonly lengthSpec: LengthSpec;
    readonly externalContext?: string;
    readonly chapterSummaries: string;
    readonly subplotBoard: string;
    readonly emotionalArcs: string;
    readonly characterMatrix: string;
    readonly dialogueFingerprints?: string;
    readonly relevantSummaries?: string;
    readonly parentCanon?: string;
    readonly language?: "zh" | "en" | "vi";
  }): string {
    const currentState = this.capLegacyContext("current_state", params.currentState, LEGACY_WRITER_CONTEXT_BUDGET.currentState);
    const ledger = this.capLegacyContext("particle_ledger", params.ledger, LEGACY_WRITER_CONTEXT_BUDGET.ledger);
    const hooks = this.capLegacyContext("pending_hooks", params.hooks, LEGACY_WRITER_CONTEXT_BUDGET.hooks);
    const chapterSummaries = this.capLegacyContext(
      "chapter_summaries",
      params.chapterSummaries,
      LEGACY_WRITER_CONTEXT_BUDGET.chapterSummaries,
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    );

    const snapshotRoot = join("story", "snapshots", String(output.chapterNumber));
    writes.push(
      { relativePath: join(snapshotRoot, "current_state.md"), content: runtimeStateArtifacts.currentStateMarkdown },
      { relativePath: join(snapshotRoot, "pending_hooks.md"), content: runtimeStateArtifacts.hooksMarkdown },
      { relativePath: join(snapshotRoot, "chapter_summaries.md"), content: chapterSummariesMarkdown },
      { relativePath: join(snapshotRoot, "state", "manifest.json"), content: JSON.stringify(runtimeStateSnapshot.manifest, null, 2) },
      { relativePath: join(snapshotRoot, "state", "current_state.json"), content: JSON.stringify(runtimeStateSnapshot.currentState, null, 2) },
      { relativePath: join(snapshotRoot, "state", "hooks.json"), content: JSON.stringify(runtimeStateSnapshot.hooks, null, 2) },
      { relativePath: join(snapshotRoot, "state", "chapter_summaries.json"), content: JSON.stringify(runtimeStateSnapshot.chapterSummaries, null, 2) },
    );
<<<<<<< HEAD
    if (chapterIndex) {
      writes.push({
        relativePath: join("chapters", "index.json"),
        content: `${JSON.stringify(chapterIndex, null, 2)}\n`,
      });
=======
    const storyBible = this.capLegacyContext("story_bible", params.storyBible, LEGACY_WRITER_CONTEXT_BUDGET.storyBible);
    const parentCanon = params.parentCanon
      ? this.capLegacyContext("parent_canon", params.parentCanon, LEGACY_WRITER_CONTEXT_BUDGET.parentCanon)
      : undefined;
    const contextBlock = params.externalContext
      ? `\n## 外部指令\n以下是来自外部系统的创作指令，请在本章中融入：\n\n${params.externalContext}\n`
      : "";

    const ledgerBlock = ledger
      ? `\n## 资源账本\n${ledger}\n`
      : "";

    const summariesBlock = chapterSummaries !== "(文件尚未创建)"
      ? `\n## 章节摘要（全部历史章节压缩上下文）\n${chapterSummaries}\n`
      : "";

    const subplotBlock = subplotBoard !== "(文件尚未创建)"
      ? `\n## 支线进度板\n${subplotBoard}\n`
      : "";

    const emotionalBlock = emotionalArcs !== "(文件尚未创建)"
      ? `\n## 情感弧线\n${emotionalArcs}\n`
      : "";

    const matrixBlock = characterMatrix !== "(文件尚未创建)"
      ? `\n## 角色交互矩阵\n${characterMatrix}\n`
      : "";

    const fingerprintBlock = params.dialogueFingerprints
      ? `\n## 角色对话指纹\n${params.dialogueFingerprints}\n`
      : "";

    const relevantBlock = params.relevantSummaries
      ? `\n## 相关历史章节摘要\n${params.relevantSummaries}\n`
      : "";

    const canonBlock = parentCanon
      ? `\n## 正传正典参照（番外写作专用）
本书是番外作品。以下正典约束不可违反，角色不得引用超出其信息边界的信息。
${parentCanon}\n`
      : "";
    const lengthRequirementBlock = this.buildLengthRequirementBlock(params.lengthSpec, params.language ?? "zh");

    if (params.language !== "zh") {
      return `Write chapter ${params.chapterNumber}.
${contextBlock}
## Current State
${currentState}
${ledgerBlock}
## Plot Threads
${hooks}
${summariesBlock}${subplotBlock}${emotionalBlock}${matrixBlock}${fingerprintBlock}${relevantBlock}${canonBlock}
## Recent Chapters
${params.recentChapters || "(This is the first chapter, no previous text)"}

## Worldbuilding
${storyBible}

${lengthRequirementBlock}
- Output PRE_WRITE_CHECK first, then the chapter
- Output only PRE_WRITE_CHECK, CHAPTER_TITLE, and CHAPTER_CONTENT blocks`;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    }

    await commitAtomicFileSet({
      rootDir: bookDir,
      writes,
      deletes: supersededChapterFiles.map((file) => join("chapters", file)),
    });
  }

  private buildGovernedUserPrompt(params: {
    readonly chapterNumber: number;
    readonly chapterMemo: ChapterMemo;
    readonly chapterIntentData?: ChapterIntent;
    readonly contextPackage: ContextPackage;
    readonly externalContext?: string;
    readonly lengthSpec: LengthSpec;
    readonly language?: "zh" | "en" | "vi";
<<<<<<< HEAD
=======
    readonly varianceBrief?: string;
    readonly selectedEvidenceBlock?: string;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  }): string {
    const language = params.language ?? "zh";
    // The user's steering docs (author_intent = long-term direction, current_focus =
    // short-term focus) must land as a prominent, binding block near the top — not
    // buried among generic "evidence" entries where the model treats them as optional.
    const DIRECTION_SOURCES = new Set(["story/author_intent.md", "story/current_focus.md"]);
    const directionEntries = params.contextPackage.selectedContext.filter((entry) =>
      DIRECTION_SOURCES.has(entry.source),
    );
    const otherEntries = params.contextPackage.selectedContext.filter((entry) =>
      !DIRECTION_SOURCES.has(entry.source),
    );
    const contextSections = renderNarrativeSelectedContext(otherEntries, language);
    const userDirectionBlock = directionEntries.length > 0
      ? (language !== "zh"
          ? `## User direction (overrides model defaults — must follow)\n${renderNarrativeSelectedContext(directionEntries, language)}\n`
          : `## 用户方向（优先于模型默认，必须遵循）\n${renderNarrativeSelectedContext(directionEntries, language)}\n`)
      : "";

    const lengthRequirementBlock = this.buildLengthRequirementBlock(params.lengthSpec, params.language ?? "zh");
    const chapterContextBlock = this.buildChapterContextBlock(params.externalContext, language);
    const briefNarrative = renderMemoAsNarrativeBlock(params.chapterMemo, params.chapterIntentData, language);

    if (params.language !== "zh") {
      return `Write chapter ${params.chapterNumber}.

${chapterContextBlock}

${userDirectionBlock}
${briefNarrative}

## Selected Context
${contextSections || "(none)"}

${lengthRequirementBlock}
- Submit the complete title and prose through the chapter-draft result tool.`;
    }

    return `请续写第${params.chapterNumber}章。

${chapterContextBlock}

${userDirectionBlock}
${briefNarrative}

## 已选上下文
${contextSections || "(无)"}

${lengthRequirementBlock}
- 通过章节初稿结果工具提交完整标题和正文。`;
  }

  private buildChapterContextBlock(externalContext: string | undefined, language: "zh" | "en" | "vi"): string {
    const trimmed = externalContext?.trim();
    if (!trimmed) return "";
    if (language !== "zh") {
      return `## Per-chapter user instruction (highest priority)
${trimmed}

Obey this direct instruction for the current chapter. If it specifies a chapter title, submit that title exactly. Keep continuity, but do not replace this instruction with the outline fallback.`;
    }
    return `## 本章用户指令（最高优先级）
${trimmed}

这是用户对当前章节的直接指令。若其中指定章节标题，结果工具中的标题必须原样使用。保持连续性，但不要用卷纲兜底替换这条指令。`;
  }

  private buildSettlerGovernedControlBlock(
    chapterIntent: string,
    contextPackage: ContextPackage,
<<<<<<< HEAD
=======
    ruleStack: RuleStack,
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    language: "zh" | "en" | "vi",
  ): string {
    const selectedContext = renderNarrativeSelectedContext(contextPackage.selectedContext, language)
      .replace(/^### /gm, "- ");

    if (language !== "zh") {
      return `\n## Chapter Control Inputs
${chapterIntent}

### Selected Context
${selectedContext || "- none"}\n`;
    }

    return `\n## 本章控制输入
${chapterIntent}

### 已选上下文
${selectedContext || "- none"}\n`;
  }

<<<<<<< HEAD
  private buildLengthRequirementBlock(lengthSpec: LengthSpec, language: "zh" | "en" | "vi"): string {
    const bounds=[
      ...(lengthSpec.minChapterLength!==undefined?[`Minimum: ${lengthSpec.minChapterLength}`]:[]),
      ...(lengthSpec.maxChapterLength!==undefined?[`Maximum: ${lengthSpec.maxChapterLength}`]:[]),
    ];
=======
  /**
   * Soft-check that the LLM's PRE_WRITE_CHECK output references the three
   * non-negotiable memo sections: 当前任务, 不要做, 章尾必须发生的改变.
   *
   * This is NOT a hard gate — the memo was already parse-validated in the
   * planner, and the writer prompt already tells the LLM to align to memo.
   * We only warn when the LLM skipped a section, so the chapter still ships.
   */
  private verifyPreWriteCheckAlignsWithMemo(
    preWriteCheck: string,
    chapterNumber: number,
    language: "zh" | "en" | "vi",
  ): void {
    if (!preWriteCheck || preWriteCheck.trim().length === 0) {
      this.logWarn(language, {
        zh: `第${chapterNumber}章 PRE_WRITE_CHECK 为空，无法对齐 chapter_memo`,
        en: `Chapter ${chapterNumber} PRE_WRITE_CHECK is empty; cannot verify memo alignment`,
      });
      return;
    }

    const required = language !== "zh"
      ? [
          { needle: "Current task", label: "Current task" },
          { needle: "Do not", label: "Do not" },
          { needle: "end-of-chapter", label: "Required end-of-chapter change" },
        ]
      : [
          { needle: "当前任务", label: "当前任务" },
          { needle: "不要做", label: "不要做" },
          { needle: "章尾", label: "章尾必须发生的改变" },
        ];
    const missing = required.filter((r) => !preWriteCheck.includes(r.needle)).map((r) => r.label);

    if (missing.length > 0) {
      this.logWarn(language, {
        zh: `第${chapterNumber}章 PRE_WRITE_CHECK 缺少 memo 章节检查：${missing.join("、")}`,
        en: `Chapter ${chapterNumber} PRE_WRITE_CHECK missing memo sections: ${missing.join(", ")}`,
      });
    }
  }

  private buildLengthRequirementBlock(lengthSpec: LengthSpec, language: "zh" | "en" | "vi"): string {
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    if (language !== "zh") {
      return `Requirements:
- User target length: ${lengthSpec.target} words
- ${bounds.join("; ") || "No additional hard range specified."} (words)
- Keep the scene complete; do not pad or cut mechanically`;
    }

    return `要求：
- 用户目标字数：${lengthSpec.target}字
- ${bounds.join("; ") || "未指定额外硬性范围"}；中文按正文非空白字符计数，含标点，不含标题
- 保持场景完整，不要机械注水或裁切`;
  }

  private async readFileOrDefault(path: string): Promise<string> {
    try {
      return await readFile(path, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
      throw error;
    }
  }

<<<<<<< HEAD
=======
  /** Save new truth files (summaries, subplots, emotional arcs, character matrix). */
  async saveNewTruthFiles(
    bookDir: string,
    output: WriteChapterOutput,
    language: "zh" | "en" | "vi" = "zh",
  ): Promise<void> {
    const storyDir = join(bookDir, "story");
    const writes: Array<Promise<void>> = [];

    // Append chapter summary to chapter_summaries.md
    if (!output.runtimeStateDelta && output.updatedChapterSummaries) {
      writes.push(writeFile(
        join(storyDir, "chapter_summaries.md"),
        output.updatedChapterSummaries,
        "utf-8",
      ));
    } else if (!output.runtimeStateDelta && output.chapterSummary) {
      writes.push(this.appendChapterSummary(storyDir, output.chapterSummary, language));
    }

    // Overwrite subplot board
    if (output.updatedSubplots) {
      writes.push(writeFile(join(storyDir, "subplot_board.md"), output.updatedSubplots, "utf-8"));
    }

    // Overwrite emotional arcs
    if (output.updatedEmotionalArcs) {
      writes.push(writeFile(join(storyDir, "emotional_arcs.md"), output.updatedEmotionalArcs, "utf-8"));
    }

    // Overwrite character matrix
    if (output.updatedCharacterMatrix) {
      writes.push(writeFile(join(storyDir, "character_matrix.md"), output.updatedCharacterMatrix, "utf-8"));
    }

    await Promise.all(writes);
  }

  private renderDeltaSummaryRow(delta: RuntimeStateDelta): string {
    if (!delta.chapterSummary) return "";
    const summary = delta.chapterSummary;
    const row = [
      summary.chapter,
      summary.title,
      summary.characters,
      summary.events,
      summary.stateChanges,
      summary.hookActivity,
      summary.mood,
      summary.chapterType,
    ].map((value) => String(value).replace(/\|/g, "\\|").trim()).join(" | ");

    return `| ${row} |`;
  }

>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  private normalizeRuntimeStateDeltaChapter(
    delta: RuntimeStateDelta,
    authoritativeChapterNumber: number,
  ): RuntimeStateDelta {
    const hookOps = delta.hookOps ?? {
      upsert: [],
      mention: [],
      resolve: [],
      defer: [],
    };
    let changed = delta.chapter !== authoritativeChapterNumber;
    const normalizedUpserts = hookOps.upsert.map((hook) => {
      const startChapter = Math.min(hook.startChapter, authoritativeChapterNumber);
      const lastAdvancedChapter = Math.min(hook.lastAdvancedChapter, authoritativeChapterNumber);
      if (startChapter !== hook.startChapter || lastAdvancedChapter !== hook.lastAdvancedChapter) {
        changed = true;
      }
      if (startChapter === hook.startChapter && lastAdvancedChapter === hook.lastAdvancedChapter) {
        return hook;
      }
      return {
        ...hook,
        startChapter,
        lastAdvancedChapter,
      };
    });

    if (delta.chapterSummary?.chapter !== undefined && delta.chapterSummary.chapter !== authoritativeChapterNumber) {
      changed = true;
    }
    if (!changed) {
      return delta;
    }

    return {
      ...delta,
      chapter: authoritativeChapterNumber,
      hookOps: {
        ...hookOps,
        upsert: normalizedUpserts,
      },
      chapterSummary: delta.chapterSummary
        ? {
            ...delta.chapterSummary,
            chapter: authoritativeChapterNumber,
          }
        : undefined,
    };
  }

  private async buildRuntimeStateArtifactsIfPresent(
    bookDir: string,
<<<<<<< HEAD
    delta: RuntimeStateDelta,
=======
    delta: RuntimeStateDelta | undefined,
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    language: "zh" | "en" | "vi",
    authoritativeChapterNumber?: number,
    allowReapply?: boolean,
    baselineChapter?: number,
    allowNewHooks?: boolean,
  ): Promise<RuntimeStateArtifacts> {
    const safeDelta = authoritativeChapterNumber === undefined
      ? delta
      : this.normalizeRuntimeStateDeltaChapter(delta, authoritativeChapterNumber);
    if (baselineChapter === undefined) {
      return buildRuntimeStateArtifacts({
        bookDir,
        delta: safeDelta,
        language,
        allowReapply,
        allowNewHooks,
      });
    }
    const snapshot = await loadRuntimeStateSnapshotAtChapter({
      bookDir,
      chapterNumber: baselineChapter,
      language,
    });
    return buildRuntimeStateArtifactsFromSnapshot({
      snapshot,
      delta: safeDelta,
      language,
      allowReapply,
      allowNewHooks,
    });
  }

  private async resolveRuntimeStateArtifactsForOutput(
    bookDir: string,
    output: WriteChapterOutput,
    language: "zh" | "en" | "vi",
<<<<<<< HEAD
  ): Promise<RuntimeStateArtifacts> {
=======
  ): Promise<RuntimeStateArtifacts | null> {
    if (!output.runtimeStateDelta) return null;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    const safeDelta = this.normalizeRuntimeStateDeltaChapter(
      output.runtimeStateDelta,
      output.chapterNumber,
    );
    if (
      safeDelta === output.runtimeStateDelta
      && output.runtimeStateSnapshot
      && output.updatedChapterSummaries
      && output.updatedState
      && output.updatedHooks
    ) {
      return {
        snapshot: output.runtimeStateSnapshot,
        resolvedDelta: safeDelta,
        currentStateMarkdown: output.updatedState,
        hooksMarkdown: output.updatedHooks,
        chapterSummariesMarkdown: output.updatedChapterSummaries,
      };
    }

    return buildRuntimeStateArtifacts({
      bookDir,
      delta: safeDelta,
      language,
    });
  }

<<<<<<< HEAD
=======
  private async appendChapterSummary(
    storyDir: string,
    summary: string,
    language: "zh" | "en" | "vi",
  ): Promise<void> {
    const summaryPath = join(storyDir, "chapter_summaries.md");
    let existing = "";
    try {
      existing = await readFile(summaryPath, "utf-8");
    } catch {
      // File doesn't exist yet — start with header
      existing = language !== "zh"
        ? "# Chapter Summaries\n\n| Chapter | Title | Characters | Key Events | State Changes | Hook Activity | Mood | Chapter Type |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n"
        : "# 章节摘要\n\n| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |\n|------|------|----------|----------|----------|----------|----------|----------|\n";
    }

    // Extract only the data row(s) from the summary (skip header lines)
    const dataRows = summary
      .split("\n")
      .filter((line) =>
        line.startsWith("|")
        && !line.startsWith("| 章节")
        && !line.startsWith("| Chapter")
        && !line.startsWith("|--")
        && !line.startsWith("| ---"),
      )
      .join("\n");

    if (dataRows) {
      // Deduplicate: remove existing rows with the same chapter number before appending
      const newChapterNums = new Set(
        dataRows.split("\n")
          .map((line) => line.split("|")[1]?.trim())
          .filter((ch) => ch && /^\d+$/.test(ch)),
      );
      const deduped = existing
        .split("\n")
        .filter((line) => {
          if (!line.startsWith("|")) return true;
          const chNum = line.split("|")[1]?.trim();
          return !chNum || !newChapterNums.has(chNum);
        })
        .join("\n");
      await writeFile(summaryPath, `${deduped.trimEnd()}\n${dataRows}\n`, "utf-8");
    }
  }

  private buildStyleFingerprint(styleProfileRaw: string): string | undefined {
    if (!styleProfileRaw || styleProfileRaw === "(文件尚未创建)") return undefined;
    try {
      const profile = JSON.parse(styleProfileRaw);
      const lines: string[] = [];
      if (profile.avgSentenceLength) lines.push(`- 平均句长：${profile.avgSentenceLength}字`);
      if (profile.sentenceLengthStdDev) lines.push(`- 句长标准差：${profile.sentenceLengthStdDev}`);
      if (profile.avgParagraphLength) lines.push(`- 平均段落长度：${profile.avgParagraphLength}字`);
      if (profile.paragraphLengthRange) lines.push(`- 段落长度范围：${profile.paragraphLengthRange.min}-${profile.paragraphLengthRange.max}字`);
      if (profile.vocabularyDiversity) lines.push(`- 词汇多样性(TTR)：${profile.vocabularyDiversity}`);
      if (profile.topPatterns?.length > 0) lines.push(`- 高频句式：${profile.topPatterns.join("、")}`);
      if (profile.rhetoricalFeatures?.length > 0) lines.push(`- 修辞特征：${profile.rhetoricalFeatures.join("、")}`);
      return lines.length > 0 ? lines.join("\n") : undefined;
    } catch {
      return undefined;
    }
  }


  /**
   * Extract dialogue fingerprints from recent chapters.
   * For each character with multiple dialogue lines, compute speaking style markers.
   */
  private extractDialogueFingerprints(recentChapters: string, _storyBible: string): string {
    if (!recentChapters) return "";

    // Match dialogue patterns:
    // Chinese: "speaker说道：" or dialogue in ""「」
    // English: "dialogue," speaker said. or "dialogue."
    const dialogueRegex = /(?:(.{1,6})(?:说道|道|喝道|冷声道|笑道|怒道|低声道|大声道|喝骂道|冷笑道|沉声道|喊道|叫道|问道|答道)\s*[：:]\s*["""「]([^"""」]+)["""」])|["""「]([^"""」]{2,})["""」]|"([^"]{2,})"/g;

    const characterDialogues = new Map<string, string[]>();
    let match: RegExpExecArray | null;

    while ((match = dialogueRegex.exec(recentChapters)) !== null) {
      const speaker = match[1]?.trim();
      const line = match[2] ?? match[3] ?? "";
      if (speaker && line.length > 1) {
        const existing = characterDialogues.get(speaker) ?? [];
        characterDialogues.set(speaker, [...existing, line]);
      }
    }

    // Only include characters with >=2 dialogue lines
    const fingerprints: string[] = [];
    for (const [character, lines] of characterDialogues) {
      if (lines.length < 2) continue;

      const avgLen = Math.round(lines.reduce((sum, l) => sum + l.length, 0) / lines.length);
      const isShort = avgLen < 15;

      // Find frequent words/phrases (2+ occurrences)
      const wordCounts = new Map<string, number>();
      for (const line of lines) {
        // Extract 2-3 char segments as "words"
        for (let i = 0; i < line.length - 1; i++) {
          const bigram = line.slice(i, i + 2);
          wordCounts.set(bigram, (wordCounts.get(bigram) ?? 0) + 1);
        }
      }
      const frequentWords = [...wordCounts.entries()]
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => `「${w}」`);

      // Detect style markers
      const markers: string[] = [];
      if (isShort) markers.push("短句为主");
      else markers.push("长句为主");

      const questionCount = lines.filter((l) => l.includes("？") || l.includes("?")).length;
      if (questionCount > lines.length * 0.3) markers.push("反问多");

      if (frequentWords.length > 0) markers.push(`常用${frequentWords.join("")}`);

      fingerprints.push(`${character}：${markers.join("，")}`);
    }

    return fingerprints.length > 0 ? fingerprints.join("；") : "";
  }

  /**
   * Find relevant chapter summaries based on volume outline context.
   * Extracts character names and hook IDs from the current volume's outline,
   * then searches chapter summaries for matching entries.
   */
  private findRelevantSummaries(
    chapterSummaries: string,
    volumeOutline: string,
    chapterNumber: number,
  ): string {
    if (!chapterSummaries || chapterSummaries === "(文件尚未创建)") return "";
    if (!volumeOutline || volumeOutline === "(文件尚未创建)") return "";

    // Extract character names from volume outline (Chinese name patterns)
    const nameRegex = /[\u4e00-\u9fff]{2,4}(?=[，、。：]|$)/g;
    const outlineNames = new Set<string>();
    let nameMatch: RegExpExecArray | null;
    while ((nameMatch = nameRegex.exec(volumeOutline)) !== null) {
      outlineNames.add(nameMatch[0]);
    }

    // Extract hook IDs from volume outline
    const hookRegex = /H\d{2,}/g;
    const hookIds = new Set<string>();
    let hookMatch: RegExpExecArray | null;
    while ((hookMatch = hookRegex.exec(volumeOutline)) !== null) {
      hookIds.add(hookMatch[0]);
    }

    if (outlineNames.size === 0 && hookIds.size === 0) return "";

    // Search chapter summaries for matching rows
    const rows = chapterSummaries.split("\n").filter((line) =>
      line.startsWith("|") && !line.startsWith("| 章节") && !line.startsWith("|--") && !line.startsWith("| -"),
    );

    const matchedRows = rows.filter((row) => {
      for (const name of outlineNames) {
        if (row.includes(name)) return true;
      }
      for (const hookId of hookIds) {
        if (row.includes(hookId)) return true;
      }
      return false;
    });

    // Skip only the last chapter (its full text is already in context via loadRecentChapters)
    const filteredRows = matchedRows.filter((row) => {
      const chNumMatch = row.match(/\|\s*(\d+)\s*\|/);
      if (!chNumMatch) return true;
      const num = parseInt(chNumMatch[1]!, 10);
      return num < chapterNumber - 1;
    });

    return filteredRows.length > 0 ? filteredRows.join("\n") : "";
  }

>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  private sanitizeFilename(title: string): string {
    return title
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 50);
  }
}

function validateSettlementHookIds<T extends {
  readonly hookOps: {
    readonly upsert: ReadonlyArray<{ readonly hookId: string }>;
    readonly mention: ReadonlyArray<string>;
    readonly resolve: ReadonlyArray<string>;
    readonly defer: ReadonlyArray<string>;
  };
}>(value: T, knownHookIds: ReadonlySet<string>): T {
  const submittedIds = [
    ...value.hookOps.upsert.map((hook) => hook.hookId),
    ...value.hookOps.mention,
    ...value.hookOps.resolve,
    ...value.hookOps.defer,
  ];
  const unknown = [...new Set(submittedIds.filter((hookId) => !knownHookIds.has(hookId)))];
  if (unknown.length > 0) {
    throw new Error(
      `Unknown hook id(s): ${unknown.join(", ")}. Existing hook operations accept only ids from the supplied ledger; submit a newHookCandidate for a new promise.`,
    );
  }
  return value;
}
