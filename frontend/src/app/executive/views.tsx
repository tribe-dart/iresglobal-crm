"use client";

import { ArrowUpRight } from "lucide-react";
import {
  byAmount, expectedAmount, forecast, groupDeals, overdue, salesCycle, share, sourceNames, sumAmounts, winRate, wonAmount,
  type Deal, type Filters, type Scenario, type Workspace,
} from "@/lib/executive";
import {
  DataTable, dateLabel, DealLabel, Metrics, money, Panel, percentage, SourceLink, TrajectoryChart, type DrillAction,
} from "./components";

export const sections = [
  { id: "overview", label: "CEO overview", title: "Your business. In one decisive view.",
    subtitle: "See how both pipelines are moving, where deals need attention, and what’s booked this quarter." },
  { id: "pipeline", label: "Pipeline intelligence", title: "Pipeline intelligence",
    subtitle: "See where leads progress, stall, and concentrate across both CRMs." },
  { id: "forecast", label: "Forecast & scenarios", title: "Forecast & scenarios",
    subtitle: "Trace the quarter-end outlook to recorded bookings and individual Matryvo opportunities." },
  { id: "revenue", label: "Revenue performance", title: "Revenue performance",
    subtitle: "Review CRM bookings and the availability of recognized revenue, cash, and receivables." },
  { id: "reps", label: "Rep performance", title: "Rep performance",
    subtitle: "Compare recorded outcomes, pipeline ownership, and sales cycles by Matryvo rep." },
  { id: "execution", label: "Active deal execution", title: "Active deal execution",
    subtitle: "Review milestones, bill of quantities (BOQ) evidence, and registration expiries." },
  { id: "accounts", label: "Account intelligence", title: "Account intelligence",
    subtitle: "Identify concentration and expansion opportunities among named accounts." },
  { id: "actions", label: "Executive action center", title: "Executive action center",
    subtitle: "Review the exceptions surfaced by both CRMs and open their source records." },
] as const;

type PageId = typeof sections[number]["id"];
type ViewProps = { model: Workspace; show: DrillAction };

const keyFor = (deal: Deal) => deal.source + "/" + deal.id;
const count = (amount: number, available: boolean) => available ? amount.toLocaleString("en-US") : "—";

function dealCount(length: number, one: string, many = one + "s") {
  return length.toLocaleString("en-US") + " " + (length === 1 ? one : many);
}

function itemLink(title: string, onClick: () => void) {
  return <button className="ex-link" onClick={onClick}>{title}<ArrowUpRight size={13} aria-hidden="true" /></button>;
}

function ActionTable({ model, show, limit }: ViewProps & { limit?: number }) {
  return <DataTable headings={["Priority", "Action", "Source record", "Owner", "Due", "CRM link"]}
    empty="No exceptions match these filters."
    rows={model.actions.slice(0, limit).map(({ deal, rule, priority, due }) => ({
      id: keyFor(deal),
      cells: [
        <span key="priority" className="ex-badge" data-priority={priority}>{priority}</span>,
        itemLink(rule, () => show(rule, [deal])),
        <DealLabel key="record" deal={deal} />,
        deal.owner || "—",
        dateLabel(due),
        <SourceLink key="source" deal={deal}>Open deal</SourceLink>,
      ],
    }))} />;
}

function BookingNotes({ model }: { model: Workspace }) {
  if (!model.matryvoAvailable) return <p className="ex-muted">Dated bookings are available from Matryvo.</p>;
  if (model.undated.length) return <p className="ex-muted">
    {dealCount(model.undated.length, "Matryvo deal")} lack a recorded closed-won or closed-lost transition date and are excluded from period totals.
  </p>;
  return <p className="ex-muted">Period totals use the recorded Matryvo close transition. Ires Global has no recorded close dates or signed booking amounts.</p>;
}

