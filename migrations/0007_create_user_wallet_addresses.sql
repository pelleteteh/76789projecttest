-- Create user_wallet_addresses table for storing blockchain wallet addresses
CREATE TABLE user_wallet_addresses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 84532,
  wallet_address VARCHAR NOT NULL,
  wallet_type VARCHAR NOT NULL,
  
  -- Wallet verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_tx_hash VARCHAR,
  
  -- Balances (cached)
  usdc_balance BIGINT DEFAULT 0,
  usdt_balance BIGINT DEFAULT 0,
  points_balance BIGINT DEFAULT 0,
  native_balance BIGINT DEFAULT 0,
  
  -- Primary wallet flag
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  last_balance_sync_at TIMESTAMP,
  connected_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_wallet UNIQUE (user_id, chain_id, wallet_address)
);

-- Create indexes for faster queries
CREATE INDEX idx_wallet_address ON user_wallet_addresses(wallet_address);
CREATE INDEX idx_wallet_user_chain ON user_wallet_addresses(user_id, chain_id);
CREATE INDEX idx_wallet_is_primary ON user_wallet_addresses(user_id, is_primary);

-- Verify table was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_wallet_addresses' 
ORDER BY ordinal_position;
