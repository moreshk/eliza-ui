CREATE TABLE generated_tokens (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_address TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
