/**
 * Chain Switcher Component
 * Allows users to switch between supported blockchain networks
 */

'use client';

import React from 'react';
import { useChainSwitch, useChain } from '@/hooks/useChain';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChainId } from '@/config/chains';
import { useToast } from '@/hooks/use-toast';
import { useBlockchainChallenge } from '@/hooks/useBlockchainChallenge';

export function ChainSwitcher() {
  const { toast } = useToast();
  const currentChainId = useChain((state) => state.currentChainId);
  const { supportedChains } = useChainSwitch();
  const { switchChain: walletSwitchChain } = useBlockchainChallenge();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleChainChange = async (newChainId: string) => {
    try {
      setIsLoading(true);
      const chainId = parseInt(newChainId) as ChainId;
      
      // Switch the wallet's connected chain
      await walletSwitchChain(chainId);
      
      toast({
        title: 'Network Switched',
        description: `Switched to ${supportedChains.find(c => c.id === chainId)?.name}`,
      });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch network. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentChainName = supportedChains.find(c => c.id === currentChainId)?.name || 'Unknown';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Network:</span>
      <Select value={currentChainId.toString()} onValueChange={handleChainChange} disabled={isLoading}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select network" />
        </SelectTrigger>
        <SelectContent>
          {supportedChains.map((chain) => (
            <SelectItem key={chain.id} value={chain.id.toString()}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {chain.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        {currentChainName}
      </div>
    </div>
  );
}

/**
 * Compact inline chain switcher for navbar
 */
export function ChainSwitcherCompact() {
  const { toast } = useToast();
  const currentChainId = useChain((state) => state.currentChainId);
  const { supportedChains } = useChainSwitch();
  const { switchChain: walletSwitchChain } = useBlockchainChallenge();

  const handleChainChange = async (newChainId: string) => {
    try {
      const chainId = parseInt(newChainId) as ChainId;
      
      // Switch the wallet's connected chain
      await walletSwitchChain(chainId);
      
      toast({
        title: 'Network Switched',
        description: `Now on ${supportedChains.find(c => c.id === chainId)?.shortName}`,
      });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch network.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Select value={currentChainId.toString()} onValueChange={handleChainChange}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue placeholder="Select network" />
      </SelectTrigger>
      <SelectContent>
        {supportedChains.map((chain) => (
          <SelectItem key={chain.id} value={chain.id.toString()}>
            {chain.shortName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Network Status Badge
 */
export function NetworkStatusBadge() {
  const { supportedChains } = useChainSwitch();
  const currentChainId = useChain((state) => state.currentChainId);

  const currentChain = supportedChains.find(c => c.id === currentChainId);

  if (!currentChain) {
    return <div className="text-xs text-red-500">Unknown Network</div>;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs font-medium text-gray-700">{currentChain.shortName}</span>
    </div>
  );
}
