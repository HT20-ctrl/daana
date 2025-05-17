import { Request, Response } from "express";
import { storage } from "../storage";
import { Platform } from "@shared/schema";

export function isSalesforceConfigured(): boolean {
  // Check if Salesforce API credentials are configured
  // In production, you would check for actual Salesforce API credentials
  return process.env.SALESFORCE_CLIENT_ID !== undefined && 
         process.env.SALESFORCE_CLIENT_SECRET !== undefined;
}

/**
 * Endpoint to get Salesforce connection status
 */
export async function getSalesforceStatus(req: Request, res: Response) {
  try {
    const configured = isSalesforceConfigured();
    
    if (!configured) {
      return res.json({
        configured: false,
        message: "Salesforce integration not configured. Please add SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET to your environment."
      });
    }
    
    // In a real implementation, would verify the API credentials are valid
    return res.json({
      configured: true,
      message: "Salesforce integration is configured and ready to use."
    });
  } catch (error) {
    console.error("Error checking Salesforce status:", error);
    return res.status(500).json({ error: "Failed to check Salesforce status" });
  }
}

/**
 * Endpoint to connect to Salesforce
 */
export async function connectSalesforce(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.claims) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.claims.sub;
    
    // Check if we already have a Salesforce platform for this user
    const platforms = await storage.getPlatformsByUserId(userId);
    const existingSalesforce = platforms.find(p => p.name.toLowerCase() === "salesforce");
    
    if (existingSalesforce) {
      return res.status(400).json({ error: "Salesforce is already connected" });
    }

    // Simplified oauth flow for demo purposes
    // In production, you would implement the full Salesforce OAuth flow
    
    // Mock successful connection
    const newPlatform = await storage.createPlatform({
      name: "Salesforce",
      displayName: "Salesforce CRM",
      userId: userId,
      accessToken: "mock_salesforce_access_token",
      refreshToken: "mock_salesforce_refresh_token",
      tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      isConnected: true
    });
    
    return res.json({
      success: true,
      platform: newPlatform
    });
  } catch (error) {
    console.error("Error connecting to Salesforce:", error);
    return res.status(500).json({ error: "Failed to connect to Salesforce" });
  }
}

/**
 * Endpoint to handle Salesforce OAuth callback (mock implementation)
 */
export async function salesforceCallback(req: Request, res: Response) {
  // This would normally handle the OAuth callback from Salesforce
  // For demo purposes, redirect to settings page
  res.redirect("/settings");
}

/**
 * Endpoint to get Salesforce leads (mock implementation)
 */
export async function getSalesforceLeads(req: Request, res: Response) {
  try {
    // Mock leads data
    const mockLeads = [
      {
        id: "00Q1a000004XoABEA0",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@example.com",
        phone: "+1234567123",
        company: "Acme Innovations",
        status: "Working",
        createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        id: "00Q1a000004XoACEA0",
        firstName: "Michael",
        lastName: "Thomas",
        email: "michael.thomas@example.com",
        phone: "+1987654321",
        company: "Global Solutions Inc.",
        status: "Qualified",
        createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: "00Q1a000004XoADEA0",
        firstName: "Jessica",
        lastName: "Chen",
        email: "jessica.chen@example.com",
        phone: "+1456789123",
        company: "Tech Innovators",
        status: "New",
        createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];
    
    return res.json(mockLeads);
  } catch (error) {
    console.error("Error fetching Salesforce leads:", error);
    return res.status(500).json({ error: "Failed to fetch Salesforce leads" });
  }
}

/**
 * Endpoint to create a Salesforce lead (mock implementation)
 */
export async function createSalesforceLead(req: Request, res: Response) {
  try {
    const { firstName, lastName, email, phone, company, status } = req.body;
    
    // Validate required fields
    if (!email || !lastName) {
      return res.status(400).json({ error: "Email and last name are required" });
    }
    
    // Mock created lead
    const newLead = {
      id: `00Q1a000004Xo${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      firstName,
      lastName,
      email,
      phone,
      company,
      status: status || "New",
      createdDate: new Date()
    };
    
    return res.json(newLead);
  } catch (error) {
    console.error("Error creating Salesforce lead:", error);
    return res.status(500).json({ error: "Failed to create Salesforce lead" });
  }
}

/**
 * Endpoint to get Salesforce opportunities (mock implementation)
 */
export async function getSalesforceOpportunities(req: Request, res: Response) {
  try {
    // Mock opportunities data
    const mockOpportunities = [
      {
        id: "0061a000004XoZZAA0",
        name: "Enterprise Software Upgrade",
        accountName: "Acme Innovations",
        stage: "Proposal",
        amount: 75000,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        probability: 60
      },
      {
        id: "0061a000004XoZAAA0",
        name: "Cloud Migration Project",
        accountName: "Global Solutions Inc.",
        stage: "Negotiation",
        amount: 120000,
        closeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        probability: 80
      },
      {
        id: "0061a000004XoZBAA0",
        name: "Security Implementation",
        accountName: "Tech Innovators",
        stage: "Qualification",
        amount: 45000,
        closeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        probability: 30
      }
    ];
    
    return res.json(mockOpportunities);
  } catch (error) {
    console.error("Error fetching Salesforce opportunities:", error);
    return res.status(500).json({ error: "Failed to fetch Salesforce opportunities" });
  }
}