import { Check, ClipboardList } from 'lucide-react';

export default function SuggestionsCard({ suggestions = [], selectedSuggestions, onToggle }) {
  const items = suggestions.length ? suggestions : ['Run an analysis to generate recommended actions.'];

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const disabled = !suggestions.length;
        const selected = selectedSuggestions.includes(item);
        return (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(item)}
            className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm leading-6 transition ${
              selected
                ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-slate-100'
                : 'glass-panel-soft text-slate-300 hover:border-slate-500 hover:bg-white/10'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-slate-300">
              {selected ? <Check size={15} /> : index + 1}
            </span>
            <span>{item}</span>
          </button>
        );
      })}

      <div className="glass-panel-soft flex items-center gap-2 rounded-lg border p-3 text-xs text-slate-500">
        <ClipboardList size={15} />
        Selected actions stay highlighted so you can track what to revise first.
      </div>
    </div>
  );
}
