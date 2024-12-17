"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export const ConnectWalletButton = () => {
  const { connected } = useWallet();
  const pathname = usePathname();
  const route = useRouter();

  useEffect(() => {
    if (connected && pathname === "/") route.push("/select-nft");
  }, [connected, pathname, route]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.3 }}
      className="flex gap-2"
    >
      
      <WalletMultiButton />
      {connected && (
        <Link
          href="https://jup.ag/swap/SOL-8vWj3EB7hbqXiRutkK8hweEGFL49BWkVMdRyQxtCkrje"
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-adapter-button wallet-adapter-button-trigger"
        >
          Buy Chronicle
        </Link>
      )}
    </motion.div>
  );
};
