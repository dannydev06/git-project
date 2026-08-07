import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Code2,
  Copy,
  FileCode2,
  GitCommitHorizontal,
  GitBranch,
  HeartPulse,
  History,
  Loader2,
  Menu,
  Play,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Terminal,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  getGetPulseConfigQueryKey,
  getHealthCheckQueryKey,
  getListPulseActivityQueryKey,
  useGetPulseConfig,
  useHealthCheck,
  useListPulseActivity,
  useRunPulse,
} from '@workspace/api-client-react';
import { useMemo, useState } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const formatDate = (value: string | null | undefined, compact = false) => {
  if (!value) return 'No run recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: compact ? 'short' : 'long',
    day: 'numeric',
    year: compact ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const relativeDate = (value: string | null | undefined) => {
  if (!value) return 'Awaiting first run';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const statusIsSuccess = (status: string | null | undefined) =>
  ['success', 'successful', 'ok', 'passed', 'complete', 'completed'].includes(
    status?.toLowerCase() ?? '',
  );

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

function StatusPill({ status }: { status: string | null | undefined }) {
  const success = statusIsSuccess(status);
  const pending = ['pending', 'running', 'in_progress'].includes(status?.toLowerCase() ?? '');
  return (
    <span
      data-testid="status-pill"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.13em] ${
        success
          ? 'bg-emerald-100 text-emerald-800'
          : pending
            ? 'bg-amber-100 text-amber-800'
            : 'bg-rose-100 text-rose-800'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${success ? 'bg-emerald-500' : pending ? 'bg-amber-500' : 'bg-rose-500'}`} />
      {status || 'unknown'}
    </span>
  );
}

function Sidebar({
  active,
  onNavigate,
  onRun,
  running,
}: {
  active: string;
  onNavigate: (section: string) => void;
  onRun: () => void;
  running: boolean;
}) {
  const items = [
    { label: 'Overview', icon: Activity },
    { label: 'Activity log', icon: History },
    { label: 'Workflow', icon: GitBranch },
  ];
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-700 bg-[#202b3b] text-[#f4f0e7] md:min-h-[100dvh] md:w-[248px] md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-5 py-5 md:block md:px-6 md:py-7">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#ef654c] text-[#fff6ec] shadow-[0_7px_18px_-8px_rgba(239,101,76,.9)]">
            <HeartPulse size={20} strokeWidth={2.4} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#202b3b] bg-[#f6c94f]" />
          </div>
          <div>
            <div className="font-display text-[17px] font-bold tracking-[-0.04em]">ProfilePulse</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.19em] text-slate-400">local activity log</div>
          </div>
        </div>
        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white md:hidden" aria-label="Open navigation" data-testid="button-open-navigation">
          <Menu size={20} />
        </button>
      </div>
      <div className="hidden px-4 pb-3 md:block">
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          data-testid="button-sidebar-run"
          className="group flex w-full items-center justify-between rounded-xl border border-[#ef654c]/30 bg-[#ef654c]/10 px-3.5 py-3 text-left transition hover:border-[#ef654c]/70 hover:bg-[#ef654c]/20 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="flex items-center gap-2.5">
            {running ? <Loader2 size={16} className="animate-spin text-[#f6c94f]" /> : <Zap size={16} className="text-[#f6c94f]" />}
            <span className="text-xs font-semibold">{running ? 'Running pulse…' : 'Run pulse now'}</span>
          </span>
          <ArrowUpRight size={15} className="text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f6c94f]" />
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-4 md:block md:space-y-1 md:px-3" aria-label="Main navigation">
        <div className="hidden px-3 pb-2 pt-6 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 md:block">Control room</div>
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(label)}
            data-testid={`button-nav-${label.toLowerCase().replace(' ', '-')}`}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition md:w-full ${
              active === label ? 'bg-slate-700/80 font-semibold text-[#f6c94f]' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
            }`}
          >
            <Icon size={16} strokeWidth={active === label ? 2.3 : 1.8} />
            {label}
            {label === 'Overview' && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[#ef654c] md:block" />}
          </button>
        ))}
      </nav>
      <div className="mt-auto hidden border-t border-slate-700/80 p-5 md:block">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> local daemon ready</div>
        <div className="mt-2 font-mono text-[10px] text-slate-600">v0.4.2 · github actions</div>
      </div>
    </aside>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const activityQuery = useListPulseActivity();
  const configQuery = useGetPulseConfig();
  const healthQuery = useHealthCheck();
  const runMutation = useRunPulse();
  const [active, setActive] = useState('Overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const summary = activityQuery.data?.summary;
  const entries = activityQuery.data?.entries ?? [];
  const config = configQuery.data;
  const health = healthQuery.data;
  const successRate = summary && summary.totalRuns > 0 ? Math.round((summary.successfulRuns / summary.totalRuns) * 100) : 0;
  const error = activityQuery.error || configQuery.error || healthQuery.error;
  const isLoading = activityQuery.isLoading || configQuery.isLoading || healthQuery.isLoading;

  const handleRun = () => {
    setFeedback(null);
    runMutation.mutate({ data: {} } as never, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListPulseActivityQueryKey() });
        setFeedback({ type: 'success', message: result.entry.message || 'Pulse completed and activity was recorded.' });
      },
      onError: () => setFeedback({ type: 'error', message: 'Pulse could not complete. Check the local daemon and try again.' }),
    });
  };

  const handleCopy = async () => {
    if (!config?.workflowFile) return;
    try {
      await navigator.clipboard.writeText(config.workflowFile);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFeedback({ type: 'error', message: 'Clipboard access is unavailable in this browser.' });
    }
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getListPulseActivityQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPulseConfigQueryKey() });
    queryClient.invalidateQueries({ queryKey: getHealthCheckQueryKey() });
  };

  const currentStatus = summary?.lastStatus;
  const focusLabel = useMemo(() => active === 'Activity log' ? 'Activity history' : active === 'Workflow' ? 'Workflow settings' : 'Pulse overview', [active]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f1e9] text-[#202b3b]">
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <Sidebar active={active} onNavigate={setActive} onRun={handleRun} running={runMutation.isPending} />
        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#ded9cd] bg-[#f7f4ed]/85 px-5 py-5 backdrop-blur-sm md:px-10 md:py-7">
            <div>
              <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8d8b84]"><span className="h-1.5 w-1.5 rounded-full bg-[#ef654c]" /> {focusLabel}</div>
              <h1 data-testid="text-page-title" className="font-display text-2xl font-bold tracking-[-0.045em] md:text-[29px]">Good morning, Alex.</h1>
            </div>
            <div className="flex items-center gap-2">
              <div data-testid="status-system-health" className="hidden items-center gap-2 rounded-full border border-[#d8e6da] bg-[#edf6ee] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.11em] text-[#34724c] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#51a86e]" /> {health?.status || 'system ready'}
              </div>
              <button type="button" onClick={refreshAll} data-testid="button-refresh-data" className="rounded-lg border border-[#ded9cd] bg-[#fbf9f4] p-2.5 text-[#6c6e70] transition hover:border-[#ef654c] hover:text-[#ef654c]" aria-label="Refresh data"><RefreshCw size={16} /></button>
              <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-toggle-mobile-menu" className="rounded-lg border border-[#ded9cd] bg-[#fbf9f4] p-2.5 text-[#6c6e70] md:hidden" aria-label="Toggle controls"><Menu size={16} /></button>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="border-b border-[#ded9cd] bg-[#fbf9f4] px-5 py-3 md:hidden">
              <button type="button" onClick={handleRun} disabled={runMutation.isPending} data-testid="button-mobile-run" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ef654c] px-4 py-3 text-sm font-bold text-[#fff7ef] disabled:opacity-60">{runMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run pulse now</button>
            </div>
          )}

          <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-7 md:px-10 md:pt-9">
            {feedback && (
              <div role="status" data-testid={`status-run-${feedback.type}`} className={`pulse-in mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                {feedback.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />}
                <span>{feedback.message}</span>
                <button type="button" onClick={() => setFeedback(null)} data-testid="button-dismiss-feedback" className="ml-auto shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss notification"><XCircle size={16} /></button>
              </div>
            )}
            {error && !isLoading && (
              <div className="pulse-in mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
                <span className="flex items-center gap-2"><AlertCircle size={17} /> We could not load part of your pulse data.</span>
                <button type="button" onClick={refreshAll} data-testid="button-retry-data" className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-bold hover:bg-rose-100">Retry</button>
              </div>
            )}

            <section className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="pulse-in relative overflow-hidden rounded-2xl bg-[#26354a] p-6 text-[#f8f4eb] shadow-[0_16px_35px_-22px_rgba(32,43,59,.65)] md:p-8">
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[28px] border-[#ef654c]/10" />
                <div className="absolute right-8 top-8 h-32 w-32 rounded-full border border-[#f6c94f]/20" />
                <div className="absolute bottom-0 left-0 h-px w-full overflow-hidden bg-[#f6c94f]/20"><div className="scan-line h-full w-1/3 bg-[#f6c94f]/70" /></div>
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#aab5c4]"><CircleDot size={12} className="text-[#f6c94f]" /> current pulse</div>
                      <h2 data-testid="text-current-status" className="font-display text-4xl font-bold tracking-[-0.06em] md:text-5xl">{currentStatus ? (statusIsSuccess(currentStatus) ? 'All clear.' : 'Needs a look.') : 'Ready to run.'}</h2>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-[#b8c2cf]">{summary?.lastRunAt ? `Last checked ${relativeDate(summary.lastRunAt)}. Your local automation is keeping watch.` : 'No activity yet. Run your first pulse to start a trustworthy history.'}</p>
                    </div>
                    <div className={`hidden h-12 w-12 items-center justify-center rounded-2xl md:flex ${statusIsSuccess(currentStatus) ? 'bg-emerald-400/15 text-emerald-300' : 'bg-[#f6c94f]/15 text-[#f6c94f]'}`}>
                      {statusIsSuccess(currentStatus) ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                    </div>
                  </div>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={handleRun} disabled={runMutation.isPending || config?.manualTrigger === false} data-testid="button-run-pulse" className="group flex items-center gap-2 rounded-lg bg-[#ef654c] px-4 py-3 text-sm font-bold text-[#fff8f1] shadow-[0_9px_20px_-10px_rgba(239,101,76,.8)] transition hover:-translate-y-0.5 hover:bg-[#f1765d] focus:outline-none focus:ring-2 focus:ring-[#f6c94f] focus:ring-offset-2 focus:ring-offset-[#26354a] disabled:cursor-not-allowed disabled:opacity-60">
                      {runMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="transition group-hover:scale-110" />}
                      {runMutation.isPending ? 'Logging pulse…' : 'Run pulse now'}
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8e9aaa]">{config?.manualTrigger === false ? 'manual trigger disabled' : 'takes about 3 seconds'}</span>
                  </div>
                </div>
              </div>
              <div className="pulse-in pulse-in-delay-1 rounded-2xl border border-[#ded9cd] bg-[#fbf9f4] p-6 shadow-[0_8px_22px_-18px_rgba(32,43,59,.5)] md:p-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#8d8b84]"><Clock3 size={14} className="text-[#ef654c]" /> next scheduled run</div>
                  <span className="rounded-full bg-[#f6e6b0] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#80651b]">automated</span>
                </div>
                {isLoading ? <><Skeleton className="mt-7 h-9 w-36" /><Skeleton className="mt-3 h-4 w-52" /></> : <><div data-testid="text-schedule-label" className="mt-7 font-display text-3xl font-bold tracking-[-0.06em]">{config?.scheduleLabel || 'Schedule unavailable'}</div><p className="mt-2 text-sm text-[#6d706e]">{config?.schedule || 'Check workflow configuration for timing details.'}</p></>}
                <div className="mt-8 flex items-center gap-2 border-t border-[#e6e1d7] pt-4 text-xs text-[#777873]"><GitBranch size={14} /> GitHub Actions workflow <code className="ml-auto max-w-[130px] truncate font-mono text-[10px] text-[#444b55]">{config?.workflowFile || '—'}</code></div>
              </div>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {[
                { label: 'Total runs', value: summary?.totalRuns, icon: Activity, tone: 'text-[#26354a]' },
                { label: 'Success rate', value: summary ? `${successRate}%` : undefined, icon: Check, tone: 'text-emerald-700' },
                { label: 'Failed runs', value: summary?.failedRuns, icon: AlertCircle, tone: 'text-[#c75542]' },
                { label: 'Last run', value: summary?.lastRunAt ? relativeDate(summary.lastRunAt) : undefined, icon: Clock3, tone: 'text-[#80651b]' },
              ].map(({ label, value, icon: Icon, tone }, index) => (
                <div key={label} data-testid={`card-metric-${label.toLowerCase().replace(' ', '-')}`} className={`pulse-in pulse-in-delay-${index + 1} rounded-xl border border-[#ded9cd] bg-[#fbf9f4] p-4 md:p-5`}>
                  <div className={`mb-4 flex items-center gap-2 ${tone}`}><Icon size={15} /><span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#8d8b84]">{label}</span></div>
                  {isLoading ? <Skeleton className="h-7 w-20" /> : <div data-testid={`text-metric-${label.toLowerCase().replace(' ', '-')}`} className={`font-display text-2xl font-bold tracking-[-0.05em] md:text-3xl ${tone}`}>{value ?? '—'}</div>}
                </div>
              ))}
            </section>

            <section className="mt-9 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="pulse-in pulse-in-delay-2 rounded-2xl border border-[#ded9cd] bg-[#fbf9f4] p-5 md:p-7">
                <div className="mb-6 flex items-end justify-between gap-3">
                  <div><div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#8d8b84]"><History size={14} className="text-[#ef654c]" /> recent activity</div><h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.05em]">A clear record of every pulse.</h2></div>
                  <button type="button" onClick={() => setActive('Activity log')} data-testid="button-view-all-activity" className="hidden items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#ef654c] hover:text-[#c94e39] sm:flex">View all <ArrowUpRight size={14} /></button>
                </div>
                {isLoading ? <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="flex gap-4"><Skeleton className="mt-1 h-2 w-2 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="mt-2 h-3 w-64" /></div></div>)}</div> : entries.length === 0 ? <div data-testid="empty-activity" className="rounded-xl border border-dashed border-[#d9d3c7] bg-[#f7f3e9] px-5 py-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f6e6b0] text-[#80651b]"><History size={20} /></div><h3 className="mt-4 font-display text-lg font-bold">Your log starts here.</h3><p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-[#777873]">Run a pulse to capture the first check and keep your automation accountable.</p></div> : <div className="divide-y divide-[#ebe6dc]">{entries.slice(0, 6).map((entry, index) => { const success = statusIsSuccess(entry.status); return <div key={`${entry.timestamp}-${index}`} data-testid={`row-activity-${index}`} className="group flex gap-3 py-4 first:pt-0 last:pb-0"><div className={`mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{success ? <Check size={12} /> : <XCircle size={12} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><StatusPill status={entry.status} /><time className="font-mono text-[10px] text-[#a09d95]" dateTime={entry.timestamp}>{formatDate(entry.timestamp, true)}</time></div><p data-testid={`text-activity-message-${index}`} className="mt-2 truncate text-sm text-[#4c5359]">{entry.message || 'Pulse completed without a message.'}</p></div></div>; })}</div>}
              </div>
              <div className="pulse-in pulse-in-delay-3 rounded-2xl border border-[#ded9cd] bg-[#fbf9f4] p-5 md:p-7">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#8d8b84]"><Settings2 size={14} className="text-[#ef654c]" /> workflow settings</div>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.05em]">Quietly configured.</h2>
                <div className="mt-6 space-y-4">
                  {isLoading ? [1, 2, 3, 4].map((item) => <div key={item}><Skeleton className="h-2 w-20" /><Skeleton className="mt-2 h-4 w-full" /></div>) : config ? <><div><div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-[#a09d95]">Commit message</div><div data-testid="text-commit-message" className="text-sm font-medium text-[#3e464e]">{config.commitMessage}</div></div><div><div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-[#a09d95]">Git identity</div><div data-testid="text-git-identity" className="flex items-center gap-2 text-sm font-medium text-[#3e464e]"><GitCommitHorizontal size={14} className="text-[#ef654c]" />{config.gitIdentity}</div></div><div><div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-[#a09d95]">Permissions</div><div data-testid="text-permissions" className="flex items-center gap-2 text-sm font-medium text-[#3e464e]"><ShieldCheck size={14} className="text-emerald-600" />{config.permissions}</div></div><div><div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-[#a09d95]">Workflow file</div><button type="button" onClick={handleCopy} data-testid="button-copy-workflow-file" className="flex max-w-full items-center gap-2 text-left font-mono text-xs text-[#ef654c] hover:text-[#c94e39]"><FileCode2 size={14} className="shrink-0" /><span className="truncate">{config.workflowFile}</span>{copied ? <Check size={13} className="shrink-0 text-emerald-600" /> : <Copy size={13} className="shrink-0 opacity-50" />}</button></div></> : <div data-testid="empty-config" className="py-7 text-center text-sm text-[#777873]">Workflow settings are not available.</div>}
                </div>
                <button type="button" onClick={() => setActive('Workflow')} data-testid="button-open-workflow" className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#ded9cd] px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#61656a] transition hover:border-[#ef654c] hover:text-[#ef654c]"><Terminal size={14} /> Inspect workflow</button>
              </div>
            </section>
            <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#ded9cd] pt-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#a09d95]"><span className="flex items-center gap-2"><Server size={13} /> ProfilePulse control room</span><span>local only · your code stays yours</span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return <Switch><Route path="/" component={Dashboard} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;