"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { fetchExecutive, loginAccount, logoutAccount } from "@/lib/api";
import {
  buildWorkspace, emptyFilters, iresCrmHome, periodFor, quarterFor, quarters, sourceNames, workspaceDeals,
  type DealFilter, type ExecutiveSnapshot, type Filters, type Scenario,
} from "@/lib/executive";
import { dateLabel, Drawer, type Drill } from "./components";
import { ExecutiveView, sections } from "./views";

const filterFields: { name: DealFilter; label: string; all: string }[] = [
  { name: "owner", label: "Rep", all: "All reps" },
  { name: "region", label: "Region", all: "All regions" },
  { name: "projectType", label: "Project type", all: "All projects" },
  { name: "partner", label: "Partner", all: "All partners" },
  { name: "currency", label: "Record currency", all: "All currencies" },
];
const settingsKey = "ires-executive-filters";

type Access =
  | { state: "checking" | "sign-in" | "forbidden" | "failed" }
  | { state: "ready"; data: ExecutiveSnapshot; refreshFailed?: boolean };

function getSection() {
  const slug = window.location.hash.slice(1);
  return sections.find((section) => section.id === slug)?.id ?? "overview";
}
function listenForNavigation(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}
const initialSection = () => "overview" as const;

function savedFilters(snapshot: ExecutiveSnapshot): Filters {
  const defaults = emptyFilters(quarterFor(new Date(snapshot.asOf)));
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(settingsKey) || "{}");
    if (!saved || typeof saved !== "object") return defaults;
    for (const key of ["owner", "region", "projectType", "partner", "currency"] as const) {
      if (typeof saved[key] === "string") defaults[key] = saved[key];
    }
    if (saved.source === "matryvo" || saved.source === "ires") defaults.source = saved.source;
    if (quarters(snapshot).includes(saved.quarter)) defaults.quarter = saved.quarter;
  } catch {
    // The workspace also works when browser storage is disabled.
  }
  return defaults;
}

function WorkspaceBrand() {
  return <div className="ex-brand">
    <span>MATRYVO <i>+</i> IRES GLOBAL</span>
    <small>CEO Intelligence Workspace</small>
  </div>;
}

function FeedStatus({ label, at, asOf, refreshFailed }: {
  label: string; at: string | null; asOf: string; refreshFailed?: boolean;
}) {
  const stale = at && (refreshFailed || Date.parse(asOf) - Date.parse(at) > 15 * 60_000);
  const time = at ? new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(at)) + " UTC" : "Unavailable";
  return <div className="ex-feed">
    <span className="ex-dot" data-status={at ? stale ? "stale" : "live" : "unavailable"} />
    <span><strong>{label}</strong><small>{stale ? "Last synced · " : ""}{time}</small></span>
  </div>;
}

