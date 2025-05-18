import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { platforms } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";
import axios from "axios";

// Check if Salesforce API credentials are configured
export function isSalesforceConfigured(): boolean {
  return !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
}

// Get Salesforce platform status
export async function getSalesforceStatus(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  
  try {
    // Check if platform is already connected for this user
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    res.json({ 
      configured: isSalesforceConfigured(),
      connected: !!platformRecord?.isConnected
    });
  } catch (error) {
    console.error("Error getting Salesforce status:", error);
    res.json({ 
      configured: isSalesforceConfigured(),
      connected: false 
    });
  }
}

// Connect to Salesforce API
export async function connectSalesforce(req: Request, res: Response) {
  if (!isSalesforceConfigured()) {
    return res.status(400).json({ 
      message: "Salesforce API credentials not configured. Please add SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET to your environment variables." 
    });
  }

  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    if (req.session) {
      req.session.salesforceState = state;
    }

    // For demo purposes, create a simulated connection
    // In a production environment, this would redirect to Salesforce OAuth flow
    
    // Get user ID from authenticated user
    const userId = req.user?.id || "1";
    
    // Check if platform already exists for this user
    const [existingPlatform] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    const settings = {
      instanceUrl: "https://demo.salesforce.com",
      environment: "production"
    };
    
    if (existingPlatform) {
      // Update existing platform
      await db.update(platforms)
        .set({
          accessToken: "sf_demo_access_token",
          refreshToken: "sf_demo_refresh_token",
          tokenExpiry: new Date(Date.now() + 7200 * 1000), // 2 hours from now
          isConnected: true,
          settings,
          updatedAt: new Date()
        })
        .where(eq(platforms.id, existingPlatform.id));
    } else {
      // Create new platform
      await storage.createPlatform({
        name: "salesforce",
        displayName: "Salesforce CRM",
        userId,
        accessToken: "sf_demo_access_token",
        refreshToken: "sf_demo_refresh_token",
        tokenExpiry: new Date(Date.now() + 7200 * 1000), // 2 hours from now
        isConnected: true,
        settings
      });
    }
    
    // Redirect back to the app with success parameter
    return res.redirect(`/?salesforce_connected=true`);
  } catch (error) {
    console.error("Error connecting to Salesforce:", error);
    return res.status(500).json({ message: "Failed to connect to Salesforce" });
  }
}

// Callback handler for Salesforce OAuth flow
export async function salesforceCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }
  
  if (req.session?.salesforceState !== state) {
    return res.status(400).json({ message: "Invalid state parameter" });
  }
  
  // In a production environment, this would exchange the code for an access token
  // For demo purposes, we'll simulate a successful token exchange
  
  // Get user ID from authenticated user
  const userId = req.user?.id || "1";
  
  try {
    // Check if platform already exists for this user
    const [existingPlatform] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    const settings = {
      instanceUrl: "https://demo.salesforce.com",
      environment: "production"
    };
    
    if (existingPlatform) {
      // Update existing platform
      await db.update(platforms)
        .set({
          accessToken: "sf_demo_access_token",
          refreshToken: "sf_demo_refresh_token",
          tokenExpiry: new Date(Date.now() + 7200 * 1000), // 2 hours from now
          isConnected: true,
          settings,
          updatedAt: new Date()
        })
        .where(eq(platforms.id, existingPlatform.id));
    } else {
      // Create new platform
      await storage.createPlatform({
        name: "salesforce",
        displayName: "Salesforce CRM",
        userId: userId,
        accessToken: "sf_demo_access_token",
        refreshToken: "sf_demo_refresh_token",
        tokenExpiry: new Date(Date.now() + 7200 * 1000), // 2 hours from now
        isConnected: true,
        settings
      });
    }
    
    // Redirect back to the app with success parameter
    return res.redirect(`/?salesforce_connected=true`);
  } catch (error) {
    console.error("Error completing Salesforce OAuth flow:", error);
    return res.status(500).json({ message: "Failed to complete Salesforce authentication" });
  }
}

