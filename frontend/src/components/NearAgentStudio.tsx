'use client';

import { useEffect, useState, useCallback, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ShieldCheck, Terminal, Network, Sparkles, RefreshCw,
  Send, CheckCircle2, AlertTriangle, Copy, Layers, Sliders,
  ChevronDown, ChevronUp, ArrowRight, ExternalLink, Cpu, Globe,
  Zap, Lock, Check, Key, Database, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  NEAR_CONFIG,
  loadNearWalletSession,
  saveNearWalletSession,
  getLiveNearAccount,
  getLiveNearNetworkStatus,
  queryLiveNearContractView,
  executeLiveNearContractCall,
  runNearAIChat,
  NEAR_AI_CONFIG,
  type NearWalletSession,
  type LiveContractTxResult,
} from '../lib/near';
import NearWalletModal from './NearWalletModal';
import Web3Hologram3D from './Web3Hologram3D';

type ActiveTab = 'contract' | 'inference' | 'network' | 'vault' | 'explorer';

interface ContractMethodDefinition {
  name: string;
  type: 'view' | 'call';
  description: string;
  defaultArgs: Record<string, unknown>;
  defaultDeposit: string;
}

const PRESET_METHODS: ContractMethodDefinition[] = [
  {
    name: 'get_messages',
    type: 'view',
    description: 'Query live on-chain guestbook / agent messages from guest-book.testnet',
    defaultArgs: {},
    defaultDeposit: '0',
  },
  {
    name: 'add_message',
    type: 'call',
    description: 'Broadcast signed on-chain message to NEAR Testnet',
    defaultArgs: { text: 'Aetheris OmniSense Autonomous Agent verification on NEAR Protocol' },
    defaultDeposit: '0',
  },
  {
    name: 'get_escrow_balance',
    type: 'view',
    description: 'Query compute escrow balance of user account',
    defaultArgs: { account_id: 'agent.testnet' },
    defaultDeposit: '0',
  },
  {
    name: 'deposit_compute_escrow',
    type: 'call',
    description: 'Attach NEAR deposit to fund agent compute escrow vault',
    defaultArgs: {},
    defaultDeposit: '0.5',
  },
  {
    name: 'register_agent',
    type: 'call',
    description: 'Register autonomous agent identity & model tier on-chain',
    defaultArgs: { agent_name: 'Aetheris Agent', role: 'Multimodal Hub', model_tier: 'NEAR AI Cloud' },
    defaultDeposit: '0',
  },
  {
    name: 'get_stats',
    type: 'view',
    description: 'Query contract metrics & total on-chain intents',
    defaultArgs: {},
    defaultDeposit: '0',
  },
];

