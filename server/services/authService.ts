/**
 * Authentication Service for Dana AI Platform
 * Provides functionality for user authentication, registration, and account management
 */

import { User, InsertUser, OrganizationMember, InsertOrganizationMember, InsertOrganization } from '@shared/schema';
import { generateAccessToken, generateRefreshToken, generateVerificationToken, generatePasswordResetToken } from '../utils/jwt';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from './emailService';
import { storage } from '../storage';
import { compare, hash } from 'bcryptjs';
import { nanoid } from 'nanoid';

// Number of salt rounds for password hashing
const SALT_ROUNDS = 10;

/**
 * Login a user with email and password
 * @param email User's email address
 * @param password User's password
 * @returns User object with tokens if successful, null if login fails
 */
export async function login(email: string, password: string): Promise<{
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.warn(`Login attempt failed: User with email ${email} not found`);
      return null;
    }
    
    // Check if user's email is verified
    if (!user.isVerified) {
      console.warn(`Login attempt failed: User with email ${email} is not verified`);
      return null;
    }
    
    // Verify password
    if (!user.password) {
      console.warn(`Login attempt failed: User with email ${email} has no password set`);
      return null;
    }
    
    const isPasswordValid = await compare(password, user.password);
    
    if (!isPasswordValid) {
      console.warn(`Login attempt failed: Invalid password for user with email ${email}`);
      return null;
    }
    
    // Create tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
      ...(user.organizationId && { organizationId: user.organizationId })
    };
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Return user and tokens (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Register a new user
 * @param userData User registration data
 * @returns User object if successful, null if registration fails
 */
export async function register(userData: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}): Promise<{
  user: Omit<User, 'password'>;
  verificationToken?: string;
} | null> {
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    
    if (existingUser) {
      console.warn(`Registration failed: User with email ${userData.email} already exists`);
      return null;
    }
    
    // Hash password
    const hashedPassword = await hash(userData.password, SALT_ROUNDS);
    
    // Generate verification token
    const userId = nanoid();
    const verificationToken = generateVerificationToken(userId);
    
    // Create organization if name is provided
    let organizationId: string | null = null;
    
    if (userData.organizationName) {
      const organization = await storage.createOrganization({
        id: nanoid(),
        name: userData.organizationName,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      organizationId = organization.id;
      
      // Add user as admin of organization
      await storage.addOrganizationMember({
        userId,
        organizationId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create user
    const newUser: InsertUser = {
      id: userId,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      role: 'user',
      profileImageUrl: null,
      isVerified: false,
      verificationToken,
      resetToken: null,
      resetTokenExpiry: null,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const user = await storage.upsertUser(newUser);
    
    // Send welcome email with verification link
    await sendWelcomeEmail(
      user.email,
      user.firstName,
      verificationToken
    );
    
    // Return user (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      verificationToken
    };
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

/**
 * Verify a user's email using a verification token
 * @param token Email verification token
 * @returns True if verification successful, false otherwise
 */
export async function verifyEmail(token: string): Promise<boolean> {
  try {
    // Find user by verification token
    const user = await storage.getUserByVerificationToken(token);
    
    if (!user) {
      console.warn('Email verification failed: Invalid or expired token');
      return false;
    }
    
    // Update user to mark as verified
    await storage.upsertUser({
      ...user,
      isVerified: true,
      verificationToken: null,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Email verification error:', error);
    return false;
  }
}

/**
 * Request a password reset for a user
 * @param email User's email address
 * @returns True if reset email sent, false otherwise
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.warn(`Password reset request failed: User with email ${email} not found`);
      return false;
    }
    
    // Generate reset token
    const resetToken = generatePasswordResetToken(user.id);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Update user with reset token
    await storage.upsertUser({
      ...user,
      resetToken,
      resetTokenExpiry,
      updatedAt: new Date()
    });
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken);
    
    return emailSent;
  } catch (error) {
    console.error('Password reset request error:', error);
    return false;
  }
}

/**
 * Reset a user's password using a reset token
 * @param token Password reset token
 * @param newPassword New password to set
 * @returns True if password reset successful, false otherwise
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    // Find user by reset token
    const user = await storage.getUserByResetToken(token);
    
    if (!user) {
      console.warn('Password reset failed: Invalid or expired token');
      return false;
    }
    
    // Check if token is expired
    const now = new Date();
    if (user.resetTokenExpiry && user.resetTokenExpiry < now) {
      console.warn('Password reset failed: Token has expired');
      return false;
    }
    
    // Hash new password
    const hashedPassword = await hash(newPassword, SALT_ROUNDS);
    
    // Update user with new password
    await storage.upsertUser({
      ...user,
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    return false;
  }
}

/**
 * Change a user's password (when logged in)
 * @param userId User's ID
 * @param currentPassword Current password for verification
 * @param newPassword New password to set
 * @returns True if password change successful, false otherwise
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  try {
    // Get user
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.warn(`Password change failed: User with ID ${userId} not found`);
      return false;
    }
    
    // Verify current password
    if (!user.password) {
      console.warn(`Password change failed: User with ID ${userId} has no password set`);
      return false;
    }
    
    const isPasswordValid = await compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.warn(`Password change failed: Invalid current password for user with ID ${userId}`);
      return false;
    }
    
    // Hash new password
    const hashedPassword = await hash(newPassword, SALT_ROUNDS);
    
    // Update user with new password
    await storage.upsertUser({
      ...user,
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Password change error:', error);
    return false;
  }
}