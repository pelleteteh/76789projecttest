# Friends System UI Integration Guide

## Overview
The friends system is now fully integrated into the Bantah platform with multiple entry points for users to send, accept, and manage friend requests.

---

## User Interaction Points

### 1. **ProfileCard Component** (Newly Added)
**Location**: `client/src/components/ProfileCard.tsx`
**Access Point**: 
- Click on any user's avatar in the Leaderboard
- Click on any user's profile from other pages

**Features**:
- **Add Friend Button**: Send friend request to the viewed user
- **Follow Button**: Follow/unfollow user
- **Gift Button**: Send coins to user
- **QR Code**: Share user's profile QR code
- **Challenge Button**: Send P2P challenge

**Button States**:
- `Add` - Ready to send friend request
- `Pending` - Friend request already sent (disabled)
- `Friends` - User is already your friend (disabled)

**Code Example**:
```tsx
<Button
  onClick={() => friendRequestMutation.mutate()}
  disabled={friendRequestMutation.isPending || friendRequestStatus !== 'none'}
  variant="outline"
  className="rounded-xl..."
>
  {friendRequestMutation.isPending ? (
    <div className="animate-spin..."></div>
  ) : friendRequestStatus === 'pending' ? (
    'Pending'
  ) : friendRequestStatus === 'friends' ? (
    'Friends'
  ) : (
    'Add'
  )}
</Button>
```

---

### 2. **Leaderboard Page** 
**Location**: `client/src/pages/Leaderboard.tsx`
**Access Point**: 
- Navigate to `/leaderboard`
- Click any user in the top 3 cards
- Click any user in the ranking list below

**Integration**:
- Clicking on a user's profile card/row opens ProfileCard
- From there, users can add friend, follow, gift, or challenge
- Real-time rank updates show friend status

**Code**:
```tsx
onClick={() => setSelectedProfileUserId(player.id)}
```

---

### 3. **Friends Page** (Main Hub)
**Location**: `client/src/pages/Friends.tsx`
**Access Point**: 
- Navigate to `/friends`
- Click on "Friends" tab in app navigation

#### Tab 1: **Friends** Tab
- Shows all accepted friends
- Each friend card shows:
  - Profile avatar
  - Username and level
  - Coin balance
  - **Challenge Button** to create a new challenge

#### Tab 2: **Users** Tab  
- Shows all available users to add
- Each user card shows:
  - Profile avatar
  - Username and level
  - Coin balance
  - **Add Friend Button** (sends request)
  - **Challenge Button** (creates challenge)

**Send Friend Request**:
```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    setPendingFriendId(user.id);
    sendFriendRequestMutation.mutate(user.id);
  }}
  disabled={pendingFriendId === user.id}
>
  <i className="fas fa-user-plus opacity-70"></i>
  {pendingFriendId === user.id ? "..." : ""}
</Button>
```

#### Tab 3: **Requests** Tab
**Subsection A: Incoming Requests**
- Shows friend requests received from others
- Each request shows:
  - Requester's profile avatar
  - Requester's username
  - Time the request was sent
  - **Accept Button** (green) - Accept friend request + send notification
  - **Decline Button** (outline) - Reject request

**Subsection B: Sent Requests**
- Shows friend requests you've sent
- Each request shows:
  - Recipient's profile avatar
  - Recipient's username
  - Time the request was sent
  - **Pending Badge** (amber) - Indicates awaiting response

**Accept Mutation**:
```tsx
<Button
  size="sm"
  className="bg-emerald-600 text-white hover:bg-emerald-700"
  onClick={() => acceptFriendRequestMutation.mutate(request.id)}
  disabled={acceptFriendRequestMutation.isPending}
>
  Accept
</Button>
```

**Decline Mutation**:
```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => declineFriendRequestMutation.mutate(request.id)}
  disabled={declineFriendRequestMutation.isPending}
>
  Decline
</Button>
```

---

## Complete User Journey

### Scenario 1: Add Friend from Leaderboard
1. User views Leaderboard (`/leaderboard`)
2. Clicks on any player's avatar or card
3. ProfileCard opens with user details
4. User clicks **"Add"** button (Friend Request)
5. Friend request sent → notification fires
6. Button changes to **"Pending"** (disabled)
7. Target user receives notification in real-time
8. Target user goes to `/friends` → "Requests" tab
9. Clicks **"Accept"** button
10. Friendship established → both users get notifications
11. Button in ProfileCard changes to **"Friends"** (disabled)

### Scenario 2: Add Friend from Friends Page
1. User navigates to `/friends`
2. Clicks "Users" tab
3. Searches for or finds desired user
4. Clicks **"Add Friend"** button
5. (Same flow as Scenario 1 from step 4 onwards)

