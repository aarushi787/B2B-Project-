// Purpose: This module (backend/src/routes/auth.ts) is used to implement project functionality in a modular, maintainable way.
import crypto from 'crypto';
import { notifyAdmins } from '../services/notify.js';
import { emitToUser } from '../realtime/socket.js';
import { OTP_TTL_MS, canSendCode, canTryCode, codeMatches, generateCode, hashCode, maskPhone, normalizePhone, OTP_RESEND_COOLDOWN_MS } from '../services/otp.js';
import { sendSms, smsProvider } from '../services/sms.js';
import { createAuditLog } from '../utils/audit.js';
import { ApiError } from '../utils/http.js';
import { normalizeAccountRole, toDbRole } from '../utils/roles.js';
import { csrfTokenFor, csrfTokenForRequest } from '../middleware/csrf.js';
import { frontendBaseUrl } from '../utils/origins.js';
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { isValidGst, isValidPan, isValidPhone } from '../services/compliance.js';
import { logger } from '../utils/logger.js';
import {
  changePasswordSchema,
  emptyBodySchema,
  preferencesSchema,
  phoneSendSchema,
  phoneVerifySchema,
  refreshTokenSchema,
  userLoginSchema,
  userProfileUpdateSchema,
  userRegisterSchema,
  validateRequest,
} from '../middleware/validation.js';
import {
  clearAuthCookies,
  createRefreshToken,
  getRefreshTokenFromRequest,
  hashRefreshToken,
  refreshTokenExpiryDate,
  setAuthCookies,
  signAccessToken,
  signSocketToken,
  SOCKET_TOKEN_TTL_SECONDS,
} from '../services/tokens.js';
import { sendEmail } from '../services/email.js';

const router = Router();

type DbUser = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified?: boolean | number | null;
  emailNotifications?: boolean | number | null;
  phoneVerified?: boolean | number | null;
  suspendedAt?: Date | string | null;
  password?: string;
};

type DbRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

function toClientRole(role?: string) {
  return normalizeAccountRole(role).toUpperCase();
}

function splitName(name?: string) {
  if (!name) return { firstName: undefined, lastName: undefined };
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

async function buildClientUser(connection: any, user: DbUser) {
  const [companies] = await connection.query(
    'SELECT id FROM companies WHERE userId = ? ORDER BY createdAt ASC LIMIT 1',
    [user.id]
  );
  const companyId = (companies as any[])[0]?.id ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: toClientRole(user.role),
    emailVerified: !!user.emailVerified,
    phoneVerified: !!user.phoneVerified,
    emailNotifications: user.emailNotifications === undefined || user.emailNotifications === null ? true : !!user.emailNotifications,
    name,
    companyId,
  };
}

