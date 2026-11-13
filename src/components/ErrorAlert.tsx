import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorAlert({ title, message, onRetry }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-500/40 bg-rose-950/35 p-5 backdrop-blur-md text-slate-100"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-400"
            aria-hidden="true"
          />
          <div>
            <h3 className="font-mono text-sm font-semibold text-rose-200">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-rose-100/85">
              {message}
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-rose-400/40 bg-rose-950/60 px-3.5 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-900/60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try Another Photo
          </button>
        )}
      </div>
    </div>
  );
}
