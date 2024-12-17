"use client";

import { useState } from "react";
import { createContext, useContext } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export const NetworkProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(
    WalletAdapterNetwork.Mainnet
  );
  const onChange = (value: string) => {
    switch (value) {
      case "devnet":
        setNetwork(WalletAdapterNetwork.Devnet);
        break;
      case "mainnet":
        setNetwork(WalletAdapterNetwork.Mainnet);
        break;
      case "testnet":
        setNetwork(WalletAdapterNetwork.Testnet);
        break;
      default:
        setNetwork(WalletAdapterNetwork.Devnet);
        break;
    }
  };
  return (
    <NetworkContext.Provider value={{ network, onChange }}>
      {children}
    </NetworkContext.Provider>
  );
};

const DEFAULT_CONTEXT: {
  network: WalletAdapterNetwork;
  onChange: (value: "devnet" | "mainnet" | "testnet") => void;
} = {
  network: WalletAdapterNetwork.Mainnet,
  onChange: () => {},
};

export const NetworkContext = createContext(DEFAULT_CONTEXT);

export function useNetwork() {
  return useContext(NetworkContext);
}
