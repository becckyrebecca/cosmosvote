import React, { createContext, useContext, useState, useCallback } from 'react';
import { isConnected, requestAccess, getAddress } from '@stellar/freighter-api';
import { fetchTokenBalance } from './api';

type WalletName = 'Freighter' | 'xBull';

interface WalletContextType {
  walletAddress: string | null;
  walletName: WalletName | null;
  tokenBalance: bigint | null;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (wallet: WalletName) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<WalletName | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const connect = useCallback(async (wallet: WalletName) => {
    let address: string | null = null;

    if (wallet === 'Freighter') {
      const connected = await isConnected();
      if (!connected) throw new Error('Freighter extension not found');
      await requestAccess();
      const result = await getAddress();
      if (result.error) throw new Error(result.error.message);
      address = result.address;
    } else if (wallet === 'xBull') {
      // xBull injects window.xBullSDK
      const sdk = (window as unknown as { xBullSDK?: { connect: () => Promise<{ publicKey: string }> } }).xBullSDK;
      if (!sdk) throw new Error('xBull extension not found');
      const result = await sdk.connect();
      address = result.publicKey;
    }

    if (!address) return;
    setWalletAddress(address);
    setWalletName(wallet);
    setShowModal(false);
    fetchTokenBalance(address)
      .then(setTokenBalance)
      .catch(() => setTokenBalance(null));
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletName(null);
    setTokenBalance(null);
  }, []);

  return (
    <WalletContext.Provider value={{ walletAddress, walletName, tokenBalance, showModal, openModal, closeModal, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
