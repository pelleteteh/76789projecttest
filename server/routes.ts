import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { SupabaseAuthMiddleware } from "./supabaseAuth";
import { setupOGImageRoutes } from "./ogImageGenerator";
import ogMetadataRouter from './routes/og-metadata';
import authRouter from './routes/api-auth';
import { registerBlockchainRoutes } from './routes/index';
import { initializeBlockchain } from './blockchain/init';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    username?: string | null;
    isAdmin?: boolean;
  };
}

function getUserId(req: AuthenticatedRequest): string {
  if (req.user?.id) return req.user.id;
  throw new Error("User ID not found in request");
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  await setupAuth(app);

  // Initialize blockchain client
  try {
    console.log('🚀 Initializing blockchain client...');
    await initializeBlockchain();
  } catch (error: any) {
    console.error('⚠️  Blockchain initialization warning:', error.message);
    console.error('   Challenge creation will not work until contracts are deployed');
  }

  // Profile routes
  app.get('/api/profile', SupabaseAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update profile (PUT)
  app.put('/api/profile', SupabaseAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const { firstName, lastName, username, bio, profileImageUrl } = req.body;

      // Update user profile
      const updated = await storage.updateUserProfile(userId, {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        username: username !== undefined ? username : undefined,
        bio: bio !== undefined ? bio : undefined,
        profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : undefined,
      });

      console.log(`✅ Profile updated for user ${userId}`);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        ...updated,
      });
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      res.status(500).json({ 
        message: "Failed to update profile",
        error: error?.message 
      });
    }
  });

  // Auth routes (Supabase wallet login)
  app.use('/api/auth', authRouter);

  // Event routes
  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getEvents(20);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Users routes
  // Public users list (safe for search autocomplete)
  app.get('/api/users/public', async (req, res) => {
    try {
      const allUsers = await storage.getAllUsersWithWallets();
      // Only return minimal fields required for search/autocomplete
      const minimal = allUsers.map((u: any) => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        primaryWalletAddress: u.primaryWalletAddress,
        wallets: u.wallets || [],
        profileImageUrl: u.profileImageUrl || null,
      }));
      res.json(minimal);
    } catch (error: any) {
      console.error('❌ Failed to fetch public users:', error.message || error);
      res.status(500).json({ message: "Failed to fetch users", error: error?.message || 'Unknown error' });
    }
  });

  // Authenticated users list (admin or authenticated use-cases)
  app.get('/api/users', SupabaseAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const allUsers = await storage.getAllUsersWithWallets();
      res.json(allUsers);
    } catch (error: any) {
      console.error('❌ Failed to fetch users:', error.message || error);
      res.status(500).json({ message: "Failed to fetch users", error: error?.message || 'Unknown error' });
    }
  });

  // Wallet routes
  app.post('/api/wallet/deposit', SupabaseAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const { amount } = req.body;
      // Removed Paystack initialization, directly updating balance for now
      // This should be replaced with a real payment provider if needed
      res.json({ success: true, message: "Deposit request received" });
    } catch (error) {
      res.status(500).json({ message: "Failed to initiate deposit" });
    }
  });

  setupOGImageRoutes(app);
  app.use(ogMetadataRouter);

  // Register blockchain routes (Phase 4)
  console.log('📡 Registering blockchain routes...');
  registerBlockchainRoutes(app);
  console.log('✅ Blockchain routes registered');

  return httpServer;
}
