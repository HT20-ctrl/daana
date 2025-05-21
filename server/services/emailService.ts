/**
 * Email Service for sending verification and password reset emails
 * 
 * This service provides functions for sending various types of emails
 * including verification emails and password reset emails.
 * 
 * In production, this would be integrated with SendGrid or another email provider.
 */

// For now, we'll use console logs to simulate email sending
// In production, you would integrate with a real email service like SendGrid
const sendEmail = async (to: string, subject: string, body: string) => {
  console.log(`
    ===== Email sent =====
    To: ${to}
    Subject: ${subject}
    Body: ${body}
    ======================
  `);

  // Return success as if the email was sent
  return { success: true };
};

/**
 * Send a verification email to a new user
 * 
 * @param email The recipient's email address
 * @param token The verification token
 */
export const sendVerificationEmail = async (email: string, token: string) => {
  const subject = 'Verify your Dana AI account';
  const verificationUrl = `${getBaseUrl()}/verify-email?token=${token}`;
  
  const body = `
    Welcome to Dana AI!
    
    Please verify your email address by clicking the link below:
    
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you did not create an account, please ignore this email.
  `;
  
  return sendEmail(email, subject, body);
};

/**
 * Send a password reset email
 * 
 * @param email The recipient's email address
 * @param token The password reset token
 */
export const sendPasswordResetEmail = async (email: string, token: string) => {
  const subject = 'Reset your Dana AI password';
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
  
  const body = `
    You requested a password reset for your Dana AI account.
    
    Please click the link below to reset your password:
    
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you did not request a password reset, please ignore this email.
  `;
  
  return sendEmail(email, subject, body);
};

/**
 * Send organization invitation email
 * 
 * @param email The recipient's email address
 * @param organizationName The name of the organization
 * @param inviterName The name of the person who sent the invitation
 * @param token The invitation token
 */
export const sendOrganizationInviteEmail = async (
  email: string,
  organizationName: string,
  inviterName: string,
  token: string
) => {
  const subject = `You've been invited to join ${organizationName} on Dana AI`;
  const inviteUrl = `${getBaseUrl()}/accept-invite?token=${token}`;
  
  const body = `
    ${inviterName} has invited you to join ${organizationName} on Dana AI.
    
    Please click the link below to accept the invitation:
    
    ${inviteUrl}
    
    This invitation will expire in 7 days.
  `;
  
  return sendEmail(email, subject, body);
};

/**
 * Helper function to get the base URL of the application
 * This will use REPLIT_DOMAINS environment variable if available
 */
function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  return 'http://localhost:5000';
}