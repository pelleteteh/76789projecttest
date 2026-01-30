-- Add P2P blockchain fields to challenges table
ALTER TABLE challenges
ADD COLUMN payment_token_address VARCHAR,
ADD COLUMN stake_amount_wei BIGINT,
ADD COLUMN on_chain_status VARCHAR DEFAULT 'pending',
ADD COLUMN creator_transaction_hash VARCHAR,
ADD COLUMN acceptor_transaction_hash VARCHAR,
ADD COLUMN blockchain_challenge_id VARCHAR,
ADD COLUMN blockchain_created_at TIMESTAMP,
ADD COLUMN blockchain_accepted_at TIMESTAMP;

-- Create indexes for blockchain fields for faster queries
CREATE INDEX idx_challenges_on_chain_status ON challenges(on_chain_status);
CREATE INDEX idx_challenges_blockchain_id ON challenges(blockchain_challenge_id);
CREATE INDEX idx_challenges_payment_token ON challenges(payment_token_address);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'challenges' AND column_name IN (
  'payment_token_address',
  'stake_amount_wei',
  'on_chain_status',
  'creator_transaction_hash',
  'acceptor_transaction_hash',
  'blockchain_challenge_id',
  'blockchain_created_at',
  'blockchain_accepted_at'
)
ORDER BY ordinal_position;
