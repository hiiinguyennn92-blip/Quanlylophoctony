import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  isGuest: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}

// Read Firebase config safely for token verification and Firestore REST checks
let firebaseApiKey = '';
let firebaseProjectId = '';
let firestoreDatabaseId = '(default)';

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    firebaseApiKey = parsed.apiKey || '';
    firebaseProjectId = parsed.projectId || '';
    firestoreDatabaseId = parsed.firestoreDatabaseId || '(default)';
  }
} catch (e) {
  console.warn('[AuthMiddleware] Could not read firebase-applet-config.json:', e);
}

// In-Memory Token Verification Cache for ultra-fast (sub-millisecond) validation
interface CacheEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}
const tokenVerificationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// In-Memory Class Ownership Cache
const classOwnershipCache = new Map<string, { isOwner: boolean; expiresAt: number }>();

// Periodic cleanup
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenVerificationCache.entries()) {
    if (now > entry.expiresAt) {
      tokenVerificationCache.delete(token);
    }
  }
  for (const [key, entry] of classOwnershipCache.entries()) {
    if (now > entry.expiresAt) {
      classOwnershipCache.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Verifies a token:
 * - If Firebase ID token: verifies with Google Identity Platform & caches result
 * - If Guest Preview token: checks structure and freshness window
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token || typeof token !== 'string') return null;

  const trimmed = token.trim();

  // 1. Check in-memory cache first
  const cached = tokenVerificationCache.get(trimmed);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  // 2. Check Guest / Preview Demo Token
  if (trimmed.startsWith('guest_preview_')) {
    // Format: guest_preview_<uid>_<timestamp>
    const parts = trimmed.split('_');
    const timestampStr = parts[parts.length - 1];
    const timestamp = parseInt(timestampStr, 10);

    // Freshness check: token must be created within last 24 hours
    if (!isNaN(timestamp) && Math.abs(Date.now() - timestamp) < 24 * 60 * 60 * 1000) {
      const user: AuthenticatedUser = {
        uid: parts.slice(0, parts.length - 1).join('_'),
        email: 'guest_teacher@demo.vn',
        isGuest: true,
      };
      tokenVerificationCache.set(trimmed, {
        user,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      });
      return user;
    }
    return null;
  }

  // 3. Verify Firebase Auth ID Token via Google Identity Toolkit
  if (firebaseApiKey) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: trimmed }),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { users?: Array<{ localId: string; email?: string }> };
      const account = data.users?.[0];
      if (!account || !account.localId) {
        return null;
      }

      const user: AuthenticatedUser = {
        uid: account.localId,
        email: account.email,
        isGuest: false,
      };

      tokenVerificationCache.set(trimmed, {
        user,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return user;
    } catch (err) {
      console.error('[AuthMiddleware] Error contacting Identity Platform:', err);
      return null;
    }
  }

  return null;
}

/**
 * Verifies that the authenticated user actually owns the specified class.
 * Cross-user requests (Teacher A sending Teacher B's classId) return false.
 */
export async function verifyClassOwnership(
  user: AuthenticatedUser,
  token: string,
  classId: string
): Promise<boolean> {
  if (!classId) return true;

  // Guest users cannot access real teacher classes
  if (user.isGuest) {
    return (
      classId.startsWith('demo_') ||
      classId.startsWith('guest_') ||
      classId.startsWith('preview_') ||
      classId.includes('demo')
    );
  }

  const cacheKey = `${user.uid}:${classId}`;
  const cached = classOwnershipCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.isOwner;
  }

  // Verify directly against Firestore using the user's validated credentials
  if (firebaseProjectId) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/${firestoreDatabaseId}/documents/classes/${encodeURIComponent(classId)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        classOwnershipCache.set(cacheKey, { isOwner: false, expiresAt: Date.now() + 60 * 1000 });
        return false;
      }

      const data = (await res.json()) as any;
      const ownerId = data?.fields?.ownerId?.stringValue;
      const isOwner = ownerId === user.uid;

      classOwnershipCache.set(cacheKey, {
        isOwner,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return isOwner;
    } catch (err) {
      console.error('[AuthMiddleware] Error verifying class ownership:', err);
      return false;
    }
  }

  return false;
}

/**
 * Express Middleware for /api/ai/* endpoints:
 * 1. Requires valid Firebase ID token
 * 2. Attaches req.user and req.token
 */
export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization || (req.headers as any).Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      error: 'Yêu cầu bị từ chối: Thiếu mã xác thực (Missing Authorization header). Vui lòng đăng nhập tài khoản giáo viên để sử dụng Trợ lý AI.',
      code: 'AUTH_REQUIRED',
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: 'Yêu cầu bị từ chối: Định dạng mã xác thực không hợp lệ. Chuẩn yêu cầu là "Bearer <token>".',
      code: 'AUTH_MALFORMED',
    });
  }

  const token = parts[1];
  const user = await verifyToken(token);

  if (!user) {
    return res.status(401).json({
      error: 'Yêu cầu bị từ chối: Phiên xác thực không hợp lệ hoặc đã hết hạn. Vui lòng làm mới trang hoặc đăng nhập lại.',
      code: 'AUTH_INVALID_TOKEN',
    });
  }

  req.user = user;
  req.token = token;
  next();
}

/**
 * Express Middleware enforcing resource ownership:
 * Checks classId from body, params, or contextData.
 * If present, verifies ownership. If not owner, returns 403 Forbidden.
 */
export async function requireResourceOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  const token = req.token;

  if (!user || !token) {
    return res.status(401).json({
      error: 'Chưa xác thực người dùng.',
      code: 'AUTH_REQUIRED',
    });
  }

  const classId = req.body?.classId || req.body?.contextData?.classId || req.params?.classId;
  if (classId) {
    const isOwner = await verifyClassOwnership(user, token, classId);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Từ chối quyền truy cập: Bạn không có quyền truy cập hoặc thực hiện thao tác trên lớp học này.',
        code: 'FORBIDDEN_RESOURCE',
      });
    }
  }

  next();
}
