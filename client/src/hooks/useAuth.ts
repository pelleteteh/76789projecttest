import { usePrivy } from '@privy-io/react-auth';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { setAuthToken } from '@/lib/queryClient';

export function useAuth() {
  const { toast } = useToast();
  const {
    ready,
    authenticated,
    user,
    login,
    logout: privyLogout,
    getAccessToken,
  } = usePrivy();
  const [, navigate] = useLocation();

  const [stableAuthenticated, setStableAuthenticated] = useState(authenticated);

  // Stabilize authentication state and set auth token for API requests
  useEffect(() => {
    if (ready) {
      // Only update stable state after Privy is ready
      setStableAuthenticated(authenticated);
      
      // If authenticated, exchange Privy wallet for Supabase JWT
      if (authenticated && user?.wallet?.address) {
        (async () => {
          try {
            console.log('🔄 Exchanging Privy wallet for Supabase JWT...');
            console.log(`   Wallet: ${user.wallet.address}`);
            
            // Exchange wallet login for Supabase JWT token
            const response = await fetch('/api/auth/wallet-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                walletAddress: user.wallet.address,
                email: user.email,
              }),
            });

            if (!response.ok) {
              throw new Error(`Login failed: ${response.statusText}`);
            }

            const data = await response.json();
            const supabaseToken = data.token;

            if (supabaseToken) {
              setAuthToken(supabaseToken);
              console.log('✅ Supabase JWT token set for API requests');
              console.log(`   Token (first 40 chars): ${supabaseToken.substring(0, 40)}...`);

              // Check for stored referral code and report it to the backend
              const storedReferralCode = localStorage.getItem("referralCode");
              if (storedReferralCode) {
                try {
                  const response = await fetch('/api/referrals/apply', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseToken}`
                    },
                    body: JSON.stringify({ referralCode: storedReferralCode })
                  });
                  
                  if (response.ok) {
                    localStorage.removeItem("referralCode");
                    console.log('✅ Referral code applied');
                  }
                } catch (err) {
                  console.error('Failed to apply referral code:', err);
                }
              }
            } else {
              console.warn('⚠️ No token returned from wallet login');
              setAuthToken(null);
            }
          } catch (err) {
            console.error('❌ Failed to exchange wallet for JWT:', err);
            setAuthToken(null);
          }
        })();
      } else {
        // Clear token when logged out
        console.log('👋 User logged out, clearing auth token');
        setAuthToken(null);
      }
    }
  }, [authenticated, ready, user?.wallet?.address, user?.email]);

  const logout = async () => {
    try {
      await privyLogout();
      // Force redirect to home page after logout
      window.location.replace('/');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    }
  };

  return {
    user: stableAuthenticated ? user : null,
    isLoading: !ready,
    isAuthenticated: stableAuthenticated,
    login,
    logout,
    isLoggingOut: false,
    getAccessToken,
  };
}