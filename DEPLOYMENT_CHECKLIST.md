# Phase 4: Deployment Checklist

Complete checklist to move from development to production.

## Pre-Integration

- [ ] Review all 4 route files for your architecture
- [ ] Understand API endpoints (27 total)
- [ ] Review error handling patterns
- [ ] Check database table requirements

## Integration Steps

### Step 1: Register Routes in server/index.ts
```typescript
// Add import
import { registerBlockchainRoutes } from './routes';

// Call after app setup
registerBlockchainRoutes(app);
```

- [ ] Copy registerBlockchainRoutes code
- [ ] Add import statement
- [ ] Call function in correct order
- [ ] Restart server
- [ ] Verify routes are registered in logs

### Step 2: Database Migration
```bash
npm run db:migrate
```

- [ ] Run migration command
- [ ] Verify all tables created
- [ ] Check indexes created
- [ ] Verify views and procedures created
- [ ] Test database queries

### Step 3: Environment Variables
Create `.env` with:
```env
# Blockchain
BLOCKCHAIN_RPC_URL=https://sepolia.base.org
BLOCKCHAIN_CHAIN_ID=84532
CONTRACT_POINTS_ADDRESS=0x...
CONTRACT_FACTORY_ADDRESS=0x...
CONTRACT_ESCROW_ADDRESS=0x...

# Admin
ADMIN_PRIVATE_KEY=your_key
ADMIN_ADDRESS=0x...

# Database
DATABASE_URL=postgresql://...

# Auth
PRIVY_API_KEY=your_key
JWT_SECRET=your_secret
```

- [ ] Add all required variables
- [ ] Test database connection
- [ ] Verify RPC endpoint works
- [ ] Confirm admin wallet valid

## Testing

### API Testing
```bash
# Test public endpoint
curl http://localhost:3000/api/points/leaderboard

# Test user endpoint (requires token)
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/challenges

# Test admin endpoint (requires admin token)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:3000/api/admin/challenges/pending
```

- [ ] GET /api/points/leaderboard - returns 200
- [ ] POST /api/challenges/create-admin - returns 200 (with token)
- [ ] POST /api/payouts/batch-claim - returns 200 (with token)
- [ ] GET /api/admin/challenges/pending - returns 200 (admin)

### Endpoint Testing

**Challenge Endpoints:**
- [ ] POST /api/challenges/create-admin
- [ ] POST /api/challenges/create-p2p
- [ ] POST /api/challenges/:id/join
- [ ] POST /api/challenges/:id/accept
- [ ] GET /api/challenges/:id
- [ ] GET /api/challenges
- [ ] GET /api/challenges/user/:userId

**Payout Endpoints:**
- [ ] POST /api/payouts/:id/claim
- [ ] GET /api/payouts/:id/status
- [ ] GET /api/payouts/user/:userId
- [ ] POST /api/payouts/batch-claim

**Points Endpoints:**
- [ ] GET /api/points/balance/:userId
- [ ] POST /api/points/transfer
- [ ] GET /api/points/leaderboard
- [ ] GET /api/points/leaderboard/:userId
- [ ] GET /api/points/history/:userId
- [ ] GET /api/points/statistics
- [ ] POST /api/points/connect-wallet
- [ ] GET /api/points/wallets
- [ ] POST /api/points/set-primary-wallet/:id

**Admin Endpoints:**
- [ ] POST /api/admin/challenges/resolve
- [ ] POST /api/admin/challenges/batch-resolve
- [ ] GET /api/admin/challenges/pending
- [ ] GET /api/admin/challenges/by-status/:status
- [ ] GET /api/admin/blockchain/signing-stats
- [ ] POST /api/admin/challenges/verify-resolution
- [ ] GET /api/admin/challenges/:id/resolution-history

### Error Testing
- [ ] Missing auth returns 401
- [ ] Invalid params return 400
- [ ] Unauthorized users return 403
- [ ] Non-existent resources return 404
- [ ] Server errors logged properly

### Database Testing
- [ ] All 7 blockchain tables exist
- [ ] All indexes created
- [ ] All views working
- [ ] Procedures callable
- [ ] Queries perform well

## Frontend Integration

### Update Components
- [ ] Update Challenges.tsx to use new endpoints
- [ ] Update ChallengeChat.tsx to use new endpoints
- [ ] Create/update Leaderboard component
- [ ] Create admin resolution dashboard
- [ ] Create wallet connection UI

### Features to Implement
- [ ] Challenge creation form
- [ ] Challenge joining UI
- [ ] Payout claiming
- [ ] Leaderboard display
- [ ] Points transfer interface
- [ ] Wallet management
- [ ] Admin resolution interface