async function persistRefreshToken(
  connection: any,
  userId: string,
  refreshToken: string,
  req: Request,
  id = uuidv4()
): Promise<string> {
  await connection.query(
    `INSERT INTO refresh_tokens (id, userId, tokenHash, expiresAt, createdByIp, userAgent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      hashRefreshToken(refreshToken),
      refreshTokenExpiryDate(),
      req.ip ?? null,
      req.get('user-agent') ?? null,
    ]
  );
  return id;
}

async function issueSession(connection: any, req: Request, res: Response, user: DbUser) {
  const clientUser = await buildClientUser(connection, user);
  const accessToken = signAccessToken({
    userId: user.id,
    companyId: clientUser.companyId,
    role: normalizeAccountRole(user.role),
  });
  const refreshToken = createRefreshToken();
  await persistRefreshToken(connection, user.id, refreshToken, req);
  setAuthCookies(res, accessToken, refreshToken);

  // Tokens travel only in httpOnly cookies. The JSON carries the CSRF token (kept in memory by the client).
  return { user: clientUser, csrfToken: csrfTokenFor(refreshToken) };
}

// Register
/** A one-time email verification link: only the SHA-256 of the token is stored, and it stops working after 24 hours. */
const EMAIL_LINK_HOURS = 24;
const REFRESH_REUSE_GRACE_MS = 10_000;
function newEmailVerification() {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    hash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + EMAIL_LINK_HOURS * 3600 * 1000),
  };
}

router.post('/register', authLimiter, validateRequest(userRegisterSchema), async (req: Request, res: Response) => {
  let connection;
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      name,
      phone,
      companyName,
      companyId,
      gstNumber,
      panNumber,
      industry,
      companyDomain,
      website,
      address,
      description,
    } = req.body;

    const normalizedGst = gstNumber ? String(gstNumber).trim().toUpperCase() : null;
    const normalizedPhone = String(phone).trim();

    if (normalizedGst && !isValidGst(normalizedGst)) {
      return res.status(400).json({
        error: 'Invalid GST format. Expected 15 characters like 27ABCDE1234F1Z5',
      });
    }
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone format. Use 8-15 digits, optional leading + (example: +919876543210)',
      });
    }

    const normalizedPan = panNumber ? String(panNumber).trim().toUpperCase() : null;
    if (normalizedPan && !isValidPan(normalizedPan)) {
      return res.status(400).json({
        error: 'Invalid PAN format. Expected 10 characters like ABCDE1234F',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const resolvedName = splitName(name);
    const resolvedFirstName = firstName ?? resolvedName.firstName;
    const resolvedLastName = lastName ?? resolvedName.lastName;

    connection = await pool.getConnection();

    const [users] = await connection.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if ((users as any[]).length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const emailLink = newEmailVerification();
    const verifyToken = emailLink.token;

    await connection.query(
      'INSERT INTO users (id, email, password, phone, firstName, lastName, role, verifyToken, verifyTokenExpiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        normalizedEmail,
        hashedPassword,
        normalizedPhone,
        resolvedFirstName ?? null,
        resolvedLastName ?? null,
        // Never trust a client-supplied role: self-registered accounts are always regular users.
        toDbRole('user'),
        emailLink.hash,
        emailLink.expiresAt
      ]
    );

    const verifyUrl = `${frontendBaseUrl()}/verify-email?token=${verifyToken}`;
    await sendEmail(normalizedEmail, 'Verify your B2BForCorporates Email', `
      <h1>Welcome to B2BForCorporates!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `);

    const createdCompanyId = companyId ?? uuidv4();
    await connection.query(
      'INSERT INTO companies (id, name, email, gst, pan, phone, address, website, domain, industry, description, userId, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        createdCompanyId,
        companyName,
        normalizedEmail,
        normalizedGst,
        normalizedPan,
        normalizedPhone,
        address ?? null,
        website ?? null,
        companyDomain ?? null,
        industry ?? null,
        description ?? 'Merchant onboarding profile',
        userId,
        false,
      ]
    );

    const [createdUsers] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
    const createdUser = (createdUsers as any[])[0] as DbUser;
    const session = await issueSession(connection, req, res, createdUser);

    void notifyAdmins({
      kind: 'USER_REGISTERED', title: 'New user registered', message: `${createdUser.email} joined.`,
      actorUserId: userId, actorCompanyId: createdCompanyId, resourceType: 'user', resourceId: userId,
    });
    return res.status(201).json(session);
  } catch (error) {
    logger.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  } finally {
    connection?.release();
  }
});

// Login
router.post('/login', authLimiter, validateRequest(userLoginSchema), async (req: Request, res: Response) => {
  let connection;
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();
    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if ((users as any[]).length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = (users as any)[0] as DbUser;
    const isValid = await bcrypt.compare(password, user.password || '');

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Only said after the password is right, so this does not reveal which emails have accounts.
    if (user.suspendedAt) {
      return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
    }

    const session = await issueSession(connection, req, res, user);
    return res.json(session);
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  } finally {
    connection?.release();
  }
});

// Short-lived token for opening the websocket (see services/tokens.ts). Needs a valid cookie session.
router.get('/socket-token', authMiddleware, (req: AuthRequest, res: Response) => {
  res.set('Cache-Control', 'no-store');
  return res.json({
    token: signSocketToken({ userId: req.userId!, companyId: req.companyId ?? null, role: req.role ?? 'user' }),
    expiresIn: SOCKET_TOKEN_TTL_SECONDS,
  });
});

// CSRF token for the current session (the client calls this on page load).
router.get('/csrf', (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  return res.json({ csrfToken: csrfTokenForRequest(req) });
});

// Refresh (token rotation)
router.post('/refresh', validateRequest(refreshTokenSchema), async (req: Request, res: Response) => {
  let connection;
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, userId, tokenHash, expiresAt, revokedAt
       FROM refresh_tokens
       WHERE tokenHash = ?
       LIMIT 1`,
      [hashRefreshToken(refreshToken)]
    );
    const currentToken = (rows as DbRefreshToken[])[0];
    if (!currentToken || new Date(currentToken.expiresAt).getTime() <= Date.now()) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    if (currentToken.revokedAt) {
      // Two tabs refreshing together is normal, so a token used moments ago is simply refused. A token that was
      // already rotated a while ago and shows up again looks stolen, so the whole login family is ended.
      if (Date.now() - new Date(currentToken.revokedAt).getTime() > REFRESH_REUSE_GRACE_MS) {
        await connection.query('UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE userId = ? AND revokedAt IS NULL', [currentToken.userId]);
        logger.warn('refresh_token_reuse_detected', { userId: currentToken.userId });
      }
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [currentToken.userId]);
    const user = (users as any[])[0] as DbUser | undefined;
    if (!user || user.suspendedAt) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token user' });
    }

    const nextRefreshToken = createRefreshToken();
    const nextRefreshTokenId = uuidv4();
    await persistRefreshToken(connection, user.id, nextRefreshToken, req, nextRefreshTokenId);
    // Claim the old token atomically: of two simultaneous requests only one changes the row, the other is refused.
    const [claim] = await connection.query(
      'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP, replacedByTokenId = ? WHERE id = ? AND revokedAt IS NULL',
      [nextRefreshTokenId, currentToken.id]
    );
    if ((claim as { affectedRows: number }).affectedRows !== 1) {
      await connection.query('UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE id = ?', [nextRefreshTokenId]);
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const clientUser = await buildClientUser(connection, user);
    const accessToken = signAccessToken({
      userId: user.id,
      companyId: clientUser.companyId,
      role: normalizeAccountRole(user.role),
    });

    setAuthCookies(res, accessToken, nextRefreshToken);
    return res.json({ user: clientUser, csrfToken: csrfTokenFor(nextRefreshToken) });
  } catch (error) {
    logger.error('Refresh token error:', error);
    clearAuthCookies(res);
    return res.status(500).json({ error: 'Failed to refresh token' });
  } finally {
    connection?.release();
  }
});

