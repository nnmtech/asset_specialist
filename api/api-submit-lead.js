// File: /api/submit-lead.js (Vercel Serverless Function)

import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import Airtable from 'airtable';

// Airtable setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const table = base('Leads');

// Rate limiter
const limiter = rateLimit({ windowMs: 60 * 1000, max: 5 }); // 5 requests per minute

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Apply rate limiter (Vercel adaptation)
  try { await limiter(req, res); } catch { return res.status(429).json({ error: 'Too many requests' }); }

  const data = req.body;

  // Basic validation
  const requiredFields = ['fullName','dob','phone','email','address','city','state','zip','turnstileToken'];
  for(const field of requiredFields){
    if(!data[field]) return res.status(400).json({ error: `${field} is required` });
  }

  // Phone validation
  if(!/^\+?[0-9]{10,15}$/.test(data.phone)) return res.status(400).json({ error: 'Invalid phone' });
  // Email validation
  if(!/^\S+@\S+\.\S+$/.test(data.email)) return res.status(400).json({ error: 'Invalid email' });

  // Turnstile verification
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body:`secret=${process.env.TURNSTILE_SECRET_KEY}&response=${data.turnstileToken}`
  });
  const verifyJson = await verifyRes.json();
  if(!verifyJson.success) return res.status(400).json({ error:'CAPTCHA verification failed' });

  // Store in Airtable
  try {
    await table.create([{ fields: { 
      Name: data.fullName,
      DOB: data.dob,
      Phone: data.phone,
      Email: data.email,
      Address: data.address,
      City: data.city,
      State: data.state,
      ZIP: data.zip,
      Source: data.source,
      Timestamp: new Date().toISOString()
    }}]);

    return res.status(200).json({ success:true });
  } catch(err){
    console.error('Airtable Error:', err);
    return res.status(500).json({ error:'Internal Server Error' });
  }
}

