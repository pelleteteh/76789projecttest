# Admin Weekly Points Payout System - Quick Start Guide

## What Was Built
Admins can now send earned BantahPoints to user wallets at the end of each week. 

## How It Works

### For Admins:
1. **View Dashboard**: Go to Admin Dashboard → "Weekly Points Payout" section
2. **See Users**: System automatically shows all users who earned points this week
3. **Select Users**: Check the boxes next to users you want to pay out
4. **Enter Wallets**: Provide wallet addresses for each selected user
5. **Send Payouts**: Click "Send Payouts" button
6. **Confirm**: Toast notification shows success and payout count

### Behind the Scenes:
- System calculates each user's total BPTS earned from challenges/events this week
- Records each payout as a transaction in database (type: `admin_claim_weekly`)
- Stores wallet address for each payout for records
- Updates UI to reflect completed payouts

## API Endpoints

**Get all users with weekly earnings:**
```
GET /api/points/admin/user-weekly-earnings
```

**Process batch payouts:**
```
POST /api/points/admin/payout-weekly
Body: { 
  payouts: [
    { userId: "user123", walletAddress: "0x..." },
    { userId: "user456", walletAddress: "0x..." }
  ]
}
```

## Component Location
**File:** `client/src/components/AdminWeeklyPointsClaim.tsx`
**Exported:** `AdminUserWeeklyPointsPayout` function

**Used In:** `client/src/pages/AdminDashboardOverview.tsx`

## Key Features
✅ Week-based earnings calculation (Sunday-Saturday)
✅ Multiple user selection with checkboxes
✅ Real-time total amount calculation
✅ Wallet address validation before sending
✅ Transaction recording in database
✅ Success/error notifications
✅ Scrollable user list with search/sort
✅ Loading states and disabled buttons during processing

## Database Integration
- Uses existing `pointsTransactions` table
- Transaction type: `admin_claim_weekly`
- Amount stored in wei format (with human-readable display)
- Week calculated as Sunday-Saturday

## Testing the Feature
1. Ensure users have earned points this week (from challenges)
2. Go to Admin Dashboard
3. Scroll to "Weekly Points Payout" section
4. Select test users
5. Enter wallet addresses (e.g., 0x123456...)
6. Click "Send Payouts"
7. Verify toast notification
8. Check database for new `admin_claim_weekly` transactions

## Notes
- Week always starts on Sunday
- Earnings include `earned_challenge` and `earned_event` types only
- Wallet addresses are stored for record-keeping
- Each payout is a separate transaction in database
- System prevents sending without wallet addresses

---
**Build Status:** ✅ Production build successful
**Last Updated:** January 27, 2026
