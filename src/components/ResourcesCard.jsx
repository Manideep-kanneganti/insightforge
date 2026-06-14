import { ArrowUpRight, BookOpen } from 'lucide-react';

export default function ResourcesCard({ resources = [] }) {
  const items = resources.length
    ? resources
    : [{ title: 'Run an analysis to receive targeted resources.', description: 'Links appear after the critique is generated.', url: '#', category: 'Pending' }];

  return (
    <div className="space-y-3">
      {resources.length > 0 && (
        <section className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4 backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-100">Foundry IQ Resource Layer</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Detected gaps are converted into resource queries and retrieval-ready source links through the Foundry workflow, grounding recommendations in external learning material.
          </p>
        </section>
      )}

      {items.map((resource) => {
        const disabled = resource.url === '#';
        return (
        <a
          key={resource.title}
          href={resource.url}
          target={disabled ? undefined : '_blank'}
          rel={disabled ? undefined : 'noopener noreferrer'}
          onClick={(event) => {
            if (disabled) {
              event.preventDefault();
              return;
            }
            window.localStorage.setItem('insightforge:lastResourceClick', String(Date.now()));
          }}
          className="glass-panel-soft group flex items-start justify-between gap-4 rounded-lg border p-4 transition hover:border-cyan-400/35 hover:bg-white/10"
        >
          <div className="flex gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
              <BookOpen size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-100">{resource.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{resource.description}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-[var(--accent)]">{resource.category}</p>
            </div>
          </div>
          <ArrowUpRight className="mt-1 shrink-0 text-slate-500 transition group-hover:text-cyan-300" size={17} />
        </a>
      );
      })}
    </div>
  );
}
