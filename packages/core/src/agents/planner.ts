import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { BaseAgent } from "./base.js";
import type { BookConfig } from "../models/book.js";
import type { LengthSpec } from "../models/length-governance.js";
import { buildLengthSpec } from "../utils/length-metrics.js";
import {
  ChapterIntentSchema,
  ChapterMemoSchema,
  type ChapterIntent,
  type ChapterMemo,
  type ContextPackage,
} from "../models/input-governance.js";
import { loadPlanningSeedMaterials } from "../utils/planning-materials.js";
import { ChapterMemoToolSchema } from "./planner-tool.js";
import {
  buildPlannerUserMessage,
  getPlannerMemoSystemPrompt,
} from "./planner-prompts.js";
import { ComposerAgent } from "./composer.js";

export interface PlanChapterInput {
  readonly book: BookConfig;
  readonly bookDir: string;
  readonly chapterNumber: number;
  readonly externalContext?: string;
}

export interface PlanChapterOutput {
  readonly intent: ChapterIntent;
  readonly memo: ChapterMemo;
  readonly intentMarkdown: string;
  readonly plannerInputs: ReadonlyArray<string>;
  readonly runtimePath: string;
}

/**
 * The model submits the semantic plan through a typed Pi tool. The host owns
 * chapter identity and persists a readable projection separately.
 */
export class PlannerAgent extends BaseAgent {
  get name(): string {
    return "planner";
  }

  async planChapter(input: PlanChapterInput): Promise<PlanChapterOutput> {
    const storyDir = join(input.bookDir, "story");
    const runtimeDir = join(storyDir, "runtime");
    await mkdir(runtimeDir, { recursive: true });

    const seedMaterials = await loadPlanningSeedMaterials({
      bookDir: input.bookDir,
      chapterNumber: input.chapterNumber,
    });
    const taskGoal = [
      input.externalContext,
      seedMaterials.currentFocus,
      seedMaterials.authorIntent,
      seedMaterials.brief,
    ].map((value) => value?.trim()).filter(Boolean).join("\n\n")
      || (input.book.language !== "zh"
        ? `Continue chapter ${input.chapterNumber} from the current Work state.`
        : `根据当前作品状态续写第${input.chapterNumber}章。`);
    const selected = await new ComposerAgent(this.ctx).selectTaskContext({
      bookDir: input.bookDir,
      chapterNumber: input.chapterNumber,
      goal: taskGoal,
      language: input.book.language,
    });
    const contextPackage: ContextPackage = seedMaterials.previousEndingExcerpt
      ? {
          ...selected,
          selectedContext: [
            ...selected.selectedContext,
            {
              source: `runtime/previous_chapter#${input.chapterNumber - 1}`,
              reason: "Previous chapter text required for chapter transition planning.",
              excerpt: seedMaterials.previousEndingExcerpt,
              protection: "protected",
            },
          ],
        }
      : selected;
    const plannerInputs = contextPackage.selectedContext.map((entry) => entry.source);

    const lengthSpec = buildLengthSpec(
      input.book.chapterWordCount,
      input.book.language,
    );
    const memo = await this.planChapterMemo({
      chapterNumber: input.chapterNumber,
      contextPackage,
      currentInstruction: input.externalContext,
      language: input.book.language,
      lengthSpec,
    });

    const intent = ChapterIntentSchema.parse({
      chapter: input.chapterNumber,
      goal: memo.goal,
    });

    const runtimePath = join(runtimeDir, `chapter-${String(input.chapterNumber).padStart(4, "0")}.intent.md`);
    const intentMarkdown = this.renderIntentMarkdown(
      intent,
      memo,
    );
    await writeFile(runtimePath, intentMarkdown, "utf-8");

    return {
      intent,
      memo,
      intentMarkdown,
      plannerInputs,
      runtimePath,
    };
  }

