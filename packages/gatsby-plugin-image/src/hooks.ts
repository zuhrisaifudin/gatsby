import { useState, CSSProperties, useEffect } from "react"
const imageCache = new Set<string>()

// Native lazy-loading support: https://addyosmani.com/blog/lazy-loading/
export const hasNativeLazyLoadSupport =
  typeof HTMLImageElement !== `undefined` &&
  `loading` in HTMLImageElement.prototype

export function storeImageloaded(cacheKey: string): void {
  imageCache.add(cacheKey)
}

export function hasImageLoaded(cacheKey: string): boolean {
  return imageCache.has(cacheKey)
}

export function getWrapperProps(
  width: number,
  height: number,
  layout: "intrinsic" | "responsive" | "fixed"
): { className: string; style: CSSProperties } {
  const wrapperStyle: CSSProperties = {
    position: `relative`,
  }

  if (layout === `fixed`) {
    wrapperStyle.width = width
    wrapperStyle.height = height
  }

  if (layout === `intrinsic`) {
    wrapperStyle.display = `inline-block`
  }

  return {
    className: `gatsby-image`,
    style: wrapperStyle,
  }
}

export function getMainProps(
  isLoading: boolean,
  isLoaded: boolean,
  images: any,
  loading: "eager" | "lazy",
  toggleLoaded?: any,
  cacheKey?: string,
  ref?: any
): any {
  const result = {
    ...images,
    loading,
    shouldLoad: isLoading,
    "data-main-image": ``,
    style: {
      opacity: isLoaded ? 1 : 0,
    },
    onLoad: function (): void {
      imageCache.add(cacheKey)
      toggleLoaded(true)
    },
    ref,
  }

  // @ts-ignore
  if (!global.GATSBY___IMAGE) {
    result.style.height = `100%`
    result.style.left = 0
    result.style.position = `absolute`
    result.style.top = 0
    result.style.transform = `translateZ(0)`
    result.style.transition = `opacity 300ms`
    result.style.width = `100%`
    result.style.willChange = `opacity`
  }

  return {
    ...images,
    loading,
    shouldLoad: isLoading,
    "data-main-image": ``,
    style: {
      opacity: isLoaded ? 1 : 0,
    },
    onLoad: function (): void {
      imageCache.add(cacheKey)
      toggleLoaded(true)
    },
    ref,
  }
}

export function getPlaceHolderProps(placeholder: any): any {
  const result = {
    ...placeholder,
    "aria-hidden": true,
  }

  // @ts-ignore
  if (!global.GATSBY___IMAGE) {
    result.style = {
      height: `100%`,
      left: 0,
      position: `absolute`,
      top: 0,
      width: `100%`,
    }
  }

  return result
}

export function useImageLoaded(
  cacheKey: string,
  loading: "lazy" | "eager",
  ref: any
): any {
  const [isLoaded, toggleLoaded] = useState(false)
  const [isLoading, toggleIsLoading] = useState(loading === `eager`)

  const rAF =
    typeof window !== `undefined` && `requestAnimationFrame` in window
      ? requestAnimationFrame
      : function (cb: Function): number {
          return setTimeout(cb, 16)
        }
  const cRAF =
    typeof window !== `undefined` && `cancelAnimationFrame` in window
      ? cancelAnimationFrame
      : clearTimeout

  useEffect(() => {
    let interval: any
    // @see https://stackoverflow.com/questions/44074747/componentdidmount-called-before-ref-callback/50019873#50019873
    function toggleIfRefExists(): void {
      if (ref.current) {
        if (loading === `eager` && ref.current.complete) {
          imageCache.add(cacheKey)
          toggleLoaded(true)
        } else {
          toggleIsLoading(true)
        }
      } else {
        interval = rAF(toggleIfRefExists)
      }
    }
    toggleIfRefExists()

    return (): void => {
      cRAF(interval)
    }
  }, [])

  return {
    isLoading,
    isLoaded,
    toggleLoaded,
  }
}
