import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { convertHTMLToChunks, convertMarkdownToChunks } from "../src/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const testHtml = async () => {
  const text = await readFile(join(__dirname, "wikipedia.html"), "utf-8")

  const result = await convertHTMLToChunks({
    html: text,
  })

  await writeFile(
    join(__dirname, "wikipedia.json"),
    JSON.stringify(result, null, 2),
  )
}

export const testMarkdown = async () => {
  const markdown = await readFile(join(__dirname, "example.md"), "utf-8")

  const result = await convertMarkdownToChunks({ markdown })

  await writeFile(
    join(__dirname, "example.json"),
    JSON.stringify(result, null, 2),
  )
}

testMarkdown()
