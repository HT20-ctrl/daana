/**
 * Email Service for Dana AI Platform
 * Handles sending various types of emails to users
 */

// Import required modules
import { MailService } from '@sendgrid/mail';

// Initialize SendGrid mail service if API key is available
let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Get base URL for application links
 * Uses Replit domain if available
 */
function getBaseUrl(): string {
  // If running in Replit environment, use the Replit domain
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}`;
  }
  
  // Fallback for local development
  return 'http://localhost:3000';
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string | null,
  verificationToken?: string
): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid API key not found. Email service not available.');
    return false;
  }
  
  try {
    // Build email content
    const baseUrl = getBaseUrl();
    const verificationUrl = verificationToken ? 
      `${baseUrl}/verify-email?token=${verificationToken}` : undefined;
    
    const mailOptions = {
      to: email,
      from: 'noreply@dana-ai.com',
      subject: 'Welcome to Dana AI Platform!',
      text: `Welcome to Dana AI Platform, ${firstName || 'valued customer'}!
      
Thank you for joining our platform. We're excited to help you manage your communications more effectively.

${verificationToken ? `Please verify your email by clicking this link: ${verificationUrl}` : ''}

If you have any questions, don't hesitate to contact our support team.

The Dana AI Team`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #4f46e5); padding: 20px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Welcome to Dana AI Platform!</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello ${firstName || 'there'},</p>
          <p>Thank you for joining our platform. We're excited to help you manage your communications more effectively.</p>
          ${verificationToken ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Verify Your Email</a>
          </div>
          ` : ''}
          <p>If you have any questions, don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The Dana AI Team</p>
        </div>
      </div>`
    };
    
    await mailService.send(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send a verification email to a user
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid API key not found. Email service not available.');
    return false;
  }
  
  try {
    // Build email content
    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      to: email,
      from: 'noreply@dana-ai.com',
      subject: 'Verify Your Email Address',
      text: `Please verify your email address for Dana AI Platform.
      
Click the following link to verify your email: ${verificationUrl}

If you didn't create an account with us, you can safely ignore this email.

The Dana AI Team`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #4f46e5); padding: 20px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Verify Your Email Address</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Please verify your email address for Dana AI Platform.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Verify Your Email</a>
          </div>
          <p>If you didn't create an account with us, you can safely ignore this email.</p>
          <p>Best regards,<br>The Dana AI Team</p>
        </div>
      </div>`
    };
    
    await mailService.send(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send a password reset email to a user
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid API key not found. Email service not available.');
    return false;
  }
  
  try {
    // Build email content
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      to: email,
      from: 'noreply@dana-ai.com',
      subject: 'Reset Your Password',
      text: `You requested a password reset for your Dana AI Platform account.
      
Click the following link to reset your password: ${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

The Dana AI Team`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #4f46e5); padding: 20px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Reset Your Password</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>You requested a password reset for your Dana AI Platform account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>Best regards,<br>The Dana AI Team</p>
        </div>
      </div>`
    };
    
    await mailService.send(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send an organization invitation email
 */
export async function sendOrganizationInviteEmail(
  email: string,
  organizationName: string,
  inviterName: string,
  inviteToken: string
): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid API key not found. Email service not available.');
    return false;
  }
  
  try {
    // Build email content
    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/join-organization?token=${inviteToken}`;
    
    const mailOptions = {
      to: email,
      from: 'noreply@dana-ai.com',
      subject: `You've Been Invited to Join ${organizationName} on Dana AI Platform`,
      text: `You've been invited to join ${organizationName} on Dana AI Platform by ${inviterName}.
      
Click the following link to accept the invitation: ${inviteUrl}

This invitation link will expire in 7 days.

The Dana AI Team`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #4f46e5); padding: 20px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Organization Invitation</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello,</p>
          <p>You've been invited to join <strong>${organizationName}</strong> on Dana AI Platform by <strong>${inviterName}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
          </div>
          <p>This invitation link will expire in 7 days.</p>
          <p>Best regards,<br>The Dana AI Team</p>
        </div>
      </div>`
    };
    
    await mailService.send(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending organization invite email:', error);
    return false;
  }
}