import { LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, action: 'dashboard' },
  { label: 'Settings', icon: Settings, action: 'settings' },
];

export default function Sidebar({ currentAnalysis, activeView, onNavigate }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-slate-950/34 px-4 py-4 backdrop-blur-2xl md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-5 flex items-center gap-3 px-1">
        <div className="accent-bg grid h-10 w-10 place-items-center rounded-lg text-slate-950">
          <ShieldCheck size={22} strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-lg font-bold text-white">InsightForge</p>
          <p className="text-xs text-slate-400">Reasoning critique agent</p>
        </div>
      </div>

      <nav className="grid grid-cols-2 gap-2 md:block md:space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.action)}
              className={`flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${
                activeView === item.action
                  ? 'accent-nav-active'
                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="glass-panel-soft mt-5 rounded-lg border p-4 md:mt-auto">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <p className="text-sm font-semibold text-slate-100">Agent online</p>
        </div>
        <dl className="space-y-3 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Model</dt>
            <dd className="text-slate-200">Phi-4 Foundry</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Rubric avg</dt>
            <dd className="text-emerald-300">{currentAnalysis ? `${currentAnalysis.score}/100` : 'Ready'}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
