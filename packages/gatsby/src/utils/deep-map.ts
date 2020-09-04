// this is copied from `deep-map` package ( https://github.com/mcmath/deep-map/blob/master/src/deep-map.ts)
// (it's copied only to avoid adding deps)
import { isArray, isObject, isFunction, isNil } from "lodash"

export interface IDeepMapModule {
  <T>(object: any, mapFn: IMapFn, options?: IOpts): T
  default<T>(object: any, mapFn: IMapFn, options?: IOpts): T
}

export interface IMapFn {
  (value: any, key: string | number): any
}

export interface IOpts {
  thisArg?: any
  inPlace?: boolean
}

class DeepMap {
  private cache = new WeakMap<object, any>()

  constructor(private mapFn: IMapFn, private opts: IOpts) {}

  public map(value: any, key?: string | number): any {
    return isArray(value)
      ? this.mapArray(value)
      : isObject(value)
      ? this.mapObject(value)
      : this.mapFn.call(this.opts.thisArg, value, key)
  }

  private mapArray(arr: any[]): any[] {
    if (this.cache.has(arr)) {
      return this.cache.get(arr)
    }

    const length = arr.length
    const result = this.opts.inPlace ? arr : []
    this.cache.set(arr, result)

    for (let i = 0; i < length; i++) {
      result[i] = this.map(arr[i], i)
    }

    return result
  }

  private mapObject(obj: object): object {
    if (this.cache.has(obj)) {
      return this.cache.get(obj)
    }

    const result = this.opts.inPlace ? obj : {}
    this.cache.set(obj, result)

    for (const key in obj as any) {
      if (Object.hasOwnProperty.bind(obj)(key)) {
        result[key] = this.map(obj[key], key)
      }
    }

    return result
  }
}

export const deepMapModule: IDeepMapModule = function deepMap(
  object: any,
  mapFn: IMapFn,
  options?: IOpts
): any {
  options = isNil(options) ? {} : options

  if (!mapFn) {
    throw new Error(`mapFn is required`)
  } else if (!isFunction(mapFn)) {
    throw new TypeError(`mapFn must be a function`)
  } else if (!isObject(options)) {
    throw new TypeError(`options must be an object`)
  }

  return new DeepMap(mapFn, options).map(object)
} as any

deepMapModule.default = deepMapModule
