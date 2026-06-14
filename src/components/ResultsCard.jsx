import { BarChart3, CheckCircle2, Maximize2, ShieldAlert } from 'lucide-react';

const RUBRIC = [
  { key: 'clarity', label: 'Clarity', tone: 'text-cyan-300', bar: 'bg-cyan-300' },
  { key: 'structure', label: 'Structure', tone: 'text-violet-300', bar: 'bg-violet-300' },
  { key: 'originality', label: 'Originality', tone: 'text-amber-300', bar: 'bg-amber-300' },
  { key: 'actionability', label: 'Actionability', tone: 'text-emerald-300', bar: 'bg-emerald-300' },
];

export default function ResultsCard({ analysis, onExpand }) {
  if (!analysis) {
    return (
      <div className="glass-panel-soft rounded-lg border p-5 text-sm leading-6 text-slate-400">
        Paste text or upload a lightweight text file, then run analysis to see strengths, areas to improve, suggested actions, and resources.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {RUBRIC.map((item) => (
          <RubricMetric
            key={item.key}
            label={item.label}
            value={analysis.dimensions?.[item.key] ?? 0}
            tone={item.tone}
            bar={item.bar}
          />
        ))}
      </div>

      <div className="glass-panel-soft flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-200">
          <BarChart3 size={15} className="text-cyan-300" />
          Rubric average {analysis.score}/100
        </span>
        <span>Confidence {analysis.confidence}%</span>
        <span>Generated {analysis.generatedAt}</span>
      </div>

      <p className="text-sm leading-6 text-slate-300">{analysis.summary}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniList icon={<CheckCircle2 size={17} />} title="Strengths" items={analysis.strengths.slice(0, 3)} color="emerald" />
        <MiniList icon={<ShieldAlert size={17} />} title="Areas to Improve" items={analysis.improvements.slice(0, 3)} color="amber" />
      </div>

      <button
        type="button"
        onClick={onExpand}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/35 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
      >
        <Maximize2 size={17} />
        Expand Analysis
      </button>
    </div>
  );
}

function RubricMetric({ label, value, tone, bar }) {
  return (
    <div className="glass-panel-soft rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`text-lg font-bold ${tone}`}>{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MiniList({ icon, title, items, color }) {
  const tone = color === 'emerald' ? 'text-emerald-300' : 'text-amber-300';
  return (
    <div className="glass-panel-soft rounded-lg border p-4">
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${tone}`}>
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-400">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
