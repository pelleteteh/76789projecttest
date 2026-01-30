import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Create or get a user by wallet address
 * Called after Privy authenticates the wallet
 */
export async function getOrCreateSupabaseUser(walletAddress: string, email?: string) {
  try {
    console.log(`🔑 Creating/fetching Supabase user for wallet: ${walletAddress}`);
    
    // Try to get existing user
    let user = await supabaseAdmin.auth.admin.listUsers();
    
    // For now, use wallet as both ID and email if not provided
    const userEmail = email || `${walletAddress.toLowerCase()}@wallet.local`;
    
    // Create user with wallet address as metadata
    const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: walletAddress.slice(-32), // Use wallet as password (won't be used)
      email_confirm: true,
      user_metadata: {
        wallet_address: walletAddress.toLowerCase(),
      },
    });

    if (error && !error.message.includes('already exists')) {
      console.error('❌ Error creating Supabase user:', error.message);
      return null;
    }

    const userId = userData?.user?.id;
    console.log(`✅ Supabase user ready: ${userId}`);

    return {
      id: userId,
      email: userEmail,
      wallet: walletAddress.toLowerCase(),
    };
  } catch (error: any) {
    console.error('❌ Error in getOrCreateSupabaseUser:', error.message);
    return null;
  }
}

/**
 * Generate a Supabase-compatible JWT token
 */
export async function generateSupabaseToken(userId: string, walletAddress: string) {
  try {
    console.log(`🔐 Generating JWT for user: ${userId}`);
    
    // Use JWT secret to create token
    const token = jwt.sign(
      {
        aud: 'authenticated',
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        email: `${walletAddress.toLowerCase()}@wallet.local`,
        user_metadata: {
          wallet_address: walletAddress.toLowerCase(),
        },
      },
      JWT_SECRET,
      {
        algorithm: 'HS256',
      }
    );

    console.log(`✅ JWT token generated (${token.length} chars)`);
    return token;
  } catch (error: any) {
    console.error('❌ Error generating JWT:', error.message);
    return null;
  }
}

/**
 * Verify a Supabase JWT token
 */
export async function verifySupabaseToken(token: string) {
  try {
    console.log('🔍 Verifying JWT token...');
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    console.log(`✅ JWT verified for user: ${decoded.sub}`);
    return decoded as any;
  } catch (error: any) {
    console.error('❌ JWT verification failed:', error.message);
    return null;
  }
}

/**
 * Middleware to verify Supabase JWT
 */
export async function SupabaseAuthMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const url = req.originalUrl || req.url;
  
  console.log(`\n🔐 SupabaseAuthMiddleware for ${req.method} ${url}`);
  console.log(`   Authorization header: ${authHeader ? 'Present' : 'MISSING'}`);

  // Check for Passport session auth (for backward compatibility)
  if (!authHeader && req.isAuthenticated && req.isAuthenticated()) {
    console.log('✅ Using session-based auth');
    return next();
  }

  if (!authHeader) {
    console.error('❌ No Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  console.log(`🔑 Token received (${token.length} chars)`);

  try {
    const decoded = await verifySupabaseToken(token);

    if (!decoded || !decoded.sub) {
      console.error('❌ Invalid token or no user ID');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      wallet: decoded.user_metadata?.wallet_address,
    };

    console.log(`✅ User authenticated: ${req.user.id}`);
    next();
  } catch (error: any) {
    console.error('❌ Auth error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
