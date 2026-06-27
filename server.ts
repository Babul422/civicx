import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/db';
import { createServer as createViteServer } from 'vite';
import { IssueStatus, IssueType } from './src/types';

dotenv.config();

// Initialize Express app
const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads as static files
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Configure Cloudinary if keys exist
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary successfully configured.');
} else {
  console.log('Cloudinary not configured. Falling back to local file storage.');
}

// Initialize Gemini API client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log('Gemini API client successfully initialized.');
  } catch (e) {
    console.error('Failed to initialize Gemini API client:', e);
  }
} else {
  console.log('GEMINI_API_KEY is not defined. Gemini features will run in mock fallback mode.');
}

// Authority handles by issue type mapping
const AUTHORITY_HANDLES: Record<IssueType, string[]> = {
  pothole: ['@BBMP_Official', '@BBMP_Sahaaya'],
  waterlogging: ['@BBMP_Official', '@BruhathBBMP'],
  broken_streetlight: ['@BESCOM_Official'],
  garbage: ['@BBMP_Official'],
  water_leakage: ['@BWSSB_Official'],
  damaged_footpath: ['@BBMP_Official'],
  fallen_tree: ['@BBMP_Official', '@BengaluruPolice']
};

function getAuthorityHandle(issueType: IssueType): string {
  const handles = AUTHORITY_HANDLES[issueType] || ['@BBMP_Official'];
  return handles[Math.floor(Math.random() * handles.length)];
}

// Helpers for Cloudinary upload
async function uploadImage(filePath: string): Promise<string> {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'community-hero'
      });
      return result.secure_url;
    } catch (e) {
      console.error('Cloudinary upload failed, falling back to local storage URL:', e);
    }
  }
  // Local storage fallback
  const filename = path.basename(filePath);
  return `/uploads/${filename}`;
}

// --- API ENDPOINTS ---

