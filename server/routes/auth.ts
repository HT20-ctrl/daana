/**
 * Authentication Routes
 * 
 * Handles user registration, login, and other auth-related endpoints
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';
import { nanoid } from 'nanoid';

const router = Router();

// Secret for JWT tokens
const JWT_SECRET = process.env.SESSION_SECRET || 'supersecretkey';

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

/**
 * Register a new user
 * POST /api/auth/signup
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }
    
    const { email, password, firstName, lastName } = validation.data;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }
    
    // Hash the password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    
    // Generate a unique user ID
    const userId = nanoid();
    
    // Create user
    const user = await storage.upsertUser({
      id: userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isVerified: true, // Auto-verify for demo purposes
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create default organization for the user
    const organizationId = nanoid();
    await storage.createOrganization({
      id: organizationId,
      name: `${firstName || 'New'}'s Organization`,
      plan: 'professional',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Add user as admin of the organization
    await storage.addOrganizationMember({
      userId: user.id,
      organizationId,
      role: 'admin',
      isDefault: true,
      joinedAt: new Date().toISOString()
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, organizationId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user info (without sensitive data)
    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed. Please try again later.'
    });
  }
});

/**
 * Login user
 * POST /api/auth/signin
 */
router.post('/signin', async (req: Request, res: Response) => {
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
    
    // Get user by email
    const user = await storage.getUserByEmail(email);
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // Verify password
    if (!user.password) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Password not set for this account'
      });
    }
    
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // Get user's organizations
    const organizations = await storage.getOrganizationsByUserId(user.id);
    
    // Use first organization as default
    const defaultOrg = organizations[0];
    const organizationId = defaultOrg ? defaultOrg.id : null;
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, organizationId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update user's last login time (in background)
    setTimeout(async () => {
      await storage.upsertUser({
        ...user,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
    }, 0);
    
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      organizations,
      currentOrganization: defaultOrg,
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed. Please try again later.'
    });
  }
});

/**
 * Get current authenticated user
 * GET /api/auth/user
 */
router.get('/user', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    // For demo purposes, return a demo user without token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Demo user for development
      return res.json({
        id: "1",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        role: "admin"
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get user from database
      const user = await storage.getUser(decoded.userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      // Get user's organizations
      const organizations = await storage.getOrganizationsByUserId(user.id);
      
      // Return user info (without sensitive data)
      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizations
      });
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  } catch (error: any) {
    console.error('Get user error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user information'
    });
  }
});

/**
 * Get user's organizations
 * GET /api/auth/organizations
 */
router.get('/organizations', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    // For demo purposes without token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Demo organizations
      return res.json([
        {
          id: "1",
          name: "Demo Organization",
          plan: "professional",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get user's organizations
      const organizations = await storage.getOrganizationsByUserId(decoded.userId);
      
      return res.json(organizations);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  } catch (error: any) {
    console.error('Get organizations error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve organizations'
    });
  }
});

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  // Nothing to do for JWT auth as token is stored on client
  return res.json({
    message: 'Logged out successfully'
  });
});

export default router;