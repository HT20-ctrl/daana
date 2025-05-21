/**
 * Authentication Routes
 * 
 * Handles user registration, login, and other auth-related endpoints
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  getUserById,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  inviteUserToOrganization,
  acceptOrganizationInvite,
  getUserOrganizations,
  switchUserOrganization
} from '../services/authService';
import { authenticateJWT, requireRole, enforceOrganizationAccess, AuthRequest } from '../middleware/auth';
import { nanoid } from 'nanoid';

const router = Router();

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  createOrganization: z.boolean().optional().default(false),
  organizationName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.string().optional().default('member')
});

const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8).optional()
});

const switchOrgSchema = z.object({
  organizationId: z.string()
});

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { email, password, firstName, lastName, createOrganization, organizationName } = validation.data;
    
    // Register the user
    const result = await registerUser(
      email,
      password,
      firstName,
      lastName,
      createOrganization,
      organizationName
    );
    
    // Return user info (without sensitive data)
    const { password: _, verificationToken: __, ...userInfo } = result.user;
    
    return res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: userInfo
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed. Please try again later.'
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { email, password } = validation.data;
    
    // Login the user
    const { user, accessToken, refreshToken } = await loginUser(email, password);
    
    // Remove sensitive fields
    const { password: _, verificationToken: __, resetToken: ___, ...userInfo } = user;
    
    // Extend session if using Replit Auth
    if (req.session) {
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
    }
    
    return res.json({
      user: userInfo,
      accessToken,
      refreshToken
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid email or password'
    });
  }
});

/**
 * Verify email
 * GET /api/auth/verify
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Verification token is required'
      });
    }
    
    // Verify the email
    const user = await verifyEmail(token);
    
    // Redirect to login page with success message
    return res.redirect('/login?verified=true');
  } catch (error: any) {
    console.error('Email verification error:', error);
    
    // Redirect to login page with error message
    return res.redirect('/login?verificationError=true');
  }
});

/**
 * Request password reset
 * POST /api/auth/reset-request
 */
router.post('/reset-request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = resetRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { email } = validation.data;
    
    // Request password reset
    await requestPasswordReset(email);
    
    // Always return success even if email doesn't exist (for security)
    return res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    
    // Still return success (for security)
    return res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = resetPasswordSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { token, password } = validation.data;
    
    // Reset the password
    await resetPassword(token, password);
    
    return res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Password reset failed. Please try again.'
    });
  }
});

/**
 * Get current authenticated user
 * GET /api/auth/user
 */
router.get('/user', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // Get user from database (to get latest data)
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // Remove sensitive fields
    const { password, verificationToken, resetToken, ...userInfo } = user;
    
    return res.json(userInfo);
  } catch (error: any) {
    console.error('Get user error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user information'
    });
  }
});

/**
 * Invite user to organization
 * POST /api/auth/invite
 */
router.post('/invite', authenticateJWT, enforceOrganizationAccess, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = inviteUserSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { email, role } = validation.data;
    
    // Get organization info
    const organizationId = req.organizationId as string;
    const inviterName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'A team member';
    
    // TODO: Get organization name from database
    const organizationName = 'Dana AI'; // Placeholder
    
    // Invite the user
    const result = await inviteUserToOrganization(
      email,
      organizationId,
      role,
      inviterName,
      organizationName
    );
    
    return res.json({
      message: result.alreadyMember 
        ? 'User is already a member of this organization' 
        : 'Invitation sent successfully',
      success: true
    });
  } catch (error: any) {
    console.error('Invite user error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send invitation'
    });
  }
});

/**
 * Accept organization invitation
 * POST /api/auth/accept-invite
 */
router.post('/accept-invite', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = acceptInviteSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { token, password } = validation.data;
    
    // Accept the invitation
    const result = await acceptOrganizationInvite(token, password);
    
    // Remove sensitive fields
    const { password: _, verificationToken: __, resetToken: ___, ...userInfo } = result.user;
    
    return res.json({
      message: 'Invitation accepted successfully',
      user: userInfo,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Failed to accept invitation'
    });
  }
});

/**
 * Get user's organizations
 * GET /api/auth/organizations
 */
router.get('/organizations', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Get user's organizations
    const organizations = await getUserOrganizations(userId);
    
    return res.json(organizations);
  } catch (error: any) {
    console.error('Get organizations error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve organizations'
    });
  }
});

/**
 * Switch active organization
 * POST /api/auth/switch-organization
 */
router.post('/switch-organization', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = switchOrgSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { organizationId } = validation.data;
    const userId = req.user.id;
    
    // Switch organization
    const result = await switchUserOrganization(userId, organizationId);
    
    // Update session if using Replit Auth
    if (req.session) {
      req.session.organizationId = organizationId;
    }
    
    return res.json({
      message: 'Organization switched successfully',
      accessToken: result.accessToken
    });
  } catch (error: any) {
    console.error('Switch organization error:', error);
    
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message || 'Failed to switch organization'
    });
  }
});

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  // Clear session if using Replit Auth
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });
  }
  
  return res.json({
    message: 'Logged out successfully'
  });
});

export default router;