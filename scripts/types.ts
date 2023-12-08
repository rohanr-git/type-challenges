// Import necessary types from external modules
import type { DeepPartial } from 'utility-types'
import type { context, getOctokit } from '@actions/github'
import type Core from '@actions/core'
import type IO from '@actions/io'

// Define types for GitHub, Action context, and the Action function
export type Github = ReturnType<typeof getOctokit>
export type Context = typeof context
export type Action = (github: Github, context: Context, core: typeof Core, io: typeof IO) => Promise<void>

// Define metadata structure for a quiz
export interface QuizMetaInfo {
  title: string
  author: {
    name: string
    email: string
    github: string
  }
  tsconfig?: Record<string, any>
  original_issues: number[]
  recommended_solutions: number[]
  tags: string[]
  related?: string[]
}

// Define difficulty levels
export type Difficulty = 'warm' | 'easy' | 'medium' | 'hard' | 'extreme' | 'pending'

// Define the structure of a quiz
export interface Quiz {
  no: number
  difficulty: Difficulty
  path: string
  readme: Record<string, string>
  template: string
  info: Record<string, DeepPartial<QuizMetaInfo> | undefined>
  tests?: string
  solutions?: {
    code?: string
    readme?: Record<string, string>
  }
}

// ************************************************************
// Types Section
// ************************************************************

// Types related to GitHub and Action context

// Define the type for the GitHub instance
export type Github = ReturnType<typeof getOctokit>

// Define the type for the Action context
export type Context = typeof context

// Define the type for the Action function
export type Action = (github: Github, context: Context, core: typeof Core, io: typeof IO) => Promise<void>

// Define the metadata structure for a quiz
export interface QuizMetaInfo {
  title: string
  author: {
    name: string
    email: string
    github: string
  }
  tsconfig?: Record<string, any>
  original_issues: number[]
  recommended_solutions: number[]
  tags: string[]
  related?: string[]
}

// Define difficulty levels
export type Difficulty = 'warm' | 'easy' | 'medium' | 'hard' | 'extreme' | 'pending'

// Define the structure of a quiz
export interface Quiz {
  no: number
  difficulty: Difficulty
  path: string
  readme: Record<string, string>
  template: string
  info: Record<string, DeepPartial<QuizMetaInfo> | undefined>
  tests?: string
  solutions?: {
    code?: string
    readme?: Record<string, string>
  }
}

// ************************************************************
// End of Types Section
// ************************************************************
