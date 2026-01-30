import express, { Request, Response } from 'express';
import { storage } from '../storage';

const router = express.Router();

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    console.log(`🔐 Admin login attempt for username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get user by username
    const user = await storage.getUserByUsername(username);

    console.log(`🔍 User lookup result:`, user ? `Found user ${user.id}` : 'User not found');

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Access denied: Not an administrator' });
    }

    // Simple password check (in production, this should use bcrypt or similar)
    // For now, checking against a seeded admin password
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate admin token: admin_<userId>_<timestamp>
    const token = `admin_${user.id}_${Date.now()}`;

    console.log(`✅ Admin login successful for: ${username}`);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isAdmin: user.isAdmin || false,
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
});

export default router;
