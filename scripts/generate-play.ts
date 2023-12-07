// Importing necessary modules
import path from 'path'
import { argv } from 'process'
import crypto from 'crypto'
import fs from 'fs-extra'
import c from 'picocolors'
import prompts from 'prompts'
import { formatToCode } from './actions/utils/formatToCode'
import { loadQuizes, resolveInfo } from './loader'
import { supportedLocales } from './locales'
import { getQuestionFullName } from './actions/issue-pr'
import type { QuizMetaInfo } from './types'

// Define a type for file snapshot
type Snapshot = Record<string, string>

/**
 * Calculate the hash of a file.
 * @param filePathFull - Full path of the file.
 * @returns Promise that resolves to the file hash.
 */
function calculateFileHash(filePathFull: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1')
    const fileStream = fs.createReadStream(filePathFull)

    fileStream.on('data', (data) => {
      hash.update(data)
    })

    fileStream.on('end', () => {
      hash.update(filePathFull)
      resolve(hash.digest('hex'))
    })

    fileStream.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Recursively take a snapshot of files in a directory.
 * @param quizesPath - Path of the directory to take a snapshot of.
 * @returns Promise that resolves to the snapshot of files.
 */
async function takeSnapshot(quizesPath: string): Promise<Snapshot> {
  let snapshot: Snapshot = {}

  const files = fs.readdirSync(quizesPath)

  for (const file of files) {
    // Check if it's a file or a folder
    const fPath = path.join(quizesPath, file)
    const fStats = fs.statSync(fPath)

    if (fStats.isDirectory()) {
      snapshot = {
        ...snapshot,
        ...(await takeSnapshot(fPath)),
      }
    } else {
      snapshot[file] = await calculateFileHash(fPath)
    }
  }

  return snapshot
}

/**
 * Read the content of the playground cache.
 * @param playgroundCachePath - Path to the playground cache file.
 * @returns Snapshot of the playground cache.
 */
function readPlaygroundCache(playgroundCachePath: string): Snapshot {
  if (!fs.existsSync(playgroundCachePath))
    return {}

  try {
    const rawCacheContent = fs.readFileSync(playgroundCachePath)
    return JSON.parse(rawCacheContent.toString())
  } catch (err) {
    console.log(c.red('Playground cache corrupted. '
      + 'Cannot generate playground without keeping your changes intact'))
    console.log(c.cyan('Please ensure you have run this: "pnpm generate"'))
    process.exit(1)
  }
}

/**
 * Calculate files that can be overridden in the playground.
 * @param cache - Current cache snapshot.
 * @param snapshot - Snapshot of the files.
 * @returns Snapshot of overridable files.
 */
function calculateOverridableFiles(cache: Snapshot, snapshot: Snapshot): Snapshot {
  const result: Snapshot = {}

  for (const quizName in snapshot) {
    if (snapshot[quizName] === cache[quizName])
      result[quizName] = snapshot[quizName]
  }

  return result
}

/**
 * Check if a quiz file is writable in the playground.
 * @param quizFileName - Name of the quiz file.
 * @param overridableFiles - Snapshot of overridable files.
 * @param playgroundSnapshot - Snapshot of the playground.
 * @returns Whether the quiz file is writable or not.
 */
function isQuizWritable(quizFileName: string, overridableFiles: Snapshot, playgroundSnapshot: Snapshot): boolean {
  return !!(
    overridableFiles[quizFileName]
    || (!overridableFiles[quizFileName] && !playgroundSnapshot[quizFileName])
  )
}

/**
 * Generate the local playground.
 */
async function generatePlayground() {
  const playgroundPath = path.join(__dirname, '../playground')
  const playgroundCachePath = path.join(__dirname, '../.playgroundcache')

  let locale = supportedLocales.find(locale => locale === argv[2])!

  console.log(c.bold(c.cyan('Generating local playground...\n')))

  let overridableFiles: Snapshot
  let keepChanges = false
  const currentPlaygroundCache = readPlaygroundCache(playgroundCachePath)
  let playgroundSnapshot: Snapshot

  if (argv.length === 3 && (argv[2] === '--keep-changes' || argv[2] === '-K')) {
    console.log(c.bold(c.cyan('We will keep your changes while generating.\n')))
    keepChanges = true

    playgroundSnapshot = await takeSnapshot(playgroundPath)

    overridableFiles = calculateOverridableFiles(currentPlaygroundCache, playgroundSnapshot)
  } else if (fs.existsSync(playgroundPath)) {
    const result = await prompts([{
      name: 'confirm',
      type: 'confirm',
      initial: false,
      message: 'The playground directory already exists, it may contains the answers you did. Do you want to override it?',
    }])
    if (!result?.confirm)
      return console.log(c.yellow('Skipped.'))
  }

  if (!locale) {
    const result = await prompts([{
      name: 'locale',
      type: 'select',
      message: 'Select language:',
      choices: supportedLocales.map(i => ({
        title: i,
        value: i,
      })),
    }])
    if (!result)
      return console.log(c.yellow('Skipped.'))
    locale = result.locale
  }

  if (!keepChanges) {
    await fs.remove(playgroundPath)
    await fs.ensureDir(playgroundPath)
  }

  const quizes = await loadQuizes()
  const incomingQuizesCache: Snapshot = {}

  for (const quiz of quizes) {
    const { difficulty, title } = resolveInfo(quiz, locale) as QuizMetaInfo & { difficulty: string }
    const code = formatToCode(quiz, locale)

    if (difficulty === undefined || title === undefined) {
      console.log(c.yellow(`${quiz.no} has no ${locale.toUpperCase()} version. Skipping`))
      continue
    }

    const quizesPathByDifficulty = path.join(playgroundPath, difficulty)

    const quizFileName = `${getQuestionFullName(quiz.no, difficulty, title)}.ts`
    const quizPathFull = path.join(quizesPathByDifficulty, quizFileName)

    if (!keepChanges || (keepChanges && isQuizWritable(quizFileName, overridableFiles!, playgroundSnapshot!))) {
      if (!fs.existsSync(quizesPathByDifficulty))
        fs.mkdirSync(quizesPathByDifficulty)
      await fs.writeFile(quizPathFull, code, 'utf-8')
      incomingQuizesCache[quizFileName] = await calculateFileHash(quizPathFull)
    }
  }

  fs.writeFile(playgroundCachePath, JSON.stringify({
    ...currentPlaygroundCache,
    ...incomingQuizesCache,
  }))

  console.log()
  console.log(c.bold(c.green('Local playground generated at: ')) + c.dim(playgroundPath))
  console.log()
}

// Execute the generatePlayground function
generatePlayground()
