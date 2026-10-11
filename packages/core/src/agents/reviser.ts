import { BaseAgent } from "./base.js";
import type { LengthSpec } from "../models/length-governance.js";
<<<<<<< HEAD
import type { Observation } from "../models/observation.js";
import type { ContextPackage } from "../models/input-governance.js";
import { countChapterLength, assertChapterLength } from "../utils/length-metrics.js";
import { Type } from '@sinclair/typebox';
import { numberReviewSource } from '../models/observation.js';
import {textRangeEditContract,textSelectionEditContract,TextEditRangeSchema} from '../utils/text-range-edits.js';
import { ChapterRewriteToolSchema } from "./reviser-tool.js";
import {chapterDocumentBody} from '../utils/chapter-document.js';
import { renderNarrativeSelectedContext } from "../utils/narrative-control.js";
import { languageOutputInstruction, promptBaseLanguage, type WritingLanguage } from "../utils/language.js";
=======
import type { AuditIssue } from "./continuity.js";
import type { ChapterIntent, ChapterMemo, ContextPackage, RuleStack } from "../models/input-governance.js";
import { readGenreProfile, readBookLanguage, readBookRules } from "./rules-reader.js";
import { countChapterLength } from "../utils/length-metrics.js";
import { languageOutputInstruction, promptBaseLanguage, type WritingLanguage } from "../utils/language.js";
import { buildGovernedMemoryEvidenceBlocks } from "../utils/governed-context.js";
import { filterSummaries } from "../utils/context-filter.js";
import {
  buildGovernedCharacterMatrixWorkingSet,
  buildGovernedHookWorkingSet,
  mergeTableMarkdownByKey,
} from "../utils/governed-working-set.js";
import { applySpotFixPatches, parseSpotFixPatches } from "../utils/spot-fix-patches.js";
import {
  buildNarrativeIntentBrief,
  renderMemoAsNarrativeBlock,
  renderNarrativeSelectedContext,
  sanitizeNarrativeEvidenceBlock,
} from "../utils/narrative-control.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  readStoryFrame,
  readVolumeMap,
  readCharacterContext,
  readCurrentStateWithFallback,
} from "../utils/outline-paths.js";
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec

export type ReviseMode = "polish" | "rewrite" | "rework" | "anti-detect" | "spot-fix";

export const DEFAULT_REVISE_MODE: ReviseMode = "rewrite";

