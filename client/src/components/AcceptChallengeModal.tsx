import { useState } from 'react';
import { useBlockchainChallenge } from '@/hooks/useBlockchainChallenge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface AcceptChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: any;
  onSuccess?: () => void;
}

export function AcceptChallengeModal({
  isOpen,
  onClose,
  challenge,
  onSuccess,
}: AcceptChallengeModalProps) {
  const { acceptP2PChallenge, isRetrying } = useBlockchainChallenge();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!challenge) return null;

  const challenger = challenge.challengerUser;
  const stakeAmount = challenge.stakeAmount || '0';
  const stakeInUSDC = (parseInt(stakeAmount) / 1e6).toFixed(2);

  const handleAcceptChallenge = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setTransactionHash(null);

      toast({
        title: 'Accepting Challenge',
        description: 'Preparing transaction...',
      });

      const result = await acceptP2PChallenge({
        challengeId: challenge.id,
        stakeAmount: challenge.stakeAmountWei?.toString() || stakeAmount,
        paymentToken: challenge.paymentTokenAddress || '0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860',
      });

      setTransactionHash(result.transactionHash);

      toast({
        title: '✅ Challenge Accepted!',
        description: `Transaction: ${result.transactionHash?.slice(0, 10)}...`,
      });

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept challenge:', err);
      const errorMsg = err.message?.includes('user rejected')
        ? 'You cancelled the transaction'
        : err.message || 'Failed to accept challenge';
      
      setError(errorMsg);
      toast({
        title: '❌ Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accept Challenge</DialogTitle>
          <DialogDescription>
            Confirm that you want to accept this challenge
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Challenger Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            {challenger?.profileImageUrl ? (
              <img
                src={challenger.profileImageUrl}
                alt={challenger.firstName || 'Challenger'}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <UserAvatar user={challenger} size="lg" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {challenger?.firstName || challenger?.username || 'Unknown'}
              </p>
              <p className="text-xs text-slate-500">
                Challenged you to: {challenge.title}
              </p>
            </div>
          </div>

          {/* Challenge Details */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Title</span>
              <span className="font-semibold">{challenge.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Category</span>
              <span className="font-semibold capitalize">{challenge.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Stake Amount</span>
              <span className="font-semibold text-lg text-[#ccff00]">
                {stakeInUSDC} USDC
              </span>
            </div>
            {challenge.description && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Description:
                </p>
                <p className="text-sm mt-1">{challenge.description}</p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {transactionHash && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Challenge Accepted!
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 break-all">
                  {transactionHash}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Error
                </p>
                <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
              </div>
            </div>
          )}

          {isRetrying && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Retrying transaction...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isRetrying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptChallenge}
              disabled={isSubmitting || isRetrying || !!transactionHash}
              className="flex-1 bg-[#ccff00] text-black hover:bg-[#b8e600] disabled:opacity-50"
            >
              {isSubmitting || isRetrying ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : transactionHash ? (
                '✓ Accepted'
              ) : (
                'Accept Challenge'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
