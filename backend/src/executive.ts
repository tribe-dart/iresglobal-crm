import type { Request, Response } from "express";
import { TABLES } from "./aws";
import { requireExecutiveAccount } from "./auth";
import { scanAll } from "./scanAll";
import type { Contact, Quote } from "./types";

function feed<T>(result: PromiseSettledResult<{ records: T[]; syncedAt: string }>) {
  return result.status === "fulfilled"
    ? result.value
    : { records: null, syncedAt: null };
}

async function readMatryvo() {
  const key = process.env.EXECUTIVE_MATRYVO_API_KEY?.trim();
  if (!key) throw new Error("Matryvo executive key is missing.");
  const origin = process.env.MATRYVO_EXECUTIVE_API_ORIGIN || "https://api-crm.matryvo.com";
  const url = new URL("/api/executive/opportunities", origin);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["127.0.0.1", "localhost"].includes(url.hostname))) {
    throw new Error("Matryvo executive origin must use HTTPS.");
  }

  const response = await fetch(url, {
    headers: { "x-executive-api-key": key },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Matryvo executive endpoint is unavailable.");
  const payload = await response.json();
  if (!Array.isArray(payload.opportunities) || typeof payload.syncedAt !== "string" ||
      !Number.isFinite(Date.parse(payload.syncedAt))) {
    throw new Error("Invalid response from Matryvo executive endpoint.");
  }
  return { records: payload.opportunities as unknown[], syncedAt: payload.syncedAt as string };
}

const iresStages = new Set(["15%", "50%", "75%", "100%"]);

function lastComment(comments: Contact["comments"]) {
  if (!Array.isArray(comments)) return "";
  return comments.flatMap((comment) => {
    const match = typeof comment === "string" && comment.match(/^\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\]/);
    if (!match) return [];
    const date = match[1] + "T" + match[2] + ":00Z";
    return Number.isFinite(Date.parse(date)) ? [date] : [];
  }).sort().at(-1) ?? "";
}

async function readIresContacts() {
  const contacts = await scanAll<Contact>({ TableName: TABLES.CONTACTS });
  const records = contacts.filter((contact) => contact.brand === "ires" && iresStages.has(contact.stage)).map((contact) => ({
    id: contact.id,
    account: contact.company || "",
    stage: contact.stage,
    createdAt: contact.createdAt,
    lastActivity: lastComment(contact.comments),
    nextStep: Boolean(contact.nextSteps?.trim()),
  }));
  return { records, syncedAt: new Date().toISOString() };
}

async function readIresQuotes() {
  const quotes = await scanAll<Quote>({ TableName: TABLES.QUOTES });
  const records = quotes.filter((quote) => quote.brand === "ires").map((quote) => ({
    id: quote.id,
    contactId: quote.contactId,
    projectType: quote.projectType,
    amount: typeof quote.estimatedCost === "number" && Number.isFinite(quote.estimatedCost) && quote.estimatedCost >= 0 ? quote.estimatedCost : null,
    currency: quote.currency || "",
    status: quote.status,
    createdAt: quote.createdAt,
  }));
  return { records, syncedAt: new Date().toISOString() };
}

function bookingsTargets() {
  try {
    const input: unknown = JSON.parse(process.env.EXECUTIVE_BOOKINGS_TARGETS_USD || "{}");
    if (!input || typeof input !== "object") return {};
    return Object.fromEntries(Object.entries(input).filter(([quarter, value]) =>
      /^\d{4}-Q[1-4]$/.test(quarter) && typeof value === "number" && Number.isFinite(value) && value > 0));
  } catch {
    return {};
  }
}

export async function getExecutiveWorkspace(req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireExecutiveAccount(req, res)) return;
  const [matryvo, iresContacts, iresQuotes] = await Promise.allSettled([
    readMatryvo(), readIresContacts(), readIresQuotes(),
  ]);
  res.json({
    matryvo: feed(matryvo),
    iresContacts: feed(iresContacts),
    iresQuotes: feed(iresQuotes),
    bookingsTargets: bookingsTargets(),
    asOf: new Date().toISOString(),
  });
}
