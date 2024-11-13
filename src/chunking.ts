import { JSDOM } from "jsdom"
import type { ExtractedSection, Header, HTMLCleaner } from "./types"
import { Readability } from "@mozilla/readability"
import type { ParseResult } from "mozilla-readability"
import { cleanWhiteSpaces, preprocessHtml } from "./cleaners"
import { splitText, type SplitterOptions } from "./splitter"
import { distance } from "fastest-levenshtein"
import { getTextFromHtml, uniquifyHeaders } from "./utils"
import Showdown from "showdown"

/**
 * Preprocesses the HTML content by applying additional cleaners and extracting structured content.
 * @param html - The HTML content to be processed.
 * @param htmlCleaners - An array of HTML cleaners to be applied to the HTML content.
 * @param removeSelectors - An array of selectors to be removed from the HTML content.
 * @param options - An object containing options for the splitter.
 * @returns An object containing the processed HTML
 */
export const convertHTMLToChunks = async ({
  html,
  htmlCleaners = [],
  removeSelectors = [],
  options,
}: {
  html: string
  htmlCleaners?: HTMLCleaner[]
  removeSelectors?: string[]
  options?: SplitterOptions
}) => {
  const processedHtml = await preprocessHtml({
    html: html,
    additionalCleaners: htmlCleaners,
    removeSelectors,
  })

  const documentTitle = processedHtml.window.document.title

  const extractedSections = extractStructuredContent(processedHtml.serialize())

  const chunks = await chunkSections(extractedSections, options)

  return {
    title: documentTitle,
    chunks,
  }
}

/**
 * Converts markdown content into chunks by first converting to HTML and then processing.
 * @param markdown - The markdown content to be converted and chunked.
 * @param options - An object containing options for the splitter.
 * @returns A promise that resolves to an object containing the chunked content with headers.
 */
export const convertMarkdownToChunks = async ({
  markdown,
  options,
}: {
  markdown: string
  options?: SplitterOptions
}) => {
  const converter = new Showdown.Converter()

  const html = converter.makeHtml(markdown)

  return convertHTMLToChunks({ html, options })
}

/**
 * Extracts structured content from an HTML string.
 * @param html - The HTML content from which structured content needs to be extracted.
 * @returns An array of objects representing sections of structured content.
 */
export const extractStructuredContent = (html: string) => {
  const dom = new JSDOM(html)
  const allHeaders = Array.from(
    dom.window.document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  )
    .filter((h) => Boolean(h.textContent))
    .map((h) => ({
      type: Number.parseInt(h.tagName.slice(1), 10),
      html: h.outerHTML,
      text: h.textContent?.trim() || "",
    }))

  const extracted: ExtractedSection[] = []
  const serializedHtml = dom.serialize()
  let currentContent = serializedHtml
  let currentHeaders: Header[] = []

  for (const header of allHeaders) {
    const [topPartOfContent, remainingContent] = currentContent.split(
      header.html,
    )
    const content = getTextFromHtml(topPartOfContent.trim())

    if (content.length !== 0) {
      extracted.push({
        content,
        headers: currentHeaders,
      })
    }

    currentHeaders = currentHeaders.filter((h) => h.type < header.type)

    if (header.text.length > 0) {
      currentHeaders.push({
        type: header.type,
        text: header.text,
      })
    }

    if (remainingContent) {
      currentContent = remainingContent.trim()
    } else {
      currentContent = ""
    }
  }

  const content = getTextFromHtml(currentContent)

  if (content.length !== 0) {
    extracted.push({
      content,
      headers: currentHeaders,
    })
  }

  return extracted
}

/**
 * This function takes in an array of extracted sections and an optional array of additional headers.
 * It uses a text splitter to divide the content of each section into smaller chunks.
 * The function then filters out chunks with less than 40 characters and returns the filtered chunks.
 *
 * @param sections - An array of objects representing the extracted sections.
 * @returns An array of objects representing the filtered chunks.
 */
export const chunkSections = async (
  sections: ExtractedSection[],
  options?: SplitterOptions,
): Promise<ExtractedSection[]> => {
  const chunks: ExtractedSection[] = []

  for (const section of sections) {
    const uniqueHeaders = uniquifyHeaders(section.headers)

    const splitted = splitText(section.content, options)

    chunks.push(
      ...splitted.map((chunk) => ({
        content: chunk,
        headers: uniqueHeaders,
      })),
    )
  }

  const filteredChunks = chunks.filter(
    (chunk) => chunk.content.trim().length > 30,
  )

  return filteredChunks
}
