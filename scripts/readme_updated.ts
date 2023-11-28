//import necessary packages and modules 
import path from 'path' 
import fs from 'fs-extra' 
import type { SupportedLocale } from './locales' 
import { defaultLocale, f, supportedLocales, t } from './locales' 
import { loadQuizes, resolveInfo } from './loader' 
import { toAnswerShort, toNearborREADME, toPlayShort, toQuizREADME, toSolutionsShort } from 
'./toUrl' 
import type { Quiz, QuizMetaInfo } from './types' 
//Describe the colors that correspond to the various quiz levels and their ranking. 
class QuizUtils { 
private static DifficultyColors: Record<string, string> = { 
warm: 'teal', 
easy: '7aad0c', 
medium: 'd9901a', 
hard: 'de3d37', 
extreme: 'b11b8d', 
}; 
private static DifficultyRank = [ 
'warm', 
'easy', 
'medium', 
'hard', 
'extreme', 
]; 
//utility function  
private static escapeHtml(unsafe: string): string { 
return unsafe 
.replace(/&/g, '&amp;') 
.replace(/</g, '&lt;') 
.replace(/>/g, '&gt;') 
.replace(/"/g, '&quot;') 
.replace(/'/g, '&#039;'); 
} 
//utility function for generating badge URL’s and HTML elements 
private static toBadgeURL(label: string, text: string, color: string, args = ''): string { 
return `https://img.shields.io/badge/${encodeURIComponent(label.replace(/-/g, '--'))}
${encodeURIComponent(text.replace(/-/g, '--'))}-${color}${args}`; 
} 
private static toBadge(label: string, text: string, color: string, args = ''): string { 
return `<img src="${QuizUtils.toBadgeURL(label, text, color, args)}" alt="${text}"/>`; 
} 
//function to generate HTML links 
public static toBadgeLink(url: string, label: string, text: string, color: string, args = ''): string { 
return `<a href="${url}" target="_blank">${QuizUtils.toBadge(label, text, color, args)}</a> `; 
} 
//function to generate HTML for plain text 
public static toPlanTextLink(url: string, _label: string, text: string, _color: string, _args = ''): string { 
return `<a href="${url}" target="_blank">${text}</a> `; 
} 
Public static toAuthorInfo(author: Partial<QuizMetaInfo['author']> = {}) { 
return `by ${author.name}${author.github ? ` <a href="https://github.com/${author.github}" 
target="_blank">@${author.github}</a>` : ''}`; 
} 
Public static toDifficultyBadgeInverted(difficulty: string, locale: SupportedLocale, count: number) { 
return toBadge(t(locale, `difficulty.${difficulty}`), count.toString(), DifficultyColors[difficulty]); 
} 
 
Public static toDifficultyPlainText(difficulty: string, locale: SupportedLocale, count: number) { 
  return `${t(locale, `difficulty.${difficulty}`)} (${count.toString()})`; 
} 
} 
 
//function to generate a badge or plain text 
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
class QuizProcessor { 
 //function to generate badges for a list 
  public static quizNoToBadges(ids: (string | number)[], quizes: Quiz[], locale: string, absolute = false): 
string { 
    return ids 
      .map(i => quizes.find(q => q.no === Number(i))) 
      .filter(Boolean) 
      .map(i => QuizFormatter.quizToBadge(i!, locale, absolute)) 
      .join(' '); 
  } 
} 
 
class QuizReader { 
  //function to insert information into the file 
  public static async insertInfoReadme(filepath: string, quiz: Quiz, locale: SupportedLocale, quizes: 
Quiz[]): Promise<void> { 
try{ 
 if (!fs.existsSync(filepath)) 
    throw new Error(`File does not exist: ${filepath}`); 
  let text = await fs.readFile(filepath, 'utf-8') 
  /* eslint-disable prefer-template */ 
 
  if (!text.match(/<!--info-header-start-->[\s\S]*<!--info-header-end-->/)) 
    text = `<!--info-header-start--><!--info-header-end-->\n\n${text}` 
  if (!text.match(/<!--info-footer-start-->[\s\S]*<!--info-footer-end-->/)) 
    text = `${text}\n\n<!--info-footer-start--><!--info-footer-end-->` 
 
  const info = resolveInfo(quiz, locale) 
 
  const availableLocales = supportedLocales.filter(l => l !== locale).filter(l => !!quiz.readme[l]) 
 
  text = text 
    .replace( 
      /<!--info-header-start-->[\s\S]*<!--info-header-end-->/, 
      '<!--info-header-start-->' 
      + `<h1>${escapeHtml(info.title || '')} ${toDifficultyBadge(quiz.difficulty, locale)} ${(info.tags || 
[]).map(i => toBadge('', `#${i}`, '999')).join(' ')}</h1>` 
      + `<blockquote><p>${toAuthorInfo(info.author)}</p></blockquote>` 
      + '<p>' 
      + toBadgeLink(toPlayShort(quiz.no, locale), '', t(locale, 'badge.take-the-challenge'), '3178c6', 
'?logo=typescript&logoColor=white') 
      + (availableLocales.length ? ('&nbsp;&nbsp;&nbsp;' + availableLocales.map(l => 
toBadgeLink(toNearborREADME(quiz, l), '', t(l, 'display'), 'gray')).join(' ')) : '') 
      + '</p>' 
      + '<!--info-header-end-->', 
    ) 
    .replace( 
      /<!--info-footer-start-->[\s\S]*<!--info-footer-end-->/, 
      '<!--info-footer-start--><br>' 
      + toBadgeLink(`../../${f('README', locale, 'md')}`, '', t(locale, 'badge.back'), 'grey') 
      + toBadgeLink(toAnswerShort(quiz.no, locale), '', t(locale, 'badge.share-your-solutions'), 'teal') 
      + toBadgeLink(toSolutionsShort(quiz.no), '', t(locale, 'badge.checkout-solutions'), 'de5a77', 
'?logo=awesome-lists&logoColor=white') 
      + (Array.isArray(info.related) && info.related.length ? `<hr><h3>${t(locale, 'readme.related
challenges')}</h3>${quizNoToBadges(info.related, quizes, locale, true)}` : '') 
      + '<!--info-footer-end-->', 
    ) 
 
  /* eslint-enable prefer-template */ 
 
  await fs.writeFile(filepath, text, 'utf-8') 
console.log(`File updated successfully: ${filepath}`); 
  } catch (error) { 
    console.error(`Error updating file ${filepath}: ${error.message}`); 
  } 
} 
} 
//function to update the index readme file with the information 
class QuizUpdater { 
  public static async updateIndexREADME(quizes: Quiz[]): Promise<void> { 
    // update index README 
try{ 
  for (const locale of supportedLocales) { 
    const filepath = path.resolve(__dirname, '..', f('README', locale, 'md')) 
    try{ 
    let challengesREADME = '' 
    let prev = '' 
    const quizesByDifficulty = [...quizes].sort((a, b) => DifficultyRank.indexOf(a.difficulty) - 
DifficultyRank.indexOf(b.difficulty)) 
 
    for (const quiz of quizesByDifficulty) { 
      if (prev !== quiz.difficulty) 
        challengesREADME += `${prev ? '<br><br>' : ''}${toDifficultyBadgeInverted(quiz.difficulty, locale, 
quizesByDifficulty.filter(q => q.difficulty === quiz.difficulty).length)}<br>`
 challengesREADME += quizToBadge(quiz, locale) 
 
      prev = quiz.difficulty 
    } 
    // by tags 
    challengesREADME += '<br><details><summary>By Tags</summary><br><table><tbody>' 
    const tags = getAllTags(quizes, locale) 
    for (const tag of tags) { 
      challengesREADME += `<tr><td>${toBadge('', `#${tag}`, '999')}</td><td>` 
      getQuizesByTag(quizesByDifficulty, locale, tag) 
        .forEach((quiz) => { 
          challengesREADME += quizToBadge(quiz, locale) 
        }) 
      challengesREADME += '</td></tr>' 
    } 
    challengesREADME += 
'<tr><td><code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code></td><t
 d></td></tr>' 
    challengesREADME += '</tbody></table></details>' 
 
    // by plain text 
    prev = '' 
    challengesREADME += '<br><details><summary>By Plain Text</summary><br>' 
    for (const quiz of quizesByDifficulty) { 
      if (prev !== quiz.difficulty) 
        challengesREADME += `${prev ? '</ul>' : ''}<h3>${toDifficultyPlainText(quiz.difficulty, locale, 
quizesByDifficulty.filter(q => q.difficulty === quiz.difficulty).length)}</h3><ul>` 
      challengesREADME += `<li>${quizToBadge(quiz, locale, false, false)}</li>` 
      prev = quiz.difficulty 
    } 
    challengesREADME += '</ul></details><br>' 
 
    let readme = await fs.readFile(filepath, 'utf-8') 
    readme = readme.replace( 
      /<!--challenges-start-->[\s\S]*<!--challenges-end-->/m, 
      `<!--challenges-start-->\n${challengesREADME}\n<!--challenges-end-->`, 
    ) 
    await fs.writeFile(filepath, readme, 'utf-8') 
console.log(`Index README updated successfully for ${locale}`); 
      } catch (error) { 
        console.error(`Error updating Index README for ${locale}: ${error.message}`); 
        // Handle the error as needed. 
      } 
    } 
  } catch (error) { 
    console.error(`Error updating Index README: ${error.message}`); 
    // You may choose to throw the error again to propagate it up or handle it here. 
  }s 
} 
//function to update individual question 
  public static async updateQuestionsREADME(quizes: Quiz[]): Promise<void> { 
try{ 
    const questionsDir = path.resolve(__dirname, '../questions') 
 
  // update each questions' readme 
  for (const quiz of quizes) { 
    for (const locale of supportedLocales) { 
try{ 
      await insertInfoReadme( 
        path.join( 
          questionsDir, 
          quiz.path, 
          f('README', locale, 'md'), 
        ), 
        quiz, 
        locale, 
        quizes, 
 ) 
Console.log(‘README updated successfully for quiz ${quiz.no} (${locale})`); 
      } 
} catch (error) { 
          console.error(`Error updating README for quiz ${quiz.no} (${locale}): ${error.message}`); 
          // Handle the error as needed. 
        } 
   } 
} catch (error) { 
    console.error(`Error updating Questions README: ${error.message}`); 
    // You may choose to throw the error again to propagate it up or handle it here. 
  } 
} 
 
//function to update files based on type, either index or quiz 
  public static async updateREADMEs(type?: 'quiz' | 'index'): Promise<void> { 
try{ 
    const quizes = await QuizReader.loadQuizes(); 
    quizes.sort((a, b) => a.no - b.no); 
 
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
//update based on command line argument 
QuizUpdater.updateREADMEs(process.argv.slice(2)[0] as any);