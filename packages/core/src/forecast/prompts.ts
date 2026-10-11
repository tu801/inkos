// Bilingual prompt builders for the narrative forecast agent, organized the
// same way as prompts/short-fiction.ts: each builder switches on language.

export type ForecastLanguage = "zh" | "en" | "vi";

export interface ForecastPromptInput {
  readonly contextMarkdown: string;
  readonly divergence: string;
  readonly branchCount: number;
  readonly horizon: number;
  readonly baseChapter: number;
}

export function buildForecastSystemPrompt(language: ForecastLanguage): string {
<<<<<<< HEAD
  return language === "en"
    ? "Project mutually isolated, non-canonical futures with the activated long-writing Skill. Preserve canon and surface conflicts as risks."
    : "按已激活的长篇写作 Skill 推演相互隔离的非正史候选未来。保留正典，把冲突明确列为风险。";
=======
  if (language !== "zh") {
    return [
      "You are the narrative forecast assistant for a long-form novel.",
      "Task: starting from the canonical context and the author's divergence point, project several mutually isolated, non-canonical candidate futures for the author to compare.",
      "Rules:",
      "- Branches are mutually exclusive: each assumes a different resolution of the divergence point and must not reference or depend on sibling branches.",
      "- Branches are planning material, not prose: beats describe what happens, not scene-level detail.",
      "- Respect canon: every projection must stay consistent with established facts, character locks, and world rules; any necessary conflict must be listed under risks.",
      "- Output exactly one JSON object. No explanations, no markdown headings, no code fences.",
    ].join("\n");
  }
  return [
    "你是长篇小说的叙事推演助手。",
    "任务：从正史上下文和作者给出的分歧点出发，推演多个相互隔离的非正史候选未来分支，供作者并排比较。",
    "规则：",
    "- 分支之间互斥：每个分支对分歧点做出不同走向的假设，不得引用或依赖其他分支。",
    "- 分支是规划材料，不是正文：节拍只写“发生了什么”，不写场景级细节。",
    "- 尊重正史：所有推演必须与既有事实、人设锁和世界规则一致；确需冲突时必须写进 risks。",
    "- 只输出一个 JSON 对象，不要输出解释、markdown 标题或代码围栏。",
  ].join("\n");
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
}

export function buildForecastUserPrompt(input: ForecastPromptInput, language: ForecastLanguage): string {
  const firstChapter = input.baseChapter + 1;
  if (language !== "zh") {
    return [
      input.contextMarkdown,
      "",
      "## Divergence point",
      "",
      input.divergence,
      "",
      "## Output requirements",
      "",
      `Produce exactly ${input.branchCount} candidate branches. Each branch covers roughly ${input.horizon} future chapters starting at chapter ${firstChapter}.`,
      "Submit complete branches through the forecast result tool.",
    ].join("\n");
  }
  return [
    input.contextMarkdown,
    "",
    "## 分歧点",
    "",
    input.divergence,
    "",
    "## 输出要求",
    "",
    `生成恰好 ${input.branchCount} 个候选分支。每个分支覆盖从第 ${firstChapter} 章开始、约 ${input.horizon} 章的未来走向。`,
    "通过剧情推演结果工具提交完整分支。",
  ].join("\n");
}

export function buildForecastRepairPrompt(validationError: string, language: ForecastLanguage): string {
  if (language !== "zh") {
    return [
      `Your previous output failed validation: ${validationError}`,
      "Submit the corrected complete branch set through the result tool.",
    ].join("\n");
  }
  return [
    `你上一次的输出未通过校验：${validationError}`,
<<<<<<< HEAD
    "请修正上述问题后，通过结果工具重新提交完整分支。",
=======
    "请修正上述问题后重新输出完整 JSON 对象，只输出 JSON，不要解释，不要代码围栏。",
  ].join("\n");
}

function forecastJsonShape(firstChapter: number, language: ForecastLanguage): string {
  if (language !== "zh") {
    return [
      "{",
      '  "branches": [',
      "    {",
      '      "title": "short branch title",',
      '      "premise": "the assumption this branch makes about the divergence point",',
      `      "beats": [{ "chapter": integer chapter number starting at ${firstChapter}, "summary": "what happens in that chapter" }],`,
      '      "characterDecisions": [{ "character": "name", "decision": "the key decision this character makes" }],',
      '      "projectedChanges": {',
      '        "characters": ["projected character state changes"],',
      '        "relationships": ["projected relationship changes"],',
      '        "world": ["projected world/faction changes"],',
      '        "hooks": ["which hooks advance, fire, or break"]',
      "      },",
      '      "risks": [{ "kind": "continuity|causality|character", "description": "consistency risk" }],',
      '      "uncertainties": ["open uncertainties"],',
      '      "intentAlignment": { "score": integer 0-100, "rationale": "how well this matches the author intent and current focus" }',
      "    }",
      "  ]",
      "}",
    ].join("\n");
  }
  return [
    "{",
    '  "branches": [',
    "    {",
    '      "title": "分支短标题",',
    '      "premise": "该分支对分歧点做出的前提与假设",',
    `      "beats": [{ "chapter": 从 ${firstChapter} 开始的整数章号, "summary": "该章发生什么" }],`,
    '      "characterDecisions": [{ "character": "人物名", "decision": "该人物做出的关键决策" }],',
    '      "projectedChanges": {',
    '        "characters": ["人物状态预计变化"],',
    '        "relationships": ["关系预计变化"],',
    '        "world": ["世界/势力预计变化"],',
    '        "hooks": ["哪些伏笔被推进、引爆或破坏"]',
    "      },",
    '      "risks": [{ "kind": "continuity|causality|character", "description": "一致性风险" }],',
    '      "uncertainties": ["不确定因素"],',
    '      "intentAlignment": { "score": 0到100的整数, "rationale": "与作者意图和当前聚焦的匹配说明" }',
    "    }",
    "  ]",
    "}",
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  ].join("\n");
}