// Logout
// Logout is idempotent and works even when the short-lived access token has already expired.
router.post('/logout', validateRequest(refreshTokenSchema), async (req: Request, res: Response) => {
  let connection;
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      connection = await pool.getConnection();
      await connection.query(
        'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE tokenHash = ? AND revokedAt IS NULL',
        [hashRefreshToken(refreshToken)]
      );
    }
    clearAuthCookies(res);
    return res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
    clearAuthCookies(res);
    return res.status(500).json({ error: 'Logout failed' });
  } finally {
    connection?.release();
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT id, email, phone, firstName, lastName, role, emailVerified, emailNotifications, phoneVerified FROM users WHERE id = ?',
      [req.userId]
    );

    if ((users as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await buildClientUser(connection, (users as any)[0] as DbUser);
    return res.json(user);
  } catch (error) {
    logger.error('Get me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  } finally {
    connection?.release();
  }
});

// Update profile
router.put(
  '/profile',
  authMiddleware,
  validateRequest(userProfileUpdateSchema),
  async (req: AuthRequest, res: Response) => {
    let connection;
    try {
      const { firstName, lastName, name } = req.body;
      const parsed = splitName(name);
      const nextFirstName = firstName ?? parsed.firstName ?? null;
      const nextLastName = lastName ?? parsed.lastName ?? null;

      connection = await pool.getConnection();

      await connection.query(
        'UPDATE users SET firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName) WHERE id = ?',
        [nextFirstName, nextLastName, req.userId]
      );

      const [users] = await connection.query(
        'SELECT id, email, phone, firstName, lastName, role, emailVerified, emailNotifications, phoneVerified FROM users WHERE id = ?',
        [req.userId]
      );
      const user = await buildClientUser(connection, (users as any[])[0] as DbUser);

      return res.json(user);
    } catch (error) {
      logger.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    } finally {
      connection?.release();
    }
  }
);