  /** Compile the governed context into a typed semantic chapter memo. */
  async planChapterMemo(input: {
    readonly chapterNumber: number;
<<<<<<< HEAD
    readonly contextPackage: ContextPackage;
    readonly currentInstruction?: string;
    readonly language?: "zh" | "en" | "vi";
    readonly lengthSpec: LengthSpec;
=======
    readonly isGoldenOpening: boolean;
    readonly fallbackGoal: string;
    readonly chapterSummariesRaw: string;
    readonly previousEndingExcerpt?: string;
    readonly brief?: string;
    readonly chapterContext?: string;
    readonly recyclableHooks?: ReadonlyArray<StoredHook>;
    readonly language?: "zh" | "en" | "vi";
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  }): Promise<ChapterMemo> {
    const language = input.language ?? "zh";
<<<<<<< HEAD
=======
    const noPriorChapter = language !== "zh"
      ? "(this is the opening chapter — no prior chapter)"
      : "（本章为起始章，无前章）";
    const noBookRules = language !== "zh"
      ? "(no book_rules entries)"
      : "（暂无 book_rules 条目）";
    const retryFeedbackHeader = language !== "zh"
      ? "## Error from previous output"
      : "## 上次输出的错误";
    const retryFeedbackTrailer = language !== "zh"
      ? "Fix and re-emit."
      : "请修正后重新输出。";
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec

    const userMessage = buildPlannerUserMessage({
      chapterNumber: input.chapterNumber,
      contextPackage: input.contextPackage,
      currentInstruction: input.currentInstruction,
      lengthBudget: {
        target: input.lengthSpec.target,
        unit: input.lengthSpec.countingMode === "en_words" ? "words" : "字",
      },
      language,
    });

    const systemPrompt = getPlannerMemoSystemPrompt(language);

    const { result } = await this.submitStructured(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      {
        name: "submit_chapter_memo",
        label: "Submit chapter memo",
        description: "Submit the complete semantic chapter plan for host persistence.",
        parameters: ChapterMemoToolSchema,
      },
      { temperature: 0.7, maxTokens: Math.min(8192, this.ctx.client.defaults.maxTokens) },
    );
<<<<<<< HEAD
    return ChapterMemoSchema.parse({
      chapter: input.chapterNumber,
      goal: result.goal,
      body: result.body,
      threadRefs: result.threadRefs,
    });
=======
  }

  private buildFallbackMemoMarkdown(input: {
    readonly chapterNumber: number;
    readonly isGoldenOpening: boolean;
    readonly fallbackGoal: string;
    readonly errorMessage: string;
    readonly language: "zh" | "en" | "vi";
  }): string {
    if (input.language !== "zh") {
      return [
        `# Chapter ${input.chapterNumber} memo`,
        "",
        "## Chapter goal",
        input.fallbackGoal || `Continue chapter ${input.chapterNumber} according to the current outline`,
        "",
        "## Thread refs",
        "none",
        "",
        "## Current task",
        `Use the current chapter goal and authoritative book context to continue chapter ${input.chapterNumber} without inventing a new direction.`,
        "",
        "## What the reader is waiting for right now",
        "Keep the reader's active expectation from the outline and previous chapter in focus; do not replace it with a generic scene.",
        "",
        "## To pay off / to keep buried",
        "Pay off only the near-term promises already supported by context; keep larger secrets buried unless the outline explicitly asks for them.",
        "",
        "## What the slow / transitional beats carry",
        "If a slower beat is needed, make it carry pressure, evidence, relationship movement, or a concrete setup for the next action.",
        "",
        "## Three-question check on the key choice",
        "The protagonist's main choice must have a reason, match current interest, and stay consistent with the established persona.",
        "",
        "## Required end-of-chapter change",
        "End with a concrete change in information, pressure, relationship, objective, or risk so the chapter is not only summary.",
        "",
        "## Hook ledger for this chapter",
        "advance: keep the active promise moving; resolve: only settle what has evidence; defer: preserve larger threads for later chapters.",
        "",
        "## Do not",
        "Do not contradict established facts, ignore the user's current instruction, or turn the fallback memo into a new outline.",
        "",
        "## Planner warning",
        `The model failed to produce a valid chapter memo after ${MEMO_RETRY_LIMIT} attempts. Last parser error: ${input.errorMessage}`,
      ].join("\n");
    }

    return [
      `# 第 ${input.chapterNumber} 章 memo`,
      "",
      "## 本章目标",
      input.fallbackGoal || `按当前大纲继续推进第 ${input.chapterNumber} 章`,
      "",
      "## 关联线索",
      "无",
      "",
      "## 当前任务",
      `沿用当前章节目标和权威设定推进第 ${input.chapterNumber} 章，不临时改方向，也不把章节写成泛泛过渡。`,
      "",
      "## 读者此刻在等什么",
      "延续大纲和上一章形成的读者期待，优先回应当前已经建立的压力、证据、关系或目标变化。",
      "",
      "## 该兑现的 / 暂不掀的",
      "只兑现已有上下文支撑的近端承诺；更大的秘密、身份、幕后主使或终局信息，除非大纲明确要求，否则继续压住。",
      "",
      "## 日常/过渡承担什么任务",
      "如果需要日常或过渡，它必须承担压力、证据、人物关系、目标变化或下一步行动铺垫，不能只是闲聊和气氛。",
      "",
      "## 关键抉择过三连问",
      "主角本章的关键选择必须有原因、符合当前利益，并且不背离已经建立的人设和行为逻辑。",
      "",
      "## 章尾必须发生的改变",
      "章尾至少要在信息、压力、关系、目标或风险上发生一个明确变化，避免只有剧情摘要没有推进。",
      "",
      "## 本章 hook 账",
      "advance: 推进当前活跃承诺；resolve: 只结清已有证据支撑的线索；defer: 大线继续保留到更合适的位置。",
      "",
      "## 不要做",
      "不要违背既成事实，不要无视用户当前指令，不要把 fallback memo 当成新大纲重写整本书。",
      "",
      "## Planner warning",
      `模型连续 ${MEMO_RETRY_LIMIT} 次没有产出合格章节 memo。最后一次解析错误：${input.errorMessage}`,
    ].join("\n");
  }

