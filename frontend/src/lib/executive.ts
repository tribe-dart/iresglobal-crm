export type Source = "matryvo" | "ires";
export type Scenario = "Downside" | "Base case" | "Upside";
type MatryvoOpportunity = {
  id: string;
  title: string;
  account: string;
  stage: string;
  status: "open" | "won" | "lost";
  owner: string;
  amountUSD: number | null;
  currency: string;
  probability: number | null;
  expectedClose: string;
  closedAt: string;
  createdAt: string;
  lastActivity: string;
  nextStep: boolean;
  nextStepDue: string;
  atRisk: boolean;
  region: string;
  projectType: string;
  partner: string;
  registrationExpiry: string;
  hasBOQ: boolean;
  repeat: boolean;
};
type IresContact = {
  id: string;
  account: string;
  stage: string;
  createdAt: string;
  lastActivity: string;
  nextStep: boolean;
};
type IresQuote = {
  id: string;
  contactId: string;
  projectType: string;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: string;
};
type Feed<T> = { records: T[] | null; syncedAt: string | null };

export type ExecutiveSnapshot = {
  matryvo: Feed<MatryvoOpportunity>;
  iresContacts: Feed<IresContact>;
  iresQuotes: Feed<IresQuote>;
  bookingsTargets: Record<string, number>;
  asOf: string;
};
export type Deal = MatryvoOpportunity & { source: Source; quoteId?: string; quoteStatus?: string };
export type Filters = {
  source: Source | "all";
  quarter: string;
  owner: string;
  region: string;
  projectType: string;
  partner: string;
  currency: string;
};
export type DealFilter = "owner" | "region" | "projectType" | "partner" | "currency";

export const sourceNames = { matryvo: "Matryvo", ires: "Ires Global", all: "Both CRMs" };
const day = 86_400_000;
const iresStageNames: Record<string, string> = {
  "15%": "Inquiry", "50%": "Discovery", "75%": "Proposal", "100%": "Closed",
};

export function quarterFor(date: Date) {
  return date.getUTCFullYear() + "-Q" + (Math.floor(date.getUTCMonth() / 3) + 1);
}

export function emptyFilters(quarter: string): Filters {
  return { quarter, source: "all", owner: "", region: "", projectType: "", partner: "", currency: "" };
}

export function quarters(snapshot: ExecutiveSnapshot) {
  const date = new Date(snapshot.asOf);
  const recent = Array.from({ length: 9 }, (_, i) =>
    quarterFor(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 3 * i, 1))));
  const closed = snapshot.matryvo.records?.flatMap((record) => {
    const date = new Date(record.closedAt);
    return Number.isFinite(+date) ? [quarterFor(date)] : [];
  }) ?? [];
  return Array.from(new Set([...recent, ...closed, ...Object.keys(snapshot.bookingsTargets)])).sort().reverse();
}

export function periodFor(value: string) {
  const [year, quarter] = value.split("-Q").map(Number);
  const month = (quarter - 1) * 3;
  return {
    label: "Q" + quarter + " " + year,
    start: Date.UTC(year, month, 1),
    end: Date.UTC(year, month + 3, 1),
  };
}

export function workspaceDeals(snapshot: ExecutiveSnapshot): Deal[] {
  const quotes = new Map<string, IresQuote>();
  for (const quote of snapshot.iresQuotes.records ?? []) {
    if (!quote.contactId || quote.contactId === "unassigned") continue;
    const previous = quotes.get(quote.contactId);
    const created = Date.parse(quote.createdAt);
    if (!Number.isFinite(created)) continue;
    if (!previous || created > Date.parse(previous.createdAt) ||
        (created === Date.parse(previous.createdAt) && quote.id > previous.id)) {
      quotes.set(quote.contactId, quote);
    }
  }

  const ires = (snapshot.iresContacts.records ?? []).map((contact): Deal => {
    const quote = quotes.get(contact.id);
    return {
      ...contact,
      source: "ires",
      title: quote?.projectType || contact.account || "Contact " + contact.id.slice(0, 8),
      stage: iresStageNames[contact.stage] || contact.stage,
      status: contact.stage === "100%" ? "won" : "open",
      owner: "",
      amountUSD: quote?.currency === "USD" && quote.status !== "declined" ? quote.amount : null,
      currency: quote?.currency ?? "",
      probability: null,
      expectedClose: "",
      closedAt: "",
      nextStepDue: "",
      atRisk: false,
      region: "",
      projectType: quote?.projectType ?? "",
      partner: "",
      registrationExpiry: "",
      hasBOQ: false,
      repeat: false,
      quoteId: quote?.id,
      quoteStatus: quote?.status,
    };
  });

  return [...(snapshot.matryvo.records ?? []).map((record): Deal => ({ ...record, source: "matryvo" })), ...ires];
}

