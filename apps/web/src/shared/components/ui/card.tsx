interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}>{children}</div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-gray-500">{children}</h3>
}

export function CardValue({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-2xl font-semibold text-gray-900">{children}</p>
}
