import { Router } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  resetPasswordConfirmSchema
} from "../services/authService";
import { extractUserFromToken } from "../utils/jwt";

const router = Router();

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    // Validate request data
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation Error", 
        details: validationResult.error.format() 
      });
    }

    // Register the user
    const result = await registerUser(validationResult.data);
    
    return res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
      user: result.user
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(400).json({ 
      error: error.message || "Failed to register user" 
    });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    // Validate request data
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation Error", 
        details: validationResult.error.format() 
      });
    }

    // Login the user
    const { user, token } = await loginUser(validationResult.data);
    
    return res.status(200).json({
      message: "Login successful",
      user,
      token
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(401).json({ 
      error: error.message || "Invalid credentials" 
    });
  }
});

// Verify email endpoint
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Invalid token" });
    }

    const result = await verifyEmail(token);
    
    return res.status(200).json({
      message: "Email verified successfully",
      user: result.user
    });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return res.status(400).json({ 
      error: error.message || "Failed to verify email" 
    });
  }
});

// Request password reset endpoint
router.post("/forgot-password", async (req, res) => {
  try {
    // Validate request data
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation Error", 
        details: validationResult.error.format() 
      });
    }

    await requestPasswordReset(validationResult.data);
    
    // Always return success for security reasons, even if email doesn't exist
    return res.status(200).json({
      message: "If your email exists in our system, you will receive a password reset link"
    });
  } catch (error: any) {
    console.error("Password reset request error:", error);
    // Always return success for security reasons
    return res.status(200).json({
      message: "If your email exists in our system, you will receive a password reset link"
    });
  }
});

// Reset password endpoint
router.post("/reset-password", async (req, res) => {
  try {
    // Validate request data
    const validationResult = resetPasswordConfirmSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation Error", 
        details: validationResult.error.format() 
      });
    }

    const result = await resetPassword(validationResult.data);
    
    return res.status(200).json({
      message: "Password reset successfully",
      user: result.user
    });
  } catch (error: any) {
    console.error("Password reset error:", error);
    return res.status(400).json({ 
      error: error.message || "Failed to reset password" 
    });
  }
});

// Get current user endpoint
router.get("/user", async (req, res) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    const tokenData = extractUserFromToken(authHeader);
    
    if (!tokenData) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Return user data
    return res.status(200).json({
      id: tokenData.userId,
      email: tokenData.email,
      role: tokenData.role || "user",
      organizationId: tokenData.organizationId
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;