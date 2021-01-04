import aggregator from "../index"

// Mock Date.now
Date.now = jest.fn(() => 1487076708000)

describe(`file updates`, () => {
  it(`sums the total bytes correctly`, () => {
    let root = { files: {}, hosts: {} }
    root = aggregator(root, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example.com/icon.png`,
        host: `example.com`,
        bytes: 2,
        time: 1,
      },
    })
    root = aggregator(root, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example.com/icon2.png`,
        host: `example.com`,
        bytes: 5,
        time: 2,
      },
    })
    root = aggregator(root, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example.com/icon.png`,
        host: `example.com`,
        bytes: 5,
        time: 3,
      },
    })
    root = aggregator(root, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example.com/icon2.png`,
        host: `example.com`,
        bytes: 1,
        time: 4,
      },
    })
    root = aggregator(root, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example2.com/icon2.png`,
        host: `example2.com`,
        bytes: 1,
        time: 4,
      },
    })

    expect(root).toMatchSnapshot()
    expect(Object.keys(root.files)).toHaveLength(3)
    expect(root.files[`http://example.com/icon2.png`].totalBytes).toBe(6)
    expect(root.hosts[`example.com`].totalBytes).toBe(13)
  })

  it(`updates stream speeds correctly`, () => {
    let root = { files: {}, hosts: {} }
    root = aggregator(root, {
      type: `streamSpeedUpdate`,
      data: {
        host: `example.com`,
        speed: 2,
      },
    })
    expect(root).toMatchSnapshot()
    expect(root.hosts[`example.com`].speed).toEqual(2)
    root = aggregator(root, {
      type: `streamSpeedUpdate`,
      data: {
        host: `example.com`,
        speed: 5,
      },
    })
    expect(root).toMatchSnapshot()
    expect(root.hosts[`example.com`].speed).toEqual(5)
  })

  it(`reduces worker roots correctly`, () => {
    let root1 = { files: {}, hosts: {} }
    let root2 = { files: {}, hosts: {} }
    let root3 = { files: {}, hosts: {} }

    // Update speeds
    root1 = aggregator(root1, {
      type: `streamSpeedUpdate`,
      data: {
        host: `example.com`,
        speed: 2,
      },
    })
    root2 = aggregator(root2, {
      type: `streamSpeedUpdate`,
      data: {
        host: `example.com`,
        speed: 3,
      },
    })

    // File downloading
    root1 = aggregator(root1, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example.com/icon.png`,
        host: `example.com`,
        bytes: 50,
        time: 1,
      },
    })
    root2 = aggregator(root2, {
      type: `fileChunkUpdate`,
      data: {
        url: `http://example.com/icon2.png`,
        host: `example.com`,
        bytes: 1,
        time: 2,
      },
    })

    let combinedRoot = {}
    combinedRoot = aggregator(combinedRoot, {
      type: `combineRoots`,
      data: [root1, root2, root3],
    })
    expect(combinedRoot).toMatchSnapshot()
    expect(combinedRoot.total.speed).toBe(5)
    expect(combinedRoot.total.totalBytes).toBe(51)
  })
})
