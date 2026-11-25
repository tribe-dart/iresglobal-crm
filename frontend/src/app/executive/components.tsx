"use client";

import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { sourceNames, sourceRecord, type Deal } from "@/lib/executive";

const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const full = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function money(value: number | null, precise = false) {
  return value === null ? "—" : (precise ? full : compact).format(value);
}

export function percentage(value: number | null) {
  return value === null ? "—" : Math.round(value * 100) + "%";
}

export function dateLabel(value: string | number) {
  const date = new Date(value);
  return Number.isFinite(+date) ? shortDate.format(date) : "—";
}

type Metric = {
  label: string;
  value: ReactNode;
  note: ReactNode;
  tone?: "risk" | "warning";
  show?: () => void;
};

export function Metrics({ items }: { items: Metric[] }) {
  return <div className="ex-metrics">
    {items.map(({ label, value, note, tone, show }) => {
      const content = <>
        <span className="ex-metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="ex-metric-note" data-tone={tone}>{note}</span>
      </>;
      return show
        ? <button key={label} className="ex-metric" onClick={show}>{content}<ArrowDownRight size={14} aria-hidden="true" /></button>
        : <div key={label} className="ex-metric">{content}</div>;
    })}
  </div>;
}

export function Panel({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={"ex-panel " + className}>
    <h2>{title}</h2>
    {subtitle && <p className="ex-muted ex-panel-intro">{subtitle}</p>}
    {children}
  </section>;
}

export function DataTable({ headings, rows, empty = "No records match these filters." }: {
  headings: string[];
  rows: { id: string; cells: ReactNode[] }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="ex-empty">{empty}</p>;
  return <div className="ex-table-scroll">
    <table>
      <thead><tr>{headings.map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{rows.map(({ id, cells }) => (
        <tr key={id}>{cells.map((cell, index) => <td key={headings[index]}>{cell}</td>)}</tr>
      ))}</tbody>
    </table>
  </div>;
}

export type Drill = { title: string; deals: Deal[] };
export type DrillAction = (title: string, deals: Deal[]) => void;

export function SourceLink({ deal, children }: { deal: Deal; children?: ReactNode }) {
  return <a className="ex-link" href={sourceRecord(deal)} target="_blank" rel="noreferrer">
    {children ?? "Open in " + sourceNames[deal.source]} <ArrowUpRight size={13} aria-hidden="true" />
  </a>;
}

export function DealLabel({ deal }: { deal: Deal }) {
  return <><strong>{deal.title}</strong><small>{sourceNames[deal.source]} · {deal.id}</small></>;
}

export function Drawer({ drill, dismiss }: { drill: Drill; dismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return <dialog className="ex-drawer" ref={ref} aria-labelledby="ex-drawer-title"
    onCancel={(event) => { event.preventDefault(); dismiss(); }}>
    <div className="ex-drawer-inner">
      <header className="ex-drawer-header">
        <div>
          <p className="ex-overline">CRM records</p>
          <h2 id="ex-drawer-title">{drill.title}</h2>
          <p className="ex-muted">{drill.deals.length} matching {drill.deals.length === 1 ? "record" : "records"}</p>
        </div>
        <button className="ex-control ex-icon-button" onClick={dismiss} aria-label="Close records"><X size={19} /></button>
      </header>
      {!drill.deals.length && <p className="ex-empty">No records match these filters.</p>}
      {drill.deals.map((deal) => <article className="ex-record" key={deal.source + "/" + deal.id}>
        <div className="ex-record-top"><h3>{deal.title}</h3><strong>{money(deal.amountUSD, true)}</strong></div>
        <p className="ex-muted">{sourceNames[deal.source]} · {deal.stage} · {deal.id}</p>
        <dl>
          <div><dt>Account</dt><dd>{deal.account || "—"}</dd></div>
          <div><dt>Owner</dt><dd>{deal.owner || "—"}</dd></div>
          <div><dt>{deal.status === "open" ? "Expected close" : "Recorded close"}</dt><dd>{dateLabel(deal.expectedClose || deal.closedAt)}</dd></div>
          <div><dt>Last activity</dt><dd>{dateLabel(deal.lastActivity)}</dd></div>
          {deal.status === "open" && <div><dt>Next milestone</dt><dd>
            {deal.nextStepDue ? dateLabel(deal.nextStepDue) : deal.nextStep ? "Recorded · no due date" : "Missing"}
          </dd></div>}
          {deal.registrationExpiry && <div><dt>Registration expiry</dt><dd>{dateLabel(deal.registrationExpiry)}</dd></div>}
          {deal.quoteStatus && <div><dt>Quote status</dt><dd>{deal.quoteStatus}</dd></div>}
        </dl>
        <SourceLink deal={deal} />
      </article>)}
    </div>
  </dialog>;
}

type ChartPoint = { time: number; value: number };

export function TrajectoryChart({ points, projected, target, start, end }: {
  points: ChartPoint[];
  projected: number | null;
  target: number | null;
  start: number;
  end: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx || width < 140) return;
      ctx.scale(scale, scale);
      const left = 56;
      const right = width - 18;
      const top = 23;
      const bottom = height - 35;
      const max = Math.max(1, target ?? 0, projected ?? 0, ...points.map((point) => point.value));
      const increment = 10 ** Math.floor(Math.log10(max / 4));
      const ceiling = max === 1 ? 1 : 4 * increment * Math.ceil(max / (4 * increment));
      const x = (time: number) => left + (time - start) / (end - start) * (right - left);
      const y = (value: number) => bottom - value / ceiling * (bottom - top);
      ctx.font = "11px system-ui";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const value = ceiling * i / 4;
        ctx.strokeStyle = "#dce6ef";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, y(value));
        ctx.lineTo(right, y(value));
        ctx.stroke();
        ctx.fillStyle = "#53667e";
        ctx.textAlign = "right";
        ctx.fillText(money(value), left - 9, y(value));
      }
      ctx.fillStyle = "#53667e";
      ctx.textAlign = "center";
      for (let i = 0; i <= 4; i++) {
        const time = start + (end - start) * i / 4;
        ctx.fillText(dateLabel(i === 4 ? time - 1 : time), x(time), bottom + 20);
      }
      if (target !== null) {
        ctx.strokeStyle = "#bd8421";
        ctx.beginPath();
        ctx.moveTo(left, y(target));
        ctx.lineTo(right, y(target));
        ctx.stroke();
      }
      const last = points.at(-1);
      if (!last) return;
      ctx.strokeStyle = "#007d8a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(x(point.time), y(point.value));
        else {
          ctx.lineTo(x(point.time), y(points[index - 1].value));
          ctx.lineTo(x(point.time), y(point.value));
        }
      });
      ctx.stroke();
      ctx.fillStyle = "#007d8a";
      ctx.beginPath();
      ctx.arc(x(last.time), y(last.value), 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (projected !== null) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x(last.time), y(last.value));
        ctx.lineTo(x(end), y(projected));
        ctx.stroke();
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [points, projected, target, start, end]);

  return <canvas className="ex-trajectory" ref={ref} role="img"
    aria-label={"Cumulative bookings " + money(points.at(-1)?.value ?? null, true) +
      ", projected finish " + money(projected, true) + ", target " + money(target, true)} />;
}
