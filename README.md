# @securecheckio/rules-engine

High-performance rules engine supporting multiple rule types in a single unified engine.

## Features

- **Keyword Matching** - Fast pre-filtering with AND logic
- **Regex Patterns (PCRE)** - Verification with compiled regex caching
- **Semantic Similarity** - Vector DB integration for meaning-based detection
- **Stateful Rules** - Multi-stage attack detection with flags
- **Threshold/Rate Limiting** - Configurable time windows
- **Performance Optimized** - In-memory caching, parallel processing, early exit

## Installation

```bash
npm install @securecheckio/rules-engine
```

## Usage

```typescript
import { RulesEngine, Rule } from '@securecheckio/rules-engine';

// Create engine
const engine = new RulesEngine({
  semanticMatcher: mySemanticMatcher,  // Optional
  stateProvider: myStateProvider       // Optional
});

// Define rules
const rules: Rule[] = [
  {
    id: 'phishing-001',
    name: 'Phishing Detection',
    content: ['verify', 'account'],      // Stage 1: Fast keywords
    pcre: ['verify your account'],       // Stage 2: Regex verification
    semantic: ['urgent account verify'], // Stage 3: Semantic patterns
    category: 'phishing',
    severity: 'high',
    action: 'block',
    enabled: true
  }
];

// Load rules
engine.loadRules(rules);

// Evaluate message
const results = await engine.evaluate({
  tokenId: 'bot-123',
  conversationId: 'conv-456',
  accountId: 'user-789',
  message: 'Please verify your account immediately'
});

// Check results
for (const result of results) {
  if (result.matched && result.action === 'block') {
    console.log(`Blocked by rule: ${result.rule?.id}`);
  }
}
```

## Rule Definition

```typescript
interface Rule {
  id: string;
  name?: string;
  
  // Stage 1: Keyword pre-filtering (ALL must match)
  content?: string[];
  
  // Stage 2: Regex verification (ALL must match)
  pcre?: string[];
  
  // Stage 3: Semantic matching (ANY above threshold)
  semantic?: string[];
  semanticThreshold?: number;  // 0-1, default 0.85
  
  // Stateful multi-stage detection
  flags?: {
    set?: string[];      // Flags to set
    unset?: string[];    // Flags to unset
    check?: string[];    // Required flags
    ttl?: number;        // Time-to-live (seconds)
  };
  
  // Threshold/rate limiting
  threshold?: number;    // Matches required
  window?: number;       // Time window (seconds)
  
  // Metadata
  category: RuleCategory;
  severity: RuleSeverity;
  action: RuleAction;
  enabled: boolean;
  nocase?: boolean;
}
```

## Performance

- **Keyword matching**: ~0.1ms
- **Regex matching**: ~1ms (with caching)
- **Semantic matching**: ~5-10ms (with vector DB)
- **Total**: ~10ms average per message

## Architecture

The engine evaluates rules in stages:

1. **Pre-filter** by flag requirements
2. **Priority sort** by action and complexity
3. **Stage 1**: Check all keywords (fast)
4. **Stage 2**: Verify with regex (medium)
5. **Stage 3**: Semantic similarity (slow, parallel)
6. **Threshold check** and state update
7. **Early exit** on critical blocks

## License

MIT