// Get Salesforce leads
export async function getSalesforceLeads(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "Salesforce platform not found for this user" });
    }
    
    // For demo purposes, return mock leads
    // In a production environment, this would query the Salesforce API
    const mockLeads = [
      {
        id: "00Q1a000004XdTeEAK",
        firstName: "Sarah",
        lastName: "Johnson",
        company: "Acme Corp",
        email: "sarah.johnson@acmecorp.com",
        phone: "555-123-4567",
        status: "Open - Not Contacted",
        rating: "Hot",
        createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "00Q1a000004XdTfEAK",
        firstName: "Michael",
        lastName: "Roberts",
        company: "Globex Inc",
        email: "michael.roberts@globexinc.com",
        phone: "555-987-6543",
        status: "Working - Contacted",
        rating: "Warm",
        createdDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "00Q1a000004XdTgEAK",
        firstName: "Jennifer",
        lastName: "Lewis",
        company: "Stark Industries",
        email: "jennifer.lewis@starkindustries.com",
        phone: "555-456-7890",
        status: "Qualified",
        rating: "Hot",
        createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    return res.json({
      records: mockLeads,
      totalSize: mockLeads.length,
      done: true
    });
  } catch (error) {
    console.error("Error getting Salesforce leads:", error);
    res.status(500).json({ message: "Failed to fetch Salesforce leads" });
  }
}

// Create a Salesforce lead
export async function createSalesforceLead(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { firstName, lastName, company, email, phone, status } = req.body;
  
  if (!lastName || !company) {
    return res.status(400).json({ message: "Last name and company are required" });
  }
  
  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "Salesforce platform not found for this user" });
    }
    
    // For demo purposes, simulate creating a lead
    // In a production environment, this would call the Salesforce API
    const newLead = {
      id: "00Q1a000004XdT" + Math.random().toString(36).substring(2, 6),
      firstName: firstName || "",
      lastName,
      company,
      email: email || "",
      phone: phone || "",
      status: status || "Open - Not Contacted",
      rating: "Cold",
      createdDate: new Date().toISOString()
    };
    
    return res.json({
      success: true,
      id: newLead.id,
      ...newLead
    });
  } catch (error) {
    console.error("Error creating Salesforce lead:", error);
    res.status(500).json({ message: "Failed to create Salesforce lead" });
  }
}

// Get Salesforce opportunities
export async function getSalesforceOpportunities(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "Salesforce platform not found for this user" });
    }
    
    // For demo purposes, return mock opportunities
    // In a production environment, this would query the Salesforce API
    const mockOpportunities = [
      {
        id: "0061a000003XdTeEAK",
        name: "Enterprise Software Package",
        accountName: "Acme Corp",
        stage: "Needs Analysis",
        amount: 150000,
        probability: 60,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: "New Business",
        createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "0061a000003XdTfEAK",
        name: "Consulting Services",
        accountName: "Globex Inc",
        stage: "Proposal/Price Quote",
        amount: 75000,
        probability: 80,
        closeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        type: "Existing Business",
        createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "0061a000003XdTgEAK",
        name: "Support Contract Renewal",
        accountName: "Stark Industries",
        stage: "Negotiation/Review",
        amount: 50000,
        probability: 90,
        closeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: "Renewal",
        createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    return res.json({
      records: mockOpportunities,
      totalSize: mockOpportunities.length,
      done: true
    });
  } catch (error) {
    console.error("Error getting Salesforce opportunities:", error);
    res.status(500).json({ message: "Failed to fetch Salesforce opportunities" });
  }
}

// Create a Salesforce opportunity
export async function createSalesforceOpportunity(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { name, accountId, accountName, stage, amount, closeDate, type } = req.body;
  
  if (!name || !stage || !closeDate) {
    return res.status(400).json({ message: "Name, stage, and close date are required" });
  }
  
  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "salesforce")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "Salesforce platform not found for this user" });
    }
    
    // For demo purposes, simulate creating an opportunity
    // In a production environment, this would call the Salesforce API
    const newOpportunity = {
      id: "0061a000003XdT" + Math.random().toString(36).substring(2, 6),
      name,
      accountId: accountId || "0011a000003XdTeEAK",
      accountName: accountName || "Sample Account",
      stage,
      amount: amount || 0,
      probability: 20,
      closeDate,
      type: type || "New Business",
      createdDate: new Date().toISOString()
    };
    
    return res.json({
      success: true,
      id: newOpportunity.id,
      ...newOpportunity
    });
  } catch (error) {
    console.error("Error creating Salesforce opportunity:", error);
    res.status(500).json({ message: "Failed to create Salesforce opportunity" });
  }
}