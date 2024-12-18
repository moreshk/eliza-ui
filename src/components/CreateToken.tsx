/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Keypair,
    sendAndConfirmTransaction,
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
import type { TokenMetadata } from "@solana/spl-token-metadata";
import {
    createInitializeInstruction,
    pack,
    createUpdateFieldInstruction,
} from "@solana/spl-token-metadata";
import axios from 'axios';
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { Buffer } from 'buffer';

const CreateToken = () => {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenDescription, setTokenDescription] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: string | null; message: string }>({ type: null, message: "" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadToPinata = async (image: File, metadata: any) => {
        try {
            // Upload image to IPFS
            const formData = new FormData();
            formData.append('file', image);
            const imageRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
                }
            });
            const imageUrl = `https://ipfs.io/ipfs/${imageRes.data.IpfsHash}`;

            // Create and upload metadata JSON
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

    const handleCreateToken = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!publicKey || !signTransaction) {
            setStatus({
                type: "error",
                message: "Please connect your wallet",
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
            console.log('Starting token creation process...');
            
            console.log('Uploading metadata to Pinata...');
            const metadataUri = await uploadToPinata(imageFile, {
                name: tokenName,
                description: tokenDescription,
                symbol: tokenSymbol,
            });
            console.log('Metadata uploaded successfully:', metadataUri);

            console.log('Generating vanity address...');
            const mint = await generateVanityAddress('cybr', 3);
            const decimals = 9;

            console.log('Proceeding with token creation...');
            const metadata: TokenMetadata = {
                mint: mint.publicKey,
                name: tokenName,
                symbol: tokenSymbol,
                uri: metadataUri,
                additionalMetadata: [["description", tokenDescription]],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
            const mintTransaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: mintLen,
                    lamports: mintLamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(
                    mint.publicKey,
                    publicKey,
                    mint.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                ),
                createInitializeMintInstruction(mint.publicKey, decimals, publicKey, null, TOKEN_2022_PROGRAM_ID),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mint.publicKey,
                    metadata: mint.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: publicKey,
                    updateAuthority: publicKey,
                }),
                createUpdateFieldInstruction({
                    metadata: mint.publicKey,
                    updateAuthority: publicKey,
                    programId: TOKEN_2022_PROGRAM_ID,
                    field: metadata.additionalMetadata[0][0],
                    value: metadata.additionalMetadata[0][1],
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            mintTransaction.recentBlockhash = blockhash;
            mintTransaction.feePayer = publicKey;

            mintTransaction.partialSign(mint);

            const signedTransaction = await signTransaction(mintTransaction);

            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature);

            setStatus({
                type: "success",
                message: `Token created successfully! Mint address: ${mint.publicKey.toString()}`,
            });
        } catch (error) {
            console.error('Error in token creation:', error);
            setStatus({
                type: "error",
                message: "Failed to create token. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <form onSubmit={handleCreateToken} className="w-full max-w-lg">
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
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
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
                    {loading ? 'Creating Token...' : 'Create Token'}
                </button>
            </form>
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

export default CreateToken; 