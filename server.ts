import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  generateComment,
  generateCompetencyBatchRecommendation,
  generateParentMessage,
  generateClassSummary,
  generateClassMeetingPlan,
  askAIAssistant,
  generateBirthdayWish,
} from './src/server/aiEndpoints.ts';
import {
  requireFirebaseAuth,
  requireResourceOwnership,
  AuthenticatedRequest,
} from './src/server/authMiddleware.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security Hardening: Disable information disclosure headers
app.disable('x-powered-by');

// Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request Timeout Middleware (protects against Slowloris attacks)
app.use((req, res, next) => {
  const timeoutMs = req.url.startsWith('/api/ai/') ? 60000 : 20000;
  req.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Yêu cầu xử lý quá hạn (Gateway Timeout).' });
    }
  });
  next();
});

// Support larger payload sizes for Excel batches, large prompts, and backups
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authentication & Token Verification Barrier for all AI endpoints
app.use('/api/ai/', (req, res, next) => {
  requireFirebaseAuth(req as AuthenticatedRequest, res, () => {
    requireResourceOwnership(req as AuthenticatedRequest, res, next);
  });
});

// Anti-DDoS & Per-User Rate Limiting for AI endpoints (Sliding window with auto-pruning)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_TEACHER_REQUESTS_PER_WINDOW = 60; // 60 requests/minute for authenticated teachers
const MAX_GUEST_REQUESTS_PER_WINDOW = 25; // 25 requests/minute for demo/preview users

// Periodic cleanup to prevent memory leaks from inactive sessions
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

app.use('/api/ai/', (req: AuthenticatedRequest, res, next) => {
  const user = req.user;
  const rateKey = user?.uid ? (user.isGuest ? `guest:${user.uid}` : `teacher:${user.uid}`) : (req.ip || 'unknown-client');
  const maxLimit = user?.isGuest ? MAX_GUEST_REQUESTS_PER_WINDOW : MAX_TEACHER_REQUESTS_PER_WINDOW;

  const now = Date.now();
  const record = rateLimitMap.get(rateKey);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(rateKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= maxLimit) {
    return res.status(429).json({
      error: user?.isGuest
        ? 'Bản dùng thử đã đạt giới hạn tần suất yêu cầu AI (25 lần/phút). Vui lòng đăng nhập tài khoản Google giáo viên để nâng hạn mức.'
        : 'Tài khoản của Thầy/Cô đang gửi nhiều yêu cầu liên tục. Vui lòng thử lại sau 30 giây.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  record.count++;
  next();
});

// Health check endpoint for Cloud Run container probes
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Lightweight Concurrency Limiter for AI Endpoints (handles spikes up to 1000+ users gracefully)
class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number = 25) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
}

const aiLimiter = new ConcurrencyLimiter(25);

// API Routes with concurrency protection
app.post('/api/ai/comment', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => generateComment(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

app.post('/api/ai/competency-batch', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => generateCompetencyBatchRecommendation(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

app.post('/api/ai/parent-message', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => generateParentMessage(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

app.post('/api/ai/class-summary', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => generateClassSummary(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

app.post('/api/ai/class-meeting', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => generateClassMeetingPlan(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

app.post('/api/ai/assistant', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => askAIAssistant(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

app.post('/api/ai/birthday-wish', async (req, res) => {
  try {
    const result = await aiLimiter.run(() => generateBirthdayWish(req.body));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
  }
});

// Static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