  private isGoldenOpeningChapter(language: string | undefined, chapterNumber: number): boolean {
    const isZh = (language ?? "zh").toLowerCase().startsWith("zh");
    return isZh ? chapterNumber <= 3 : chapterNumber <= 5;
  }

  private buildArcContext(
    language: string | undefined,
    volumeOutline: string,
    outlineNode: string | undefined,
  ): string | undefined {
    if (!outlineNode) return undefined;
    if (volumeOutline === "(文件尚未创建)") return undefined;
    return this.isChineseLanguage(language)
      ? `卷纲节点：${outlineNode}`
      : `Outline node: ${outlineNode}`;
  }

  private deriveGoal(
    externalContext: string | undefined,
    currentFocus: string,
    authorIntent: string,
    outlineNode: string | undefined,
    chapterNumber: number,
  ): string {
    const first = this.extractFirstDirective(externalContext);
    if (first) return first;
    const localOverride = this.extractLocalOverrideGoal(currentFocus);
    if (localOverride) return localOverride;
    const outline = this.extractFirstDirective(outlineNode);
    if (outline) return outline;
    const focus = this.extractFocusGoal(currentFocus);
    if (focus) return focus;
    const author = this.extractFirstDirective(authorIntent);
    if (author) return author;
    return `Advance chapter ${chapterNumber} with clear narrative focus.`;
  }

  private collectMustKeep(currentState: string, storyBible: string): string[] {
    return this.unique([
      ...this.extractListItems(currentState, 2),
      ...this.extractListItems(storyBible, 2),
    ]).slice(0, 4);
  }

  private collectMustAvoid(currentFocus: string, prohibitions: ReadonlyArray<string>): string[] {
    const avoidSection = this.extractSection(currentFocus, [
      "avoid",
      "must avoid",
      "禁止",
      "避免",
      "避雷",
    ]);
    const focusAvoids = avoidSection
      ? this.extractListItems(avoidSection, 10)
      : currentFocus
        .split("\n")
        .map((line) => line.trim())
        .filter((line) =>
          line.startsWith("-") &&
          /avoid|don't|do not|不要|别|禁止/i.test(line),
        )
        .map((line) => this.cleanListItem(line))
        .filter((line): line is string => Boolean(line));

    return this.unique([...focusAvoids, ...prohibitions]).slice(0, 6);
  }

  private collectStyleEmphasis(authorIntent: string, currentFocus: string): string[] {
    return this.unique([
      ...this.extractFocusStyleItems(currentFocus),
      ...this.extractListItems(authorIntent, 2),
    ]).slice(0, 4);
  }

  private extractFirstDirective(content?: string): string | undefined {
    if (!content) return undefined;
    return content
      .split("\n")
      .map((line) => line.trim())
      .find((line) =>
        line.length > 0
        && !line.startsWith("#")
        && !line.startsWith("-")
        && !this.isTemplatePlaceholder(line),
      );
  }

