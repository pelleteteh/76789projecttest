import { Router, Request, Response } from 'express';
import { getOrCreateSupabaseUser, generateSupabaseToken } from '../supabaseAuth';

const router = Router();

/**
 * POST /api/auth/wallet-login
 * Exchange Privy wallet authentication for Supabase JWT
 * 
 * Frontend should call this after successful Privy wallet login
 * Pass the wallet address to get back a Supabase JWT token
 */
router.post('/wallet-login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, email } = req.body;

    console.log(`\n🔑 Wallet login attempt for: ${walletAddress}`);

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    // Create or get the Supabase user
    const user = await getOrCreateSupabaseUser(walletAddress, email);

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate a Supabase JWT token
    const token = generateSupabaseToken(user.id, walletAddress);

    if (!token) {
      return res.status(500).json({ error: 'Failed to generate token' });
    }

    console.log(`✅ Login successful for wallet: ${walletAddress}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        wallet: user.wallet,
      },
    });
  } catch (error: any) {
    console.error('❌ Wallet login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
