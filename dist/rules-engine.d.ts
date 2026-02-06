/**
 * High-Performance Rules Engine
 *
 * Supports multiple rule types in a single engine:
 * - Keyword matching (fast pre-filtering)
 * - Regex patterns (pcre verification)
 * - Semantic matching (vector similarity)
 * - Stateful rules (multi-stage attacks)
 * - Threshold/rate limiting
 *
 * Optimizations:
 * - In-memory state caching with TTL
 * - Compiled regex caching
 * - Parallel semantic search (vector DB)
 * - Rule pre-filtering and priority sorting
 * - Early exit on critical blocks
 * - Batch state writes
 */
import type { Rule, ConversationState, EvaluationContext, EvaluationResult } from './types.js';
export interface RulesEngineOptions {
    semanticMatcher?: SemanticMatcher;
    stateProvider?: StateProvider;
}
export interface SemanticMatcher {
    generateEmbedding(text: string): Promise<number[]>;
    queryRules(message: string, threshold: number): Promise<Array<{
        rule: Rule;
        similarity: number;
    }>>;
}
export interface StateProvider {
    get(tokenId: string, conversationId: string, accountId?: string): Promise<ConversationState | null>;
    save(state: ConversationState): Promise<void>;
}
export declare class RulesEngine {
    private rules;
    private stateCache;
    private regexCache;
    private thresholdTracker;
    private semanticMatcher?;
    private stateProvider?;
    constructor(options?: RulesEngineOptions);
    /**
     * Load rules into the engine
     */
    loadRules(rules: Rule[]): void;
    /**
     * Get count of loaded rules
     */
    getRuleCount(): number;
    /**
     * Get rule priority (lower = evaluated first)
     */
    private getRulePriority;
    /**
     * Evaluate message against all rules
     */
    evaluate(ctx: EvaluationContext): Promise<EvaluationResult[]>;
    /**
     * Pre-filter rules based on flag requirements
     */
    private preFilterRules;
    /**
     * Update conversation state after rule match
     */
    private updateState;
    /**
     * Get engine statistics
     */
    getStats(): {
        rulesLoaded: number;
        cacheSize: any;
        regexCacheSize: any;
    };
    /**
     * Cleanup
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=rules-engine.d.ts.map