  private extractListItems(content: string, limit: number): string[] {
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => this.cleanListItem(line))
      .filter((line): line is string => Boolean(line))
      .slice(0, limit);
  }

  private extractFocusGoal(currentFocus: string): string | undefined {
    const focusSection = this.extractSection(currentFocus, [
      "active focus",
      "focus",
      "当前聚焦",
      "当前焦点",
      "近期聚焦",
    ]) ?? currentFocus;
    const directives = this.extractFocusStyleItems(focusSection, 3);
    if (directives.length === 0) {
      return this.extractFirstDirective(focusSection);
    }
    return directives.join(this.containsChinese(focusSection) ? "；" : "; ");
  }

  private extractLocalOverrideGoal(currentFocus: string): string | undefined {
    const overrideSection = this.extractSection(currentFocus, [
      "local override",
      "explicit override",
      "chapter override",
      "local task override",
      "局部覆盖",
      "本章覆盖",
      "临时覆盖",
      "当前覆盖",
    ]);
    if (!overrideSection) {
      return undefined;
    }

    const directives = this.extractListItems(overrideSection, 3);
    if (directives.length > 0) {
      return directives.join(this.containsChinese(overrideSection) ? "；" : "; ");
    }

    return this.extractFirstDirective(overrideSection);
  }

  private extractFocusStyleItems(currentFocus: string, limit = 3): string[] {
    const focusSection = this.extractSection(currentFocus, [
      "active focus",
      "focus",
      "当前聚焦",
      "当前焦点",
      "近期聚焦",
    ]) ?? currentFocus;
    return this.extractListItems(focusSection, limit);
  }

  private renderHookBudget(activeCount: number, language: "zh" | "en" | "vi"): string {
    const cap = 12;
    if (activeCount < 10) {
      return language !== "zh"
        ? `### Hook Budget\n- ${activeCount} active hooks (capacity: ${cap})`
        : `### 伏笔预算\n- 当前 ${activeCount} 条活跃伏笔（容量：${cap}）`;
    }
    const remaining = Math.max(0, cap - activeCount);
    return language !== "zh"
      ? `### Hook Budget\n- ${activeCount} active hooks — approaching capacity (${cap}). Only ${remaining} new hook(s) allowed. Prioritize resolving existing debt over opening new threads.`
      : `### 伏笔预算\n- 当前 ${activeCount} 条活跃伏笔——接近容量上限（${cap}）。仅剩 ${remaining} 个新坑位。优先回收旧债，不要轻易开新线。`;
  }

  private extractSection(content: string, headings: ReadonlyArray<string>): string | undefined {
    const targets = headings.map((heading) => this.normalizeHeading(heading));
    const lines = content.split("\n");
    let buffer: string[] | null = null;
    let sectionLevel = 0;

    for (const line of lines) {
      const headingMatch = line.match(/^(#+)\s*(.+?)\s*$/);
      if (headingMatch) {
        const level = headingMatch[1]!.length;
        const heading = this.normalizeHeading(headingMatch[2]!);

        if (buffer && level <= sectionLevel) {
          break;
        }

        if (targets.includes(heading)) {
          buffer = [];
          sectionLevel = level;
          continue;
        }
      }

      if (buffer) {
        buffer.push(line);
      }
    }

    const section = buffer?.join("\n").trim();
    return section && section.length > 0 ? section : undefined;
  }

  private normalizeHeading(heading: string): string {
    return heading
      .toLowerCase()
      .replace(/[*_`:#]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private cleanListItem(line: string): string | undefined {
    const cleaned = line.replace(/^-\s*/, "").trim();
    if (cleaned.length === 0) return undefined;
    if (/^[-|]+$/.test(cleaned)) return undefined;
    if (this.isTemplatePlaceholder(cleaned)) return undefined;
    return cleaned;
  }

  private isTemplatePlaceholder(line: string): boolean {
    const normalized = line.trim();
    if (!normalized) return false;

    return (
      /^\((describe|briefly describe|write)\b[\s\S]*\)$/i.test(normalized)
      || /^（(?:在这里描述|描述|填写|写下)[\s\S]*）$/u.test(normalized)
    );
  }

  private containsChinese(content: string): boolean {
    return /[\u4e00-\u9fff]/.test(content);
  }

  private findOutlineNode(volumeOutline: string, chapterNumber: number): string | undefined {
    const lines = volumeOutline.split("\n").map((line) => line.trim()).filter(Boolean);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const match = this.matchExactOutlineLine(line, chapterNumber);
      if (!match) continue;

      const inlineContent = this.cleanOutlineContent(match[1]);
      if (inlineContent) {
        return inlineContent;
      }

      const nextContent = this.findNextOutlineContent(lines, index + 1);
      if (nextContent) {
        return nextContent;
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const match = this.matchRangeOutlineLine(line, chapterNumber);
      if (!match) continue;

      const inlineContent = this.cleanOutlineContent(match[3]);
      if (inlineContent) {
        return inlineContent;
      }

      const rangeStart = Number(match[1]);
      const sectionContent = this.extractSectionAroundRange(lines, index);
      if (sectionContent) {
        const beatIndex = chapterNumber - rangeStart;
        const specificBeat = this.extractNumberedBeat(sectionContent, beatIndex);
        return specificBeat ?? sectionContent;
      }

      const nextContent = this.findNextOutlineContent(lines, index + 1);
      if (nextContent) {
        return nextContent;
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (!this.isOutlineAnchorLine(line)) continue;

      const exactMatch = this.matchAnyExactOutlineLine(line);
      if (exactMatch) {
        const inlineContent = this.cleanOutlineContent(exactMatch[1]);
        if (inlineContent) {
          return inlineContent;
        }
      }

      const rangeMatch = this.matchAnyRangeOutlineLine(line);
      if (rangeMatch) {
        const inlineContent = this.cleanOutlineContent(rangeMatch[3]);
        if (inlineContent) {
          return inlineContent;
        }
      }

      const nextContent = this.findNextOutlineContent(lines, index + 1);
      if (nextContent) {
        return nextContent;
      }

      break;
    }

    return this.extractFirstDirective(volumeOutline);
  }

  private cleanOutlineContent(content?: string): string | undefined {
    const cleaned = content?.trim();
    if (!cleaned) return undefined;
    if (/^[*_`~:：-]+$/.test(cleaned)) return undefined;
    return cleaned;
  }

  private extractSectionAroundRange(lines: ReadonlyArray<string>, rangeLineIndex: number): string | undefined {
    let headingIndex = -1;
    for (let i = rangeLineIndex - 1; i >= 0; i--) {
      if (lines[i]!.startsWith("#")) {
        headingIndex = i;
        break;
      }
      if (this.matchAnyRangeOutlineLine(lines[i]!) || this.matchAnyExactOutlineLine(lines[i]!)) {
        break;
      }
    }

    if (headingIndex < 0) {
      return undefined;
    }

    const headingLine = lines[headingIndex]!;
    const headingLevel = headingLine.match(/^(#+)/)?.[1]?.length ?? 3;

    const sectionLines: string[] = [];
    for (let i = headingIndex; i < lines.length; i++) {
      if (i > headingIndex) {
        const nextHeadingMatch = lines[i]!.match(/^(#+)/);
        if (nextHeadingMatch && (nextHeadingMatch[1]?.length ?? 0) <= headingLevel) {
          break;
        }
      }
      sectionLines.push(lines[i]!);
    }

    const content = sectionLines.join("\n").trim();
    return content.length > 0 ? content : undefined;
  }

  private extractNumberedBeat(section: string, beatIndex: number): string | undefined {
    if (beatIndex < 0) return undefined;

    const beats: string[] = [];
    for (const line of section.split("\n")) {
      const trimmed = line.trim();
      if (/^\d+[.)]\s/.test(trimmed)) {
        beats.push(trimmed.replace(/^\d+[.)]\s*/, ""));
      }
    }

    if (beats.length === 0 || beatIndex >= beats.length) return undefined;
    return beats[beatIndex];
  }

  private findNextOutlineContent(lines: ReadonlyArray<string>, startIndex: number): string | undefined {
    for (let index = startIndex; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (!line) {
        continue;
      }

      if (this.isOutlineAnchorLine(line)) {
        return undefined;
      }

      if (line.startsWith("#")) {
        continue;
      }

      const cleaned = this.cleanOutlineContent(line);
      if (cleaned) {
        return cleaned;
      }
    }

    return undefined;
  }

  private matchExactOutlineLine(line: string, chapterNumber: number): RegExpMatchArray | undefined {
    const patterns = [
      new RegExp(`^(?:#+\\s*)?(?:[-*]\\s+)?(?:\\*\\*)?Chapter\\s*${chapterNumber}(?!\\d|\\s*[-~–—]\\s*\\d)(?:[:：-])?(?:\\*\\*)?\\s*(.*)$`, "i"),
      new RegExp(`^(?:#+\\s*)?(?:[-*]\\s+)?(?:\\*\\*)?第\\s*${chapterNumber}\\s*章(?!\\d|\\s*[-~–—]\\s*\\d)(?:[:：-])?(?:\\*\\*)?\\s*(.*)$`),
    ];

    return patterns
      .map((pattern) => line.match(pattern))
      .find((result): result is RegExpMatchArray => Boolean(result));
  }

  private matchAnyExactOutlineLine(line: string): RegExpMatchArray | undefined {
    const patterns = [
      /^(?:#+\s*)?(?:[-*]\s+)?(?:\*\*)?Chapter\s*\d+(?!\s*[-~–—]\s*\d)(?:[:：-])?(?:\*\*)?\s*(.*)$/i,
      /^(?:#+\s*)?(?:[-*]\s+)?(?:\*\*)?第\s*\d+\s*章(?!\s*[-~–—]\s*\d)(?:[:：-])?(?:\*\*)?\s*(.*)$/i,
    ];

    return patterns
      .map((pattern) => line.match(pattern))
      .find((result): result is RegExpMatchArray => Boolean(result));
  }

  private matchRangeOutlineLine(line: string, chapterNumber: number): RegExpMatchArray | undefined {
    const match = this.matchAnyRangeOutlineLine(line);
    if (!match) return undefined;
    if (this.isChapterWithinRange(match[1], match[2], chapterNumber)) {
      return match;
    }

    return undefined;
  }

  private matchAnyRangeOutlineLine(line: string): RegExpMatchArray | undefined {
    const patterns = [
      /^(?:#+\s*)?(?:[-*]\s+)?(?:\*\*)?Chapter\s*(\d+)\s*[-~–—]\s*(\d+)\b(?:[:：-])?(?:\*\*)?\s*(.*)$/i,
      /^(?:#+\s*)?(?:[-*]\s+)?(?:\*\*)?第\s*(\d+)\s*[-~–—]\s*(\d+)\s*章(?:[:：-])?(?:\*\*)?\s*(.*)$/i,
      /^(?:[-*]\s+)?(?:\*\*)?章节范围(?:\*\*)?[：:]\s*(\d+)\s*[-~–—]\s*(\d+)\s*章\s*(.*)$/,
      /^(?:[-*]\s+)?(?:\*\*)?Chapter\s*[Rr]ange(?:\*\*)?[：:]\s*(\d+)\s*[-~–—]\s*(\d+)\b\s*(.*)$/i,
    ];

    return patterns
      .map((pattern) => line.match(pattern))
      .find((result): result is RegExpMatchArray => Boolean(result));
  }

  private isOutlineAnchorLine(line: string): boolean {
    return this.matchAnyExactOutlineLine(line) !== undefined
      || this.matchAnyRangeOutlineLine(line) !== undefined;
  }

  private isChapterWithinRange(startText: string | undefined, endText: string | undefined, chapterNumber: number): boolean {
    const start = Number.parseInt(startText ?? "", 10);
    const end = Number.parseInt(endText ?? "", 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    const lower = Math.min(start, end);
    const upper = Math.max(start, end);
    return chapterNumber >= lower && chapterNumber <= upper;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  }

  private renderIntentMarkdown(
    intent: ChapterIntent,
    memo: ChapterMemo,
<<<<<<< HEAD
=======
    language: "zh" | "en" | "vi",
    pendingHooks: string,
    chapterSummaries: string,
    activeHookCount: number,
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  ): string {
    const memoBody = memo.body.trim();
    const threadRefsLine = memo.threadRefs.length > 0
      ? memo.threadRefs.map((id) => `- ${id}`).join("\n")
      : "- (none)";

    return [
      "# Chapter Intent",
      "",
      "## Goal",
      intent.goal,
      "",
      "## Chapter Memo",
      "### Thread Refs",
      threadRefsLine,
      "",
      "### Body",
      memoBody,
    ].join("\n");
  }
}
