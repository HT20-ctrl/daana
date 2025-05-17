import { Request, Response } from "express";
import { storage } from "../storage";
import { Platform } from "@shared/schema";

export function isHubSpotConfigured(): boolean {
  // Check if HubSpot API credentials are configured
  // In production, you would check for actual API credentials
  return process.env.HUBSPOT_API_KEY !== undefined;
}

/**
 * Endpoint to get HubSpot connection status
 */
export async function getHubSpotStatus(req: Request, res: Response) {
  try {
    const configured = isHubSpotConfigured();
    
    if (!configured) {
      return res.json({
        configured: false,
        message: "HubSpot integration not configured. Please add HUBSPOT_API_KEY to your environment."
      });
    }
    
    // In a real implementation, would verify the API key is valid
    return res.json({
      configured: true,
      message: "HubSpot integration is configured and ready to use."
    });
  } catch (error) {
    console.error("Error checking HubSpot status:", error);
    return res.status(500).json({ error: "Failed to check HubSpot status" });
  }
}

/**
 * Endpoint to connect to HubSpot
 */
export async function connectHubSpot(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.claims) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.claims.sub;
    
    // Check if we already have a HubSpot platform for this user
    const platforms = await storage.getPlatformsByUserId(userId);
    const existingHubSpot = platforms.find(p => p.name.toLowerCase() === "hubspot");
    
    if (existingHubSpot) {
      return res.status(400).json({ error: "HubSpot is already connected" });
    }

    // Simplified oauth flow for demo purposes
    // In production, you would implement the full HubSpot OAuth flow
    
    // Mock successful connection
    const newPlatform = await storage.createPlatform({
      name: "HubSpot",
      displayName: "HubSpot CRM",
      userId: userId,
      accessToken: "mock_hubspot_access_token",
      refreshToken: "mock_hubspot_refresh_token",
      tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      isConnected: true
    });
    
    return res.json({
      success: true,
      platform: newPlatform
    });
  } catch (error) {
    console.error("Error connecting to HubSpot:", error);
    return res.status(500).json({ error: "Failed to connect to HubSpot" });
  }
}

/**
 * Endpoint to handle HubSpot OAuth callback (mock implementation)
 */
export async function hubspotCallback(req: Request, res: Response) {
  // This would normally handle the OAuth callback from HubSpot
  // For demo purposes, redirect to settings page
  res.redirect("/settings");
}

/**
 * Endpoint to get HubSpot contacts (mock implementation)
 */
export async function getHubSpotContacts(req: Request, res: Response) {
  try {
    // Mock contacts data
    const mockContacts = [
      {
        id: "1",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@example.com",
        phone: "+1234567890",
        company: "Acme Inc",
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: "2",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "+1987654321",
        company: "Global Tech",
        lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];
    
    return res.json(mockContacts);
  } catch (error) {
    console.error("Error fetching HubSpot contacts:", error);
    return res.status(500).json({ error: "Failed to fetch HubSpot contacts" });
  }
}

/**
 * Endpoint to create a HubSpot contact (mock implementation)
 */
export async function createHubSpotContact(req: Request, res: Response) {
  try {
    const { firstName, lastName, email, phone, company } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Mock created contact
    const newContact = {
      id: Math.floor(Math.random() * 1000).toString(),
      firstName,
      lastName,
      email,
      phone,
      company,
      lastActivity: new Date()
    };
    
    return res.json(newContact);
  } catch (error) {
    console.error("Error creating HubSpot contact:", error);
    return res.status(500).json({ error: "Failed to create HubSpot contact" });
  }
}