const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'setip_db';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'applications';

function generateAppId() {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `ST-2026-${digits}`;
}

async function sendConfirmationEmail(applicant) {
  try {
    const { toEmail, applicantName, applicationId, phoneNumber, whatsappNumber,
      collegeName, branchStream, yearStudy, stateRegion, domains, languages } = applicant;
    const domainList = Array.isArray(domains) ? domains.join(', ') : domains;
    const languageList = Array.isArray(languages) ? languages.join(', ') : languages;
    const primaryDomain = Array.isArray(domains) ? domains[0] : domains;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: toEmail,
      subject: `Your ${primaryDomain} Program Registration is Confirmed — ${applicationId}`,
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Registration Confirmed</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1a237e,#3949ab,#5c6bc0);padding:40px 32px;text-align:center;">
  <h1 style="color:#fff;font-size:26px;margin:0;">Registration Confirmed ✅</h1>
  <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Enrollment Ref: <strong>${applicationId}</strong></p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:18px;font-weight:600;color:#1a237e;">Congratulations, ${applicantName}! 🎉</p>
  <p style="font-size:15px;line-height:1.7;color:#475569;">Your <strong>${domainList}</strong> Program registration under <strong>Adobe SETIP 2026</strong> has been successfully confirmed.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;margin-top:20px;">
    <tr><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;width:40%;color:#334155;">Full Name</td><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${applicantName}</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Phone</td><td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${phoneNumber}</td></tr>
    <tr><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">College</td><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${collegeName}</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Branch</td><td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${branchStream}</td></tr>
    <tr><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Year</td><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${yearStudy}</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">State</td><td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${stateRegion}</td></tr>
    <tr><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Domain(s)</td><td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${domainList}</td></tr>
    <tr><td style="padding:10px 12px;font-weight:600;color:#334155;">Language(s)</td><td style="padding:10px 12px;color:#475569;">${languageList}</td></tr>
  </table>
  <div style="margin-top:24px;text-align:center;">
    <a href="https://chat.whatsapp.com/KjGldDWVgdjBsfpliyjbhw" style="display:inline-block;background:#25D366;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">💬 Join WhatsApp Group</a>
  </div>
</td></tr>
<tr><td style="background:#1a237e;padding:20px 32px;text-align:center;">
  <p style="margin:0;color:rgba(255,255,255,0.9);font-size:12px;">© 2026 Krutanic Solutions · Enrollment Ref: <strong>${applicationId}</strong></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
    });
    console.log(`📧 Confirmation email sent to ${toEmail}`);
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
  }
}

let cachedClient = null;

async function getDB() {
  if (cachedClient) return cachedClient.db(DB_NAME);
  const client = new MongoClient(MONGO_URI, {
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  });
  await client.connect();
  cachedClient = client;
  return client.db(DB_NAME);
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const {
      fullName, phoneNumber, whatsappNumber, collegeEmail, personalEmail,
      stateRegion, collegeName, branchStream, yearStudy,
      crContact, referralCode, domains, languages,
    } = req.body;

    // Validate required fields
    const required = { fullName, phoneNumber, whatsappNumber, collegeEmail, personalEmail, stateRegion, collegeName, branchStream, yearStudy };
    const missing = Object.entries(required).filter(([, v]) => !v || String(v).trim() === '').map(([k]) => k);
    if (missing.length > 0) return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
    if (!domains || domains.length === 0) return res.status(400).json({ success: false, message: 'Please select at least one domain.' });
    if (!languages || languages.length === 0) return res.status(400).json({ success: false, message: 'Please select at least one language.' });

    const db = await getDB();

    // Generate unique app ID
    let applicationId;
    for (let i = 0; i < 10; i++) {
      applicationId = generateAppId();
      if (!(await db.collection(COLLECTION_NAME).findOne({ applicationId }))) break;
    }

    const doc = {
      applicationId,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      whatsappNumber: whatsappNumber.trim(),
      collegeEmail: collegeEmail.trim().toLowerCase(),
      personalEmail: personalEmail.trim().toLowerCase(),
      stateRegion,
      collegeName: collegeName.trim(),
      branchStream: branchStream.trim(),
      yearStudy,
      crContact: crContact ? crContact.trim() : '',
      referralCode: referralCode ? referralCode.trim().toUpperCase() : '',
      domains: Array.isArray(domains) ? domains : [domains],
      languages: Array.isArray(languages) ? languages : [languages],
      submittedAt: new Date(),
      ipAddress: req.headers['x-forwarded-for'] || 'unknown',
    };

    await db.collection(COLLECTION_NAME).insertOne(doc);
    console.log(`✅ New application: ${applicationId} — ${fullName}`);

    // Send email (non-blocking)
    sendConfirmationEmail({ toEmail: personalEmail, applicantName: fullName, applicationId, phoneNumber, whatsappNumber, collegeName, branchStream, yearStudy, stateRegion, domains, languages });

    return res.status(201).json({ success: true, applicationId, message: 'Application submitted successfully!' });

  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
