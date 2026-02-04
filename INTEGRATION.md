# Integration Guide

## How Both Projects Use This Engine

### 1. openclaw-shield (Plugin Runtime)

```typescript
// openclaw-shield/plugin/index.ts
import { RulesEngine } from '@securecheck/rules-engine';
import { SemanticMatcher } from './semantic-matcher';

// Initialize engine
const semanticMatcher = new SemanticMatcher('./lancedb');
await semanticMatcher.initialize();

const engine = new RulesEngine({
  semanticMatcher: {
    generateEmbedding: (text) => semanticMatcher.generateEmbedding(text),
    queryRules: (msg, threshold) => semanticMatcher.queryRules(msg, threshold)
  }
});

// Load rules from API
const rules = await fetch('https://api.securecheck.io/v1/rules').then(r => r.json());
engine.loadRules(rules);

// Evaluate incoming message
const results = await engine.evaluate({
  tokenId: botToken,
  conversationId: channelId,
  accountId: userId,
  message: incomingMessage
});

// Handle results
if (results.some(r => r.matched && r.action === 'block')) {
  return { blocked: true };
}
```

### 2. securecheck-shield (Backend API)

```typescript
// securecheck-shield/backend/app/api/v1/rules/test/route.ts
import { NextResponse } from 'next/server';
import { RulesEngine, Rule } from '@securecheck/rules-engine';
import { SemanticMatcher } from '@/lib/semantic-matcher';

// Singleton engine for testing
let engine: RulesEngine | null = null;

async function getEngine() {
  if (!engine) {
    const matcher = new SemanticMatcher('./lancedb');
    await matcher.initialize();
    
    engine = new RulesEngine({
      semanticMatcher: {
        generateEmbedding: (text) => matcher.generateEmbedding(text),
        queryRules: (msg, threshold) => matcher.queryRules(msg, threshold)
      }
    });
  }
  return engine;
}

export async function POST(request: Request) {
  const { message, rules } = await request.json();
  
  const engine = await getEngine();
  engine.loadRules(rules);
  
  const results = await engine.evaluate({
    tokenId: 'test',
    conversationId: 'test',
    message
  });
  
  return NextResponse.json({
    results: results.map(r => ({
      matched: r.matched,
      ruleId: r.rule?.id,
      action: r.action,
      evalTimeMs: r.evalTimeMs
    }))
  });
}
```

## Installing in Projects

### Option A: Published NPM Package (Production)

```bash
# In openclaw-shield
cd openclaw-shield
npm install @securecheck/rules-engine

# In securecheck-shield/backend
cd securecheck-shield/backend
npm install @securecheck/rules-engine
```

### Option B: Local Development Link

```bash
# Build the rules engine
cd rules-engine
npm install
npm run build

# Link to openclaw-shield
cd ../openclaw-shield
npm link ../rules-engine

# Link to securecheck-shield/backend
cd ../securecheck-shield/backend
npm link ../../rules-engine
```

## Testing the Integration

```bash
# Test in openclaw-shield
cd openclaw-shield
npm test

# Test in securecheck-shield/backend
cd securecheck-shield/backend
npm test
```

## Key Benefits

✅ **Single Source of Truth** - One engine, same behavior everywhere
✅ **Same Performance** - Both projects get all optimizations
✅ **Easier Maintenance** - Fix bugs once, benefits both
✅ **Consistent Testing** - Test the engine once
✅ **Version Control** - Upgrade both projects together
