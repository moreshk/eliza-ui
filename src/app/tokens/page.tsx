'use client';

import { useEffect, useState } from 'react';
import TokensTable from '@/components/TokensTable';

interface Token {
  id: number;
  wallet_address: string;
  token_address: string;
  metadata_uri: string;
  created_at: string;
  is_minted: boolean;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/getTokens');
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      const data = await response.json();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleMint = async (tokenId: number) => {
    try {
      const response = await fetch('/api/updateMintStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update mint status');
      }

      // Refresh the tokens list
      await fetchTokens();
    } catch (err) {
      console.error('Error minting token:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint token');
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
        <div className="animate-pulse">Loading tokens...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
        <div className="text-red-500">Error: {error}</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
      <h1 className="font-bold text-3xl sm:text-7xl text-center text-balance mb-10">
        Generated Tokens
      </h1>
      <TokensTable tokens={tokens} onMint={handleMint} />
    </main>
  );
} 