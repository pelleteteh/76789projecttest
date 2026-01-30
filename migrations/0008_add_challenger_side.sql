-- Add challengerSide field for P2P challenges
ALTER TABLE challenges ADD COLUMN challenger_side VARCHAR(3) DEFAULT NULL;