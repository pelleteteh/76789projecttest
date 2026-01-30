import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CHAIN_CONFIG, getChainConfig, getSupportedChainIds, getDefaultChainId, ChainId } from '@/config/chains';

interface ChainStore {
  currentChainId: ChainId;
  setChainId: (chainId: ChainId) => void;
  getCurrentChainConfig: () => typeof CHAIN_CONFIG[ChainId];
  isChainSupported: (chainId: number) => boolean;
  getSupportedChains: () => Array<{ id: ChainId; name: string; shortName: string }>;
}

/**
 * Global store for managing the current blockchain network
 * Persists user's chain preference in localStorage
 */
export const useChain = create<ChainStore>()(
  persist(
    (set, get) => ({
      currentChainId: getDefaultChainId(),
      
      setChainId: (chainId: ChainId) => {
        if (get().isChainSupported(chainId)) {
          set({ currentChainId: chainId });
        } else {
          console.warn(`Chain ${chainId} is not supported`);
        }
      },
      
      getCurrentChainConfig: () => {
        const state = get();
        const config = getChainConfig(state.currentChainId);
        if (!config) {
          throw new Error(`Invalid chain ID: ${state.currentChainId}`);
        }
        return config;
      },
      
      isChainSupported: (chainId: number) => {
        return getSupportedChainIds().includes(chainId as ChainId);
      },
      
      getSupportedChains: () => {
        return getSupportedChainIds().map((chainId) => {
          const config = CHAIN_CONFIG[chainId];
          return {
            id: chainId,
            name: config.name,
            shortName: config.shortName,
          };
        });
      },
    }),
    {
      name: 'chain-store',
      partialize: (state) => ({ currentChainId: state.currentChainId }),
    }
  )
);

/**
 * Hook to get the current chain configuration
 */
export function useCurrentChain() {
  const chainId = useChain((state) => state.currentChainId);
  const config = getChainConfig(chainId);
  
  if (!config) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  
  return config;
}

/**
 * Hook to switch chains
 */
export function useChainSwitch() {
  const setChainId = useChain((state) => state.setChainId);
  const isChainSupported = useChain((state) => state.isChainSupported);
  const getSupportedChains = useChain((state) => state.getSupportedChains);
  
  return {
    switchChain: setChainId,
    isChainSupported,
    supportedChains: getSupportedChains(),
  };
}