export interface ReviseOutput {
  readonly revisedContent: string;
  readonly wordCount: number;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export class ReviserAgent extends BaseAgent {
  get name(): string {
    return "reviser";
  }

  async reviseChapter(
    _bookDir: string,
    chapterContent: string,
    chapterNumber: number,
    observations: ReadonlyArray<Observation>,
    mode: ReviseMode = DEFAULT_REVISE_MODE,
    _genre?: string,
    options?: {
      readonly language: WritingLanguage;
      readonly chapterTitle?:string;
      readonly targetText?:string;
      readonly contextPackage: ContextPackage;
      readonly lengthSpec?: LengthSpec;
      /** Observe a complete source-bound candidate without adopting it. */
      readonly onCandidate?: (content: string) => Promise<void>;
    },
  ): Promise<ReviseOutput> {
<<<<<<< HEAD
    if (!options) throw new Error("Reviser requires governed context and language.");
    const body=(content:string)=>options.chapterTitle===undefined?content:chapterDocumentBody(content,chapterNumber,options.chapterTitle,options.language);
    chapterContent=body(chapterContent);
    const isEnglish = promptBaseLanguage(options.language) === "en";
    const observationList = observations.length > 0
      ? observations.map((issue) => [
          `- ${issue.code}: ${issue.summary}`,
          ...(issue.evidence.length > 0
            ? [`  ${isEnglish ? "Evidence" : "证据"}: ${issue.evidence.join("; ")}`]
            : []),
        ].join("\n")).join("\n")
      : (isEnglish ? "- Follow the user's explicit revision instruction in the governed context." : "- 按 governed context 中的用户明确修订要求执行。");
    const context = renderNarrativeSelectedContext(options.contextPackage.selectedContext, options.language);
    const lengthBlock = options.lengthSpec
=======
    const [currentState, ledger, hooks, styleGuideRaw, volumeOutline, storyBible, characterMatrix, chapterSummaries, parentCanon, fanficCanon] = await Promise.all([
      // Phase 5 consolidation: derive initial state from roles + seed hooks
      // when current_state.md is still the architect seed placeholder.
      readCurrentStateWithFallback(bookDir, "(文件不存在)"),
      this.readFileSafe(join(bookDir, "story/particle_ledger.md")),
      this.readFileSafe(join(bookDir, "story/pending_hooks.md")),
      this.readFileSafe(join(bookDir, "story/style_guide.md")),
      readVolumeMap(bookDir, "(文件不存在)"),
      readStoryFrame(bookDir, "(文件不存在)"),
      readCharacterContext(bookDir, "(文件不存在)"),
      this.readFileSafe(join(bookDir, "story/chapter_summaries.md")),
      this.readFileSafe(join(bookDir, "story/parent_canon.md")),
      this.readFileSafe(join(bookDir, "story/fanfic_canon.md")),
    ]);

    // Load genre profile and book rules
    const genreId = genre ?? "other";
    const [{ profile: gp }, bookLanguage] = await Promise.all([
      readGenreProfile(this.ctx.projectRoot, genreId),
      readBookLanguage(bookDir),
    ]);
    const parsedRules = await readBookRules(bookDir);
    const bookRules = parsedRules?.rules ?? null;

    // Fallback: use book_rules body when style_guide.md doesn't exist.
    // Phase 5 hotfix 2: parsedRules.body is only populated for legacy
    // book_rules.md sources — story_frame.md frontmatter yields an empty
    // body, and an empty string is NOT a usable style guide. Treat
    // missing/empty body as "no fallback available".
    const legacyRulesBody = parsedRules?.body?.trim();
    const styleGuide = styleGuideRaw !== "(文件不存在)"
      ? styleGuideRaw
      : (legacyRulesBody || "(无文风指南)");

    const resolvedLanguage = bookLanguage ?? gp.language;
    const isEnglish = promptBaseLanguage(resolvedLanguage) === "en";

    const issueList = mode === "auto"
      ? buildTieredIssueList(issues, isEnglish)
      : issues
          .map((i) => `- [${i.severity}] ${i.category}: ${i.description}\n  ${isEnglish ? "Suggestion" : "建议"}: ${i.suggestion}`)
          .join("\n");

    const numericalRule = gp.numericalSystem
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
      ? (isEnglish
          ? `\n## Length contract\n${JSON.stringify({...options.lengthSpec,currentCount:countChapterLength(chapterContent,options.lengthSpec.countingMode),unit:"words"})}`
          : `\n## 篇幅要求\n${JSON.stringify({...options.lengthSpec,currentCount:countChapterLength(chapterContent,options.lengthSpec.countingMode),unit:"正文非空白字符，含标点，不含标题"})}`)
      : "";
<<<<<<< HEAD
    const systemPrompt = `${languageOutputInstruction(options.language)}\n\n${buildRevisionProtocol(mode, options.language)}`;
    const source=mode==='spot-fix'?numberReviewSource(chapterContent):chapterContent;
    const userPrompt = isEnglish
      ? `Revise chapter ${chapterNumber}.\n\n## Observations or instruction\n${observationList}\n\n## Governed context\n${context}${lengthBlock}\n\n## Current chapter\n${source}`
      : `修订第${chapterNumber}章。\n\n## 观察或用户指令\n${observationList}\n\n## 权威上下文\n${context}${lengthBlock}\n\n## 当前章节\n${source}`;
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];
    const outputBudget = Math.min(this.ctx.client.defaults.maxTokens, Math.max(8192, Math.ceil((options.lengthSpec?.target ?? chapterContent.length) * 4) + 8192));
    const output = mode === "spot-fix" || options.targetText!==undefined
      ? await this.submitSpotFix(messages, chapterContent, outputBudget, options.lengthSpec,options.targetText,options.onCandidate)
      : await this.submitRewrite(messages, outputBudget, options.lengthSpec,body);
    const wordCount = options.lengthSpec
      ? countChapterLength(output.revisedContent, options.lengthSpec.countingMode)
      : output.wordCount;
    return { ...output, wordCount };
=======
    const protagonistBlock = bookRules?.protagonist
      ? (isEnglish
          ? `\n\nProtagonist lock: ${bookRules.protagonist.name} — ${bookRules.protagonist.personalityLock.join(", ")}. Revisions must not violate the protagonist profile.`
          : `\n\n主角人设锁定：${bookRules.protagonist.name}，${bookRules.protagonist.personalityLock.join("、")}。修改不得违反人设。`)
      : "";
    // Length guardrail only used by legacy modes (manual CLI revise).
    // Auto mode delegates length to normalize, not reviser.
    const lengthGuardrail = mode !== "auto" && options?.lengthSpec
      ? (isEnglish
          ? "\n8. Keep the chapter word count within the target range; only allow minor deviation when fixing critical issues truly requires it"
          : "\n8. 保持章节字数在目标区间内；只有在修复关键问题确实需要时才允许轻微偏离")
      : "";
    const outputLanguageInstruction = languageOutputInstruction(resolvedLanguage);
    const langPrefix = outputLanguageInstruction
      ? `${outputLanguageInstruction}\nALL output sections (FIXED_ISSUES, PATCHES, REVISED_CONTENT, UPDATED_STATE, UPDATED_HOOKS) must use that language.\n\n`
      : "";
    const governedMode = Boolean(options?.chapterIntent && options?.contextPackage && options?.ruleStack);
    const hooksWorkingSet = governedMode && options?.contextPackage
      ? buildGovernedHookWorkingSet({
          hooksMarkdown: hooks,
          contextPackage: options.contextPackage,
          chapterNumber,
          language: resolvedLanguage,
        })
      : hooks;
    const chapterSummariesWorkingSet = governedMode
      ? filterSummaries(chapterSummaries, chapterNumber)
      : chapterSummaries;
    const characterMatrixWorkingSet = governedMode
      ? buildGovernedCharacterMatrixWorkingSet({
          matrixMarkdown: characterMatrix,
          chapterIntent: options?.chapterIntent ?? volumeOutline,
          contextPackage: options!.contextPackage!,
          protagonistName: bookRules?.protagonist?.name,
        })
      : characterMatrix;

    const autoOutputMode = mode === "auto" ? resolveAutoOutputMode(issues) : "allow-full";
    const systemPromptBase = mode === "auto"
      ? this.buildAutoSystemPrompt({ langPrefix, gp, protagonistBlock, numericalRule, lengthGuardrail, resolvedLanguage, lengthSpec: options?.lengthSpec, autoOutputMode })
      : this.buildLegacySystemPrompt({ langPrefix, gp, protagonistBlock, numericalRule, lengthGuardrail, mode, resolvedLanguage });
    const systemPrompt = await this.withPromptPackGuidance(systemPromptBase, "longform.reviser");

    const ledgerBlock = gp.numericalSystem
      ? (isEnglish ? `\n## Resource Ledger\n${ledger}` : `\n## 资源账本\n${ledger}`)
      : "";
    const governedMemoryBlocks = options?.contextPackage
      ? buildGovernedMemoryEvidenceBlocks(options.contextPackage, resolvedLanguage)
      : undefined;
    const hookDebtBlock = governedMemoryBlocks?.hookDebtBlock ?? "";
    const hooksBlock = governedMemoryBlocks?.hooksBlock
      ?? (isEnglish ? `\n## Hooks Board\n${hooksWorkingSet}\n` : `\n## 伏笔池\n${hooksWorkingSet}\n`);
    const outlineBlock = volumeOutline !== "(文件不存在)"
      ? (isEnglish ? `\n## Volume Outline\n${volumeOutline}\n` : `\n## 卷纲\n${volumeOutline}\n`)
      : "";
    const bibleBlock = !governedMode && storyBible !== "(文件不存在)"
      ? (isEnglish ? `\n## Story Bible\n${storyBible}\n` : `\n## 世界观设定\n${storyBible}\n`)
      : "";
    const matrixBlock = characterMatrixWorkingSet !== "(文件不存在)"
      ? (isEnglish ? `\n## Character Matrix\n${characterMatrixWorkingSet}\n` : `\n## 角色交互矩阵\n${characterMatrixWorkingSet}\n`)
      : "";
    const summariesBlock = governedMemoryBlocks?.summariesBlock
      ?? (chapterSummariesWorkingSet !== "(文件不存在)"
        ? (isEnglish ? `\n## Chapter Summaries\n${chapterSummariesWorkingSet}\n` : `\n## 章节摘要\n${chapterSummariesWorkingSet}\n`)
        : "");
    const volumeSummariesBlock = governedMemoryBlocks?.volumeSummariesBlock ?? "";

    const hasParentCanon = parentCanon !== "(文件不存在)";
    const hasFanficCanon = fanficCanon !== "(文件不存在)";

    const canonBlock = hasParentCanon
      ? (isEnglish
          ? `\n## Parent Canon Reference\nPreserve every established canon fact while revising.\n${parentCanon}\n`
          : `\n## 正传正典参照（修稿专用）\n本书为番外作品。修改时参照正典约束，不可改变正典事实。\n${parentCanon}\n`)
      : "";

    const fanficCanonBlock = hasFanficCanon
      ? (isEnglish
          ? `\n## Fanfic Canon Reference\nPreserve canon facts, world rules, character profiles, and established speech patterns.\n${fanficCanon}\n`
          : `\n## 同人正典参照（修稿专用）\n本书为同人作品。修改时参照正典角色档案和世界规则，不可违反正典事实。角色对话必须保留原作语癖。\n${fanficCanon}\n`)
      : "";
    const reducedControlBlock = options?.contextPackage && options.ruleStack
      ? this.buildReducedControlBlock(options.chapterMemo, options.chapterIntentData, options.chapterIntent, options.contextPackage, options.ruleStack)
      : "";
    // Length guardrail only in legacy modes — auto mode delegates length to normalize.
    const lengthGuidanceBlock = mode !== "auto" && options?.lengthSpec
      ? (isEnglish
          ? `\n## Length Guardrail\nTarget: ${options.lengthSpec.target}; soft range: ${options.lengthSpec.softMin}-${options.lengthSpec.softMax}; hard range: ${options.lengthSpec.hardMin}-${options.lengthSpec.hardMax}. Compress repetition before removing core facts; do not add subplots.\n`
          : `\n## 字数护栏\n目标字数：${options.lengthSpec.target}\n允许区间：${options.lengthSpec.softMin}-${options.lengthSpec.softMax}\n极限区间：${options.lengthSpec.hardMin}-${options.lengthSpec.hardMax}\n如果修正后超出允许区间，请优先压缩冗余解释、重复动作和弱信息句，不得新增支线或删掉核心事实。\n`)
      : "";
    const styleGuideBlock = reducedControlBlock.length === 0
      ? (isEnglish ? `\n## Style Guide\n${styleGuide}` : `\n## 文风指南\n${styleGuide}`)
      : "";

    const evidenceBlock = `${ledgerBlock}
${sanitizeNarrativeEvidenceBlock(hookDebtBlock, resolvedLanguage) ?? ""}${sanitizeNarrativeEvidenceBlock(hooksBlock, resolvedLanguage) ?? ""}${sanitizeNarrativeEvidenceBlock(volumeSummariesBlock, resolvedLanguage) ?? ""}${reducedControlBlock || outlineBlock}${bibleBlock}${matrixBlock}${sanitizeNarrativeEvidenceBlock(summariesBlock, resolvedLanguage) ?? ""}${canonBlock}${fanficCanonBlock}${styleGuideBlock}${lengthGuidanceBlock}`;
    const userPrompt = isEnglish ? `Revise chapter ${chapterNumber}.

## Review Issues
${issueList}

## Current State
${currentState}
${evidenceBlock}

## Chapter To Revise
${chapterContent}` : `请修正第${chapterNumber}章。

## 审稿问题
${issueList}

## 当前状态卡
${currentState}
${evidenceBlock}

## 待修正章节
${chapterContent}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3 },
    );

    const output = this.parseOutput(
      response.content,
      gp,
      mode,
      chapterContent,
      autoOutputMode,
    );
    const mergedOutput = governedMode
      ? {
          ...output,
          updatedHooks: mergeTableMarkdownByKey(hooks, output.updatedHooks, [0]),
        }
      : output;
    const wordCount = options?.lengthSpec
      ? countChapterLength(mergedOutput.revisedContent, options.lengthSpec.countingMode)
      : mergedOutput.wordCount;
    return { ...mergedOutput, wordCount, tokenUsage: response.usage };
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  }

  private async submitSpotFix(
    messages: ReadonlyArray<{ readonly role: "system" | "user"; readonly content: string }>,
    originalChapter: string,
    maxTokens: number,
    lengthSpec?: LengthSpec,
    targetText?:string,
    onCandidate?: (content: string) => Promise<void>,
  ): Promise<ReviseOutput> {
    let planUsage={promptTokens:0,completionTokens:0,totalTokens:0};
    let contract:ReturnType<typeof textRangeEditContract>|ReturnType<typeof textSelectionEditContract>;
    if(targetText!==undefined)contract=textSelectionEditContract(originalChapter,targetText);
    else{
    const plan=await this.submitStructured(messages,{
      name:'submit_chapter_edit_ranges',label:'Select chapter edit ranges',
      description:'Select the smallest non-overlapping inclusive source line ranges needed for the requested local changes. Do not submit prose or select unrelated passages.',
      parameters:Type.Object({ranges:Type.Array(TextEditRangeSchema,{minItems:1})},{additionalProperties:false}),
      validate:result=>{textRangeEditContract(originalChapter,result.ranges);return result;},
    },{temperature:0.3,maxTokens:Math.min(maxTokens,4096)});
    planUsage=plan.usage;
    contract=textRangeEditContract(originalChapter,plan.result.ranges);
    }
    const fixedContent=contract.apply(Object.fromEntries(contract.ranges.map(range=>[`range_${range.index}_content`, ''])));
    const fixedLength=lengthSpec?countChapterLength(fixedContent,lengthSpec.countingMode):undefined;
    const replacementBudget=lengthSpec&&fixedLength!==undefined?{
      countingMode:lengthSpec.countingMode,fixedContentLength:fixedLength,
      minimum:Math.max(0,(lengthSpec.minChapterLength??0)-fixedLength),
      ...(lengthSpec.maxChapterLength===undefined?{}:{maximum:lengthSpec.maxChapterLength-fixedLength}),
    }:undefined;
    if(replacementBudget?.maximum!==undefined&&replacementBudget.maximum<0)throw Object.assign(new Error('The protected text alone exceeds the chapter maximum. These edit ranges cannot satisfy both scope and length constraints.'),{code:'CHAPTER_EDIT_SCOPE_CONFLICT',replacementBudget});
    const { result, usage } = await this.submitStructured([...messages,{role:'user',content:JSON.stringify({editableRanges:contract.ranges,replacementBudget,instruction:'Submit only replacement text in each range_N_content field. The replacement budget is shared by all fields, not per field. Keep the original trailing newline when present. The host preserves all source bytes outside the selected ranges.'})}], {
      name: "submit_chapter_range_replacements",
      label: "Submit chapter range replacements",
      description: "Submit replacement prose for each selected source range in its named field.",
      parameters: contract.parameters,
      validate: async result => {
        const candidate=contract.apply(result);
        await onCandidate?.(candidate);
        try{assertChapterLength(candidate,lengthSpec);}
        catch(error){
          const failure=error as Error&{code?:string;delivery?:object};
          if(failure.code!=='CHAPTER_LENGTH_OUT_OF_RANGE')throw error;
          const sourceLength=lengthSpec?countChapterLength(originalChapter,lengthSpec.countingMode):undefined;
          throw Object.assign(new Error(JSON.stringify({code:failure.code,...failure.delivery,scope:'selected_ranges',replacementBudget,source:{length:sourceLength,unchangedByThisAttempt:true},candidateCommitted:false,instruction:'The rejected replacement has not changed the source chapter. Adjust only the selected replacement fields to their combined budget. Do not include or rewrite protected surrounding text.'})),{code:failure.code,delivery:failure.delivery,replacementBudget});
        }
        return result;
      },
    }, { temperature: 0.3, maxTokens });
    const revisedContent = contract.apply(result);
    return {
      revisedContent,
      wordCount: revisedContent.length,
      tokenUsage:{promptTokens:planUsage.promptTokens+usage.promptTokens,completionTokens:planUsage.completionTokens+usage.completionTokens,totalTokens:planUsage.totalTokens+usage.totalTokens},
    };
  }

<<<<<<< HEAD
  private async submitRewrite(
    messages: ReadonlyArray<{ readonly role: "system" | "user"; readonly content: string }>,
    maxTokens: number,
    lengthSpec?: LengthSpec,
    normalizeContent:(content:string)=>string=content=>content,
  ): Promise<ReviseOutput> {
    const { result, usage } = await this.submitStructured(messages, {
      name: "submit_revised_chapter",
      label: "Submit revised chapter",
      description: "Submit the complete revised chapter and addressed observations.",
      parameters: ChapterRewriteToolSchema,
      validate: result => {
        const revisedContent=normalizeContent(result.revisedContent);
        if(!revisedContent.trim())throw Object.assign(new Error('Submit chapter prose in addition to its title'),{code:'CHAPTER_BODY_EMPTY'});
        assertChapterLength(revisedContent,lengthSpec);
        return{...result,revisedContent};
      },
    }, { temperature: 0.3, maxTokens });
    return {
      revisedContent: result.revisedContent,
      wordCount: result.revisedContent.length,
      tokenUsage: usage,
    };
=======
  private buildAutoSystemPrompt(params: {
    langPrefix: string;
    gp: GenreProfile;
    protagonistBlock: string;
    numericalRule: string;
    lengthGuardrail: string;
    resolvedLanguage: WritingLanguage;
    lengthSpec?: LengthSpec;
    autoOutputMode: AutoOutputMode;
  }): string {
    const { langPrefix, gp, protagonistBlock, numericalRule, resolvedLanguage, lengthSpec, autoOutputMode } = params;
    // lengthGuardrail intentionally not used in auto mode — length constraint is embedded in REVISED_CONTENT description
    const en = promptBaseLanguage(resolvedLanguage) === "en";
    const ledgerSection = gp.numericalSystem
      ? (en ? "\n=== UPDATED_LEDGER ===\n(Full updated resource ledger)" : "\n=== UPDATED_LEDGER ===\n(更新后的完整资源账本)")
      : "";
    const rewriteLengthConstraint = lengthSpec
      ? (en
          ? `\n  HARD CONSTRAINT: The revised chapter must stay within ${lengthSpec.softMin}-${lengthSpec.softMax} characters (target: ${lengthSpec.target}, ±25%). This is non-negotiable — do not exceed this range.`
          : `\n  硬性约束：重写后的章节必须控制在 ${lengthSpec.softMin}-${lengthSpec.softMax} 字以内（目标 ${lengthSpec.target} 字，±25%）。这是不可突破的底线。`)
      : "";

    const routingDirectiveEn = autoOutputMode === "rewrite-only"
      ? "\n\nROUTING: The reviewer's blocking issues are structural / semantic (character collapse, mainline drift, missing payoff, timeline break, unpaid hook, memo drift, etc.). You MUST output REVISED_CONTENT — do not emit PATCHES, they cannot fix this class of problem. If you cannot safely rewrite, say so in FIXED_ISSUES and leave REVISED_CONTENT empty."
      : autoOutputMode === "patch-only"
        ? "\n\nROUTING: The reviewer's blocking issues are local (wording, paragraph shape, fatigue word, information boundary, knowledge pollution). You MUST output PATCHES only — do not rewrite the whole chapter. If patches are not possible, leave PATCHES empty."
        : "";
    const routingDirectiveZh = autoOutputMode === "rewrite-only"
      ? "\n\n分流指令：reviewer 报告的阻塞问题属于结构/语义错（人设崩、主线偏、爽点缺、时间线错、伏笔未收、memo 偏离等）。你必须输出 REVISED_CONTENT——禁止输出 PATCHES，这类问题不能靠补丁修复。如果无法安全重写，在 FIXED_ISSUES 里说明并留空 REVISED_CONTENT。"
      : autoOutputMode === "patch-only"
        ? "\n\n分流指令：reviewer 报告的阻塞问题属于局部错（措辞、段落形状、疲劳词、信息越界、知识污染）。你必须只输出 PATCHES——不要整章改写。如果做不出补丁，留空 PATCHES。"
        : "";

    return en
      ? `${langPrefix}You are a professional ${gp.name} web-fiction revision editor. Fix the chapter according to the review notes.${protagonistBlock}${routingDirectiveEn}

PATCHES and REVISED_CONTENT serve different problems — choose by problem type, not preference:

PATCHES — for local text issues (wording, dialogue, AI-tell phrases, small continuity errors).
  Each PATCH quotes the passage to change (a sentence, a paragraph, or multiple paragraphs) and provides a replacement. Untouched text stays exactly as-is.

REVISED_CONTENT — for whole-chapter issues (length compression, structural rewrite, pacing restructure, major plot realignment).
  Outputs the full revised chapter. When Critical issues include length or structural problems, you must use REVISED_CONTENT — patches cannot compress or restructure a chapter.${rewriteLengthConstraint}

If Critical issues include both local and whole-chapter problems, use REVISED_CONTENT (it addresses everything in one pass).

Revision principles:
1. Fix root causes — do not apply superficial polish${numericalRule}
2. Hook status must stay in sync with the hooks board. If hook debt briefs are provided, preserve hook payoff scenes
3. Do not alter the plot direction or core conflicts
4. Preserve the original language style, rhythm, and pacing — do not compress transitional scenes or remove breathing room
5. Emotion through action (never "he felt angry" — show it). Values through behavior, not slogans
6. Different characters speak differently. No "everyone gasped in unison"
7. Escalate: bad things stack, each worse than the last

Cycle-aware revision:
- If this chapter should be "aftermath" but is still escalating tension, rewrite the densest conflict passage into a change-showing passage — who lost what, whose attitude shifted, what the new normal is
- If this chapter should be "climax" but has no clear payoff, find the closest scene to a reward and amplify it — make the promised release exceed reader expectations
- Daily passages that don't serve the main line: rewrite as "bait" — add a detail pointing to the future, a hint, a character reaction that seeds curiosity

Output format:

=== FIXED_ISSUES ===
(List each fix on its own line; if a safe local fix is not possible, explain here)

=== PATCHES ===
(Output local patches if applicable. Omit this section entirely if using REVISED_CONTENT)
--- PATCH 1 ---
TARGET_TEXT:
(Exact quote from the original that identifies the passage to change)
REPLACEMENT_TEXT:
(Replacement text for this passage)
--- END PATCH ---

=== REVISED_CONTENT ===
(Full revised chapter content — only when PATCHES cannot solve the problem. Omit this section if using PATCHES)

=== UPDATED_STATE ===
(Full updated state card)
${ledgerSection}
=== UPDATED_HOOKS ===
(Full updated hooks board)`
      : `${langPrefix}你是一位专业的${gp.name}网络小说修稿编辑。你的任务是根据审稿意见对章节进行修正。${protagonistBlock}${routingDirectiveZh}

PATCHES 和 REVISED_CONTENT 分别处理不同类型的问题——按问题类型选择，不是按偏好：

PATCHES——处理局部文字问题（措辞、对话、AI痕迹、小的连续性错误）。
  每个 PATCH 引用要修改的原文段落（一句、一段或多段皆可），给出替换文本。未涉及的内容保持原样。

REVISED_CONTENT——处理全章级问题（字数压缩、结构重组、节奏重排、重大剧情偏离）。
  输出修正后的完整正文。当 Critical 问题包含字数或结构性问题时，必须使用 REVISED_CONTENT——PATCHES 无法压缩或重构整章。${rewriteLengthConstraint}

如果 Critical 同时包含局部问题和全章问题，使用 REVISED_CONTENT（一次性解决所有问题）。

修稿原则：
1. 修根因，不做表面润色${numericalRule}
2. 伏笔状态必须与伏笔池同步。如果提供了 Hook Debt 简报，必须保留伏笔兑现段落
3. 不改变剧情走向和核心冲突
4. 保持原文的语言风格、节奏和呼吸——不要压缩过渡段、不要删掉减速段
5. 情绪用动作外化（不写"他感到愤怒"，写动作）。价值观通过行为传达
6. 不同角色说话方式必须不同。禁止"众人齐声惊呼"
7. 坏事叠坏事，每层比上一层过分

小目标周期修稿指引：
- 如果本章应该是"后效"阶段但仍在加压，把最密集的冲突段落改写为展示改变的段落——谁失去了什么、谁的态度变了、新的常态是什么
- 如果本章应该是"爆发"阶段但没有明确兑现，找到最接近回报的场景并放大它——让承诺的释放超过读者预期
- 日常段落如果不服务主线，改写为"饵"：加入一个指向未来的细节、一句暗示、一个角色反应

输出格式：

=== FIXED_ISSUES ===
(逐条说明修正了什么)

=== PATCHES ===
(局部补丁——仅用于局部文字问题。有全章级问题时省略此区块)
--- PATCH 1 ---
TARGET_TEXT:
(从原文中精确引用要修改的段落)
REPLACEMENT_TEXT:
(替换后的文本)
--- END PATCH ---

=== REVISED_CONTENT ===
(修正后的完整正文——用于字数/结构/节奏等全章级问题。仅局部问题时省略此区块)

=== UPDATED_STATE ===
(更新后的完整状态卡)
${ledgerSection}
=== UPDATED_HOOKS ===
(更新后的完整伏笔池)`;
  }

  private buildLegacySystemPrompt(params: {
    langPrefix: string;
    gp: GenreProfile;
    protagonistBlock: string;
    numericalRule: string;
    lengthGuardrail: string;
    mode: ReviseMode;
    resolvedLanguage: WritingLanguage;
  }): string {
    const { langPrefix, gp, protagonistBlock, numericalRule, lengthGuardrail, mode, resolvedLanguage } = params;
    if (promptBaseLanguage(resolvedLanguage) === "en") {
      const modeDescription: Record<ReviseMode, string> = {
        auto: "",
        polish: "Polish wording, rhythm, paragraph flow, and punctuation without changing facts, plot outcomes, names, or causality.",
        rewrite: "Rewrite only the problem passages and their immediate context. Preserve core facts, motivations, and as much unaffected prose as possible.",
        rework: "Restructure scene progression and conflict where necessary without changing the core setting or major event outcomes.",
        "anti-detect": "Reduce formulaic AI patterns while preserving plot, facts, voice, and causality.",
        "spot-fix": "Change only the exact sentences or paragraphs identified by the review; all unrelated text must remain untouched.",
      };
      const outputFormat = mode === "spot-fix"
        ? `=== FIXED_ISSUES ===
(One fix per line; explain here if a safe local fix is impossible.)

=== PATCHES ===
--- PATCH 1 ---
TARGET_TEXT:
(Exact, uniquely matching quote from the original.)
REPLACEMENT_TEXT:
(Local replacement text.)
--- END PATCH ---

=== UPDATED_STATE ===
(Complete updated state card.)
${gp.numericalSystem ? "\n=== UPDATED_LEDGER ===\n(Complete updated resource ledger.)" : ""}
=== UPDATED_HOOKS ===
(Complete updated hooks board.)`
        : `=== FIXED_ISSUES ===
(One fix per line.)

=== REVISED_CONTENT ===
(Complete revised chapter.)

=== UPDATED_STATE ===
(Complete updated state card.)
${gp.numericalSystem ? "\n=== UPDATED_LEDGER ===\n(Complete updated resource ledger.)" : ""}
=== UPDATED_HOOKS ===
(Complete updated hooks board.)`;

      return `${langPrefix}You are a professional ${gp.name} web-fiction revision editor. Revise the chapter according to the review notes.${protagonistBlock}

Revision mode: ${modeDescription[mode]}

Revision principles:
1. Keep the scope within the selected mode.
2. Fix root causes instead of applying superficial polish.${numericalRule}
3. Keep hook status synchronized with the hooks board.
4. Do not change plot direction or core conflicts.
5. Preserve the source chapter's language, voice, and rhythm.
6. Update the state card${gp.numericalSystem ? ", ledger" : ""}, and hooks board after revision.
${lengthGuardrail}
${mode === "spot-fix" ? "\n7. Output local PATCHES only; TARGET_TEXT must match exactly once. If a broad rewrite is required, explain why and leave PATCHES empty." : ""}

Output format:

${outputFormat}`;
    }
    const modeDesc = MODE_DESCRIPTIONS[mode];
    const outputFormat = mode === "spot-fix"
      ? `=== FIXED_ISSUES ===
(逐条说明修正了什么，一行一条；如果无法安全定点修复，也在这里说明)

=== PATCHES ===
--- PATCH 1 ---
TARGET_TEXT:
(必须从原文中精确复制、且能唯一命中的原句或原段)
REPLACEMENT_TEXT:
(替换后的局部文本)
--- END PATCH ---

=== UPDATED_STATE ===
(更新后的完整状态卡)
${gp.numericalSystem ? "\n=== UPDATED_LEDGER ===\n(更新后的完整资源账本)" : ""}
=== UPDATED_HOOKS ===
(更新后的完整伏笔池)`
      : `=== FIXED_ISSUES ===
(逐条说明修正了什么，一行一条)

=== REVISED_CONTENT ===
(修正后的完整正文)

=== UPDATED_STATE ===
(更新后的完整状态卡)
${gp.numericalSystem ? "\n=== UPDATED_LEDGER ===\n(更新后的完整资源账本)" : ""}
=== UPDATED_HOOKS ===
(更新后的完整伏笔池)`;

    return `${langPrefix}你是一位专业的${gp.name}网络小说修稿编辑。你的任务是根据审稿意见对章节进行修正。${protagonistBlock}

修稿模式：${modeDesc}

修稿原则：
1. 按模式控制修改幅度
2. 修根因，不做表面润色${numericalRule}
4. 伏笔状态必须与伏笔池同步
5. 不改变剧情走向和核心冲突
6. 保持原文的语言风格和节奏
7. 修改后同步更新状态卡${gp.numericalSystem ? "、账本" : ""}、伏笔池
${lengthGuardrail}
${mode === "spot-fix" ? "\n9. spot-fix 只能输出局部补丁，禁止输出整章改写；TARGET_TEXT 必须能在原文中唯一命中\n10. 如果需要大面积改写，说明无法安全 spot-fix，并让 PATCHES 留空" : ""}

输出格式：

${outputFormat}`;
  }

  private async readFileSafe(path: string): Promise<string> {
    try {
      return await readFile(path, "utf-8");
    } catch {
      return "(文件不存在)";
    }
  }

  private buildReducedControlBlock(
    memo: ChapterMemo | undefined,
    intent: ChapterIntent | undefined,
    chapterIntent: string | undefined,
    contextPackage: ContextPackage,
    ruleStack: RuleStack,
  ): string {
    const selectedContext = renderNarrativeSelectedContext(contextPackage.selectedContext, "zh")
      .replace(/^### /gm, "- ");
    const overrides = ruleStack.activeOverrides.length > 0
      ? ruleStack.activeOverrides
        .map((override) => `- ${override.from} -> ${override.to}: ${override.reason} (${override.target})`)
        .join("\n")
      : "- none";
    // Prefer memo-based narrative block; fall back to legacy intent markdown
    const narrativeBlock = memo
      ? renderMemoAsNarrativeBlock(memo, intent, "zh")
      : chapterIntent
        ? buildNarrativeIntentBrief(chapterIntent, "zh")
        : "(无)";

    return `\n## 本章控制输入（由 Planner/Composer 编译）
${narrativeBlock}

### 已选上下文
${selectedContext || "- none"}

### 规则栈
- 硬护栏：${ruleStack.sections.hard.join("、") || "(无)"}
- 软约束：${ruleStack.sections.soft.join("、") || "(无)"}
- 诊断规则：${ruleStack.sections.diagnostic.join("、") || "(无)"}

### 当前覆盖
${overrides}\n`;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  }
}

function buildRevisionProtocol(mode: ReviseMode, language: WritingLanguage): string {
  const modes: Record<ReviseMode, { readonly en: string; readonly zh: string }> = {
    polish: { en: "Edit wording only; keep facts, events, characters, and causality.", zh: "只改文字表面，保持事实、事件、人物和因果。" },
    rewrite: { en: "Rewrite the affected passages; rewrite the whole chapter only when the instruction spans it.", zh: "重写受影响段落；只有要求跨越整章时才重写整章。" },
    rework: { en: "Scenes and conflict may be restructured within the supplied authority.", zh: "可在输入权威范围内重构场景与冲突。" },
    "anti-detect": { en: "Change wording only while preserving story facts and causality.", zh: "只调整文字表面，保持剧情事实和因果。" },
    "spot-fix": { en: "Select only the source line ranges needed for the local request, then replace those ranges while preserving surrounding text.", zh: "先选择局部请求涉及的原文行范围，再替换这些范围，保留范围外正文。" },
  };
  return promptBaseLanguage(language) === "en"
    ? `Revise with the activated professional Skill and governed context. ${modes[mode].en} Submit the result through the required tool.`
    : `按已激活的专业 Skill 和 governed context 修订。${modes[mode].zh}通过指定结果工具提交。`;
}