### Testing Frontend Integration
- [ ] Create challenge from frontend
- [ ] Join challenge from frontend
- [ ] View leaderboard
- [ ] Check user balance
- [ ] Claim payout (as admin)
- [ ] Transfer points

## Blockchain Deployment

### Contract Deployment
- [ ] Deploy BantahPoints.sol to Base Testnet
- [ ] Deploy ChallengeFactory.sol
- [ ] Deploy PointsEscrow.sol
- [ ] Save contract addresses
- [ ] Update .env with addresses
- [ ] Verify on Basescan

### Testing on Blockchain
- [ ] Create challenge on testnet
- [ ] Transfer tokens
- [ ] Verify transactions
- [ ] Check gas costs
- [ ] Test paymaster sponsorship

## Security Review

### Code Security
- [ ] All inputs validated
- [ ] No SQL injection vectors
- [ ] No XSS vulnerabilities
- [ ] Secrets not logged
- [ ] Error messages safe
- [ ] Rate limiting configured

### Blockchain Security
- [ ] Admin signatures verified
- [ ] Replay attacks prevented
- [ ] Escrow locks working
- [ ] Balance checks implemented
- [ ] Authorization enforced

### Authentication
- [ ] Privy integration working
- [ ] Tokens validated
- [ ] Admin tokens working
- [ ] Session management correct
- [ ] Token expiration handled

## Performance Optimization

### Database
- [ ] Indexes used properly
- [ ] Queries optimized
- [ ] No N+1 queries
- [ ] Pagination working
- [ ] Caching implemented

### API
- [ ] Response times acceptable
- [ ] Batch operations working
- [ ] Rate limiting active
- [ ] Load tested

### Blockchain
- [ ] Gas usage reasonable
- [ ] Transactions confirmed quickly
- [ ] Paymaster working

## Monitoring Setup

### Logging
- [ ] Error logging configured
- [ ] Transaction logging active
- [ ] Admin actions logged
- [ ] User activity tracked

### Alerts
- [ ] Failed transactions alert
- [ ] High error rate alert
- [ ] Admin activity alert
- [ ] Database alert

### Metrics
- [ ] API response times
- [ ] Error rates
- [ ] User activity
- [ ] Transaction success rates

## Documentation

### Code Documentation
- [ ] All functions commented
- [ ] Error cases documented
- [ ] Dependencies noted
- [ ] Configuration documented

### User Documentation
- [ ] API guide complete
- [ ] Examples provided
- [ ] Troubleshooting guide
- [ ] FAQs documented

### Deployment Documentation
- [ ] Setup instructions clear
- [ ] Environment variables listed
- [ ] Database migration documented
- [ ] Rollback procedure documented

## Deployment

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Integration testing
- [ ] Performance testing
- [ ] Security testing
- [ ] Get approval

### Production Deployment
- [ ] Create backup
- [ ] Deploy to production
- [ ] Verify all endpoints
- [ ] Monitor for errors
- [ ] Check database health
- [ ] Monitor blockchain

### Post-Deployment
- [ ] Verify all endpoints working
- [ ] Monitor error rates
- [ ] Check performance
- [ ] Gather user feedback
- [ ] Document issues

## Rollback Plan

If issues occur:
1. [ ] Stop accepting new requests
2. [ ] Roll back code to previous version
3. [ ] Restore database if needed
4. [ ] Notify users of issue
5. [ ] Investigate root cause
6. [ ] Deploy fix

---

## Success Criteria

✅ All 27 endpoints responding correctly
✅ Database migrations applied successfully
✅ Authentication working properly
✅ Admin signing working on-chain
✅ All tests passing
✅ No errors in logs
✅ Performance acceptable
✅ Users can create/join challenges
✅ Payouts claiming working
✅ Leaderboard displaying correctly

---

## Sign-Off

- [ ] Development team: ready for production
- [ ] QA team: all tests passed
- [ ] DevOps: deployment infrastructure ready
- [ ] Security: security review complete
- [ ] Product: feature complete
- [ ] Manager: approved for production

---

## Timeline Estimate

- Integration: 1-2 hours
- Testing: 4-6 hours
- Frontend updates: 8-12 hours
- Security review: 2-4 hours
- Deployment: 2-3 hours
- Monitoring: ongoing

**Total: 17-27 hours**

---

## Emergency Contacts

- Backend Lead: [name]
- DevOps Lead: [name]
- Security Lead: [name]
- Product Manager: [name]

---

Generated: January 17, 2026