function SourceSummary({ model, show }: ViewProps) {
  const rows = [
    { id: "matryvo", label: "Matryvo", deals: model.matryvoOpen, value: model.matryvoValue,
      available: model.matryvoAvailable, basis: "CRM opportunity value" },
    { id: "ires", label: "Ires Global", deals: model.iresOpen, value: model.iresValue,
      available: model.iresAvailable, basis: "Latest linked USD quote estimate" },
  ];
  return <div className="ex-source-summary">
    {rows.map(({ id, label, deals, value, available, basis }) => <div key={id} className="ex-source-summary-row">
      <span className="ex-source-mark" data-source={id} />
      <div>
        <strong>{label}</strong>
        <p className="ex-muted">{basis}{available && deals.some((deal) => deal.amountUSD === null)
          ? " · " + dealCount(deals.filter((deal) => deal.amountUSD === null).length, "record") + " without a USD value" : ""}</p>
      </div>
      <div>
        <strong>{money(value)}</strong>
        <p className="ex-muted">{available ? dealCount(deals.length, id === "ires" ? "open contact" : "open opportunity", id === "ires" ? "open contacts" : "open opportunities") : "Unavailable in this view"}</p>
      </div>
      {available && <button className="ex-control ex-icon-button" aria-label={"View " + label + " open records"}
        onClick={() => show(label + " open records", deals)}><ArrowUpRight size={15} /></button>}
    </div>)}
  </div>;
}

function Overview({ model, show }: ViewProps) {
  const base = forecast(model, "Base case");
  const points = [{ time: model.period.start, value: 0 }];
  let total = 0;
  if (model.booked !== null) {
    for (const deal of [...model.won].sort((a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt))) {
      if (deal.amountUSD === null) continue;
      total += deal.amountUSD;
      points.push({ time: Date.parse(deal.closedAt), value: total });
    }
    points.push({ time: Math.min(model.asOf, model.period.end), value: total });
  }

  return <>
    <Metrics items={[
      { label: "Closed-won bookings", value: money(model.booked), note: model.target && model.bookedComplete && model.booked !== null
        ? percentage(model.booked / model.target) + " of " + money(model.target) + " target" : "Matryvo · recorded closes",
        show: model.matryvoAvailable ? () => show("Closed-won bookings", model.won) : undefined },
      { label: "Expected quarter finish", value: money(base), note: "Matryvo · base case",
        show: model.matryvoAvailable ? () => show("Forecast contributors", [...model.won, ...model.due]) : undefined },
      { label: "Open pipeline", value: count(model.open.length, model.matryvoAvailable || model.iresAvailable),
        note: [model.matryvoAvailable ? dealCount(model.matryvoOpen.length, "Matryvo opportunity", "Matryvo opportunities") : "",
          model.iresAvailable ? dealCount(model.iresOpen.length, "Ires contact") : ""].filter(Boolean).join(" · ") || "Source unavailable",
        show: () => show("Open pipeline", model.open) },
      { label: "Quarter coverage", value: model.coverage === null ? "—" : model.coverage.toFixed(1) + "×",
        note: model.gap ? money(model.dueValue) + " open / " + money(model.gap) + " gap" : "Requires a positive target gap" },
      { label: "At-risk quarter value", value: money(model.matryvoAvailable ? sumAmounts(model.atRisk) : null),
        note: model.matryvoAvailable ? dealCount(model.atRisk.length, "Matryvo deal") + " flagged" : "Matryvo forecast only", tone: "risk",
        show: model.matryvoAvailable ? () => show("At-risk quarter opportunities", model.atRisk) : undefined },
    ]} />
    <div className="ex-columns ex-split">
      <Panel title="Quarter trajectory" subtitle="Cumulative Matryvo bookings and base-case finish · USD">
        {model.booked === null ? <p className="ex-empty">No dated booking series is available for this view.</p> :
          <>
            <TrajectoryChart points={points} projected={base} target={model.target} start={model.period.start} end={model.period.end} />
            <div className="ex-chart-legend">
              <span><i /> Recorded bookings</span>
              {base !== null && <span><i data-style="dashed" /> Base-case projection</span>}
              {model.target !== null && <span><i data-style="target" /> Target {money(model.target)}</span>}
            </div>
          </>}
        <BookingNotes model={model} />
      </Panel>
      <Panel title="CEO briefing" subtitle="Signals from the selected CRM records">
        <ol className="ex-briefing">
          <li><button onClick={() => show("At-risk quarter opportunities", model.atRisk)}>
            {model.matryvoAvailable ? dealCount(model.atRisk.length, "Matryvo deal") + " at risk in " + model.period.label : "Matryvo quarter risk is unavailable"}
          </button></li>
          <li><button onClick={() => show("Open records with no next step", model.noNext)}>
            {dealCount(model.noNext.length, "open record")} without a next step
          </button></li>
          <li><button onClick={() => show("Open records without recent activity", model.stale)}>
            {dealCount(model.stale.length, "open record")} without activity for 14+ days
          </button></li>
        </ol>
      </Panel>
    </div>
    <Panel title="The three moves that matter today" subtitle="Current CRM exceptions ranked by quarter impact and recorded value">
      <ActionTable model={model} show={show} limit={3} />
    </Panel>
    <Panel title="Pipeline by CRM"><SourceSummary model={model} show={show} /></Panel>
  </>;
}

