<<<<<<< HEAD
import { PlatformSchema, defaultChapterLength, deriveBookIdFromTitle, normalizeWritingLanguage, type Platform, type WritingLanguage } from "@actalk/inkos-core";
=======
import { normalizePlatformOrOther, defaultChapterLength, type Platform, type WritingLanguage } from "@actalk/inkos-core";
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
export { waitForStudioBookReady } from "../lib/book-ready.js";
export type { StudioBookDetail, WaitForStudioBookReadyOptions } from "../lib/book-ready.js";

export interface StudioCreateBookBody {
  readonly title: string;
  readonly genre: string;
  readonly language?: string;
  readonly platform?: string;
  readonly chapterWordCount?: number;
  readonly minChapterLength?: number;
  readonly maxChapterLength?: number;
  readonly targetChapters?: number;
  readonly blurb?: string;
}

export interface StudioBookConfigDraft {
  readonly id: string;
  readonly title: string;
  readonly platform: Platform;
  readonly genre: string;
  readonly status: "outlining";
  readonly targetChapters: number;
  readonly chapterWordCount: number;
<<<<<<< HEAD
  readonly minChapterLength?: number;
  readonly maxChapterLength?: number;
  readonly language: WritingLanguage;
=======
  readonly language?: WritingLanguage;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function normalizeStudioPlatform(platform?: string): Platform {
  return platform === undefined ? "other" : PlatformSchema.parse(platform);
}

export function buildStudioBookConfig(body: StudioCreateBookBody, now: string): StudioBookConfigDraft {
<<<<<<< HEAD
  const language = normalizeWritingLanguage(body.language) ?? "zh";
=======
  const language: WritingLanguage | undefined = body.language === "zh" || body.language === "en" || body.language === "vi"
    ? body.language
    : undefined;
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
  return {
    id: deriveBookIdFromTitle(body.title),
    title: body.title,
    platform: normalizeStudioPlatform(body.platform),
    genre: body.genre,
    status: "outlining",
    targetChapters: body.targetChapters ?? 200,
<<<<<<< HEAD
    chapterWordCount: body.chapterWordCount ?? defaultChapterLength(language),
    ...(body.minChapterLength!==undefined?{minChapterLength:body.minChapterLength}:{}),
    ...(body.maxChapterLength!==undefined?{maxChapterLength:body.maxChapterLength}:{}),
    language,
=======
    chapterWordCount: body.chapterWordCount ?? defaultChapterLength(language ?? "zh"),
    ...(language ? { language } : {}),
>>>>>>> d43014ef9e770ff28751f397bc63cac734c53bec
    createdAt: now,
    updatedAt: now,
  };
}
