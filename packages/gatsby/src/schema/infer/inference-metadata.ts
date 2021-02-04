/* eslint-disable @typescript-eslint/no-use-before-define */
/*
## Incrementally track the structure of nodes with metadata

This metadata can be later utilized for schema inference
(via building `exampleValue` or directly)

### Usage example:

```javascript
  const node1 = { id: '1', foo: 25, bar: 'str' }
  const node2 = { id: '1', foo: 'conflict' }

  let meta = { ignoredFields: new Set(['id']) }
  meta = addNode(meta, node1)
  meta = addNode(meta, node2)
  console.log(meta.fieldMap)
  // outputs: {
  //   foo: {
  //     int: { total: 1, example: 25 },
  //     string: { total: 1, example: 'conflict' },
  //   },
  //   bar: {
  //     string: { total: 1, example: 'str' },
  //   },
  // }

  const example1 = getExampleObject({ meta, typeName, typeConflictReporter })
  console.log(example1)
  // outputs { bar: 'str' }
  // and reports conflicts discovered

  meta = deleteNode(meta, node2)
  console.log(meta.fieldMap)
  // outputs: {
  //   foo: {
  //     int: { total: 1, example: 25 },
  //     string: { total: 0, example: 'conflict' },
  //   },
  //   bar: { string: { total: 1, example: 'str' } },
  // }

  const example2 = getExampleObject({ meta, typeName, typeConflictReporter })
  // outputs: { foo: 25, bar: 'str' }
```

`addNode`, `deleteNode`, `getExampleObject` are O(N) where N is the number
of fields in the node object (including nested fields)

### Caveats

* Conflict tracking for arrays is tricky, i.e.: { a: [5, "foo"] } and { a: [5] }, { a: ["foo"] }
  are represented identically in metadata. To workaround it we additionally track first NodeId:
  { a: { array: { item: { int: { total: 1, first: `1` }, string: { total: 1, first: `1` } }}
  { a: { array: { item: { int: { total: 1, first: `1` }, string: { total: 1, first: `2` } }}
  This way we can produce more useful conflict reports
  (still rare edge cases possible when reporting may be confusing, i.e. when node is deleted)
*/

import { isEqual } from "lodash"
import { is32BitInteger } from "../../utils/is-32-bit-integer"
import { looksLikeADate } from "../types/date"
import { Node } from "../../../index"
import { TypeConflictReporter } from "./type-conflict-reporter"

export interface ITypeInfo {
  first?: string
  total: number
  example?: unknown
}

export interface ITypeInfoString extends ITypeInfo {
  empty: number
  example: string
}

export interface ITypeInfoDate extends ITypeInfo {
  example: string
}

export interface ITypeInfoNumber extends ITypeInfo {
  example: number
}

export interface ITypeInfoBoolean extends ITypeInfo {
  example: boolean
}

export interface ITypeInfoArray extends ITypeInfo {
  item: IValueDescriptor
}

export interface ITypeInfoRelatedNodes extends ITypeInfo {
  nodes: { [key: string]: number }
}

export interface ITypeInfoObject extends ITypeInfo {
  dprops: {
    [name: string]: IValueDescriptor
  }
}

export interface IValueDescriptor {
  int?: ITypeInfoNumber
  float?: ITypeInfoNumber
  date?: ITypeInfoDate
  string?: ITypeInfoString
  boolean?: ITypeInfoBoolean
  array?: ITypeInfoArray
  relatedNode?: ITypeInfoRelatedNodes
  relatedNodeList?: ITypeInfoRelatedNodes
  object?: ITypeInfoObject
}

export type ValueType = keyof IValueDescriptor

export interface ITypeMetadata {
  typeName?: string
  disabled?: boolean
  ignored?: boolean
  dirty?: boolean
  total?: number
  ignoredFields?: Set<string>
  fieldMap?: Record<string, IValueDescriptor>
  typeConflictReporter?: TypeConflictReporter
  [key: string]: unknown
}

type Operation = "add" | "del"

const inferCounts = new Map()

