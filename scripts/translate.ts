import path from 'path';
import translate from 'google-translate-open-api';
import fs from 'fs-extra';
import { loadQuizByNo, loadQuizes, QUIZ_ROOT } from './loader';
import { resolveFilePath } from './utils/resolve';
import type { Quiz } from './types';
import type { SupportedLocale } from './locales';
import { t } from './locales';

class QuizTranslator {
  private readonly QUIZ_ROOT: string;
  private readonly codeBlocks: string[] = [];

  constructor(QUIZ_ROOT: string) {
    this.QUIZ_ROOT = QUIZ_ROOT;
  }

  /**
   * Translate markdown content from one language to another.
   * @param code - Markdown content to be translated.
   * @param from - Source language.
   * @param to - Target language.
   * @returns Translated markdown content.
   */
  private async translateMarkdown(code: string, from: SupportedLocale, to: SupportedLocale): Promise<string | undefined> {
    const source = this.replaceCodeBlocks(code);

    const { data: rawResult } = await translate(source, {
      tld: 'com',
      from,
      to,
    });

    if (!rawResult) {
      return undefined;
    }

    return this.restoreCodeBlocks(rawResult as string);
  }

  /**
   * Replace code blocks in the markdown content with placeholders.
   * @param code - Markdown content with code blocks.
   * @returns Markdown content with placeholders for code blocks.
   */
  private replaceCodeBlocks(code: string): string {
    return code.replace(/```[\s\S\n]+?```/g, (v) => {
      const placeholder = `__${this.codeBlocks.length}__`;
      this.codeBlocks.push(v);
      return placeholder;
    });
  }

  /**
   * Restore code blocks in the translated markdown content.
   * @param result - Translated markdown content.
   * @returns Translated markdown content with original code blocks.
   */
  private restoreCodeBlocks(result: string): string {
    return result.replace(/__\s*?(\d+?)\s*?__/g, (_, i) => this.codeBlocks[+i]);
  }

  /**
   * Write translated readme content to a file.
   * @param quiz - Quiz object.
   * @param translatedReadme - Translated readme content.
   * @param to - Target language.
   */
  private async writeTranslatedReadme(quiz: Quiz, translatedReadme: string, to: SupportedLocale): Promise<void> {
    const readmePath = resolveFilePath(path.join(this.QUIZ_ROOT, quiz.path), 'README', 'md', to);
    await fs.writeFile(readmePath, translatedReadme, 'utf-8');

    console.log(`Translated [${quiz.no}] ${quiz.readme.from} → ${to} | saved to ${readmePath}`);
  }

  /**
   * Translate a quiz by its number.
   * @param no - Quiz number.
   * @param from - Source language.
   * @param to - Target language.
   */
  public async translateQuizByNo(no: number, from: SupportedLocale, to: SupportedLocale): Promise<void> {
    const quiz = await loadQuizByNo(no);

    if (!quiz) {
      throw new Error(`Quiz #${no} not found`);
    }

    await this.translateQuiz(quiz, from, to);
  }

  /**
   * Translate a quiz from one language to another.
   * @param quiz - Quiz object.
   * @param from - Source language.
   * @param to - Target language.
   */
  public async translateQuiz(quiz: Quiz, from: SupportedLocale, to: SupportedLocale): Promise<void> {
    let translatedReadme = await this.translateMarkdown(quiz.readme[from], from, to);

    if (!translatedReadme) {
      throw new Error(`Quiz #${quiz.no} empty translation`);
    }

    translatedReadme = `> ${t(to, 'readme.google-translated')}\n\n${translatedReadme.trim()}`;

    await this.writeTranslatedReadme(quiz, translatedReadme, to);
  }

  /**
   * Translate all quizzes from one language to another.
   * @param from - Source language.
   * @param to - Target language.
   */
  public async translateAllQuizes(from: SupportedLocale, to: SupportedLocale): Promise<void> {
    const quizes = await loadQuizes();

    for (const quiz of quizes) {
      if (quiz.readme[to] || !quiz.readme[from]) {
        console.log(`Skipped #${quiz.no}`);
        continue;
      }

      console.log(`Translating #${quiz.no} to ${to}`);
      await this.translateQuiz(quiz, from, to);
    }
  }
}

// Constants and functions not related to translation
const QUIZ_ROOT_PATH = path.join(__dirname, '../quiz-root');
const quizTranslator = new QuizTranslator(QUIZ_ROOT);

/**
 * Translate a quiz by its number.
 * @param no - Quiz number.
 * @param from - Source language.
 * @param to - Target language.
 */
export async function translateQuizByNo(no: number, from: SupportedLocale, to: SupportedLocale): Promise<void> {
  await quizTranslator.translateQuizByNo(no, from, to);
}

/**
 * Translate all quizzes from one language to another.
 * @param from - Source language.
 * @param to - Target language.
 */
export async function translateAllQuizes(from: SupportedLocale, to: SupportedLocale): Promise<void> {
  await quizTranslator.translateAllQuizes(from, to);
}
