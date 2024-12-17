"use client";

import { useMemo } from "react";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createContext, useContext } from "react";

export const MetaplexProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const metaplex = useMemo(
    () => Metaplex.make(connection).use(walletAdapterIdentity(wallet)),
    [connection, wallet]
  );

  return (
    <MetaplexContext.Provider value={{ metaplex }}>
      {children}
    </MetaplexContext.Provider>
  );
};

const DEFAULT_CONTEXT = {
  metaplex: null,
} as { metaplex: Metaplex | null };

export const MetaplexContext = createContext(DEFAULT_CONTEXT);

export function useMetaplex() {
  return useContext(MetaplexContext);
}
