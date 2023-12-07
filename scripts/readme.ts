// Import necessary packages and modules
import path from 'path';  // Import the 'path' module for working with file paths
import fs from 'fs-extra';  // Import the 'fs-extra' module for file system operations
import type { SupportedLocale } from './locales';  // Import types from the 'locales' module
import { defaultLocale, f, supportedLocales, t } from './locales';  // Import specific exports from the 'locales' module
import { loadQuizes, resolveInfo } from './loader';  // Import functions from the 'loader' module
import { Quiz, QuizMetaInfo } from './types';  // Import types from the 'types' module

// Describe the colors that correspond to the various quiz levels and their ranking.
class QuizUtils {
  // Define static properties for difficulty colors and ranking
  static DifficultyColors: Record<string, string> = {
    warm: 'teal',
    easy: '7aad0c',
    medium: 'd9901a',
    hard: 'de3d37',
    extreme: 'b11b8d',
  };
  private static DifficultyRank = ['warm', 'easy', 'medium', 'hard', 'extreme'];  // Define the ranking of difficulty levels

  // Define utility functions for escaping HTML, creating badge URLs, and formatting information
  public static escapeHtml(unsafe: string): string {
    // Function to escape unsafe characters in HTML
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private static toBadgeURL(label: string, text: string, color: string, args = ''): string {
    // Function to generate a badge URL
    return `https://img.shields.io/badge/${encodeURIComponent(label.replace(/-/g, '--'))}
${encodeURIComponent(text.replace(/-/g, '--'))}-${color}${args}`;
  }

  private static toBadge(label: string, text: string, color: string, args = ''): string {
    // Function to generate a badge
    return `<img src="${QuizUtils.toBadgeURL(label, text, color, args)}" alt="${text}"/>`;
  }

  // Functions for creating badge links and plain text links
  public static toBadgeLink(url: string, label: string, text: string, color: string, args = ''): string {
    return `<a href="${url}" target="_blank">${QuizUtils.toBadge(label, text, color, args)}</a> `;
  }

  public static toPlanTextLink(url: string, _label: string, text: string, _color: string, _args = ''): string {
    return `<a href="${url}" target="_blank">${text}</a> `;
  }

  // Function to format author information
  public static toAuthorInfo(author: Partial<QuizMetaInfo['author']> = {}): string {
    return `by ${author.name}${author.github ? ` <a href="https://github.com/${author.github}" 
target="_blank">@${author.github}</a>` : ''}`;
  }

  // Functions for creating difficulty badges and plain text representations
  public static toDifficultyBadgeInverted(difficulty: string, locale: SupportedLocale, count: number): string {
    return QuizUtils.toBadge(t(locale, `difficulty.${difficulty}`), count.toString(), QuizUtils.DifficultyColors[difficulty]);
  }

  public static toDifficultyPlainText(difficulty: string, locale: SupportedLocale, count: number): string {
    return `${t(locale, `difficulty.${difficulty}`)} (${count.toString()})`;
  }
}

// Function to generate a badge or plain text
class QuizFormatter {
  public static quizToBadge(quiz: Quiz, locale: string, absolute = false, badge = true): string {
    const fn = badge ? QuizUtils.toBadgeLink : QuizUtils.toPlanTextLink;
    return fn(
      QuizFormatter.toQuizREADME(quiz, locale, absolute),
      '',
      `${quiz.no}・${quiz.info[locale]?.title || quiz.info[defaultLocale]?.title}`,
      QuizUtils.DifficultyColors[quiz.difficulty],
    );
  }

