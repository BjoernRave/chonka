import { distance } from "fastest-levenshtein"
import type { Header, HTMLCleaner } from "./types"
import type { ParseResult } from "mozilla-readability"
import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"
import { removeUnnecessaryNodes, removeEmptyElements } from "./cleaners"
import { tagsToRemove } from "./default-selectors"

export const uniquifyHeaders = (headers: Header[]): Header[] => {
  const uniqueHeaders: Header[] = []

  for (const header of headers) {
    if (!isHeaderSimilar(header, uniqueHeaders)) {
      uniqueHeaders.push(header)
    }
  }

  return uniqueHeaders
}

const isHeaderSimilar = (
  header: Header,
  existingHeaders: Header[],
): boolean => {
  const threshold = 1 // Allow only 1 character difference

  for (const existingHeader of existingHeaders) {
    if (distance(header.text, existingHeader.text) <= threshold) {
      return true
    }
  }

  return false
}

export const getTextFromHtml = (html: string) => {
  const doc = new JSDOM(html)

  const reader = new Readability(doc.window.document)

  const article: ParseResult = reader.parse()

  if (article === null) {
    return ""
  }

  return cleanWhiteSpaces(article.textContent)
}

export const cleanWhiteSpaces = (text: string) =>
  text.replaceAll(/\n\s*/g, " ").trim()

export const preprocessHtml = async ({
  html,
  additionalCleaners,
  removeSelectors = [],
}: {
  html: string
  additionalCleaners?: HTMLCleaner[]
  removeSelectors?: string[]
}) => {
  const doc = new JSDOM(html)

  const allCleaners = [
    (doc) => removeUnnecessaryNodes(doc, [...tagsToRemove, ...removeSelectors]),
    removeEmptyElements,
    ...(additionalCleaners ? additionalCleaners : []),
  ]

  let cleanedDoc = doc

  for (const cleaner of allCleaners) {
    const newCleanedDoc = await cleaner(cleanedDoc)

    cleanedDoc = newCleanedDoc
  }

  return cleanedDoc
}
