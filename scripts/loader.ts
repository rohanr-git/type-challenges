import path from 'path';
import fs from 'fs-extra';
import fg from 'fast-glob';
import YAML from 'js-yaml';
import type { Quiz, QuizMetaInfo } from './types';
import { defaultLocale, supportedLocales } from './locales';

// Encapsulated module
const QuizLoader = (function () {
  // Private variables
  const QUIZ_ROOT = path.resolve(__dirname, '../questions');

  // Private function to load a file
  async function loadFile(filepath: string): Promise<string | undefined> {
    try {
      if (await fs.pathExists(filepath)) {
        return await fs.readFile(filepath, 'utf-8');
      }
      return undefined;
    } catch (error) {
      console.error(`Error while loading file: ${error.message}`);
      return undefined;
    }
  }

  // Private function to load variations for different locales
  async function loadLocaleVariations<T = string>(
    filepath: string,
    preprocessor: (s: string) => T = (s) => s as any as T,
  ): Promise<Record<string, T>> {
    const { ext, dir, name } = path.parse(filepath);
    const data: Record<string, T> = {};

    for (const locale of supportedLocales) {
      const file = preprocessor(await loadFile(path.join(dir, `${name}.${locale}${ext}`)) || '');

      if (file) {
        data[locale] = file;
      }
    }

    if (!data[defaultLocale]) {
      // Default version
      const file = preprocessor(await loadFile(filepath) || '');
      if (file) {
        data[defaultLocale] = file;
      }
    }

    return data;
  }

  // Private function to clean up readme text
  function readmeCleanUp(text: string): string {
    return text
      .replace(/<!--info-header-start-->[\s\S]*<!--info-header-end-->/, '')
      .replace(/<!--info-footer-start-->[\s\S]*<!--info-footer-end-->/, '')
      .trim();
  }

  // Private function to load quiz metadata
  function loadInfo(s: string): Partial<QuizMetaInfo> | undefined {
    try {
      const object = YAML.load(s) as any;
      if (!object) {
        return undefined;
      }

      const arrayKeys = ['tags', 'related'];

      for (const key of arrayKeys) {
        if (object[key]) {
          object[key] = (object[key] || '')
            .toString()
            .split(',')
            .map((i: string) => i.trim())
            .filter(Boolean);
        } else {
          object[key] = undefined;
        }
      }

      return object;
    } catch (error) {
      console.error(`Error while loading quiz metadata: ${error.message}`);
      return undefined;
    }
  }

  // Private function to load a quiz
  async function loadQuiz(dir: string): Promise<Quiz> {
    try {
      return {
        no: Number(dir.replace(/^(\d+)-.*/, '$1')),
        difficulty: dir.replace(/^\d+-(.+?)-.*$/, '$1') as any,
        path: dir,
        info: await loadLocaleVariations(path.join(QUIZ_ROOT, dir, 'info.yml'), loadInfo),
        readme: await loadLocaleVariations(path.join(QUIZ_ROOT, dir, 'README.md'), readmeCleanUp),
        template: await loadFile(path.join(QUIZ_ROOT, dir, 'template.ts')) || '',
        tests: await loadFile(path.join(QUIZ_ROOT, dir, 'test-cases.ts')),
      };
    } catch (error) {
      console.error(`Error while loading quiz ${dir}: ${error.message}`);
      throw error; // Rethrow the error to indicate failure
    }
  }

  // Public function to load all quizzes
  async function loadQuizes(): Promise<Quiz[]> {
    try {
      const folders = await fg('{0..9}*-*', {
        onlyDirectories: true,
        cwd: QUIZ_ROOT,
      });

      const quizes = await Promise.all(
        folders.map(async (dir) => loadQuiz(dir)),
      );

      return quizes;
    } catch (error) {
      console.error(`Error while loading quizzes: ${error.message}`);
      return [];
    }
  }

  // Public function to load a quiz by number
  async function loadQuizByNo(no: number | string): Promise<Quiz | undefined> {
    try {
      const folders = await fg(`${no}-*`, {
        onlyDirectories: true,
        cwd: QUIZ_ROOT,
      });

      if (folders.length) {
        return await loadQuiz(folders[0]);
      }

      return undefined;
    } catch (error) {
      console.error(`Error while loading quiz by number ${no}: ${error.message}`);
      return undefined;
    }
  }

  // Public function to resolve quiz metadata for a specific locale
  function resolveInfo(quiz: Quiz, locale: string = defaultLocale): QuizMetaInfo {
    const info = Object.assign({}, quiz.info[defaultLocale], quiz.info[locale]);
    info.tags = quiz.info[locale]?.tags || quiz.info[defaultLocale]?.tags || [];
    info.related = quiz.info[locale]?.related || quiz.info[defaultLocale]?.related || [];

    if (typeof info.tags === 'string') {
      info.tags = info.tags.split(',').map((i) => i.trim()).filter(Boolean);
    }

    return info as QuizMetaInfo;
  }

  // Public interface
  return {
    loadQuizes,
    loadQuizByNo,
    resolveInfo,
  };
})();

export default QuizLoader;
