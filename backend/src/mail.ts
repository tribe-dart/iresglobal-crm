const FROM = process.env.MAIL_FROM || "IRES <contact@iresglobal.com>";
const TEAM = process.env.NOTIFY_EMAIL || "contact@iresglobal.com";

export function deliverableEmail(email: string | undefined): string {
  const value = (email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "";
  if (value.endsWith("@placeholder.com") || value.endsWith("@lead.com")) return "";
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function confirmationHtml(name: string, confirmUrl: string): string {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(confirmUrl);
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6efe4;">
    <div style="display:none;max-height:0;overflow:hidden;color:#f6efe4;">Confirm your email to finish your IRES account. This link expires in 24 hours.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6efe4;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fdfbf7;border:1px solid #e5d6c1;">
            <tr>
              <td style="background:#9c5b34;height:6px;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:#3d5a47;height:6px;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 36px 8px;font-family:Georgia,'Times New Roman',serif;color:#3f2c19;">
                <p style="margin:0;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;color:#9c5b34;">IRES</p>
                <h1 style="margin:14px 0 0;font-size:32px;line-height:1.15;font-weight:normal;color:#3f2c19;">Confirm your email.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#40301f;">
                <p style="margin:0;">Hello ${safeName},</p>
                <p style="margin:14px 0 0;">Finish creating your IRES account. After you confirm, you can open the CRM or stay on the website. It is the same login either way.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td bgcolor="#3f2c19" style="background:#3f2c19;border-radius:4px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fdfbf7;text-decoration:none;">Confirm your email</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b5742;">
                <p style="margin:0;">This link expires in 24 hours. If the button does not open, copy this address into your browser:</p>
                <p style="margin:10px 0 0;word-break:break-all;"><a href="${safeUrl}" style="color:#9c5b34;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b5742;">
                <p style="margin:0;color:#3f2c19;font-family:Georgia,'Times New Roman',serif;font-size:16px;">Earth becomes home.</p>
                <p style="margin:8px 0 0;">Innovative Rammed Earth Solutions<br>54, 5th Circular Road, Cantonments, Accra<br><a href="mailto:contact@iresglobal.com" style="color:#9c5b34;text-decoration:none;">contact@iresglobal.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<boolean> {
  const token = process.env.RESEND_API_KEY || "";
  if (!token) {
    console.warn("mail not configured");
    return false;
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
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!response.ok) {
    console.error("mail", response.status);
    return false;
  }
  return true;
}

export function sendAccountConfirmation(input: {
  email: string;
  name: string;
  confirmUrl: string;
}): Promise<boolean> {
  const name = input.name.trim() || "there";
  return sendEmail({
    to: input.email,
    subject: "Confirm your IRES account",
    text: [
      `Hello ${name},`,
      "",
      "Confirm your email to finish creating your IRES account.",
      "After you confirm, you can open the CRM or stay on the website.",
      "",
      input.confirmUrl,
      "",
      "This link expires in 24 hours.",
      "",
      "IRES",
      "Innovative Rammed Earth Solutions",
      "54, 5th Circular Road, Cantonments, Accra",
    ].join("\n"),
    html: confirmationHtml(name, input.confirmUrl),
  });
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
