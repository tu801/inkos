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

export function languageOutputInstruction(language: WritingLanguage): string {
  if (language === "vi") {
    return "【YÊU CẦU NGÔN NGỮ】Toàn bộ nội dung đầu ra phải viết bằng tiếng Việt tự nhiên. Không được chuyển sang tiếng Anh hoặc tiếng Trung.";
  }
  if (language === "en") {
    return "【LANGUAGE REQUIREMENT】Write the entire output in natural English. Do not switch to Chinese.";
  }
  return "【语言要求】全部输出必须使用自然、流畅的中文。不要切换为英文。";
}

export function inferLanguage(text?: string | null): WritingLanguage {
  if (!text?.trim()) return "zh";
  if (/[ăâđêôơưĂÂĐÊÔƠƯ]|[àáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/iu.test(text)) return "vi";
  return /[\u3400-\u9fff]/u.test(text) ? "zh" : "en";
}
