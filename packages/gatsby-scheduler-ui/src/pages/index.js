import React, { useState, useRef } from "react"
import { format, fromUnixTime } from "date-fns"
import prettyBytes from "pretty-bytes"
import {
  BarChart,
  Bar,
  Brush,
  Cell,
  CartesianGrid,
  ReferenceLine,
  LineChart,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ErrorBar,
  LabelList,
  Rectangle,
} from "recharts"
import { UPlot } from "../react-uplot"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "d3-scale-chromatic"
import _ from "lodash"
import { changeNumberOfData } from "../utils"
import * as io from "socket.io-client"
import mitt from "mitt"
import smooth from "./smooth"

const cursorOpts = {
  lock: true,
  focus: {
    prox: 16,
  },
  sync: {
    key: "moo",
    setSeries: true,
  },
}

const emitter = mitt()

const socket = io("ws://localhost:3000")

socket.on("connect", () => {
  // handle the event sent with socket.send()
  socket.on("stats", data => {
    emitter.emit(`stats`, data)
  })
  socket.on("hostSpeed", data => {
    emitter.emit(`hostSpeed`, data)
  })
  socket.on("workerStats", data => {
    emitter.emit(`workerStats`, data)
  })
})

export default function Demo() {
  const [stats, setStats] = useState({})
  const [hostSpeeds, setHostspeeds] = useState([])
  const [workerStats, setWorkerStats] = useState([])

  React.useEffect(() => {
    const updateState = (type, event) => {
      if (type === `stats`) {
        let fileStats = []
        if (stats[event.name]) {
          fileStats = stats[event.name]
        }

        fileStats.push(event)
        stats[event.name] = [...fileStats]
        setStats({ ...stats })
      } else if (type === `hostSpeed`) {
        console.log(`hostSpeed`, event)
        setHostspeeds(prev => [...prev, event])
      } else if (type === `workerStats`) {
        console.log(event)
        setWorkerStats(prev => {
          if (!prev[event.workerId]) {
            prev[event.workerId] = []
          }
          prev[event.workerId].push(event)
          return JSON.parse(JSON.stringify(prev))
        })
      }
    }
    emitter.on("*", updateState)
    return function cleanup() {
      emitter.off(`*`, updateState)
    }
  }, [])

  if (hostSpeeds.length === 0 || workerStats.length === 0) {
    return "awaiting server"
  }

  let startTime
  let maxX
  let hostNames
  if (hostSpeeds.length > 0) {
    console.log(hostSpeeds[0])
    console.log(hostSpeeds.slice(-1)[0])
    startTime = hostSpeeds[0].start
    maxX = hostSpeeds.slice(-1)[0].end
    hostNames = hostSpeeds.slice(-1)[0].hostNames
    console.log({ startTime, maxX, hostNames, hostSpeeds })
  }

  console.log({
    series: [
      {},
      {
        label: "total",
        stroke: schemeCategory10[0],
        scale: `mb/s`,
        value: (_, rawValue) => (rawValue ? prettyBytes(rawValue) : ``),
      },
      ...hostNames
        .filter(h => h !== `total`)
        .map((host, i) => {
          console.log({ host })
          return {
            label: host,
            stroke: schemeCategory10[i + 1],
            scale: `mb/s`,
            value: (_, rawValue) => (rawValue ? prettyBytes(rawValue) : ``),
          }
        }),
    ],
  })
  // console.log(
  // hostNames
  // .filter(h => h !== `total`)
  // .map(host => hostSpeeds.map(s => (s[host] ? s[host] : 0)))
  // .map(a => smooth(a, 2))
  // )
  console.log([
    hostSpeeds.map(s => s.time - startTime),
    smooth(
      hostSpeeds.map(s => s[`total`].speed || 0),
      8
    ),
    ...hostNames
      .filter(h => h !== `total`)
      .map(host => hostSpeeds.map(s => (s[host]?.speed ? s[host].speed : 0))),
    // .map(speeds => smooth(speeds, 8)),
  ])
  console.log(workerStats)

  return (
    <div className="bar-charts">
      {hostSpeeds.length > 0 && (
        <div>
          <h2>Bytes per host</h2>
          <div>
            <ul>
              {hostNames.map(host => {
                const bytes = hostSpeeds.slice(-1)[0][host].totalBytes
                return (
                  <li>
                    <strong>{host}:</strong> {prettyBytes(bytes)}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
      {hostSpeeds.length > 0 && (
        <div key={`host speed`}>
          <h2>Host Throughput</h2>
          <div style={{ padding: 20 }}>
            <UPlot
              data={[
                hostSpeeds.map(s => s.time - startTime),
                smooth(
                  hostSpeeds.map(s => s[`total`].speed),
                  Math.round(Math.log(hostSpeeds.length))
                ),
                ...hostNames
                  .filter(h => h !== `total`)
                  .map(host =>
                    hostSpeeds.map(s => (s[host]?.speed ? s[host].speed : 0))
                  )
                  .map(speeds =>
                    smooth(speeds, Math.round(Math.log(speeds.length)))
                  ),
              ]}
              options={{
                title: "Per Host Throughput (mb/s)",
                cursor: cursorOpts,
                width: 700,
                height: 400,
                //	cursor: {
                //		top: 100,
                //		left: 100,
                //	},
                // plugins: [tooltipsPlugin()],
                scales: {
                  x: {
                    time: false,
                  },
                },
                series: [
                  {},
                  {
                    label: "total",
                    stroke: schemeCategory10[0],
                    scale: `mb/s`,
                    value: (_, rawValue) =>
                      rawValue ? prettyBytes(rawValue) : ``,
                  },
                  ...hostNames
                    .filter(h => h !== `total`)
                    .map((host, i) => {
                      console.log({ host })
                      return {
                        label: host,
                        stroke: schemeCategory10[i + 1],
                        scale: `mb/s`,
                        value: (_, rawValue) =>
                          rawValue ? prettyBytes(rawValue) : ``,
                      }
                    }),
                ],
                axes: [
                  {},
                  {
                    scale: "mb/s",
                    values: (self, ticks) =>
                      ticks.map(rawValue => prettyBytes(rawValue)),
                    side: 1,
                    // grid: { show: false },
                  },
                ],
              }}
            />
          </div>
        </div>
      )}
      <div key={`Worker`}>
        {workerStats.map((workerStatArr, i) => (
          <div key={`workers-${i}`} style={{ padding: 20 }}>
            <UPlot
              data={[
                workerStatArr.map(
                  s => new Date(s.timestamp).getTime() / 1000 - startTime
                ),
                workerStatArr.map(s => s.cpu),
                workerStatArr.map(s => s.system),
                workerStatArr.map(s => s.user),
                workerStatArr.map(s => s.delay),
                workerStatArr.map(s => s.memory.rss),
              ]}
              options={{
                title: `Worker ${i}`,
                width: 700,
                height: 400,
                cursor: cursorOpts,
                //	cursor: {
                //		top: 100,
                //		left: 100,
                //	},
                // plugins: [tooltipsPlugin()],
                scales: {
                  x: {
                    time: false,
                  },
                },
                series: [
                  {},
                  {
                    label: `CPU`,
                    stroke: schemeCategory10[0],
                    scale: `%`,
                  },
                  {
                    label: `system`,
                    stroke: schemeCategory10[1],
                    scale: `%`,
                  },
                  {
                    label: `user`,
                    stroke: schemeCategory10[2],
                    scale: `%`,
                  },
                  {
                    label: `delay`,
                    stroke: schemeCategory10[3],
                    scale: `ms`,
                  },
                  {
                    label: `memory`,
                    stroke: schemeCategory10[4],
                    scale: `memory`,
                    value: (_, rawValue) =>
                      rawValue ? prettyBytes(rawValue) : ``,
                  },
                ],
                axes: [
                  {},
                  {
                    scale: `%`,
                    side: 1,
                    values: (self, ticks) =>
                      ticks.map(rawValue => {
                        const converted = rawValue * 100
                        return converted.toFixed(1) + `%`
                      }),
                  },
                  {
                    scale: `ms`,
                    side: 3,
                  },
                ],
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
/*
 *
      {Object.keys(stats).map(fileName => {
        console.log(fileName, stats[fileName])
        return (
          <div key={fileName}>
            <h2>{fileName}</h2>
            <LineChart
              width={730}
              height={250}
              data={stats[fileName]}
              margin={{ top: 5, right: 40, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                // Makes the chart a time series chart
                tickFormatter={unixTime =>
                  Math.max(unixTime - stats[fileName][0].time, 0).toFixed(1) +
                  `s`
                }
                type="number"
                domain={[() => startTime, () => maxX]}
              />
              <YAxis
                yAxisId="left"
                dataKey={"bytesPerSecond"}
                label={{
                  value: "Throughput (bytes / second)",
                  angle: -90,
                  dx: -50,
                }}
                tickFormatter={bytes => {
                  if (_.isFinite(bytes)) {
                    return prettyBytes(bytes)
                  } else {
                    return ``
                  }
                }}
                domain={["auto", "auto"]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "Total downloaded",
                  angle: -90,
                  dx: 40,
                }}
                dataKey={"totalBytes"}
                tickFormatter={bytes => {
                  if (_.isFinite(bytes)) {
                    return prettyBytes(bytes)
                  } else {
                    return ``
                  }
                }}
                domain={[`auto`, `auto`]}
              />
              <Tooltip
                labelFormatter={unixTime => {
                  return (
                    Math.max(unixTime - stats[fileName][0].time, 0).toFixed(1) +
                    `s`
                  )
                }}
                formatter={(value, name, props) => {
                  return prettyBytes(value)
                }}
              />
              <Legend />
              <Line
                yAxisId="right"
                isAnimationActive={false}
                type="monotone"
                dataKey="totalBytes"
                stroke="#8884d8"
                dot={false}
              />
              <Line
                yAxisId="left"
                isAnimationActive={false}
                type="monotone"
                dataKey="bytesPerSecond"
                stroke="#8884d8"
                dot={false}
              />
            </LineChart>
          </div>
        )
      })}
*/

/*
        <LineChart
          width={730}
          height={250}
          data={hostSpeeds}
          margin={{ top: 5, right: 40, left: 30, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            // Makes the chart a time series chart
            tickFormatter={unixTime => {
              const tick = Math.max(unixTime - startTime).toFixed(1) + `s`
              return tick
            }}
            type="number"
            domain={[() => startTime, () => maxX]}
          />
          <YAxis
            yAxisId="left"
            // scale="log"
            // dataKey={"homepages.cae.wisc.edu"}
            label={{
              value: "Throughput (bytes / second)",
              angle: -90,
              dx: -50,
            }}
            tickFormatter={bytes => {
              if (_.isFinite(bytes)) {
                return prettyBytes(bytes)
              } else {
                return ``
              }
            }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            labelFormatter={unixTime => {
              return Math.max(unixTime - startTime, 0).toFixed(1) + `s`
            }}
            formatter={(value, name, props) => {
              return prettyBytes(value)
            }}
          />
          <Legend />
          {hostNames.map(host => (
            <Line
              key={host}
              yAxisId="left"
              isAnimationActive={false}
              type="monotone"
              dataKey={host}
              stroke="#8884d8"
              dot={false}
            />
          ))}
        </LineChart>
        */
