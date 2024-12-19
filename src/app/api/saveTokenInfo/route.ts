import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Azure PostgreSQL
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, tokenAddress, metadataUri } = body;

    if (!walletAddress || !tokenAddress || !metadataUri) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO generated_tokens (wallet_address, token_address, metadata_uri) VALUES ($1, $2, $3)',
        [walletAddress, tokenAddress, metadataUri]
      );
      return NextResponse.json({ message: 'Token information saved successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving token information:', error);
    return NextResponse.json(
      { message: 'Error saving token information' },
      { status: 500 }
    );
  }
} 