export function matchesFilters(deal: Deal, filters: Filters) {
  return (filters.source === "all" || deal.source === filters.source) &&
    (!filters.owner || deal.owner === filters.owner) &&
    (!filters.region || deal.region === filters.region) &&
    (!filters.projectType || deal.projectType === filters.projectType) &&
    (!filters.partner || deal.partner === filters.partner) &&
    (!filters.currency || deal.currency === filters.currency);
}

export function sumAmounts(deals: Deal[]): number | null {
  let total = 0;
  let known = 0;
  for (const deal of deals) {
    if (deal.amountUSD === null) continue;
    total += deal.amountUSD;
    known++;
  }
  return known || !deals.length ? total : null;
}

export function wonAmount(won: Deal[], undated: number) {
  if (!won.length && undated) return null;
  return sumAmounts(won);
}

export function winRate(closed: Deal[]) {
  return closed.length ? closed.filter((deal) => deal.status === "won").length / closed.length : null;
}

export function salesCycle(won: Deal[]) {
  const days = won.flatMap((deal) => {
    const elapsed = (Date.parse(deal.closedAt) - Date.parse(deal.createdAt)) / day;
    return Number.isFinite(elapsed) && elapsed >= 0 ? [elapsed] : [];
  }).sort((a, b) => a - b);
  if (!days.length) return null;
  return (days[Math.floor((days.length - 1) / 2)] + days[Math.floor(days.length / 2)]) / 2;
}

export function share(deals: Deal[], total: number | null) {
  return total ? (sumAmounts(deals) ?? 0) / total : null;
}

export const byAmount = (a: Deal, b: Deal) => (b.amountUSD ?? -1) - (a.amountUSD ?? -1) || a.id.localeCompare(b.id);

export function isStale(deal: Deal, asOf: number) {
  const timestamps = [Date.parse(deal.lastActivity), Date.parse(deal.createdAt)].filter(Number.isFinite);
  const latest = Math.max(...timestamps);
  return Number.isFinite(latest) && asOf - latest >= 14 * day;
}

export function overdue(date: string, asOf: number) {
  return Boolean(date) && Date.parse(date.slice(0, 10)) < Math.floor(asOf / day) * day;
}

export function scenarioWeight(probability: number, scenario: Scenario) {
  const weight = probability / 100;
  if (scenario === "Downside") return Math.max(0, weight - 0.2);
  if (scenario === "Upside") return Math.min(1, weight + 0.2);
  return weight;
}

export function expectedAmount(deals: Deal[], scenario: Scenario) {
  if (deals.some((deal) => deal.amountUSD === null || deal.probability === null)) return null;
  return deals.reduce((total, deal) => total + (deal.amountUSD ?? 0) * scenarioWeight(deal.probability ?? 0, scenario), 0);
}

function actionFor(deal: Deal, asOf: number, dueInQuarter: boolean) {
  let rule: string;
  if (overdue(deal.registrationExpiry, asOf)) rule = "Review expired partner registration";
  else if (overdue(deal.nextStepDue, asOf)) rule = "Update overdue next milestone";
  else if (deal.atRisk) rule = "Review CRM risk flag";
  else if (deal.source === "matryvo" && !deal.owner) rule = "Assign a deal owner";
  else if (!deal.nextStep) rule = "Confirm a customer next step";
  else if (isStale(deal, asOf)) rule = "Review activity gap of 14+ days";
  else return null;
  return {
    deal,
    rule,
    priority: dueInQuarter ? "P1" : "P2",
    due: rule.startsWith("Review expired") ? deal.registrationExpiry : deal.nextStepDue,
  };
}

