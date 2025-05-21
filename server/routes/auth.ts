import express from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middleware/auth';
import { 
  login, 
  register, 
  verifyEmail, 
  requestPasswordReset, 
  resetPassword, 
  changePassword 
} from '../services/authService';
import { verifyToken } from '../utils/jwt';
import { storage } from '../storage';

const router = express.Router();

// Current user information (requires authentication)
router.get('/user', authenticateUser, async (req, res) => {
  try {
    // Return user info (password and sensitive fields are already filtered by the authenticateUser middleware)
    res.json(req.user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user information' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Validate request body with Zod
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid login data',
        errors: validationResult.error.errors 
      });
    }

    const { email, password } = validationResult.data;

    // Attempt login
    const result = await login(email, password);

    if (!result) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Return user and tokens
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    // Validate request body with Zod
    const registerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      organizationName: z.string().optional(),
    });

    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid registration data',
        errors: validationResult.error.errors 
      });
    }

    // Attempt registration
    const result = await register(validationResult.data);

    if (!result) {
      return res.status(409).json({ message: 'Registration failed. User may already exist.' });
    }

    // Return the registered user (without password)
    res.status(201).json({
      user: result.user,
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const success = await verifyEmail(token);

    if (!success) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'An error occurred during email verification' });
  }
});

// Request password reset endpoint
router.post('/request-password-reset', async (req, res) => {
  try {
    // Validate request body with Zod
    const schema = z.object({
      email: z.string().email(),
    });

    const validationResult = schema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid email address',
        errors: validationResult.error.errors 
      });
    }

    const { email } = validationResult.data;

    // Send password reset email
    const success = await requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    // Return success message even on error to prevent email enumeration
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    // Validate request body with Zod
    const schema = z.object({
      token: z.string(),
      newPassword: z.string().min(8),
    });

    const validationResult = schema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validationResult.error.errors 
      });
    }

    const { token, newPassword } = validationResult.data;

    // Reset password
    const success = await resetPassword(token, newPassword);

    if (!success) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'An error occurred during password reset' });
  }
});

// Change password endpoint (requires authentication)
router.post('/change-password', authenticateUser, async (req, res) => {
  try {
    // Validate request body with Zod
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    });

    const validationResult = schema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validationResult.error.errors 
      });
    }

    const { currentPassword, newPassword } = validationResult.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Change password
    const success = await changePassword(userId, currentPassword, newPassword);

    if (!success) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'An error occurred during password change' });
  }
});

// User profile endpoint (requires authentication)
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    // User is already available from the authenticateUser middleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user's organizations
    const organizations = await storage.getOrganizationsByUserId(userId);

    // Return user profile with organizations
    res.json({
      user: req.user,
      organizations
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'An error occurred while fetching your profile' });
  }
});

// Organization routes - these would be more extensive in a real application

// Get user's organizations
router.get('/organizations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const organizations = await storage.getOrganizationsByUserId(userId);
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

// Get organization members
router.get('/organizations/:organizationId/members', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { organizationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is a member of this organization
    const userOrgs = await storage.getOrganizationsByUserId(userId);
    const isMember = userOrgs.some(org => org.id === organizationId);

    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this organization' });
    }

    // Get organization members
    const members = await storage.getOrganizationMembers(organizationId);
    
    // Get full user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          } : null
        };
      })
    );

    res.json(membersWithDetails);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ message: 'Failed to fetch organization members' });
  }
});

export default router;