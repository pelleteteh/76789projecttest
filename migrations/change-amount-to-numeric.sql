-- Change amount column from integer to numeric for better precision
ALTER TABLE challenges ALTER COLUMN amount TYPE numeric(38, 18);
ALTER TABLE admin_challenges ALTER COLUMN amount TYPE numeric(38, 18);
ALTER TABLE admin_challenge_participants ALTER COLUMN amount TYPE numeric(38, 18);
ALTER TABLE payouts ALTER COLUMN amount TYPE numeric(38, 18);
ALTER TABLE payout_records ALTER COLUMN amount TYPE numeric(38, 18);