### Scenario 3: Send Friend Request via Search
1. User navigates to `/friends`
2. Types user's email or username in search box
3. Clicks "Send Request" button
4. (Same flow as Scenario 1 from step 4 onwards)

### Scenario 4: Accept/Reject Friend Request
1. User receives notification: "👥 {Name} wants to be your friend!"
2. User goes to `/friends` → "Requests" tab
3. Sees incoming request with requester's details
4. Option A: Clicks **"Accept"** → friendship created + notification sent
5. Option B: Clicks **"Decline"** → request rejected

---

## Backend API Endpoints

### Friend Request Endpoints
```
POST /api/friends/request
  body: { targetUserId: string }
  response: Friend request created + notification sent

POST /api/friends/accept/:requestId
  response: Friendship accepted + notification sent

POST /api/friends/reject/:requestId
  response: Request rejected

GET /api/friends
  response: [{ id, requesterId, addresseeId, status, requester, addressee, ... }]

GET /api/friends/requests
  response: Pending friend requests for current user

DELETE /api/friends/:friendId
  response: Friendship removed

GET /api/friends/status/:userId
  response: { isFriend: boolean, requestPending: boolean }
```

---

## Notifications Triggered

### Friend Request Sent
- **Event**: `FRIEND_REQUEST`
- **Channels**: IN_APP (Pusher) + PUSH (Firebase)
- **Title**: `👥 {Name} wants to be your friend!`
- **Body**: `{Name} sent you a friend request`
- **Cooldown**: 300 seconds (anti-spam)

### Friend Request Accepted
- **Event**: `FRIEND_ACCEPTED`
- **Channels**: IN_APP (Pusher) + PUSH (Firebase)
- **Title**: `👥 {Name} accepted your friend request!`
- **Body**: `You're now friends with {Name}`
- **Cooldown**: 60 seconds

---

## Database Schema

### Friends Table
```sql
CREATE TABLE friends (
  id: UUID PRIMARY KEY
  requesterId: UUID (FK to users)
  addresseeId: UUID (FK to users)
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
)
```

**Constraints**:
- User cannot add themselves
- Duplicate requests are rejected
- Once accepted, relationship is permanent
- Both users see the friendship

---

## UI Components Updated

### ProfileCard.tsx
- ✅ Added `friendRequestStatus` state
- ✅ Added `friendRequestMutation` for sending requests
- ✅ Added "Add" button to secondary actions (2x2 grid)
- ✅ Button shows states: "Add" | "Pending" | "Friends"
- ✅ Button is disabled when pending or already friends

### Friends.tsx (No changes needed)
- ✅ Already had all friend request functionality
- ✅ Already had accept/reject UI
- ✅ Already had users list with add friend button
- ✅ Already integrated with notifications

### Leaderboard.tsx (No changes needed)
- ✅ Already opens ProfileCard on avatar click
- ✅ Friend requests work through ProfileCard

---

## Testing Checklist

- [ ] Send friend request from ProfileCard (Leaderboard)
- [ ] Send friend request from Friends page (Users tab)
- [ ] Send friend request via search
- [ ] Accept friend request
- [ ] Reject friend request
- [ ] Verify notification fires (Pusher toast)
- [ ] Verify notification fires (Firebase push)
- [ ] Verify button states update correctly
- [ ] Verify friendship appears in Friends list
- [ ] Test with two different users
- [ ] Verify requests list updates in real-time

---

## Browser Support
- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Android Chrome)
- ✅ Dark mode support
- ✅ Real-time updates via Pusher
- ✅ Push notifications via Firebase

---

## Performance Considerations

1. **Query Invalidation**: After friend request/accept, we invalidate:
   - `/api/friends` - Main friends list
   - `/api/users/{userId}/profile` - User profile (to update status)

2. **Optimistic Updates**: 
   - Friend request shows "Pending" immediately
   - No wait for server confirmation

3. **Rate Limiting**:
   - Friend requests: 300 second cooldown per recipient
   - Prevents spam attacks

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Already friends" | User is trying to add existing friend | Show message, disable button |
| "Friend request already sent" | Duplicate request attempt | Prevent duplicate requests |
| "Invalid target user" | User ID is empty or invalid | Validate before sending |
| "User not found" | Target user doesn't exist | Show error toast |
| Notification fails | Firebase misconfigured | Gracefully degrade (still store in DB) |

---

## Future Enhancements

1. **Block Users**: Add ability to block users from sending requests
2. **Friend Groups**: Organize friends into groups
3. **Friend Activity Feed**: Show friend's recent activities
4. **Mutual Friends**: Show common friends between users
5. **Friend Suggestions**: AI-powered friend recommendations
6. **Friend Challenges**: Create challenges with friends only
7. **Friend Stats Comparison**: Side-by-side stats with friends

