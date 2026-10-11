import type {
  ChapterSummariesState,
  CurrentStateState,
  HooksState,
} from "../models/runtime-state.js";
<<<<<<< HEAD
=======
import {
  localizeHookPayoffTiming,
  resolveHookPayoffTiming,
} from "../utils/hook-lifecycle.js";
import {
  computeHookDiagnostics,
  renderHookDiagnosticMarker,
} from "../utils/hook-stale-detection.js";
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
import type { WritingLanguage } from "../utils/language.js";

export function renderHooksProjection(
  state: HooksState,
  language: WritingLanguage = "zh",
  options?: { readonly currentChapter?: number },
): string {
<<<<<<< HEAD
  void options;
  const title = language !== "zh" ? "# Pending Hooks" : "# 伏笔池";
=======
  const title = language !== "zh" ? "# Pending Hooks" : "# 伏笔池";
  // Phase 7 + hotfixes 1 & 2: depends_on / pays_off_in_arc / core_hook / half_life / promoted
  // are visible columns, so writer and reviewer both see the causal chain, planned payoff arc,
  // stale threshold, and promotion flag. stale / blocked diagnostic flags are appended to the
  // status cell.
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  const headers = language !== "zh"
    ? [
      "| hook_id | start_chapter | type | status | last_advanced_chapter | expected_payoff | notes |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    : [
      "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    ];

  const rows = [...state.hooks]
    .sort((left, right) => (
      left.startChapter - right.startChapter
      || left.lastAdvancedChapter - right.lastAdvancedChapter
      || left.hookId.localeCompare(right.hookId)
    ))
    .map((hook) => `| ${
        [
          hook.hookId,
          hook.startChapter,
          hook.type,
          hook.status,
          hook.lastAdvancedChapter,
          hook.expectedPayoff,
          hook.notes,
        ].map(escapeTableCell).join(" | ")
      } |`);

  return [title, "", ...headers, ...rows, ""].join("\n");
}

<<<<<<< HEAD
=======
function renderDependsOnCell(ids: ReadonlyArray<string>, language: WritingLanguage): string {
  if (ids.length === 0) return language !== "zh" ? "none" : "无";
  return `[${ids.join(", ")}]`;
}

function renderCoreHookCell(isCore: boolean, language: WritingLanguage): string {
  if (language !== "zh") return isCore ? "true" : "false";
  return isCore ? "是" : "否";
}

function renderHalfLifeCell(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
  return String(Math.trunc(value));
}

function renderPromotedCell(value: boolean | undefined, language: WritingLanguage): string {
  if (value === undefined) return "";
  if (language !== "zh") return value ? "true" : "false";
  return value ? "是" : "否";
}

>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
export function renderChapterSummariesProjection(
  state: ChapterSummariesState,
  language: WritingLanguage = "zh",
): string {
  const title = language !== "zh" ? "# Chapter Summaries" : "# 章节摘要";
  const headers = language !== "zh"
    ? [
      "| Chapter | Title | Characters | Key Events | State Changes | Hook Activity | Mood | Chapter Type |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    : [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ];

  const rows = [...state.rows]
    .sort((left, right) => left.chapter - right.chapter)
    .map((summary) => `| ${
      [
        summary.chapter,
        summary.title,
        summary.characters,
        summary.events,
        summary.stateChanges,
        summary.hookActivity,
        summary.mood,
        summary.chapterType,
      ].map(escapeTableCell).join(" | ")
    } |`);

  return [title, "", ...headers, ...rows, ""].join("\n");
}

export function renderCurrentStateProjection(
  state: CurrentStateState,
  language: WritingLanguage = "zh",
): string {
<<<<<<< HEAD
  const title = language !== "zh" ? "# Current State" : "# 当前状态";
  const chapterLabel = language !== "zh" ? "Current chapter" : "当前章节";
  const headers = language !== "zh"
    ? [
        "| Subject | Predicate | Object | Valid from | Source chapter |",
        "| --- | --- | --- | --- | --- |",
      ]
    : [
        "| 主体 | 关系 / 属性 | 当前事实 | 生效章节 | 来源章节 |",
        "| --- | --- | --- | --- | --- |",
      ];
  const facts = state.facts
    .filter((fact) => fact.validUntilChapter === null || fact.validUntilChapter >= state.chapter)
    .sort((left, right) => (
      left.subject.localeCompare(right.subject)
      || left.predicate.localeCompare(right.predicate)
      || left.object.localeCompare(right.object)
    ))
    .map((fact) => `| ${[
      fact.subject,
      fact.predicate,
      fact.object,
      fact.validFromChapter,
      fact.sourceChapter,
    ].map(escapeTableCell).join(" | ")} |`);
=======
  const layout = language !== "zh"
    ? {
      title: "# Current State",
      tableHeader: "| Field | Value |",
      labels: {
        chapter: "Current Chapter",
        location: "Current Location",
        protagonistState: "Protagonist State",
        goal: "Current Goal",
        constraint: "Current Constraint",
        alliances: "Current Alliances",
        conflict: "Current Conflict",
      },
      placeholders: "(not set)",
      additionalTitle: "## Additional State",
    }
    : {
      title: "# 当前状态",
      tableHeader: "| 字段 | 值 |",
      labels: {
        chapter: "当前章节",
        location: "当前位置",
        protagonistState: "主角状态",
        goal: "当前目标",
        constraint: "当前限制",
        alliances: "当前敌我",
        conflict: "当前冲突",
      },
      placeholders: "（未设定）",
      additionalTitle: "## 其他状态",
    };

  const slots = [
    {
      label: layout.labels.location,
      aliases: ["Current Location", "当前位置"],
    },
    {
      label: layout.labels.protagonistState,
      aliases: ["Protagonist State", "主角状态"],
    },
    {
      label: layout.labels.goal,
      aliases: ["Current Goal", "当前目标"],
    },
    {
      label: layout.labels.constraint,
      aliases: ["Current Constraint", "当前限制"],
    },
    {
      label: layout.labels.alliances,
      aliases: ["Current Alliances", "Current Relationships", "当前敌我"],
    },
    {
      label: layout.labels.conflict,
      aliases: ["Current Conflict", "当前冲突"],
    },
  ] as const;

  const knownPredicates = new Set(
    slots.flatMap((slot) => slot.aliases.map(normalizePredicate)),
  );
  const lines = [
    layout.title,
    "",
    layout.tableHeader,
    "| --- | --- |",
    `| ${layout.labels.chapter} | ${escapeTableCell(state.chapter)} |`,
    ...slots.map((slot) => {
      const value = findFactValue(state, slot.aliases) ?? layout.placeholders;
      return `| ${slot.label} | ${escapeTableCell(value)} |`;
    }),
  ];

  const additionalFacts = [...state.facts]
    .filter((fact) => !knownPredicates.has(normalizePredicate(fact.predicate)))
    .sort((left, right) => compareAdditionalFacts(left.predicate, right.predicate));

  if (additionalFacts.length === 0) {
    return [...lines, ""].join("\n");
  }
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec

  return [
    title,
    "",
    `> ${chapterLabel}: ${state.chapter}`,
    "",
    ...headers,
    ...facts,
    "",
  ].join("\n");
}

function escapeTableCell(value: string | number): string {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim();
}
