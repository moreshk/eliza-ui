import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
    PublicKey,
    Transaction,
    SystemProgram,
    Keypair,
} from "@solana/web3.js";
import {
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    ExtensionType,
    getMintLen,
    LENGTH_SIZE,
    TOKEN_2022_PROGRAM_ID,
    TYPE_SIZE,
} from "@solana/spl-token";
import {
    createInitializeInstruction,
    pack,
    createUpdateFieldInstruction,
} from "@solana/spl-token-metadata";
import type { TokenMetadata } from "@solana/spl-token-metadata";
import axios from 'axios';
import { Buffer } from 'buffer';

interface Token {
    id: number;
    wallet_address: string;
    token_address: string;
    metadata_uri: string;
    created_at: string;
    is_minted: boolean;
    hashed_private_key: string;
}

interface TokensTableProps {
    tokens: Token[];
    onMint: (tokenId: number) => Promise<void>;
}

const TokensTable = ({ tokens, onMint }: TokensTableProps) => {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [mintingStatus, setMintingStatus] = useState<{ [key: number]: boolean }>({});
    const [error, setError] = useState<string | null>(null);

    const reconstructPrivateKey = async (hashedPrivateKey: string): Promise<Uint8Array> => {
        const secret = process.env.NEXT_PUBLIC_PRIVATE_KEY_SECRET;
        if (!secret) {
            throw new Error('Private key secret is not configured');
        }

        try {
            const encoder = new TextEncoder();
            const data = Buffer.from(hashedPrivateKey, 'hex');
            const iv = data.slice(0, 12);
            const encrypted = data.slice(12);

            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                encoder.encode(secret),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                cryptoKey,
                encrypted
            );

            return new Uint8Array(Buffer.from(new TextDecoder().decode(decrypted), 'base64'));
        } catch (error) {
            console.error('Error reconstructing private key:', error);
            throw new Error('Failed to reconstruct private key');
        }
    };

    const handleMint = async (token: Token) => {
        if (!publicKey || !signTransaction) {
            setError("Please connect your wallet");
            return;
        }

        setMintingStatus(prev => ({ ...prev, [token.id]: true }));
        setError(null);

        try {
            // Replace ipfs.io with a different gateway
            const uri = token.metadata_uri.replace('ipfs.io', 'gateway.pinata.cloud');
            const metadataResponse = await axios.get(uri, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            const metadata = metadataResponse.data;

            // Add fallback in case of timeout
            if (!metadata) {
                throw new Error('Failed to fetch metadata');
            }

            // Reconstruct the keypair using the hashed private key
            const privateKey = await reconstructPrivateKey(token.hashed_private_key);
            const mintKeypair = Keypair.fromSecretKey(privateKey);

            // Verify the public key matches
            if (mintKeypair.publicKey.toString() !== token.token_address) {
                throw new Error('Reconstructed keypair does not match stored token address');
            }

            const tokenMetadata: TokenMetadata = {
                mint: new PublicKey(token.token_address),
                name: metadata.name,
                symbol: metadata.symbol,
                uri: token.metadata_uri,
                additionalMetadata: [["description", metadata.description]],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;

            const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
            const mintTransaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports: mintLamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(
                    mintKeypair.publicKey,
                    publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                ),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    9, // decimals
                    publicKey,
                    null,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: tokenMetadata.name,
                    symbol: tokenMetadata.symbol,
                    uri: tokenMetadata.uri,
                    mintAuthority: publicKey,
                    updateAuthority: publicKey,
                }),
                createUpdateFieldInstruction({
                    metadata: mintKeypair.publicKey,
                    updateAuthority: publicKey,
                    programId: TOKEN_2022_PROGRAM_ID,
                    field: tokenMetadata.additionalMetadata[0][0],
                    value: tokenMetadata.additionalMetadata[0][1],
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            mintTransaction.recentBlockhash = blockhash;
            mintTransaction.feePayer = publicKey;

            mintTransaction.partialSign(mintKeypair);

            const signedTransaction = await signTransaction(mintTransaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature);

            // Update the database
            await onMint(token.id);

            console.log(`Token minted successfully! Signature: ${signature}`);
        } catch (err) {
            console.error('Error minting token:', err);
            setError(err instanceof Error ? err.message : 'Failed to mint token');
        } finally {
            setMintingStatus(prev => ({ ...prev, [token.id]: false }));
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="w-full overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Wallet Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Token Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Metadata URI
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tokens.map((token) => (
                        <tr key={token.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                    {truncateAddress(token.wallet_address)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                    {truncateAddress(token.token_address)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <a
                                    href={token.metadata_uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-900"
                                >
                                    View Metadata
                                </a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                    {formatDate(token.created_at)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        token.is_minted
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                >
                                    {token.is_minted ? 'Minted' : 'Not Minted'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {!token.is_minted && (
                                    <button
                                        onClick={() => handleMint(token)}
                                        disabled={mintingStatus[token.id]}
                                        className={`${
                                            mintingStatus[token.id]
                                                ? 'bg-gray-400'
                                                : 'bg-blue-500 hover:bg-blue-700'
                                        } text-white font-bold py-2 px-4 rounded text-sm`}
                                    >
                                        {mintingStatus[token.id] ? 'Minting...' : 'Mint'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {tokens.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                    No tokens generated yet.
                </div>
            )}
            {error && (
                <div className="text-red-500 text-center mt-4">
                    {error}
                </div>
            )}
        </div>
    );
};

export default TokensTable; 