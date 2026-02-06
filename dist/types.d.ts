/**
 * Core types for Rules Engine
 */
export type RuleAction = 'allow' | 'block' | 'flag' | 'alert' | 'sanitize' | 'set_flag' | 'pass';
export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RuleCategory = 'sql_injection' | 'xss' | 'command_injection' | 'prompt_injection' | 'phishing' | 'malware' | 'spam' | 'credential_harvesting' | 'social_engineering' | 'impersonation' | 'malicious_url' | 'privacy' | 'financial_scam' | 'unknown';
/**
 * Unified Rule Definition - supports all rule types
 */
export interface Rule {
    id: string;
    name?: string;
    description?: string;
    content?: string[];
    pcre?: string[];
    semantic?: string[];
    semanticThreshold?: number;
    flags?: RuleFlags;
    threshold?: number;
    window?: number;
    category: RuleCategory;
    severity: RuleSeverity;
    action: RuleAction;
    enabled: boolean;
    nocase?: boolean;
    enforcementMode?: 'strict' | 'advisory' | 'auto';
    advisoryMessage?: string;
}
/**
 * Stateful flags for multi-stage attack detection
 */
export interface RuleFlags {
    set?: string[];
    unset?: string[];
    check?: string[];
    ttl?: number;
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
    similarity?: number;
    matchedPattern?: string;
}
//# sourceMappingURL=types.d.ts.map