function Pipeline({ model, show }: ViewProps) {
  const month = new Date(model.asOf);
  const monthStart = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1);
  const created = model.open.filter((deal) => Date.parse(deal.createdAt) >= monthStart && Date.parse(deal.createdAt) <= model.asOf);
  const stages = [...groupDeals(model.open, (deal) => deal.source + "/" + deal.stage)].map(([id, deals]) => ({
    id, deals, name: deals[0].stage, source: deals[0].source,
  }));
  const max = Math.max(1, ...stages.map((stage) => stage.deals.length));
  const dated = model.matryvoOpen.filter((deal) => deal.nextStep && deal.nextStepDue);
  const active = model.matryvoAvailable || model.iresAvailable;
  const movement = [
    ["New open this month", created],
    ["Closed won in quarter", model.won],
    ["Closed lost in quarter", model.lost],
  ] as const;

  return <>
    <Metrics items={[
      { label: "Open pipeline", value: count(model.open.length, active), note: "All recorded close dates", show: () => show("Open pipeline", model.open) },
      { label: "Due this quarter", value: money(model.dueValue), note: model.matryvoAvailable
        ? dealCount(model.due.length, "dated Matryvo deal") : "Matryvo dates unavailable", show: () => show("Due this quarter", model.due) },
      { label: "New open this month", value: count(created.length, active), note: "Created and still open", show: () => show("New open this month", created) },
      { label: "Stale pipeline", value: count(model.stale.length, active), note: "14+ days since last recorded activity",
        show: () => show("Stale pipeline", model.stale) },
    ]} />
    <div className="ex-columns">
      <Panel title="Stage distribution" subtitle="Open records under each CRM’s stage names">
        {!stages.length && <p className="ex-empty">No open stages match these filters.</p>}
        <div className="ex-bars">{stages.map(({ id, deals, name, source }) => <button className="ex-bar-row" key={id}
          onClick={() => show(sourceNames[source] + " · " + name, deals)}>
          <span><strong>{name}</strong><small>{sourceNames[source]}</small></span>
          <span className="ex-bar-track" aria-hidden="true"><i data-source={source} style={{ width: (deals.length / max * 100) + "%" }} /></span>
          <strong>{deals.length}</strong>
        </button>)}</div>
      </Panel>
      <Panel title="Pipeline movement" subtitle="Current records and dated close transitions">
        <DataTable headings={["Movement", "Records", "Matryvo value"]} rows={movement.map(([label, deals]) => ({
          id: label, cells: [itemLink(label, () => show(label, deals)), count(deals.length, label.startsWith("New") ? active : model.matryvoAvailable),
            money(model.matryvoAvailable ? sumAmounts(deals.filter((deal) => deal.source === "matryvo")) : null)],
        }))} />
        <p className="ex-muted">Opening balances, value revisions, and close-date movements require historical snapshots.</p>
      </Panel>
    </div>
    <Panel title="Pipeline quality">
      <Metrics items={[
        { label: "Top-five deal concentration", value: percentage(share(model.matryvoOpen.slice(0, 5), model.matryvoValue)),
          note: "Share of known Matryvo pipeline value", show: () => show("Largest Matryvo opportunities", model.matryvoOpen.slice(0, 5)) },
        { label: "Dated next steps", value: percentage(model.matryvoOpen.length ? dated.length / model.matryvoOpen.length : null),
          note: "Open Matryvo deals with a next step and due date", show: () => show("Dated next steps", dated) },
        { label: "Pushed out of quarter", value: "—", note: "Close-date history unavailable" },
      ]} />
    </Panel>
    <Panel title="Open value by CRM"><SourceSummary model={model} show={show} /></Panel>
  </>;
}

