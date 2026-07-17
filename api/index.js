require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── MongoDB Connection & Cache ──────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'setip_db';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'applications';
const ADMIN_KEY = process.env.ADMIN_KEY || 'setip2026admin';

let cachedClient = null;
let cachedDb = null;
let db = null;

async function getDB() {
    if (cachedDb) return cachedDb;
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not set in environment variables');
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    cachedClient = client;
    cachedDb = client.db(DB_NAME);
    return cachedDb;
}

// Database Connection Middleware
app.use(async (req, res, next) => {
    try {
        db = await getDB();
        next();
    } catch (err) {
        console.error('❌ Database connection middleware error:', err.message);
        res.status(500).json({ success: false, message: 'Database connection failed' });
    }
});

// Helper to upsert page HTML into DB
async function upsertPage(name, content) {
  const now = new Date();
  await db.collection('pages').updateOne(
    { name },
    { $set: { content, updatedAt: now },
      $setOnInsert: { createdAt: now } },
    { upsert: true }
  );
}

// ─── Helper: Send Confirmation Email ────────────────────────────────────────
async function sendConfirmationEmail(applicant) {
  try {
    const { toEmail, applicantName, applicationId, phoneNumber, whatsappNumber, collegeName, branchStream, yearStudy, stateRegion, domains, languages } = applicant;
    const domainList = Array.isArray(domains) ? domains.join(', ') : domains;
    const languageList = Array.isArray(languages) ? languages.join(', ') : languages;
    const primaryDomain = Array.isArray(domains) ? domains[0] : domains;

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
    });

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: toEmail,
        subject: `Your ${primaryDomain} Program Registration is Confirmed — ${applicationId}`,
        html: buildConfirmationHTML({ applicantName, applicationId, phoneNumber, whatsappNumber, collegeName, branchStream, yearStudy, stateRegion, domainList, languageList })
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Confirmation email sent to ${toEmail}`);
  } catch (emailErr) {
    console.error('❌ Failed to send confirmation email:', emailErr);
  }
}

// ─── Helper: Build Confirmation Email HTML ──────────────────────────────────
function buildConfirmationHTML({ applicantName, applicationId, phoneNumber, whatsappNumber, collegeName, branchStream, yearStudy, stateRegion, domainList, languageList }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Registration Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr>
<td style="background:linear-gradient(135deg,#1a237e 0%,#3949ab 50%,#5c6bc0 100%);padding:40px 32px;text-align:center;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;margin-bottom:16px;">
      <span style="color:#fff;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Adobe × Krutanic · SETIP 2026</span>
    </div>
  </td></tr>
  <tr><td align="center" style="padding-top:8px;">
    <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;line-height:1.3;">Registration Confirmed ✅</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Enrollment Ref: <strong>${applicationId}</strong></p>
  </td></tr></table>
</td>
</tr>
<tr>
<td style="padding:32px 32px 0;">
  <p style="font-size:18px;margin:0 0 8px;font-weight:600;color:#1a237e;">Congratulations, ${applicantName}! 🎉</p>
  <p style="font-size:15px;line-height:1.7;margin:0;color:#475569;">
    Your <strong>${domainList}</strong> Program registration under <strong>Adobe SETIP 2026</strong> has been successfully confirmed. Welcome aboard — your journey toward industry-ready skills starts now!
  </p>
</td>
</tr>
<tr>
<td style="padding:28px 32px 0;">
  <h2 style="font-size:16px;color:#1a237e;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid #e8eaf6;">📋 Registration Summary</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;width:40%;color:#334155;">Full Name</td>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${applicantName}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Phone</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${phoneNumber}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">WhatsApp</td>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${whatsappNumber}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">College</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${collegeName}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Branch / Stream</td>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${branchStream}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Year of Study</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${yearStudy}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">State / Region</td>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">${stateRegion}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Domain(s)</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">${domainList}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;font-weight:600;color:#334155;">Preferred Language(s)</td>
      <td style="padding:10px 12px;background:#f8f9ff;color:#475569;">${languageList}</td>
    </tr>
  </table>
</td>
</tr>
<tr>
<td style="padding:32px 32px 0;">
  <h2 style="font-size:16px;color:#1a237e;margin:0 0 20px;padding-bottom:8px;border-bottom:2px solid #e8eaf6;">🚀 What Happens Next</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="48" valign="top" style="padding-bottom:20px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a237e,#3949ab);border-radius:50%;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">1</div>
      </td>
      <td style="padding:0 0 20px 12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">WhatsApp Call Within 24 Hours</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Our program counsellor will personally reach out to discuss your program details, clear any doubts, and help you get started.</p>
      </td>
    </tr>
    <tr>
      <td width="48" valign="top" style="padding-bottom:20px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a237e,#3949ab);border-radius:50%;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">2</div>
      </td>
      <td style="padding:0 0 20px 12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">Orientation in 2–3 Days</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">You'll receive your complete orientation schedule, program structure, and kickoff details via WhatsApp and email.</p>
      </td>
    </tr>
  </table>
</td>
</tr>
<tr>
<td style="padding:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:12px;padding:20px;border:1px solid #e8eaf6;">
    <tr><td style="padding:20px;">
      <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">Dr. Mandeep Singh</p>
      <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Placements Controller, Krutanic Solutions</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569;">📞 <a href="tel:+919886232004" style="color:#3949ab;text-decoration:none;">+91 9886232004</a></p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569;">📧 <a href="mailto:info@krutanic.org" style="color:#3949ab;text-decoration:none;">info@krutanic.org</a></p>
    </td></tr>
  </table>
</td>
</tr>
<tr>
<td style="background:#1a237e;padding:20px 32px;text-align:center;">
  <p style="margin:0;color:rgba(255,255,255,0.9);font-size:12px;">© 2026 Krutanic Solutions · Enrollment Ref: <strong>${applicationId}</strong></p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Helper: Generate Application ID
function generateAppId() {
    const digits = Math.floor(10000 + Math.random() * 90000);
    return `ST-2026-${digits}`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/apply — Submit application form
app.post('/api/apply', async (req, res) => {
    try {
        const {
            fullName,
            phoneNumber,
            whatsappNumber,
            collegeEmail,
            personalEmail,
            stateRegion,
            collegeName,
            branchStream,
            yearStudy,
            crContact,
            referralCode,
            domains,
            languages,
        } = req.body;

        const required = { fullName, phoneNumber, whatsappNumber, collegeEmail, personalEmail, stateRegion, collegeName, branchStream, yearStudy };
        const missing = Object.entries(required)
            .filter(([_, v]) => !v || String(v).trim() === '')
            .map(([k]) => k);

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(', ')}`
            });
        }

        if (!domains || domains.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one domain.' });
        }

        if (!languages || languages.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one preferred language.' });
        }

        let applicationId;
        for (let attempts = 0; attempts < 10; attempts++) {
            applicationId = generateAppId();
            const existing = await db.collection(COLLECTION_NAME).findOne({ applicationId });
            if (!existing) break;
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
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
        };

        await db.collection(COLLECTION_NAME).insertOne(doc);
        console.log(`✅ New application: ${applicationId} — ${fullName}`);

        const applicantData = {
          toEmail: personalEmail,
          applicantName: fullName,
          applicationId,
          phoneNumber,
          whatsappNumber,
          collegeName,
          branchStream,
          yearStudy,
          stateRegion,
          domains,
          languages,
        };
        
        // Send email non-blocking
        sendConfirmationEmail(applicantData);

        res.status(201).json({
            success: true,
            applicationId,
            message: 'Application submitted successfully!'
        });
    } catch (err) {
        console.error('❌ Error saving application:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// GET /api/applications — Admin: get all applications
app.get('/api/applications', async (req, res) => {
    const { key, search, state, year, domain, date, limit = 200, skip = 0 } = req.query;
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Invalid admin key.' });
    }
    try {
        const filter = {};
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { fullName: regex },
                { collegeName: regex },
                { personalEmail: regex },
                { collegeEmail: regex },
                { applicationId: regex },
                { referralCode: regex },
            ];
        }
        if (state && state !== 'all') filter.stateRegion = state;
        if (year && year !== 'all') filter.yearStudy = year;
        if (domain && domain !== 'all') filter.domains = { $in: [domain] };

        if (date && date !== 'all') {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.submittedAt = { $gte: start, $lte: end };
        }

        const total = await db.collection(COLLECTION_NAME).countDocuments(filter);
        const applications = await db.collection(COLLECTION_NAME)
            .find(filter)
            .sort({ submittedAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .toArray();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = await db.collection(COLLECTION_NAME).countDocuments({
            submittedAt: { $gte: todayStart }
        });

        const domainAgg = await db.collection(COLLECTION_NAME).aggregate([
            { $unwind: '$domains' },
            { $group: { _id: '$domains', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]).toArray();

        res.json({
            success: true,
            total,
            todayCount,
            topDomain: domainAgg[0] ? domainAgg[0]._id : 'N/A',
            applications,
        });
    } catch (err) {
        console.error('❌ Error fetching applications:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/stats — Admin: summary stats
app.get('/api/stats', async (req, res) => {
    if (req.query.key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    try {
        const total = await db.collection(COLLECTION_NAME).countDocuments();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = await db.collection(COLLECTION_NAME).countDocuments({
            submittedAt: { $gte: todayStart }
        });

        const domainAgg = await db.collection(COLLECTION_NAME).aggregate([
            { $unwind: '$domains' },
            { $group: { _id: '$domains', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        const stateAgg = await db.collection(COLLECTION_NAME).aggregate([
            { $group: { _id: '$stateRegion', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        res.json({ success: true, total, todayCount, domainAgg, stateAgg });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE /api/applications/:id — Admin: delete one
app.delete('/api/applications/:id', async (req, res) => {
    if (req.query.key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    try {
        await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = app;
