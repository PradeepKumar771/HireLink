import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-hirelink';

// Sliding window tracker for login threat monitoring
interface FailedLoginAttempt {
  count: number;
  lockoutUntil?: number;
}
const failedLogins = new Map<string, FailedLoginAttempt>();

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Rate limiting middleware
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Advanced Recursive Input Sanitizer Middleware (XSS & SQL Injection Defense-in-depth)
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (val: any): any => {
    if (typeof val === 'string') {
      return val
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove <script> tags
        .replace(/['"]\s*(OR|AND)\s*['"]?\d*['"]?\s*=\s*['"]?\d*/gi, '') // Block active SQL injector patterns
        .replace(/javascript:/gi, '') // Disable javascript URI injection
        .replace(/[<>]/g, s => (s === '<' ? '&lt;' : '&gt;')); // HTML entities escape
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    if (val !== null && typeof val === 'object') {
      const cleaned: any = {};
      for (const key in val) {
        cleaned[key] = sanitizeValue(val[key]);
      }
      return cleaned;
    }
    return val;
  };

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

// Brute Force Guard: Lock out malicious IPs after 3 consecutive failed login attempts
export const bruteForceLockout = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const record = failedLogins.get(ip);
  
  if (record && record.lockoutUntil && record.lockoutUntil > Date.now()) {
    const remainingSeconds = Math.round((record.lockoutUntil - Date.now()) / 1000);
    return res.status(423).json({
      success: false,
      message: `SECURITY THREAT DISCOVERED: Temporary IP Ban Active. Too many login failures. Please wait ${remainingSeconds} seconds.`
    });
  }
  
  next();
};

// Hooks called by auth-service proxies to record authentication status
export const recordFailedLoginAttempt = (ip: string): number => {
  const record = failedLogins.get(ip) || { count: 0 };
  record.count += 1;
  if (record.count >= 3) {
    record.lockoutUntil = Date.now() + 60 * 1000; // Ban for 60 seconds locally to enable quick testing
  }
  failedLogins.set(ip, record);
  return record.count;
};

export const clearFailedLoginRecord = (ip: string) => {
  failedLogins.delete(ip);
};

export interface DecodedUser {
  userId: string;
  email: string;
  role: string;
  collegeId: string;
  name: string;
  scopes: string[];
}

// Gateway JWT verification & cryptographic scope injection
export const verifyAndInjectHeaders = (
  req: Request & { user?: DecodedUser },
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
      return next();
    }
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;
    req.user = decoded;
    
    // Inject headers to forward identity to internal cluster microservices
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-user-college-id'] = decoded.collegeId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-name'] = decoded.name;
    req.headers['x-user-scopes'] = JSON.stringify(decoded.scopes || []);
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