const setAndReturnFieldType = (
  fieldType,
  typeKeyKey,
  countsObject,
  inferCounts
) => {
  countsObject.count += 1
  // We haven't seen this field before so set it
  if (countsObject.fieldType === null && countsObject.fieldType !== fieldType) {
    countsObject.fieldType = fieldType
    // We have seen this field but it's different :-(
  } else if (
    countsObject.fieldType !== null &&
    countsObject.fieldType !== fieldType
  ) {
    countsObject.allSame = false
  }

  // Set this and save
  inferCounts.set(typeKeyKey, countsObject)
  return fieldType
}
const getType = (
  value: unknown,
  key: string,
  nodeType: string
): ValueType | "null" => {
  const typeofValue = typeof value
  if (
    value === null ||
    ![`number`, `string`, `boolean`, `object`].includes(typeofValue)
  ) {
    return `null`
  }

  const typeKeyKey = `${nodeType}-${key}`
  let countsObject = inferCounts.get(typeKeyKey)

  // Inferring values is very expensive. If after 15 times inferring a field
  // we've gotten the same value each time, we start just returning the
  // previously inferred values.
  if (countsObject?.count > 15 && countsObject.allSame) {
    countsObject.count += 1
    inferCounts.set(typeKeyKey, countsObject)
    return countsObject.fieldType
  }

  if (!countsObject) {
    countsObject = {
      count: 1,
      fieldType: null,
      allSame: true,
    }
  }

  // Staying as close as possible to GraphQL types
  switch (typeofValue) {
    case `number`:
      return setAndReturnFieldType(
        is32BitInteger(value) ? `int` : `float`,
        typeKeyKey,
        countsObject,
        inferCounts
      )

    case `string`:
      let fieldType = ``
      if (key.includes(`___NODE`)) {
        fieldType = `relatedNode`
      } else {
        fieldType = looksLikeADate(value) ? `date` : `string`
      }

      return setAndReturnFieldType(
        fieldType,
        typeKeyKey,
        countsObject,
        inferCounts
      )

    case `boolean`:
      return setAndReturnFieldType(
        `boolean`,
        typeKeyKey,
        countsObject,
        inferCounts
      )
    case `object`:
      if (value === null)
        return setAndReturnFieldType(
          `null`,
          typeKeyKey,
          countsObject,
          inferCounts
        )
      if (value instanceof Date)
        return setAndReturnFieldType(
          `date`,
          typeKeyKey,
          countsObject,
          inferCounts
        )
      if (value instanceof String)
        return setAndReturnFieldType(
          `string`,
          typeKeyKey,
          countsObject,
          inferCounts
        )
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return setAndReturnFieldType(
            `null`,
            typeKeyKey,
            countsObject,
            inferCounts
          )
        }
        return setAndReturnFieldType(
          key.includes(`___NODE`) ? `relatedNodeList` : `array`,
          typeKeyKey,
          countsObject,
          inferCounts
        )
      }
      if (!Object.keys(value).length)
        return setAndReturnFieldType(
          `null`,
          typeKeyKey,
          countsObject,
          inferCounts
        )
      return setAndReturnFieldType(
        `object`,
        typeKeyKey,
        countsObject,
        inferCounts
      )
    default:
      // bigint, symbol, function, unknown (host objects in IE were typeof "unknown", for example)
      return setAndReturnFieldType(
        `null`,
        typeKeyKey,
        countsObject,
        inferCounts
      )
  }
}

const updateValueDescriptorObject = (
  nodeType: string,
  value: object,
  typeInfo: ITypeInfoObject,
  nodeId: string,
  operation: Operation,
  metadata: ITypeMetadata,
  path: Array<object>
): void => {
  path.push(value)

  const { dprops = {} } = typeInfo
  typeInfo.dprops = dprops

  Object.keys(value).forEach(key => {
    const v = value[key]

    let descriptor = dprops[key]
    if (descriptor === undefined) {
      descriptor = {}
      dprops[key] = descriptor
    }

    updateValueDescriptor(
      nodeId,
      nodeType,
      key,
      v,
      operation,
      descriptor,
      metadata,
      path
    )
  })

  path.pop()
}

const updateValueDescriptorArray = (
  nodeType: string,
  value: Array<unknown>,
  key: string,
  typeInfo: ITypeInfoArray,
  nodeId: string,
  operation: Operation,
  metadata: ITypeMetadata,
  path: Array<object>
): void => {
  value.forEach(item => {
    let descriptor = typeInfo.item
    if (descriptor === undefined) {
      descriptor = {}
      typeInfo.item = descriptor
    }

    updateValueDescriptor(
      nodeId,
      nodeType,
      key,
      item,
      operation,
      descriptor,
      metadata,
      path
    )
  })
}

