'use client';

import { ConnectWallet } from "@/components/connectWallet";
import CreateToken from "@/components/CreateToken";
import { useWallet } from "@solana/wallet-adapter-react";

export default function CreateTokenPage() {
    const { connected } = useWallet();

    if (!connected) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
                <ConnectWallet />
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
            <h1 className="font-bold text-3xl sm:text-7xl text-center text-balance mb-10">
                Create Your Token
            </h1>
            <CreateToken />
        </main>
    );
}