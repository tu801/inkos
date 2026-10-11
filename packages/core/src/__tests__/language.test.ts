import { describe, it, expect } from "vitest";
import { inferLanguage } from "../utils/language.js";
import { localizeHookPayoffTiming } from "../utils/hook-lifecycle.js";

describe("inferLanguage", () => {
  it("infers en for Latin-dominant briefs", () => {
    expect(inferLanguage("A detective investigates a murder in 1920s London.")).toBe("en");
  });

  it("infers vi from Vietnamese diacritics", () => {
    expect(inferLanguage("Một thám tử điều tra vụ án trong thành phố cũ.")).toBe("vi");
  });

  it("localizes hook timing safely for vi", () => {
    expect(localizeHookPayoffTiming("near-term", "vi")).toBe("near-term");
  });

  it("infers zh for Chinese briefs", () => {
    expect(inferLanguage("一个修仙者重生回到宗门入门那年。")).toBe("zh");
  });

  it("stays zh when CJK dominates despite an English name", () => {
    expect(inferLanguage("主角叫 Jack，一部都市重生爽文。")).toBe("zh");
  });

  it("treats incidental CJK in an English brief as en", () => {
    expect(inferLanguage("A xianxia (修仙) progression story for Royal Road.")).toBe("en");
  });

  it("defaults to zh for empty or missing input", () => {
    expect(inferLanguage("")).toBe("zh");
    expect(inferLanguage(undefined)).toBe("zh");
    expect(inferLanguage(null)).toBe("zh");
  });
});