function Dashboard({ snapshot, refresh, refreshing, refreshFailed, signOut }: {
  snapshot: ExecutiveSnapshot; refresh: () => void; refreshing: boolean; refreshFailed?: boolean;
  signOut: () => Promise<void>;
}) {
  const section = useSyncExternalStore(listenForNavigation, getSection, initialSection);
  const active = sections.find((item) => item.id === section) ?? sections[0];
  const [filters, setFilters] = useState(() => savedFilters(snapshot));
  const [scenario, setScenario] = useState<Scenario>("Base case");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSignOutError(false);
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  }
  const deals = useMemo(() => workspaceDeals(snapshot), [snapshot]);
  const model = useMemo(() => buildWorkspace(snapshot, deals, filters), [snapshot, deals, filters]);
  const hasFilters = filters.source !== "all" || filters.quarter !== quarterFor(new Date(snapshot.asOf)) ||
    filterFields.some(({ name }) => Boolean(filters[name]));
  const visibleDeals = filters.source === "all" ? deals : deals.filter((deal) => deal.source === filters.source);

  function updateFilters(next: Filters) {
    setFilters(next);
    setDrill(null);
    try { window.sessionStorage.setItem(settingsKey, JSON.stringify(next)); } catch {}
  }

  return <div className="ex-shell">
    <a className="ex-skip" href="#executive-content" onClick={(event) => {
      event.preventDefault();
      document.getElementById("executive-content")?.focus();
    }}>Skip to content</a>
    <aside className="ex-sidebar">
      <WorkspaceBrand />
      <nav aria-label="Executive views">
        {sections.map(({ id, label }, index) => <a href={"#" + id} key={id}
          aria-current={active.id === id ? "page" : undefined} onClick={() => setDrill(null)}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{label}
        </a>)}
      </nav>
      <div className="ex-sidebar-footer">
        <p className="ex-overline">Source sync</p>
        <FeedStatus label="Matryvo" at={snapshot.matryvo.syncedAt} asOf={snapshot.asOf} refreshFailed={refreshFailed} />
        <FeedStatus label="Ires Global contacts" at={snapshot.iresContacts.syncedAt} asOf={snapshot.asOf} refreshFailed={refreshFailed} />
        <FeedStatus label="Ires Global quotes" at={snapshot.iresQuotes.syncedAt} asOf={snapshot.asOf} refreshFailed={refreshFailed} />
        <Link className="ex-return" href={iresCrmHome}><ArrowLeft size={14} /> Return to Ires Global CRM</Link>
        <button className="ex-return" type="button" disabled={refreshing || signingOut}
          onClick={() => void handleSignOut()}><LogOut size={14} /> {signingOut ? "Signing out…" : "Sign out"}</button>
        {signOutError && <small role="alert">Could not sign out. Try again.</small>}
      </div>
    </aside>

    <main id="executive-content" className="ex-main" tabIndex={-1}>
      <header className="ex-header">
        <div className="ex-header-line">
          <p className="ex-overline">Workspace <span>/</span> Executive analytics</p>
          <div className="ex-header-meta">
            <span>{periodFor(filters.quarter).label} <i /> USD <i /> As of {dateLabel(snapshot.asOf)}</span>
            <button className="ex-control ex-refresh" onClick={refresh} disabled={refreshing || signingOut}>
              <RefreshCw size={14} aria-hidden="true" /> {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <h1>{active.title}</h1>
        <p className="ex-subtitle">{active.subtitle}</p>
      </header>

      <div className="ex-filters" aria-label="Workspace filters">
        <div className="ex-filter">
          <label htmlFor="ex-filter-crm">CRM</label>
          <select id="ex-filter-crm" value={filters.source} onChange={(event) => updateFilters({
            ...emptyFilters(filters.quarter), source: event.target.value as Filters["source"],
          })}>
            <option value="all">Both CRMs</option><option value="matryvo">Matryvo</option><option value="ires">Ires Global</option>
          </select>
        </div>
        <div className="ex-filter">
          <label htmlFor="ex-filter-quarter">Calendar quarter</label>
          <select id="ex-filter-quarter" value={filters.quarter} onChange={(event) => updateFilters({ ...filters, quarter: event.target.value })}>
            {quarters(snapshot).map((quarter) => <option value={quarter} key={quarter}>{periodFor(quarter).label}</option>)}
          </select>
        </div>
        {filterFields.map(({ name, label, all }) => {
          const options = [...new Set(visibleDeals.map((deal) => deal[name]).filter(Boolean))].sort();
          if (filters[name] && !options.includes(filters[name])) options.unshift(filters[name]);
          return <div className="ex-filter" key={name}>
            <label htmlFor={"ex-filter-" + name}>{label}</label>
            <select id={"ex-filter-" + name} value={filters[name]} disabled={!options.length}
              onChange={(event) => updateFilters({ ...filters, [name]: event.target.value })}>
              <option value="">{all}</option>
              {options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>;
        })}
        {hasFilters && <button className="ex-link ex-reset" onClick={() => updateFilters(emptyFilters(quarterFor(new Date(snapshot.asOf))))}>
          Reset filters
        </button>}
      </div>

      {refreshFailed && <p className="ex-notice" role="alert">Refresh failed. The workspace shows the last successful response.</p>}
      {(snapshot.matryvo.records === null || snapshot.iresContacts.records === null || snapshot.iresQuotes.records === null) &&
        <p className="ex-notice" role="status">Some CRM data is unavailable. Check source sync and try Refresh.</p>}

      <ExecutiveView section={active.id} model={model} filters={filters}
        scenario={scenario} chooseScenario={setScenario} show={(title, records) => setDrill({ title, deals: records })} />

      <footer className="ex-footer">
        <span>Matryvo + Ires Global <i /> {sourceNames[filters.source]} <i /> Calendar quarters · UTC</span>
        <span>Executive analytics</span>
      </footer>
    </main>
    {drill && <Drawer drill={drill} dismiss={() => setDrill(null)} />}
  </div>;
}

function SignIn({ success }: { success: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAccount(email, password);
      success();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in failed. Try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return <form className="ex-login" onSubmit={handleSubmit}>
    <h1>Sign in to the executive workspace</h1>
    <p className="ex-muted">Use your Ires Global CRM account with executive access.</p>
    <label>Email<input type="email" autoComplete="username" value={email}
      onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Password<input type="password" autoComplete="current-password" value={password}
      onChange={(event) => setPassword(event.target.value)} required /></label>
    {error && <p className="ex-notice" role="alert">{error}</p>}
    <button className="ex-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ArrowUpRight size={15} /></button>
  </form>;
}

export default function ExecutiveWorkspace() {
  const [access, setAccess] = useState<Access>({ state: "checking" });
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchExecutive(controller.signal).then((response) => {
      if (active) setAccess(response);
    }).catch(() => {
      if (active) setAccess((previous) => previous.state === "ready"
        ? { ...previous, refreshFailed: true }
        : { state: "failed" });
    }).finally(() => {
      if (active) setRefreshing(false);
    });
    return () => { active = false; controller.abort(); };
  }, [revision]);

  if (access.state === "ready") {
    return <Dashboard snapshot={access.data} refresh={refresh} refreshing={refreshing} refreshFailed={access.refreshFailed}
      signOut={async () => {
        await logoutAccount();
        setAccess({ state: "sign-in" });
      }} />;
  }

  return <div className="ex-shell ex-access">
    <aside className="ex-sidebar"><WorkspaceBrand />
      <Link className="ex-return" href={iresCrmHome}><ArrowLeft size={14} /> Return to Ires Global CRM</Link>
    </aside>
    <main className="ex-gate">
      <div className="ex-gate-card">
        <div className="ex-gate-icon"><ShieldCheck size={23} /></div>
        {access.state === "sign-in" && <SignIn success={refresh} />}
        {access.state === "checking" && <p role="status">Checking executive access…</p>}
        {access.state === "forbidden" && <>
          <h1>Executive access required</h1>
          <p className="ex-muted">Ask your CRM administrator to enable access for your account.</p>
        </>}
        {access.state === "failed" && <>
          <h1>The executive workspace is unavailable</h1>
          <p className="ex-muted">The CRM didn’t return a dashboard response. Try again.</p>
          <button className="ex-primary" disabled={refreshing} onClick={refresh}>{refreshing ? "Checking…" : "Try again"}</button>
        </>}
      </div>
    </main>
  </div>;
}
