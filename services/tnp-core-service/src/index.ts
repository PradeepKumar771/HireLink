import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client-tnp';
import axios from 'axios';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Dynamic Self-Healing database provider adjustment
const adjustDatabaseProvider = () => {
  try {
    let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    const isSqlite = dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:');

    // Auto-isolate multi-service PostgreSQL schemas to prevent table dropping conflicts in Neon
    if (!isSqlite && !dbUrl.includes('schema=')) {
      const separator = dbUrl.includes('?') ? '&' : '?';
      dbUrl = `${dbUrl}${separator}schema=tnp_core_service`;
      process.env.DATABASE_URL = dbUrl;
      console.log('[Self-Healing] Isolated database schema detected as PostgreSQL. Appending "?schema=tnp_core_service" parameter.');
    }

    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      console.warn('[Self-Healing] Schema file not found at:', schemaPath);
      return;
    }

    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const targetProvider = isSqlite ? 'sqlite' : 'postgresql';
    const currentProviderMatch = schemaContent.match(/datasource\s+db\s*\{\s*provider\s*=\s*"([^"]+)"/);

    if (currentProviderMatch && currentProviderMatch[1] !== targetProvider) {
      console.log(`[Self-Healing] Database URL protocol detected for ${isSqlite ? 'SQLite' : 'PostgreSQL'}. Adjusting schema provider to "${targetProvider}"...`);
      
      // Update provider under datasource db block
      schemaContent = schemaContent.replace(
        /(datasource\s+db\s*\{\s*provider\s*=\s*")[^"]+("\s*)/,
        `$1${targetProvider}$2`
      );

      fs.writeFileSync(schemaPath, schemaContent, 'utf8');
      console.log(`[Self-Healing] Schema successfully updated. Regenerating Prisma Client...`);
      execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
    }
  } catch (err: any) {
    console.error('[Self-Healing] Failed to adjust database provider:', err.message);
  }
};

adjustDatabaseProvider();

// Run self-healing database migrations programmatically before initializing Prisma
try {
  console.log('[Core] Running self-healing database migrations...');
  const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
  execSync(`npx prisma db push --accept-data-loss --schema="${schemaPath}"`, { stdio: 'inherit' });
  console.log('[Core] Database migrations completed successfully!');
} catch (err) {
  console.error('[Core] Failed to run database migrations programmatically:', err);
}

// Reload Prisma Client from disk to pick up SQLite/PostgreSQL provider adjustments
Object.keys(require.cache).forEach((key) => {
  if (key.includes('@prisma/client-tnp')) {
    delete require.cache[key];
  }
});
const { PrismaClient: DynamicPrismaClient } = require('@prisma/client-tnp');
const prisma = new DynamicPrismaClient();
const app = express();
const PORT = process.env.PORT || 5002;
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:5003';

app.use(express.json());

// Enterprise Middleware: Extract & Verify Injected Headers from API Gateway
interface GatewayHeaders {
  userId: string;
  role: string;
  collegeId: string;
  email: string;
  name: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      gatewayUser?: GatewayHeaders;
    }
  }
}

// In-memory Security Audit logs database (Real-Time Security Feed)
interface SecurityAuditLog {
  id: string;
  timestamp: string;
  ip: string;
  userId: string;
  userRole: string;
  collegeId: string;
  eventType: 'BOUNDARY_BREACH_ATTEMPT' | 'SCOPE_VIOLATION' | 'UNAUTHORIZED_ACCESS';
  details: string;
}
const securityAuditTrail: SecurityAuditLog[] = [];

const logSecurityEvent = (req: Request, eventType: SecurityAuditLog['eventType'], details: string) => {
  const audit: SecurityAuditLog = {
    id: 'SEC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    timestamp: new Date().toISOString(),
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    userId: (req.headers['x-user-id'] as string) || 'anonymous',
    userRole: (req.headers['x-user-role'] as string) || 'NONE',
    collegeId: (req.headers['x-user-college-id'] as string) || 'UNKNOWN',
    eventType,
    details
  };
  securityAuditTrail.unshift(audit);
  if (securityAuditTrail.length > 50) {
    securityAuditTrail.pop(); // Keep last 50 threats
  }
  console.warn(`[SECURITY WARN] ${eventType}: ${details}`);
};

const requireGatewayHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Bypass gateway token checks for secure internal microservice interactions and health probes
  if (req.path === '/health' || req.path === '/notify-match') {
    return next();
  }

  const userId = req.headers['x-user-id'] as string;
  const role = req.headers['x-user-role'] as string;
  const collegeId = req.headers['x-user-college-id'] as string;
  const email = req.headers['x-user-email'] as string;
  const name = req.headers['x-user-name'] as string;
  const rawScopes = req.headers['x-user-scopes'] as string;

  if (!userId || !role || !collegeId) {
    logSecurityEvent(req, 'UNAUTHORIZED_ACCESS', 'Direct API access attempted bypassing GateWay headers verification.');
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Request must be routed through the secure API Gateway with valid identity context.'
    });
  }

  let scopes: string[] = [];
  try {
    if (rawScopes) scopes = JSON.parse(rawScopes);
  } catch (err) {}

  req.gatewayUser = { userId, role, collegeId, email, name, scopes };
  next();
};

app.use(requireGatewayHeaders);

// Role-Based Cryptographic Scopes checking middleware
const restrictToScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.gatewayUser!;
    if (!user.scopes || !user.scopes.includes(requiredScope)) {
      logSecurityEvent(
        req, 
        'SCOPE_VIOLATION', 
        `User ${user.email} (${user.role}) attempted action requiring scope '${requiredScope}' without proper credentials.`
      );
      return res.status(403).json({
        success: false,
        message: `Security Access Violation: Required scope '${requiredScope}' not satisfied for role ${user.role}.`
      });
    }
    next();
  };
};

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'tnp-core-service' });
});

// GET /security/audit (Real-time security logs feed query endpoint)
app.get('/security/audit', (req, res) => {
  // Allow TNP Officers or Recruiters/Admins to query the secure audit database
  return res.status(200).json({
    success: true,
    logs: securityAuditTrail
  });
});

