/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import axios from 'axios';
import { useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from 'buffer';

interface MetadataFields {
    name: string;
    symbol: string;
    description: string;
}

const GenerateTokenInfo = () => {
    const { publicKey, signMessage } = useWallet();
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenDescription, setTokenDescription] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ address: string; uri: string } | null>(null);
    const [status, setStatus] = useState<{ type: string | null; message: string }>({ type: null, message: "" });

    const uploadToPinata = async (image: File, metadata: MetadataFields) => {
        try {
            const formData = new FormData();
            formData.append('file', image);
            const imageRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
                }
            });
            const imageUrl = `https://ipfs.io/ipfs/${imageRes.data.IpfsHash}`;

            const metadataJSON = {
                name: metadata.name,
                description: metadata.description,
                symbol: metadata.symbol,
                image: imageUrl,
            };
            const metadataRes = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadataJSON, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
                }
            });

            return `https://ipfs.io/ipfs/${metadataRes.data.IpfsHash}`;
        } catch (error) {
            console.error("Error uploading to Pinata:", error);
            throw error;
        }
    };

    const generateVanityAddress = (
        prefix: string,
        prefixMatchLength = 4,
        maxAttempts = 10000000,
        timeoutSeconds = 30
    ): Promise<Keypair> => {
        return new Promise((resolve, reject) => {
            console.log(`Starting vanity address generation for prefix: ${prefix}`);
            const startTime = Date.now();
            let attempts = 0;

            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout after ${timeoutSeconds} seconds`));
            }, timeoutSeconds * 1000);

            const generate = () => {
                const batchSize = 1000;
                
                for (let i = 0; i < batchSize && attempts < maxAttempts; i++) {
                    attempts++;
                    const mint = Keypair.generate();
                    const address = mint.publicKey.toBase58();
                    
                    if (attempts % 10000 === 0) {
                        const elapsedSeconds = (Date.now() - startTime) / 1000;
                        console.log(`Attempt ${attempts}: ${address}`);
                        console.log(`Time elapsed: ${elapsedSeconds.toFixed(2)} seconds`);
                        console.log(`Rate: ${(attempts / elapsedSeconds).toFixed(2)} attempts/second`);
                    }

                    if (address.toLowerCase().startsWith(prefix.toLowerCase().slice(0, prefixMatchLength))) {
                        clearTimeout(timeoutId);
                        const totalTime = (Date.now() - startTime) / 1000;
                        console.log(`✅ Found matching address after ${attempts} attempts and ${totalTime.toFixed(2)} seconds`);
                        console.log(`Found address: ${address}`);
                        resolve(mint);
                        return;
                    }
                }

                if (attempts >= maxAttempts) {
                    clearTimeout(timeoutId);
                    reject(new Error(`Could not generate matching address after ${maxAttempts} attempts`));
                } else {
                    setTimeout(generate, 0);
                }
            };

            generate();
        });
    };

    const hashPrivateKey = async (privateKey: Uint8Array): Promise<string> => {
        const secret = process.env.NEXT_PUBLIC_PRIVATE_KEY_SECRET;
        if (!secret) {
            throw new Error('Private key secret is not configured');
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(Buffer.from(privateKey).toString('base64'));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            const key = await window.crypto.subtle.importKey(
                'raw',
                encoder.encode(secret.padEnd(32, '0')), // Ensure key is 32 bytes
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );

            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            const encryptedArray = new Uint8Array(encrypted);
            const result = new Uint8Array(iv.length + encryptedArray.length);
            result.set(iv);
            result.set(encryptedArray, iv.length);

            return Buffer.from(result).toString('hex');
        } catch (error) {
            console.error('Error encrypting private key:', error);
            throw new Error('Failed to encrypt private key');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!publicKey || !signMessage) {
            setStatus({
                type: "error",
                message: "Please connect your wallet first",
            });
            return;
        }

        if (!imageFile) {
            setStatus({
                type: "error",
                message: "Please select an image for your token",
            });
            return;
        }

        setLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const message = new TextEncoder().encode("Sign this message to confirm token information generation");
            const signedMessage = await signMessage(message);

            if (!signedMessage) {
                throw new Error("Message signing cancelled");
            }

            console.log('Starting token information generation process...');
            
            console.log('Uploading metadata to Pinata...');
            const metadataUri = await uploadToPinata(imageFile, {
                name: tokenName,
                description: tokenDescription,
                symbol: tokenSymbol,
            });
            console.log('Metadata uploaded successfully:', metadataUri);

            console.log('Generating vanity address...');
            const mint = await generateVanityAddress('cbr', 3);
            console.log('Vanity address generated successfully:', mint.publicKey.toString());

            const hashedPrivateKey = await hashPrivateKey(mint.secretKey);

            setResult({
                address: mint.publicKey.toString(),
                uri: metadataUri
            });

            const response = await fetch('/api/saveTokenInfo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    tokenAddress: mint.publicKey.toString(),
                    metadataUri,
                    hashedPrivateKey,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save token information');
            }

            setStatus({
                type: "success",
                message: "Token information generated and saved successfully!",
            });
        } catch (error) {
            console.error('Error in token information generation:', error);
            setStatus({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to generate token information. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <form onSubmit={handleGenerate} className="w-full max-w-lg">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tokenName">
                        Token Name
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="tokenName"
                        type="text"
                        placeholder="Enter token name"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tokenSymbol">
                        Token Symbol
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="tokenSymbol"
                        type="text"
                        placeholder="Enter token symbol"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tokenDescription">
                        Token Description
                    </label>
                    <textarea
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="tokenDescription"
                        placeholder="Enter token description"
                        value={tokenDescription}
                        onChange={(e) => setTokenDescription(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tokenImage">
                        Token Image
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="tokenImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        required
                    />
                </div>

                {imageFile && (
                    <div className="mb-4">
                        <img
                            src={URL.createObjectURL(imageFile)}
                            alt="Token preview"
                            className="max-w-full h-auto rounded"
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {loading ? 'Generating...' : 'Generate Token Info'}
                </button>
            </form>

            {result && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                    <h3 className="font-bold mb-2">Generated Information:</h3>
                    <p className="mb-2"><strong>Address:</strong> {result.address}</p>
                    <p className="mb-2"><strong>Metadata URI:</strong> {result.uri}</p>
                </div>
            )}

            {status.type && (
                <div
                    className={`mt-4 p-2 rounded ${
                        status.type === "success"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                    }`}
                >
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default GenerateTokenInfo; 