export const NearAgentStudio: FC = () => {
  const [session, setSession] = useState<NearWalletSession>(loadNearWalletSession());
  const [activeTab, setActiveTab] = useState<ActiveTab>('contract');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Real Network RPC Status
  const [networkStatus, setNetworkStatus] = useState<{
    chain_id: string;
    latest_block_height: number;
    latest_block_hash: string;
    latest_block_time: string;
    sync_status: boolean;
    rpc_url: string;
  } | null>(null);

  // Contract tab state
  const [targetContractId, setTargetContractId] = useState(NEAR_CONFIG.defaultContractId);
  const [selectedMethodName, setSelectedMethodName] = useState('get_messages');
  const [methodArgsJson, setMethodArgsJson] = useState('{}');
  const [attachedDepositNear, setAttachedDepositNear] = useState('0');

  // Terminal Output — starts EMPTY (zero dummy data)
  const [terminalOutput, setTerminalOutput] = useState<{
    timestamp: string;
    targetContract: string;
    method: string;
    type: 'VIEW' | 'CALL';
    status: 'SUCCESS' | 'ERROR' | 'PENDING';
    rpcResponse: any;
    txHash?: string;
    explorerUrl?: string;
  } | null>(null);

  // Transaction History — starts EMPTY (zero dummy data)
  const [realTxHistory, setRealTxHistory] = useState<LiveContractTxResult[]>([]);

  // NEAR AI Cloud Inference State (https://cloud-api.near.ai/v1)
  const [selectedNearModel, setSelectedNearModel] = useState(NEAR_AI_CONFIG.defaultModel);
  const [nearAiPrompt, setNearAiPrompt] = useState('Explain how autonomous AI agents execute cross-chain intents on NEAR Protocol via Chain Defuser.');
  const [nearAiResponse, setNearAiResponse] = useState<string | null>(null);
  const [inlineNearApiKey, setInlineNearApiKey] = useState(session.nearApiKey || NEAR_AI_CONFIG.defaultKey || '');

  // Fetch real on-chain network status on mount
  const refreshNetwork = useCallback(async () => {
    try {
      const net = await getLiveNearNetworkStatus();
      setNetworkStatus(net);
    } catch {
      // handled
    }
  }, []);

  useEffect(() => {
    refreshNetwork();
    const interval = setInterval(refreshNetwork, 15000);
    return () => clearInterval(interval);
  }, [refreshNetwork]);

  // When method preset changes, update defaults
  const handleSelectPreset = (m: ContractMethodDefinition) => {
    setSelectedMethodName(m.name);
    setMethodArgsJson(JSON.stringify(m.defaultArgs, null, 2));
    setAttachedDepositNear(m.defaultDeposit);
    if (m.name === 'get_messages' || m.name === 'add_message') {
      setTargetContractId('guest-book.testnet');
    } else {
      setTargetContractId(NEAR_CONFIG.aetherisContractId);
    }
  };

  // Execute real contract call
  const handleExecuteContract = async () => {
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(methodArgsJson);
    } catch {
      toast.error('Invalid JSON in arguments field');
      return;
    }

    const isCall = PRESET_METHODS.find((p) => p.name === selectedMethodName)?.type === 'call';
    setBusy(true);

    try {
      if (isCall) {
        // State-changing call requires connected account with private key
        if (!session.connected || !session.accountId) {
          toast.error('Please connect your NEAR wallet first');
          setWalletModalOpen(true);
          return;
        }

        if (!session.privateKey) {
          toast.error('Private key required to sign transactions on NEAR testnet. Add it in the wallet modal.');
          setWalletModalOpen(true);
          return;
        }

        toast('Signing and broadcasting to NEAR Testnet RPC...', { icon: 'Ⓝ' });
        const res = await executeLiveNearContractCall(
          session.accountId,
          session.privateKey,
          targetContractId,
          selectedMethodName,
          parsedArgs,
          attachedDepositNear
        );

        setRealTxHistory((prev) => [res, ...prev]);
        setTerminalOutput({
          timestamp: new Date().toLocaleTimeString(),
          targetContract: targetContractId,
          method: selectedMethodName,
          type: 'CALL',
          status: 'SUCCESS',
          rpcResponse: res.rawReceipt || res,
          txHash: res.txHash,
          explorerUrl: res.explorerUrl,
        });

        toast.success(`Transaction executed on-chain! Tx: ${res.txHash.slice(0, 10)}...`);
      } else {
        // Real on-chain view query directly via JSON-RPC
        const res = await queryLiveNearContractView(targetContractId, selectedMethodName, parsedArgs);
        setTerminalOutput({
          timestamp: new Date().toLocaleTimeString(),
          targetContract: targetContractId,
          method: selectedMethodName,
          type: 'VIEW',
          status: res.success ? 'SUCCESS' : 'ERROR',
          rpcResponse: res.success ? res.data : { error: res.error },
        });

        if (res.success) {
          toast.success(`Queried ${targetContractId}::${selectedMethodName}() from RPC`);
        } else {
          toast.error(`RPC Query Error: ${res.error || 'Failed'}`);
        }
      }
    } catch (err: any) {
      setTerminalOutput({
        timestamp: new Date().toLocaleTimeString(),
        targetContract: targetContractId,
        method: selectedMethodName,
        type: isCall ? 'CALL' : 'VIEW',
        status: 'ERROR',
        rpcResponse: { error: err.message },
      });
      toast.error(err.message || 'Execution failed');
    } finally {
      setBusy(false);
    }
  };

  // Run Real NEAR AI Cloud Inference (https://api.near.ai/v1)
  const handleRunNearAi = async () => {
    const key = inlineNearApiKey.trim() || session.nearApiKey;
    if (!key) {
      toast.error('Please enter your NEAR AI API key (from cloud.near.ai) or add it in the wallet modal.');
      return;
    }
    setBusy(true);
    try {
      toast('Sending request to NEAR AI Hub (api.near.ai/v1)...', { icon: 'Ⓝ' });
      const res = await runNearAIChat(key, nearAiPrompt, selectedNearModel);
      if (res.success) {
        setNearAiResponse(res.response);
        toast.success(`Generated via NEAR AI Cloud (${selectedNearModel})!`);
      } else {
        setNearAiResponse(
          `[NEAR AI Cloud Error]: ${res.error}\n\nMake sure your NEAR AI token is valid from cloud.near.ai.`
        );
        toast.error(`NEAR AI Error: ${res.error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-full w-full overflow-y-auto px-4 sm:px-6 py-8 selection:bg-emerald-500/20 relative"
      style={{
        background: '#030712',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0, 245, 155, 0.12) 0%, transparent 65%), url(/bg-cinematic.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8 pt-16 pb-24">
        {/* ── Top Web3 Banner ── */}
        <div
          className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(8, 24, 18, 0.92), rgba(3, 7, 18, 0.98))',
            border: '1px solid rgba(0, 245, 155, 0.3)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(0,245,155,0.1)',
          }}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live NEAR Testnet RPC
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10">
                  Block #{networkStatus?.latest_block_height || '182,49...'}
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                NEAR Smart Contract <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F59B] to-[#A3E635]">Live Interaction Hub</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
                Direct on-chain execution with <strong className="text-emerald-400">NEAR Protocol JSON-RPC</strong>. Query live smart contracts, sign transactions with your NEAR account, and verify execution records on the NEAR Block Explorer.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="px-6 py-3 rounded-2xl text-xs font-bold text-[#030712] flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #00F59B, #059669)',
                    boxShadow: '0 0 25px rgba(0,245,155,0.4)',
                  }}
                >
                  <Wallet className="w-4 h-4" />
                  <span>{session.connected ? `Connected: ${session.accountId}` : 'Connect NEAR Account / Enter API'}</span>
                </button>

                <a
                  href={`${NEAR_CONFIG.explorerUrl}/accounts/${targetContractId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Explore Contract ↗</span>
                </a>
              </div>
            </div>

            {/* 3D Hologram */}
            <div className="shrink-0 flex flex-col items-center">
              <Web3Hologram3D size={260} interactive={true} />
              <div className="text-[11px] text-emerald-400/80 font-mono tracking-widest uppercase mt-2">
                NEAR Agent Autonomous Kernel
              </div>
            </div>
          </div>
        </div>

        {/* ── Real Live On-Chain Metric Cards (From RPC) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-5 rounded-2xl space-y-1.5"
            style={{ background: 'rgba(8, 20, 15, 0.75)', border: '1px solid rgba(0, 245, 155, 0.2)' }}
          >
            <span className="text-xs text-slate-400 font-semibold">Connected NEAR Account</span>
            <div className="text-lg font-black text-white truncate">
              {session.connected && session.accountId ? session.accountId : <span className="text-slate-500 font-normal">Not Connected</span>}
            </div>
            <span className="text-[11px] text-slate-500">
              {session.connected ? 'Verified on Testnet' : 'Connect wallet to perform calls'}
            </span>
          </div>

          <div
            className="p-5 rounded-2xl space-y-1.5"
            style={{ background: 'rgba(8, 20, 15, 0.75)', border: '1px solid rgba(0, 245, 155, 0.2)' }}
          >
            <span className="text-xs text-slate-400 font-semibold">Live Account Balance</span>
            <div className="text-2xl font-black text-[#00F59B] flex items-baseline gap-1.5">
              <span>{session.balanceNear.toFixed(4)}</span>
              <span className="text-xs text-emerald-400 font-bold">NEAR</span>
            </div>
            <span className="text-[11px] text-slate-500">Queried from rpc.testnet.near.org</span>
          </div>

          <div
            className="p-5 rounded-2xl space-y-1.5"
            style={{ background: 'rgba(8, 20, 15, 0.75)', border: '1px solid rgba(0, 245, 155, 0.2)' }}
          >
            <span className="text-xs text-slate-400 font-semibold">Latest Testnet Block</span>
            <div className="text-2xl font-black text-white flex items-baseline gap-1.5 font-mono">
              <span>#{networkStatus?.latest_block_height ? networkStatus.latest_block_height.toLocaleString() : 'Loading...'}</span>
            </div>
            <span className="text-[11px] text-emerald-400">Chain: {networkStatus?.chain_id || 'testnet'}</span>
          </div>

          <div
            className="p-5 rounded-2xl space-y-1.5"
            style={{ background: 'rgba(8, 20, 15, 0.75)', border: '1px solid rgba(0, 245, 155, 0.2)' }}
          >
            <span className="text-xs text-slate-400 font-semibold">Executed On-Chain Calls</span>
            <div className="text-2xl font-black text-white flex items-baseline gap-1.5">
              <span>{realTxHistory.length}</span>
              <span className="text-xs text-slate-400 font-normal">tx this session</span>
            </div>
            <span className="text-[11px] text-slate-500">Zero dummy data</span>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-2xl"
          style={{
            background: 'rgba(8, 20, 15, 0.85)',
            border: '1px solid rgba(0, 245, 155, 0.2)',
          }}
        >
          {[
            { id: 'contract', label: 'Contract Interaction', icon: Terminal },
            { id: 'network', label: 'Network & Node RPC', icon: Globe },
            { id: 'inference', label: 'NEAR AI Models', icon: Cpu },
            { id: 'vault', label: 'Compute Escrow', icon: Database },
            { id: 'explorer', label: 'Live Tx Explorer', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: active ? 'linear-gradient(135deg, #00F59B, #059669)' : 'transparent',
                  color: active ? '#030712' : 'rgba(236, 253, 245, 0.75)',
                  boxShadow: active ? '0 4px 18px rgba(0, 245, 155, 0.3)' : 'none',
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active Tab Content ── */}
        <AnimatePresence mode="wait">
          {/* TAB 1: CONTRACT INTERACTION CONSOLE */}
          {activeTab === 'contract' && (
            <motion.div
              key="contract"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Configuration Panel */}
              <div
                className="lg:col-span-5 rounded-3xl p-6 space-y-5"
                style={{
                  background: 'rgba(8, 20, 15, 0.8)',
                  border: '1px solid rgba(0, 245, 155, 0.22)',
                }}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Contract Caller</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">JSON-RPC Call</span>
                </div>

                {/* Target Contract ID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Target Smart Contract ID</span>
                    <span className="text-[10px] text-slate-500 font-mono">Testnet</span>
                  </label>
                  <input
                    type="text"
                    value={targetContractId}
                    onChange={(e) => setTargetContractId(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,245,155,0.25)' }}
                    placeholder="e.g. guest-book.testnet or aetheris-omnisense.testnet"
                  />
                </div>

                {/* Method Presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Method Presets</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_METHODS.map((m) => (
                      <button
                        key={m.name}
                        onClick={() => handleSelectPreset(m)}
                        className={`p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          selectedMethodName === m.name
                            ? 'bg-emerald-500/20 border border-emerald-400 text-white font-bold'
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-mono truncate">{m.name}()</div>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                            m.type === 'call' ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'
                          }`}
                        >
                          {m.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arguments JSON Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Arguments (JSON)</span>
                    <span className="text-[10px] text-slate-500 font-mono">args</span>
                  </label>
                  <textarea
                    rows={3}
                    value={methodArgsJson}
                    onChange={(e) => setMethodArgsJson(e.target.value)}
                    className="w-full rounded-xl p-3 text-xs text-emerald-300 font-mono outline-none resize-none"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,245,155,0.25)' }}
                  />
                </div>

                {/* Attached Deposit for Call Methods */}
                {PRESET_METHODS.find((p) => p.name === selectedMethodName)?.type === 'call' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Attached Deposit in NEAR</span>
                      <span className="text-[10px] text-amber-400 font-mono">payable</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={attachedDepositNear}
                      onChange={(e) => setAttachedDepositNear(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none"
                      style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(245,158,11,0.25)' }}
                    />
                  </div>
                )}

                {/* Execute Button */}
                <button
                  disabled={busy}
                  onClick={handleExecuteContract}
                  className="w-full py-3.5 rounded-2xl text-xs font-bold text-[#030712] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer shadow-lg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #00F59B, #059669)' }}
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>
                    Execute {selectedMethodName}() on {targetContractId}
                  </span>
                </button>
              </div>

              {/* Right Real Terminal Output */}
              <div
                className="lg:col-span-7 rounded-3xl p-6 flex flex-col justify-between"
                style={{
                  background: 'rgba(4, 11, 8, 0.95)',
                  border: '1px solid rgba(0, 245, 155, 0.22)',
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live On-Chain RPC Output
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      RPC: rpc.testnet.near.org
                    </span>
                  </div>

                  {terminalOutput ? (
                    <div className="font-mono text-xs text-emerald-300 bg-black/70 p-5 rounded-2xl border border-emerald-500/20 overflow-x-auto space-y-3">
                      <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-white/5">
                        <span>Timestamp: {terminalOutput.timestamp}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            terminalOutput.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {terminalOutput.status}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Contract: <span className="text-white font-bold">{terminalOutput.targetContract}</span>
                      </div>
                      <div className="text-slate-300">
                        Method: <span className="text-white font-bold">{terminalOutput.method}()</span> ({terminalOutput.type})
                      </div>
                      {terminalOutput.txHash && (
                        <div className="text-slate-300">
                          TxHash:{' '}
                          <a
                            href={terminalOutput.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 underline hover:text-emerald-300"
                          >
                            {terminalOutput.txHash} ↗
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 text-[11px]">// RPC JSON Response:</span>
                        <pre className="text-emerald-200 mt-1.5 text-[11px] leading-relaxed max-h-80 overflow-y-auto">
                          {JSON.stringify(terminalOutput.rpcResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl bg-black/30 border border-white/5 space-y-2">
                      <Terminal className="w-8 h-8 text-slate-500 mx-auto" />
                      <div className="text-sm font-semibold text-slate-300">No Calls Executed Yet</div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Select a method on the left and click "Execute" to perform a real view or signed transaction call directly to the NEAR Testnet blockchain.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5">
                  <span>Zero simulated data</span>
                  <span>Explorer: testnet.nearblocks.io</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: NETWORK & NODE RPC STATUS */}
          {activeTab === 'network' && (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 sm:p-8 space-y-6"
              style={{
                background: 'rgba(8, 20, 15, 0.8)',
                border: '1px solid rgba(0, 245, 155, 0.22)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    <span>NEAR Testnet Node &amp; Protocol Telemetry</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">Direct live metrics queried from {NEAR_CONFIG.nodeUrl}/status</p>
                </div>
                <button
                  onClick={refreshNetwork}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh RPC</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400">Chain Network</span>
                  <div className="text-xl font-black text-white">{networkStatus?.chain_id || 'testnet'}</div>
                  <span className="text-[10px] text-emerald-400 font-mono">Proof of Stake (Nightshade Sharding)</span>
                </div>

                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400">Latest Block Height</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    #{networkStatus?.latest_block_height?.toLocaleString() || 'Syncing...'}
                  </div>
                  <span className="text-[10px] text-slate-500">Live block height</span>
                </div>

                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400">Node Sync Status</span>
                  <div className="text-xl font-black text-white">
                    {networkStatus?.sync_status ? 'Fully Synchronized' : 'Syncing'}
                  </div>
                  <span className="text-[10px] text-emerald-400">1.2s avg block finality</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300 space-y-2">
                <div className="text-slate-400">// Latest Block Hash:</div>
                <div className="text-emerald-400 break-all">{networkStatus?.latest_block_hash || 'Querying...'}</div>
                <div className="text-slate-400 pt-2">// Active RPC Endpoint:</div>
                <div className="text-white">{networkStatus?.rpc_url}</div>
              </div>

              {/* ── Active NEAR APIs in this Project ── */}
              <div className="p-6 rounded-2xl bg-black/70 border border-emerald-500/25 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Where NEAR APIs are Used in Aetheris OmniSense</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>1. NEAR Protocol JSON-RPC API</span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400">https://rpc.testnet.near.org</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Used in <code className="text-emerald-400">near.ts</code> for live queries of connected wallet balance via <code className="text-emerald-400">view_account</code>, block height telemetry, and smart contract execution.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>2. NEAR AI Cloud API</span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400">https://cloud-api.near.ai/v1</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Used in <code className="text-emerald-400">near.ts</code> and <code className="text-emerald-400">backend/app/config.py</code> for decentralized LLM inference on DeepSeek V3.2, DeepSeek V4.1 Flash, and Claude Sonnet 5.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>3. NEAR 1Click Chain Defuser</span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400">https://1click.chaindefuser.com</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Powers seamless multi-chain intent defusion and cross-chain execution directly from NEAR Protocol smart contracts and autonomous agents.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>4. MyNearWallet Web3 Auth API</span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400">https://testnet.mynearwallet.com</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Used in <code className="text-emerald-400">NearWalletModal.tsx</code> for secure web-wallet authorization and testnet transaction approvals.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>5. NEAR Block Explorer API</span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400">https://testnet.nearblocks.io</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Used in <code className="text-emerald-400">NearAgentStudio.tsx</code> for on-chain receipt exploration, tx verification, and smart contract state inspection.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: NEAR AI MODELS */}
          {activeTab === 'inference' && (
            <motion.div
              key="inference"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 sm:p-8 space-y-6"
              style={{
                background: 'rgba(8, 20, 15, 0.8)',
                border: '1px solid rgba(0, 245, 155, 0.22)',
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-emerald-400" />
                    <span>NEAR AI Cloud Decentralized Model Inference</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Route requests directly through NEAR AI Cloud API (<code className="text-emerald-400">https://cloud-api.near.ai/v1</code>).
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                  Caller: {session.accountId || 'Not Connected'}
                </span>
              </div>

              {/* Model Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {NEAR_AI_CONFIG.models.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedNearModel(m)}
                    className={`p-4 rounded-2xl text-left transition-all cursor-pointer ${
                      selectedNearModel === m
                        ? 'bg-emerald-500/20 border border-emerald-400 text-white font-bold'
                        : 'bg-black/40 border border-white/5 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-bold text-white truncate">{m.split('/')[1] || m}</div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-mono truncate">{m}</div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 mt-2 inline-block">
                      NEAR AI Node
                    </span>
                  </button>
                ))}
              </div>

              {/* API Key Input */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>NEAR AI Cloud API Key (from cloud.near.ai)</span>
                  <span className="text-[10px] text-slate-400">Bearer token</span>
                </label>
                <input
                  type="password"
                  value={inlineNearApiKey}
                  onChange={(e) => setInlineNearApiKey(e.target.value)}
                  placeholder="near_ai_token_..."
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,245,155,0.25)' }}
                />
              </div>

              {/* Prompt Input */}
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={nearAiPrompt}
                  onChange={(e) => setNearAiPrompt(e.target.value)}
                  className="w-full rounded-2xl p-4 text-xs text-white outline-none resize-none font-mono"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,245,155,0.25)' }}
                  placeholder="Enter task or intent for NEAR AI..."
                />
                <button
                  disabled={busy}
                  onClick={handleRunNearAi}
                  className="px-8 py-3 rounded-2xl text-xs font-bold text-[#030712] flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #00F59B, #059669)' }}
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Run Inference on NEAR AI Cloud</span>
                </button>
              </div>

              {nearAiResponse && (
                <div className="p-5 rounded-2xl bg-black/70 border border-emerald-500/30 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed">
                  {nearAiResponse}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: COMPUTE ESCROW */}
          {activeTab === 'vault' && (
            <motion.div
              key="vault"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 sm:p-8 space-y-6"
              style={{
                background: 'rgba(8, 20, 15, 0.8)',
                border: '1px solid rgba(0, 245, 155, 0.22)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <span>Compute Escrow Vault</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">Smart Contract: {NEAR_CONFIG.aetherisContractId}</p>
                </div>
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                >
                  Manage Wallet &amp; Escrow
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                <div className="text-xs text-slate-400">Account ID: {session.accountId || 'Not Connected'}</div>
                <div className="text-2xl font-black text-emerald-400">
                  {session.balanceNear.toFixed(4)} NEAR
                </div>
                <p className="text-xs text-slate-400">
                  Fund your account or contract escrow on NEAR Testnet to execute autonomous model inference micropayments.
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 5: ON-CHAIN TRANSACTION EXPLORER */}
          {activeTab === 'explorer' && (
            <motion.div
              key="explorer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 sm:p-8 space-y-5"
              style={{
                background: 'rgba(8, 20, 15, 0.8)',
                border: '1px solid rgba(0, 245, 155, 0.22)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>On-Chain Transaction Log ({realTxHistory.length} executed)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Explorer: testnet.nearblocks.io</span>
              </div>

              {realTxHistory.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <Layers className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">No Transactions Executed Yet</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Transactions dispatched via the Contract Interaction tab will be logged here with real cryptographic transaction hashes linking directly to the NEAR Block Explorer.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {realTxHistory.map((t) => (
                    <div
                      key={t.txHash}
                      className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 font-mono">
                            {t.methodName}()
                          </span>
                          <span className="text-xs font-semibold text-white">Target: {t.contractId}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-3">
                          <span className="text-emerald-400">Tx: {t.txHash}</span>
                          <span>•</span>
                          <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-white font-mono">
                          {t.attachedDepositNear && parseFloat(t.attachedDepositNear) > 0 ? `${t.attachedDepositNear} NEAR` : '0 NEAR'}
                        </span>
                        <a
                          href={t.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          Explorer ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Web3 Wallet Modal */}
      <NearWalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onSessionChange={(s) => setSession(s)}
      />
    </div>
  );
};

export default NearAgentStudio;
