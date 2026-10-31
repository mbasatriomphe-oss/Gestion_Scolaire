const moneyFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

export function formatMoney(n: number, currency = 'USD') {
  const code = currency.trim()
  if (code.toUpperCase() === 'FCFA') return `${moneyFormatter.format(n)} FCFA`

  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(n)
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return `${moneyFormatter.format(n)} ${code}`.trim()
  }
}

export function formatCompactMoney(n: number, currency = 'USD') {
  const amount = Math.abs(n) >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
    : Math.abs(n) >= 1_000
      ? `${Math.round(n / 1_000)} k`
      : String(n)
  return `${amount} ${currency}`
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', opts).format(d)
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function todayISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function downloadCSV(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(';'), ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(';'))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
