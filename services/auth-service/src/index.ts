import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client-auth';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Run self-healing database migrations programmatically before initializing Prisma
try {
  console.log('[Auth] Running self-healing database migrations...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('[Auth] Database migrations completed successfully!');
} catch (err) {
  console.error('[Auth] Failed to run database migrations programmatically:', err);
}

const prisma = new PrismaClient() as any;
const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-hirelink';

app.use(express.json());

const getScopesForRole = (role: string): string[] => {
  switch (role.toUpperCase()) {
    case 'STUDENT':
      return ['jobs:read', 'applications:apply', 'profile:write'];
    case 'RECRUITER':
      return ['jobs:write', 'applications:read', 'applications:write'];
    case 'COLLEGE_TNP_OFFICER':
      return ['jobs:read', 'jobs:write', 'applications:read', 'applications:write', 'analytics:read'];
    case 'ADMIN':
      return ['jobs:read', 'jobs:write', 'applications:read', 'applications:write', 'analytics:read', 'admin:all'];
    default:
      return [];
  }
};

// Helper function to sign JWT
const signToken = (user: any) => {
  const scopes = getScopesForRole(user.role);
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      name: user.name,
      scopes: scopes
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

// User Registration
app.post('/register', async (req, res) => {
  const { email, password, name, role, collegeId } = req.body;

  if (!email || !password || !name || !role || !collegeId) {
    return res.status(400).json({
      success: false,
      message: 'All fields (email, password, name, role, collegeId) are required.'
    });
  }

  const validRoles = ['STUDENT', 'COLLEGE_TNP_OFFICER', 'RECRUITER', 'ADMIN'];
  if (!validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role.toUpperCase(),
        collegeId: collegeId.toUpperCase()
      }
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during registration.'
    });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during login.'
    });
  }
});

// Seed Initial Sandbox Users if database is empty
const seedSandboxUsers = async () => {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('[Auth] Seeding sandbox users...');
      const studentPassword = await bcrypt.hash('student123', 10);
      const officerPassword = await bcrypt.hash('officer123', 10);
      const recruiterPassword = await bcrypt.hash('recruiter123', 10);

      // Seed Student from MIT TNP
      await prisma.user.create({
        data: {
          email: 'alice@mit.edu',
          passwordHash: studentPassword,
          name: 'Alice Johnson',
          role: 'STUDENT',
          collegeId: 'MIT'
        }
      });

      // Seed Student from Stanford TNP (for tenant isolation test)
      await prisma.user.create({
        data: {
          email: 'bob@stanford.edu',
          passwordHash: studentPassword,
          name: 'Bob Miller',
          role: 'STUDENT',
          collegeId: 'STANFORD'
        }
      });

      // Seed TNP Officer from MIT
      await prisma.user.create({
        data: {
          email: 'officer@mit.edu',
          passwordHash: officerPassword,
          name: 'Professor Charles (MIT TNP)',
          role: 'COLLEGE_TNP_OFFICER',
          collegeId: 'MIT'
        }
      });

      // Seed Corporate Recruiter (Google / Meta recruiter)
      await prisma.user.create({
        data: {
          email: 'recruiter@google.com',
          passwordHash: recruiterPassword,
          name: 'Sarah Williams (Google Recruiter)',
          role: 'RECRUITER',
          collegeId: 'MIT' // Connect to MIT for pilot
        }
      });

      console.log('[Auth] Sandbox seeding completed successfully!');
    }
  } catch (err) {
    console.error('[Auth] Failed to seed sandbox users:', err);
  }
};

app.listen(PORT, async () => {
  console.log(`[AuthService] Running on port ${PORT}`);
  await seedSandboxUsers();
});