// Change password
router.post(
  '/change-password',
  authMiddleware,
  authLimiter,
  validateRequest(changePasswordSchema),
  async (req: AuthRequest, res: Response) => {
    let connection;
    try {
      const { currentPassword, oldPassword, newPassword } = req.body;
      const existingPassword = currentPassword ?? oldPassword;

      connection = await pool.getConnection();
      const [users] = await connection.query('SELECT password FROM users WHERE id = ?', [req.userId]);

      if ((users as any[]).length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await bcrypt.compare(existingPassword, (users as any)[0].password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.userId]);
      // A changed password ends every other session (a stolen one included) but keeps this browser signed in.
      const current = getRefreshTokenFromRequest(req);
      await connection.query(
        'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE userId = ? AND revokedAt IS NULL AND tokenHash <> ?',
        [req.userId, current ? hashRefreshToken(current) : '']
      );

      return res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    } finally {
      connection?.release();
    }
  }
);

// Validate token
router.post('/validate-token', authMiddleware, validateRequest(emptyBodySchema), (req: AuthRequest, res: Response) => {
  return res.json({ valid: true, userId: req.userId });
});

// Request Password Reset
router.post('/request-password-reset', authLimiter, async (req: Request, res: Response) => {
  let connection;
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const normalizedEmail = String(email).toLowerCase().trim();
    
    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    
    if ((users as any[]).length > 0) {
      // Only a hash of the token is stored, so a database leak does not hand out working reset links.
      const resetToken = crypto.randomBytes(32).toString('base64url');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await connection.query('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE email = ?', [crypto.createHash('sha256').update(resetToken).digest('hex'), expiry, normalizedEmail]);

      const resetUrl = `${frontendBaseUrl()}/auth?mode=reset-password&token=${encodeURIComponent(resetToken)}`;
      await sendEmail(normalizedEmail, 'Password Reset Request', `
        <p>You requested a password reset. Click the link below to reset it:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>If you did not request this, please ignore this email.</p>
      `);
    }
    
    return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (error) {
    logger.error('Request password reset error:', error);
    return res.status(500).json({ error: 'Failed to request password reset' });
  } finally {
    connection?.release();
  }
});

// Reset Password
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  let connection;
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    
    connection = await pool.getConnection();
    if (typeof token !== 'string' || token.length > 200) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // Links sent before tokens were hashed are plain, so they still work once.
    const [users] = await connection.query('SELECT id, resetTokenExpiry FROM users WHERE resetToken = ? OR resetToken = ?', [tokenHash, token]);
    const user = (users as any[])[0];
    
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    if (new Date(user.resetTokenExpiry).getTime() < Date.now()) return res.status(400).json({ error: 'Reset token has expired' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?', [hashedPassword, user.id]);
    // Someone resetting a password may be recovering from a break-in, so every existing session is ended.
    await connection.query('UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE userId = ? AND revokedAt IS NULL', [user.id]);

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  } finally {
    connection?.release();
  }
});

// Verify Email
// Sends a fresh verification link to the signed-in user. Limited like login so it can't be used to spam an inbox.
router.post('/resend-verification', authLimiter, authMiddleware, validateRequest(emptyBodySchema), async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id, email, emailVerified FROM users WHERE id = ?', [req.userId]);
    const user = (users as any[])[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ alreadyVerified: true });

    const emailLink = newEmailVerification();
    const verifyToken = emailLink.token;
    await connection.query('UPDATE users SET verifyToken = ?, verifyTokenExpiresAt = ? WHERE id = ?', [emailLink.hash, emailLink.expiresAt, user.id]);
    const verifyUrl = `${frontendBaseUrl()}/verify-email?token=${verifyToken}`;
    await sendEmail(user.email, 'Verify your B2BForCorporates Email', `
      <h1>Verify your email</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `);
    return res.json({ sent: true });
  } catch (error) {
    logger.error('Resend verification error:', error);
    return res.status(500).json({ error: 'Failed to send verification email' });
  } finally {
    connection?.release();
  }
});

