import { BaseAgent } from "./base.js";
import { languageOutputInstruction } from "../utils/language.js";
import type { BookConfig, FanficMode } from "../models/book.js";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { renderHooksProjection } from "../state/state-projections.js";
import { BookRulesSchema, type BookRules } from "../models/book-rules.js";
import { FoundationDetailsToolSchema, FoundationOutlineToolSchema, FoundationCastIndexToolSchema, foundationCastDocumentsToolSchema } from "./architect-tool.js";
import type { HookRecord } from "../models/runtime-state.js";
import { createInitialRuntimeState } from "../state/runtime-state-store.js";
import { commitAtomicFileSet, type AtomicFileWrite } from "../utils/atomic-file-set.js";

// Architect owns the five-section persistence protocol. Foundation craft is
// supplied by the active long-writing and derivative-work Skills.

export interface ArchitectRole {
  readonly tier: "major" | "minor";
  readonly name: string;
  readonly content: string;
}

export interface ArchitectOutput {
  readonly storyFrame: string;
  readonly volumeMap: string;
  readonly roles: ReadonlyArray<ArchitectRole>;
  readonly bookRules: string;
  readonly bookRulesData: BookRules;
  readonly pendingHooks: string;
  readonly initialHooks: ReadonlyArray<HookRecord>;
}

export class ArchitectAgent extends BaseAgent {
  get name(): string {
    return "architect";
  }

  async generateFoundation(
    book: BookConfig,
    externalContext?: string,
    reviewFeedback?: string,
    options?: {
      readonly onOutline?: (outline: { readonly storyFrame: string; readonly volumeMap: string }) => void | Promise<void>;
      reviseFrom?: {
        storyFrame: string;
        volumeMap: string;
        bookRules: string;
        roles: string;
        userFeedback: string;
      };
    },
  ): Promise<ArchitectOutput> {
    const resolvedLanguage = book.language;

    const contextBlock = externalContext
      ? `\n\n## 外部指令\n以下是来自外部系统的创作指令，请将其融入设定中：\n\n${externalContext}\n`
      : "";
    const reviewFeedbackBlock = this.buildReviewFeedbackBlock(reviewFeedback, resolvedLanguage);
    const revisePrompt = options?.reviseFrom
      ? this.buildRevisePrompt(options.reviseFrom)
      : "";

    const systemPrompt = resolvedLanguage !== "zh"
      ? this.buildEnglishFoundationPrompt(book, contextBlock, reviewFeedbackBlock)
      : this.buildChineseFoundationPrompt(book, contextBlock, reviewFeedbackBlock);

<<<<<<< HEAD
    const langPrefix = resolvedLanguage !== "zh"
      ? `${languageOutputInstruction(resolvedLanguage)}\n\n`
      : "";
    const userMessage = resolvedLanguage !== "zh"
      ? `Generate the complete foundation for the ${book.genre} Work titled "${book.title}". ${languageOutputInstruction(resolvedLanguage)}`
      : `请为标题为"${book.title}"的${book.genre}作品生成完整基础设定。`;
=======
    const systemPrompt = resolvedLanguage !== "zh"
      ? this.buildEnglishFoundationPrompt(book, gp, genreBody, contextBlock, reviewFeedbackBlock, numericalBlock, powerBlock, eraBlock)
      : this.buildChineseFoundationPrompt(book, gp, genreBody, contextBlock, reviewFeedbackBlock, numericalBlock, powerBlock, eraBlock);

    const langPrefix = resolvedLanguage !== "zh"
      ? `${languageOutputInstruction(resolvedLanguage)}\nThe === SECTION: === tags remain unchanged. Do NOT emit rhythm_principles or current_state sections — rhythm principles live inside the last paragraph of volume_map; environment/era anchors (when relevant) are woven into story_frame's world-tonal-ground paragraph.\n\n`
      : "";
    const userMessage = resolvedLanguage !== "zh"
      ? `Generate the complete foundation for a ${gp.name} novel titled "${book.title}". ${languageOutputInstruction(resolvedLanguage)}`
      : `请为标题为"${book.title}"的${gp.name}小说生成完整基础设定。`;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec

    return this.generateFoundationInStages({
      systemPrompt: langPrefix + systemPrompt + revisePrompt,
      userMessage,
      language: resolvedLanguage,
      temperature: 0.8,
      onOutline: options?.onOutline,
    });
  }

  private buildRevisePrompt(reviseFrom: {
    storyFrame: string;
    volumeMap: string;
    bookRules: string;
    roles: string;
    userFeedback: string;
  }): string {
    return `\n\n## 既有架构稿修订
按已激活 Skill 使用以下权威原稿和用户要求，返回当前五块 foundation 协议。

【story_frame 全文】
${reviseFrom.storyFrame}

【volume_map 全文】
${reviseFrom.volumeMap}

【book_rules 全文】
${reviseFrom.bookRules}

【roles 全文】
${reviseFrom.roles}

用户额外要求：
${reviseFrom.userFeedback || "（无）"}
`;
  }

  // -------------------------------------------------------------------------
  // Foundation artifact protocol. Creative methodology comes from the active
  // long-writing Skill; this code owns only artifact shape and dynamic limits.
  // -------------------------------------------------------------------------
  private buildChineseFoundationPrompt(
    book: BookConfig,
    contextBlock: string,
    reviewFeedbackBlock: string,
  ): string {
    return this.buildFoundationProtocol({ book, contextBlock, reviewFeedbackBlock, language: "zh" });
  }

