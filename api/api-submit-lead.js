import Airtable from 'airtable';

const rateLimitMap = new Map();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60*1000; // 1 minute

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res){
  if(req.method !== 'POST'){
    return res.status(405).json({error:'Method not allowed'});
  }

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Rate limiting
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const updated = timestamps.filter(t=>now-t<WINDOW_MS);
  if(updated.length >= MAX_REQUESTS){
    return res.status(429).json({error:'Too many requests'});
  }
  updated.push(now);
  rateLimitMap.set(ip, updated);

  const { fullName, dob, phone, email, address, city, state, zip, turnstileToken, source } = req.body;

  if(!fullName || !dob || !phone || !email || !address || !city || !state || !zip || !turnstileToken){
    return res.status(400).json({error:'Missing required fields'});
  }

  // Verify Cloudflare Turnstile
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`secret=${process.env.TURNSTILE_SECRET_KEY}&response=${turnstileToken}&remoteip=${ip}`
  });
  const json = await verify.json();
  if(!json.success){
    return res.status(400).json({error:'CAPTCHA validation failed'});
  }

  // Normalize phone
  const normalizedPhone = phone.replace(/\D/g,'');

  try {
    await base('Leads').create([{
      fields:{
        FullName: fullName,
        DOB: dob,
        Phone: normalizedPhone,
        Email: email,
        Address: address,
        City: city,
        State: state,
        ZIP: zip,
        Source: source || 'landing_page',
        IP: ip,
        Timestamp: new Date().toISOString()
      }
    }]);
    res.status(200).json({success:true});
  } catch(err){
    console.error('Airtable Error:', err);
    res.status(500).json({error:'Internal Server Error'});
  }
}

