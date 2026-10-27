import {
  Contact,
  Quote,
  DiscoveryQuestionnaire,
  StageType,
  CreateQuoteInput,
  DiscoveryResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://52.18.201.50:5002";

export type Account = { email: string; name: string };

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
}

export async function fetchMe(): Promise<Account | null> {
  const res = await request("/api/auth/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

export async function loginAccount(email: string, password: string): Promise<Account> {
  const res = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not sign in.");
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
}

export async function fetchContacts(brand?: string, stage?: string): Promise<Contact[]> {
  const params = new URLSearchParams();
  if (brand && brand !== "all") params.append("brand", brand);
  if (stage && stage !== "all") params.append("stage", stage);

  const res = await request(`/api/contacts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch contacts");
  const data = await res.json();
  return data.contacts || [];
}

export async function createContact(contactData: Partial<Contact>): Promise<Contact> {
  const res = await request("/api/contacts", {
    method: "POST",
    body: JSON.stringify(contactData),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  const data = await res.json();
  return data.contact;
}

export async function updateContactStage(id: string, stage: StageType): Promise<Contact> {
  const res = await request(`/api/contacts/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error("Failed to update contact stage");
  const data = await res.json();
  return data.contact;
}

export async function addContactComment(id: string, comment: string): Promise<Contact> {
  const res = await request(`/api/contacts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  const data = await res.json();
  return data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  const res = await request(`/api/contacts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete contact");
}

export async function fetchQuotes(contactId?: string): Promise<Quote[]> {
  const path = contactId ? `/api/quotes?contactId=${contactId}` : "/api/quotes";
  const res = await request(path);
  if (!res.ok) throw new Error("Failed to fetch quotes");
  const data = await res.json();
  return data.quotes || [];
}

export async function createQuote(quoteData: CreateQuoteInput): Promise<Quote> {
  const res = await request("/api/quotes", {
    method: "POST",
    body: JSON.stringify(quoteData),
  });
  if (!res.ok) throw new Error("Failed to create quote");
  const data = await res.json();
  return data.quote;
}

export async function submitDiscovery(formData: Partial<DiscoveryQuestionnaire>): Promise<DiscoveryResponse> {
  const res = await request("/api/discovery/submit", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error("Failed to submit questionnaire");
  return res.json();
}

export async function uploadAttachment(file: File): Promise<{ fileUrl: string; fileName: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await request("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to upload attachment");
  return res.json();
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/api/export/csv`;
}
