import type { JSDOM } from "jsdom"

export interface Header {
  type: number
  text: string
}

export interface Chunk {
  metadata: {
    headers: string
    [key: string]: string
  }
  content: string
}

export interface ExtractedSection {
  headers: Header[]
  content: string
}

export type HTMLCleaner = (doc: JSDOM) => Promise<JSDOM> | JSDOM
