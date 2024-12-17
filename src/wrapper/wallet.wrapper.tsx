"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { MetaplexProvider } from "@/context/metaplex.context";
import { useNetwork } from "@/context/network.context";

export default function WalletWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { network } = useNetwork();
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  );
  
  return (
    <ConnectionProvider endpoint="https://rpc.helius.xyz/?api-key=1bd7151b-2c57-45f5-8172-b32538120d8e">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <MetaplexProvider>{children}</MetaplexProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
    // <ConnectionProvider endpoint="https://omniscient-spring-surf.solana-devnet.quiknode.pro/aa4fd5250ec7587a58184760c81b7c86b2f6190b/">
    //   <WalletProvider wallets={wallets} autoConnect>
    //     <WalletModalProvider>
    //       <MetaplexProvider>{children}</MetaplexProvider>
    //     </WalletModalProvider>
    //   </WalletProvider>
    // </ConnectionProvider>
  );
}