  private buildEnglishFoundationPrompt(
    book: BookConfig,
    contextBlock: string,
    reviewFeedbackBlock: string,
  ): string {
    return this.buildFoundationProtocol({ book, contextBlock, reviewFeedbackBlock, language: "en" });
  }

<<<<<<< HEAD
  private buildFoundationProtocol(params: {
    readonly book: BookConfig;
    readonly contextBlock: string;
    readonly reviewFeedbackBlock: string;
    readonly language: "zh" | "en" | "vi";
  }): string {
    const { book, contextBlock, reviewFeedbackBlock, language } = params;
    const metadata = language === "en"
      ? `Platform: ${book.platform}\nGenre: ${book.genre}\nTarget chapters: ${book.targetChapters}\nChapter length: ${book.chapterWordCount}\nTitle: ${book.title}`
      : `平台：${book.platform}\n题材：${book.genre}\n目标章数：${book.targetChapters}\n每章字数：${book.chapterWordCount}\n标题：${book.title}`;
    return language === "en"
      ? `Create the Work foundation using the activated professional Skills and supplied authority.${contextBlock}${reviewFeedbackBlock}\n\n## Work metadata\n${metadata}\n\nSubmit readable foundation artifacts and the small structured rules surface through the required tools.`
      : `按已激活的专业 Skill 和输入权威生成作品基础设定。${contextBlock}${reviewFeedbackBlock}\n\n## 作品元信息\n${metadata}\n\n通过指定工具提交可读基础资产和少量结构化规则。`;
  }
  async writeFoundationFiles(
    bookDir: string,
    output: ArchitectOutput,
    language: "zh" | "en" | "vi",
    mode: "init" | "revise" = "init",
  ): Promise<void> {
    const writes: AtomicFileWrite[] = [
      { relativePath: join("story", "outline", "story_frame.md"), content: `${output.storyFrame.trim()}\n` },
      { relativePath: join("story", "outline", "volume_map.md"), content: `${output.volumeMap.trim()}\n` },
      { relativePath: join("story", "book_rules.md"), content: `${output.bookRules.trim()}\n` },
      { relativePath: join("story", "book_rules.json"), content: `${JSON.stringify(output.bookRulesData, null, 2)}\n` },
    ];
    for (const role of output.roles) {
=======
  // -------------------------------------------------------------------------
  // Parsing
  // -------------------------------------------------------------------------
  private async parseSectionsWithRepair(content: string, language: "zh" | "en" | "vi"): Promise<ArchitectOutput> {
    try {
      return this.parseSections(content, language);
    } catch (error) {
      if (!(error instanceof MissingArchitectSectionsError)) {
        throw error;
      }

      const repaired = await this.repairMissingSections(error, language);
      try {
        return this.parseSections(repaired, language);
      } catch (repairError) {
        if (repairError instanceof MissingArchitectSectionsError) {
          const missing = repairError.missing.join("、");
          const message = language !== "zh"
            ? `The story foundation came back incomplete (missing: ${repairError.missing.join(", ")}). `
              + "This usually means the model didn't write every section in one pass — it's not a problem with your input. "
              + "Try again, or switch to a stronger model (e.g. deepseek-v4-pro / gpt-5.5) and regenerate."
            : `基础设定没有生成完整(缺少:${missing})。`
              + "这通常是模型一次没把所有部分写全,不是你的输入有问题。"
              + "点重试,或换更强的模型(如 deepseek-v4-pro / gpt-5.5)再生成一次,通常就能解决。";
          throw new ArchitectIncompleteFoundationError(
            repairError.missing,
            repairError.content,
            message,
          );
        }
        throw repairError;
      }
    }
  }

  private async repairMissingSections(
    error: MissingArchitectSectionsError,
    language: "zh" | "en" | "vi",
  ): Promise<string> {
    const missingList = error.missing.join(", ");
    const system = language !== "zh"
      ? [
          "You repair InkOS architect output formatting.",
          "The previous draft is partially useful but is missing required SECTION blocks.",
          "Do not invent a new book. Preserve usable existing content and add the missing parts.",
          "Return the complete output with exactly these 5 SECTION blocks in order: story_frame, volume_map, roles, book_rules, pending_hooks.",
          "book_rules must be ordinary Markdown, not YAML. pending_hooks must be a Markdown table.",
          "Do not explain the repair.",
        ].join("\n")
      : [
          "你负责修复 InkOS architect 的输出格式。",
          "上一轮草稿有可用内容，但缺少必需的 SECTION 块。",
          "不要重新发明一本书；保留已有可用内容，只补齐缺失部分并整理成完整输出。",
          "必须按顺序返回完整 5 段 SECTION：story_frame、volume_map、roles、book_rules、pending_hooks。",
          "book_rules 必须是普通 Markdown，不要 YAML；pending_hooks 必须是 Markdown 表格。",
          "不要解释修复过程。",
        ].join("\n");
    const user = language !== "zh"
      ? `Missing sections: ${missingList}\n\nOriginal partial output:\n\n${error.content}`
      : `缺失 section：${missingList}\n\n原始不完整输出如下：\n\n${error.content}`;

    const response = await this.chat([
      { role: "system", content: system },
      { role: "user", content: user },
    ], { temperature: 0.2 });
    return response.content;
  }

  private parseSections(content: string, language: "zh" | "en" | "vi"): ArchitectOutput {
    const parsedSections = this.parseArchitectSectionMap(content);

    // Phase 5 new sections take precedence.
    const storyFrame = parsedSections.get("story_frame") ?? "";
    const volumeMap = parsedSections.get("volume_map") ?? "";
    const rhythmPrinciples = parsedSections.get("rhythm_principles") ?? "";
    const rolesRaw = parsedSections.get("roles") ?? "";

    // Legacy sections (still produced for back-compat where needed).
    // If the model used old section names we still accept them.
    const legacyStoryBible = parsedSections.get("story_bible") ?? "";
    const legacyVolumeOutline = parsedSections.get("volume_outline") ?? "";
    const bookRules = parsedSections.get("book_rules");
    // Phase 5 consolidation: current_state is no longer a required section.
    // Legacy books (v12 / Phase 5 initial / pre-revert) and import/fanfic
    // regenerations may still produce it — accept the value when present,
    // fall through to empty seed when absent (consolidator will populate at
    // runtime). Era/setting anchors that used to motivate a separate
    // current_state block now live naturally inside story_frame.世界观底色
    // for genres that have a real-world year anchor; other genres (修仙/玄幻/
    // 系统文) omit them entirely.
    const currentStateLegacy = parsedSections.get("current_state") ?? "";
    const pendingHooksRaw = parsedSections.get("pending_hooks");

    // 5-section required contract: story_frame (or legacy story_bible),
    // volume_map (or legacy volume_outline), roles, book_rules, pending_hooks.
    //
    // Backward compat: v12 outputs used story_bible/volume_outline and
    // embedded character data inside story_bible — they had no roles block.
    // When the model uses ONLY legacy section names, we accept an empty roles
    // list (consolidator/readers fall back to the character_matrix shim).
    // When the new story_frame / volume_map names are used we require roles.
    const usingLegacyOutlineNames = !storyFrame && !volumeMap
      && (legacyStoryBible.length > 0 || legacyVolumeOutline.length > 0);

    const missing: string[] = [];
    const effectiveStoryFrame = storyFrame || legacyStoryBible;
    const effectiveVolumeMap = volumeMap || legacyVolumeOutline;
    if (!effectiveStoryFrame) missing.push("story_frame");
    if (!effectiveVolumeMap) missing.push("volume_map");
    if (!rolesRaw.trim() && !usingLegacyOutlineNames) missing.push("roles");
    if (!bookRules) missing.push("book_rules");
    if (!pendingHooksRaw) missing.push("pending_hooks");
    if (missing.length > 0) {
      throw new MissingArchitectSectionsError(missing, content);
    }

    const roles = this.parseRoles(rolesRaw);
    const pendingHooks = this.normalizePendingHooksSection(
      this.stripTrailingAssistantCoda(pendingHooksRaw!),
      effectiveVolumeMap,
    );

    // Synthesize legacy-facing content from new prose (so back-compat callers
    // still receive real content instead of empty strings).
    const storyBible = legacyStoryBible || this.buildStoryBibleShim(effectiveStoryFrame, language);
    const volumeOutline = legacyVolumeOutline || effectiveVolumeMap;

    return {
      storyBible,
      volumeOutline,
      bookRules: bookRules!,
      // currentState: empty string when architect no longer emits the section;
      // writeFoundationFiles seeds current_state.md with a placeholder so
      // consolidator / state-bootstrap readers find a valid file on first boot.
      currentState: currentStateLegacy,
      pendingHooks,
      storyFrame: effectiveStoryFrame,
      volumeMap: effectiveVolumeMap,
      rhythmPrinciples,
      roles,
    };
  }

  private parseArchitectSectionMap(content: string): Map<string, string> {
    const sectionPattern = /^\s{0,3}(?:#{1,6}\s*)?===\s*SECTION\s*[：:]\s*([^\n=]+?)\s*===\s*(?:#+\s*)?$/gim;
    const markerMatches = [...content.matchAll(sectionPattern)].map((match) => ({
      name: this.normalizeSectionName(match[1] ?? ""),
      index: match.index ?? 0,
      markerLength: match[0].length,
    }));
    if (markerMatches.length > 0) {
      return this.sliceArchitectSections(content, markerMatches);
    }

    const headingPattern = /^\s{0,3}#{1,3}\s+(.+?)\s*$/gim;
    const headingMatches = [...content.matchAll(headingPattern)]
      .map((match) => ({
        name: this.canonicalSectionNameFromHeading(match[1] ?? ""),
        index: match.index ?? 0,
        markerLength: match[0].length,
      }))
      .filter((match): match is { readonly name: string; readonly index: number; readonly markerLength: number } =>
        Boolean(match.name),
      );
    return this.sliceArchitectSections(content, headingMatches);
  }

  private sliceArchitectSections(
    content: string,
    matches: ReadonlyArray<{ readonly name: string; readonly index: number; readonly markerLength: number }>,
  ): Map<string, string> {
    const parsedSections = new Map<string, string>();
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]!;
      const start = match.index + match.markerLength;
      const end = matches[i + 1]?.index ?? content.length;
      parsedSections.set(match.name, content.slice(start, end).trim());
    }
    return parsedSections;
  }

  /**
   * Parse ---ROLE---...---CONTENT---... blocks from the roles section.
   * Drops malformed entries silently — this is prose the LLM produced,
   * not machine input.
   */
  private parseRoles(raw: string): ReadonlyArray<ArchitectRole> {
    if (!raw.trim()) return [];

    const blocks = raw.split(/^---ROLE---$/m).map((chunk) => chunk.trim()).filter(Boolean);
    const roles: ArchitectRole[] = [];

    for (const block of blocks) {
      const contentSplit = block.split(/^---CONTENT---$/m);
      if (contentSplit.length < 2) continue;

      const headerRaw = contentSplit[0]!.trim();
      const content = contentSplit.slice(1).join("\n---CONTENT---\n").trim();

      const tierMatch = headerRaw.match(/tier\s*[:：]\s*(major|minor|主要|次要)/i);
      const nameMatch = headerRaw.match(/name\s*[:：]\s*(.+)/i);
      if (!tierMatch || !nameMatch) continue;

      const tierValue = tierMatch[1]!.toLowerCase();
      const tier: "major" | "minor" = (tierValue === "major" || tierValue === "主要") ? "major" : "minor";
      const name = nameMatch[1]!.trim();
      if (!name || !content) continue;

      roles.push({ tier, name, content });
    }

    return roles;
  }

  private buildStoryBibleShim(storyFrame: string, language: "zh" | "en" | "vi"): string {
    if (language !== "zh") {
      return `# Story Bible (compat pointer — deprecated)\n\n> This file is kept for external readers only. The authoritative source is now:\n> - outline/story_frame.md (theme / tonal ground / core conflict / world rules / endgame)\n> - outline/volume_map.md (chapter-granular plot map)\n> - roles/ directory (one-file-per-character sheets)\n\n## Excerpt from story_frame\n\n${storyFrame.slice(0, 2000)}\n`;
    }
    return `# 故事圣经（兼容指针——已废弃）\n\n> 本文件仅为外部读取保留。权威来源已迁移至：\n> - outline/story_frame.md（主题 / 基调 / 核心冲突 / 世界铁律 / 终局）\n> - outline/volume_map.md（章级别的分卷地图）\n> - roles/ 文件夹（一人一卡角色档案）\n\n## story_frame 摘录\n\n${storyFrame.slice(0, 2000)}\n`;
  }

  private buildCharacterMatrixShim(roles: ReadonlyArray<ArchitectRole>, language: "zh" | "en" | "vi"): string {
    const majorLines = roles.filter((role) => role.tier === "major")
      .map((role) => `- roles/主要角色/${role.name}.md`);
    const minorLines = roles.filter((role) => role.tier === "minor")
      .map((role) => `- roles/次要角色/${role.name}.md`);

    if (language !== "zh") {
      return `# Character Matrix (compat pointer — deprecated)\n\n> This file is kept for external readers only. Authoritative source is now the roles/ directory (one-file-per-character).\n\n## Major characters\n\n${majorLines.join("\n") || "(none)"}\n\n## Minor characters\n\n${minorLines.join("\n") || "(none)"}\n`;
    }
    return `# 角色矩阵（兼容指针——已废弃）\n\n> 本文件仅为外部读取保留。权威来源已迁移至 roles/ 文件夹（一人一卡）。\n\n## 主要角色\n\n${majorLines.join("\n") || "（无）"}\n\n## 次要角色\n\n${minorLines.join("\n") || "（无）"}\n`;
  }

  // -------------------------------------------------------------------------
  // File writing
  // -------------------------------------------------------------------------
  async writeFoundationFiles(
    bookDir: string,
    output: ArchitectOutput,
    _numericalSystem: boolean = true,
    language: "zh" | "en" | "vi" = "zh",
    mode: "init" | "revise" = "init",
  ): Promise<void> {
    const storyDir = join(bookDir, "story");
    const outlineDir = join(storyDir, "outline");
    const rolesDir = join(storyDir, "roles");
    const rolesMajorDir = join(rolesDir, "主要角色");
    const rolesMinorDir = join(rolesDir, "次要角色");

    await Promise.all([
      mkdir(storyDir, { recursive: true }),
      mkdir(outlineDir, { recursive: true }),
      mkdir(rolesMajorDir, { recursive: true }),
      mkdir(rolesMinorDir, { recursive: true }),
    ]);

    const writes: Array<Promise<void>> = [];

    const storyFrameBody = output.storyFrame ?? output.storyBible;
    const volumeMap = output.volumeMap ?? output.volumeOutline;
    const rhythmPrinciples = output.rhythmPrinciples ?? "";
    const roles = output.roles ?? [];
    const isPhase5Output = Boolean(output.storyFrame?.trim());

    if (mode === "revise" && !isPhase5Output) {
      throw new Error(
        "Architect revise mode produced legacy-format output (storyFrame empty). " +
        "The book's architecture files have NOT been modified.",
      );
    }

    if (mode === "revise") {
      await rm(rolesMajorDir, { recursive: true, force: true });
      await rm(rolesMinorDir, { recursive: true, force: true });
      await mkdir(rolesMajorDir, { recursive: true });
      await mkdir(rolesMinorDir, { recursive: true });
    }

    if (!isPhase5Output) {
      writes.push(writeFile(join(storyDir, "story_bible.md"), output.storyBible, "utf-8"));
      writes.push(writeFile(join(storyDir, "volume_outline.md"), output.volumeOutline, "utf-8"));
      writes.push(writeFile(join(storyDir, "book_rules.md"), output.bookRules, "utf-8"));
      writes.push(writeFile(
        join(storyDir, "character_matrix.md"),
        language !== "zh"
          ? "# Character Matrix\n\n<!-- One ## section per character. Add new characters as new ## blocks. -->\n"
          : "# 角色矩阵\n\n<!-- 每个角色一个 ## 块，新角色追加新 ## 即可。 -->\n",
        "utf-8",
      ));

      if (mode === "init") {
        const currentStateSeed = output.currentState?.trim()
          ? output.currentState
          : (language !== "zh"
              ? "# Current State\n\n> Seeded at book creation. Runtime state is appended by the consolidator after each chapter.\n"
              : "# 当前状态\n\n> 建书时占位。运行时每章之后由 consolidator 追加最新状态。\n");
        writes.push(writeFile(join(storyDir, "current_state.md"), currentStateSeed, "utf-8"));
        writes.push(writeFile(join(storyDir, "pending_hooks.md"), output.pendingHooks, "utf-8"));
        writes.push(writeFile(
          join(storyDir, "emotional_arcs.md"),
          language !== "zh"
            ? "# Emotional Arcs\n\n| Character | Chapter | Emotional State | Trigger Event | Intensity (1-10) | Arc Direction |\n| --- | --- | --- | --- | --- | --- |\n"
            : "# 情感弧线\n\n| 角色 | 章节 | 情绪状态 | 触发事件 | 强度(1-10) | 弧线方向 |\n|------|------|----------|----------|------------|----------|\n",
          "utf-8",
        ));
      }

      await Promise.all(writes);
      return;
    }

    const storyFrame = storyFrameBody.trim();

    // Phase 5 primary prose files
    writes.push(writeFile(join(outlineDir, "story_frame.md"), storyFrame, "utf-8"));
    writes.push(writeFile(join(outlineDir, "volume_map.md"), volumeMap, "utf-8"));
    // Phase 5 consolidation: rhythm principles live inside the last paragraph
    // of volume_map. A separate 节奏原则.md / rhythm_principles.md file is only
    // written when the architect happened to produce a standalone block (legacy
    // 7-section output / foundation-reviewer round-trips that still split it
    // out). Skipping the empty write avoids 0-byte files that mislead the UI
    // and fight against the "no duplication" rule — readers who need the rhythm
    // content already pull it from volume_map's closing paragraph.
    if (rhythmPrinciples.trim()) {
      const rhythmFileName = language !== "zh" ? "rhythm_principles.md" : "节奏原则.md";
      writes.push(writeFile(join(outlineDir, rhythmFileName), rhythmPrinciples, "utf-8"));
    }

    // Roles — one file per character
    for (const role of roles) {
      const targetDir = role.tier === "major" ? rolesMajorDir : rolesMinorDir;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
      const safeName = role.name.replace(/[/\\:*?"<>|]/g, "_").trim();
      if (!safeName) throw new Error("Foundation role name cannot be represented as a safe file name.");
      writes.push({
        relativePath: join("story", "roles", role.tier === "major" ? "主要角色" : "次要角色", `${safeName}.md`),
        content: `${role.content.trim()}\n`,
      });
    }
    const replacementPaths=new Set(writes.map(write=>write.relativePath));
    const deletes:string[]=[];
    if (mode === "revise") {
      for (const tier of ["主要角色","次要角色"]) {
        const directory=join("story","roles",tier);
        let entries;
        try { entries=await readdir(join(bookDir,directory),{withFileTypes:true}); }
        catch(error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; throw error; }
        for(const entry of entries) {
          const path=join(directory,entry.name);
          if(entry.isFile()&&entry.name.endsWith(".md")&&!replacementPaths.has(path)) deletes.push(path);
        }
      }
    }
    await commitAtomicFileSet({
      rootDir: bookDir,
      writes,
      deletes,
    });
    if (mode === "init") {
<<<<<<< HEAD
      await createInitialRuntimeState({ bookDir, language, hooks: output.initialHooks });
=======
      const currentStateSeed = output.currentState?.trim()
        ? output.currentState
        : (language !== "zh"
            ? "# Current State\n\n> Seeded at book creation. Runtime state is appended by the consolidator after each chapter. Initial per-character state lives in roles/*.Current_State; load-bearing initial world facts live in pending_hooks rows with start_chapter=0.\n"
            : "# 当前状态\n\n> 建书时占位。运行时每章之后由 consolidator 追加最新状态。每个角色的初始状态详见 roles/*.当前现状；承重的初始世界设定见 pending_hooks 里 startChapter=0 的行。\n");
      writes.push(writeFile(join(storyDir, "current_state.md"), currentStateSeed, "utf-8"));
      writes.push(writeFile(join(storyDir, "pending_hooks.md"), output.pendingHooks, "utf-8"));
      writes.push(writeFile(
        join(storyDir, "emotional_arcs.md"),
        language !== "zh"
          ? "# Emotional Arcs\n\n| Character | Chapter | Emotional State | Trigger Event | Intensity (1-10) | Arc Direction |\n| --- | --- | --- | --- | --- | --- |\n"
          : "# 情感弧线\n\n| 角色 | 章节 | 情绪状态 | 触发事件 | 强度(1-10) | 弧线方向 |\n|------|------|----------|----------|------------|----------|\n",
        "utf-8",
      ));
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    }
  }
  /**
   * Reverse-engineer foundation from existing chapters.
   */
  async generateFoundationFromImport(
    book: BookConfig,
    chaptersText: string,
    externalContext?: string,
    reviewFeedback?: string,
    options?: { readonly importMode?: "continuation" | "series" },
  ): Promise<ArchitectOutput> {
    const resolvedLanguage = book.language;
    const reviewFeedbackBlock = this.buildReviewFeedbackBlock(reviewFeedback, resolvedLanguage);

    const contextBlock = externalContext
      ? (resolvedLanguage !== "zh"
          ? `\n\n## External Instructions\n${externalContext}\n`
          : `\n\n## 外部指令\n${externalContext}\n`)
      : "";

<<<<<<< HEAD
    const isSeries = options?.importMode === "series";

    const continuationDirective = resolvedLanguage !== "zh"
      ? `## Import mode\n${isSeries ? "series" : "continuation"}`
      : `## 导入模式\n${isSeries ? "系列新作" : "原线续写"}`;

    const systemPrompt = this.buildFoundationProtocol({
      book,
      contextBlock,
      reviewFeedbackBlock,
      language: resolvedLanguage,
    }) + (resolvedLanguage !== "zh"
      ? `\n\n${continuationDirective}\nDerive established facts from the source package. Explicit continuation instructions control future plot and ending. Never infer a mandatory future event from tone or a mystery alone; keep unprescribed futures open. A compressed package is evidence, not permission to invent missing canon. ALL output MUST be written in English.`
      : `\n\n${continuationDirective}\n既成事实从资料包推导；未来剧情和结局服从明确的续写指令。不能仅凭文风或悬念推导必须发生的未来事件，未指定的发展保留开放。压缩资料包是证据，不是臆造缺失正典的许可。`);

    const userMessage = resolvedLanguage !== "zh"
      ? `Generate the complete foundation for the imported ${book.genre} Work titled "${book.title}". Write everything in English.\n\n${chaptersText}`
=======
    const numericalBlock = gp.numericalSystem
      ? (resolvedLanguage !== "zh"
          ? "- The story uses a trackable numerical/resource system"
          : "- 有明确的数值/资源体系可追踪")
      : (resolvedLanguage !== "zh"
          ? "- No explicit numerical system"
          : "- 本题材无数值系统");

    const isSeries = options?.importMode === "series";

    const continuationDirective = resolvedLanguage !== "zh"
      ? (isSeries
          ? `## Continuation Direction Requirements
The continuation portion must open up new narrative space — new conflict vector, new location, new time horizon. Ignite within 5 chapters; at least 50% fresh scenes.`
          : `## Continuation Direction
Naturally extend the existing arc. Advance existing conflicts, pay off planted hooks, introduce new complications organically.`)
      : (isSeries
          ? `## 续写方向要求
续写必须引入新叙事空间——新冲突、新地点、新时间。5章内引爆，50%以上场景新鲜。`
          : `## 续写方向
自然延续已有叙事弧线。推进现有冲突、兑现已埋伏笔、引入有机新变数。`);

    const systemPrompt = resolvedLanguage !== "zh"
      ? `${languageOutputInstruction(resolvedLanguage)}\n\nYou are a professional novel architect. Reverse-engineer a prose-density foundation from the source chapters and write the continuation path.${contextBlock}${reviewFeedbackBlock}

## Book metadata
- Title: ${book.title}
- Platform: ${book.platform}
- Genre: ${gp.name} (${book.genre})
- Target chapters: ${book.targetChapters}
- Chapter length: ${book.chapterWordCount}

## Genre body
${genreBody}

${numericalBlock}

${continuationDirective}

## Output contract
Follow the consolidated 5-section === SECTION: === layout: story_frame, volume_map, roles, book_rules, pending_hooks. Do NOT emit rhythm_principles or current_state — rhythm principles live in the last paragraph of volume_map; character initial status lives in roles.Current_State; initial hooks live in pending_hooks start_chapter=0 rows; era / setting anchors (only when the genre pins to a real year) are woven into story_frame's world-tonal-ground paragraph.

All prose must be derived from the source package. Do not invent settings. If the package says it is compressed, treat chapter catalog + excerpts as evidence for the foundation; the full chapters will be replayed later for detailed truth files. For volume_map, treat existing chapters as "review" (one paragraph) and continuation as prose chapter-level planning. Hook extraction must be complete for the evidence provided.

All output must follow the language requirement above.`
      : `你是专业的网络小说架构师。从已有章节中反向推导散文密度的基础设定，同时设计续写路径。${contextBlock}${reviewFeedbackBlock}

## 书籍元信息
- 标题：${book.title}
- 平台：${book.platform}
- 题材：${gp.name}（${book.genre}）
- 目标章数：${book.targetChapters}章

## 题材底色
${genreBody}

${numericalBlock}

${continuationDirective}

## 输出契约
合并后的 5 段 === SECTION: === 结构：story_frame / volume_map / roles / book_rules / pending_hooks。**不要输出 rhythm_principles 或 current_state 两个 section**——节奏原则合并进 volume_map 尾段，角色初始状态合并进 roles.当前现状，初始钩子写在 pending_hooks startChapter=0 行；环境/时代锚（只有年代文 / 历史同人 / 都市重生等真实年份题材需要）织进 story_frame.世界观底色，其他题材直接省略。

所有 prose 必须从资料包中推导，不得臆造。若资料包声明为压缩包，把章节目录和正文摘录当作基础设定证据；完整章节会在后续回放阶段逐章进入 truth files。volume_map 中，已有章节作为"回顾段"（一段散文），续写部分写到章级 prose。伏笔识别以资料包提供的证据为准，尽量完整。`;

    const userMessage = resolvedLanguage !== "zh"
      ? `Generate the complete foundation for an imported ${gp.name} novel titled "${book.title}". ${languageOutputInstruction(resolvedLanguage)}\n\n${chaptersText}`
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
      : `以下是《${book.title}》的已有正文资料包，请从中反向推导完整基础设定：\n\n${chaptersText}`;

    return this.generateFoundationInStages({
      systemPrompt,
      userMessage,
      language: resolvedLanguage,
      temperature: 0.5,
    });
  }

  async generateFanficFoundation(
    book: BookConfig,
    fanficCanon: string,
    fanficMode: FanficMode,
    reviewFeedback?: string,
    options?: {
      readonly onOutline?: (outline: { readonly storyFrame: string; readonly volumeMap: string }) => void | Promise<void>;
    },
  ): Promise<ArchitectOutput> {
    const resolvedLanguage = book.language;
    const reviewFeedbackBlock = this.buildReviewFeedbackBlock(reviewFeedback, resolvedLanguage);

    const canonBlock = resolvedLanguage !== "zh"
      ? `\n\n## Fanfic mode: ${fanficMode}\n\n## Source canon\n${fanficCanon}`
      : `\n\n## 同人模式：${fanficMode}\n\n## 原作正典\n${fanficCanon}`;
    const systemPrompt = this.buildFoundationProtocol({
      book,
      contextBlock: canonBlock,
      reviewFeedbackBlock,
      language: resolvedLanguage,
    });

    return this.generateFoundationInStages({
      systemPrompt,
      userMessage: `请为标题为"${book.title}"的${fanficMode}模式同人小说生成基础设定。目标${book.targetChapters}章，每章${book.chapterWordCount}字。`,
      language: resolvedLanguage,
      temperature: 0.7,
      onOutline: options?.onOutline,
    });
  }

  private async generateFoundationInStages(input: {
    readonly systemPrompt: string;
    readonly userMessage: string;
    readonly language: "zh" | "en" | "vi";
    readonly temperature: number;
    readonly onOutline?: (outline: { readonly storyFrame: string; readonly volumeMap: string }) => void | Promise<void>;
  }): Promise<ArchitectOutput> {
    const { result: outline } = await this.submitStructured(
      [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userMessage },
      ],
      {
        name: "submit_foundation_outline",
        label: input.language === "en" ? "Submit foundation outline" : "提交基础框架",
        description: input.language === "en"
          ? "Submit the readable story frame and volume map."
          : "提交可读的故事框架与卷纲。",
        parameters: FoundationOutlineToolSchema,
      },
      { temperature: input.temperature, maxTokens: Math.min(8192, this.ctx.client.defaults.maxTokens) },
    );
    await input.onOutline?.({
      storyFrame: outline.storyFrame.trim(),
      volumeMap: outline.volumeMap.trim(),
    });
    const detailsPrompt = input.language === "en"
      ? `${input.userMessage}\n\n<story_frame>\n${outline.storyFrame}\n</story_frame>\n\n<volume_map>\n${outline.volumeMap}\n</volume_map>\n\nComplete the readable book rules, structured rule data, and initial unresolved hooks.`
      : `${input.userMessage}\n\n<story_frame>\n${outline.storyFrame}\n</story_frame>\n\n<volume_map>\n${outline.volumeMap}\n</volume_map>\n\n继续完成可读本书规则、结构化规则数据和初始未解伏笔。`;
    const { result: details } = await this.submitStructured(
      [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: detailsPrompt },
      ],
      {
        name: "submit_foundation_details",
        label: input.language === "en" ? "Submit foundation details" : "提交基础详情",
        description: input.language === "en"
          ? "Submit book rules and initial unresolved hooks. Arrays and objects must be native tool arguments, never JSON strings."
          : "提交本书规则与初始未解伏笔。数组和对象必须是工具参数的原生类型，不要放入字符串。",
        parameters: FoundationDetailsToolSchema,
      },
      { temperature: input.temperature },
    );
    const bookRulesData = BookRulesSchema.parse({ version: "2", ...details.bookRulesData });
    const initialHooks: HookRecord[] = details.pendingHooks.map((hook) => ({
      hookId: hook.hookId.trim(),
      startChapter: 0,
      type: hook.type.trim(),
      status: "deferred",
      lastAdvancedChapter: 0,
      expectedPayoff: hook.expectedPayoff.trim(),
      notes: hook.notes.trim(),
    }));
    const pendingHooks = renderHooksProjection({ hooks: initialHooks }, input.language);

    const castContext=`${input.userMessage}\n\n${outline.storyFrame}\n\n${outline.volumeMap}\n\n${details.bookRules}`;
    const {result:cast} = await this.submitStructured([
      {role:"system",content:input.language==="en"
        ? "List the named people who shape the opening conflict. Submit only their names and major/minor roles. Do not expand unnamed occupational groups into invented biographies."
        : "列出影响开篇冲突的具名人物，只提交姓名和主要/次要角色级别，不把无名岗位群体扩写成虚构人物。"},
      {role:"user",content:castContext},
    ],{name:"submit_foundation_cast_index",label:"Identify opening cast",description:"Submit the names and tiers of the opening cast.",parameters:FoundationCastIndexToolSchema},
    {temperature:input.temperature,maxTokens:Math.min(2048,this.ctx.client.defaults.maxTokens)});
    const {result:cards} = await this.submitStructured([
      {role:"system",content:input.language==="en"
        ? "Create concise character cards for the named people who shape the opening conflict. Ground each card in the supplied story. Give present motive, knowledge, relationship pressure and limits in about 80–120 words; avoid repeating the plot or expanding unnamed occupational groups into full biographies."
        : "为影响开篇冲突的具名人物写简明角色卡。每人约150—250字，写清当下动机、已知信息、关系压力与能力边界，依据已给定故事，不重复整篇情节，不把无名岗位群体扩写成完整传记。"},
      {role:"user",content:castContext},
    ],{name:"submit_foundation_cast_documents",label:"Submit opening character cards",description:"Submit each character card as text in its named field.",parameters:foundationCastDocumentsToolSchema(cast.roles)},
    {temperature:input.temperature,maxTokens:Math.min(8192,this.ctx.client.defaults.maxTokens)});
    const roles: ArchitectRole[] = cast.roles.map((role,index)=>({tier:role.tier,name:role.name.trim(),content:cards[`role_${index+1}_content`]!.trim()}));

    return {
      storyFrame: outline.storyFrame.trim(),
      volumeMap: outline.volumeMap.trim(),
      roles,
      bookRules: details.bookRules.trim(),
      bookRulesData,
      pendingHooks,
      initialHooks,
    };
  }
  private buildReviewFeedbackBlock(
    reviewFeedback: string | undefined,
    language: "zh" | "en" | "vi",
  ): string {
    const trimmed = reviewFeedback?.trim();
    if (!trimmed) return "";

    if (language !== "zh") {
      return `\n\n## Previous Review Feedback
Apply the following requested changes to the foundation instead of paraphrasing the same design:

${trimmed}\n`;
    }

    return `\n\n## 上一轮审核反馈
按以下要求修改基础设定，不能只换措辞重写同一套方案：

${trimmed}\n`;
  }

<<<<<<< HEAD
=======
  private normalizeSectionName(name: string): string {
    return name
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[`"'*_]/g, " ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private canonicalSectionNameFromHeading(heading: string): string | null {
    const normalized = this.normalizeSectionName(heading);
    if ([
      "story_frame",
      "story_bible",
      "story_foundation",
      "foundation",
    ].some((name) => normalized.includes(name))
      || /(故事框架|故事圣经|基础设定|世界框架|故事底座)/.test(heading)) {
      return "story_frame";
    }
    if ([
      "volume_map",
      "volume_outline",
      "outline",
      "plot_map",
    ].some((name) => normalized.includes(name))
      || /(分卷地图|卷纲|分卷大纲|章节地图|故事大纲)/.test(heading)) {
      return "volume_map";
    }
    if ([
      "roles",
      "characters",
      "character_cards",
    ].some((name) => normalized.includes(name))
      || /(角色设定|人物设定|角色卡|主要角色|角色|人物)/.test(heading)) {
      return "roles";
    }
    if ([
      "book_rules",
      "rules",
      "writing_rules",
    ].some((name) => normalized.includes(name))
      || /(本书规则|写作规则|运行规则|创作规则|规则卡)/.test(heading)) {
      return "book_rules";
    }
    if ([
      "pending_hooks",
      "hooks",
      "hook_ledger",
    ].some((name) => normalized.includes(name))
      || /(待回收钩子|待回收伏笔|伏笔表|钩子表|钩子|伏笔)/.test(heading)) {
      return "pending_hooks";
    }
    if ([
      "rhythm_principles",
      "rhythm",
    ].some((name) => normalized.includes(name))
      || /(节奏原则|节奏)/.test(heading)) {
      return "rhythm_principles";
    }
    if ([
      "current_state",
      "initial_state",
    ].some((name) => normalized.includes(name))
      || /(当前状态|初始状态)/.test(heading)) {
      return "current_state";
    }
    return null;
  }

  private stripTrailingAssistantCoda(section: string): string {
    const lines = section.split("\n");
    const cutoff = lines.findIndex((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return /^(如果(?:你愿意|需要|想要|希望)|If (?:you(?:'d)? like|you want|needed)|I can (?:continue|next))/i.test(trimmed);
    });

    if (cutoff < 0) {
      return section;
    }

    return lines.slice(0, cutoff).join("\n").trimEnd();
  }

  private normalizePendingHooksSection(section: string, volumeMapRaw: string): string {
    const rows = section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|"))
      .filter((line) => !line.includes("---"))
      .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
      .filter((cells) => cells.some(Boolean));

    if (rows.length === 0) {
      return section;
    }

    const dataRows = rows.filter((row) => (row[0] ?? "").toLowerCase() !== "hook_id");
    if (dataRows.length === 0) {
      return section;
    }

    const language: "zh" | "en" | "vi" = /[\u4e00-\u9fff]/.test(section) ? "zh" : "en";
    const normalizedHooks = dataRows.map((row, index) => {
      const rawProgress = row[4] ?? "";
      const normalizedProgress = this.parseHookChapterNumber(rawProgress);
      const seedNote = normalizedProgress === 0 && this.hasNarrativeProgress(rawProgress)
        ? (language === "zh" ? `初始线索：${rawProgress}` : `initial signal: ${rawProgress}`)
        : "";

      const phase7 = row.length >= 12;
      const phase6 = row.length >= 8;
      const noteCellIndex = phase7 ? 11 : phase6 ? 7 : 6;
      const notes = this.mergeHookNotes(row[noteCellIndex] ?? "", seedNote, language);

      const base: Record<string, unknown> = {
        hookId: row[0] || `hook-${index + 1}`,
        startChapter: this.parseHookChapterNumber(row[1]),
        type: row[2] ?? "",
        status: row[3] ?? "open",
        lastAdvancedChapter: normalizedProgress,
        expectedPayoff: row[5] ?? "",
        payoffTiming: phase6 ? row[6] ?? "" : "",
        notes,
      };

      if (phase7) {
        base.dependsOn = this.parseDependsOnCell(row[7] ?? "");
        base.paysOffInArc = (row[8] ?? "").trim();
        base.coreHook = this.parseBooleanCell(row[9]);
        const halfLife = this.parseOptionalInt(row[10]);
        if (halfLife !== undefined) base.halfLifeChapters = halfLife;
      }

      return base as unknown as StoredHook;
    });

    // Phase 7 hotfix 2: pre-promote seeds based on the three structural rules
    // that don't need runtime advanced_count (core_hook / depends_on /
    // cross_volume). advanced_count-based promotion is applied later by the
    // consolidator at volume boundaries.
    const volumeBoundaries = this.parseVolumeBoundariesForPromotion(volumeMapRaw);
    const allSeedStartChapters = new Map<string, number>(
      normalizedHooks.map((hook) => [hook.hookId, hook.startChapter]),
    );
    const promotionContext: PromotionContext = {
      volumeBoundaries,
      currentChapter: 0,
      advancedCounts: new Map(),
      allSeedStartChapters,
    };
    const promotedHooks = normalizedHooks.map((hook) => {
      const decision = shouldPromoteHook(hook, promotionContext);
      const status = !decision.promote && hook.lastAdvancedChapter <= 0
        ? this.normalizeDormantSeedStatus(hook.status, language)
        : hook.status;
      return { ...hook, status, promoted: decision.promote };
    });

    return renderHookSnapshot(
      promotedHooks as unknown as Parameters<typeof renderHookSnapshot>[0],
      language,
    );
  }

  /**
   * Parse `第N卷 (A-B章)` / `Volume N (chapters A-B)` headers from the
   * architect's volume_map prose. Best-effort: missing / unparseable blocks
   * return an empty list and cross-volume promotion simply never fires.
   */
  private parseVolumeBoundariesForPromotion(raw: string): ReadonlyArray<VolumeBoundary> {
    if (!raw) return [];
    const lines = raw.split("\n");
    const volumeHeader = /^(第[一二三四五六七八九十百千万零〇\d]+卷|Volume\s+\d+)/i;
    const rangePattern = /[（(]\s*(?:第|[Cc]hapters?\s+)?(\d+)\s*[-–~～—]\s*(\d+)\s*(?:章)?\s*[）)]|(?:第|[Cc]hapters?\s+)(\d+)\s*[-–~～—]\s*(\d+)\s*(?:章)?/i;

    const volumes: VolumeBoundary[] = [];
    for (const rawLine of lines) {
      const line = rawLine.replace(/^#+\s*/, "").trim();
      if (!volumeHeader.test(line)) continue;
      const rangeMatch = line.match(rangePattern);
      if (!rangeMatch) continue;
      const startCh = parseInt(rangeMatch[1] ?? rangeMatch[3] ?? "0", 10);
      const endCh = parseInt(rangeMatch[2] ?? rangeMatch[4] ?? "0", 10);
      if (startCh <= 0 || endCh <= 0) continue;
      const rangeIndex = rangeMatch.index ?? line.length;
      const name = line.slice(0, rangeIndex).replace(/[（(]\s*$/, "").trim();
      if (name.length > 0) {
        volumes.push({ name, startCh, endCh });
      }
    }
    return volumes;
  }

  private normalizeDormantSeedStatus(status: string | undefined, language: "zh" | "en" | "vi"): string {
    const normalized = status?.trim().toLowerCase() ?? "";
    if (!normalized || /^(open|opened|active)$/i.test(normalized)) {
      return language === "zh" ? "暂缓" : "deferred";
    }
    return status?.trim() || (language === "zh" ? "暂缓" : "deferred");
  }

  private parseHookChapterNumber(value: string | undefined): number {
    if (!value) return 0;
    const match = value.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private parseDependsOnCell(value: string): ReadonlyArray<string> {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    if (lower === "none" || lower === "n/a" || lower === "-" || trimmed === "无") return [];
    const stripped = trimmed.replace(/^[\[\(]\s*/, "").replace(/\s*[\]\)]$/, "");
    return stripped
      .split(/[,，、\/]+/)
      .map((item) => item.trim().replace(/^\*\*(.+)\*\*$/, "$1").trim())
      .filter((item) => item.length > 0);
  }

  private parseBooleanCell(value: string | undefined): boolean {
    const normalized = (value ?? "").trim().toLowerCase();
    if (!normalized) return false;
    return /^(true|yes|y|是|核心|core|1|✓|✔)$/.test(normalized);
  }

  private parseOptionalInt(value: string | undefined): number | undefined {
    const normalized = (value ?? "").trim();
    if (!normalized) return undefined;
    const match = normalized.match(/\d+/);
    if (!match) return undefined;
    const parsed = parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private hasNarrativeProgress(value: string | undefined): boolean {
    const normalized = (value ?? "").trim().toLowerCase();
    if (!normalized) return false;
    return !["0", "none", "n/a", "na", "-", "无", "未推进"].includes(normalized);
  }

  private mergeHookNotes(notes: string, seedNote: string, language: "zh" | "en" | "vi"): string {
    const trimmedNotes = notes.trim();
    const trimmedSeed = seedNote.trim();
    if (!trimmedSeed) {
      return trimmedNotes;
    }
    if (!trimmedNotes) {
      return trimmedSeed;
    }
    return language === "zh"
      ? `${trimmedNotes}（${trimmedSeed}）`
      : `${trimmedNotes} (${trimmedSeed})`;
  }
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
}
