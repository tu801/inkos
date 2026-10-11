import { describe, expect, it } from "vitest";
import { formatBookCreateCreated, resolveCliLanguage } from "../localization.js";

describe("Vietnamese CLI language", () => {
  it("preserves vi and uses the non-Chinese CLI surface", () => {
    expect(resolveCliLanguage("vi")).toBe("vi");
    expect(resolveCliLanguage("vi-VN")).toBe("vi");
    expect(formatBookCreateCreated("vi", "mua-dem")).toBe("Book created: mua-dem");
  });
});
