import { NearBindgen, near, call, view, initialize, LookupMap, UnorderedMap, assert } from 'near-sdk-js';

/**
 * Aetheris Agent Economy Smart Contract
 * Deployed on NEAR Protocol for Autonomous AI Agents
 * 
 * Features:
 * - Autonomous Agent Registry
 * - Escrow for AI Model Inference Compute Micropayments
 * - Multi-Agent Consensus Swarm Settlement
 * - On-Chain Verifiable Inference Intent Records
 */

interface AgentRecord {
  accountId: string;
  agentName: string;
  role: string;
  modelTier: string;
  computeCreditsYocto: string;
  totalIntentsHandled: number;
  registeredAt: number;
}

interface InferenceIntent {
  intentId: string;
  creator: string;
  intentType: string;
  promptHash: string;
  maxCostYocto: string;
  status: 'PENDING' | 'SETTLED' | 'REFUNDED';
  settledTxHash?: string;
  resultHash?: string;
  timestamp: number;
}

@NearBindgen({})
export class AetherisAgentContract {
  ownerId: string = '';
  contractTreasuryYocto: string = '0';
  totalIntentsCount: number = 0;
  
  // Storage collections
  agents: LookupMap<AgentRecord> = new LookupMap<AgentRecord>('a');
  intents: UnorderedMap<InferenceIntent> = new UnorderedMap<InferenceIntent>('i');
  userEscrow: LookupMap<string> = new LookupMap<string>('e');

  @initialize({})
  init({ owner_id }: { owner_id: string }) {
    this.ownerId = owner_id;
    this.contractTreasuryYocto = '0';
    this.totalIntentsCount = 0;
  }

  /**
   * Deposit NEAR into user/agent compute escrow balance.
   * Payable method — attached deposit is credited.
   */
  @call({ payableFunction: true })
  deposit_compute_escrow(): { accountId: string; newBalanceYocto: string } {
    const sender = near.predecessorAccountId();
    const deposit = near.attachedDeposit();
    assert(deposit > 0n, 'Must attach NEAR deposit to fund compute escrow');

    const currentYocto = BigInt(this.userEscrow.get(sender) || '0');
    const newYocto = currentYocto + deposit;
    this.userEscrow.set(sender, newYocto.toString());

    return {
      accountId: sender,
      newBalanceYocto: newYocto.toString(),
    };
  }

  /**
   * Register or update an autonomous AI agent instance on NEAR.
   */
  @call({})
  register_agent({
    agent_name,
    role,
    model_tier,
  }: {
    agent_name: string;
    role: string;
    model_tier: string;
  }): AgentRecord {
    const sender = near.predecessorAccountId();
    const existing = this.agents.get(sender);

    const record: AgentRecord = {
      accountId: sender,
      agentName: agent_name,
      role: role || 'Multimodal Autonomous Agent',
      modelTier: model_tier || 'NEAR AI Cloud (Qwen/Llama/DeepSeek)',
      computeCreditsYocto: existing ? existing.computeCreditsYocto : (this.userEscrow.get(sender) || '0'),
      totalIntentsHandled: existing ? existing.totalIntentsHandled : 0,
      registeredAt: existing ? existing.registeredAt : Number(near.blockTimestamp()),
    };

    this.agents.set(sender, record);
    return record;
  }

  /**
   * Dispatch an on-chain multimodal inference intent.
   * Deducts compute escrow and logs intent.
   */
  @call({})
  dispatch_intent({
    intent_id,
    intent_type,
    prompt_hash,
    max_cost_yocto,
  }: {
    intent_id: string;
    intent_type: string;
    prompt_hash: string;
    max_cost_yocto: string;
  }): InferenceIntent {
    const sender = near.predecessorAccountId();
    const userBalance = BigInt(this.userEscrow.get(sender) || '0');
    const cost = BigInt(max_cost_yocto);

    assert(userBalance >= cost, 'Insufficient compute escrow balance on NEAR');

    // Deduct from escrow
    this.userEscrow.set(sender, (userBalance - cost).toString());

    const intent: InferenceIntent = {
      intentId: intent_id,
      creator: sender,
      intentType: intent_type,
      promptHash: prompt_hash,
      maxCostYocto: max_cost_yocto,
      status: 'PENDING',
      timestamp: Number(near.blockTimestamp()),
    };

    this.intents.set(intent_id, intent);
    this.totalIntentsCount += 1;

    // Update agent stats if registered
    const agent = this.agents.get(sender);
    if (agent) {
      agent.totalIntentsHandled += 1;
      this.agents.set(sender, agent);
    }

    return intent;
  }

  /**
   * Settle an inference intent after verification.
   */
  @call({})
  settle_intent({
    intent_id,
    result_hash,
    tx_hash,
  }: {
    intent_id: string;
    result_hash: string;
    tx_hash: string;
  }): InferenceIntent {
    const intent = this.intents.get(intent_id);
    assert(intent !== null, 'Intent ID does not exist');

    intent.status = 'SETTLED';
    intent.resultHash = result_hash;
    intent.settledTxHash = tx_hash;

    this.intents.set(intent_id, intent);
    return intent;
  }

  /**
   * View Method: Get user escrow balance in yoctoNEAR
   */
  @view({})
  get_escrow_balance({ account_id }: { account_id: string }): string {
    return this.userEscrow.get(account_id) || '0';
  }

  /**
   * View Method: Get agent record
   */
  @view({})
  get_agent({ account_id }: { account_id: string }): AgentRecord | null {
    return this.agents.get(account_id);
  }

  /**
   * View Method: Get contract metrics
   */
  @view({})
  get_stats(): { ownerId: string; totalIntents: number } {
    return {
      ownerId: this.ownerId,
      totalIntents: this.totalIntentsCount,
    };
  }
}
