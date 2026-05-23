import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { 
  securityHeaders, 
  apiLimiter, 
  verifyAndInjectHeaders, 
  sanitizeInput, 
  bruteForceLockout,
  recordFailedLoginAttempt,
  clearFailedLoginRecord
} from './middleware/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role', 'x-user-college-id', 'x-user-email', 'x-user-name']
}));

// Apply basic security headers and rate limiter
app.use(securityHeaders);
app.use('/api/', apiLimiter);

// Threat defense: Block IP addresses flagged with brute force attempts
app.use('/api/auth/login', bruteForceLockout);

// Global payload sanitization (Secures against XSS / SQL Injection payloads)
app.use(express.json());
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Middleware to verify JWT and inject custom identity headers
app.use(verifyAndInjectHeaders);

// Downstream Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const TNP_CORE_SERVICE_URL = process.env.TNP_CORE_SERVICE_URL || 'http://localhost:5002';
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:5003';

// Proxy /api/auth to Auth Service
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '/',
    },
    selfHandleResponse: true, // Handle response to intercept credentials failures!
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id'] as string);
        if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role'] as string);
        if (req.headers['x-user-college-id']) proxyReq.setHeader('x-user-college-id', req.headers['x-user-college-id'] as string);
        if (req.headers['x-user-email']) proxyReq.setHeader('x-user-email', req.headers['x-user-email'] as string);
        if (req.headers['x-user-name']) proxyReq.setHeader('x-user-name', req.headers['x-user-name'] as string);
        
        // Write the body payload because selfHandleResponse is true
        if ((req as any).body) {
          const bodyData = JSON.stringify((req as any).body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        const anyReq = req as any;
        const anyRes = res as any;
        let body = '';
        proxyRes.on('data', (chunk) => { body += chunk; });
        proxyRes.on('end', () => {
          const ip = anyReq.ip || anyReq.socket?.remoteAddress || 'unknown';
          
          try {
            const data = JSON.parse(body);
            // Intercept failed login attempts at Gateway Level!
            if (anyReq.path?.startsWith('/login')) {
              if (data.success) {
                clearFailedLoginRecord(ip);
              } else {
                const count = recordFailedLoginAttempt(ip);
                data.message = `${data.message} (Security Warning: ${count}/3 failed attempts before lockout)`;
              }
            }
            anyRes.status(proxyRes.statusCode || 200).json(data);
          } catch (err) {
            // Forward raw if parsing fails
            anyRes.status(proxyRes.statusCode || 500).send(body);
          }
        });
      },
      error: (err, req, res) => {
        (res as any).status(503).json({
          success: false,
          message: 'Auth service is temporarily unavailable',
        });
      }
    }
  })
);

// Proxy /api/tnp to TNP Core Service
app.use(
  '/api/tnp',
  createProxyMiddleware({
    target: TNP_CORE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/tnp': '/',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id'] as string);
        if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role'] as string);
        if (req.headers['x-user-college-id']) proxyReq.setHeader('x-user-college-id', req.headers['x-user-college-id'] as string);
        if (req.headers['x-user-email']) proxyReq.setHeader('x-user-email', req.headers['x-user-email'] as string);
        if (req.headers['x-user-name']) proxyReq.setHeader('x-user-name', req.headers['x-user-name'] as string);
        if (req.headers['x-user-scopes']) proxyReq.setHeader('x-user-scopes', req.headers['x-user-scopes'] as string);
      },
      error: (err, req, res) => {
        (res as any).status(503).json({
          success: false,
          message: 'TNP core service is temporarily unavailable',
        });
      }
    }
  })
);

// Proxy /api/matching to Matching Service
app.use(
  '/api/matching',
  createProxyMiddleware({
    target: MATCHING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/matching': '/',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id'] as string);
        if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role'] as string);
        if (req.headers['x-user-college-id']) proxyReq.setHeader('x-user-college-id', req.headers['x-user-college-id'] as string);
        if (req.headers['x-user-email']) proxyReq.setHeader('x-user-email', req.headers['x-user-email'] as string);
        if (req.headers['x-user-name']) proxyReq.setHeader('x-user-name', req.headers['x-user-name'] as string);
        if (req.headers['x-user-scopes']) proxyReq.setHeader('x-user-scopes', req.headers['x-user-scopes'] as string);
      },
      error: (err, req, res) => {
        (res as any).status(503).json({
          success: false,
          message: 'Matching service is temporarily unavailable',
        });
      }
    }
  })
);

app.listen(PORT, () => {
  console.log(`[GateWay] Running on port ${PORT}`);
});