const scenarios: Scenario[] = ["Downside", "Base case", "Upside"];
const scenarioNotes: Record<Scenario, string> = {
  Downside: "CRM probability minus 20 points",
  "Base case": "Recorded CRM probability",
  Upside: "CRM probability plus 20 points",
};

function Forecast({ model, show, scenario, chooseScenario }: ViewProps & { scenario: Scenario; chooseScenario: (scenario: Scenario) => void }) {
  const groups = [
    { label: "Commit", deals: model.due.filter((deal) => deal.probability !== null && deal.probability >= 75) },
    { label: "Best case", deals: model.due.filter((deal) => deal.probability !== null && deal.probability >= 40 && deal.probability < 75) },
    { label: "Early pipeline", deals: model.due.filter((deal) => deal.probability !== null && deal.probability < 40) },
    { label: "Missing probability", deals: model.due.filter((deal) => deal.probability === null) },
  ];
  const projected = forecast(model, scenario);
  const undated = model.matryvoOpen.filter((deal) => !Number.isFinite(Date.parse(deal.expectedClose)));
  return <>
    <Metrics items={[
      { label: "Quarterly bookings target", value: money(model.target), note: "Matryvo · whole-business target" },
      { label: "Closed won to date", value: money(model.booked), note: "Matryvo · dated bookings", show: () => show("Closed won to date", model.won) },
      { label: scenario + " finish", value: money(projected), note: "Booked + weighted open pipeline" },
      { label: "Remaining target gap", value: money(model.gap), note: "Target less recorded bookings", tone: "warning" },
    ]} />
    <div className="ex-columns ex-split">
      <Panel title="Forecast bridge" subtitle={model.period.label + " · Matryvo opportunities with expected close dates"}>
        {model.matryvoAvailable ? <DataTable headings={["Category", "Deals", "Open value", scenario + " weighted"]} rows={[
          ...groups.filter((group) => group.deals.length).map(({ label, deals }) => ({
            id: label, cells: [itemLink(label, () => show(label + " opportunities", deals)), deals.length, money(sumAmounts(deals)), money(expectedAmount(deals, scenario))],
          })),
          { id: "open", cells: [itemLink("Total in-quarter open", () => show("In-quarter open", model.due)), model.due.length, money(model.dueValue), money(expectedAmount(model.due, scenario))] },
          { id: "won", cells: [itemLink("Plus recorded bookings", () => show("Recorded bookings", model.won)), model.won.length, "—", money(model.booked)] },
          { id: "finish", cells: [<strong key="scenario">{scenario} finish</strong>, "—", "—", <strong key="projection">{money(projected)}</strong>] },
        ]} /> : <p className="ex-empty">Forecast requires dated Matryvo opportunities.</p>}
      </Panel>
      <Panel title="Scenario range" subtitle="Probability adjustments are capped between 0% and 100%.">
        <div className="ex-scenarios">
          {scenarios.map((name) => <button className="ex-scenario" key={name} aria-pressed={name === scenario}
            onClick={() => chooseScenario(name)}>
            <span><strong>{name}</strong><small>{scenarioNotes[name]}</small></span>
            <strong>{money(forecast(model, name))}</strong>
          </button>)}
        </div>
      </Panel>
    </div>
    <Panel title="Forecast integrity">
      <BookingNotes model={model} />
      <p className="ex-muted">Forecasts cover the active calendar quarter and require dated, valued opportunities with probabilities. The risk list is a subset of open pipeline value.</p>
      {undated.length > 0 && <p className="ex-muted">
        {itemLink(dealCount(undated.length, "open Matryvo deal") + " without an expected close date", () => show("Missing expected close dates", undated))}
        {" "}are excluded from the forecast.
      </p>}
      {model.matryvoAvailable && itemLink("Review at-risk opportunities", () => show("At-risk opportunities", model.atRisk))}
    </Panel>
  </>;
}

