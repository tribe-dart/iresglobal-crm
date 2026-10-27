const FROM = process.env.MAIL_FROM || "IRES <contact@iresglobal.com>";
const TEAM = process.env.NOTIFY_EMAIL || "contact@iresglobal.com";

export function deliverableEmail(email: string | undefined): string {
  const value = (email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "";
  if (value.endsWith("@placeholder.com") || value.endsWith("@lead.com")) return "";
  return value;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const token = process.env.RESEND_API_KEY || "";
  if (!token) {
    console.warn("mail not configured");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      reply_to: input.replyTo,
    }),
  });

  if (!response.ok) {
    console.error("mail", response.status);
  }
}

export async function notifyNewLead(contact: {
  name: string;
  email: string;
  phone?: string;
  source: string;
  stage: string;
  notes?: string;
}): Promise<void> {
  const client = deliverableEmail(contact.email);
  const summary = [
    `Name: ${contact.name}`,
    client ? `Email: ${client}` : "",
    contact.phone ? `Phone: ${contact.phone}` : "",
    `Source: ${contact.source}`,
    `Stage: ${contact.stage}`,
    "",
    contact.notes || "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  try {
    await sendEmail({
      to: TEAM,
      replyTo: client || undefined,
      subject: `New IRES lead — ${contact.name}`,
      text: summary,
    });

    if (client && client.toLowerCase() !== TEAM.toLowerCase()) {
      await sendEmail({
        to: client,
        subject: "We have your note — IRES",
        text: [
          `Hello ${contact.name},`,
          "",
          "Thank you for writing to Innovative Rammed Earth Solutions.",
          "We read your note and will be in touch within one business day.",
          "You can also reach us on WhatsApp: https://wa.me/233209669000",
          "",
          "IRES",
          "54, 5th Circular Road, Cantonments, Accra",
        ].join("\n"),
      });
    }
  } catch (error) {
    console.error("mail", error instanceof Error ? error.name : "send-failed");
  }
}

export async function notifyQuote(quote: {
  name: string;
  email: string;
  phone?: string;
  projectType: string;
  floorAreaSqM: number;
  estimatedCost: number;
  currency: string;
  specificationDetails?: string;
}): Promise<void> {
  const client = deliverableEmail(quote.email);
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: quote.currency || "USD",
    maximumFractionDigits: 0,
  }).format(quote.estimatedCost);

  const summary = [
    `Name: ${quote.name}`,
    client ? `Email: ${client}` : "",
    quote.phone ? `Phone: ${quote.phone}` : "",
    `Project: ${quote.projectType}`,
    `Floor area: ${quote.floorAreaSqM} m²`,
    `Estimate: ${money}`,
    quote.specificationDetails || "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  try {
    await sendEmail({
      to: TEAM,
      replyTo: client || undefined,
      subject: `IRES quote — ${quote.name || quote.projectType}`,
      text: summary,
    });

    if (client && client.toLowerCase() !== TEAM.toLowerCase()) {
      await sendEmail({
        to: client,
        subject: "Your IRES estimate",
        text: [
          `Hello ${quote.name},`,
          "",
          `Project: ${quote.projectType}`,
          `Floor area: ${quote.floorAreaSqM} m²`,
          `Estimate: ${money}`,
          "",
          "This is an estimate from the IRES calculator. A member of the team will follow up.",
          "You can also reach us on WhatsApp: https://wa.me/233209669000",
          "",
          "IRES",
          "54, 5th Circular Road, Cantonments, Accra",
        ].join("\n"),
      });
    }
  } catch (error) {
    console.error("mail", error instanceof Error ? error.name : "send-failed");
  }
}