  static toQuizREADME(_quiz: Quiz, _locale: string, _absolute: boolean): string {
    throw new Error('Method not implemented.');
  }
}

class QuizProcessor {
  // Function to generate badges for a list
  public static quizNoToBadges(ids: (string | number)[], quizes: Quiz[], locale: string, absolute = false): string {
    return ids
      .map(i => quizes.find(q => q.no === Number(i)))
      .filter(Boolean)
      .map(i => QuizFormatter.quizToBadge(i!, locale, absolute))
      .join(' ');
  }
}

class QuizReader {
  // Function to insert information into the file
  public static async insertInfoReadme(filepath: string, quiz: Quiz, locale: SupportedLocale, quizes: Quiz[]): Promise<void> {
    try {
      if (!fs.existsSync(filepath)) throw new Error(`File does not exist: ${filepath}`);
      let text = await fs.readFile(filepath, 'utf-8');

      /* eslint-disable prefer-template */

      if (!text.match(/<!--info-header-start-->[\s\S]*<!--info-header-end-->/))
        text = `<!--info-header-start--><!--info-header-end-->\n\n${text}`;
      if (!text.match(/<!--info-footer-start-->[\s\S]*<!--info-footer-end-->/))
        text = `${text}\n\n<!--info-footer-start--><!--info-footer-end-->`;

      const info = resolveInfo(quiz, locale);

      const availableLocales = supportedLocales
        .filter(l => l !== locale)
        .filter(l => !!quiz.readme[l]);

      text = text
        .replace(
          /<!--info-header-start-->[\s\S]*<!--info-header-end-->/,
          '<!--info-header-start-->' +
          `<h1>${QuizUtils.escapeHtml(info.title || '')} ${QuizUtils.toDifficultyBadge(quiz.difficulty, locale)} ${(info.tags || []).map(i => QuizUtils.toBadge('', `#${i}`, '999')).join(' ')}</h1>` +
          `<blockquote><p>${QuizUtils.toAuthorInfo(info.author)}</p></blockquote>` +
          '<p>' +
          QuizUtils.to

BadgeLink(QuizUtils.toPlayShort(quiz.no, locale), '', t(locale, 'badge.take-the-challenge'), '3178c6', '?logo=typescript&logoColor=white') +
          (availableLocales.length ? ('&nbsp;&nbsp;&nbsp;' + availableLocales.map(l => QuizUtils.toBadgeLink(QuizUtils.toNearborREADME(quiz, l), '', t(l, 'display'), 'gray')).join(' ')) : '') +
          '</p>' +
          '<!--info-header-end-->',
        )
        .replace(
          /<!--info-footer-start-->[\s\S]*<!--info-footer-end-->/,
          '<!--info-footer-start--><br>' +
          QuizUtils.toBadgeLink(`../../${f('README', locale, 'md')}`, '', t(locale, 'badge.back'), 'grey') +
          QuizUtils.toBadgeLink(QuizUtils.toAnswerShort(quiz.no, locale), '', t(locale, 'badge.share-your-solutions'), 'teal') +
          QuizUtils.toBadgeLink(QuizUtils.toSolutionsShort(quiz.no), '', t(locale, 'badge.checkout-solutions'), 'de5a77', '?logo=awesome-lists&logoColor=white') +
          (Array.isArray(info.related) && info.related.length ? `<hr><h3>${t(locale, 'readme.related challenges')}</h3>${QuizProcessor.quizNoToBadges(info.related, quizes, locale, true)}` : '') +
          '<!--info-footer-end-->',
        );

      /* eslint-enable prefer-template */

      await fs.writeFile(filepath, text, 'utf-8');
      console.log(`File updated successfully: ${filepath}`);
    } catch (error) {
      console.error(`Error updating file ${filepath}: ${error.message}`);
    }
  }
}

// Function to update the index readme file with the information
class QuizUpdater {
  public static async updateIndexREADME(quizes: Quiz[]): Promise<void> {
    // Update index README
    try {
      for (const locale of supportedLocales) {
        const filepath = path.resolve(__dirname, '..', f('README', locale, 'md'));
        try {
          let challengesREADME = '';
          let prev = '';
          const quizesByDifficulty = [...quizes].sort((a, b) => QuizUtils.DifficultyRank.indexOf(a.difficulty) - QuizUtils.DifficultyRank.indexOf(b.difficulty));

          for (const quiz of quizesByDifficulty) {
            if (prev !== quiz.difficulty)
              challengesREADME += `${prev ? '<br><br>' : ''}${QuizUtils.toDifficultyBadgeInverted(quiz.difficulty, locale, quizesByDifficulty.filter(q => q.difficulty === quiz.difficulty).length)}<br>`;

            challengesREADME += QuizFormatter.quizToBadge(quiz, locale);

            prev = quiz.difficulty;
          }

          // By tags
          challengesREADME += '<br><details><summary>By Tags</summary><br><table><tbody>';
          const tags = getAllTags(quizes, locale);
          for (const tag of tags) {
            challengesREADME += `<tr><td>${QuizUtils.toBadge('', `#${tag}`, '999')}</td><td>`;
            getQuizesByTag(quizesByDifficulty, locale, tag)
              .forEach((quiz) => {
                challengesREADME += QuizFormatter.quizToBadge(quiz, locale);
              });
            challengesREADME += '</td></tr>';
          }
          challengesREADME += '<tr><td><code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code></td><td></td></tr>';
          challengesREADME += '</tbody></table></details>';
          // By plain text
          prev = '';
          challengesREADME += '<br><details><summary>By Plain Text</summary><br>';
          for (const quiz of quizesByDifficulty) {
            if (prev !== quiz.difficulty)
              challengesREADME += `${prev ? '</ul>' : ''}<h3>${QuizUtils.toDifficultyPlainText(quiz.difficulty, locale, quizesByDifficulty.filter(q => q.difficulty === quiz.difficulty).length)}</h3><ul>`;
            challengesREADME += `<li>${QuizFormatter.quizToBadge(quiz, locale)}</li>`;
            prev = quiz.difficulty;
          }
          challengesREADME += '</ul></details><br>';

          let readme = await fs.readFile(filepath, 'utf-8');
          readme = readme.replace(
            /<!--challenges-start-->[\s\S]*<!--challenges-end-->/m,
            `<!--challenges-start-->\n${challengesREADME}\n<!--challenges-end-->`,
          );
          await fs.writeFile(filepath, readme, 'utf-8');
          console.log(`Index README updated successfully for ${locale}`);
        } catch (error) {
          console.error(`Error updating Index README for ${locale}: ${error.message}`);
          // Handle the error as needed.
        }
      }
    } catch (error) {
      console.error(`Error updating Index README: ${error.message}`);
      // You may choose to throw the error again to propagate it up or handle it here.
    }
  }

