import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLLMClient } from "../llm/provider.js";
import { ReviserAgent } from "../agents/reviser.js";
import { buildWriterSystemPrompt } from "../agents/writer-prompts.js";
import { getPlannerMemoSystemPrompt } from "../agents/planner-prompts.js";
import { buildSettlerSystemPrompt } from "../agents/settler-prompts.js";
import { BookConfigSchema, type BookConfig } from "../models/book.js";
import { StateManager } from "../state/manager.js";
import { languageOutputInstruction } from "../utils/language.js";
import { readChapterHeading, splitChapters } from "../utils/chapter-splitter.js";
import { renderChapterDocument } from "../utils/chapter-document.js";

const fetchWithProxyMock = vi.hoisted(() => vi.fn());
vi.mock("../utils/proxy-fetch.js", () => ({ fetchWithProxy: fetchWithProxyMock }));

const VI_GUARD = "Toàn bộ nội dung đầu ra phải viết bằng tiếng Việt tự nhiên";

function book(language: BookConfig["language"]): BookConfig {
  const now = new Date().toISOString();
  return BookConfigSchema.parse({
    id: "mua-ha-noi",
    title: "Mưa Hà Nội",
    platform: "other",
    genre: "literary",
    status: "active",
    targetChapters: 10,
    chapterWordCount: 2_000,
    language,
    createdAt: now,
    updatedAt: now,
  });
}

afterEach(() => fetchWithProxyMock.mockReset());

describe("Vietnamese output guard", () => {
  it("is only emitted for vi so zh/en prompts stay unchanged", () => {
    expect(languageOutputInstruction("zh")).toBe("");
    expect(languageOutputInstruction("en")).toBe("");
    for (const language of ["zh", "en"] as const) {
      expect(buildWriterSystemPrompt(book(language), null, "", "")).not.toContain("【");
      expect(getPlannerMemoSystemPrompt(language)).not.toContain(VI_GUARD);
      expect(buildSettlerSystemPrompt(book(language), null, language)).not.toContain(VI_GUARD);
    }
  });

  it("routes vi to English control prompts plus the Vietnamese guard", () => {
    const planner = getPlannerMemoSystemPrompt("vi");
    expect(planner).toContain(VI_GUARD);
    expect(planner).toContain("Compile the supplied governed context");
    const settler = buildSettlerSystemPrompt(book("vi"), null, "vi");
    expect(settler).toContain(VI_GUARD);
    expect(settler).toContain("Project explicit facts");
    // Regression: vi must never fall back to the Chinese prompt branch.
    expect(planner + settler).not.toMatch(/[一-鿿]/u);
  });

  it("asks the reviser for Vietnamese prose and keeps the vi chapter intact", async () => {
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    const revised = "Trời vẫn mưa. Cô ấy mở cửa sổ và nhìn xuống phố.";
    fetchWithProxyMock.mockImplementation(async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ choices: [{ finish_reason: "tool_calls", message: { tool_calls: [{
        id: "rewrite", type: "function", function: { name: "submit_revised_chapter", arguments: JSON.stringify({ revisedContent: revised }) },
      }] } }] }));
    });
    const client = createLLMClient({ provider: "openai", service: "custom", configSource: "studio", baseUrl: "https://example.test/v1", model: "test-model", apiKey: "fixture", apiFormat: "chat", stream: false, temperature: 0, thinkingBudget: 0 });
    const result = await new ReviserAgent({ client, model: "test-model", projectRoot: "/tmp" }).reviseChapter(
      "/tmp", "Trời mưa. Cô ấy đứng bên cửa sổ.", 1, [], "rewrite", undefined,
      { language: "vi", contextPackage: { chapter: 1, selectedContext: [] } },
    );
    expect(result.revisedContent).toBe(revised);
    const system = requests[0]!.messages.find((message) => message.role === "system")!.content;
    expect(system.startsWith("【YÊU CẦU NGÔN NGỮ】")).toBe(true);
    expect(system).not.toMatch(/[一-鿿]/u);
  });
});

describe("Vietnamese chapter documents", () => {
  it("renders and parses Chương headings without changing zh/en parsing", () => {
    expect(renderChapterDocument(3, "Bóng tối", "Đêm xuống.", "vi")).toBe("# Chương 3: Bóng tối\n\nĐêm xuống.");
    expect(readChapterHeading("# Chương 3: Bóng tối")).toEqual({ number: 3, title: "Bóng tối", language: "vi" });
    expect(readChapterHeading("Chương IV")).toMatchObject({ number: 4, language: "vi" });
    expect(readChapterHeading("Chương cuối")).toBeUndefined();
    expect(readChapterHeading("# 第3章 黑夜")).toEqual({ number: 3, title: "黑夜", language: "zh" });
    expect(readChapterHeading("Chapter 3: Night")).toEqual({ number: 3, title: "Night", language: "en" });
    const chapters = splitChapters("Chương 1: Mở đầu\nMưa rơi.\nChương 2: Gặp gỡ\nHọ gặp nhau.");
    expect(chapters.map((chapter) => chapter.title)).toEqual(["Mở đầu", "Gặp gỡ"]);
  });
});

describe("book language state sync", () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); root = undefined; });

  it("rewrites a stale runtime manifest language when book.json switches to vi", async () => {
    root = await mkdtemp(join(tmpdir(), "inkos-vi-sync-"));
    const bookDir = join(root, "book");
    const manifestPath = join(bookDir, "story", "state", "manifest.json");
    await mkdir(join(bookDir, "story", "state"), { recursive: true });
    const manifest = { schemaVersion: 2, language: "en", lastAppliedChapter: 3, projectionVersion: 1 };
    await writeFile(manifestPath, JSON.stringify(manifest), "utf-8");
    const state = new StateManager(root);

    expect(await state.saveBookConfigAt(bookDir, book("vi"))).toBe(true);
    expect(JSON.parse(await readFile(manifestPath, "utf-8"))).toEqual({ ...manifest, language: "vi" });
    expect(JSON.parse(await readFile(join(bookDir, "book.json"), "utf-8")).language).toBe("vi");
    // Already in sync: nothing to rewrite.
    expect(await state.saveBookConfigAt(bookDir, book("vi"))).toBe(false);
  });
});