router.post('/verify-email', authLimiter, async (req: Request, res: Response) => {
  let connection;
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token || token.length > 200) return res.status(400).json({ error: 'This verification link is not valid.' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    connection = await pool.getConnection();
    // Links sent before tokens were hashed are plain and have no expiry, so they still work once.
    const [users] = await connection.query(
      'SELECT id, emailVerified, verifyTokenExpiresAt FROM users WHERE verifyToken = ? OR verifyToken = ?',
      [hash, token]
    );
    const user = (users as any[])[0];
    if (!user) return res.status(400).json({ error: 'This verification link is not valid or was already used.' });
    if (user.verifyTokenExpiresAt && new Date(user.verifyTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This verification link has expired. Sign in and request a new one.', expired: true });
    }

    await connection.query('UPDATE users SET emailVerified = TRUE, verifyToken = NULL, verifyTokenExpiresAt = NULL WHERE id = ?', [user.id]);
    // Real time: any open tab of this user updates immediately, without a refresh.
    emitToUser(user.id, 'user:updated', { emailVerified: true });
    return res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify email error:', error);
    return res.status(500).json({ error: 'Failed to verify email' });
  } finally {
    connection?.release();
  }
});

// --- Settings: preferences and sessions ---------------------------------------------------------------------------------

router.put('/preferences', authMiddleware, validateRequest(preferencesSchema), async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('UPDATE users SET emailNotifications = ? WHERE id = ?', [req.body.emailNotifications, req.userId]);
    return res.json({ emailNotifications: req.body.emailNotifications });
  } catch (error) {
    logger.error('Update preferences error:', error);
    return res.status(500).json({ error: 'Failed to save your preferences' });
  }
});

// The browsers and devices currently signed in to this account. Each one holds one live refresh token.
router.get('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const current = getRefreshTokenFromRequest(req);
    const currentHash = current ? hashRefreshToken(current) : '';
    const [rows] = await pool.query(
      `SELECT id, tokenHash, userAgent, createdByIp, createdAt, expiresAt
       FROM refresh_tokens
       WHERE userId = ? AND revokedAt IS NULL AND expiresAt > CURRENT_TIMESTAMP
       ORDER BY createdAt DESC LIMIT 50`,
      [req.userId]
    );
    return res.json((rows as any[]).map((r) => ({
      id: r.id,
      userAgent: r.userAgent ?? null,
      ip: r.createdByIp ?? null,
      lastActive: r.createdAt,
      expiresAt: r.expiresAt,
      current: r.tokenHash === currentHash,
    })));
  } catch (error) {
    logger.error('List sessions error:', error);
    return res.status(500).json({ error: 'Failed to load your sessions' });
  }
});

router.post('/sessions/revoke-others', authMiddleware, validateRequest(emptyBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const current = getRefreshTokenFromRequest(req);
    const [result] = await pool.query(
      'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE userId = ? AND revokedAt IS NULL AND tokenHash <> ?',
      [req.userId, current ? hashRefreshToken(current) : '']
    );
    return res.json({ revoked: (result as { affectedRows: number }).affectedRows });
  } catch (error) {
    logger.error('Revoke other sessions error:', error);
    return res.status(500).json({ error: 'Failed to sign out other devices' });
  }
});

router.delete('/sessions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const current = getRefreshTokenFromRequest(req);
    const [result] = await pool.query(
      'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ? AND revokedAt IS NULL AND tokenHash <> ?',
      [req.params.id, req.userId, current ? hashRefreshToken(current) : '']
    );
    // Same answer for "not yours", "already gone" and "this very session" (use Sign out for that one).
    if ((result as { affectedRows: number }).affectedRows === 0) return res.status(404).json({ error: 'Session not found' });
    return res.json({ id: req.params.id, revoked: true });
  } catch (error) {
    logger.error('Revoke session error:', error);
    return res.status(500).json({ error: 'Failed to sign out that device' });
  }
});

// --- Phone verification by one-time code --------------------------------------------------------------------------------------

const otpSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
};

