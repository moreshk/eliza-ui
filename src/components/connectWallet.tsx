"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ConnectWalletButton } from "./connectWalletButton";

export const ConnectWallet = () => {
  const { connected } = useWallet();
  const pathname = usePathname();
  const route = useRouter();

  useEffect(() => {
    if (connected && pathname === "/") route.push("/select-nft");
  }, [connected, pathname, route]);

  return (
    <>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="font-bold text-3xl sm:text-7xl text-center text-balance"
      >
        Connect your wallet to see your Chronicle NFTs
      </motion.h1>
      <div className="pt-10">
        <ConnectWalletButton />
      </div>
    </>
  );
};
