import express from 'express';
import { AuthRequest } from '../middleware/auth';
import { storage } from '../storage';
import { z } from 'zod';

const router = express.Router();

// Organization creation schema
const createOrganizationSchema = z.object({
  name: z.string().min(3, 'Organization name is required'),
  industry: z.string().optional(),
  size: z.string().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']),
  website: z.string().url().optional(),
  logo: z.string().optional(),
});

// Get all organizations for the current user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const organizations = await storage.getOrganizationsByUserId(userId);
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

// Get a specific organization by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get the organization
    const organization = await storage.getOrganization(organizationId);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Check if user is a member of this organization
    const userOrganizations = await storage.getOrganizationsByUserId(userId);
    const isMember = userOrganizations.some(org => org.id === organizationId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You do not have access to this organization' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ message: 'Failed to fetch organization' });
  }
});

// Create a new organization
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate the request body
    const validationResult = createOrganizationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid organization data',
        errors: validationResult.error.format() 
      });
    }
    
    const organizationData = validationResult.data;
    
    // Create the organization
    const organization = await storage.createOrganization({
      ...organizationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Add the user as an admin member of this organization
    await storage.addOrganizationMember({
      userId,
      organizationId: organization.id,
      role: 'admin',
      isDefault: true,
      joinedAt: new Date().toISOString()
    });
    
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Failed to create organization' });
  }
});

// Update an organization
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is an admin of this organization
    const memberList = await storage.getOrganizationMembers(organizationId);
    const userMembership = memberList.find(m => m.userId === userId);
    
    if (!userMembership || userMembership.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update this organization' });
    }
    
    // Validate update data
    const updateSchema = createOrganizationSchema.partial();
    const validationResult = updateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid organization data',
        errors: validationResult.error.format() 
      });
    }
    
    const organizationData = validationResult.data;
    
    // Update the organization
    const organization = await storage.updateOrganization(organizationId, {
      ...organizationData,
      updatedAt: new Date().toISOString()
    });
    
    res.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: 'Failed to update organization' });
  }
});

// Get all members of an organization
router.get('/:id/members', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is a member of this organization
    const userOrganizations = await storage.getOrganizationsByUserId(userId);
    const isMember = userOrganizations.some(org => org.id === organizationId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You do not have access to this organization' });
    }
    
    // Get all members
    const members = await storage.getOrganizationMembers(organizationId);
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ message: 'Failed to fetch organization members' });
  }
});

// Add a member to an organization (invite flow would typically be more complex)
router.post('/:id/members', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is an admin of this organization
    const memberList = await storage.getOrganizationMembers(organizationId);
    const userMembership = memberList.find(m => m.userId === userId);
    
    if (!userMembership || userMembership.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to add members to this organization' });
    }
    
    // Validate the request body
    const memberSchema = z.object({
      userId: z.string(),
      role: z.enum(['admin', 'member', 'readonly']),
      isDefault: z.boolean().optional()
    });
    
    const validationResult = memberSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid member data',
        errors: validationResult.error.format() 
      });
    }
    
    const memberData = validationResult.data;
    
    // Add the member
    const member = await storage.addOrganizationMember({
      ...memberData,
      organizationId,
      joinedAt: new Date().toISOString()
    });
    
    res.status(201).json(member);
  } catch (error) {
    console.error('Error adding organization member:', error);
    res.status(500).json({ message: 'Failed to add organization member' });
  }
});

// Remove a member from an organization
router.delete('/:orgId/members/:memberId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.params.orgId;
    const memberId = parseInt(req.params.memberId);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is an admin of this organization
    const memberList = await storage.getOrganizationMembers(organizationId);
    const userMembership = memberList.find(m => m.userId === userId);
    
    if (!userMembership || userMembership.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to remove members from this organization' });
    }
    
    // Get the member being removed
    const memberToRemove = memberList.find(m => m.id === memberId);
    
    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    // Prevent removing the last admin
    const admins = memberList.filter(m => m.role === 'admin');
    if (admins.length === 1 && memberToRemove.role === 'admin') {
      return res.status(400).json({ message: 'Cannot remove the last admin from an organization' });
    }
    
    // Remove the member
    const result = await storage.removeOrganizationMember(memberId);
    
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Member not found' });
    }
  } catch (error) {
    console.error('Error removing organization member:', error);
    res.status(500).json({ message: 'Failed to remove organization member' });
  }
});

export default router;