const updateValueDescriptorRelNodes = (
  listOfNodeIds: Array<string>,
  delta: number,
  operation: Operation,
  typeInfo: ITypeInfoRelatedNodes,
  metadata: ITypeMetadata
): void => {
  const { nodes = {} } = typeInfo
  typeInfo.nodes = nodes

  listOfNodeIds.forEach(nodeId => {
    nodes[nodeId] = (nodes[nodeId] || 0) + delta

    // Treat any new related node addition or removal as a structural change
    // FIXME: this will produce false positives as this node can be
    //  of the same type as another node already in the map (but we don't know it here)
    if (nodes[nodeId] === 0 || (operation === `add` && nodes[nodeId] === 1)) {
      metadata.dirty = true
    }
  })
}

const updateValueDescriptorString = (
  value: string,
  delta: number,
  typeInfo: ITypeInfoString
): void => {
  if (value === ``) {
    const { empty = 0 } = typeInfo
    typeInfo.empty = empty + delta
  }
  typeInfo.example =
    typeof typeInfo.example !== `undefined` ? typeInfo.example : value
}

const updateValueDescriptor = (
  nodeId: string,
  nodeType: string,
  key: string,
  value: unknown,
  operation: Operation = `add`,
  descriptor: IValueDescriptor,
  metadata: ITypeMetadata,
  path: Array<object>
): void => {
  // The object may be traversed multiple times from root.
  // Each time it does it should not revisit the same node twice
  if (path.includes(value as object)) {
    return
  }

  const typeName = getType(value, key, nodeType)

  if (typeName === `null`) {
    return
  }

  const delta = operation === `del` ? -1 : 1

  let typeInfo: ITypeInfo | undefined = descriptor[typeName]
  if (typeInfo === undefined) {
    typeInfo = (descriptor[typeName] as ITypeInfo) = { total: 0 }
  }
  typeInfo.total += delta

  // Keeping track of structural changes
  // (when value of a new type is added or an existing type has no more values assigned)
  if (typeInfo.total === 0 || (operation === `add` && typeInfo.total === 1)) {
    metadata.dirty = true
  }

  // Keeping track of the first node for this type. Only used for better conflict reporting.
  // (see Caveats section in the header comments)
  if (operation === `add`) {
    if (!typeInfo.first) {
      typeInfo.first = nodeId
    }
  } else if (operation === `del`) {
    if (typeInfo.first === nodeId || typeInfo.total === 0) {
      typeInfo.first = undefined
    }
  }

  switch (typeName) {
    case `object`:
      updateValueDescriptorObject(
        nodeType,
        value as object,
        typeInfo as ITypeInfoObject,
        nodeId,
        operation,
        metadata,
        path
      )
      return
    case `array`:
      updateValueDescriptorArray(
        nodeType,
        value as Array<unknown>,
        key,
        typeInfo as ITypeInfoArray,
        nodeId,
        operation,
        metadata,
        path
      )
      return
    case `relatedNode`:
      updateValueDescriptorRelNodes(
        [value as string],
        delta,
        operation,
        typeInfo as ITypeInfoRelatedNodes,
        metadata
      )
      return
    case `relatedNodeList`:
      updateValueDescriptorRelNodes(
        value as Array<string>,
        delta,
        operation,
        typeInfo as ITypeInfoRelatedNodes,
        metadata
      )
      return
    case `string`:
      updateValueDescriptorString(
        value as string,
        delta,
        typeInfo as ITypeInfoString
      )
      return
  }

  // int, float, boolean, null

  typeInfo.example =
    typeof typeInfo.example !== `undefined` ? typeInfo.example : value
}

const mergeObjectKeys = (
  dpropsKeysA: object = {},
  dpropsKeysB: object = {}
): Array<string> => {
  const dprops = Object.keys(dpropsKeysA)
  const otherProps = Object.keys(dpropsKeysB)
  return [...new Set(dprops.concat(otherProps))]
}

