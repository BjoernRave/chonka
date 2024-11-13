export interface SplitterOptions {
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
  lengthFunction?: (text: string) => number
}

export function splitText(
  text: string,
  options: SplitterOptions = {},
): string[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = ["\n\n", "\n", " ", ""],
    lengthFunction = (t: string) => t.length,
  } = options

  if (chunkOverlap >= chunkSize) {
    throw new Error("Cannot have chunkOverlap >= chunkSize")
  }

  function splitOnSeparator(text: string, separator: string): string[] {
    return text.split(separator).filter((s) => s !== "")
  }

  function joinDocs(docs: string[], separator: string): string | null {
    const text = docs.join(separator).trim()
    return text === "" ? null : text
  }

  function mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = []
    const currentDoc: string[] = []
    let total = 0

    for (const d of splits) {
      const _len = lengthFunction(d)
      if (total + _len + currentDoc.length * separator.length > chunkSize) {
        if (total > chunkSize) {
          console.warn(
            `Created a chunk of size ${total}, which is longer than the specified ${chunkSize}`,
          )
        }
        if (currentDoc.length > 0) {
          const doc = joinDocs(currentDoc, separator)
          if (doc !== null) {
            docs.push(doc)
          }
          while (
            total > chunkOverlap ||
            (total + _len + currentDoc.length * separator.length > chunkSize &&
              total > 0)
          ) {
            total -= lengthFunction(currentDoc[0])
            currentDoc.shift()
          }
        }
      }
      currentDoc.push(d)
      total += _len
    }
    const doc = joinDocs(currentDoc, separator)
    if (doc !== null) {
      docs.push(doc)
    }
    return docs
  }

  function recursiveSplit(text: string, separators: string[]): string[] {
    const finalChunks: string[] = []

    let separator: string = separators[separators.length - 1]
    let newSeparators: string[] = []

    for (let i = 0; i < separators.length; i += 1) {
      const s = separators[i]
      if (s === "") {
        separator = s
        break
      }
      if (text.includes(s)) {
        separator = s
        newSeparators = separators.slice(i + 1)
        break
      }
    }

    const splits = splitOnSeparator(text, separator)

    let goodSplits: string[] = []
    for (const s of splits) {
      if (lengthFunction(s) < chunkSize) {
        goodSplits.push(s)
      } else {
        if (goodSplits.length) {
          const mergedText = mergeSplits(goodSplits, separator)
          finalChunks.push(...mergedText)
          goodSplits = []
        }
        if (!newSeparators) {
          finalChunks.push(s)
        } else {
          const otherInfo = recursiveSplit(s, newSeparators)
          finalChunks.push(...otherInfo)
        }
      }
    }
    if (goodSplits.length) {
      const mergedText = mergeSplits(goodSplits, separator)
      finalChunks.push(...mergedText)
    }
    return finalChunks
  }

  return recursiveSplit(text, separators)
}
