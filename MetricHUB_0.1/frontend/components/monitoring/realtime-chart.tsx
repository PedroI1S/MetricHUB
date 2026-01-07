"use client"

import { useEffect, useRef, useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface MonitoringData {
  time: number
  values: Record<string, number>
}

interface ChannelConfig {
  id: string
  name: string
  type: "volt" | "temp" | "res"
  enabled: boolean
}

interface RealtimeChartProps {
  data: MonitoringData[]
  channels: ChannelConfig[]
  isRunning: boolean
  timeWindow?: number // Time window in seconds (30, 60, 300, etc.)
}

const colors = [
  "rgb(21, 128, 61)", // Primary green
  "rgb(132, 204, 22)", // Accent lime
  "rgb(55, 65, 81)", // Dark gray
  "rgb(239, 68, 68)", // Red
  "rgb(59, 130, 246)", // Blue
  "rgb(168, 85, 247)", // Purple
  "rgb(245, 158, 11)", // Amber
  "rgb(16, 185, 129)", // Emerald
]

export function RealtimeChart({ data, channels, isRunning, timeWindow }: RealtimeChartProps) {
  const chartRef = useRef<ChartJS<"line">>(null)
  const [scrollPosition, setScrollPosition] = useState(100) // 0-100, where 100 is the latest data
  const [hasUserScrolled, setHasUserScrolled] = useState(false) // Track if user has manually scrolled
  const [fixedEndTime, setFixedEndTime] = useState<number | null>(null) // Fixed end time when user scrolls

  // Calculate the data window based on scroll position and time window
  const getVisibleData = () => {
    if (!timeWindow || data.length === 0) {
      return data // Show all data if no time window specified
    }

    const latestTime = data[data.length - 1]?.time || 0
    const earliestTime = data[0]?.time || 0
    const totalDuration = latestTime - earliestTime

    if (totalDuration <= timeWindow) {
      return data // If total data is less than time window, show all
    }

    let endTime: number

    if (hasUserScrolled && fixedEndTime !== null) {
      // Use the fixed end time that the user selected
      endTime = fixedEndTime
    } else {
      // Calculate the end time based on scroll position (for initial positioning)
      const maxEndTime = latestTime
      const minEndTime = earliestTime + timeWindow
      endTime = minEndTime + (scrollPosition / 100) * (maxEndTime - minEndTime)
    }

    const startTime = endTime - timeWindow

    return data.filter(point => point.time >= startTime && point.time <= endTime)
  }

  const visibleData = getVisibleData()
  const shouldShowScroll = timeWindow && data.length > 0 && 
    (data[data.length - 1]?.time || 0) - (data[0]?.time || 0) > timeWindow

  // Debug logging
  console.log('RealtimeChart render:', {
    totalDataPoints: data.length,
    visibleDataPoints: visibleData.length,
    channelsCount: channels.length,
    firstDataPoint: visibleData[0],
    channelIds: channels.map(c => c.id),
  })

  const chartData = {
    labels: visibleData.map((point) => point.time.toFixed(1)),
    datasets: channels.map((channel, index) => ({
      label: channel.name,
      data: visibleData.map((point) => point.values[channel.id]),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + "20",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    })),
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const channel = channels[context.datasetIndex]
            let unit = ""
            switch (channel.type) {
              case "volt":
                unit = " V"
                break
              case "temp":
                unit = " °C"
                break
              case "res":
                unit = " Ω"
                break
            }
            return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}${unit}`
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Tempo (s)",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      y: {
        title: {
          display: true,
          text: "Valor",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        beginAtZero: false,
      },
    },
    animation: {
      duration: isRunning ? 750 : 0,
    },
  }

  useEffect(() => {
    if (chartRef.current && isRunning) {
      chartRef.current.update("none")
    }
  }, [data, isRunning])

  // Only auto-scroll to latest data when timeWindow changes (not when new data comes)
  useEffect(() => {
    if (timeWindow) {
      setScrollPosition(100)
      setHasUserScrolled(false) // Reset user scroll tracking when time window changes
      setFixedEndTime(null) // Reset fixed end time
    }
  }, [timeWindow])

  // Update scroll position when new data comes but user hasn't scrolled
  useEffect(() => {
    if (!hasUserScrolled && data.length > 0) {
      // Keep scroll at 100% (latest data) when new data comes and user hasn't manually scrolled
      setScrollPosition(100)
    } else if (hasUserScrolled && fixedEndTime !== null && data.length > 0) {
      // Update scroll position to maintain the same fixed end time
      const latestTime = data[data.length - 1]?.time || 0
      const earliestTime = data[0]?.time || 0
      const totalDuration = latestTime - earliestTime
      
      if (totalDuration > timeWindow!) {
        const maxEndTime = latestTime
        const minEndTime = earliestTime + timeWindow!
        const newScrollPosition = ((fixedEndTime - minEndTime) / (maxEndTime - minEndTime)) * 100
        setScrollPosition(Math.max(0, Math.min(100, newScrollPosition)))
      }
    }
  }, [data, hasUserScrolled, fixedEndTime, timeWindow])

  // Update chart when scroll position changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update("none")
    }
  }, [scrollPosition])

  const formatTimeRange = () => {
    if (!shouldShowScroll || visibleData.length === 0) return ""
    const start = visibleData[0].time.toFixed(1)
    const end = visibleData[visibleData.length - 1].time.toFixed(1)
    return `${start}s - ${end}s`
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* Simple horizontal scroll bar */}
      {shouldShowScroll && (
        <div className="mt-4 px-2">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeRange()}
            </span>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={scrollPosition}
                onChange={(e) => {
                  const newPosition = Number(e.target.value)
                  setScrollPosition(newPosition)
                  setHasUserScrolled(true) // Mark that user has manually scrolled
                  
                  // Calculate and store the fixed end time based on the new scroll position
                  if (data.length > 0 && timeWindow) {
                    const latestTime = data[data.length - 1]?.time || 0
                    const earliestTime = data[0]?.time || 0
                    const totalDuration = latestTime - earliestTime
                    
                    if (totalDuration > timeWindow) {
                      const maxEndTime = latestTime
                      const minEndTime = earliestTime + timeWindow
                      const endTime = minEndTime + (newPosition / 100) * (maxEndTime - minEndTime)
                      setFixedEndTime(endTime)
                    }
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${scrollPosition}%, #e5e7eb ${scrollPosition}%, #e5e7eb 100%)`
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {timeWindow}s window
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