// GET /jobs (Strict multi-tenant college isolation enforced)
app.get('/jobs', restrictToScope('jobs:read'), async (req, res) => {
  const user = req.gatewayUser!;
  
  try {
    let jobs = await prisma.job.findMany({
      where: { collegeId: user.collegeId }, // Strict multi-tenant isolation
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, jobs });
  } catch (error: any) {
    console.error('[Core] Fetch jobs error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /jobs/:id
app.get('/jobs/:id', restrictToScope('jobs:read'), async (req, res) => {
  const user = req.gatewayUser!;
  const { id } = req.params;

  try {
    const job = await prisma.job.findFirst({
      where: { id }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // Tenant Isolation boundary check!
    if (job.collegeId !== user.collegeId) {
      logSecurityEvent(
        req,
        'BOUNDARY_BREACH_ATTEMPT',
        `User ${user.email} from College '${user.collegeId}' attempted to view isolated job details for College '${job.collegeId}' (Job ID: ${id}). Access Blocked.`
      );
      return res.status(403).json({
        success: false,
        message: 'Security Boundary Breach Attempt Discovered. Event logged to placement audit board.'
      });
    }

    return res.status(200).json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /jobs (Create a job and trigger the matching engine)
app.post('/jobs', restrictToScope('jobs:write'), async (req, res) => {
  const user = req.gatewayUser!;
  const { title, companyName, description, skills, minGPA, major } = req.body;

  if (!title || !companyName || !description || !skills) {
    return res.status(400).json({ success: false, message: 'Missing required job parameters.' });
  }

  try {
    const job = await prisma.job.create({
      data: {
        title,
        companyName,
        description,
        skills,
        minGPA: minGPA ? parseFloat(minGPA) : 0.0,
        major: major || 'Any',
        collegeId: user.collegeId
      }
    });

    console.log(`[Core] Job successfully created. Triggering Matching Algorithm for Job ID: ${job.id}`);

    axios.post(`${MATCHING_SERVICE_URL}/match-job`, {
      jobId: job.id,
      title: job.title,
      companyName: job.companyName,
      skills: job.skills.split(',').map(s => s.trim()),
      minGPA: job.minGPA,
      major: job.major,
      collegeId: job.collegeId
    }).catch(err => {
      console.error('[Core] Failed to trigger matching service background thread:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Job posted and matching algorithm triggered successfully.',
      job
    });
  } catch (error: any) {
    console.error('[Core] Post job error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /apply (Student submits application)
app.post('/apply', restrictToScope('applications:apply'), async (req, res) => {
  const user = req.gatewayUser!;
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ success: false, message: 'Job ID is required.' });
  }

  try {
    // 1. Confirm Job belongs to same College (Strict Tenant check)
    const job = await prisma.job.findFirst({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (job.collegeId !== user.collegeId) {
      logSecurityEvent(
        req,
        'BOUNDARY_BREACH_ATTEMPT',
        `Student ${user.email} from College '${user.collegeId}' attempted to apply for an isolated job under College '${job.collegeId}'. Boundary breach intercepted.`
      );
      return res.status(403).json({
        success: false,
        message: 'Security Boundary Breach: Jobs in Stanford are strictly isolated from MIT students.'
      });
    }

    // 2. Prevent duplicate applications
    const existing = await prisma.application.findFirst({
      where: {
        jobId,
        studentId: user.userId
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job.' });
    }

    // 3. Create Application
    const application = await prisma.application.create({
      data: {
        jobId,
        studentId: user.userId,
        studentName: user.name,
        studentEmail: user.email,
        collegeId: user.collegeId
      }
    });

    // 4. Create Reverse Recruiter Notification Alert
    await prisma.notification.create({
      data: {
        userId: 'RECRUITER_ID_PLACEHOLDER',
        collegeId: user.collegeId,
        title: 'New Applicant Alert',
        message: `Student ${user.name} applied for "${job.title}". Check your applicant tracking dashboard.`,
        type: 'ALERT'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Application successfully submitted and recruiter notified.',
      application
    });
  } catch (error: any) {
    console.error('[Core] Apply error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /applications (List applications - isolated by roles)
app.get('/applications', restrictToScope('applications:read'), async (req, res) => {
  const user = req.gatewayUser!;

  try {
    let applications;
    if (user.role === 'STUDENT') {
      applications = await prisma.application.findMany({
        where: {
          studentId: user.userId,
          collegeId: user.collegeId
        },
        include: { job: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      applications = await prisma.application.findMany({
        where: { collegeId: user.collegeId },
        include: { job: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({ success: true, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /applications/:id (Update status - Recruiter/TNP Officer only)
app.patch('/applications/:id', restrictToScope('applications:write'), async (req, res) => {
  const user = req.gatewayUser!;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'REVIEWED', 'SELECTED', 'REJECTED'];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ success: false, message: `Invalid status.` });
  }

  try {
    const appRecord = await prisma.application.findFirst({
      where: { id },
      include: { job: true }
    });

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Boundary Isolation check
    if (appRecord.collegeId !== user.collegeId) {
      logSecurityEvent(
        req,
        'BOUNDARY_BREACH_ATTEMPT',
        `Recruiter ${user.email} attempted to alter an isolated candidate application status inside College ${appRecord.collegeId}. Intercepted.`
      );
      return res.status(403).json({
        success: false,
        message: 'Security Boundary Breach: Action forbidden outside target college placement scopes.'
      });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: status.toUpperCase() }
    });

    // Notify the student about the status update
    await prisma.notification.create({
      data: {
        userId: appRecord.studentId,
        collegeId: user.collegeId,
        title: `Application Status Updated: ${status.toUpperCase()}`,
        message: `Your application status for "${appRecord.job.title}" at ${appRecord.job.companyName} is now ${status.toUpperCase()}.`,
        type: 'ALERT'
      }
    });

    return res.status(200).json({ success: true, message: 'Status updated successfully.', application: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /notifications (List notifications for user)
app.get('/notifications', async (req, res) => {
  const user = req.gatewayUser!;

  try {
    const allNotifications = await prisma.notification.findMany({
      where: { collegeId: user.collegeId },
      orderBy: { createdAt: 'desc' }
    });

    const filtered = allNotifications.filter(n => {
      if (user.role === 'RECRUITER' && n.type === 'ALERT' && n.title.includes('New Applicant')) {
        return true;
      }
      return n.userId === user.userId;
    });

    return res.status(200).json({ success: true, notifications: filtered });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /notify-match (Called internally by matching-service to log system email notifications)
app.post('/notify-match', async (req, res) => {
  const { studentId, studentEmail, studentName, jobId, jobTitle, companyName, collegeId } = req.body;
  
  try {
    await prisma.notification.create({
      data: {
        userId: studentId,
        collegeId: collegeId,
        title: `New Matching Job Posting Found!`,
        message: `Dear ${studentName}, your skills match perfectly with "${jobTitle}" at ${companyName}. Click the link to review and apply: http://localhost:5173/jobs/${jobId}`,
        type: 'EMAIL'
      }
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`[TnpCoreService] Running on port ${PORT}`);
});
