/**
 * Hook to detect the current connected blockchain chain
 */

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export function useCurrentChain() {
  const { wallets, ready } = usePrivy();
  const [chainId, setChainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ready) {
      setIsLoading(true);
      return;
    }

    const detectChain = async () => {
      try {
        let provider: ethers.BrowserProvider | null = null;

        // Try to get provider from wallet
        if (wallets && wallets.length > 0) {
          const wallet = wallets[0];
          if (wallet?.provider) {
            provider = new ethers.BrowserProvider(wallet.provider);
          }
        }

        // Fallback to window.ethereum
        if (!provider && (window as any).ethereum) {
          provider = new ethers.BrowserProvider((window as any).ethereum);
        }

        if (provider) {
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
          console.log(`🔗 Detected chain: ${network.name} (ID: ${network.chainId})`);
        } else {
          // Default to Base Sepolia
          setChainId(84532);
          console.log('⚠️ No provider found, defaulting to Base Sepolia');
        }
      } catch (error) {
        console.error('Failed to detect chain:', error);
        // Default to Base Sepolia on error
        setChainId(84532);
      } finally {
        setIsLoading(false);
      }
    };

    detectChain();

    // Also set up a listener for chain changes
    if ((window as any).ethereum) {
      const handleChainChange = (newChainId: string) => {
        const numericChainId = parseInt(newChainId, 16);
        setChainId(numericChainId);
        console.log(`🔄 Chain changed to: ${numericChainId}`);
      };

      (window as any).ethereum.on('chainChanged', handleChainChange);

      return () => {
        (window as any).ethereum.removeListener('chainChanged', handleChainChange);
      };
    }
  }, [ready, wallets]);

  return {
    chainId,
    isLoading,
  };
}
