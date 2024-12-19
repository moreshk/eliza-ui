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
    const { tokenId } = await request.json();

    if (!tokenId) {
      return NextResponse.json(
        { message: 'Token ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE generated_tokens SET is_minted = TRUE WHERE id = $1',
        [tokenId]
      );
      return NextResponse.json({ message: 'Token minted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating mint status:', error);
    return NextResponse.json(
      { message: 'Error updating mint status' },
      { status: 500 }
    );
  }
} 