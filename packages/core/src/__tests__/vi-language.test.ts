import { describe, expect, it } from "vitest";
import { BookConfigSchema } from "../models/book.js";
import { StateManifestSchema } from "../models/runtime-state.js";
import { buildWriterSystemPrompt } from "../agents/writer-prompts.js";
import { deriveBookIdFromTitle } from "../utils/book-id.js";
import { buildLengthSpec, countChapterLength, formatLengthCount } from "../utils/length-metrics.js";

describe("Vietnamese writing language", () => {
  it("accepts vi across book and runtime schemas", () => {
    const now = new Date().toISOString();
    expect(BookConfigSchema.parse({
      id: "mua-ha-noi",
      title: "Mưa Hà Nội",
      platform: "other",
      genre: "literary",
      status: "active",
      targetChapters: 10,
      chapterWordCount: 2_000,
      language: "vi",
      createdAt: now,
      updatedAt: now,
    }).language).toBe("vi");
    expect(StateManifestSchema.parse({
      schemaVersion: 2,
      language: "vi",
      lastAppliedChapter: 0,
      projectionVersion: 1,
    }).language).toBe("vi");
  });

  it("counts Vietnamese by words and preserves diacritics in title-derived ids", () => {
    const spec = buildLengthSpec(2_000, "vi");
    expect(spec.countingMode).toBe("vi_words");
    expect(countChapterLength("Trời mưa, cô ấy vẫn bước tiếp.", spec.countingMode)).toBe(7);
    expect(formatLengthCount(7, spec.countingMode)).toBe("7 từ");
    expect(deriveBookIdFromTitle("Mưa Đêm Hà Nội")).toBe("mua-dem-ha-noi");
  });

  it("adds an explicit Vietnamese-only instruction to writer prompts", () => {
    const now = new Date().toISOString();
    const book = BookConfigSchema.parse({
      id: "mua-ha-noi",
      title: "Mưa Hà Nội",
      platform: "other",
      genre: "literary",
      status: "active",
      targetChapters: 10,
      chapterWordCount: 2_000,
      language: "vi",
      createdAt: now,
      updatedAt: now,
    });
    const prompt = buildWriterSystemPrompt(book, null, "", "");
    expect(prompt).toContain("Toàn bộ nội dung đầu ra phải viết bằng tiếng Việt tự nhiên");
    expect(prompt).toContain("User target: 2000 words");
  });
});
