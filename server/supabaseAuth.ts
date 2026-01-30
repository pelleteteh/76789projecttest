import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

/**
 * Create or get a user by wallet address
 * Called after Privy authenticates the wallet
 * 
 * This function generates a deterministic user ID from the wallet address
 * without needing to connect to Supabase API (avoiding DNS/network issues)
 */
export async function getOrCreateSupabaseUser(walletAddress: string, email?: string) {
  try {
    console.log(`🔑 Creating JWT user for wallet: ${walletAddress}`);
    
    if (!walletAddress) {
      console.error('❌ No wallet address provided');
      return null;
    }

    // Generate a deterministic user ID from wallet address
    // This ensures the same wallet always gets the same user ID
    const userId = crypto
      .createHash('sha256')
      .update(walletAddress.toLowerCase())
      .digest('hex')
      .slice(0, 32); // Use first 32 chars as user ID
    
    const userEmail = email || `${walletAddress.toLowerCase()}@wallet.local`;
    
    console.log(`✅ User ready: ${userId}`);

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
 * Uses local signing - no external API calls needed
 */
export function generateSupabaseToken(userId: string, walletAddress: string) {
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
export function verifySupabaseToken(token: string) {
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
export function SupabaseAuthMiddleware(req: any, res: any, next: any) {
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
    const decoded = verifySupabaseToken(token);

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