const descriptorsAreEqual = (
  descriptor?: IValueDescriptor,
  otherDescriptor?: IValueDescriptor
): boolean => {
  const types = possibleTypes(descriptor)
  const otherTypes = possibleTypes(otherDescriptor)

  const childDescriptorsAreEqual = (type: string): boolean => {
    switch (type) {
      case `array`:
        return descriptorsAreEqual(
          descriptor?.array?.item,
          otherDescriptor?.array?.item
        )
      case `object`: {
        const dpropsKeys = mergeObjectKeys(
          descriptor?.object?.dprops,
          otherDescriptor?.object?.dprops
        )
        return dpropsKeys.every(prop =>
          descriptorsAreEqual(
            descriptor?.object?.dprops[prop],
            otherDescriptor?.object?.dprops[prop]
          )
        )
      }
      case `relatedNode`: {
        const nodeIds = mergeObjectKeys(
          descriptor?.relatedNode?.nodes,
          otherDescriptor?.relatedNode?.nodes
        )
        // Must be present in both descriptors or absent in both
        // in order to be considered equal
        return nodeIds.every(
          id =>
            Boolean(descriptor?.relatedNode?.nodes[id]) ===
            Boolean(otherDescriptor?.relatedNode?.nodes[id])
        )
      }
      case `relatedNodeList`: {
        const nodeIds = mergeObjectKeys(
          descriptor?.relatedNodeList?.nodes,
          otherDescriptor?.relatedNodeList?.nodes
        )
        return nodeIds.every(
          id =>
            Boolean(descriptor?.relatedNodeList?.nodes[id]) ===
            Boolean(otherDescriptor?.relatedNodeList?.nodes[id])
        )
      }
      default:
        return true
    }
  }

  // Equal when all possible types are equal (including conflicts)
  return isEqual(types, otherTypes) && types.every(childDescriptorsAreEqual)
}

const nodeFields = (node: Node, ignoredFields = new Set()): Array<string> =>
  Object.keys(node).filter(key => !ignoredFields.has(key))

const updateTypeMetadata = (
  metadata = initialMetadata(),
  operation: Operation,
  node: Node
): ITypeMetadata => {
  if (metadata.disabled) {
    return metadata
  }
  metadata.total = (metadata.total || 0) + (operation === `add` ? 1 : -1)
  if (metadata.ignored) {
    return metadata
  }
  const { ignoredFields, fieldMap = {} } = metadata

  nodeFields(node, ignoredFields).forEach(field => {
    let descriptor = fieldMap[field]
    if (descriptor === undefined) {
      descriptor = {}
      fieldMap[field] = descriptor
    }

    updateValueDescriptor(
      node.id,
      node.internal.type,
      field,
      node[field],
      operation,
      descriptor,
      metadata,
      []
    )
  })
  metadata.fieldMap = fieldMap
  return metadata
}

const ignore = (metadata = initialMetadata(), set = true): ITypeMetadata => {
  metadata.ignored = set
  metadata.fieldMap = {}
  return metadata
}

const disable = (metadata = initialMetadata(), set = true): ITypeMetadata => {
  metadata.disabled = set
  return metadata
}

const NODE_ENV = process.env.NODE_ENV
const addNode = (metadata: ITypeMetadata, node: Node): ITypeMetadata => {
  if (NODE_ENV === `test` && !node.internal?.type) {
    if (!node.internal) {
      node.internal = {}
    }
    node.internal.type = `TEST`
  }
  return updateTypeMetadata(metadata, `add`, node)
}

const deleteNode = (metadata: ITypeMetadata, node: Node): ITypeMetadata => {
  if (NODE_ENV === `test` && !node.internal?.type) {
    if (!node.internal) {
      node.internal = {}
    }
    node.internal.type = `TEST`
  }
  return updateTypeMetadata(metadata, `del`, node)
}
const addNodes = (
  metadata = initialMetadata(),
  nodes: Array<Node>
): ITypeMetadata => nodes.reduce(addNode, metadata)

const possibleTypes = (descriptor: IValueDescriptor = {}): Array<ValueType> =>
  Object.keys(descriptor).filter(type => descriptor[type].total > 0) as Array<
    ValueType
  >

const isEmpty = ({ fieldMap }): boolean =>
  Object.keys(fieldMap).every(
    field => possibleTypes(fieldMap[field]).length === 0
  )

// Even empty type may still have nodes
const hasNodes = (typeMetadata: ITypeMetadata): boolean =>
  (typeMetadata.total ?? 0) > 0

const haveEqualFields = (
  { fieldMap = {} } = {},
  { fieldMap: otherFieldMap = {} } = {}
): boolean => {
  const fields = mergeObjectKeys(fieldMap, otherFieldMap)
  return fields.every(field =>
    descriptorsAreEqual(fieldMap[field], otherFieldMap[field])
  )
}

const initialMetadata = (state?: object): ITypeMetadata => {
  return {
    typeName: undefined,
    disabled: false,
    ignored: false,
    dirty: false,
    total: 0,
    ignoredFields: undefined,
    fieldMap: {},
    ...state,
  }
}

export {
  addNode,
  addNodes,
  deleteNode,
  ignore,
  disable,
  isEmpty,
  hasNodes,
  haveEqualFields,
  initialMetadata,
}
