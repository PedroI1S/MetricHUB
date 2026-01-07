import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

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

interface ExperimentInfo {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
}

const formatValue = (value: number | undefined, type: "volt" | "temp" | "res") => {
  if (value === undefined || value === null) return "---"
  
  switch (type) {
    case "volt":
      return value.toFixed(3)
    case "temp":
      return value.toFixed(2)
    case "res":
      return value.toFixed(2)
    default:
      return value.toFixed(3)
  }
}

const getUnit = (type: "volt" | "temp" | "res") => {
  switch (type) {
    case "volt":
      return "V"
    case "temp":
      return "°C"
    case "res":
      return "Ω" // Direct Unicode character
    default:
      return ""
  }
}

const getUnitFallback = (type: "volt" | "temp" | "res") => {
  switch (type) {
    case "volt":
      return "V"
    case "temp":
      return "degC"
    case "res":
      return "Ohms" // ASCII fallback
    default:
      return ""
  }
}

export function generatePDF(
  experiment: ExperimentInfo,
  data: MonitoringData[],
  channels: ChannelConfig[]
) {
  console.log('Iniciando geração de PDF...', { 
    experimentId: experiment.id, 
    dataLength: data.length, 
    channelsLength: channels.length 
  })
  
  try {
    // Determine orientation based on number of channels
    const orientation = channels.length > 8 ? 'landscape' : 'portrait'
    
    console.log('Criando documento PDF com orientação:', orientation)
    
    // Create PDF with appropriate orientation
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    })
    
    console.log('Documento PDF criado')
    
    // Set font to helvetica
    doc.setFont("helvetica", "normal")
    
    // Add title
    doc.setFontSize(18)
    doc.text(experiment.name, 14, 20)
    
    // Add experiment info
    doc.setFontSize(11)
    doc.text(`Coletor: ${experiment.collector_id}`, 14, 30)
    doc.text(`ID do Experimento: ${experiment.id}`, 14, 37)
    doc.text(`Data de Início: ${new Date(experiment.start_timestamp_utc).toLocaleString('pt-BR')}`, 14, 44)
    doc.text(`Total de Pontos: ${data.length}`, 14, 51)
    doc.text(`Canais Ativos: ${channels.length}`, 14, 58)
    
    console.log('Cabeçalho adicionado')
    
    // Check if we need alternative format for many channels
    if (channels.length > 15) {
      console.log('Usando formato alternativo (>15 canais)')
      generateAlternativeFormat(doc, data, channels, experiment)
    } else {
      console.log('Usando formato padrão')
      generateStandardFormat(doc, data, channels)
    }
    
    console.log('Tabela gerada, adicionando rodapé...')
    
    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }
    
    console.log('Rodapé adicionado')
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `${experiment.name.replace(/\s+/g, '_')}_${timestamp}.pdf`
    
    console.log('Salvando PDF:', filename)
    
    // Save the PDF
    doc.save(filename)
    
    console.log('PDF salvo com sucesso!')
  } catch (error) {
    console.error('Erro na geração do PDF:', error)
    throw error
  }
}

// Standard table format for up to 15 channels
function generateStandardFormat(
  doc: jsPDF,
  data: MonitoringData[],
  channels: ChannelConfig[]
) {
  // Calculate appropriate font size based on number of channels
  const fontSize = channels.length > 10 ? 6 : channels.length > 5 ? 7 : 8
  
  // Prepare table data - use ASCII fallback for resistance units
  const headers = [
    'Tempo (s)',
    ...channels.map(ch => {
      const unit = ch.type === 'res' ? 'Ohms' : getUnit(ch.type)
      return `${ch.name}\n(${ch.id}) ${unit}`
    })
  ]
  
  const tableData = data.map(point => [
    point.time.toFixed(1),
    ...channels.map(ch => formatValue(point.values[ch.id], ch.type))
  ])
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 65,
    styles: {
      fontSize: fontSize,
      cellPadding: channels.length > 10 ? 1 : 2,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      halign: 'center',
    },
    headStyles: {
      fillColor: [21, 128, 61],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 10,
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 65, left: 10, right: 10 },
    tableWidth: 'auto',
  })
}

// Alternative format for more than 15 channels - data in rows instead of columns
function generateAlternativeFormat(
  doc: jsPDF,
  data: MonitoringData[],
  channels: ChannelConfig[],
  experiment: ExperimentInfo
) {
  let yPosition = 70
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Group data in batches for readability
  const batchSize = 5 // Show 5 time points per page section
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    
    batch.forEach((point, batchIndex) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = 20
      }
      
      // Add time header
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(`Tempo: ${point.time.toFixed(1)} s`, 14, yPosition)
      yPosition += 7
      
      // Create table for this time point
      const pointData = channels.map(ch => {
        const unit = ch.type === 'res' ? 'Ohms' : getUnit(ch.type)
        return [
          ch.id,
          ch.name,
          formatValue(point.values[ch.id], ch.type) + ' ' + unit
        ]
      })
      
      autoTable(doc, {
        head: [['Canal', 'Nome', 'Valor']],
        body: pointData,
        startY: yPosition,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          halign: 'center',
        },
        headStyles: {
          fillColor: [21, 128, 61],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 'auto', halign: 'center' },
          2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
        theme: 'grid',
      })
      
      yPosition = (doc as any).lastAutoTable.finalY + 5
    })
    
    // Add separator between batches
    if (i + batchSize < data.length) {
      yPosition += 5
    }
  }
}