router.post('/phone/send', authLimiter, authMiddleware, validateRequest(phoneSendSchema), async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT id, phone, phoneVerified FROM users WHERE id = ?', [req.userId]);
    const user = (rows as any[])[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const phone = normalizePhone(req.body.phone ?? user.phone);
    if (!phone) return res.status(400).json({ error: 'Enter a valid mobile number with the country code, for example +919876543210.' });

    const changed = phone !== normalizePhone(user.phone);
    if (!changed && user.phoneVerified) return res.json({ alreadyVerified: true });

    const [recent] = await pool.query(
      `SELECT MAX(createdAt) AS lastSentAt, COUNT(*) AS sends FROM phone_verifications WHERE userId = ? AND createdAt > (CURRENT_TIMESTAMP - INTERVAL 1 HOUR)`,
      [req.userId]
    );
    const r = (recent as any[])[0] ?? {};
    const decision = canSendCode({ lastSentAt: r.lastSentAt, sendsLastHour: Number(r.sends) || 0 });
    if (!decision.ok) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      return res.status(decision.status).json({ error: decision.message, retryAfterSeconds: decision.retryAfterSeconds });
    }

    // A changed number is unverified until its own code is entered.
    if (changed) await pool.query('UPDATE users SET phone = ?, phoneVerified = FALSE WHERE id = ?', [phone, req.userId]);

    const code = generateCode();
    const id = uuidv4();
    await pool.query('UPDATE phone_verifications SET consumedAt = CURRENT_TIMESTAMP WHERE userId = ? AND consumedAt IS NULL', [req.userId]);
    await pool.query(
      'INSERT INTO phone_verifications (id, userId, phone, codeHash, expiresAt) VALUES (?, ?, ?, ?, ?)',
      [id, req.userId, phone, hashCode(otpSecret(), req.userId!, phone, code), new Date(Date.now() + OTP_TTL_MS)]
    );

    try {
      await sendSms(phone, `Your B2BForCorporates verification code is ${code}. It expires in 10 minutes. Do not share it with anyone.`);
    } catch (error) {
      await pool.query('DELETE FROM phone_verifications WHERE id = ?', [id]); // an unsent code must not count against the limit
      throw error;
    }

    return res.json({
      sent: true,
      phone: maskPhone(phone),
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendInSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      // Development only: with the console provider the code is also shown here, so testing needs no SMS account.
      ...(smsProvider() === 'console' ? { devCode: code } : {}),
    });
  } catch (error) {
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
    logger.error('Phone send error:', error);
    return res.status(500).json({ error: 'Failed to send the code' });
  }
});

router.post('/phone/verify', authLimiter, authMiddleware, validateRequest(phoneVerifySchema), async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, phone, codeHash, attempts, expiresAt, consumedAt FROM phone_verifications WHERE userId = ? AND consumedAt IS NULL ORDER BY createdAt DESC LIMIT 1',
      [req.userId]
    );
    const row = (rows as any[])[0];
    const gate = canTryCode(row);
    if (!gate.ok) return res.status(400).json({ error: gate.message, reason: gate.reason });

    // Count the try first, atomically, so two parallel guesses cannot both slip under the limit.
    const [bumped] = await pool.query('UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = ? AND consumedAt IS NULL AND attempts < ?', [row.id, 5]);
    if ((bumped as { affectedRows: number }).affectedRows !== 1) return res.status(400).json({ error: 'Too many wrong tries. Ask for a new code.', reason: 'locked' });

    if (!codeMatches(row.codeHash, otpSecret(), req.userId!, row.phone, String(req.body.code))) {
      return res.status(400).json({ error: `That code is not right. ${gate.attemptsLeft - 1} ${gate.attemptsLeft - 1 === 1 ? 'try' : 'tries'} left.`, attemptsLeft: gate.attemptsLeft - 1 });
    }

    await pool.query('UPDATE phone_verifications SET consumedAt = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);
    // The code was issued for row.phone (normalized). A stored phone may be formatted differently, so compare normalized
    // values in code and save the normalized number, rather than matching raw text in SQL.
    const [owner] = await pool.query('SELECT phone FROM users WHERE id = ?', [req.userId]);
    const current = (owner as any[])[0]?.phone;
    if (!current || normalizePhone(current) === row.phone) {
      await pool.query('UPDATE users SET phone = ?, phoneVerified = TRUE WHERE id = ?', [row.phone, req.userId]);
    }
    await createAuditLog({ userId: req.userId, action: 'PHONE_VERIFIED', resourceType: 'user', resourceId: req.userId, ipAddress: req.ip, userAgent: req.get('user-agent') });
    emitToUser(req.userId, 'user:updated', { phoneVerified: true });
    return res.json({ verified: true });
  } catch (error) {
    logger.error('Phone verify error:', error);
    return res.status(500).json({ error: 'Failed to verify the code' });
  }
});

export default router;
