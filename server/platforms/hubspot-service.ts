import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { platforms } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";
import axios from "axios";

// Check if HubSpot API credentials are configured
export function isHubSpotConfigured(): boolean {
  return !!process.env.HUBSPOT_API_KEY;
}

// Hubspot API base URL
const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// Get HubSpot platform status
export async function getHubSpotStatus(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  
  try {
    // Check if platform is already connected for this user
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "hubspot")
        )
      );
    
    res.json({ 
      configured: isHubSpotConfigured(),
      connected: !!platformRecord?.isConnected
    });
  } catch (error) {
    console.error("Error getting HubSpot status:", error);
    res.json({ 
      configured: isHubSpotConfigured(),
      connected: false 
    });
  }
}

// Connect to HubSpot API
export async function connectHubSpot(req: Request, res: Response) {
  if (!isHubSpotConfigured()) {
    return res.status(400).json({ 
      message: "HubSpot API key not configured. Please add HUBSPOT_API_KEY to your environment variables." 
    });
  }

  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    if (req.session) {
      req.session.hubspotState = state;
    }

    // Get user ID from authenticated user
    const userId = req.user?.id || "1";
    
    // Test connection by making a simple API call
    try {
      const response = await axios.get(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts`, {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error("HubSpot API key validation failed");
      }
    } catch (apiError) {
      console.error("HubSpot API test failed:", apiError);
      return res.status(400).json({ 
        message: "Failed to authenticate with HubSpot API. Please check your API key."
      });
    }
    
    // Check if platform already exists for this user
    const [existingPlatform] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "hubspot")
        )
      );
    
    if (existingPlatform) {
      // Update existing platform
      await db.update(platforms)
        .set({
          accessToken: process.env.HUBSPOT_API_KEY,
          isConnected: true,
          updatedAt: new Date()
        })
        .where(eq(platforms.id, existingPlatform.id));
    } else {
      // Create new platform
      await storage.createPlatform({
        name: "hubspot",
        displayName: "HubSpot CRM",
        userId: userId,
        accessToken: process.env.HUBSPOT_API_KEY,
        refreshToken: null,
        tokenExpiry: null, // API keys don't expire
        isConnected: true
      });
    }
    
    // Redirect back to the app with success parameter
    return res.redirect(`/?hubspot_connected=true`);
  } catch (error) {
    console.error("Error connecting to HubSpot:", error);
    return res.status(500).json({ message: "Failed to connect to HubSpot" });
  }
}

// Get HubSpot contacts
export async function getHubSpotContacts(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { limit = 50, after } = req.query;
  
  if (!isHubSpotConfigured()) {
    return res.status(400).json({ 
      message: "HubSpot API credentials not configured"
    });
  }

  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "hubspot")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "HubSpot platform not found for this user" });
    }
    
    // Make API call to HubSpot
    try {
      let url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=${limit}`;
      if (after) {
        url += `&after=${after}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${platformRecord.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error("Failed to fetch contacts from HubSpot");
      }
      
      const { results, paging } = response.data;
      
      // Transform the results to a more usable format
      const contacts = results.map((contact: any) => {
        return {
          id: contact.id,
          firstName: contact.properties.firstname,
          lastName: contact.properties.lastname,
          email: contact.properties.email,
          phone: contact.properties.phone,
          company: contact.properties.company,
          createdAt: contact.properties.createdate,
          updatedAt: contact.properties.lastmodifieddate
        };
      });
      
      res.json({
        contacts,
        paging: paging || null
      });
    } catch (apiError: any) {
      console.error("HubSpot API error:", apiError?.response?.data || apiError.message);
      
      // If we can't connect to the API, provide limited demo data
      if (!isHubSpotConfigured() || apiError?.response?.status === 401) {
        // Demo data for interface testing
        const mockContacts = [
          {
            id: "1",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+1234567890",
            company: "Acme Inc",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "2",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com",
            phone: "+1987654321",
            company: "XYZ Corp",
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        return res.json({
          contacts: mockContacts,
          paging: null,
          demo: true
        });
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error("Error getting HubSpot contacts:", error);
    res.status(500).json({ message: "Failed to fetch HubSpot contacts" });
  }
}

// Create a HubSpot contact
export async function createHubSpotContact(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { firstName, lastName, email, phone, company } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  
  if (!isHubSpotConfigured()) {
    return res.status(400).json({ 
      message: "HubSpot API credentials not configured"
    });
  }

  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "hubspot")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "HubSpot platform not found for this user" });
    }
    
    // Create contact in HubSpot
    try {
      const response = await axios.post(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
        {
          properties: {
            firstname: firstName,
            lastname: lastName,
            email: email,
            phone: phone,
            company: company
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${platformRecord.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 201) {
        throw new Error("Failed to create contact in HubSpot");
      }
      
      res.json({
        success: true,
        contact: {
          id: response.data.id,
          firstName,
          lastName,
          email,
          phone,
          company,
          createdAt: response.data.properties.createdate,
          updatedAt: response.data.properties.lastmodifieddate
        }
      });
    } catch (apiError: any) {
      console.error("HubSpot API error:", apiError?.response?.data || apiError.message);
      throw apiError;
    }
  } catch (error) {
    console.error("Error creating HubSpot contact:", error);
    res.status(500).json({ message: "Failed to create HubSpot contact" });
  }
}

// Get HubSpot deals
export async function getHubSpotDeals(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { limit = 50, after } = req.query;
  
  if (!isHubSpotConfigured()) {
    return res.status(400).json({ 
      message: "HubSpot API credentials not configured"
    });
  }

  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "hubspot")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "HubSpot platform not found for this user" });
    }
    
    // Make API call to HubSpot
    try {
      let url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline`;
      if (after) {
        url += `&after=${after}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${platformRecord.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error("Failed to fetch deals from HubSpot");
      }
      
      const { results, paging } = response.data;
      
      // Transform the results to a more usable format
      const deals = results.map((deal: any) => {
        return {
          id: deal.id,
          name: deal.properties.dealname,
          amount: deal.properties.amount,
          stage: deal.properties.dealstage,
          closeDate: deal.properties.closedate,
          pipeline: deal.properties.pipeline,
          createdAt: deal.properties.createdate,
          updatedAt: deal.properties.lastmodifieddate
        };
      });
      
      res.json({
        deals,
        paging: paging || null
      });
    } catch (apiError: any) {
      console.error("HubSpot API error:", apiError?.response?.data || apiError.message);
      
      // If we can't connect to the API, provide limited demo data
      if (!isHubSpotConfigured() || apiError?.response?.status === 401) {
        // Demo data for interface testing
        const mockDeals = [
          {
            id: "1",
            name: "Enterprise Software Deal",
            amount: "150000",
            stage: "presentationscheduled",
            closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            pipeline: "default",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "2",
            name: "SMB Consulting Package",
            amount: "45000",
            stage: "contractsent",
            closeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            pipeline: "default",
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        return res.json({
          deals: mockDeals,
          paging: null,
          demo: true
        });
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error("Error getting HubSpot deals:", error);
    res.status(500).json({ message: "Failed to fetch HubSpot deals" });
  }
}

// Create a HubSpot deal
export async function createHubSpotDeal(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { name, amount, stage, closeDate, pipeline, contactId } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: "Deal name is required" });
  }
  
  if (!isHubSpotConfigured()) {
    return res.status(400).json({ 
      message: "HubSpot API credentials not configured"
    });
  }

  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "hubspot")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "HubSpot platform not found for this user" });
    }
    
    // Create deal in HubSpot
    try {
      const response = await axios.post(
        `${HUBSPOT_API_BASE}/crm/v3/objects/deals`,
        {
          properties: {
            dealname: name,
            amount: amount,
            dealstage: stage || "appointmentscheduled",
            closedate: closeDate,
            pipeline: pipeline || "default"
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${platformRecord.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 201) {
        throw new Error("Failed to create deal in HubSpot");
      }
      
      // Associate deal with contact if contactId is provided
      if (contactId) {
        try {
          await axios.put(
            `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${response.data.id}/associations/contacts/${contactId}/deal_to_contact`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${platformRecord.accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (associationError) {
          console.error("Error associating deal with contact:", associationError);
          // Continue even if association fails
        }
      }
      
      res.json({
        success: true,
        deal: {
          id: response.data.id,
          name,
          amount,
          stage: stage || "appointmentscheduled",
          closeDate,
          pipeline: pipeline || "default",
          createdAt: response.data.properties.createdate,
          updatedAt: response.data.properties.lastmodifieddate
        }
      });
    } catch (apiError: any) {
      console.error("HubSpot API error:", apiError?.response?.data || apiError.message);
      throw apiError;
    }
  } catch (error) {
    console.error("Error creating HubSpot deal:", error);
    res.status(500).json({ message: "Failed to create HubSpot deal" });
  }
}