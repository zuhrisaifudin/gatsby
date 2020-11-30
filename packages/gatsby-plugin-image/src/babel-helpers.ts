import { murmurhash } from "babel-plugin-remove-graphql-queries/murmur"
import { JSXOpeningElement } from "@babel/types"
import { NodePath } from "@babel/core"
import { getAttributeValues } from "babel-jsx-utils"

export const SHARP_ATTRIBUTES = new Set([
  `src`,
  `layout`,
  `maxWidth`,
  `maxHeight`,
  `quality`,
  `jpegOptions`,
  `pngOptions`,
  `webpOptions`,
  `blurredOptions`,
  `transformOptions`,
  `width`,
  `height`,
  `placeholder`,
  `tracedSVGOptions`,
  `sizes`,
  `background`,
])

const numericValues = [`width`, `height`, `maxWidth`, `maxHeight`, `quality`]

function coerceValues(attrs: Record<string, unknown>): Record<string, unknown> {
  numericValues.forEach((key: string) => {
    if (typeof attrs[key] === `string`) {
      const parsed = parseInt(attrs[key] as string, 10)
      if (isNaN(parsed as number)) {
        console.error(
          `[gatsby-plugin-image] Invalid value "${attrs[key]}" provided for ${key} of StaticImage "${attrs.src}". Value must be numeric.`
        )
      } else {
        attrs[key] = parsed
      }
    }
  })
  return attrs
}

export function evaluateImageAttributes(
  nodePath: NodePath<JSXOpeningElement>,
  onError?: (prop: string) => void
): Record<string, unknown> {
  // Only get attributes that we need for generating the images
  const attrValues = getAttributeValues(nodePath, onError, SHARP_ATTRIBUTES)
  return coerceValues(attrValues)
}

export function hashOptions(options: unknown): string {
  return `${murmurhash(JSON.stringify(options))}`
}
