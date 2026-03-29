import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { Resend } from "resend";
import type { Context, Next } from "hono";

// Config — ALLOWED_EMAILS is a comma-separated env var
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in ms
const OTP_MAX_ATTEMPTS = 5;
const COOKIE_NAME = "jfdi_session";
const FROM_EMAIL = process.env.FROM_EMAIL || "JFDI Reader <noreply@indyhall.org>";

const AUTH_SECRET = process.env.AUTH_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

// In-memory OTP store: email -> { code, expires, attempts }
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

// Cleanup expired OTPs periodically (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpStore) {
    if (entry.expires < now) otpStore.delete(email);
  }
}, 5 * 60 * 1000);

// Generate a cryptographically random 6-digit code
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

// HMAC-SHA256 signing (for session cookies)
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

async function createToken(data: Record<string, any>): Promise<string> {
  const payload = btoa(JSON.stringify(data));
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token: string): Promise<Record<string, any> | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (expected !== sig) return null;
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

// Request OTP code
authRouter.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string || "").toLowerCase().trim();

  if (!ALLOWED_EMAILS.includes(email)) {
    return c.redirect("/auth/login?error=not_allowed");
  }

  // Generate and store OTP
  const code = generateOTP();
  otpStore.set(email, { code, expires: Date.now() + OTP_EXPIRY, attempts: 0 });

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
      subject: "Your JFDI Reader sign-in code",
      html: otpEmail(code),
    });
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return c.redirect("/auth/login?error=send_failed");
  }

  return c.html(enterCodePage(email));
});

// Verify OTP code
authRouter.post("/verify", async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string || "").toLowerCase().trim();
  const code = (body.code as string || "").trim();

  if (!email || !code) {
    return c.redirect("/auth/login?error=invalid");
  }

  const entry = otpStore.get(email);

  if (!entry) {
    return c.redirect("/auth/login?error=expired");
  }

  if (entry.expires < Date.now()) {
    otpStore.delete(email);
    return c.redirect("/auth/login?error=expired");
  }

  entry.attempts++;
  if (entry.attempts > OTP_MAX_ATTEMPTS) {
    otpStore.delete(email);
    return c.redirect("/auth/login?error=too_many_attempts");
  }

  if (entry.code !== code) {
    return c.html(enterCodePage(email, "wrong_code"));
  }

  // Code is valid - clean up and create session
  otpStore.delete(email);

  if (!ALLOWED_EMAILS.includes(email)) {
    return c.redirect("/auth/login?error=not_allowed");
  }

  const sessionToken = await createToken({
    email,
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

  c.header("Location", "/");
  return c.body(null, 302);
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
    invalid: "Invalid request. Try again.",
    expired: "That code has expired. Request a new one.",
    config: "Server configuration error.",
    send_failed: "Failed to send email. Try again.",
    too_many_attempts: "Too many attempts. Request a new code.",
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
    <p>Enter your email to get a sign-in code.</p>
    ${error ? `<div class="error">${errorMessages[error] || "Something went wrong."}</div>` : ""}
    <form method="POST" action="/auth/login">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required autofocus>
      <button type="submit">Send Code</button>
    </form>
  </div>
  <script>
    const input = document.getElementById('email');
    const saved = localStorage.getItem('jfdi_email');
    if (saved) input.value = saved;
    input.closest('form').addEventListener('submit', () => {
      localStorage.setItem('jfdi_email', input.value);
    });
  </script>
</body>
</html>`;
}

function enterCodePage(email: string, error?: string | null) {
  const errorMessages: Record<string, string> = {
    wrong_code: "Wrong code. Check your email and try again.",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Enter Code - JFDI Reader</title>
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
    .email { font-weight: 500; color: #1C1C1C; margin-bottom: 1.5rem; }
    .code-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1.5rem;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.5em;
      outline: none;
      transition: border-color 0.15s;
      font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
    }
    .code-input:focus { border-color: #1C1C1C; }
    /* Hide spinner arrows on number inputs */
    .code-input::-webkit-outer-spin-button,
    .code-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .code-input { -moz-appearance: textfield; }
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
    .hint { font-size: 0.75rem; color: #999; margin-top: 1.5rem; }
    .hint a { color: inherit; }
    .error {
      background: #FEE;
      color: #C33;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
      text-align: left;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #1C1C1C; color: #E8E4DE; }
      .card { background: #2A2A2A; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .email { color: #E8E4DE; }
      .code-input { background: #333; border-color: #444; color: #E8E4DE; }
      .code-input:focus { border-color: #888; }
      button { background: #E8E4DE; color: #1C1C1C; }
      .error { background: #3A1C1C; color: #F99; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔑</div>
    <h1>Enter your code</h1>
    <p>A 6-digit code was sent to</p>
    <p class="email">${email}</p>
    ${error ? `<div class="error">${errorMessages[error] || "Something went wrong."}</div>` : ""}
    <form method="POST" action="/auth/verify">
      <input type="hidden" name="email" value="${email}">
      <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" name="code" class="code-input" placeholder="000000" required autofocus autocomplete="one-time-code">
      <button type="submit">Sign In</button>
    </form>
    <p class="hint">Code expires in 10 minutes. <a href="/auth/login">Start over</a></p>
  </div>
</body>
</html>`;
}

function otpEmail(code: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 20px; background: #F7F3ED;">
  <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="font-size: 18px; margin: 0 0 12px;">Your sign-in code</h2>
    <p style="font-size: 14px; color: #666; margin: 0 0 24px;">Enter this code in JFDI Reader to sign in.</p>
    <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em; text-align: center; padding: 16px 0; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;">${code}</div>
    <p style="font-size: 12px; color: #999; margin: 24px 0 0;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
  </div>
</body>
</html>`;
}
