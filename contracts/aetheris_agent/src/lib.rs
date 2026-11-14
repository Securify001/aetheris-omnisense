use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, require, AccountId, NearToken, PanicOnDefault, Promise};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct AgentRecord {
    pub account_id: AccountId,
    pub agent_name: String,
    pub role: String,
    pub model_tier: String,
    pub total_intents_handled: u64,
    pub registered_at: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct InferenceIntent {
    pub intent_id: String,
    pub creator: AccountId,
    pub intent_type: String,
    pub prompt_hash: String,
    pub max_cost: U128,
    pub status: String,
    pub settled_tx_hash: Option<String>,
    pub timestamp: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct AetherisAgentContract {
    pub owner_id: AccountId,
    pub total_intents_count: u64,
    pub agents: LookupMap<AccountId, AgentRecord>,
    pub intents: UnorderedMap<String, InferenceIntent>,
    pub user_escrow: LookupMap<AccountId, NearToken>,
}

#[near_bindgen]
impl AetherisAgentContract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        require!(!env::state_exists(), "Already initialized");
        Self {
            owner_id,
            total_intents_count: 0,
            agents: LookupMap::new(b"a"),
            intents: UnorderedMap::new(b"i"),
            user_escrow: LookupMap::new(b"e"),
        }
    }

    /// Deposit NEAR into user compute escrow.
    #[payable]
    pub fn deposit_compute_escrow(&mut self) -> NearToken {
        let sender = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        require!(deposit > NearToken::from_yoctonear(0), "Deposit must be > 0");

        let current = self.user_escrow.get(&sender).unwrap_or(NearToken::from_yoctonear(0));
        let new_balance = current.saturating_add(deposit);
        self.user_escrow.insert(&sender, &new_balance);

        new_balance
    }

    /// Register or update an on-chain AI Agent identity.
    pub fn register_agent(&mut self, agent_name: String, role: String, model_tier: String) -> AgentRecord {
        let sender = env::predecessor_account_id();
        let existing = self.agents.get(&sender);

        let record = AgentRecord {
            account_id: sender.clone(),
            agent_name,
            role,
            model_tier,
            total_intents_handled: existing.as_ref().map(|e| e.total_intents_handled).unwrap_or(0),
            registered_at: existing.as_ref().map(|e| e.registered_at).unwrap_or(env::block_timestamp()),
        };

        self.agents.insert(&sender, &record);
        record
    }

    /// Dispatch an autonomous multimodal intent.
    pub fn dispatch_intent(
        &mut self,
        intent_id: String,
        intent_type: String,
        prompt_hash: String,
        max_cost: U128,
    ) -> InferenceIntent {
        let sender = env::predecessor_account_id();
        let cost_token = NearToken::from_yoctonear(max_cost.0);
        let current_escrow = self.user_escrow.get(&sender).unwrap_or(NearToken::from_yoctonear(0));

        require!(current_escrow >= cost_token, "Insufficient compute escrow on NEAR");

        let remaining = current_escrow.saturating_sub(cost_token);
        self.user_escrow.insert(&sender, &remaining);

        let intent = InferenceIntent {
            intent_id: intent_id.clone(),
            creator: sender.clone(),
            intent_type,
            prompt_hash,
            max_cost,
            status: "PENDING".to_string(),
            settled_tx_hash: None,
            timestamp: env::block_timestamp(),
        };

        self.intents.insert(&intent_id, &intent);
        self.total_intents_count += 1;

        if let Some(mut agent) = self.agents.get(&sender) {
            agent.total_intents_handled += 1;
            self.agents.insert(&sender, &agent);
        }

        intent
    }

    /// Settle verified intent.
    pub fn settle_intent(&mut self, intent_id: String, tx_hash: String) -> InferenceIntent {
        let mut intent = self.intents.get(&intent_id).expect("Intent not found");
        intent.status = "SETTLED".to_string();
        intent.settled_tx_hash = Some(tx_hash);
        self.intents.insert(&intent_id, &intent);
        intent
    }

    /// View Method: Get escrow balance
    pub fn get_escrow_balance(&self, account_id: AccountId) -> U128 {
        U128(self.user_escrow.get(&account_id).unwrap_or(NearToken::from_yoctonear(0)).as_yoctonear())
    }

    /// View Method: Get registered agent
    pub fn get_agent(&self, account_id: AccountId) -> Option<AgentRecord> {
        self.agents.get(&account_id)
    }

    /// View Method: Get stats
    pub fn get_stats(&self) -> (AccountId, u64) {
        (self.owner_id.clone(), self.total_intents_count)
    }
}
