/**
 * Semantic Matcher Implementation using LanceDB and Transformers
 *
 * Provides vector-based similarity matching for threat detection.
 * Uses local transformer models (@xenova/transformers) for embeddings.
 */
import type { Rule } from './types.js';
import type { SemanticMatcher } from './rules-engine.js';
export interface SemanticMatcherConfig {
    dbPath: string;
    modelName?: string;
    logger?: any;
}
export declare class LanceDBSemanticMatcher implements SemanticMatcher {
    private db;
    private table;
    private pipeline;
    private rules;
    private config;
    initialized: boolean;
    constructor(config: SemanticMatcherConfig);
    /**
     * Initialize the semantic matcher
     */
    initialize(): Promise<void>;
    /**
     * Load semantic rules into the vector database
     */
    loadRules(rules: Rule[]): Promise<void>;
    /**
     * Generate embedding for text
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * Query semantic rules for similar patterns
     */
    queryRules(message: string, threshold: number): Promise<Array<{
        rule: Rule;
        similarity: number;
    }>>;
    /**
     * Get count of embeddings
     */
    count(): Promise<number>;
    /**
     * Cleanup resources
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=semantic-matcher.d.ts.map