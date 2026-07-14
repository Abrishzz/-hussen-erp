import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'
import type { Sale, RawMaterial, Expense, Payroll } from '@/types'

export function exportSalesReportPDF(sales: Sale[], from: string, to: string, lang: string) {
  const doc = new jsPDF()
  const title = lang === 'am' ? 'የሽያጭ ሪፖርት' : 'Sales Report'

  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  doc.text(`${from} - ${to}`, 14, 28)

  const rows = sales.map((s) => [
    formatDate(s.timestamp),
    s.items.length.toString(),
    formatCurrency(s.total),
    s.paymentMethod,
    s.status,
  ])

  doc.autoTable({
    startY: 35,
    head: [[lang === 'am' ? 'ቀን' : 'Date', lang === 'am' ? 'እቃዎች' : 'Items', lang === 'am' ? 'ጠቅላላ' : 'Total', lang === 'am' ? 'ክፍያ' : 'Payment', lang === 'am' ? 'ሁኔታ' : 'Status']],
    body: rows,
  })

  const total = sales.reduce((s, x) => s + x.total, 0)
  doc.text(`${lang === 'am' ? 'ጠቅላላ ሽያጭ' : 'Total Sales'}: ${formatCurrency(total)}`, 14, doc.lastAutoTable.finalY + 10)
  doc.save('sales-report.pdf')
}

export function exportInventoryReportPDF(materials: RawMaterial[], lang: string) {
  const doc = new jsPDF()
  const title = lang === 'am' ? 'የክምችት ሪፖርት' : 'Inventory Report'

  doc.setFontSize(18)
  doc.text(title, 14, 20)

  const rows = materials.map((m) => [
    m.name_en,
    m.currentQty.toString(),
    m.unit,
    formatCurrency(m.avgCost),
    formatCurrency(m.currentQty * m.avgCost),
    m.currentQty <= m.reorderLevel ? (lang === 'am' ? 'ዝቅተኛ' : 'Low') : (lang === 'am' ? 'በቂ' : 'OK'),
  ])

  doc.autoTable({
    startY: 30,
    head: [[lang === 'am' ? 'ዕቃ' : 'Material', lang === 'am' ? 'ክምችት' : 'Stock', lang === 'am' ? 'ክፍል' : 'Unit', lang === 'am' ? 'ዋጋ' : 'Cost', lang === 'am' ? 'ዋጋ ድምር' : 'Value', lang === 'am' ? 'ሁኔታ' : 'Status']],
    body: rows,
  })

  doc.save('inventory-report.pdf')
}

export function exportExpenseReportPDF(expenses: Expense[], from: string, to: string, lang: string) {
  const doc = new jsPDF()
  const title = lang === 'am' ? 'የወጪ ሪፖርት' : 'Expense Report'

  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  doc.text(`${from} - ${to}`, 14, 28)

  const rows = expenses.map((e) => [
    formatDate(e.date),
    e.category,
    e.description.substring(0, 30),
    formatCurrency(e.amount),
  ])

  doc.autoTable({
    startY: 35,
    head: [[lang === 'am' ? 'ቀን' : 'Date', lang === 'am' ? 'ምድብ' : 'Category', lang === 'am' ? 'መግለጫ' : 'Description', lang === 'am' ? 'መጠን' : 'Amount']],
    body: rows,
  })

  const total = expenses.reduce((s, x) => s + x.amount, 0)
  doc.text(`${lang === 'am' ? 'ጠቅላላ ወጪ' : 'Total Expenses'}: ${formatCurrency(total)}`, 14, doc.lastAutoTable.finalY + 10)
  doc.save('expense-report.pdf')
}

export function exportProfitLossPDF(
  revenue: number,
  cogs: number,
  expenses: number,
  from: string,
  to: string,
  lang: string
) {
  const doc = new jsPDF()
  const title = lang === 'am' ? 'የትርፍ እና ኪሳራ መግለጫ' : 'Profit & Loss Statement'

  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  doc.text(`${from} - ${to}`, 14, 28)

  const gross = revenue - cogs
  const net = gross - expenses

  const rows = [
    [lang === 'am' ? 'ገቢ' : 'Revenue', formatCurrency(revenue)],
    [lang === 'am' ? 'የሸጡ ዕቃዎች ዋጋ' : 'Cost of Goods Sold', formatCurrency(cogs)],
    [lang === 'am' ? 'ጠቅላላ ትርፍ' : 'Gross Profit', formatCurrency(gross)],
    [lang === 'am' ? 'ወጪዎች' : 'Expenses', formatCurrency(expenses)],
    [lang === 'am' ? 'የተጣራ ትርፍ' : 'Net Profit', formatCurrency(net)],
  ]

  doc.autoTable({
    startY: 35,
    head: [[lang === 'am' ? 'ዝርዝር' : 'Item', lang === 'am' ? 'መጠን' : 'Amount']],
    body: rows,
  })

  doc.save('profit-loss.pdf')
}

export function exportPayrollPDF(payrolls: Payroll[], lang: string) {
  const doc = new jsPDF()
  const title = lang === 'am' ? 'የደመወዝ ማጠቃለያ' : 'Payroll Summary'

  doc.setFontSize(18)
  doc.text(title, 14, 20)

  const rows = payrolls.map((p) => [
    p.empId.slice(0, 8),
    p.month,
    p.daysWorked.toString(),
    formatCurrency(p.baseSalary),
    formatCurrency(p.deductions),
    formatCurrency(p.netPay),
  ])

  doc.autoTable({
    startY: 30,
    head: [[lang === 'am' ? 'ሠራተኛ' : 'Employee', lang === 'am' ? 'ወር' : 'Month', lang === 'am' ? 'ቀናት' : 'Days', lang === 'am' ? 'ደሞዝ' : 'Salary', lang === 'am' ? 'ቅነሳ' : 'Deductions', lang === 'am' ? 'የተጣራ' : 'Net Pay']],
    body: rows,
  })

  const total = payrolls.reduce((s, x) => s + x.netPay, 0)
  doc.text(`${lang === 'am' ? 'ጠቅላላ' : 'Total'}: ${formatCurrency(total)}`, 14, doc.lastAutoTable.finalY + 10)
  doc.save('payroll-summary.pdf')
}