// GET /health
app.get('/health', (req, res) => {
  try {
    const issues = db.getIssues();
    res.json({
      status: 'ok',
      database: 'connected',
      issues_count: issues.length
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/issues
app.get('/api/issues', (req, res) => {
  try {
    const { ward, issue_type, status, limit } = req.query;
    let issues = db.getIssues();

    if (ward) {
      issues = issues.filter((i) => i.ward_number === parseInt(ward as string, 10));
    }
    if (issue_type) {
      issues = issues.filter((i) => i.issue_type === (issue_type as string));
    }
    if (status) {
      issues = issues.filter((i) => i.status === (status as string));
    }

    if (limit) {
      issues = issues.slice(0, parseInt(limit as string, 10));
    }

    res.json(issues);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/issues/:id
app.get('/api/issues/:id', (req, res) => {
  try {
    const issue = db.getIssueById(req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    res.json(issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id
app.get('/api/users/:id', (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users (for simplified login)
app.post('/api/users/login', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const user = db.createUser(email, name || email.split('@')[0]);
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id/logs
app.get('/api/users/:id/logs', (req, res) => {
  try {
    const logs = db.getXpLogs(req.params.id);
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues
app.post('/api/issues', upload.single('photo'), async (req, res) => {
  try {
    const { latitude, longitude, description, reported_by, ward_number, address_text } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'Photo is required' });
      return;
    }

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Coordinates (latitude & longitude) are required' });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const userId = reported_by || '00000000-0000-0000-0000-000000000001'; // Default to Demo User if not provided

    const localFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    // 1. Upload photo to Cloudinary
    console.log('Uploading photo to storage...');
    const photoUrl = await uploadImage(localFilePath);

    // 2. Duplicate Detection
    console.log('Performing duplicate checks...');
    // We will let Gemini identify the issue type first, or we can use a temporary detection to verify duplicates.
    // To make it fully seamless: we'll run Gemini first, detect the category, and then check duplicates.
    // If we can't run Gemini, we fall back to a default type based on keywords in description or random.

    let isGenuine = true;
    let confidence = 95;
    let detectedType: IssueType = 'pothole';
    let severity = 5;
    let aiDescription = description || 'Civic issue detected.';
    let department = 'BBMP';
    let suggestedAction = 'Inspection and repair needed.';
    let estimatedArea = 'Local street';

    if (ai) {
      try {
        console.log('Calling Gemini Vision API to analyze image...');
        const imageBuffer = fs.readFileSync(localFilePath);
        const base64Data = imageBuffer.toString('base64');

        const imagePart = {
          inlineData: {
            mimeType,
            data: base64Data
          }
        };

        const textPart = {
          text: `Analyze this image for civic issues in Indian cities. Return ONLY valid JSON (no markdown, no extra text):
          {
            "is_genuine_civic_issue": bool,
            "confidence_score": 0-100,
            "issue_type": "pothole" | "waterlogging" | "broken_streetlight" | "garbage" | "water_leakage" | "damaged_footpath" | "fallen_tree",
            "severity": 1-10,
            "description": string,
            "estimated_area_affected": string,
            "department": string,
            "suggested_action": string
          }
          Be realistic. If the photo does not clearly show garbage, a pothole, a broken light, waterlogging, leakage, tree block, or sidewalk damage, set is_genuine_civic_issue to false.`
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                is_genuine_civic_issue: { type: Type.BOOLEAN },
                confidence_score: { type: Type.INTEGER },
                issue_type: { type: Type.STRING },
                severity: { type: Type.INTEGER },
                description: { type: Type.STRING },
                estimated_area_affected: { type: Type.STRING },
                department: { type: Type.STRING },
                suggested_action: { type: Type.STRING }
              },
              required: ['is_genuine_civic_issue', 'confidence_score', 'issue_type', 'severity', 'description', 'department']
            }
          }
        });

        const resultJson = JSON.parse(response.text || '{}');
        console.log('Gemini Vision analysis response:', resultJson);

        isGenuine = resultJson.is_genuine_civic_issue ?? true;
        confidence = resultJson.confidence_score ?? 90;
        detectedType = (resultJson.issue_type as IssueType) || 'pothole';
        severity = resultJson.severity ?? 5;
        aiDescription = resultJson.description || description || 'Civic issue detected by AI.';
        department = resultJson.department || 'BBMP';
        suggestedAction = resultJson.suggested_action || 'Repair needed.';
        estimatedArea = resultJson.estimated_area_affected || '10 meters range';
      } catch (e) {
        console.error('Gemini Vision API failed, using fallback heuristic:', e);
        // Fallback Heuristics
        const descLower = (description || '').toLowerCase();
        if (descLower.includes('light') || descLower.includes('bulb') || descLower.includes('street')) {
          detectedType = 'broken_streetlight';
        } else if (descLower.includes('water') || descLower.includes('rain') || descLower.includes('flood')) {
          detectedType = 'waterlogging';
        } else if (descLower.includes('garbage') || descLower.includes('trash') || descLower.includes('dump')) {
          detectedType = 'garbage';
        } else if (descLower.includes('leak') || descLower.includes('pipe')) {
          detectedType = 'water_leakage';
        } else if (descLower.includes('footpath') || descLower.includes('walk') || descLower.includes('sidewalk')) {
          detectedType = 'damaged_footpath';
        } else if (descLower.includes('tree') || descLower.includes('branch')) {
          detectedType = 'fallen_tree';
        } else {
          detectedType = 'pothole';
        }
        severity = Math.floor(Math.random() * 4) + 5; // 5-8
      }
    } else {
      // Gemini Client not initialized, use heuristic
      const descLower = (description || '').toLowerCase();
      if (descLower.includes('light') || descLower.includes('bulb') || descLower.includes('street')) {
        detectedType = 'broken_streetlight';
      } else if (descLower.includes('water') || descLower.includes('rain') || descLower.includes('flood')) {
        detectedType = 'waterlogging';
      } else if (descLower.includes('garbage') || descLower.includes('trash') || descLower.includes('dump')) {
        detectedType = 'garbage';
      } else if (descLower.includes('leak') || descLower.includes('pipe')) {
        detectedType = 'water_leakage';
      } else if (descLower.includes('footpath') || descLower.includes('walk') || descLower.includes('sidewalk')) {
        detectedType = 'damaged_footpath';
      } else if (descLower.includes('tree') || descLower.includes('branch')) {
        detectedType = 'fallen_tree';
      } else {
        detectedType = 'pothole';
      }
    }

    // 4. If is_genuine_civic_issue is false, reject
    if (!isGenuine) {
      console.log('Issue rejected by AI verification.');
      res.json({
        rejected: true,
        reason: "This photo doesn't appear to represent a clear public civic issue (pothole, streetlight, garbage, flooding, leak, etc.). Please take a clearer photo of the problem."
      });
      return;
    }

    // Now check duplicate
    const duplicate = db.checkDuplicate(lat, lng, detectedType);
    if (duplicate) {
      console.log('Duplicate issue detected in the vicinity:', duplicate.id);
      res.json({
        duplicate: true,
        existing_issue: duplicate
      });
      return;
    }

    // 5. Generate Tweet using Gemini Text
    const authorityHandle = getAuthorityHandle(detectedType);
    const finalAddress = address_text || 'Bengaluru, Karnataka';
    let tweetText = `⚠️ ${detectedType.replace('_', ' ').toUpperCase()} at ${finalAddress}. Severity: ${severity}/10. ${authorityHandle} please take immediate action. #CommunityHero #Bengaluru #BBMP`;

    if (ai) {
      try {
        console.log('Generating tweet text via Gemini...');
        const prompt = `Write a tweet (max 240 chars) about this civic issue: ${detectedType.replace('_', ' ')} at ${finalAddress}, Bengaluru. Severity ${severity}/10. Tag ${authorityHandle}. Add #CommunityHero #Bengaluru #BBMP. Be urgent and factual. Return only tweet text, no quotes.`;
        const tweetResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt
        });
        const generated = tweetResponse.text?.trim();
        if (generated && generated.length > 10) {
          tweetText = generated;
        }
      } catch (e) {
        console.error('Gemini Tweet Generation failed, using template:', e);
      }
    }

    // 6. Save to database
    console.log('Creating and saving new issue to database...');
    const createdIssue = db.createIssue({
      reported_by: userId,
      photo_url: photoUrl,
      latitude: lat,
      longitude: lng,
      ward_number: parseInt(ward_number || '151', 10),
      address_text: finalAddress,
      issue_type: detectedType,
      severity,
      description: aiDescription,
      ai_confidence: confidence,
      department,
      ai_generated_tweet: tweetText,
      authority_handle: authorityHandle
    });

    res.status(201).json(createdIssue);
  } catch (e: any) {
    console.error('Failed to create issue:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues/:id/upvote
app.post('/api/issues/:id/upvote', (req, res) => {
  try {
    const { user_id } = req.body;
    const userId = user_id || '00000000-0000-0000-0000-000000000001'; // Default demo user

    const result = db.upvoteIssue(req.params.id, userId);
    if (!result.success) {
      res.status(400).json({ error: result.message, issue: result.issue });
      return;
    }
    res.json(result.issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues/:id/verify
app.post('/api/issues/:id/verify', (req, res) => {
  try {
    const { user_id } = req.body;
    const userId = user_id || '00000000-0000-0000-0000-000000000001'; // Default demo user

    const result = db.verifyIssue(req.params.id, userId);
    if (!result.success) {
      res.status(400).json({ error: result.message, issue: result.issue });
      return;
    }
    res.json(result.issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/issues/:id/status
app.patch('/api/issues/:id/status', upload.single('resolved_photo'), async (req, res) => {
  try {
    const { status, authority_password } = req.body;

    const correctPassword = process.env.AUTHORITY_PASSWORD || 'admin123';
    if (authority_password !== correctPassword) {
      res.status(401).json({ error: 'Unauthorized: Invalid authority password' });
      return;
    }

    let resolvedPhotoUrl = null;
    if (req.file) {
      console.log('Uploading resolution photo to storage...');
      resolvedPhotoUrl = await uploadImage(req.file.path);
    }

    const result = db.updateIssueStatus(req.params.id, status as IssueStatus, resolvedPhotoUrl);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    console.log(`Status of issue ${req.params.id} updated to ${status}. Notification logged for reporter.`);
    res.json(result.issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues/:id/tweet-url
app.post('/api/issues/:id/tweet-url', (req, res) => {
  try {
    const { tweet_url } = req.body;
    if (!tweet_url) {
      res.status(400).json({ error: 'tweet_url is required' });
      return;
    }

    const result = db.updateIssueTweetUrl(req.params.id, tweet_url);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }
    res.json(result.issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  try {
    const issues = db.getIssues();
    const users = db.getUsers();

    const total_issues = issues.length;
    const open_issues = issues.filter((i) => i.status !== 'resolved').length;

    // Resolved issues this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const resolved_this_month = issues.filter(
      (i) => i.status === 'resolved' && i.resolved_at && new Date(i.resolved_at) >= startOfMonth
    ).length;

    // Average resolution time (days)
    const resolvedIssues = issues.filter((i) => i.status === 'resolved' && i.resolved_at);
    let totalDays = 0;
    resolvedIssues.forEach((i) => {
      const created = new Date(i.created_at).getTime();
      const resolved = new Date(i.resolved_at!).getTime();
      totalDays += (resolved - created) / (1000 * 60 * 60 * 24);
    });
    const avg_resolution_days = resolvedIssues.length > 0 ? parseFloat((totalDays / resolvedIssues.length).toFixed(1)) : 4.5;

    // Group by issue type
    const issues_by_type: Record<string, number> = {};
    // Group by ward
    const issues_by_ward: Record<string, number> = {};

    issues.forEach((i) => {
      issues_by_type[i.issue_type] = (issues_by_type[i.issue_type] || 0) + 1;
      issues_by_ward[`Ward ${i.ward_number}`] = (issues_by_ward[`Ward ${i.ward_number}`] || 0) + 1;
    });

    // Top ward
    let top_ward = 'Ward 151';
    let maxCount = 0;
    Object.entries(issues_by_ward).forEach(([ward, count]) => {
      if (count > maxCount) {
        maxCount = count;
        top_ward = ward;
      }
    });

    // Reports per week for last 8 weeks
    const issues_per_week = [0, 0, 0, 0, 0, 0, 0, 0];
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    issues.forEach((i) => {
      const ageMs = now.getTime() - new Date(i.created_at).getTime();
      const weekIndex = Math.floor(ageMs / msInWeek);
      if (weekIndex >= 0 && weekIndex < 8) {
        issues_per_week[7 - weekIndex] += 1; // 7 is this week, 0 is 8 weeks ago
      }
    });

    res.json({
      total_issues,
      resolved_this_month,
      open_issues,
      avg_resolution_days,
      issues_by_type,
      issues_by_ward,
      issues_per_week,
      top_ward,
      total_citizens: users.length
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/heatmap
app.get('/api/heatmap', (req, res) => {
  try {
    const issues = db.getIssues();
    const unresolved = issues.filter((i) => i.status !== 'resolved');
    const heatmap = unresolved.map((i) => ({
      lat: i.latitude,
      lng: i.longitude,
      weight: i.severity / 10
    }));
    res.json(heatmap);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// Start server function and attach Vite in dev mode
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Server startup failed:', err);
});
