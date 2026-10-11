import { StoryGraphSchema, type StoryGraph } from "./graph-schema.js";
import type { StoryGraphContentSubmission } from "./tool-schemas.js";
import { validateStoryGraph } from "./validation.js";

export interface MaterializeStoryGraphInput {
  readonly projectId: string;
  readonly title: string;
  readonly content: StoryGraphContentSubmission;
}

export function materializeStoryGraph(input: MaterializeStoryGraphInput): StoryGraph {
  const graph = StoryGraphSchema.parse({
    ...input.content,
    schemaVersion: 1,
    projectId: input.projectId,
    title: input.title,
  });
  const reasons = graphValidationReasons(graph);
  if (reasons.length > 0) {
    throw new Error(`Story graph is not playable: ${reasons.join("; ")}`);
  }
  return graph;
}

<<<<<<< HEAD
function graphValidationReasons(graph: StoryGraph): string[] {
  const startCount = graph.nodes.filter((node) => node.type === "start").length;
  const branchCount = graph.nodes.filter((node) => {
    if (node.choices.length < 2) return false;
    const outcomes = new Set(node.choices.map((choice) => JSON.stringify({
      targetNodeId: choice.targetNodeId,
      condition: choice.condition,
      effects: choice.effects,
    })));
    return outcomes.size > 1;
  }).length;
  const report = validateStoryGraph(graph);
  return [
    ...(startCount !== 1 ? [`expected exactly one start node, received ${startCount}`] : []),
    ...(branchCount < 1 ? ["expected at least one meaningful branching decision"] : []),
    ...(graph.endings.length < 1 ? ["expected at least one ending"] : []),
    ...report.issues.filter((issue) => issue.level === "error").map((issue) => issue.message),
  ];
=======
export interface GenerateStoryGraphInput {
  readonly projectId: string;
  readonly title: string;
  readonly premise: string;
}

export async function generateStoryGraph(
  client: LLMClient,
  model: string,
  input: GenerateStoryGraphInput,
  options?: { readonly maxTokens?: number; readonly language?: "zh" | "en" | "vi" },
): Promise<StoryGraph> {
  const language = options?.language ?? "zh";
  const systemPrompt = language !== "zh" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
  const userPrompt = language !== "zh"
    ? `Title: ${input.title}\nPremise: ${input.premise}`
    : `标题：${input.title}\n前提：${input.premise}`;
  const res = await chatCompletion(client, model, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.5, maxTokens: options?.maxTokens ?? 8000 });
  return buildStoryGraphFromLLMText(res.content, input.projectId);
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
}
