import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  FileSearch,
  FileText,
  Gauge,
  GitBranch,
  ListChecks,
  PanelRightOpen,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard.jsx';
import ResourcesCard from '../components/ResourcesCard.jsx';
import ResultsCard from '../components/ResultsCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import SuggestionsCard from '../components/SuggestionsCard.jsx';
import UploadCard from '../components/UploadCard.jsx';
import { recentAnalyses, samplePrompt } from '../data/sampleData.js';
import { analyzeWithPhi4 } from '../services/foundryApi.js';

const STORAGE_KEY = 'insightforge:dashboard-state';
const THEME_OPTIONS = [
  { id: 'cyan', name: 'Cyan', accent: '#67e8f9', soft: 'rgba(103, 232, 249, 0.12)', border: 'rgba(103, 232, 249, 0.32)' },
  { id: 'violet', name: 'Violet', accent: '#a78bfa', soft: 'rgba(167, 139, 250, 0.13)', border: 'rgba(167, 139, 250, 0.34)' },
  { id: 'emerald', name: 'Emerald', accent: '#6ee7b7', soft: 'rgba(110, 231, 183, 0.12)', border: 'rgba(110, 231, 183, 0.32)' },
  { id: 'amber', name: 'Amber', accent: '#fcd34d', soft: 'rgba(252, 211, 77, 0.13)', border: 'rgba(252, 211, 77, 0.34)' },
];
const REASONING_STEPS = [
  {
    title: 'Content Extraction',
    description: 'Collects pasted text, text-file content, and file metadata before critique.',
    icon: FileText,
  },
  {
    title: 'Structure Analysis',
    description: 'Checks organization, flow, and whether the message is easy to follow.',
    icon: ListChecks,
  },
  {
    title: 'Quality Assessment',
    description: 'Scores clarity, structure, originality, and actionability against the rubric.',
    icon: Gauge,
  },
  {
    title: 'Gap Detection',
    description: 'Identifies missing evidence, weak areas, and unclear next steps.',
    icon: Search,
  },
  {
    title: 'Resource Recommendation',
    description: 'Turns improvement gaps into learning-resource queries and source links.',
    icon: BookOpen,
  },
];