function Revenue({ model, show }: ViewProps) {
  const start = new Date(model.period.start);
  const months = Array.from({ length: 3 }, (_, index) => {
    const monthStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1);
    const end = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index + 1, 1);
    const label = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(monthStart);
    const deals = model.won.filter((deal) => Date.parse(deal.closedAt) >= monthStart && Date.parse(deal.closedAt) < end);
    return { label, deals, value: monthStart <= model.asOf && model.booked !== null ? sumAmounts(deals) : null };
  });
  const max = Math.max(1, ...months.map((month) => month.value ?? 0));
  return <>
    <Metrics items={[
      { label: "Recognized revenue", value: "—", note: "Finance connection required" },
      { label: "Closed-won bookings", value: money(model.booked), note: "Matryvo · dated bookings", show: () => show("Closed-won bookings", model.won) },
      { label: "Cash collected", value: "—", note: "Finance connection required" },
      { label: "Overdue receivables", value: "—", note: "Invoice aging unavailable" },
    ]} />
    <div className="ex-columns ex-split">
      <Panel title="Monthly performance" subtitle={model.period.label + " · Recorded Matryvo bookings · USD"}>
        <div className="ex-months">{months.map(({ label, value, deals }) => <button key={label} onClick={() => show(label + " bookings", deals)}>
          <strong>{money(value)}</strong>
          <span className="ex-month-track"><i style={{ height: (value === null ? 0 : 100 * value / max) + "%" }} /></span>
          <span>{label}</span>
        </button>)}</div>
      </Panel>
      <Panel title="Revenue mix" subtitle="Recognized revenue by product or service">
        <p className="ex-empty">Revenue mix is unavailable until a finance source is connected.</p>
      </Panel>
    </div>
    <Panel title="Finance controls">
      <BookingNotes model={model} />
      <p className="ex-muted">Recognition, collections, and receivables require accounting records and payment dates.</p>
    </Panel>
  </>;
}

