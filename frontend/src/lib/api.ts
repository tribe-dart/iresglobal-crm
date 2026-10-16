import {
  Contact,
  Quote,
  DiscoveryQuestionnaire,
  StageType,
  CreateQuoteInput,
  DiscoveryResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://52.18.201.50:5002";

export async function fetchContacts(brand?: string, stage?: string): Promise<Contact[]> {
  const params = new URLSearchParams();
  if (brand && brand !== "all") params.append("brand", brand);
  if (stage && stage !== "all") params.append("stage", stage);

  const res = await fetch(`${API_BASE}/api/contacts?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch contacts");
  const data = await res.json();
  return data.contacts || [];
}

export async function createContact(contactData: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${API_BASE}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contactData),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  const data = await res.json();
  return data.contact;
}

export async function updateContactStage(id: string, stage: StageType): Promise<Contact> {
  const res = await fetch(`${API_BASE}/api/contacts/${id}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error("Failed to update contact stage");
  const data = await res.json();
  return data.contact;
}

export async function addContactComment(id: string, comment: string): Promise<Contact> {
  const res = await fetch(`${API_BASE}/api/contacts/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  const data = await res.json();
  return data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contact");
}

export async function fetchQuotes(contactId?: string): Promise<Quote[]> {
  const url = contactId ? `${API_BASE}/api/quotes?contactId=${contactId}` : `${API_BASE}/api/quotes`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch quotes");
  const data = await res.json();
  return data.quotes || [];
}

export async function createQuote(quoteData: CreateQuoteInput): Promise<Quote> {
  const res = await fetch(`${API_BASE}/api/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quoteData),
  });
  if (!res.ok) throw new Error("Failed to create quote");
  const data = await res.json();
  return data.quote;
}

export async function submitDiscovery(formData: Partial<DiscoveryQuestionnaire>): Promise<DiscoveryResponse> {
  const res = await fetch(`${API_BASE}/api/discovery/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error("Failed to submit questionnaire");
  return res.json();
}

export async function uploadAttachment(file: File): Promise<{ fileUrl: string; fileName: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload attachment");
  return res.json();
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/api/export/csv`;
}
