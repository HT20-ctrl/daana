import { storage } from '../storage';
import type { User } from '@shared/schema';

// Define notification types
export type NotificationType = 
  | 'new_message' 
  | 'assignment' 
  | 'knowledge_base_update'
  | 'daily_summary';

export interface NotificationData {
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

// In-memory store for active user notifications
// In a production app, these would be stored in the database
const userNotifications = new Map<string, Array<{
  id: string;
  type: NotificationType;
  data: NotificationData;
  createdAt: Date;
  read: boolean;
}>>();

/**
 * Send a notification to a user with optional email delivery
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  data: NotificationData
): Promise<boolean> {
  try {
    // Get user to check notification preferences
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`Cannot send notification - user ${userId} not found`);
      return false;
    }
    
    // Store notification in-app
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (!userNotifications.has(userId)) {
      userNotifications.set(userId, []);
    }
    
    userNotifications.get(userId)?.push({
      id: notificationId,
      type,
      data,
      createdAt: new Date(),
      read: false
    });
    
    // Limit to 100 notifications per user
    const userNotifs = userNotifications.get(userId);
    if (userNotifs && userNotifs.length > 100) {
      userNotifications.set(userId, userNotifs.slice(-100));
    }
    
    // Check if we should send an email based on user preferences
    const shouldSendEmail = shouldSendEmailNotification(user, type);
    
    if (shouldSendEmail) {
      const emailResult = await sendEmailNotification(user, type, data);
      console.log(`Email notification result for user ${userId}:`, emailResult);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Get notifications for a user
 */
export function getUserNotifications(userId: string) {
  return userNotifications.get(userId) || [];
}

/**
 * Mark a notification as read
 */
export function markNotificationRead(userId: string, notificationId: string): boolean {
  const notifications = userNotifications.get(userId);
  if (!notifications) return false;
  
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  
  return false;
}

/**
 * Check if user should receive email notifications based on preferences and notification type
 */
function shouldSendEmailNotification(user: User, type: NotificationType): boolean {
  // Get user notification preferences
  const notificationSettings = user.userSettings?.notificationSettings;
  
  if (!notificationSettings) {
    return false; // No preferences set
  }
  
  // Default to false if email notifications are disabled
  if (!notificationSettings.emailNotifications) {
    return false;
  }
  
  // Check specific notification type
  switch (type) {
    case 'new_message':
      return notificationSettings.newMessageAlerts || false;
    case 'assignment':
      return notificationSettings.assignmentNotifications || false;
    case 'daily_summary':
      return notificationSettings.summaryReports || false;
    default:
      return true; // Default to sending other types
  }
}

/**
 * Send email notification via SendGrid
 * This function will check if SendGrid is configured and handle fallback logic
 */
async function sendEmailNotification(
  user: User,
  type: NotificationType,
  data: NotificationData
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid API key not configured, skipping email notification');
    return false;
  }
  
  try {
    // If SendGrid API key is configured, import the module and send the email
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    
    const email = user.email;
    if (!email) {
      console.error('Cannot send email notification - user has no email address');
      return false;
    }
    
    // Template the email based on notification type
    const emailContent = createEmailTemplate(type, data);
    
    const msg = {
      to: email,
      from: 'notifications@danaaipro.com', // Replace with your verified sender
      subject: data.title,
      text: data.message,
      html: emailContent,
    };
    
    await sgMail.default.send(msg);
    console.log(`Email notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

/**
 * Create HTML email template based on notification type
 */
function createEmailTemplate(type: NotificationType, data: NotificationData): string {
  const baseTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #4f46e5;
          padding: 20px;
          color: white;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9fafb;
        }
        .footer {
          text-align: center;
          padding: 10px;
          font-size: 12px;
          color: #6b7280;
        }
        .cta {
          display: inline-block;
          background-color: #4f46e5;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dana AI</h1>
      </div>
      <div class="content">
        <h2>${data.title}</h2>
        <p>${data.message}</p>
        ${data.link ? `<a href="${data.link}" class="cta">View Details</a>` : ''}
      </div>
      <div class="footer">
        <p>This email was sent from Dana AI. You received this because you enabled email notifications in your preferences.</p>
        <p>© Dana AI 2025</p>
      </div>
    </body>
    </html>
  `;
  
  return baseTemplate;
}