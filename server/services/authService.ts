import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../storage";
import { User, UpsertUser } from "@shared/schema";
import { generateToken, verifyToken } from "../utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail } from "./emailService";
import { z } from "zod";
import { nanoid } from "nanoid";

// Input validation schema
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const resetPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordConfirmSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare a password with a hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Register a new user
export async function registerUser(userData: z.infer<typeof registerSchema>) {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Create a new user record
  const newUser: UpsertUser = {
    id: nanoid(),
    email: userData.email,
    password: await hashPassword(userData.password),
    firstName: userData.firstName || null,
    lastName: userData.lastName || null,
    isVerified: false,
    verificationToken,
    authProvider: "local",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Save the user
  const user = await storage.upsertUser(newUser);

  // Create organization if name provided
  if (userData.organizationName) {
    const organization = await storage.createOrganization({
      id: nanoid(),
      name: userData.organizationName
    });

    // Add user as owner of organization
    await storage.addOrganizationMember({
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
      inviteStatus: "accepted"
    });

    // Update user with organization ID
    await storage.upsertUser({
      id: user.id,
      email: user.email,
      organizationId: organization.id
    });
  }

  // Send verification email
  await sendVerificationEmail(user.email, verificationToken);

  return { user: { ...user, password: undefined } };
}

// Login a user
export async function loginUser(data: z.infer<typeof loginSchema>) {
  // Find user by email
  const user = await storage.getUserByEmail(data.email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user has a password (if they registered with OAuth, they won't)
  if (!user.password) {
    throw new Error("Please use the authentication method you registered with");
  }

  // Check if password is correct
  const isValid = await comparePassword(data.password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // Check if email is verified
  if (!user.isVerified) {
    throw new Error("Please verify your email address");
  }

  // Generate JWT token
  const token = generateToken({ 
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId || undefined
  });

  return {
    user: { ...user, password: undefined },
    token
  };
}

// Verify email address
export async function verifyEmail(token: string) {
  // Find user by verification token
  const user = await storage.getUserByVerificationToken(token);
  if (!user) {
    throw new Error("Invalid or expired verification token");
  }

  // Update user verification status
  const updatedUser = await storage.upsertUser({
    id: user.id,
    email: user.email,
    isVerified: true,
    verificationToken: null
  });

  return { user: { ...updatedUser, password: undefined } };
}

// Request password reset
export async function requestPasswordReset(data: z.infer<typeof resetPasswordSchema>) {
  // Find user by email
  const user = await storage.getUserByEmail(data.email);
  if (!user) {
    // For security reasons, return success even if user doesn't exist
    return { success: true };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date();
  resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

  // Update user with reset token
  await storage.upsertUser({
    id: user.id,
    email: user.email,
    resetToken,
    resetTokenExpiry
  });

  // Send password reset email
  await sendPasswordResetEmail(user.email, resetToken);

  return { success: true };
}

// Reset password
export async function resetPassword(data: z.infer<typeof resetPasswordConfirmSchema>) {
  // Find user by reset token
  const user = await storage.getUserByResetToken(data.token);
  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  // Check if token is expired
  if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
    throw new Error("Reset token has expired");
  }

  // Update user with new password
  const updatedUser = await storage.upsertUser({
    id: user.id,
    email: user.email,
    password: await hashPassword(data.password),
    resetToken: null,
    resetTokenExpiry: null
  });

  return { user: { ...updatedUser, password: undefined } };
}