  // Function to update individual question
  public static async updateQuestionsREADME(quizes: Quiz[]): Promise<void> {
    try {
      const questionsDir = path.resolve(__dirname, '../questions');
      // Update each question's readme
      for (const quiz of quizes) {
        for (const locale of supportedLocales) {
          try {
            await QuizReader.insertInfoReadme(
              path.join(
                questionsDir,
                quiz.path,
                f('README', locale, 'md'),
              ),
              quiz,
              locale,
              quizes,
            );
            console.log(`README updated successfully for quiz ${quiz.no} (${locale})`);
          } catch (error) {
            console.error(`Error updating README for quiz ${quiz.no} (${locale}): ${error.message}`);
            // Handle the error as needed.
          }
        }
      }
    } catch (error) {
      console.error(`Error updating Questions README: ${error.message}`);
      // You may choose to throw the error again to propagate it up or handle it here.
    }
  }

  // Function to update files based on type, either index or quiz
  public static async updateREADMEs(type?: 'quiz' | 'index'): Promise<void> {
    try {
      const quizes = await QuizReader.loadQuizes();
      quizes.sort((a: { no: number }, b: { no: number }) => a.no - b.no);

      if (type === 'quiz') {
        await QuizUpdater.updateQuestionsREADME(quizes);
      } else if (type === 'index') {
        await QuizUpdater.updateIndexREADME(quizes);
      } else {
        await Promise.all([
          QuizUpdater.updateIndexREADME(quizes),
          QuizUpdater.updateQuestionsREADME(quizes),
        ]);
      }
      console.log('READMEs updated successfully');
    } catch (error) {
      console.error(`Error updating READMEs: ${error.message}`);
      // Handle the error as needed.
    }
  }
}

// Update based on command line argument
QuizUpdater.updateREADMEs(process.argv.slice(2)[0] as any);
