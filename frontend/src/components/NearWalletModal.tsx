'use client';

import { useState, useEffect, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy, ExternalLink, Wallet, ArrowDownRight, RefreshCw, LogOut, ShieldCheck, Key, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  NEAR_CONFIG,
  loadNearWalletSession,
  saveNearWalletSession,
  clearNearWalletSession,
  getLiveNearAccount,
  type NearWalletSession,
} from '../lib/near';

interface NearWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionChange?: (session: NearWalletSession) => void;
}

export const NearWalletModal: FC<NearWalletModalProps> = ({ isOpen, onClose, onSessionChange }) => {
  const [session, setSession] = useState<NearWalletSession>(loadNearWalletSession());
  const [accountIdInput, setAccountIdInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [nearApiKeyInput, setNearApiKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = loadNearWalletSession();
      setSession(s);
      if (s.connected && s.accountId) {
        setAccountIdInput(s.accountId);
        if (s.privateKey) setPrivateKeyInput(s.privateKey);
        if (s.nearApiKey) setNearApiKeyInput(s.nearApiKey);
        refreshBalance(s.accountId);
      }
    }
  }, [isOpen]);

  const refreshBalance = async (accId: string) => {
    if (!accId.trim()) return;
    setRefreshing(true);
    try {
      const liveAcc = await getLiveNearAccount(accId);
      const updated = {
        ...session,
        balanceNear: liveAcc.balanceNear,
      };
      setSession(updated);
      saveNearWalletSession(updated);
      if (onSessionChange) onSessionChange(updated);
      if (liveAcc.exists) {
        toast.success(`Queried live NEAR Testnet balance: ${liveAcc.balanceNear.toFixed(4)} NEAR`);
      } else {
        toast('Account not found on Testnet or 0 balance', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Failed to query RPC');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopy = () => {
    if (!session.accountId) return;
    navigator.clipboard.writeText(session.accountId);
    setCopied(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectWithCredentials = async () => {
    const acc = accountIdInput.trim();
    if (!acc) {
      toast.error('Please enter your NEAR Testnet Account ID (e.g. username.testnet)');
      return;
    }

    setRefreshing(true);
    try {
      const liveAcc = await getLiveNearAccount(acc);
      const newSession: NearWalletSession = {
        connected: true,
        accountId: acc,
        privateKey: privateKeyInput.trim() || undefined,
        nearApiKey: nearApiKeyInput.trim() || undefined,
        networkId: 'testnet',
        balanceNear: liveAcc.balanceNear,
        contractId: session.contractId || NEAR_CONFIG.defaultContractId,
        connectedAt: Date.now(),
      };

      setSession(newSession);
      saveNearWalletSession(newSession);
      if (onSessionChange) onSessionChange(newSession);

      toast.success(
        `Connected to ${acc}! Balance: ${liveAcc.balanceNear.toFixed(4)} NEAR`
      );
    } catch (err: any) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnectMyNearWallet = () => {
    // Official NEAR Web Wallet login flow
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://aetheris-omnisense.vercel.app';
    const loginUrl = `${NEAR_CONFIG.walletUrl}/login/?success_url=${encodeURIComponent(currentUrl)}&failure_url=${encodeURIComponent(currentUrl)}&contract_id=${NEAR_CONFIG.contractId}`;
    window.open(loginUrl, '_blank');
    toast('Redirecting to MyNearWallet Testnet authorization...', { icon: 'Ⓝ' });
  };

  const handleDisconnect = () => {
    clearNearWalletSession();
    const disconnected: NearWalletSession = {
      connected: false,
      accountId: '',
      networkId: 'testnet',
      balanceNear: 0,
      contractId: NEAR_CONFIG.defaultContractId,
      connectedAt: 0,
    };
    setSession(disconnected);
    setAccountIdInput('');
    setPrivateKeyInput('');
    setNearApiKeyInput('');
    if (onSessionChange) onSessionChange(disconnected);
    toast('Wallet disconnected');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 15, 0.98), rgba(3, 7, 18, 0.99))',
            border: '1px solid rgba(0, 245, 155, 0.28)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(0,245,155,0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,245,155,0.2), rgba(0,245,155,0.05))',
                  border: '1px solid rgba(0,245,155,0.3)',
                  color: '#00F59B',
                }}
              >
                Ⓝ
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Connect NEAR Web3 Wallet</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Testnet RPC
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Direct on-chain authentication &amp; contract execution</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="mt-6 space-y-5">
            {session.connected ? (
              /* Connected Details */
              <div className="space-y-4">
                <div
                  className="p-4 rounded-2xl space-y-3"
                  style={{
                    background: 'rgba(0, 245, 155, 0.05)',
                    border: '1px solid rgba(0, 245, 155, 0.22)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Connected Account ID</span>
                    <button
                      onClick={() => refreshBalance(session.accountId)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>Sync Balance</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-base font-bold text-white truncate">
                      {session.accountId}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                        title="Copy Address"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`${NEAR_CONFIG.explorerUrl}/accounts/${session.accountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                        title="View on NEAR Explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[11px] text-slate-400">Live Testnet Balance (from RPC)</span>
                    <div className="text-xl font-black text-white mt-0.5">
                      {session.balanceNear.toFixed(4)}{' '}
                      <span className="text-xs text-emerald-400 font-bold">NEAR</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Credential Connection Form */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>NEAR Testnet Account ID</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Required</span>
                  </label>
                  <input
                    type="text"
                    value={accountIdInput}
                    onChange={(e) => setAccountIdInput(e.target.value)}
                    placeholder="e.g. yourname.testnet or user.testnet"
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,245,155,0.25)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>NEAR Private Key (ed25519:...)</span>
                    <span className="text-[10px] text-slate-400">For signed contract calls</span>
                  </label>
                  <input
                    type="password"
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="ed25519:3qK... (from MyNearWallet / NEAR CLI)"
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <p className="text-[10px] text-slate-500">
                    Stored only in browser memory to sign on-chain transactions via near-api-js.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>NEAR AI Cloud API Key</span>
                    <span className="text-[10px] text-slate-400">Optional (cloud.near.ai)</span>
                  </label>
                  <input
                    type="password"
                    value={nearApiKeyInput}
                    onChange={(e) => setNearApiKeyInput(e.target.value)}
                    placeholder="near_ai_token_..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>

                <button
                  disabled={refreshing}
                  onClick={handleConnectWithCredentials}
                  className="w-full py-3 rounded-2xl text-xs font-bold text-[#030712] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer shadow-lg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #00F59B, #059669)' }}
                >
                  {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  <span>Connect Account &amp; Verify Balance</span>
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="flex-shrink mx-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Or Web Wallet Redirect
                  </span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                {/* MyNearWallet Web Auth */}
                <button
                  onClick={handleConnectMyNearWallet}
                  className="w-full p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 group transition-all hover:bg-white/5 cursor-pointer"
                  style={{
                    background: 'rgba(4, 11, 8, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white">
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Launch MyNearWallet Testnet
                      </div>
                      <div className="text-[10px] text-slate-400">Authorize via testnet.mynearwallet.com</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Open ↗</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NearWalletModal;
