// Purpose: This module (backend/src/routes/auth.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { isValidGst, isValidPan, isValidPhone } from '../services/compliance.js';
import { logger } from '../utils/logger.js';
import {
  changePasswordSchema,
  emptyBodySchema,
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
} from '../services/tokens.js';
import { sendEmail } from '../utils/mailer.js';

const router = Router();

type DbUser = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
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
  return (role || 'buyer').toUpperCase();
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
    role: user.role.toLowerCase(),
  });
  const refreshToken = createRefreshToken();
  await persistRefreshToken(connection, user.id, refreshToken, req);
  setAuthCookies(res, accessToken, refreshToken);

  return { token: accessToken, user: clientUser };
}

// Register
router.post('/register', authLimiter, validateRequest(userRegisterSchema), async (req: Request, res: Response) => {
  let connection;
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
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

    const verifyToken = uuidv4();

    await connection.query(
      'INSERT INTO users (id, email, password, phone, firstName, lastName, role, verifyToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        normalizedEmail,
        hashedPassword,
        normalizedPhone,
        resolvedFirstName ?? null,
        resolvedLastName ?? null,
        (role || 'seller').toLowerCase(),
        verifyToken
      ]
    );

    const verifyUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;
    await sendEmail(normalizedEmail, 'Verify your B2B For Corporates Email', `
      <h1>Welcome to B2B For Corporates!</h1>
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

    const session = await issueSession(connection, req, res, user);
    return res.json(session);
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  } finally {
    connection?.release();
  }
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
    if (!currentToken || currentToken.revokedAt || new Date(currentToken.expiresAt).getTime() <= Date.now()) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [currentToken.userId]);
    const user = (users as any[])[0] as DbUser | undefined;
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token user' });
    }

    const nextRefreshToken = createRefreshToken();
    const nextRefreshTokenId = uuidv4();
    await persistRefreshToken(connection, user.id, nextRefreshToken, req, nextRefreshTokenId);
    await connection.query(
      'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP, replacedByTokenId = ? WHERE id = ?',
      [nextRefreshTokenId, currentToken.id]
    );

    const clientUser = await buildClientUser(connection, user);
    const accessToken = signAccessToken({
      userId: user.id,
      companyId: clientUser.companyId,
      role: user.role.toLowerCase(),
    });

    setAuthCookies(res, accessToken, nextRefreshToken);
    return res.json({ token: accessToken, user: clientUser });
  } catch (error) {
    logger.error('Refresh token error:', error);
    clearAuthCookies(res);
    return res.status(500).json({ error: 'Failed to refresh token' });
  } finally {
    connection?.release();
  }
});

// Logout
router.post('/logout', authMiddleware, validateRequest(refreshTokenSchema), async (req: AuthRequest, res: Response) => {
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
      'SELECT id, email, phone, firstName, lastName, role FROM users WHERE id = ?',
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
        'SELECT id, email, phone, firstName, lastName, role FROM users WHERE id = ?',
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
router.post('/request-password-reset', async (req: Request, res: Response) => {
  let connection;
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const normalizedEmail = String(email).toLowerCase().trim();
    
    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    
    if ((users as any[]).length > 0) {
      const resetToken = uuidv4();
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await connection.query('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE email = ?', [resetToken, expiry, normalizedEmail]);
      
      const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
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
router.post('/reset-password', async (req: Request, res: Response) => {
  let connection;
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    
    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id, resetTokenExpiry FROM users WHERE resetToken = ?', [token]);
    const user = (users as any[])[0];
    
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    if (new Date(user.resetTokenExpiry).getTime() < Date.now()) return res.status(400).json({ error: 'Reset token has expired' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?', [hashedPassword, user.id]);
    
    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  } finally {
    connection?.release();
  }
});

// Verify Email
router.post('/verify-email', async (req: Request, res: Response) => {
  let connection;
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    
    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id FROM users WHERE verifyToken = ?', [token]);
    const user = (users as any[])[0];
    
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });
    
    await connection.query('UPDATE users SET emailVerified = TRUE, verifyToken = NULL WHERE id = ?', [user.id]);
    
    return res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify email error:', error);
    return res.status(500).json({ error: 'Failed to verify email' });
  } finally {
    connection?.release();
  }
});

export default router;

// Password Reset Routes
router.post('/request-password-reset', async (req: Request, res: Response) => {
  let connection;
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if ((users as any[]).length > 0) {
      const resetToken = uuidv4();
      await connection.query('UPDATE users SET resetToken = ? WHERE email = ?', [resetToken, email]);
      await sendPasswordResetEmail(email, resetToken);
    }
    
    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  let connection;
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid token or password' });
    }

    connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id FROM users WHERE resetToken = ?', [token]);
    
    if ((users as any[]).length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query('UPDATE users SET password = ?, resetToken = NULL WHERE resetToken = ?', [hashedPassword, token]);
    
    res.json({ message: 'Password has been successfully reset.' });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});
