/**
 * Authentication Service
 * 
 * Handles user authentication, registration, password reset, etc.
 */
import bcryptjs from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { users, organizations, organizationMembers, type User, type UpsertUser } from '@shared/schema';
import { generateAccessToken, generateRefreshToken, generateVerificationToken, generateResetToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail, sendOrganizationInviteEmail } from './emailService';
import { eq, and } from 'drizzle-orm';

const SALT_ROUNDS = 10;

/**
 * Register a new user with organization
 */
export async function registerUser(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  createOrganization: boolean = false,
  organizationName?: string
) {
  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create organization if requested
  let orgId: string | null = null;
  if (createOrganization && organizationName) {
    orgId = await createNewOrganization(organizationName);
  }

  // Hash the password
  const hashedPassword = await bcryptjs.hash(password, SALT_ROUNDS);
  
  // Generate verification token
  const userId = nanoid();
  const verificationToken = generateVerificationToken(userId, email);
  
  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      email,
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      organizationId: orgId,
      isVerified: false,
      verificationToken,
      role: orgId ? 'admin' : 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  // If user created an organization, add them as owner
  if (orgId) {
    await db
      .insert(organizationMembers)
      .values({
        organizationId: orgId,
        userId: userId,
        role: 'owner',
        inviteStatus: 'accepted'
      });
  }

  // Send verification email
  await sendVerificationEmail(email, verificationToken, firstName);
  
  return {
    user: newUser,
    organizationId: orgId
  };
}

/**
 * Create a new organization
 */
async function createNewOrganization(name: string): Promise<string> {
  const orgId = nanoid();
  
  await db
    .insert(organizations)
    .values({
      id: orgId,
      name,
      plan: 'free',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  return orgId;
}

/**
 * Login a user and generate tokens
 */
export async function loginUser(email: string, password: string) {
  // Get user by email
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password
  const isPasswordValid = await bcryptjs.compare(password, user.password || '');
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }
  
  // Check if user is verified
  if (!user.isVerified) {
    throw new Error('Please verify your email address first');
  }

  // Generate JWT tokens
  const accessToken = generateAccessToken(user.id, user.organizationId || null);
  const refreshToken = generateRefreshToken(user.id);
  
  return {
    user,
    accessToken,
    refreshToken
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  
  return user;
}

/**
 * Verify user email
 */
export async function verifyEmail(token: string) {
  try {
    // Verify token (payload has userId, email, type)
    const payload = require('jsonwebtoken').verify(token, process.env.SESSION_SECRET);
    
    if (!payload || payload.type !== 'verification') {
      throw new Error('Invalid verification token');
    }
    
    // Update user as verified
    const [user] = await db
      .update(users)
      .set({
        isVerified: true,
        verificationToken: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(users.id, payload.userId),
          eq(users.verificationToken, token)
        )
      )
      .returning();
    
    if (!user) {
      throw new Error('Verification failed. Invalid or expired token.');
    }
    
    return user;
  } catch (error) {
    console.error('Email verification error:', error);
    throw new Error('Verification failed. Invalid or expired token.');
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    // Don't reveal if user exists or not for security
    return true;
  }
  
  // Generate reset token
  const resetToken = generateResetToken(user.id, email);
  
  // Save token to user record
  await db
    .update(users)
    .set({
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));
  
  // Send reset email
  await sendPasswordResetEmail(email, resetToken);
  
  return true;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    // Verify token
    const payload = require('jsonwebtoken').verify(token, process.env.SESSION_SECRET);
    
    if (!payload || payload.type !== 'reset') {
      throw new Error('Invalid reset token');
    }
    
    // Check if token is still valid in the database
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, payload.userId),
          eq(users.resetToken, token)
        )
      );
    
    if (!user) {
      throw new Error('Reset failed. Invalid or expired token.');
    }
    
    // Check if token has expired
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      throw new Error('Reset token has expired');
    }
    
    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, SALT_ROUNDS);
    
    // Update user with new password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    throw new Error('Password reset failed. Please try again.');
  }
}

/**
 * Invite user to organization
 */
export async function inviteUserToOrganization(
  email: string,
  organizationId: string,
  role: string = 'member',
  inviterName: string,
  organizationName: string
) {
  // Check if user already exists
  let user = await getUserByEmail(email);
  let userId: string;
  
  // If user doesn't exist, create a placeholder account
  if (!user) {
    userId = nanoid();
    await db
      .insert(users)
      .values({
        id: userId,
        email,
        isVerified: false,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      });
  } else {
    userId = user.id;
    
    // Check if user already belongs to this organization
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId)
        )
      );
    
    if (membership) {
      // If already a member, just update their role if needed
      if (membership.role !== role) {
        await db
          .update(organizationMembers)
          .set({ role, updatedAt: new Date() })
          .where(eq(organizationMembers.id, membership.id));
      }
      
      return { alreadyMember: true };
    }
  }
  
  // Generate invite token
  const inviteToken = nanoid(32);
  
  // Create organization membership record
  await db
    .insert(organizationMembers)
    .values({
      organizationId,
      userId,
      role,
      inviteStatus: 'pending',
      inviteToken,
      inviteExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  // Send invitation email
  await sendOrganizationInviteEmail(
    email,
    inviteToken,
    organizationName,
    inviterName
  );
  
  return { success: true };
}

/**
 * Accept organization invitation
 */
export async function acceptOrganizationInvite(token: string, password?: string) {
  // Find the invitation
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.inviteToken, token));
  
  if (!membership) {
    throw new Error('Invalid invitation token');
  }
  
  if (membership.inviteStatus !== 'pending') {
    throw new Error('Invitation has already been processed');
  }
  
  // Check if invite has expired
  if (membership.inviteExpiry && new Date(membership.inviteExpiry) < new Date()) {
    throw new Error('Invitation has expired');
  }
  
  // Get the user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, membership.userId));
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // If user doesn't have a password yet (new user), set their password
  if (password && (!user.password || !user.isVerified)) {
    const hashedPassword = await bcryptjs.hash(password, SALT_ROUNDS);
    
    await db
      .update(users)
      .set({
        password: hashedPassword,
        isVerified: true,
        organizationId: membership.organizationId,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
  }
  
  // Update the membership
  await db
    .update(organizationMembers)
    .set({
      inviteStatus: 'accepted',
      inviteToken: null,
      inviteExpiry: null,
      updatedAt: new Date()
    })
    .where(eq(organizationMembers.id, membership.id));
  
  // Generate tokens
  const accessToken = generateAccessToken(user.id, membership.organizationId);
  const refreshToken = generateRefreshToken(user.id);
  
  return {
    user,
    accessToken,
    refreshToken
  };
}

/**
 * Get active organizations for a user
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await db
    .select({
      member: organizationMembers,
      organization: organizations
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.inviteStatus, 'accepted')
      )
    );
  
  return memberships.map(m => ({
    ...m.organization,
    role: m.member.role
  }));
}

/**
 * Change user's active organization
 */
export async function switchUserOrganization(userId: string, organizationId: string) {
  // Check if user is a member of the organization
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.inviteStatus, 'accepted')
      )
    );
  
  if (!membership) {
    throw new Error('User is not a member of this organization');
  }
  
  // Update user's active organization
  await db
    .update(users)
    .set({
      organizationId,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
  
  // Generate new access token with the new organization context
  const accessToken = generateAccessToken(userId, organizationId);
  
  return { accessToken };
}