function Reps({ model, show }: ViewProps) {
  const reps = [...groupDeals(model.matryvo, (deal) => deal.owner)].sort(([a], [b]) => a.localeCompare(b));
  const cycle = salesCycle(model.won);
  return <>
    <Metrics items={[
      { label: "Team quota attainment", value: "—", note: "Rep quota data unavailable" },
      { label: "Win rate", value: percentage(winRate(model.closed)), note: "Won / won + lost with recorded close dates", show: () => show("Dated closed opportunities", model.closed) },
      { label: "Median sales cycle", value: cycle === null ? "—" : Math.round(cycle) + " days", note: "Created to recorded win", show: () => show("Dated wins", model.won) },
      { label: "Reps with open pipeline", value: count(groupDeals(model.matryvoOpen, (deal) => deal.owner).size, model.matryvoAvailable),
        note: "Matryvo owners in the current pipeline", show: () => show("Open deals with an owner", model.matryvoOpen.filter((deal) => deal.owner)) },
    ]} />
    <Panel title="Rep scorecard" subtitle="Select a rep to review their opportunities. Ires Global contacts have no rep field.">
      <DataTable headings={["Rep", "Booked", "Open pipeline", "Win rate", "Median cycle", "Quarter risk"]}
        rows={reps.map(([owner, deals]) => {
          const wins = model.won.filter((deal) => deal.owner === owner);
          const cycle = salesCycle(wins);
          return { id: owner, cells: [
            itemLink(owner, () => show(owner + " opportunities", deals)),
            money(wonAmount(wins, model.undated.filter((deal) => deal.owner === owner && deal.status === "won").length)),
            money(sumAmounts(model.matryvoOpen.filter((deal) => deal.owner === owner))),
            percentage(winRate(model.closed.filter((deal) => deal.owner === owner))),
            cycle === null ? "—" : Math.round(cycle) + " days",
            money(sumAmounts(model.atRisk.filter((deal) => deal.owner === owner))),
          ] };
        })} />
      <BookingNotes model={model} />
    </Panel>
    <Panel title="Coaching opportunities">
      <p className="ex-muted">Review deals with missing ownership, overdue milestones, or a gap in logged activity.</p>
      {itemLink("Review flagged deals", () => show("Flagged deals", model.actions.map((action) => action.deal)))}
    </Panel>
  </>;
}

function Execution({ model, show }: ViewProps) {
  const boq = model.matryvoOpen.filter((deal) => deal.hasBOQ);
  const expired = model.matryvoOpen.filter((deal) => overdue(deal.registrationExpiry, model.asOf));
  const ranked = [...new Map([...model.actions.map((action) => action.deal), ...model.open].map((deal) => [keyFor(deal), deal])).values()];
  const active = model.matryvoAvailable || model.iresAvailable;
  return <>
    <Metrics items={[
      { label: "Active opportunities & contacts", value: count(model.open.length, active), note: "Both CRM pipelines in view", show: () => show("Active records", model.open) },
      { label: "BOQ on file", value: count(boq.length, model.matryvoAvailable), note: "Open Matryvo opportunities with BOQ evidence", show: () => show("BOQ on file", boq) },
      { label: "Expired registrations", value: count(expired.length, model.matryvoAvailable), note: "Open Matryvo opportunities", show: () => show("Expired registrations", expired) },
      { label: "No next step", value: count(model.noNext.length, active), note: "Open records missing a next step", tone: "risk", show: () => show("No next step", model.noNext) },
    ]} />
    <Panel title="Priority deal desk" subtitle="Flagged records first, then remaining deals by reported value">
      <DataTable headings={["Opportunity or contact", "Value (USD)", "Owner", "BOQ evidence", "Registration expiry", "Next milestone"]}
        rows={ranked.slice(0, 12).map((deal) => ({ id: keyFor(deal), cells: [
          <div key="record"><button className="ex-link" onClick={() => show(deal.title, [deal])}>{deal.title}</button><small>{sourceNames[deal.source]}</small></div>,
          money(deal.amountUSD), deal.owner || "—", deal.source === "ires" ? "—" : deal.hasBOQ ? "On file" : "None recorded",
          dateLabel(deal.registrationExpiry), deal.nextStep ? dateLabel(deal.nextStepDue) === "—" ? "Recorded · no due date" : dateLabel(deal.nextStepDue) : "Missing",
        ] }))} />
    </Panel>
    <div className="ex-columns">
      <Panel title="Execution health rules"><p className="ex-muted">Flags use recorded due dates, registrations, ownership, next steps, and CRM activity.</p></Panel>
      <Panel title="Escalation queue"><p className="ex-muted">Quarter-due exceptions are reviewed first.</p>
        {itemLink("View flagged deals", () => show("Escalated deals", model.actions.map((action) => action.deal)))}</Panel>
    </div>
  </>;
}

