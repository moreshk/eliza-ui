import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: Request) {
  try {
    const { walletAddress, tokenAddress, metadataUri, hashedPrivateKey } = await request.json();

    if (!walletAddress || !tokenAddress || !metadataUri || !hashedPrivateKey) {
      console.error('Missing required fields:', { walletAddress, tokenAddress, metadataUri, hashedPrivateKey });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO generated_tokens (wallet_address, token_address, metadata_uri, hashed_private_key) VALUES ($1, $2, $3, $4) RETURNING id',
        [walletAddress, tokenAddress, metadataUri, hashedPrivateKey]
      );

      console.log('Token information saved successfully:', result.rows[0]);
      return NextResponse.json({ success: true, id: result.rows[0].id });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Error saving to database' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 