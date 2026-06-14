import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Loader2, Sparkles, Trash2, UploadCloud } from 'lucide-react';

const CRITIQUE_TARGETS = [
  'Resumes',
  'Business ideas',
  'Startup pitches',
  'Project proposals',
  'Essays',
  'Documentation',
  'Notes & drafts',
];
export default function UploadCard({
  text,
  file,
  isAnalyzing,
  onTextChange,
  onFileChange,
  onAnalyze,
  onSample,
  onReset,
  error,
}) {
  const hasInput = text.trim().length > 0 || Boolean(file);
  const isImage = Boolean(file?.type?.startsWith('image/'));
  const needsImageDescription = isImage && text.trim().length === 0;
  const canAnalyze = hasInput && !needsImageDescription;
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isImage || !file) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [file]);

  return (
    <div className="space-y-4">
      <div className="glass-panel-soft rounded-lg border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Supported critique targets
        </p>
        <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {CRITIQUE_TARGETS.map((target) => (
            <span key={target} className="inline-flex items-center gap-2">
              <Check size={15} className="text-[var(--accent)]" />
              {target}
            </span>
          ))}
        </div>
      </div>
      <label
        htmlFor="file-upload"
        className={`relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed text-center transition hover:border-cyan-400/60 hover:bg-white/10 ${
          previewUrl ? 'border-cyan-400/45 bg-slate-950/28 p-0 backdrop-blur-xl' : 'border-white/18 bg-slate-950/24 px-5 py-8 backdrop-blur-xl'
        }`}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={`Preview of ${file.name}`}
              className="h-full max-h-[340px] min-h-52 w-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-slate-950/55 px-4 py-3 text-left backdrop-blur-xl">
              <p className="truncate text-sm font-semibold text-slate-100">{file.name}</p>
              <p className="mt-1 text-xs text-slate-400">{formatBytes(file.size)} - {file.type || 'image'}</p>
            </div>
          </>
        ) : (
          <>
            <UploadCloud className="mb-3 text-cyan-300" size={36} />
            <span className="block max-w-64 text-wrap break-words text-base font-semibold leading-6 text-slate-100 sm:max-w-full">
              {file ? file.name : 'Drop in a text file or reference file'}
            </span>
            <span className="mt-2 block max-w-64 text-wrap break-words text-sm leading-6 text-slate-400 sm:max-w-md">Paste the content below for the most reliable critique.</span>
            {file && <span className="mt-3 rounded-md bg-white/10 px-3 py-1 text-xs text-slate-300">{formatBytes(file.size)}</span>}
          </>
        )}
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.md"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
      </label>

      {isImage && (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <ImageIcon size={17} />
            Image uploaded
          </div>
          <dl className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Filename</dt>
              <dd className="mt-1 truncate text-slate-200">{file.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Size</dt>
              <dd className="mt-1 text-slate-200">{formatBytes(file.size)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="mt-1 text-slate-200">{file.type || 'Image'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Image critique requires a vision-capable model. Please describe the image in the text box for now.
          </p>
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        className="min-h-32 w-full resize-y rounded-lg border border-white/15 bg-slate-950/30 px-4 py-3 text-sm leading-6 text-slate-100 outline-none backdrop-blur-xl transition placeholder:text-slate-500 focus:border-cyan-400"
        placeholder={isImage ? 'Describe the image, then ask what kind of critique you want...' : 'Paste ideas, notes, drafts, or extracted document text here for critique...'}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
          className="accent-button inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
          {isAnalyzing ? 'Reasoning' : 'Analyze'}
        </button>
        <button
          type="button"
          onClick={onSample}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/10"
        >
          <FileText size={17} />
          Load sample
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasInput || isAnalyzing}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={17} />
          Clear input
        </button>
      </div>

      {needsImageDescription && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
          Image critique requires a vision-capable model. Please describe the image in the text box for now.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
