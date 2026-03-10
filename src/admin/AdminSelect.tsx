type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string
}

export default function AdminSelect({ className = '', children, ...props }: Props) {
  return (
    <div className="relative inline-block">
      <select
        {...props}
        className={`appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${className}`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}
