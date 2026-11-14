'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { loadNearWalletSession, type NearWalletSession } from '../lib/near';
import NearWalletModal from './NearWalletModal';

export default function NearWalletBadge() {
  const [modalOpen, setModalOpen] = useState(false);
  const [session, setSession] = useState<NearWalletSession>(loadNearWalletSession());

  useEffect(() => {
    setSession(loadNearWalletSession());
  }, [modalOpen]);

  return (
    <>
      {/* ── Navbar Pill ── */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all shadow-md group"
        style={{
          background: 'rgba(5, 24, 16, 0.85)',
          border: '1px solid rgba(0, 245, 155, 0.35)',
          color: '#00F59B',
          boxShadow: '0 0 15px rgba(0, 245, 155, 0.15)',
        }}
        title="NEAR Protocol Web3 Wallet & Agent Escrow"
      >
        <div className="w-4 h-4 rounded-full bg-[#00F59B]/20 flex items-center justify-center text-[10px] font-black text-[#00F59B] group-hover:scale-110 transition-transform">
          Ⓝ
        </div>
        <span className="font-mono text-[11px] text-[#ECFDF5]">
          {session.connected ? session.accountId.split('.')[0] : 'Connect Wallet'}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30">
          {session.connected ? `${session.balanceNear.toFixed(2)} NEAR` : 'Web3'}
        </span>
      </motion.button>

      {/* ── Web3 Modal ── */}
      <NearWalletModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSessionChange={(updated) => setSession(updated)}
      />
    </>
  );
}
