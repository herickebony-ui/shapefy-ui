import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDateBr, normalizeDate, dataPagamentoEfetivaParcela } from './utils'

// Paleta padronizada com o gerador do sistema (Avaliacao), com brand Shapefy azul
const BRAND = [37, 99, 235] // #2563eb
const BG = [255, 255, 255]
const SURFACE = [248, 248, 250]
const BORDER = [226, 226, 232]
const TEXT = [20, 20, 26]
const MUTED = [110, 110, 120]
const GREEN = [22, 163, 74]
const RED = [185, 28, 28]

/**
 * Gera PDF de relatório financeiro do período.
 * @param {Object} args
 * @param {Object} args.range - { start, end } ISO
 * @param {Array} args.contratos
 * @param {Array} args.parcelas - parcelas achatadas com { contrato, aluno, ...resto }
 * @param {Object} args.alunosMap
 * @param {Object} args.kpis - { ativos, faturamentoReal, previsao, valorVigentes, valorVencendo }
 * @param {String} args.profissionalNome
 */
export function gerarRelatorioFinanceiro({
  range, contratos = [], parcelas = [], alunosMap = {}, kpis = {}, profissionalNome = '',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  const addPageBg = () => {
    doc.setFillColor(...BG)
    doc.rect(0, 0, W, H, 'F')
    doc.setFillColor(...BRAND)
    doc.rect(0, 0, W, 12, 'F')
    doc.setFillColor(245, 245, 248)
    doc.rect(0, 12, 6, H - 12, 'F')
  }

  const addHeader = (title) => {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SHAPEFY  •  RELATÓRIO FINANCEIRO', 10, 8)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(title, W - 10, 8, { align: 'right' })
  }

  const addFooter = (pg, total) => {
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(10, H - 8, W - 10, H - 8)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(
      `${profissionalNome || 'Profissional'}  •  Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      10, H - 4
    )
    doc.text(`${pg} / ${total}`, W - 10, H - 4, { align: 'right' })
  }

  // PÁGINA 1 — Capa + KPIs + extrato
  addPageBg()
  addHeader(`${formatDateBr(range.start)} → ${formatDateBr(range.end)}`)

  doc.setTextColor(...TEXT)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Financeiro', 10, 24)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(
    `Período: ${formatDateBr(range.start)} até ${formatDateBr(range.end)}  •  ${contratos.length} contrato(s)  •  ${parcelas.length} parcela(s)`,
    10, 30
  )
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.5)
  doc.line(10, 33, W - 10, 33)

  const cards = [
    { label: 'FATURAMENTO LÍQ.', value: formatCurrency(kpis.faturamentoReal || 0), color: GREEN },
    { label: 'PREVISÃO (FORECAST)', value: formatCurrency(kpis.previsao || 0), color: TEXT },
    { label: 'ALUNOS ATIVOS', value: String(kpis.ativos || 0), color: TEXT },
    { label: 'CONTRATOS', value: String(contratos.length), color: TEXT },
  ]

  let cx = 10
  const cardW = (W - 20 - 9) / 4
  cards.forEach((card) => {
    doc.setFillColor(...SURFACE)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(cx, 36, cardW, 22, 2, 2, 'FD')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MUTED)
    doc.text(card.label, cx + 4, 43)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...card.color)
    doc.text(card.value, cx + 4, 53)
    doc.setFont('helvetica', 'normal')
    cx += cardW + 3
  })

  // Extrato de pagamentos — usa data efetiva (cobre pago e não iniciado)
  const pagas = parcelas
    .map((p) => ({ ...p, _dp_efetiva: dataPagamentoEfetivaParcela(p) }))
    .filter((p) => p._dp_efetiva && p._dp_efetiva >= range.start && p._dp_efetiva <= range.end)

  doc.setTextColor(...TEXT)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Extrato de pagamentos no período', 10, 66)

  autoTable(doc, {
    startY: 70,
    head: [['Data pag.', 'Aluno', 'Plano', 'Contrato', 'Parcela', 'Valor']],
    body: pagas.length
      ? pagas.map((p) => [
          formatDateBr(p._dp_efetiva),
          alunosMap[p.aluno]?.nome_completo || p.aluno || '—',
          p.nome_plano_snapshot || p.plano || '—',
          p.contrato || '—',
          `${p.numero_parcela}/${p.qtd_parcelas || ''}`,
          formatCurrency(p.valor_parcela),
        ])
      : [['—', 'Nenhum pagamento no período', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: SURFACE },
    columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 10, right: 10 },
  })

  // PÁGINA 2 — Vencimentos no período (forecast detalhado)
  doc.addPage()
  addPageBg()
  addHeader('Vencimentos no período')

  doc.setTextColor(...TEXT)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('VENCIMENTOS NO PERÍODO', 10, 22)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Parcelas com data_vencimento dentro do range escolhido.', 10, 28)
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.4)
  doc.line(10, 31, W - 10, 31)

  const vencendo = parcelas.filter((p) => {
    const dv = normalizeDate(p.data_vencimento)
    return dv && dv >= range.start && dv <= range.end
  })

  autoTable(doc, {
    startY: 35,
    head: [['Vencimento', 'Aluno', 'Plano', 'Contrato', 'Parcela', 'Status', 'Valor']],
    body: vencendo.length
      ? vencendo.map((p) => [
          formatDateBr(p.data_vencimento),
          alunosMap[p.aluno]?.nome_completo || p.aluno || '—',
          p.nome_plano_snapshot || p.plano || '—',
          p.contrato || '—',
          `${p.numero_parcela}/${p.qtd_parcelas || ''}`,
          dataPagamentoEfetivaParcela(p) ? 'Paga' : 'Pendente',
          formatCurrency(p.valor_parcela),
        ])
      : [['—', 'Nenhuma parcela vencendo', '—', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: SURFACE },
    columnStyles: {
      5: {
        cellWidth: 22,
        fontStyle: 'bold',
      },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const v = data.cell.text?.[0]
        if (v === 'Paga') data.cell.styles.textColor = GREEN
        if (v === 'Pendente') data.cell.styles.textColor = RED
      }
    },
    margin: { left: 10, right: 10 },
  })

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addFooter(i, pageCount)
  }

  doc.save(`shapefy_financeiro_${range.start}_a_${range.end}.pdf`)
}
