'use client';

import GenerateTokenInfo from "@/components/GenerateTokenInfo";

export default function GenerateTokenPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center sm:p-24 px-4">
            <h1 className="font-bold text-3xl sm:text-7xl text-center text-balance mb-10">
                Generate Token Information
            </h1>
            <GenerateTokenInfo />
        </main>
    );
}