export function buildWorkspace(snapshot: ExecutiveSnapshot, deals: Deal[], filters: Filters) {
  const period = periodFor(filters.quarter);
  const asOf = Date.parse(snapshot.asOf);
  const filtered = deals.filter((deal) => matchesFilters(deal, filters));
  const open = filtered.filter((deal) => deal.status === "open").sort(byAmount);
  const matryvo = filtered.filter((deal) => deal.source === "matryvo");
  const matryvoOpen = open.filter((deal) => deal.source === "matryvo");
  const iresOpen = open.filter((deal) => deal.source === "ires");
  const matryvoAvailable = filters.source !== "ires" && snapshot.matryvo.records !== null;
  const iresAvailable = filters.source !== "matryvo" && snapshot.iresContacts.records !== null &&
    !filters.owner && !filters.region && !filters.partner &&
    (!(filters.projectType || filters.currency) || snapshot.iresQuotes.records !== null);
  const iresValuesAvailable = iresAvailable && snapshot.iresQuotes.records !== null;
  const withinQuarter = (value: string) => {
    const date = Date.parse(value);
    return date >= period.start && date < period.end;
  };
  const currentQuarter = asOf >= period.start && asOf < period.end;
  const due = matryvoOpen.filter((deal) => withinQuarter(deal.expectedClose));
  const closed = matryvo.filter((deal) => deal.status !== "open" && withinQuarter(deal.closedAt) && Date.parse(deal.closedAt) <= asOf);
  const won = closed.filter((deal) => deal.status === "won");
  const lost = closed.filter((deal) => deal.status === "lost");
  const undated = matryvo.filter((deal) => deal.status !== "open" && !deal.closedAt);
  const booked = matryvoAvailable ? wonAmount(won, undated.filter((deal) => deal.status === "won").length) : null;
  const bookedComplete = matryvoAvailable && !undated.some((deal) => deal.status === "won") && won.every((deal) => deal.amountUSD !== null);
  const segment = filters.owner || filters.region || filters.projectType || filters.partner || filters.currency;
  const target = matryvoAvailable && !segment ? snapshot.bookingsTargets[filters.quarter] ?? null : null;
  const gap = target !== null && booked !== null && bookedComplete ? Math.max(0, target - booked) : null;
  const dueValue = matryvoAvailable ? sumAmounts(due) : null;
  const coverage = currentQuarter && gap && dueValue !== null && due.every((deal) => deal.amountUSD !== null) ? dueValue / gap : null;
  const atRisk = due.filter((deal) => deal.atRisk || overdue(deal.nextStepDue, asOf) || overdue(deal.registrationExpiry, asOf));
  const stale = open.filter((deal) => isStale(deal, asOf));
  const noNext = open.filter((deal) => !deal.nextStep);
  const actions = open.flatMap((deal) => {
    const action = actionFor(deal, asOf, currentQuarter && withinQuarter(deal.expectedClose));
    return action ? [action] : [];
  }).sort((a, b) => a.priority.localeCompare(b.priority) || byAmount(a.deal, b.deal));
  return {
    period, asOf, currentQuarter, matryvoAvailable, iresAvailable, iresValuesAvailable, open, matryvo, matryvoOpen, iresOpen, due,
    dueValue, closed, won, lost, undated, booked, bookedComplete, target, gap, coverage, atRisk, stale, noNext, actions,
    matryvoValue: matryvoAvailable ? sumAmounts(matryvoOpen) : null,
    iresValue: iresValuesAvailable ? sumAmounts(iresOpen) : null,
  };
}

export type Workspace = ReturnType<typeof buildWorkspace>;

export function forecast(workspace: Workspace, scenario: Scenario) {
  if (!workspace.currentQuarter || !workspace.bookedComplete || workspace.booked === null) return null;
  const expected = expectedAmount(workspace.due, scenario);
  return expected === null ? null : workspace.booked + expected;
}

export function groupDeals(deals: Deal[], key: (deal: Deal) => string) {
  const groups = new Map<string, Deal[]>();
  for (const deal of deals) {
    const value = key(deal);
    if (!value) continue;
    const group = groups.get(value);
    if (group) group.push(deal);
    else groups.set(value, [deal]);
  }
  return groups;
}

export function sourceRecord(deal: Deal) {
  const id = encodeURIComponent(deal.id);
  return deal.source === "matryvo" ? "https://crm.matryvo.com/?opportunity=" + id : "/?contact=" + id;
}
