import { z } from "zod";

export const WritingLanguageSchema = z.enum(["zh", "en", "vi"]);
export type WritingLanguage = z.infer<typeof WritingLanguageSchema>;

export function normalizeWritingLanguage(value: unknown): WritingLanguage | undefined {
  const parsed = WritingLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Vietnamese reuses the English control prompt, with an explicit output-language guard. */
export function promptBaseLanguage(language: WritingLanguage): "zh" | "en" {
  return language === "zh" ? "zh" : "en";
}

/**
 * Output-language guard prepended to English control prompts when the book is Vietnamese.
 * Empty for zh/en so their existing prompts stay byte-identical.
 */
export function languageOutputInstruction(language: WritingLanguage): string {
  if (language === "vi") {
    return "【YÊU CẦU NGÔN NGỮ】Toàn bộ nội dung đầu ra phải viết bằng tiếng Việt tự nhiên. Không được chuyển sang tiếng Anh hoặc tiếng Trung.";
  }
  return "";
}

/** Joins prompt sections, dropping empty ones (e.g. a blank output-language guard). */
export function withLanguageOutputInstruction(language: WritingLanguage, prompt: string): string {
  return [languageOutputInstruction(language), prompt].filter(Boolean).join("\n\n");
}
