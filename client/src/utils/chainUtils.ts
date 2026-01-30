/**
 * Blockchain Chain Detection Utility
 * Returns the appropriate logo and chain info based on connected chain
 */

export interface ChainInfo {
  id: number;
  name: string;
  logo: string;
  color: string;
  rpc: string;
}

// Chain configurations with logos and colors
export const CHAINS: Record<number, ChainInfo> = {
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    logo: '/assets/Base_logo.svg',
    color: '#0052FF',
    rpc: 'https://sepolia.base.org',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    logo: '/assets/arbitrumlogo.svg',
    color: '#28A0F0',
    rpc: 'https://arb1.arbitrum.io/rpc',
  },
  421614: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    logo: '/assets/arbitrumlogo.svg',
    color: '#28A0F0',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
  },
  137: {
    id: 137,
    name: 'Polygon',
    logo: '/assets/polygonlogo.svg',
    color: '#8247E5',
    rpc: 'https://polygon-rpc.com',
  },
  80002: {
    id: 80002,
    name: 'Polygon Amoy',
    logo: '/assets/polygonlogo.svg',
    color: '#8247E5',
    rpc: 'https://rpc-amoy.polygon.technology',
  },
};

/**
 * Get chain info by chain ID
 * @param chainId The blockchain chain ID
 * @returns ChainInfo with logo, name, and color
 */
export function getChainInfo(chainId: number | null | undefined): ChainInfo {
  if (!chainId) {
    // Default to Base Sepolia
    return CHAINS[84532];
  }
  
  return CHAINS[chainId] || CHAINS[84532]; // Fallback to Base Sepolia
}

/**
 * Get the logo path for a specific chain
 * @param chainId The blockchain chain ID
 * @returns Path to the chain logo
 */
export function getChainLogo(chainId: number | null | undefined): string {
  return getChainInfo(chainId).logo;
}

/**
 * Get the color for a specific chain
 * @param chainId The blockchain chain ID
 * @returns Hex color code for the chain
 */
export function getChainColor(chainId: number | null | undefined): string {
  return getChainInfo(chainId).color;
}

/**
 * Get the display name for a specific chain
 * @param chainId The blockchain chain ID
 * @returns Display name of the chain
 */
export function getChainName(chainId: number | null | undefined): string {
  return getChainInfo(chainId).name;
}