function Accounts({ model, show }: ViewProps) {
  const groups = [...groupDeals(model.open, (deal) => deal.account && deal.source + "/" + deal.account.trim().toLocaleLowerCase())]
    .map(([id, deals]) => ({ id, deals, total: sumAmounts(deals) }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.id.localeCompare(b.id));
  const matryvoGroups = groups.filter(({ deals }) => deals[0].source === "matryvo");
  const top = matryvoGroups.slice(0, 5).flatMap(({ deals }) => deals);
  const expansion = model.matryvoOpen.filter((deal) => deal.repeat);
  return <>
    <Metrics items={[
      { label: "Named accounts with open records", value: count(groups.length, model.matryvoAvailable || model.iresAvailable), note: "Distinct company names within each CRM",
        show: () => show("Named accounts with open records", groups.flatMap(({ deals }) => deals)) },
      { label: "Top-five account concentration", value: percentage(share(top, model.matryvoValue)), note: "Share of known Matryvo open value",
        show: () => show("Largest Matryvo accounts", top) },
      { label: "Expansion pipeline", value: money(model.matryvoAvailable ? sumAmounts(expansion) : null), note: "Repeat Matryvo opportunities",
        show: () => show("Expansion opportunities", expansion) },
      { label: "Executive sponsor gaps", value: "—", note: "Sponsor data unavailable" },
    ]} />
    <Panel title="Account watchlist" subtitle="Ranked by known USD value. Ires Global figures are quote estimates.">
      <DataTable headings={["Account", "CRM", "Open records", "Open value", "Last CRM activity"]}
        rows={groups.slice(0, 15).map(({ id, deals, total }) => ({ id, cells: [
          itemLink(deals[0].account, () => show(deals[0].account + " · " + sourceNames[deals[0].source], deals.sort(byAmount))),
          sourceNames[deals[0].source], deals.length, money(total),
          dateLabel(Math.max(...deals.map((deal) => Date.parse(deal.lastActivity)).filter(Number.isFinite))),
        ] }))} />
    </Panel>
    <Panel title="Relationship coverage">
      <p className="ex-muted">Use the source record to review buyers, partners, activity history, and next steps. Accounts are grouped within each CRM using its company field.</p>
    </Panel>
  </>;
}

function Actions({ model, show, filters }: ViewProps & { filters: Filters }) {
  return <>
    <Panel title="Decision queue" subtitle={"Rule-based exceptions · evaluated " + dateLabel(model.asOf) + " · " + sourceNames[filters.source]}>
      <ActionTable model={model} show={show} />
    </Panel>
    <div className="ex-columns">
      <Panel title="Work from the source record">
        <p className="ex-muted">Open a deal or contact to review evidence, update milestones, or change ownership where the CRM supports it.</p>
      </Panel>
      <Panel title="Data trust and permissions">
        <p className="ex-muted">Access requires an approved Ires Global account. Source sync shows when each CRM feed was last read. Filters use fields recorded by the source.</p>
      </Panel>
    </div>
    <Panel title="How the workspace measures pipeline">
      <p className="ex-muted">Matryvo pipeline uses current CRM-reported USD opportunity values. Ires Global pipeline uses contacts and the latest linked quote when it is in USD and has not been declined. Coverage divides dated Matryvo pipeline by the remaining bookings target.</p>
      <BookingNotes model={model} />
    </Panel>
  </>;
}

export function ExecutiveView({ section, model, show, scenario, chooseScenario, filters }: ViewProps & {
  section: PageId; scenario: Scenario; chooseScenario: (scenario: Scenario) => void; filters: Filters;
}) {
  const props = { model, show };
  switch (section) {
    case "overview": return <Overview {...props} />;
    case "pipeline": return <Pipeline {...props} />;
    case "forecast": return <Forecast {...props} scenario={scenario} chooseScenario={chooseScenario} />;
    case "revenue": return <Revenue {...props} />;
    case "reps": return <Reps {...props} />;
    case "execution": return <Execution {...props} />;
    case "accounts": return <Accounts {...props} />;
    case "actions": return <Actions {...props} filters={filters} />;
  }
}
