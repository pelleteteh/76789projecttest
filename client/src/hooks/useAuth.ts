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
      
      // If authenticated, we need to get a valid auth token
      if (authenticated) {
        (async () => {
          try {
            // Use getAccessToken which returns a valid JWT for the API
            const token = await getAccessToken();
            if (token) {
              setAuthToken(token);
              console.log('✅ Privy auth token set for API requests');

              // Check for stored referral code and report it to the backend
              const storedReferralCode = localStorage.getItem("referralCode");
              if (storedReferralCode) {
                try {
                  const response = await fetch('/api/referrals/apply', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
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
              console.warn('⚠️ getAccessToken returned null/undefined');
              setAuthToken(null);
            }
          } catch (err) {
            console.error('Failed to get Privy access token:', err);
            setAuthToken(null);
          }
        })();
      } else {
        // Clear token when logged out
        setAuthToken(null);
      }
    }
  }, [authenticated, ready, getAccessToken]);

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