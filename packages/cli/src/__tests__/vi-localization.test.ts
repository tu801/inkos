import { describe, expect, it } from "vitest";
import type { InteractionSession } from "@actalk/inkos-core";
import { formatBookCreateCreated, resolveCliLanguage } from "../localization.js";
import { formatImportCompletionLines } from "../progress-text.js";
import { buildSlashCommands } from "../tui/slash-autocomplete.js";
import { resolveTuiAgentRoute } from "../tui/agent-input.js";

describe("Vietnamese CLI language", () => {
  it("preserves vi and uses the non-Chinese CLI surface", () => {
    expect(resolveCliLanguage("vi")).toBe("vi");
    expect(resolveCliLanguage("vi-VN")).toBe("vi");
    expect(formatBookCreateCreated("vi", "mua-dem")).toBe("Book created: mua-dem");
  });

  it("renders import progress and slash commands in English for vi", () => {
    const result = { importedCount: 3, totalCountLabel: "1200 từ", nextChapter: 4, bookId: "mua-dem" };
    expect(formatImportCompletionLines("vi", result)).toEqual(formatImportCompletionLines("en", result));
    expect(formatImportCompletionLines("zh", result)[0]).toBe("导入完成：");
    expect(buildSlashCommands("vi")).toEqual(buildSlashCommands("en"));
  });

  it("routes TUI local replies to English for vi", () => {
    const session = { sessionId: "s1" } as unknown as InteractionSession;
    expect(resolveTuiAgentRoute("/write", session, "mua-dem", "vi").userMessage).toBe("Write the next chapter");
    expect(resolveTuiAgentRoute("/confirm", session, null, "vi").localResponse).toBe("There is no pending action.");
    expect(resolveTuiAgentRoute("/confirm", session, null, "zh").localResponse).toBe("没有待确认的动作。");
  });
});
