/**
 * Core types for Rules Engine
 */

export type RuleAction = 'allow' | 'block' | 'flag' | 'alert' | 'sanitize' | 'set_flag' | 'pass';
export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RuleCategory = 
  | 'sql_injection'
  | 'xss'
  | 'command_injection'
  | 'prompt_injection'
  | 'phishing'
  | 'malware'
  | 'spam'
  | 'credential_harvesting'
  | 'social_engineering'
  | 'impersonation'
  | 'malicious_url'
  | 'privacy'
  | 'financial_scam'
  | 'unknown';

/**
 * Unified Rule Definition - supports all rule types
 */
export interface Rule {
  id: string;
  name?: string;
  description?: string;
  
  // STAGE 1: Fast keyword pre-filtering (Snort-style content)
  // ALL keywords must be present (AND logic)
  content?: string[];
  
  // STAGE 2: Regex verification (Snort-style pcre)
  // ALL patterns must match (AND logic)
  pcre?: string[];
  
  // STAGE 3: Semantic matching
  // ANY pattern above threshold (OR logic)
  semantic?: string[];
  semanticThreshold?: number; // 0-1, default 0.85
  
  // STAGE 4: Stateful checks (requires flags set by previous rules)
  flags?: RuleFlags;
  
  // Threshold/rate limiting
  threshold?: number;  // Number of matches required
  window?: number;     // Time window in seconds
  
  // Metadata
  category: RuleCategory;
  severity: RuleSeverity;
  action: RuleAction;
  enabled: boolean;
  nocase?: boolean;  // Case-insensitive matching (default: true)
  
  // Advisory mode
  enforcementMode?: 'strict' | 'advisory' | 'auto';
  advisoryMessage?: string;
}

/**
 * Stateful flags for multi-stage attack detection
 */
export interface RuleFlags {
  set?: string[];      // Flags to set when rule matches
  unset?: string[];    // Flags to unset when rule matches
  check?: string[];    // Required flags for rule to evaluate (AND logic)
  ttl?: number;        // Time-to-live in seconds for flags (default: 86400)
}

/**
 * Conversation state for stateful rules
 */
export interface ConversationState {
  id: string;
  tokenId: string;
  conversationId: string;
  accountId?: string;
  flags: Record<string, boolean>;
  flagHistory: FlagHistoryEntry[];
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface FlagHistoryEntry {
  flag: string;
  action: 'set' | 'unset';
  ruleId: string;
  timestamp: number;
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  tokenId: string;
  conversationId: string;
  accountId?: string;
  message: string;
  state?: ConversationState;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  matched: boolean;
  rule?: Rule;
  action?: RuleAction;
  state?: ConversationState;
  reason?: string;
  evalTimeMs?: number;
  similarity?: number;  // For semantic matches
  matchedPattern?: string;
}
