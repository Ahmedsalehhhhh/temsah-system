export function Card({ children, className = '' }) {
  return (
    <div className={`bg-base-900 border border-base-700 rounded-lg ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, tone = 'default', sub }) {
  const toneClass = {
    default: 'text-ink-100',
    good: 'text-good',
    bad: 'text-bad',
    gold: 'text-gold-400',
  }[tone]
  return (
    <Card className="p-5">
      <div className="text-xs text-ink-500 mb-2">{label}</div>
      <div className={`font-display text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-1">{sub}</div>}
    </Card>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-gold-500 text-base-950 hover:bg-gold-400',
    ghost: 'bg-transparent text-ink-300 hover:bg-base-800 hover:text-ink-100',
    outline: 'border border-base-600 text-ink-300 hover:bg-base-800 hover:text-ink-100',
    danger: 'bg-transparent text-bad hover:bg-bad/10',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-ink-500">{label}</span>}
      {children}
      {hint && <span className="text-[11px] text-ink-700">{hint}</span>}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`bg-base-850 border border-base-700 rounded-md px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus-ring ${props.className || ''}`}
    />
  )
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`bg-base-850 border border-base-700 rounded-md px-3 py-2 text-sm text-ink-100 focus-ring ${props.className || ''}`}
    >
      {children}
    </select>
  )
}

export function TableCellInput(props) {
  return (
    <input
      {...props}
      className={`w-full bg-transparent border border-transparent rounded px-2 py-1 text-sm text-ink-100 hover:border-base-700 focus:border-gold-500/60 focus-ring ${props.className || ''}`}
    />
  )
}

export function Badge({ children, tone = 'default' }) {
  const toneClass = {
    default: 'bg-base-800 text-ink-300',
    good: 'bg-good/10 text-good',
    bad: 'bg-bad/10 text-bad',
    gold: 'bg-gold-500/10 text-gold-400',
  }[tone]
  return <span className={`text-xs px-2 py-0.5 rounded-full ${toneClass}`}>{children}</span>
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-100">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
