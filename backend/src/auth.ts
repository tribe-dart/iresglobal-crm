import { createHmac, randomBytes, scrypt, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { Request, Response, NextFunction } from "express";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "./aws";
import { sendAccountConfirmation } from "./mail";

const scryptAsync = promisify(scrypt);
const COOKIE = "ires_session";
const CONFIRM_PAGE = "https://iresglobal.com/confirm.html";

type SessionUser = { email: string; name: string };

type UserRecord = {
  email: string;
  name: string;
  passwordSalt: string;
  passwordHash: string;
  confirmed: boolean;
  confirmTokenHash?: string;
  confirmExpires?: string;
};

function secret(): string {
  return process.env.AUTH_SECRET || "";
}

function b64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

export function signSession(user: SessionUser): string {
  const body = b64url(JSON.stringify({ email: user.email, name: user.name, exp: Date.now() + 14 * 24 * 60 * 60 * 1000 }));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token: string): SessionUser | null {
  if (!token || !secret()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return { email: payload.email, name: payload.name || "" };
  } catch {
    return null;
  }
}

function tokenFromRequest(req: Request): string {
  const raw = req.headers.cookie || "";
  const part = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`));
  if (!part) return "";
  return decodeURIComponent(part.slice(COOKIE.length + 1));
}

export function sessionCookie(token: string, clear = false): string {
  return [
    `${COOKIE}=${clear ? "" : encodeURIComponent(token)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Domain=.iresglobal.com",
    clear ? "Max-Age=0" : "Max-Age=1209600",
  ].join("; ");
}

async function checkPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const next = (await scryptAsync(password, salt, 32)) as Buffer;
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function getUser(email: string): Promise<UserRecord | null> {
  const result = await docClient.send(new GetCommand({ TableName: TABLES.USERS, Key: { email } }));
  return (result.Item as UserRecord) || null;
}

function cleanEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

async function issueConfirmation(user: { email: string; name: string }): Promise<boolean> {
  const token = randomBytes(32).toString("base64url");
  const confirmExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLES.USERS,
    Key: { email: user.email },
    UpdateExpression: "SET confirmTokenHash = :hash, confirmExpires = :exp, updatedAt = :now",
    ExpressionAttributeValues: {
      ":hash": hashToken(token),
      ":exp": confirmExpires,
      ":now": new Date().toISOString(),
    },
  }));
  return sendAccountConfirmation({
    email: user.email,
    name: user.name,
    confirmUrl: `${CONFIRM_PAGE}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`,
  });
}

const OPEN = new Set([
  "POST /api/auth/signup",
  "POST /api/auth/login",
  "POST /api/auth/confirm",
  "POST /api/auth/logout",
  "GET /api/auth/me",
  "POST /api/integrations/meta-lead",
  "POST /api/integrations/google-form",
]);

export function requireAccount(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/health" || OPEN.has(`${req.method} ${req.path}`)) {
    next();
    return;
  }
  if (!req.path.startsWith("/api/")) {
    next();
    return;
  }
  const user = readSession(tokenFromRequest(req));
  if (!user) {
    res.status(401).json({ success: false, error: "Sign in required." });
    return;
  }
  next();
}

export function registerAuth(app: import("express").Express): void {
  app.post("/api/auth/signup", async (_req, res) => {
    res.status(403).json({ success: false, error: "Accounts are not open for signup." });
  });

  app.post("/api/auth/confirm", async (req, res) => {
    try {
      const token = String(req.body.token || "");
      if (!token || !secret()) {
        res.status(400).json({ success: false, error: "This confirmation link is not valid." });
        return;
      }
      const email = cleanEmail(req.body.email);
      if (!validEmail(email)) {
        res.status(400).json({ success: false, error: "Open the confirmation link from your email again." });
        return;
      }
      const user = await getUser(email);
      if (!user || !user.confirmTokenHash || !user.confirmExpires) {
        res.status(400).json({ success: false, error: "This confirmation link is not valid." });
        return;
      }
      const given = Buffer.from(hashToken(token));
      const stored = Buffer.from(user.confirmTokenHash);
      const tokenMatches = given.length === stored.length && timingSafeEqual(given, stored);
      if (user.confirmExpires < new Date().toISOString() || !tokenMatches) {
        res.status(400).json({ success: false, error: "This confirmation link has expired. Sign up again to get a new one." });
        return;
      }
      await docClient.send(new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { email: user.email },
        UpdateExpression: "SET confirmed = :yes, updatedAt = :now REMOVE confirmTokenHash, confirmExpires",
        ExpressionAttributeValues: { ":yes": true, ":now": new Date().toISOString() },
      }));
      const session = signSession({ email: user.email, name: user.name });
      res.setHeader("Set-Cookie", sessionCookie(session));
      res.json({ success: true, user: { email: user.email, name: user.name } });
    } catch (error) {
      console.error("confirm", error instanceof Error ? error.name : "failed");
      res.status(500).json({ success: false, error: "We could not confirm that email." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = cleanEmail(req.body.email);
      const password = String(req.body.password || "");
      const user = validEmail(email) ? await getUser(email) : null;
      const matches = user ? await checkPassword(password, user.passwordSalt, user.passwordHash) : false;
      if (!user || !matches) {
        res.status(401).json({ success: false, error: "That email and password do not match." });
        return;
      }
      if (!user.confirmed) {
        await issueConfirmation(user);
        res.status(403).json({ success: false, error: "Confirm your email first. We sent a new link." });
        return;
      }
      res.setHeader("Set-Cookie", sessionCookie(signSession({ email: user.email, name: user.name })));
      res.json({ success: true, user: { email: user.email, name: user.name } });
    } catch (error) {
      console.error("login", error instanceof Error ? error.name : "failed");
      res.status(500).json({ success: false, error: "We could not sign you in." });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.setHeader("Set-Cookie", sessionCookie("", true));
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = readSession(tokenFromRequest(req));
    if (!user) {
      res.status(401).json({ success: false, error: "Sign in required." });
      return;
    }
    res.json({ success: true, user });
  });
}
