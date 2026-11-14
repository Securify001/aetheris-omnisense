# Aetheris OmniSense — NEAR Protocol Smart Contract

This directory contains the on-chain smart contract powering **Aetheris OmniSense**, an autonomous multimodal AI agent economy on **NEAR Protocol**.

## Contract Highlights
- **Decentralized Escrow**: Users and autonomous agents fund compute credits directly on NEAR.
- **Agent Registry**: Registers autonomous agent identities (`aetheris-agent.testnet`), model tiers, and performance records.
- **Intents Execution**: Dispatches and settles verifiable multimodal inference intents on-chain.
- **Chain Abstraction**: Supports cross-chain intent settlement via NEAR MPC / Chain Signatures.

## Methods

### Call (State Changing)
1. `deposit_compute_escrow()`: Attach NEAR tokens to fund the agent's GPU compute escrow.
2. `register_agent(agent_name, role, model_tier)`: Registers an AI agent identity.
3. `dispatch_intent(intent_id, intent_type, prompt_hash, max_cost_yocto)`: Dispatches an AI task on-chain.
4. `settle_intent(intent_id, result_hash, tx_hash)`: Settles verified inference with cryptographic hash.

### View (Free Queries)
1. `get_escrow_balance(account_id)`: Returns user's escrowed compute balance.
2. `get_agent(account_id)`: Returns agent details and metrics.
3. `get_stats()`: Returns contract owner and total intents processed.

## How to Build & Deploy
```bash
# Using near-sdk-js
npm install
npm run build

# Deploy to NEAR Testnet
near deploy --accountId aetheris-omnisense.testnet --wasmFile build/contract.wasm --initFunction "init" --initArgs '{"owner_id": "aetheris-agent.testnet"}'
```
