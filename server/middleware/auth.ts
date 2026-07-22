import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'executive' | 'manager' | 'officer' | 'customer';
  branchId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// HMAC JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'psa-super-secret-jwt-key-2026';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function signJwt(payload: object, expiresInSeconds = 900): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }

    return payload as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check Authorization header or Cookie
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );
    token = cookies['psa_access_token'];
  }

  if (!token) {
    // In development/demo mode: attach a default officer so the app works without auth headers.
    // In production: reject unauthenticated requests with 401.
    if (process.env.NODE_ENV === 'production') {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    req.user = {
      id: 'lo-001',
      email: 'c.banda@pinnacle.mw',
      name: 'Chisomo Banda',
      role: 'officer',
      branchId: 'branch-lil',
    };
    return next();
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    res.status(401).json({ success: false, error: 'Invalid or expired access token' });
    return;
  }

  req.user = decoded;
  next();
}
