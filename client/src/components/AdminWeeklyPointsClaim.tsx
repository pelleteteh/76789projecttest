/**
 * Admin User Weekly Points Payout Component
 * Allows admins to send earned points to user wallets at the end of the week
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAdminQuery, adminApiRequest } from '@/lib/adminApi';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar,
  Wallet,
  Gift,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfWeek, endOfWeek } from 'date-fns';

interface UserEarnings {
  userId: string;
  username: string;
  email: string;
  weeklyEarnings: number;
  transactionCount: number;
  walletAddress?: string;
}

export function AdminUserWeeklyPointsPayout() {
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [walletAddresses, setWalletAddresses] = useState<{ [key: string]: string }>({});

  // Fetch users with weekly earnings
  const { data: usersEarnings = [] as UserEarnings[], isLoading: isLoadingUsers } = useAdminQuery(
    '/api/points/admin/user-weekly-earnings',
    { retry: false }
  );

  // Calculate week info
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  // Payout mutation for multiple users
  const payoutMutation = useMutation({
    mutationFn: async () => {
      const payouts = Array.from(selectedUsers).map((userId) => ({
        userId,
        walletAddress: walletAddresses[userId],
      }));

      // Validate all addresses are provided
      if (payouts.some((p) => !p.walletAddress?.trim())) {
        throw new Error('Please provide wallet addresses for all selected users');
      }

      const response = await adminApiRequest('/api/points/admin/payout-weekly', {
        method: 'POST',
        body: JSON.stringify({ payouts }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process payouts');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: '✅ Payouts Processed Successfully!',
        description: `${data.processedCount} users received their weekly points.`,
      });
      setSelectedUsers(new Set());
      setWalletAddresses({});
    },
    onError: (error: any) => {
      toast({
        title: '❌ Payout Failed',
        description: error.message || 'Failed to process payouts',
        variant: 'destructive',
      });
    },
  });

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
      const newAddresses = { ...walletAddresses };
      delete newAddresses[userId];
      setWalletAddresses(newAddresses);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const updateWalletAddress = (userId: string, address: string) => {
    setWalletAddresses((prev) => ({ ...prev, [userId]: address }));
  };

  const totalSelectedUsers = selectedUsers.size;
  const totalEarnings = Array.from(selectedUsers).reduce((sum, userId) => {
    const user = usersEarnings.find((u) => u.userId === userId);
    return sum + (user?.weeklyEarnings || 0);
  }, 0);

  const usersWithEarnings = usersEarnings.filter((u) => Number(u.weeklyEarnings) > 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Weekly Points Payout
            </CardTitle>
            <CardDescription>
              Send earned BantahPoints to user wallets at the end of the week
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Calendar className="w-4 h-4 mr-1" />
            Current Week
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Week Period Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Week Period */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Week Period
                </p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Users with Earnings */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Users with Earnings
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {isLoadingUsers ? '...' : usersWithEarnings.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Pending */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total Pending
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {isLoadingUsers ? '...' : usersWithEarnings.reduce((sum, u) => sum + u.weeklyEarnings, 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selection Summary */}
        {totalSelectedUsers > 0 && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-300">
                {totalSelectedUsers} users selected for payout
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                Total to distribute: {totalEarnings.toFixed(2)} BPTS
              </p>
            </div>
          </div>
        )}

        {/* Users List */}
        {isLoadingUsers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : usersWithEarnings.length === 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-300">
                No Users with Earnings
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-400">
                Users will appear here once they complete challenges or events this week
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {usersWithEarnings.map((user) => (
              <div
                key={user.userId}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    id={`user-${user.userId}`}
                    checked={selectedUsers.has(user.userId)}
                    onCheckedChange={() => toggleUserSelection(user.userId)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        htmlFor={`user-${user.userId}`}
                        className="font-semibold text-gray-900 dark:text-white cursor-pointer"
                      >
                        {user.username}
                      </label>
                      <Badge variant="secondary" className="text-xs">
                        {user.weeklyEarnings.toFixed(2)} BPTS
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {user.email} • {user.transactionCount} transactions
                    </p>

                    {selectedUsers.has(user.userId) && (
                      <div>
                        <Label htmlFor={`wallet-${user.userId}`} className="text-xs mb-2 block">
                          Wallet Address
                        </Label>
                        <Input
                          id={`wallet-${user.userId}`}
                          type="text"
                          placeholder="0x..."
                          value={walletAddresses[user.userId] || ''}
                          onChange={(e) => updateWalletAddress(user.userId, e.target.value)}
                          disabled={payoutMutation.isPending}
                          className="font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        {usersWithEarnings.length > 0 && (
          <Button
            onClick={() => payoutMutation.mutate()}
            disabled={totalSelectedUsers === 0 || payoutMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {payoutMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payouts...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send {totalSelectedUsers > 0 ? `${totalSelectedUsers} Payouts` : 'Payouts'}
              </>
            )}
          </Button>
        )}

        {/* Info Section */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 border-t pt-4">
          <p className="font-semibold text-gray-800 dark:text-gray-300">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Users earn points by creating and completing challenges or events</li>
            <li>Select users from the list who should receive their weekly payouts</li>
            <li>Provide a wallet address for each selected user</li>
            <li>Click "Send Payouts" to process and record all transactions</li>
            <li>Each payout is recorded as an admin_claim_weekly transaction</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
