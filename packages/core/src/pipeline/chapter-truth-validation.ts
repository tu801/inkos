import type { StateValidationAuthorityContext, ValidationResult, StateValidatorAgent } from "../agents/state-validator.js";
import type { WriteChapterOutput, WriterAgent } from "../agents/writer.js";
import type { BookConfig } from "../models/book.js";
import type { ContextPackage } from "../models/input-governance.js";
import type { Logger } from "../utils/logger.js";
import type { LengthLanguage } from "../utils/length-metrics.js";
import { reconcileChapterStateAfterReview } from "./chapter-state-recovery.js";
import { loadRuntimeStateSnapshot } from "../state/runtime-state-store.js";
import {
  renderChapterSummariesProjection,
  renderCurrentStateProjection,
  renderHooksProjection,
} from "../state/state-projections.js";

export async function validateChapterTruthPersistence(params: {
  readonly writer: Pick<WriterAgent, "settleChapterState">;
  readonly validator: Pick<StateValidatorAgent, "validate">;
  readonly book: BookConfig;
  readonly bookDir: string;
  readonly chapterNumber: number;
  readonly title: string;
  readonly content: string;
  readonly persistenceOutput: WriteChapterOutput;
  readonly previousTruth: {
    readonly oldState: string;
    readonly oldHooks: string;
  };
  readonly authorityContext?: StateValidationAuthorityContext;
  readonly reducedControlInput: {
    chapterIntent: string;
    contextPackage: ContextPackage;
  };
  readonly language: LengthLanguage;
  readonly logWarn: (message: { zh: string; en: string }) => void;
  readonly logger?: Pick<Logger, "warn">;
}): Promise<{
  readonly validation: ValidationResult;
  readonly persistenceOutput: WriteChapterOutput;
}> {
  let validation: ValidationResult;
  let persistenceOutput = params.persistenceOutput;

  try {
    validation = await params.validator.validate(
      params.content,
      params.chapterNumber,
      params.previousTruth.oldState,
      persistenceOutput.updatedState,
      params.previousTruth.oldHooks,
      persistenceOutput.updatedHooks,
      params.language,
      params.authorityContext,
    );
  } catch (error) {
    params.logger?.warn(`State validation error for chapter ${params.chapterNumber}: ${String(error)}`);
<<<<<<< HEAD
=======
    const errorDescription = params.language !== "zh"
      ? `State validation unavailable: ${String(error)}`
      : `状态校验不可用：${String(error)}`;
    const errorIssue: AuditIssue = {
      severity: "warning",
      category: "state-validation",
      description: errorDescription,
      suggestion: params.language !== "zh"
        ? "Repair chapter state from the persisted body before continuing."
        : "请先基于已保存正文修复本章 state，再继续后续章节。",
    };
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    return {
      validation: {
        consistent: false,
        reconciliationRequired: true,
        observations: [{
          code: "state-validation-unavailable",
          summary: `State validation was unavailable: ${String(error)}`,
          evidence: [],
        }],
      },
      persistenceOutput: await preserveCanonicalRuntimeState(params, persistenceOutput),
    };
  }

  if (validation.observations.length > 0) {
    params.logWarn({
      zh: `状态校验：第${params.chapterNumber}章发现 ${validation.observations.length} 条观察`,
      en: `State validation: ${validation.observations.length} observation(s) for chapter ${params.chapterNumber}`,
    });
    for (const observation of validation.observations) {
      params.logger?.warn(`  [${observation.code}] ${observation.summary}`);
    }
  }

  if (!validation.consistent || validation.reconciliationRequired) {
    const recovery = await reconcileChapterStateAfterReview({
      writer: params.writer,
      validator: params.validator,
      book: params.book,
      bookDir: params.bookDir,
      chapterNumber: params.chapterNumber,
      title: params.title,
      content: params.content,
      reducedControlInput: params.reducedControlInput,
      oldState: params.previousTruth.oldState,
      oldHooks: params.previousTruth.oldHooks,
      originalValidation: validation,
      authorityContext: params.authorityContext,
      language: params.language,
      logWarn: params.logWarn,
      logger: params.logger,
    });

    persistenceOutput = recovery.kind === "reconciled"
      ? recovery.output
      : await preserveCanonicalRuntimeState(params, recovery.output);
    validation = recovery.validation;
  }

  return {
    validation,
    persistenceOutput,
  };
}

async function preserveCanonicalRuntimeState(
  params: {
    readonly bookDir: string;
    readonly language: LengthLanguage;
  },
  output: WriteChapterOutput,
): Promise<WriteChapterOutput> {
  const snapshot = await loadRuntimeStateSnapshot(params.bookDir);
  return {
    ...output,
    runtimeStateSnapshot: snapshot,
    updatedState: renderCurrentStateProjection(snapshot.currentState, params.language),
    updatedHooks: renderHooksProjection(snapshot.hooks, params.language),
    updatedChapterSummaries: renderChapterSummariesProjection(snapshot.chapterSummaries, params.language),
    runtimeStateApplied: false,
  };
}
