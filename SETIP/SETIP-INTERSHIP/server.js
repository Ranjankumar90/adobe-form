require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve index.html & admin.html

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'setip_db';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'applications';
const ADMIN_KEY = process.env.ADMIN_KEY || 'setip2026admin';

let db;

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

// Import initial HTML pages into DB (run after connection)
async function importInitialPages() {
  const internshipPath = path.join(__dirname, 'index.html');
  try {
    const internContent = await fs.promises.readFile(internshipPath, 'utf8');
    await upsertPage('root', internContent);
    await upsertPage('internship', internContent);
    console.log('✅ Initial pages imported into DB');
  } catch (e) {
    console.error('⚠️ Failed to import initial pages', e);
  }
}

async function connectDB() {
    const mongoOptions = {
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
    };

    try {
        const client = new MongoClient(MONGO_URI, mongoOptions);
        await client.connect();

        db = client.db(DB_NAME);
        console.log(`✅ Connected to MongoDB Atlas — database: ${DB_NAME}`);
        await importInitialPages();

        // Create indexes for fast queries
        await db.collection(COLLECTION_NAME).createIndex({ submittedAt: -1 });
        await db.collection(COLLECTION_NAME).createIndex({ personalEmail: 1 });
        await db.collection(COLLECTION_NAME).createIndex({ applicationId: 1 }, { unique: true });

        console.log('✅ Indexes created');
    } catch (err) {
        console.error('❌ Primary MongoDB connection failed:', err.message);
        console.warn('Attempting fallback to local MongoDB (mongodb://localhost:27017)...');
        try {
            const fallbackClient = new MongoClient('mongodb://localhost:27017', {
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
            await fallbackClient.connect();
            db = fallbackClient.db(DB_NAME);
            console.log(`✅ Connected to fallback MongoDB — database: ${DB_NAME}`);
            // Create indexes for fast queries
            await db.collection(COLLECTION_NAME).createIndex({ submittedAt: -1 });
            await db.collection(COLLECTION_NAME).createIndex({ personalEmail: 1 });
            await db.collection(COLLECTION_NAME).createIndex({ applicationId: 1 }, { unique: true });
            console.log('✅ Indexes created (fallback)');
        } catch (fallbackErr) {
            console.error('❌ Fallback MongoDB connection failed:', fallbackErr.message);
            console.error('👉 Ensure MongoDB is running or correct MONGO_URI in .env');
            process.exit(1);
        }
    }
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

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header Banner -->
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

<!-- Greeting -->
<tr>
<td style="padding:32px 32px 0;">
  <p style="font-size:18px;margin:0 0 8px;font-weight:600;color:#1a237e;">Congratulations, ${applicantName}! 🎉</p>
  <p style="font-size:15px;line-height:1.7;margin:0;color:#475569;">
    Your <strong>${domainList}</strong> Program registration under <strong>Adobe SETIP 2026</strong> has been successfully confirmed. Welcome aboard — your journey toward industry-ready skills starts now!
  </p>
</td>
</tr>

<!-- Registration Summary -->
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

<!-- What Happens Next -->
<tr>
<td style="padding:32px 32px 0;">
  <h2 style="font-size:16px;color:#1a237e;margin:0 0 20px;padding-bottom:8px;border-bottom:2px solid #e8eaf6;">🚀 What Happens Next</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <!-- Step 1 -->
    <tr>
      <td width="48" valign="top" style="padding-bottom:20px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a237e,#3949ab);border-radius:50%;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">1</div>
      </td>
      <td style="padding:0 0 20px 12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">WhatsApp Call Within 24 Hours</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Our program counsellor will personally reach out to discuss your program details, clear any doubts, and help you get started.</p>
      </td>
    </tr>
    <!-- Step 2 -->
    <tr>
      <td width="48" valign="top" style="padding-bottom:20px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a237e,#3949ab);border-radius:50%;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">2</div>
      </td>
      <td style="padding:0 0 20px 12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">Orientation in 2–3 Days</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">You'll receive your complete orientation schedule, program structure, and kickoff details via WhatsApp and email.</p>
      </td>
    </tr>
    <!-- Step 3 -->
    <tr>
      <td width="48" valign="top" style="padding-bottom:20px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a237e,#3949ab);border-radius:50%;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">3</div>
      </td>
      <td style="padding:0 0 20px 12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">Dedicated Mentor Assignment</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">A dedicated industry mentor will be assigned to guide you through every phase of the program — from learning to placement.</p>
      </td>
    </tr>
    <!-- Step 4 -->
    <tr>
      <td width="48" valign="top">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a237e,#3949ab);border-radius:50%;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">4</div>
      </td>
      <td style="padding:0 0 0 12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">Month 1 — Skill Training Begins</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Hands-on technical and soft-skill training using real industry tools begins right away.</p>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- Important Links -->
<tr>
<td style="padding:32px 32px 0;">
  <h2 style="font-size:16px;color:#1a237e;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid #e8eaf6;">🔗 Important Links</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#334155;">Student Portal</strong><br/>
        <a href="https://www.krutanic.com" style="color:#3949ab;text-decoration:none;font-size:13px;">www.krutanic.com</a>
        <span style="display:block;font-size:12px;color:#94a3b8;margin-top:2px;">Access your student dashboard & resources</span>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#334155;">Schedule a Mentor Session</strong><br/>
        <a href="https://www.krutanic.com/events" style="color:#3949ab;text-decoration:none;font-size:13px;">www.krutanic.com/events</a>
        <span style="display:block;font-size:12px;color:#94a3b8;margin-top:2px;">Book your first one-on-one mentoring session</span>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#334155;">Learning Hub</strong><br/>
        <a href="https://www.krutanic.com/Mentorship" style="color:#3949ab;text-decoration:none;font-size:13px;">www.krutanic.com/Mentorship</a>
        <span style="display:block;font-size:12px;color:#94a3b8;margin-top:2px;">Access curated learning resources & course material</span>
      </td>
    </tr>
  </table>

  <!-- WhatsApp Group CTA -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    <tr><td align="center">
      <a href="https://chat.whatsapp.com/KjGldDWVgdjBsfpliyjbhw" style="display:inline-block;background:#25D366;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">💬 Join WhatsApp Group</a>
      <p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">Connect with your batch & get instant program updates</p>
    </td></tr>
  </table>
</td>
</tr>

<!-- Program at a Glance -->
<tr>
<td style="padding:32px 32px 0;">
  <h2 style="font-size:16px;color:#1a237e;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid #e8eaf6;">📌 Program at a Glance</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;width:35%;color:#334155;">Duration</td>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">3 Months — Skill Training → Internship → Placement</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Mode</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eaf6;color:#475569;">Online with dedicated industry mentor support</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;font-weight:600;color:#334155;">Certification</td>
      <td style="padding:10px 12px;background:#f8f9ff;border-bottom:1px solid #e8eaf6;color:#475569;">Adobe Co‑logo Certificate + Completion Certificate + LoR</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;font-weight:600;color:#334155;">Placement Partners</td>
      <td style="padding:10px 12px;color:#475569;">IBM, Microsoft, Amazon, Deloitte, TCS & more</td>
    </tr>
  </table>
</td>
</tr>

<!-- Contact Footer -->
<tr>
<td style="padding:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:12px;padding:20px;border:1px solid #e8eaf6;">
    <tr><td style="padding:20px;">
      <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#1a237e;">Dr. Mandeep Singh</p>
      <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Placements Controller, Krutanic Solutions</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569;">📞 <a href="tel:+919886232004" style="color:#3949ab;text-decoration:none;">+91 9886232004</a></p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569;">📧 <a href="mailto:info@krutanic.org" style="color:#3949ab;text-decoration:none;">info@krutanic.org</a></p>
      <p style="margin:0;font-size:13px;color:#475569;">🌐 <a href="https://www.krutanic.com" style="color:#3949ab;text-decoration:none;">www.krutanic.com</a></p>
    </td></tr>
  </table>
</td>
</tr>

<!-- Bottom Footer -->
<tr>
<td style="background:#1a237e;padding:20px 32px;text-align:center;">
  <p style="margin:0 0 4px;color:rgba(255,255,255,0.9);font-size:12px;">© 2026 Krutanic Solutions · <a href="https://www.krutanic.com" style="color:#90caf9;text-decoration:none;">www.krutanic.com</a> · Enrollment Ref: <strong>${applicationId}</strong></p>
  <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;">You received this because you applied for SETIP 2026 at krutanic.com. For queries contact <a href="mailto:info@krutanic.org" style="color:#90caf9;text-decoration:none;">info@krutanic.org</a></p>
</td>
</tr>

</table>
</td></tr>
</table>

</body>
</html>`;
 }

// ─── Helper: Generate Application ID ─────────────────────────────────────────
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

        // Validate required fields
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
            return res.status(400).json({
                success: false,
                message: 'Please select at least one domain.'
            });
        }

        if (!languages || languages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one preferred language.'
            });
        }

        // Generate unique application ID (retry if collision)
        let applicationId;
        let attempts = 0;
        while (attempts < 10) {
            applicationId = generateAppId();
            const existing = await db.collection(COLLECTION_NAME).findOne({ applicationId });
            if (!existing) break;
            attempts++;
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

        const result = await db.collection(COLLECTION_NAME).insertOne(doc);

        console.log(`✅ New application: ${applicationId} — ${fullName}`);

        // Send confirmation email with full applicant data
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
        sendConfirmationEmail(applicantData);

        res.status(201).json({
            success: true,
            applicationId,
            message: 'Application submitted successfully!'
        });

    } catch (err) {
        console.error('❌ Error saving application:', err);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// GET /api/applications — Admin: get all applications
app.get('/api/applications', async (req, res) => {
    const { key, search, state, year, domain, date, limit = 200, skip = 0 } = req.query;

    // Auth check
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

        // Stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = await db.collection(COLLECTION_NAME).countDocuments({
            submittedAt: { $gte: todayStart }
        });

        // Top domain aggregation
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

// Test route: preview email HTML
app.get('/test-email', (req, res) => {
  const dummyApplicant = {
    toEmail: 'dummy@example.com',
    applicantName: 'John Doe',
    applicationId: 'TEST-12345',
    phoneNumber: '1234567890',
    whatsappNumber: '1234567890',
    collegeName: 'Test College',
    branchStream: 'CSE',
    yearStudy: 'Final',
    stateRegion: 'TestState',
    domains: ['Full Stack Web Development']
  };
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: dummyApplicant.toEmail,
    subject: `Adobe × Krutanic – Registration Confirmed – ${dummyApplicant.applicationId}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Registration Confirmed</title>
  <style>
    body {font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #f0f4ff, #d9e6ff); padding: 20px; color: #333;}
    .container {max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);}
    h1 {color: #2c3e50; font-size: 24px; margin-bottom: 10px;}
    .summary {margin-top: 20px;}
    table {width: 100%; border-collapse: collapse;}
    th, td {padding: 8px; border: 1px solid #e0e0e0; text-align: left;}
    th {background: #f5f5f5;}
    .footer {margin-top: 30px; font-size: 12px; color: #777;}
  </style>
</head>
<body>
  <div class="container">
    <h1>Adobe × Krutanic – Registration Confirmed</h1>
    <p>Ref: ${dummyApplicant.applicationId}</p>
    <p>You're in, ${dummyApplicant.applicantName}! 🎉</p>
    <p>Your Full Stack Web Development Program registration under Adobe SETIP 2026 is confirmed. Our counsellor will contact you within 24 hours on WhatsApp.</p>
    <div class="summary">
      <strong>Registration Summary</strong>
      <table>
        <tr><td><strong>Full Name</strong></td><td>${dummyApplicant.applicantName}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${dummyApplicant.phoneNumber}</td></tr>
        <tr><td><strong>WhatsApp</strong></td><td>${dummyApplicant.whatsappNumber}</td></tr>
        <tr><td><strong>College</strong></td><td>${dummyApplicant.collegeName}</td></tr>
        <tr><td><strong>Branch/Stream</strong></td><td>${dummyApplicant.branchStream}</td></tr>
        <tr><td><strong>Year of Study</strong></td><td>${dummyApplicant.yearStudy}</td></tr>
        <tr><td><strong>State</strong></td><td>${dummyApplicant.stateRegion}</td></tr>
        <tr><td><strong>Domains</strong></td><td>${dummyApplicant.domains.join(', ')}</td></tr>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`
  };

  res.send(mailOptions.html);
});

// ---------- Page Management API ----------
app.get('/api/pages', async (req, res) => {
  try {
    const pages = await db.collection('pages')
      .find({}, { projection: { name: 1, _id: 0 } })
      .toArray();
    res.json({ success: true, pages });
  } catch (e) {
    console.error('❌ Error listing pages:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/pages/:name', async (req, res) => {
  try {
    const doc = await db.collection('pages').findOne({ name: req.params.name });
    if (!doc) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, content: doc.content });
  } catch (e) {
    console.error('❌ Error fetching page:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/pages', async (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ success: false, message: 'Missing name or content' });
  try {
    await upsertPage(name, content);
    res.json({ success: true, message: 'Page created/updated' });
  } catch (e) {
    console.error('❌ Error creating page:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/pages/:name', async (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: 'Missing content' });
  try {
    await upsertPage(req.params.name, content);
    res.json({ success: true, message: 'Page updated' });
  } catch (e) {
    console.error('❌ Error updating page:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/pages/:name', async (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const result = await db.collection('pages').deleteOne({ name: req.params.name });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, message: 'Page deleted' });
  } catch (e) {
    console.error('❌ Error deleting page:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Manual re‑import endpoint (admin only)
app.post('/api/pages/importAll', async (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    await importInitialPages();
    res.json({ success: true, message: 'All pages re‑imported' });
  } catch (e) {
    console.error('❌ Import all error:', e);
    res.status(500).json({ success: false, message: 'Import failed' });
  }
});

// ---------- End Page Management API ----------

// Serve stored HTML pages via friendly URLs
app.get('/root', async (req, res) => {
  try {
    const doc = await db.collection('pages').findOne({ name: 'root' });
    if (!doc) return res.status(404).send('Root page not found');
    res.type('html').send(doc.content);
  } catch (e) {
    console.error('❌ Error serving root page:', e);
    res.status(500).send('Server error');
  }
});

app.get('/internship', async (req, res) => {
  try {
    const doc = await db.collection('pages').findOne({ name: 'internship' });
    if (!doc) return res.status(404).send('Internship page not found');
    res.type('html').send(doc.content);
  } catch (e) {
    console.error('❌ Error serving internship page:', e);
    res.status(500).send('Server error');
  }
});


// Serve root page at base URL
app.get('/', async (req, res) => {
  try {
    const doc = await db.collection('pages').findOne({ name: 'root' });
    if (!doc) return res.status(404).send('Root page not found');
    res.type('html').send(doc.content);
  } catch (e) {
    console.error('❌ Error serving base root page:', e);
    res.status(500).send('Server error');
  }
});

// Fallback: serve index.html for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 SETIP 2026 Server running at http://localhost:${PORT}`);
        console.log(`📋 Admin Dashboard: http://localhost:${PORT}/admin.html`);
        console.log(`🔑 Admin Key: ${ADMIN_KEY}\n`);
    });
});
