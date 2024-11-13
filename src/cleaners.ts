import { JSDOM } from "jsdom"

export const removeUnnecessaryNodes = (doc: JSDOM, selectors: string[]) => {
  for (const tagToRemove of selectors) {
    const elements = doc.window.document.querySelectorAll(tagToRemove)

    for (const element of elements) {
      element.remove()
    }
  }

  return doc
}

export const removeLinks = (doc: JSDOM) => {
  const links = doc.window.document.getElementsByTagName("a")

  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i]
    const text = link.textContent
    if (text) {
      link.parentNode.replaceChild(
        doc.window.document.createTextNode(text),
        link,
      )
    } else {
      link.parentNode.removeChild(link)
    }
  }

  const newDoc = new JSDOM(doc.serialize())

  return newDoc
}

export function removeEmptyElements(doc: JSDOM) {
  try {
    const document = doc.window.document

    // Select only elements that could potentially contain text
    const textElements = document.querySelectorAll("*")

    // Loop through text elements to check if they contain text
    const elementsToRemove = []

    for (const element of textElements) {
      if (element.textContent.trim().length === 0 && element.parentNode) {
        // If element has no text content and still has a parent node, add it to the elementsToRemove array
        elementsToRemove.push(element)
      }
    }

    for (const element of elementsToRemove) {
      element.parentNode.removeChild(element)
    }

    // Return the updated HTML
    return doc
  } catch (error) {
    // Handle the error gracefully
    console.error("An error occurred:", error)
    return doc
  }
}

export const removeBdiTags = (doc: JSDOM) => {
  const bdiTags = doc.window.document.querySelectorAll("bdi")

  for (const bdiTag of bdiTags) {
    const text = bdiTag.textContent

    if (text) {
      bdiTag.replaceWith(text)
    }
  }

  return doc
}
