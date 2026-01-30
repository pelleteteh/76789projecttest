-- Add challengeId column to notifications table for P2P challenge tracking
ALTER TABLE notifications
ADD COLUMN challenge_id INTEGER;

-- Create index for quick lookups
CREATE INDEX idx_notifications_challenge_id ON notifications(challenge_id);

-- Verify column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name = 'challenge_id';
