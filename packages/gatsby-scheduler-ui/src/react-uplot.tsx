import React, { useEffect, useRef } from "react"
import uPlot from "uplot"
import "uplot/dist/uPlot.min.css"
import _ from "lodash"

export const UPlot = React.memo(
  (props: {
    options: uPlot.Options
    data: uPlot.AlignedData
    placeLegendBelowContainer?: boolean
  }) => {
    let { options, data, placeLegendBelowContainer } = props
    const divRef = useRef<HTMLDivElement>(null)
    const [chart, setChart] = React.useState()

    const deps = [data, options, divRef]
    useEffect(() => {
      if (!chart) {
        setChart(new uPlot(options, data, divRef.current))
      }
      return () => {
        chart?.destroy()
      }
    }, [])
    if (chart) {
      chart.setData(data)
      if (chart.series.length < options.series.length) {
        options.series.slice(chart.series.length).forEach((item, i) => {
          chart.addSeries(item)
        })
      }
    }

    const randomID = `id_${Math.random().toString().replace(".", "")}`

    const div = (
      <div
        ref={divRef}
        style={
          ({ width: "100%", height: "100%" },
          placeLegendBelowContainer &&
            ({ height: "calc(100% + 33px)", pointerEvents: "none" } as const))
        }
      />
    )

    if (placeLegendBelowContainer) {
      return (
        <div id={randomID} style={{ width: "100%", height: "100%" }}>
          <style>{`
					#${randomID} .u-wrap {
						pointer-events: auto;
					}
					#${randomID} .u-legend > tr {
						pointer-events: auto;
					}
				`}</style>
          {div}
        </div>
      )
    }
    return div
  }
)
