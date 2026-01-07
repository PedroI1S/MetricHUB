"use client"

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

interface ReportData {
  time: number
  values: Record<string, number>
}

interface ChannelConfig {
  id: string
  name: string
  type: "volt" | "temp" | "res"
  enabled: boolean
}

interface ReportChartProps {
  data: ReportData[]
  channels: ChannelConfig[]
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

export function ReportChart({ data, channels }: ReportChartProps) {
  const chartData = {
    labels: data.map((point) => (point.time / 60).toFixed(1)), // Convert to minutes
    datasets: channels.map((channel, index) => ({
      label: channel.name,
      data: data.map((point) => point.values[channel.id]),
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
          title: (context) => {
            const minutes = Number.parseFloat(context[0].label)
            const hours = Math.floor(minutes / 60)
            const mins = Math.floor(minutes % 60)
            return `Tempo: ${hours}h ${mins}m`
          },
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
          text: "Tempo (minutos)",
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
      duration: 0, // No animation for static reports
    },
  }

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  )
}
