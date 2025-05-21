/**
 * Email Service for Dana AI Platform
 * Provides functionality for sending emails to users
 */

// Import types
import { User } from '@shared/schema';

/**
 * Get base URL for application links
 * Uses Replit domain if available
 */
function getBaseUrl(): string {
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const domains = replitDomains.split(',');
    if (domains.length > 0) {
      return `https://${domains[0]}`;
    }
  }
  return 'http://localhost:3000'; // Fallback for local development
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string | null,
  verificationToken: string
): Promise<boolean> {
  try {
    // In a real implementation, this would use a service like SendGrid or Nodemailer
    // For now, we'll just log the email content to the console
    
    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    
    console.log('==================== WELCOME EMAIL ====================');
    console.log(`To: ${email}`);
    console.log(`Subject: Welcome to Dana AI Platform!`);
    console.log('Body:');
    console.log(`Hello ${firstName || 'there'},`);
    console.log('');
    console.log('Welcome to Dana AI Platform! We\'re excited to have you on board.');
    console.log('');
    console.log('Please verify your email address by clicking the link below:');
    console.log(verificationUrl);
    console.log('');
    console.log('If you have any questions, please don\'t hesitate to reach out to our support team.');
    console.log('');
    console.log('Best regards,');
    console.log('The Dana AI Team');
    console.log('======================================================');
    
    // In a production environment, you would use an email service like SendGrid
    // Example with SendGrid (commented out):
    /*
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to: email,
        from: 'noreply@danaaichat.com',
        subject: 'Welcome to Dana AI Platform!',
        text: `Hello ${firstName || 'there'},
        
Welcome to Dana AI Platform! We're excited to have you on board.

Please verify your email address by clicking the link below:
${verificationUrl}

If you have any questions, please don't hesitate to reach out to our support team.

Best regards,
The Dana AI Team`,
        html: `<p>Hello ${firstName || 'there'},</p>
        
<p>Welcome to Dana AI Platform! We're excited to have you on board.</p>

<p>Please verify your email address by clicking the link below:</p>
<p><a href="${verificationUrl}">Verify your email</a></p>

<p>If you have any questions, please don't hesitate to reach out to our support team.</p>

<p>Best regards,<br>
The Dana AI Team</p>`,
      };
      
      await sgMail.send(msg);
    }
    */
    
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
  try {
    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    
    console.log('================ VERIFICATION EMAIL =================');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your Dana AI Platform email address`);
    console.log('Body:');
    console.log('Hello,');
    console.log('');
    console.log('Please verify your email address by clicking the link below:');
    console.log(verificationUrl);
    console.log('');
    console.log('If you did not request this email, please ignore it.');
    console.log('');
    console.log('Best regards,');
    console.log('The Dana AI Team');
    console.log('======================================================');
    
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
  try {
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    console.log('================ PASSWORD RESET EMAIL ================');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your Dana AI Platform password`);
    console.log('Body:');
    console.log('Hello,');
    console.log('');
    console.log('We received a request to reset your Dana AI Platform password.');
    console.log('');
    console.log('Please click the link below to reset your password:');
    console.log(resetUrl);
    console.log('');
    console.log('This link will expire in 1 hour.');
    console.log('');
    console.log('If you did not request a password reset, please ignore this email.');
    console.log('');
    console.log('Best regards,');
    console.log('The Dana AI Team');
    console.log('=======================================================');
    
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
  organization: string,
  inviterName: string,
  inviteToken: string
): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/invite?token=${inviteToken}`;
    
    console.log('================ ORGANIZATION INVITE EMAIL ================');
    console.log(`To: ${email}`);
    console.log(`Subject: You've been invited to join ${organization} on Dana AI Platform`);
    console.log('Body:');
    console.log(`Hello,`);
    console.log('');
    console.log(`You've been invited by ${inviterName} to join ${organization} on Dana AI Platform.`);
    console.log('');
    console.log('Please click the link below to accept the invitation:');
    console.log(inviteUrl);
    console.log('');
    console.log('If you did not expect this invitation, please ignore this email.');
    console.log('');
    console.log('Best regards,');
    console.log('The Dana AI Team');
    console.log('===========================================================');
    
    return true;
  } catch (error) {
    console.error('Error sending organization invite email:', error);
    return false;
  }
}