export default function Dashboard() {
  const [storedState] = useState(() => readStoredState());
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState(() =>
    Array.isArray(storedState.history) && storedState.history.length > 0
      ? storedState.history.filter((item) => item.analysis)
      : recentAnalyses
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [analysisError, setAnalysisError] = useState('');
  const [themeId, setThemeId] = useState(() => storedState.themeId || 'cyan');

  const completion = useMemo(() => {
    if (!analysis) return 0;
    return Math.round(
      Object.values(analysis.dimensions).reduce((total, value) => total + value, 0) /
        Object.values(analysis.dimensions).length
    );
  }, [analysis]);
  const theme = THEME_OPTIONS.find((option) => option.id === themeId) || THEME_OPTIONS[0];
  const themeVars = {
    '--accent': theme.accent,
    '--accent-soft': theme.soft,
    '--accent-border': theme.border,
  };

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        history,
        themeId,
      })
    );
  }, [history, themeId]);

  async function handleAnalyze() {
    if (isAnalyzing || (!text.trim() && !file)) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const result = await analyzeWithPhi4({ text, file });
      setAnalysis(result);
      setHistory((items) => [
        createHistoryEntry(result, file),
        ...items,
      ].slice(0, 5));
      setSelectedSuggestions([]);
    } catch (error) {
      setAnalysisError(error.message || 'Analysis failed. Check the server and Azure Foundry environment variables.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleClearInput() {
    setText('');
    setFile(null);
    setAnalysisError('');
  }

  function handleExport() {
    const payload = analysis || { note: 'No analysis has been generated yet.' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `insightforge-analysis-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleSuggestion(item) {
    setSelectedSuggestions((items) =>
      items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item]
    );
  }

  function handleNavigate(action) {
    if (action === 'settings') {
      setIsSettingsOpen(true);
      return;
    }
    setIsSettingsOpen(false);
    document.getElementById('dashboard-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function restoreAnalysis(item) {
    if (!item.analysis) return;
    setAnalysis(item.analysis);
    setSelectedSuggestions([]);
    setIsExpanded(false);
    setAnalysisError('');
    document.getElementById('analysis-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-100 md:flex" style={themeVars}>
      <Sidebar currentAnalysis={analysis} activeView={isSettingsOpen ? 'settings' : 'dashboard'} onNavigate={handleNavigate} />

      <main className="min-w-0 flex-1">
        <div id="dashboard-top" className="border-b border-white/10 bg-slate-950/28 px-5 py-5 backdrop-blur-2xl md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
              <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-slate-400">
                InsightForge is a reasoning agent that evaluates written content, identifies weaknesses, generates improvement plans, and recommends learning resources.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="glass-panel-soft flex items-center gap-3 rounded-lg border px-4 py-3">
                <Sparkles size={18} className="text-violet-300" />
                <div>
                  <p className="text-xs text-slate-500">Agent status</p>
                  <p className="accent-text text-sm font-semibold">Reasoning ready</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <Download size={17} />
                Export
              </button>
            </div>
          </div>
        </div>

        <AgentBrief analysis={analysis} isAnalyzing={isAnalyzing} />

        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="min-w-0 space-y-5">
            <DashboardCard title="Upload" icon={<UploadCloud size={18} />}>
              <UploadCard
                text={text}
                file={file}
                isAnalyzing={isAnalyzing}
                onTextChange={setText}
                onFileChange={setFile}
                onAnalyze={handleAnalyze}
                onSample={() => setText(samplePrompt)}
                onReset={handleClearInput}
                error={analysisError}
              />
            </DashboardCard>

            <DashboardCard
              id="analysis-summary"
              className="scroll-mt-6"
              title="Analysis Summary"
              icon={<FileSearch size={18} />}
              action={
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  disabled={!analysis}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <PanelRightOpen size={15} />
                  Expand
                </button>
              }
            >
              <ResultsCard analysis={analysis} onExpand={() => setIsExpanded(true)} />
            </DashboardCard>

            {analysis && (
              <DashboardCard title="Reasoning Steps" icon={<GitBranch size={18} />}>
                <ReasoningSteps steps={REASONING_STEPS} />
              </DashboardCard>
            )}

            <DashboardCard title="Recent Analyses" icon={<FileSearch size={18} />}>
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="border-b border-white/10 px-3 py-3">File</th>
                        <th className="border-b border-white/10 px-3 py-3">Type</th>
                        <th className="border-b border-white/10 px-3 py-3">Date</th>
                        <th className="border-b border-white/10 px-3 py-3">Rubric Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => restoreAnalysis(item)}
                          className="cursor-pointer text-slate-300 transition hover:bg-white/10"
                        >
                          <td className="border-b border-white/10 px-3 py-3 font-medium text-slate-100">
                            {item.name}
                            <span className="ml-2 text-xs font-normal text-slate-500">Restore</span>
                          </td>
                          <td className="border-b border-white/10 px-3 py-3">{item.type}</td>
                          <td className="border-b border-white/10 px-3 py-3">{item.date}</td>
                          <td className="border-b border-white/10 px-3 py-3">
                            <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-emerald-300">{item.score}/100</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="glass-panel-soft rounded-lg border p-5 text-sm leading-6 text-slate-400">
                  No saved analyses yet. Run an analysis and it will appear here so you can restore the result later.
                </div>
              )}
            </DashboardCard>
          </div>

          <div className="min-w-0 space-y-5">
            <DashboardCard title="Suggested Actions" icon={<Sparkles size={18} />}>
              <SuggestionsCard
                suggestions={analysis?.suggestions}
                selectedSuggestions={selectedSuggestions}
                onToggle={toggleSuggestion}
              />
            </DashboardCard>

            <DashboardCard title="Learning Resources" icon={<FileSearch size={18} />}>
              <ResourcesCard resources={analysis?.resources} />
            </DashboardCard>

          </div>
        </div>
      </main>

      {isExpanded && analysis && (
        <ExpandedAnalysis
          analysis={analysis}
          completion={completion}
          onClose={() => setIsExpanded(false)}
          onExport={handleExport}
        />
      )}

      {isSettingsOpen && (
        <SettingsPanel
          themeId={themeId}
          themes={THEME_OPTIONS}
          onThemeChange={setThemeId}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function readStoredState() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

function createHistoryEntry(result, file) {
  return {
    id: result.id,
    name: result.title,
    type: file ? file.name.split('.').pop()?.toUpperCase() || 'File' : 'Text',
    date: result.generatedAt,
    score: result.score,
    analysis: result,
  };
}

function AgentBrief({ analysis, isAnalyzing }) {
  const resourceCount = analysis?.resources?.length || 0;
  const items = [
    { label: 'Reasoning workflow', value: '5 stages' },
    { label: 'Assessment rubric', value: isAnalyzing ? 'Running' : analysis ? `${analysis.score}/100 avg` : 'Ready' },
    { label: 'Resource layer', value: analysis ? `${resourceCount} links` : 'After critique' },
  ];

  return (
    <section className="border-b border-white/10 bg-slate-950/20 px-5 py-3 backdrop-blur-2xl md:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="glass-panel-soft flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
          >
            <span className="text-slate-500">{item.label}</span>
            <span className="font-semibold text-slate-200">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({ themeId, themes, onThemeChange, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md">
      <aside className="glass-panel ml-auto flex h-full w-full max-w-md flex-col border-l shadow-panel">
        <header className="glass-panel-header flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <p className="mt-1 text-sm text-slate-400">Personalize the dashboard accent color.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-100">Theme color</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onThemeChange(theme.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                    themeId === theme.id
                      ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-white'
                      : 'glass-panel-soft text-slate-300 hover:border-slate-500 hover:bg-white/10'
                  }`}
                >
                  <span className="h-7 w-7 rounded-md" style={{ backgroundColor: theme.accent }} />
                  <span className="text-sm font-semibold">{theme.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="glass-panel-soft rounded-lg border p-4">
            <p className="text-sm font-semibold text-slate-100">Result memory</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Recent analyses are saved in this browser so you can restore past results without keeping the current upload active after refresh.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function ReasoningSteps({ steps }) {
  return (
    <div className="relative">
      <div className="absolute bottom-4 left-[18px] top-4 hidden w-px bg-white/15 sm:block" />
      {steps.map((step, index) => (
        <div key={step.title} className="relative flex gap-4 border-b border-white/10 py-3 last:border-b-0">
          <span className="z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--accent-border)] bg-slate-950/35 text-[var(--accent)] backdrop-blur-xl">
            <step.icon size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpandedAnalysis({ analysis, completion, onClose, onExport }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md">
      <div className="glass-panel ml-auto flex h-full w-full max-w-2xl flex-col border-l shadow-panel">
        <header className="glass-panel-header flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-white">Expanded Analysis</h2>
            <p className="mt-1 text-sm text-slate-400">{analysis.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            aria-label="Close expanded analysis"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="grid aspect-square place-items-center rounded-lg border border-emerald-400/25 bg-emerald-400/10">
              <div className="text-center">
                <p className="text-5xl font-bold text-emerald-300">{analysis.score}</p>
                <p className="mt-1 text-sm text-slate-400">Rubric average</p>
              </div>
            </div>
            <div className="glass-panel-soft rounded-lg border p-5">
              <p className="text-sm uppercase tracking-wide text-slate-500">Overview</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{analysis.expanded}</p>
            </div>
          </section>

          <section className="glass-panel-soft rounded-lg border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Quality dimensions</h3>
              <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-sm font-semibold text-cyan-300">{completion}% avg</span>
            </div>
            <div className="space-y-4">
              {Object.entries(analysis.dimensions).map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="capitalize text-slate-300">{label}</span>
                    <span className="text-slate-400">{value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <DetailSection title="Detailed strengths" items={analysis.strengths} tone="emerald" />
          <DetailSection title="Areas to improve" items={analysis.improvements} tone="amber" />
          <DetailSection title="Recommended next actions" items={analysis.suggestions} tone="violet" ordered />
        </div>

        <footer className="flex gap-3 border-t border-white/10 px-6 py-5">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            <Download size={17} />
            Export Report
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function DetailSection({ title, items, tone, ordered = false }) {
  const color = {
    emerald: 'text-emerald-300 bg-emerald-400/10',
    amber: 'text-amber-300 bg-amber-400/10',
    violet: 'text-violet-300 bg-violet-400/10',
  }[tone];

  return (
    <section className="glass-panel-soft rounded-lg border p-5">
      <h3 className="mb-4 font-semibold text-white">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${color}`}>
              {ordered ? index + 1 : ''}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
