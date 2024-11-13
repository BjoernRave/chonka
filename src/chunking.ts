import { JSDOM } from "jsdom"
import type { Chunk, ExtractedSection, Header, HTMLCleaner } from "./types"
import { splitText, type SplitterOptions } from "./splitter"
import { getTextFromHtml, preprocessHtml, uniquifyHeaders } from "./utils"
import Showdown from "showdown"

/**
 * Preprocesses HTML content and converts it into chunks with metadata.
 * @param {Object} params - The parameters for converting HTML to chunks
 * @param {string} params.html - The HTML content to be processed
 * @param {HTMLCleaner[]} [params.htmlCleaners=[]] - Array of HTML cleaners to apply to the content
 * @param {string[]} [params.removeSelectors=[]] - CSS selectors for elements to remove from the HTML
 * @param {SplitterOptions} [params.options] - Configuration options for text splitting
 * @param {Record<string, string>} [params.metadata={}] - Additional metadata to attach to chunks
 * @returns {Promise<{title: string, chunks: Chunk[]}>} Object containing document title and processed chunks
 */
export const convertHTMLToChunks = async ({
  html,
  htmlCleaners = [],
  removeSelectors = [],
  options,
  metadata = {},
}: {
  html: string
  htmlCleaners?: HTMLCleaner[]
  removeSelectors?: string[]
  options?: SplitterOptions
  metadata?: Record<string, string>
}) => {
  const processedHtml = await preprocessHtml({
    html: html,
    additionalCleaners: htmlCleaners,
    removeSelectors,
  })

  const documentTitle = processedHtml.window.document.title

  const extractedSections = extractStructuredContent(processedHtml.serialize())

  const chunks = await chunkSections(extractedSections, options, metadata)

  return {
    title: documentTitle,
    chunks,
  }
}

/**
 * Converts markdown content into chunks by first converting to HTML and then processing.
 * @param {Object} params - The parameters for converting markdown to chunks
 * @param {string} params.markdown - The markdown content to be converted
 * @param {SplitterOptions} [params.options] - Configuration options for text splitting
 * @returns {Promise<Chunk[]>} Array of processed content chunks with metadata
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

  const result = await convertHTMLToChunks({ html, options })

  return result.chunks
}

/**
 * Extracts structured content from HTML by splitting it into sections based on headers.
 * @param {string} html - The HTML content to process
 * @returns {ExtractedSection[]} Array of sections containing content and associated headers
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
        type: header.type as any,
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
 * Processes extracted sections into chunks and attaches metadata.
 * @param {ExtractedSection[]} sections - Array of sections to process
 * @param {SplitterOptions} [options] - Configuration options for text splitting
 * @param {Record<string, string>} [metadata] - Additional metadata to attach to chunks
 * @returns {Promise<Chunk[]>} Array of processed chunks with content and metadata
 */
export const chunkSections = async (
  sections: ExtractedSection[],
  options?: SplitterOptions,
  metadata?: Record<string, string>,
): Promise<Chunk[]> => {
  const chunks: Chunk[] = []

  for (const section of sections) {
    const uniqueHeaders = uniquifyHeaders(section.headers)

    const splitted = splitText(section.content, options)

    chunks.push(
      ...splitted.map((chunk) => ({
        content: chunk,
        metadata: {
          headers: uniqueHeaders
            .sort((a, b) => a.type - b.type)
            .map((h) => h.text)
            .join(" "),
          ...metadata,
        },
      })),
    )
  }

  const filteredChunks = chunks.filter(
    (chunk) => chunk.content.trim().length > 30,
  )

  return filteredChunks
}
