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
class StateCache {
    cache = new Map();
    maxSize = 10000;
    ttl = 300000; // 5 minutes
    writeQueue = new Set();
    writeBatchTimer = null;
    getKey(tokenId, conversationId, accountId) {
        return `${tokenId}:${conversationId}:${accountId || ''}`;
    }
    get(tokenId, conversationId, accountId) {
        const key = this.getKey(tokenId, conversationId, accountId);
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.lastAccess < this.ttl) {
            cached.lastAccess = Date.now();
            return cached.state;
        }
        return null;
    }
    set(tokenId, conversationId, state, accountId) {
        const key = this.getKey(tokenId, conversationId, accountId);
        if (this.cache.size >= this.maxSize) {
            const oldest = Array.from(this.cache.entries())
                .sort((a, b) => a[1].lastAccess - b[1].lastAccess)[0];
            if (oldest) {
                this.cache.delete(oldest[0]);
            }
        }
        this.cache.set(key, {
            state,
            lastAccess: Date.now(),
            dirty: false
        });
    }
    markDirty(tokenId, conversationId, accountId) {
        const key = this.getKey(tokenId, conversationId, accountId);
        const cached = this.cache.get(key);
        if (cached) {
            cached.dirty = true;
            this.writeQueue.add(key);
            this.scheduleBatchWrite();
        }
    }
    scheduleBatchWrite() {
        if (this.writeBatchTimer)
            return;
        this.writeBatchTimer = setTimeout(() => {
            this.flushWrites();
            this.writeBatchTimer = null;
        }, 100);
    }
    flushWrites() {
        // Override this with actual DB write logic
        this.writeQueue.clear();
    }
    clear() {
        this.cache.clear();
        this.writeQueue.clear();
    }
}
// ============================================================================
// REGEX CACHE
// ============================================================================
class RegexCache {
    cache = new Map();
    get(pattern, flags = 'gi') {
        const key = `${pattern}:${flags}`;
        let regex = this.cache.get(key);
        if (!regex) {
            regex = new RegExp(pattern, flags);
            this.cache.set(key, regex);
        }
        return regex;
    }
    clear() {
        this.cache.clear();
    }
}
class ThresholdTracker {
    trackers = new Map();
    getKey(tokenId, conversationId, accountId) {
        return `${tokenId}:${conversationId}:${accountId || ''}`;
    }
    check(rule, tokenId, conversationId, accountId) {
        if (!rule.threshold || !rule.window)
            return true;
        const key = this.getKey(tokenId, conversationId, accountId);
        const now = Date.now();
        let conversationTrackers = this.trackers.get(key);
        if (!conversationTrackers) {
            conversationTrackers = new Map();
            this.trackers.set(key, conversationTrackers);
        }
        const entry = conversationTrackers.get(rule.id);
        if (!entry || now > entry.windowEnd) {
            conversationTrackers.set(rule.id, {
                count: 1,
                firstMatch: now,
                windowEnd: now + (rule.window * 1000)
            });
            return rule.threshold === 1;
        }
        entry.count++;
        if (entry.count >= rule.threshold) {
            conversationTrackers.delete(rule.id);
            return true;
        }
        return false;
    }
    clear() {
        this.trackers.clear();
    }
}
export class RulesEngine {
    rules = [];
    stateCache = new StateCache();
    regexCache = new RegexCache();
    thresholdTracker = new ThresholdTracker();
    semanticMatcher;
    stateProvider;
    constructor(options = {}) {
        this.semanticMatcher = options.semanticMatcher;
        this.stateProvider = options.stateProvider;
    }
    /**
     * Load rules into the engine
     */
    loadRules(rules) {
        this.rules = rules.filter(r => r.enabled);
        this.rules.sort((a, b) => this.getRulePriority(a) - this.getRulePriority(b));
    }
    /**
     * Get count of loaded rules
     */
    getRuleCount() {
        return this.rules.length;
    }
    /**
     * Get rule priority (lower = evaluated first)
     */
    getRulePriority(rule) {
        const actionPriority = {
            'pass': 0,
            'set_flag': 1,
            'flag': 2,
            'alert': 3,
            'block': 4
        };
        const typeCost = (rule.content ? 1 : 0) +
            (rule.pcre ? 2 : 0) +
            (rule.semantic ? 3 : 0) +
            (rule.flags ? 4 : 0);
        const actionValue = actionPriority[rule.action] || 5;
        return (actionValue * 10) + typeCost;
    }
    /**
     * Evaluate message against all rules
     */
    async evaluate(ctx) {
        const startTime = Date.now();
        const results = [];
        // Load state
        let state = ctx.state || this.stateCache.get(ctx.tokenId, ctx.conversationId, ctx.accountId);
        if (!state && this.stateProvider) {
            state = await this.stateProvider.get(ctx.tokenId, ctx.conversationId, ctx.accountId);
        }
        if (!state) {
            state = {
                id: `${ctx.tokenId}:${ctx.conversationId}:${ctx.accountId || ''}`,
                tokenId: ctx.tokenId,
                conversationId: ctx.conversationId,
                accountId: ctx.accountId,
                flags: {},
                flagHistory: [],
                expiresAt: Date.now() + (24 * 60 * 60 * 1000),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            this.stateCache.set(ctx.tokenId, ctx.conversationId, state, ctx.accountId);
        }
        // Pre-filter rules by flag requirements
        const eligibleRules = this.preFilterRules(this.rules, state);
        // Evaluate each rule
        for (const rule of eligibleRules) {
            const ruleStartTime = Date.now();
            let matched = false;
            let matchedPattern;
            let similarity;
            // STAGE 1: Content check (fast keyword filtering)
            if (rule.content && rule.content.length > 0) {
                const searchContent = rule.nocase !== false ? ctx.message.toLowerCase() : ctx.message;
                const allKeywordsFound = rule.content.every(keyword => {
                    const searchKeyword = rule.nocase !== false ? keyword.toLowerCase() : keyword;
                    return searchContent.includes(searchKeyword);
                });
                if (!allKeywordsFound)
                    continue; // Early exit
                matched = true;
                matchedPattern = rule.content.join(', ');
            }
            // STAGE 2: PCRE check (regex verification)
            if (rule.pcre && rule.pcre.length > 0) {
                const flags = rule.nocase !== false ? 'gi' : 'g';
                const allPatternsMatch = rule.pcre.every(pattern => {
                    const regex = this.regexCache.get(pattern, flags);
                    regex.lastIndex = 0;
                    const match = regex.exec(ctx.message);
                    if (match && !matchedPattern) {
                        matchedPattern = match[0];
                    }
                    return match !== null;
                });
                if (!allPatternsMatch)
                    continue; // Early exit
                matched = true;
            }
            // STAGE 3: Semantic check (vector similarity)
            if (rule.semantic && rule.semantic.length > 0 && this.semanticMatcher) {
                const threshold = rule.semanticThreshold || 0.85;
                const semanticMatches = await this.semanticMatcher.queryRules(ctx.message, threshold);
                const semanticMatch = semanticMatches.find(m => m.rule.id === rule.id);
                if (semanticMatch) {
                    matched = true;
                    similarity = semanticMatch.similarity;
                    matchedPattern = `semantic match (${(similarity * 100).toFixed(1)}%)`;
                }
                else if (!matched) {
                    continue; // No semantic match and no content/pcre match
                }
            }
            if (!matched)
                continue;
            // Threshold check
            const thresholdMet = this.thresholdTracker.check(rule, ctx.tokenId, ctx.conversationId, ctx.accountId);
            if (!thresholdMet) {
                results.push({
                    matched: false,
                    rule,
                    reason: `Threshold not met (${rule.threshold} in ${rule.window}s)`,
                    evalTimeMs: Date.now() - ruleStartTime
                });
                continue;
            }
            // Update state
            state = await this.updateState(rule, ctx, state);
            results.push({
                matched: true,
                rule,
                action: rule.action,
                state,
                matchedPattern,
                similarity,
                evalTimeMs: Date.now() - ruleStartTime
            });
            // Early exit on critical block
            if (rule.action === 'block' && rule.severity === 'critical') {
                break;
            }
        }
        // Flush state writes
        if (this.stateProvider) {
            for (const result of results) {
                if (result.state) {
                    await this.stateProvider.save(result.state);
                }
            }
        }
        return results;
    }
    /**
     * Pre-filter rules based on flag requirements
     */
    preFilterRules(rules, state) {
        return rules.filter(rule => {
            if (!rule.flags?.check || rule.flags.check.length === 0)
                return true;
            return rule.flags.check.every(flag => state.flags[flag] === true);
        });
    }
    /**
     * Update conversation state after rule match
     */
    async updateState(rule, ctx, state) {
        if (!rule.flags)
            return state;
        const flags = { ...state.flags };
        const flagHistory = [...(state.flagHistory || [])];
        const now = Date.now();
        if (rule.flags.set) {
            for (const flag of rule.flags.set) {
                flags[flag] = true;
                flagHistory.push({ flag, action: 'set', ruleId: rule.id, timestamp: now });
            }
        }
        if (rule.flags.unset) {
            for (const flag of rule.flags.unset) {
                flags[flag] = false;
                flagHistory.push({ flag, action: 'unset', ruleId: rule.id, timestamp: now });
            }
        }
        const ttl = rule.flags.ttl || 86400;
        const updatedState = {
            ...state,
            flags,
            flagHistory,
            expiresAt: now + (ttl * 1000),
            updatedAt: now
        };
        this.stateCache.set(ctx.tokenId, ctx.conversationId, updatedState, ctx.accountId);
        this.stateCache.markDirty(ctx.tokenId, ctx.conversationId, ctx.accountId);
        return updatedState;
    }
    /**
     * Get engine statistics
     */
    getStats() {
        return {
            rulesLoaded: this.rules.length,
            cacheSize: this.stateCache.cache.size,
            regexCacheSize: this.regexCache.cache.size
        };
    }
    /**
     * Cleanup
     */
    async shutdown() {
        this.stateCache.flushWrites();
        this.stateCache.clear();
        this.regexCache.clear();
        this.thresholdTracker.clear();
    }
}
//# sourceMappingURL=rules-engine.js.map