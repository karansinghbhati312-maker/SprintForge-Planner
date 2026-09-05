import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Clock3,
  Copy,
  FileText,
  FolderKanban,
  Gauge,
  Hammer,
  LayoutDashboard,
  ListChecks,
  Pencil,
  Plus,
  Radar,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  getGetPlanQueryKey,
  getListPlansQueryKey,
  useCreatePlan,
  useDeletePlan,
  useGetAdminStats,
  useGetPlan,
  useHealthCheck,
  useListPlans,
  useUpdatePlanTitle,
} from '@workspace/api-client-react';
import type { Plan, PlanInput, PlanSummary } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function statusClass(status?: string) {
  return status === 'completed' ? 'status-completed' : status === 'failed' ? 'status-failed' : 'status-processing';
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span className={`status-pill ${statusClass(status)}`} data-testid={`status-plan-${status ?? 'unknown'}`}>
      <span className="status-dot" />
      {status ?? 'unknown'}
    </span>
  );
}

function LoadingPanel({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="panel p-6" data-testid="status-loading">
      <div className="flex items-center gap-3">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-36" />
          <div className="skeleton h-2.5 w-56 opacity-70" />
        </div>
      </div>
      <div className="mt-7 grid gap-3">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}

function ErrorPanel({ onRetry, label = 'Something went wrong' }: { onRetry?: () => void; label?: string }) {
  return (
    <div className="empty-state" data-testid="status-error">
      <div className="empty-icon"><AlertTriangle size={20} /></div>
      <h2 className="text-base font-extrabold">{label}</h2>
      <p className="mt-2 text-sm text-muted-foreground">The workspace could not load this data. Try again.</p>
      {onRetry && <button className="btn btn-secondary mt-5" onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button>}
    </div>
  );
}

function EmptyPlans() {
  return (
    <div className="empty-state" data-testid="empty-plans">
      <div className="empty-icon"><Boxes size={20} /></div>
      <h2 className="text-base font-extrabold">No plans in the forge yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Turn the next product bet into a plan your team can actually pick up.</p>
      <Link href="/plans/new" className="btn btn-primary mt-5" data-testid="link-create-first-plan"><Plus size={15} /> Forge a plan</Link>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/plans/new', label: 'New plan', icon: Sparkles },
    { href: '/plans', label: 'Saved plans', icon: FolderKanban },
    { href: '/admin', label: 'Monitoring', icon: Radar },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="mb-9 flex items-center gap-3 px-2 no-underline" data-testid="link-brand">
          <div className="brand-mark">SF</div>
          <div className="brand-word text-sm tracking-tight text-foreground">SprintForge</div>
        </Link>
        <div className="mb-3 nav-label">Workspace</div>
        <nav aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? location === '/' : location.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-link ${active ? 'nav-link-active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={16} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer mt-auto border-t border-sidebar-border pt-4">
          <div className="mb-3 nav-label">System</div>
          <div className="flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-line" /> Planning engine online
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-context flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Product operations</span>
            <span className="text-border">/</span>
            <span>{location === '/' ? 'Overview' : location.startsWith('/admin') ? 'Monitoring' : location.startsWith('/plans/new') ? 'New plan' : 'Plans'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-[10px] font-medium text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> API connected</div>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-border bg-secondary text-[11px] font-extrabold text-primary" title="Product operations">PO</div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string | number; detail?: string; icon: typeof Activity; accent?: boolean }) {
  return (
    <div className={`panel stat-card ${accent ? 'border-primary/35' : ''}`} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="flex items-start justify-between">
        <div className="stat-label">{label}</div>
        <Icon size={15} className={accent ? 'text-primary' : 'text-muted-foreground'} />
      </div>
      <div className="stat-value">{value}</div>
      {detail && <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

function OverviewPage() {
  const plansQuery = useListPlans();
  const healthQuery = useHealthCheck();
  const plans = plansQuery.data ?? [];
  const recent = useMemo(() => [...plans].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5), [plans]);
  const totals = useMemo(() => ({
    stories: plans.reduce((sum, plan) => sum + (plan.storyCount ?? 0), 0),
    tasks: plans.reduce((sum, plan) => sum + (plan.taskCount ?? 0), 0),
    completed: plans.filter((plan) => plan.status === 'completed').length,
  }), [plans]);
  return (
    <main className="page-wrap">
      <div className="animate-rise mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="eyebrow">Planning cockpit</div>
          <h1 className="page-title">Make the next sprint legible.</h1>
          <p className="page-subtitle">Shape product intent into a delivery plan with the right amount of pressure.</p>
        </div>
        <Link href="/plans/new" className="btn btn-primary self-start md:self-auto" data-testid="link-new-plan"><Plus size={15} /> New feature plan</Link>
      </div>
      {plansQuery.isLoading ? <LoadingPanel label="Loading overview" /> : plansQuery.isError ? <ErrorPanel onRetry={() => plansQuery.refetch()} /> : (
        <>
          <div className="stat-grid animate-rise animate-rise-1 mb-7">
            <StatCard label="Plans forged" value={plans.length} detail={`${totals.completed} completed`} icon={Rocket} accent />
            <StatCard label="Stories shaped" value={totals.stories} detail="Across saved plans" icon={ListChecks} />
            <StatCard label="Engineering tasks" value={totals.tasks} detail="Ready for allocation" icon={Hammer} />
            <StatCard label="Engine status" value={healthQuery.data?.status ?? 'checking'} detail="Planning API" icon={Activity} accent={healthQuery.data?.status === 'ok'} />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.45fr_.9fr]">
            <section className="panel animate-rise animate-rise-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div><div className="text-sm font-extrabold">Recent plans</div><div className="mt-1 text-[11px] text-muted-foreground">Your latest planning runs</div></div>
                <Link href="/plans" className="btn btn-ghost min-h-8 px-2 text-[11px]" data-testid="link-view-all-plans">View all <ArrowRight size={13} /></Link>
              </div>
              {recent.length === 0 ? <div className="p-5"><EmptyPlans /></div> : (
                <div>
                  {recent.map((plan) => <PlanRow key={plan.id} plan={plan} />)}
                </div>
              )}
            </section>
            <section className="panel animate-rise animate-rise-3 p-5">
              <div className="flex items-start justify-between">
                <div><div className="text-sm font-extrabold">The forge, in brief</div><div className="mt-1 text-[11px] text-muted-foreground">A healthy planning cadence</div></div>
                <Gauge size={17} className="text-primary" />
              </div>
              <div className="mt-6 space-y-5">
                <div><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">Plans completed</span><span className="mono text-primary">{plans.length ? Math.round((totals.completed / plans.length) * 100) : 0}%</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${plans.length ? (totals.completed / plans.length) * 100 : 0}%` }} /></div></div>
                <div><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">Average plan depth</span><span className="mono text-primary">{plans.length ? (totals.tasks / plans.length).toFixed(1) : '0.0'} tasks</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min((plans.length ? totals.tasks / plans.length : 0) * 10, 100)}%`, background: 'hsl(var(--accent))' }} /></div></div>
              </div>
              <div className="callout mt-7">Good planning is a constraint, not a ceremony. Keep the goal sharp and the sprint honest.</div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function PlanRow({ plan }: { plan: PlanSummary }) {
  return (
    <Link href={`/plans/${plan.id}`} className="panel-hover flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0" data-testid={`link-plan-${plan.id}`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><FileText size={16} /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold">{plan.title}</div>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>{plan.storyCount} stories</span><span>{plan.taskCount} tasks</span><span>{formatDate(plan.updatedAt)}</span></div>
      </div>
      <StatusPill status={plan.status} />
      <ArrowRight size={15} className="hidden text-muted-foreground sm:block" />
    </Link>
  );
}

const emptyPlanInput: PlanInput = {
  title: '', description: '', targetUsers: '', businessGoal: '', mainProblem: '',
  mustHaveRequirements: '', niceToHaveRequirements: '', constraints: '',
  sprintLength: 2, teamCapacity: 24, availableSprints: 3,
};

function NewPlanPage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<PlanInput>(emptyPlanInput);
  const createPlan = useCreatePlan();
  const update = (key: keyof PlanInput, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createPlan.mutate({ data: form }, { onSuccess: (plan) => setLocation(`/plans/${plan.id}`) });
  };
  return (
    <main className="page-wrap">
      <div className="animate-rise mb-7 flex items-end justify-between gap-4">
        <div><div className="eyebrow">New planning run</div><h1 className="page-title">Forge a feature plan.</h1><p className="page-subtitle">Give the engine the product context. It will return a structured PRD, stories, tasks, and a capacity-aware sprint sequence.</p></div>
        <Link href="/" className="btn btn-ghost hidden sm:inline-flex" data-testid="link-cancel-new-plan"><ArrowLeft size={14} /> Back</Link>
      </div>
      <form className="grid gap-5 lg:grid-cols-[1.45fr_.8fr]" onSubmit={handleSubmit}>
        <section className="panel animate-rise animate-rise-1 p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Target size={16} /></div><div><h2 className="text-sm font-extrabold">Product brief</h2><p className="text-[11px] text-muted-foreground">Start with the decision you need to make.</p></div></div>
          <div className="field-grid">
            <div className="field-full"><label className="field-label" htmlFor="plan-title">Feature title</label><input id="plan-title" className="field-input" required maxLength={160} value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Guided onboarding for workspace admins" data-testid="input-plan-title" /></div>
            <Field label="What are you building?" hint="Describe the feature in plain language." full><textarea className="field-input" required value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="A focused release that..." data-testid="input-plan-description" /></Field>
            <Field label="Target users" hint="Who feels the problem most directly?"><textarea className="field-input" required value={form.targetUsers} onChange={(e) => update('targetUsers', e.target.value)} placeholder="Workspace admins at growing teams" data-testid="input-plan-target-users" /></Field>
            <Field label="Business goal" hint="What changes if this works?"><textarea className="field-input" required value={form.businessGoal} onChange={(e) => update('businessGoal', e.target.value)} placeholder="Reduce time-to-value..." data-testid="input-plan-business-goal" /></Field>
            <Field label="Main problem" full><textarea className="field-input" required value={form.mainProblem} onChange={(e) => update('mainProblem', e.target.value)} placeholder="Today, users struggle to..." data-testid="input-plan-main-problem" /></Field>
            <Field label="Must-have requirements" hint="One requirement per line." full><textarea className="field-input" value={form.mustHaveRequirements} onChange={(e) => update('mustHaveRequirements', e.target.value)} placeholder="Invite teammates&#10;Track setup progress" data-testid="input-plan-must-haves" /></Field>
            <Field label="Nice-to-have requirements" hint="Useful, but not at the expense of the core." full><textarea className="field-input" value={form.niceToHaveRequirements} onChange={(e) => update('niceToHaveRequirements', e.target.value)} placeholder="CSV export&#10;Custom reminders" data-testid="input-plan-nice-to-haves" /></Field>
            <Field label="Constraints" hint="Dependencies, deadlines, technical boundaries." full><textarea className="field-input" value={form.constraints} onChange={(e) => update('constraints', e.target.value)} placeholder="Must ship before the Q3 launch..." data-testid="input-plan-constraints" /></Field>
          </div>
        </section>
        <div className="space-y-5">
          <section className="panel animate-rise animate-rise-2 p-5">
            <div className="mb-5 flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent"><Clock3 size={16} /></div><div><h2 className="text-sm font-extrabold">Capacity model</h2><p className="text-[11px] text-muted-foreground">Shape the reality check.</p></div></div>
            <div className="space-y-5">
              <NumberField label="Sprint length" suffix="weeks" min={1} max={4} value={form.sprintLength} onChange={(value) => update('sprintLength', value)} testId="input-sprint-length" />
              <NumberField label="Team capacity" suffix="points / sprint" min={1} max={200} value={form.teamCapacity} onChange={(value) => update('teamCapacity', value)} testId="input-team-capacity" />
              <NumberField label="Available sprints" suffix="sprints" min={1} max={12} value={form.availableSprints} onChange={(value) => update('availableSprints', value)} testId="input-available-sprints" />
            </div>
          </section>
          <section className="panel animate-rise animate-rise-3 p-5">
            <div className="flex items-start gap-3"><ShieldAlert size={16} className="mt-0.5 text-primary" /><div><div className="text-xs font-extrabold">The engine will decide</div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Priority scores, story sizing, dependency order, and sprint allocation are generated from the context above.</p></div></div>
          </section>
          {createPlan.isError && <div className="callout border-destructive bg-destructive/10 text-destructive" data-testid="status-create-error">Plan creation failed. Review the brief and try again.</div>}
          <button className="btn btn-primary w-full" type="submit" disabled={createPlan.isPending} data-testid="button-generate-plan">{createPlan.isPending ? <><RefreshCw size={14} className="animate-spin" /> Processing brief</> : <><Sparkles size={14} /> Generate plan</>}</button>
          <p className="text-center text-[10px] text-muted-foreground">Generation usually takes a few seconds.</p>
        </div>
      </form>
    </main>
  );
}

function Field({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: ReactNode }) {
  return <div className={full ? 'field-full' : ''}><label className="field-label">{label}</label>{children}{hint && <div className="field-hint">{hint}</div>}</div>;
}

function NumberField({ label, suffix, min, max, value, onChange, testId }: { label: string; suffix: string; min: number; max: number; value: number; onChange: (value: number) => void; testId: string }) {
  return <div><label className="field-label" htmlFor={testId}>{label}</label><div className="relative"><input id={testId} className="field-input pr-28" type="number" min={min} max={max} required value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{suffix}</span></div></div>;
}

function PlansPage() {
  const plansQuery = useListPlans();
  const queryClient = useQueryClient();
  const updateTitle = useUpdatePlanTitle();
  const deletePlan = useDeletePlan();
  const [query, setQuery] = useState('');
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const plans = useMemo(() => (plansQuery.data ?? []).filter((plan) => plan.title.toLowerCase().includes(query.toLowerCase())), [plansQuery.data, query]);
  const startRename = (plan: PlanSummary) => { setRenameId(plan.id); setRenameValue(plan.title); };
  const saveRename = (id: number) => {
    if (!renameValue.trim()) return;
    updateTitle.mutate({ id, data: { title: renameValue.trim() } }, {
      onSuccess: () => { setRenameId(null); queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() }); },
    });
  };
  const remove = (id: number) => {
    if (!window.confirm('Delete this saved plan? This cannot be undone.')) return;
    deletePlan.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() }) });
  };
  return (
    <main className="page-wrap">
      <div className="animate-rise mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><div className="eyebrow">Planning library</div><h1 className="page-title">Saved plans.</h1><p className="page-subtitle">Every generated decision, kept close to the work.</p></div>
        <Link href="/plans/new" className="btn btn-primary self-start md:self-auto" data-testid="link-plans-new"><Plus size={15} /> New plan</Link>
      </div>
      <section className="panel animate-rise animate-rise-1 overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-xs flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="field-input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plans" data-testid="input-search-plans" /></div>
          <div className="text-[11px] text-muted-foreground"><span className="mono text-foreground">{plans.length}</span> plans shown</div>
        </div>
        {plansQuery.isLoading ? <div className="p-5"><LoadingPanel label="Loading saved plans" /></div> : plansQuery.isError ? <div className="p-5"><ErrorPanel onRetry={() => plansQuery.refetch()} /></div> : plans.length === 0 ? <div className="p-5">{query ? <div className="empty-state"><div className="empty-icon"><Search size={19} /></div><h2 className="text-base font-extrabold">No matching plans</h2><p className="mt-2 text-sm text-muted-foreground">Try a different search term.</p></div> : <EmptyPlans />}</div> : (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Plan</th><th>Status</th><th>Scope</th><th>Updated</th><th className="text-right">Actions</th></tr></thead><tbody>
            {plans.map((plan) => <tr key={plan.id} data-testid={`row-plan-${plan.id}`}><td className="min-w-[250px]">{renameId === plan.id ? <div className="flex gap-2"><input autoFocus className="field-input h-8 py-1.5" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(plan.id); if (e.key === 'Escape') setRenameId(null); }} data-testid={`input-rename-plan-${plan.id}`} /><button className="btn btn-primary min-h-8 px-2" onClick={() => saveRename(plan.id)} data-testid={`button-save-rename-${plan.id}`}><Check size={14} /></button><button className="btn btn-ghost min-h-8 px-2" onClick={() => setRenameId(null)} data-testid={`button-cancel-rename-${plan.id}`}><X size={14} /></button></div> : <Link href={`/plans/${plan.id}`} className="group inline-flex items-center gap-3 no-underline" data-testid={`link-saved-plan-${plan.id}`}><div className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-primary"><FileText size={14} /></div><div><div className="font-extrabold text-foreground group-hover:text-primary">{plan.title}</div><div className="mt-0.5 text-[10px] text-muted-foreground">Created {formatDate(plan.createdAt)}</div></div></Link>}</td><td><StatusPill status={plan.status} /></td><td><div className="flex gap-3 text-[11px] text-muted-foreground"><span>{plan.storyCount} stories</span><span>{plan.taskCount} tasks</span><span>{plan.sprintCount} sprints</span></div></td><td className="whitespace-nowrap text-muted-foreground">{formatDate(plan.updatedAt)}</td><td><div className="flex justify-end gap-1"><Link href={`/plans/${plan.id}`} className="btn btn-ghost min-h-8 px-2" title="Open plan" data-testid={`button-open-plan-${plan.id}`}><ArrowRight size={14} /></Link><button className="btn btn-ghost min-h-8 px-2" onClick={() => startRename(plan)} title="Rename plan" data-testid={`button-rename-plan-${plan.id}`}><Pencil size={14} /></button><button className="btn btn-ghost min-h-8 px-2 hover:text-destructive" onClick={() => remove(plan.id)} disabled={deletePlan.isPending} title="Delete plan" data-testid={`button-delete-plan-${plan.id}`}><Trash2 size={14} /></button></div></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </main>
  );
}

function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const planId = Number(params.id);
  const planQuery = useGetPlan(planId, { query: { enabled: Number.isFinite(planId), queryKey: getGetPlanQueryKey(planId) } });
  const [tab, setTab] = useState('prd');
  const [copied, setCopied] = useState(false);
  const plan = planQuery.data;
  const exportMarkdown = () => {
    if (!plan) return;
    const markdown = buildMarkdown(plan);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'sprintforge-plan'}.md`; anchor.click();
    URL.revokeObjectURL(url);
  };
  const copyPrd = async () => {
    if (!plan) return;
    await navigator.clipboard?.writeText(buildPrdText(plan));
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };
  if (planQuery.isLoading) return <main className="page-wrap"><LoadingPanel label="Loading plan detail" /></main>;
  if (planQuery.isError || !plan) return <main className="page-wrap"><ErrorPanel onRetry={() => planQuery.refetch()} label="Plan unavailable" /></main>;
  const tabs = [{ id: 'prd', label: 'PRD', count: null }, { id: 'stories', label: 'User stories', count: plan.stories.length }, { id: 'tasks', label: 'Engineering tasks', count: plan.tasks.length }, { id: 'sprints', label: 'Sprint plan', count: plan.sprints.length }, { id: 'risks', label: 'Risks & metrics', count: null }];
  return (
    <main className="page-wrap">
      <div className="animate-rise mb-6"><Link href="/plans" className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold text-muted-foreground hover:text-primary" data-testid="link-back-plans"><ArrowLeft size={13} /> All plans</Link><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex flex-wrap items-center gap-3"><div className="eyebrow">Generated plan · {formatDate(plan.createdAt)}</div><StatusPill status={plan.status} /></div><h1 className="page-title">{plan.title}</h1><p className="page-subtitle">{plan.input.description}</p></div><div className="flex gap-2"><button className="btn btn-secondary" onClick={copyPrd} data-testid="button-copy-prd">{copied ? <ClipboardCheck size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy PRD'}</button><button className="btn btn-secondary" onClick={exportMarkdown} data-testid="button-export-markdown"><Clipboard size={14} /> Export .md</button></div></div></div>
      <div className="stat-grid animate-rise animate-rise-1 mb-6"><StatCard label="Stories" value={plan.stories.length} detail="Product slices" icon={ListChecks} accent /><StatCard label="Tasks" value={plan.tasks.length} detail={`${plan.tasks.filter((task) => task.allocationStatus === 'allocated').length} allocated`} icon={Hammer} /><StatCard label="Sprints" value={plan.sprints.length} detail={`${plan.input.sprintLength} weeks each`} icon={Clock3} /><StatCard label="Decision notes" value={plan.decisionExplanation.length} detail="Trade-offs surfaced" icon={ShieldAlert} /></div>
      <section className="panel animate-rise animate-rise-2 overflow-hidden">
        <div className="tab-bar px-3 pt-2">{tabs.map((item) => <button className={`tab ${tab === item.id ? 'tab-active' : ''}`} key={item.id} onClick={() => setTab(item.id)} data-testid={`tab-plan-${item.id}`}>{item.label}{item.count !== null && <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.count}</span>}</button>)}</div>
        <div className="p-5 sm:p-7">{tab === 'prd' && <PrdView plan={plan} />}{tab === 'stories' && <StoriesView plan={plan} />}{tab === 'tasks' && <TasksView plan={plan} />}{tab === 'sprints' && <SprintsView plan={plan} />}{tab === 'risks' && <RisksView plan={plan} />}</div>
      </section>
    </main>
  );
}

function PrdView({ plan }: { plan: Plan }) {
  const prd = plan.prd;
  return <div className="grid gap-8 lg:grid-cols-[1.35fr_.75fr]"><div className="space-y-7"><ContentBlock title="Executive summary"><p>{prd.executiveSummary}</p></ContentBlock><ContentBlock title="Problem statement"><p>{prd.problemStatement}</p></ContentBlock><ContentBlock title="Functional requirements"><BulletList items={prd.functionalRequirements} /></ContentBlock><ContentBlock title="Non-functional requirements"><BulletList items={prd.nonFunctionalRequirements} /></ContentBlock><ContentBlock title="Acceptance criteria"><BulletList items={prd.acceptanceCriteria} checked /></ContentBlock></div><div className="space-y-5"><SideList title="Target users" items={prd.targetUsers} icon={Users} /><SideList title="Goals" items={prd.goals} icon={Target} accent /><SideList title="Non-goals" items={prd.nonGoals} icon={X} /><SideList title="Assumptions" items={prd.assumptions} icon={Settings2} /></div></div>;
}

function ContentBlock({ title, children }: { title: string; children: ReactNode }) { return <div><h2 className="mb-3 text-sm font-extrabold">{title}</h2><div className="text-sm leading-7 text-muted-foreground">{children}</div></div>; }
function BulletList({ items, checked = false }: { items: string[]; checked?: boolean }) { return <ul className="m-0 grid list-none gap-2 p-0">{items.length ? items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3"><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${checked ? 'bg-primary' : 'bg-muted-foreground'}`} /><span>{item}</span></li>) : <li className="text-muted-foreground">No items provided.</li>}</ul>; }
function SideList({ title, items, icon: Icon, accent = false }: { title: string; items: string[]; icon: typeof Users; accent?: boolean }) { return <div className="rounded-lg border border-border bg-secondary/40 p-4"><div className={`mb-3 flex items-center gap-2 text-xs font-extrabold ${accent ? 'text-primary' : ''}`}><Icon size={14} /> {title}</div><BulletList items={items} /></div>; }

function StoriesView({ plan }: { plan: Plan }) {
  return <div className="space-y-3">{plan.stories.map((story, index) => <details key={story.id} className="group rounded-lg border border-border bg-secondary/25" open={index === 0}><summary className="flex cursor-pointer list-none items-start gap-3 p-4"><div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-[10px] font-extrabold text-primary">{String(index + 1).padStart(2, '0')}</div><div className="min-w-0 flex-1"><div className="font-extrabold">{story.title}</div><div className="mt-1 text-xs text-muted-foreground">{story.statement}</div></div><span className={`status-pill ${story.priority.label === 'Critical' ? 'status-failed' : story.priority.label === 'High' ? 'status-processing' : 'status-completed'}`}>{story.priority.label} · {story.effortPoints} pts</span><ChevronDown size={15} className="mt-1 text-muted-foreground transition-transform group-open:rotate-180" /></summary><div className="grid gap-5 border-t border-border p-4 pl-[52px] md:grid-cols-[1fr_.8fr]"><div><div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Acceptance criteria</div><BulletList items={story.acceptanceCriteria} checked /></div><div><div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Sizing rationale</div><p className="text-xs leading-6 text-muted-foreground">{story.effortReason}</p></div></div></details>)}</div>;
}

function TasksView({ plan }: { plan: Plan }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Task</th><th>Type</th><th>Priority</th><th>Size</th><th>Dependency</th><th>Sprint</th></tr></thead><tbody>{plan.tasks.map((task) => <tr key={task.id} data-testid={`row-task-${task.id}`}><td className="min-w-[230px]"><div className="font-extrabold">{task.title}</div><div className="mt-1 max-w-sm text-[11px] leading-5 text-muted-foreground">{task.description}</div></td><td><span className="rounded bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{task.category}</span></td><td><span className={`font-bold priority-${task.priority.label.toLowerCase()}`}>{task.priority.label}</span></td><td className="mono text-primary">{task.effortPoints}</td><td className="max-w-[160px] text-[11px] text-muted-foreground">{task.dependencyLabels.length ? task.dependencyLabels.join(', ') : '—'}</td><td>{task.assignedSprint ? <span className="mono text-xs">S{task.assignedSprint}</span> : <span className="text-xs text-muted-foreground">Unallocated</span>}</td></tr>)}</tbody></table></div>;
}

function SprintsView({ plan }: { plan: Plan }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plan.sprints.map((sprint) => { const usage = sprint.capacity ? Math.min((sprint.usedPoints / sprint.capacity) * 100, 100) : 0; return <div className="rounded-lg border border-border bg-secondary/25 p-4" key={sprint.number} data-testid={`card-sprint-${sprint.number}`}><div className="flex items-start justify-between"><div><div className="eyebrow">Sprint {String(sprint.number).padStart(2, '0')}</div><div className="mt-1 font-extrabold">{sprint.label}</div></div><div className="grid h-8 w-8 place-items-center rounded-full border border-primary/30 text-xs font-extrabold text-primary">{Math.round(usage)}%</div></div><div className="mt-5"><div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>{sprint.usedPoints} / {sprint.capacity} points</span><span>{sprint.taskCount} tasks</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${usage}%` }} /></div></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]"><span className="text-muted-foreground">{sprint.lengthWeeks} week sprint</span><span className={sprint.remainingPoints < 0 ? 'text-destructive' : 'text-primary'}>{sprint.remainingPoints} remaining</span></div></div>; })}</div>;
}

function RisksView({ plan }: { plan: Plan }) {
  return <div className="grid gap-8 lg:grid-cols-[1fr_.9fr]"><div><ContentBlock title="Known risks"><BulletList items={plan.prd.risks} /></ContentBlock><div className="mt-8"><ContentBlock title="Success metrics"><BulletList items={plan.prd.successMetrics} checked /></ContentBlock></div></div><div><div className="mb-3 text-sm font-extrabold">Decision explanation</div><div className="space-y-3">{plan.decisionExplanation.map((item, index) => <div className="flex gap-3 text-sm leading-6 text-muted-foreground" key={`${item}-${index}`}><span className="mono mt-0.5 text-[10px] text-primary">0{index + 1}</span><span>{item}</span></div>)}</div></div></div>;
}

function buildPrdText(plan: Plan) {
  return [`# ${plan.title}`, '', '## Executive summary', plan.prd.executiveSummary, '', '## Problem statement', plan.prd.problemStatement, '', '## Functional requirements', ...plan.prd.functionalRequirements.map((item) => `- ${item}`), '', '## Success metrics', ...plan.prd.successMetrics.map((item) => `- ${item}`)].join('\n');
}
function buildMarkdown(plan: Plan) {
  return [buildPrdText(plan), '', '## User stories', ...plan.stories.map((story) => `### ${story.title}\n${story.statement}\n\nEffort: ${story.effortPoints} points`), '', '## Engineering tasks', ...plan.tasks.map((task) => `- [${task.assignedSprint ? `Sprint ${task.assignedSprint}` : 'Unallocated'}] ${task.title} (${task.effortPoints} points)`), '', '## Sprint plan', ...plan.sprints.map((sprint) => `- ${sprint.label}: ${sprint.usedPoints}/${sprint.capacity} points`)].join('\n');
}

function AdminPage() {
  const statsQuery = useGetAdminStats();
  const stats = statsQuery.data;
  if (statsQuery.isLoading) return <main className="page-wrap"><LoadingPanel label="Loading monitoring data" /></main>;
  if (statsQuery.isError || !stats) return <main className="page-wrap"><ErrorPanel onRetry={() => statsQuery.refetch()} label="Monitoring data unavailable" /></main>;
  const maxPriority = Math.max(...stats.priorityDistribution.map((item) => item.count), 1);
  return <main className="page-wrap"><div className="animate-rise mb-8"><div className="eyebrow">System observability</div><h1 className="page-title">Monitoring.</h1><p className="page-subtitle">A quiet read on how the planning engine is being used and where scope is accumulating.</p></div><div className="stat-grid animate-rise animate-rise-1 mb-6"><StatCard label="Total plans" value={stats.totalPlans} icon={FolderKanban} accent /><StatCard label="Total stories" value={stats.totalStories} icon={ListChecks} /><StatCard label="Total tasks" value={stats.totalTasks} icon={Hammer} /><StatCard label="Avg tasks / plan" value={stats.averageTasksPerPlan.toFixed(1)} detail={`${stats.completedRuns} completed runs`} icon={BarChart3} /></div><div className="grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="panel animate-rise animate-rise-2 p-5"><div className="mb-5 flex items-center justify-between"><div><div className="text-sm font-extrabold">Priority distribution</div><div className="mt-1 text-[11px] text-muted-foreground">Generated work by urgency</div></div><BarChart3 size={16} className="text-primary" /></div><div className="metric-list">{stats.priorityDistribution.map((item) => <div className="metric-row" key={item.label}><span className="text-xs text-muted-foreground">{item.label}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(item.count / maxPriority) * 100}%`, background: item.label === 'Critical' ? 'hsl(var(--destructive))' : item.label === 'High' ? 'hsl(var(--accent))' : undefined }} /></div><span className="mono text-right text-xs">{item.count}</span></div>)}</div></section><section className="panel animate-rise animate-rise-3 p-5"><div className="mb-5 flex items-center justify-between"><div><div className="text-sm font-extrabold">Sprint allocation</div><div className="mt-1 text-[11px] text-muted-foreground">Capacity across recent plans</div></div><Gauge size={16} className="text-primary" /></div><div className="metric-list">{stats.sprintAllocation.map((item) => <div key={item.sprint}><div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{item.sprint}</span><span className="mono text-muted-foreground">{item.usedPoints}/{item.capacity} pts</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${item.capacity ? Math.min((item.usedPoints / item.capacity) * 100, 100) : 0}%` }} /></div></div>)}</div></section></div><section className="panel animate-rise animate-rise-3 mt-5 overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><div><div className="text-sm font-extrabold">Recent activity</div><div className="mt-1 text-[11px] text-muted-foreground">The last planning events</div></div><Activity size={16} className="text-primary" /></div>{stats.recentActivity.length ? <div className="divide-y divide-border">{stats.recentActivity.map((item) => <div className="flex items-center gap-3 px-5 py-4" key={item.id} data-testid={`activity-${item.id}`}><div className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-primary"><Activity size={14} /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{item.action}</div><div className="mt-1 truncate text-[11px] text-muted-foreground">{item.planTitle}</div></div><div className="text-right"><StatusPill status={item.status} /><div className="mt-1 text-[10px] text-muted-foreground">{formatTime(item.createdAt)}</div></div></div>)}</div> : <div className="p-5 text-sm text-muted-foreground">No activity recorded yet.</div>}</section></main>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={OverviewPage} /><Route path="/plans/new" component={NewPlanPage} /><Route path="/plans/:id" component={PlanDetailPage} /><Route path="/plans" component={PlansPage} /><Route path="/admin" component={AdminPage} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;