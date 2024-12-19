'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import GenerateTokenInfo from "@/components/GenerateTokenInfo";
import { ConnectWalletButton } from "@/components/connectWalletButton";

export default function GenerateTokenPage() {
    const { connected } = useWallet();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
            <h1 className="font-bold text-3xl sm:text-7xl text-center text-balance mb-10">
                Generate Token Information
            </h1>
            {connected ? (
                <GenerateTokenInfo />
            ) : (
                <div className="text-center">
                    <p className="mb-4">Please connect your wallet to generate token information.</p>
                    <ConnectWalletButton />
                </div>
            )}
        </main>
    );
}
