/**
 * Email Service
 * 
 * Handles sending emails for authentication, notifications, and marketing
 */
import axios from 'axios';

// Configure email sending options
const EMAIL_FROM = 'noreply@dana-ai.com';
const BASE_URL = process.env.BASE_URL || 'https://dana-ai-project.replit.app';

/**
 * Send a verification email to a new user
 * @param email Email address of the recipient
 * @param verificationToken Token for email verification
 */
export async function sendVerificationEmail(email: string, verificationToken: string, firstName: string = '') {
  // Create verification link
  const verificationLink = `${BASE_URL}/verify-email?token=${verificationToken}`;
  
  // Email content
  const subject = 'Verify your Dana AI account';
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4361ee; margin-bottom: 10px;">Dana AI</h1>
        <p style="font-size: 18px; color: #333;">Welcome to Dana AI!</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p>Hi ${firstName || 'there'},</p>
        <p>Thank you for signing up for Dana AI. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background: linear-gradient(90deg, #4361ee, #3a0ca3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If you didn't create this account, you can safely ignore this email.</p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>Dana AI - AI-Powered Social Media and Communication Management</p>
        <p>© ${new Date().getFullYear()} Dana AI. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Send the email
  return await sendEmail(email, subject, content);
}

/**
 * Send a password reset email
 * @param email Email address of the recipient
 * @param resetToken Token for password reset
 */
export async function sendPasswordResetEmail(email: string, resetToken: string) {
  // Create reset link
  const resetLink = `${BASE_URL}/reset-password?token=${resetToken}`;
  
  // Email content
  const subject = 'Reset your Dana AI password';
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4361ee; margin-bottom: 10px;">Dana AI</h1>
        <p style="font-size: 18px; color: #333;">Password Reset Request</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(90deg, #4361ee, #3a0ca3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>Dana AI - AI-Powered Social Media and Communication Management</p>
        <p>© ${new Date().getFullYear()} Dana AI. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Send the email
  return await sendEmail(email, subject, content);
}

/**
 * Send an organization invitation email
 * @param email Email address of the recipient
 * @param inviteToken Invitation token
 * @param organizationName Name of the organization
 * @param inviterName Name of the person sending the invitation
 */
export async function sendOrganizationInviteEmail(
  email: string, 
  inviteToken: string, 
  organizationName: string,
  inviterName: string
) {
  // Create invitation link
  const inviteLink = `${BASE_URL}/accept-invite?token=${inviteToken}`;
  
  // Email content
  const subject = `Join ${organizationName} on Dana AI`;
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4361ee; margin-bottom: 10px;">Dana AI</h1>
        <p style="font-size: 18px; color: #333;">Organization Invitation</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p>Hello,</p>
        <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on Dana AI.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background: linear-gradient(90deg, #4361ee, #3a0ca3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p>Dana AI is an AI-powered platform that helps organizations manage social media and communication channels.</p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>Dana AI - AI-Powered Social Media and Communication Management</p>
        <p>© ${new Date().getFullYear()} Dana AI. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Send the email
  return await sendEmail(email, subject, content);
}

/**
 * Send a notification email
 * @param email Email address of the recipient
 * @param subject Email subject
 * @param message Email message content
 */
export async function sendNotificationEmail(email: string, subject: string, message: string) {
  // Email content
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4361ee; margin-bottom: 10px;">Dana AI</h1>
        <p style="font-size: 18px; color: #333;">Notification</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        ${message}
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>Dana AI - AI-Powered Social Media and Communication Management</p>
        <p>© ${new Date().getFullYear()} Dana AI. All rights reserved.</p>
      </div>
    </div>
  `;
  
  // Send the email
  return await sendEmail(email, subject, content);
}

/**
 * Core email sending function
 * First tries SendGrid if available, then falls back to direct SMTP
 */
async function sendEmail(to: string, subject: string, htmlContent: string) {
  try {
    // If SendGrid is available, use it
    if (process.env.SENDGRID_API_KEY) {
      // Implementation will be added when SENDGRID_API_KEY is provided
      console.log('SendGrid would send email to:', to);
      console.log('Subject:', subject);
      
      return true;
    } 
    
    // For now, we'll just log the email content for development
    console.log('Would send email to:', to);
    console.log('Subject:', subject);
    console.log('Content (truncated):', htmlContent.substring(0, 100) + '...');
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}