export default function DashboardCard({ title, icon, action, children, className = '', ...props }) {
  return (
    <section {...props} className={`glass-panel min-w-0 overflow-hidden rounded-lg border ring-1 ring-white/[0.035] ${className}`}>
      <div className="glass-panel-header flex min-h-14 items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
            {icon}
          </span>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
