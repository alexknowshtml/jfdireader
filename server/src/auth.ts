import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { Resend } from "resend";
import type { Context, Next } from "hono";

// Config — ALLOWED_EMAILS is a comma-separated env var
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes in ms
const COOKIE_NAME = "jfdi_session";
const FROM_EMAIL = "JFDI Reader <reader@indyhall.org>";

const AUTH_SECRET = process.env.AUTH_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BASE_URL = process.env.BASE_URL || "https://reader.jfdi.bot";

// HMAC-SHA256 signing
async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const expected = await sign(payload);
  return expected === signature;
}

// Create a signed token: payload.signature
async function createToken(data: Record<string, any>): Promise<string> {
  const payload = btoa(JSON.stringify(data));
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token: string): Promise<Record<string, any> | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!(await verify(payload, sig))) return null;
  try {
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Auth middleware - skip /auth/* and /health
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip auth for auth routes, health check, and service worker
    if (
      path.startsWith("/auth/") ||
      path === "/health" ||
      path === "/sw.js" ||
      path === "/workbox-b51dd497.js" ||
      path === "/registerSW.js" ||
      path === "/manifest.webmanifest"
    ) {
      return next();
    }

    const sessionToken = getCookie(c, COOKIE_NAME);
    if (!sessionToken) {
      return c.redirect("/auth/login");
    }

    const data = await verifyToken(sessionToken);
    if (!data || !data.email || !data.exp || data.exp < Date.now()) {
      deleteCookie(c, COOKIE_NAME);
      return c.redirect("/auth/login");
    }

    return next();
  };
}

// Auth routes
export const authRouter = new Hono();

// Login page
authRouter.get("/login", (c) => {
  const error = c.req.query("error");
  return c.html(loginPage(error));
});

// Request magic link
authRouter.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string || "").toLowerCase().trim();

  if (!ALLOWED_EMAILS.includes(email)) {
    return c.redirect("/auth/login?error=not_allowed");
  }

  // Create magic link token
  const token = await createToken({
    email,
    exp: Date.now() + MAGIC_LINK_EXPIRY,
    type: "magic_link",
  });

  const magicLink = `${BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`;

  // Send email via Resend
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return c.redirect("/auth/login?error=config");
  }

  const resend = new Resend(RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Sign in to JFDI Reader",
      html: magicLinkEmail(magicLink),
    });
  } catch (err) {
    console.error("Failed to send magic link:", err);
    return c.redirect("/auth/login?error=send_failed");
  }

  return c.html(checkEmailPage(email));
});

// Verify magic link
authRouter.get("/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.redirect("/auth/login?error=invalid");

  const data = await verifyToken(token);
  if (!data || data.type !== "magic_link") {
    return c.redirect("/auth/login?error=invalid");
  }

  if (data.exp < Date.now()) {
    return c.redirect("/auth/login?error=expired");
  }

  if (!ALLOWED_EMAILS.includes(data.email)) {
    return c.redirect("/auth/login?error=not_allowed");
  }

  // Create session cookie
  const sessionToken = await createToken({
    email: data.email,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    type: "session",
  });

  setCookie(c, COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return c.redirect("/");
});

// Logout
authRouter.get("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME);
  return c.redirect("/auth/login");
});

// HTML templates
function loginPage(error?: string | null) {
  const errorMessages: Record<string, string> = {
    not_allowed: "That email isn't authorized.",
    invalid: "Invalid or corrupted link. Try again.",
    expired: "That link has expired. Request a new one.",
    config: "Server configuration error.",
    send_failed: "Failed to send email. Try again.",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Sign In - JFDI Reader</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F7F3ED;
      color: #1C1C1C;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    p { font-size: 0.875rem; color: #666; margin-bottom: 1.5rem; }
    label { font-size: 0.75rem; font-weight: 500; color: #888; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.5rem; }
    input[type="email"] {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="email"]:focus { border-color: #1C1C1C; }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #1C1C1C;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      margin-top: 1rem;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .error {
      background: #FEE;
      color: #C33;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #1C1C1C; color: #E8E4DE; }
      .card { background: #2A2A2A; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      input[type="email"] { background: #333; border-color: #444; color: #E8E4DE; }
      input[type="email"]:focus { border-color: #888; }
      button { background: #E8E4DE; color: #1C1C1C; }
      .error { background: #3A1C1C; color: #F99; }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>JFDI Reader</h1>
    <p>Sign in with a magic link sent to your email.</p>
    ${error ? `<div class="error">${errorMessages[error] || "Something went wrong."}</div>` : ""}
    <form method="POST" action="/auth/login">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required autofocus>
      <button type="submit">Send Magic Link</button>
    </form>
  </div>
</body>
</html>`;
}

function checkEmailPage(email: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Check Your Email - JFDI Reader</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F7F3ED;
      color: #1C1C1C;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      text-align: center;
    }
    .icon { font-size: 2.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #666; margin-bottom: 0.25rem; }
    .email { font-weight: 500; color: #1C1C1C; }
    .hint { font-size: 0.75rem; color: #999; margin-top: 1.5rem; }
    a { color: inherit; }
    @media (prefers-color-scheme: dark) {
      body { background: #1C1C1C; color: #E8E4DE; }
      .card { background: #2A2A2A; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .email { color: #E8E4DE; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📬</div>
    <h1>Check your email</h1>
    <p>A sign-in link was sent to</p>
    <p class="email">${email}</p>
    <p class="hint">Link expires in 15 minutes. <a href="/auth/login">Try again</a></p>
  </div>
</body>
</html>`;
}

function magicLinkEmail(link: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 20px; background: #F7F3ED;">
  <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="font-size: 18px; margin: 0 0 12px;">Sign in to JFDI Reader</h2>
    <p style="font-size: 14px; color: #666; margin: 0 0 24px;">Click the button below to sign in. This link expires in 15 minutes.</p>
    <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #1C1C1C; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Sign In</a>
    <p style="font-size: 12px; color: #999; margin: 24px 0 0;">If you didn't request this, you can ignore this email.</p>
  </div>
</body>
</html>`;
}
