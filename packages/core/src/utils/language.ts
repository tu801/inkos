import { z } from "zod";

export const WritingLanguageSchema = z.enum(["zh", "en", "vi"]);
export type WritingLanguage = z.infer<typeof WritingLanguageSchema>;

export function normalizeWritingLanguage(value: unknown): WritingLanguage | undefined {
  const parsed = WritingLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** English is used as the control-language template for Vietnamese prompts. */
export function promptBaseLanguage(language: WritingLanguage): "zh" | "en" {
  return language === "zh" ? "zh" : "en";
}

export function languageOutputInstruction(language: WritingLanguage): string {
  if (language === "vi") {
    return "【YÊU CẦU NGÔN NGỮ】Toàn bộ nội dung đầu ra phải viết bằng tiếng Việt tự nhiên. Không được chuyển sang tiếng Anh hoặc tiếng Trung.";
  }
  if (language === "en") {
    // Keep the legacy wording because downstream prompt assertions and custom
    // evaluators use both phrases as stable markers.
    return "【LANGUAGE OVERRIDE】ALL OUTPUT MUST BE IN ENGLISH. ALL output MUST be in English and MUST be written in English.";
  }
  return "";
}

/**
 * Infer the writing language from a free-text brief/premise when the user did not set one explicitly.
 *
 * Conservative by design: defaults to "zh" (preserving prior behaviour for Chinese users) and only
 * returns "en" when the text is clearly Latin-dominant. A Chinese brief that mentions an English name
 * or term still resolves to "zh"; incidental CJK inside an otherwise English brief resolves to "en".
 */
export function inferLanguage(text?: string | null): WritingLanguage {
  const t = text ?? "";
  const cjk = (t.match(/[一-鿿]/g) ?? []).length;
  const latin = (t.match(/[A-Za-z]/g) ?? []).length;
  const vietnamese = (t.match(/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi) ?? []).length;
  if (vietnamese >= 2) return "vi";
  if (cjk === 0 && latin > 0) return "en";
  if (latin > 0 && cjk * 4 < latin) return "en";
  return "zh";
}
