import fetch from "node-fetch";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // max submissions per IP per window
const rateLimitMap = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // Rate limiting
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const recent = requests.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);

  const { turnstileToken, fullName, dob, phone, email, address, city, state, zip } = req.body;

  // Validate Turnstile
  const secretKey = process.env.TURNSTILE_SECRET_KEY; // set in Vercel env
  if (!turnstileToken || !secretKey) {
    return res.status(400).json({ error: "Missing Turnstile token or secret" });
  }

  try {
    const cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: turnstileToken,
        remoteip: ip
      })
    });
    const cfData = await cfRes.json();
    if (!cfData.success) {
      return res.status(400).json({ error: "CAPTCHA validation failed" });
    }
  } catch (err) {
    return res.status(500).json({ error: "CAPTCHA verification error" });
  }

  // Normalize input
  const sanitized = {
    fullName: String(fullName || "").trim(),
    dob: String(dob || "").trim(),
    phone: phone ? String(phone).replace(/\D/g, "") : "",
    email: String(email || "").trim().toLowerCase(),
    address: String(address || "").trim(),
    city: String(city || "").trim(),
    state: String(state || "").trim(),
    zip: zip ? String(zip).replace(/\D/g, "") : "",
    ip,
    timestamp: new Date().toISOString()
  };

  // Minimal validation
  if (!sanitized.fullName || !sanitized.phone || !sanitized.email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // TODO: Replace with your actual storage / lead submission logic
    console.log("Received lead:", sanitized);

    return res.status(200).json({ message: "Lead submitted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

