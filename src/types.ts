import type { JSDOM } from "jsdom"

export interface Header {
  type: number
  text: string
}

export interface ExtractedSection {
  headers: Header[]
  content: string
}

export type HTMLCleaner = (doc: JSDOM) => Promise<JSDOM> | JSDOM
