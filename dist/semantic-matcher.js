/**
 * Semantic Matcher Implementation using LanceDB and Transformers
 *
 * Provides vector-based similarity matching for threat detection.
 * Uses local transformer models (@xenova/transformers) for embeddings.
 */
// Dynamic imports to avoid bundling issues
let lancedb;
let transformers;
export class LanceDBSemanticMatcher {
    db = null;
    table = null;
    pipeline = null;
    rules = [];
    config;
    initialized = false;
    constructor(config) {
        this.config = {
            modelName: 'Xenova/all-MiniLM-L6-v2', // Fast, efficient model for semantic similarity
            ...config
        };
    }
    /**
     * Initialize the semantic matcher
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Dynamically import dependencies
            lancedb = await import('@lancedb/lancedb');
            transformers = await import('@xenova/transformers');
            // Initialize embedding model
            this.config.logger?.debug?.('[SemanticMatcher] Loading embedding model...');
            this.pipeline = await transformers.pipeline('feature-extraction', this.config.modelName, { quantized: true } // Use quantized model for faster inference
            );
            // Connect to LanceDB
            this.config.logger?.debug?.('[SemanticMatcher] Connecting to LanceDB...');
            this.db = await lancedb.connect(this.config.dbPath);
            // Try to open existing table, or create new one
            try {
                this.table = await this.db.openTable('threat_patterns');
                this.config.logger?.debug?.('[SemanticMatcher] Opened existing table');
            }
            catch (err) {
                this.config.logger?.debug?.('[SemanticMatcher] Creating new table');
                // Table doesn't exist, will be created when rules are loaded
            }
            this.initialized = true;
            this.config.logger?.info?.('[SemanticMatcher] Initialized successfully');
        }
        catch (error) {
            this.config.logger?.error?.('[SemanticMatcher] Failed to initialize:', error);
            throw error;
        }
    }
    /**
     * Load semantic rules into the vector database
     */
    async loadRules(rules) {
        if (!this.initialized) {
            throw new Error('SemanticMatcher not initialized');
        }
        // Filter rules that have semantic patterns
        const semanticRules = rules.filter(r => r.semantic && r.semantic.length > 0);
        if (semanticRules.length === 0) {
            this.config.logger?.debug?.('[SemanticMatcher] No semantic rules to load');
            return;
        }
        this.rules = semanticRules;
        this.config.logger?.debug?.(`[SemanticMatcher] Loading ${semanticRules.length} semantic rules`);
        // Generate embeddings for all semantic patterns
        const embeddings = [];
        for (const rule of semanticRules) {
            for (const pattern of rule.semantic || []) {
                try {
                    const vector = await this.generateEmbedding(pattern);
                    embeddings.push({
                        text: pattern,
                        vector,
                        rule_id: rule.id,
                        category: rule.category,
                        severity: rule.severity,
                        action: rule.action,
                        threshold: rule.semanticThreshold || 0.85
                    });
                }
                catch (err) {
                    this.config.logger?.warn?.(`[SemanticMatcher] Failed to embed pattern "${pattern}":`, err);
                }
            }
        }
        if (embeddings.length === 0) {
            this.config.logger?.warn?.('[SemanticMatcher] No embeddings generated');
            return;
        }
        // Create or recreate the table with embeddings
        try {
            // Drop existing table if it exists
            try {
                await this.db.dropTable('threat_patterns');
            }
            catch (err) {
                // Table might not exist, that's fine
            }
            // Create new table with embeddings
            this.table = await this.db.createTable('threat_patterns', embeddings);
            this.config.logger?.info?.(`[SemanticMatcher] Loaded ${embeddings.length} semantic patterns`);
        }
        catch (error) {
            this.config.logger?.error?.('[SemanticMatcher] Failed to load embeddings:', error);
            throw error;
        }
    }
    /**
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        if (!this.pipeline) {
            throw new Error('Embedding model not initialized');
        }
        const output = await this.pipeline(text, {
            pooling: 'mean',
            normalize: true
        });
        // Convert tensor to array
        return Array.from(output.data);
    }
    /**
     * Query semantic rules for similar patterns
     */
    async queryRules(message, threshold) {
        if (!this.table) {
            return []; // No semantic rules loaded
        }
        try {
            // Generate embedding for the message
            const messageVector = await this.generateEmbedding(message);
            // Query LanceDB for similar patterns
            const results = await this.table
                .search(messageVector)
                .limit(10)
                .execute();
            // Filter by threshold and map to rules
            const matches = [];
            for (const result of results) {
                const similarity = 1 - (result._distance || 0); // Convert distance to similarity
                if (similarity >= threshold) {
                    // Find the corresponding rule
                    const rule = this.rules.find(r => r.id === result.rule_id);
                    if (rule) {
                        matches.push({ rule, similarity });
                    }
                }
            }
            return matches;
        }
        catch (error) {
            this.config.logger?.error?.('[SemanticMatcher] Query failed:', error);
            return [];
        }
    }
    /**
     * Get count of embeddings
     */
    async count() {
        if (!this.table)
            return 0;
        try {
            return await this.table.countRows();
        }
        catch (err) {
            return 0;
        }
    }
    /**
     * Cleanup resources
     */
    async shutdown() {
        // Transformers and LanceDB handle their own cleanup
        this.initialized = false;
        this.config.logger?.debug?.('[SemanticMatcher] Shutdown complete');
    }
}
//# sourceMappingURL=semantic-matcher.js.map