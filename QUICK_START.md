# Quick Start - Current Setup

## Your Current Structure

```
henry/
├── openclaw/              # Git repo ✅
│   └── .git/
├── openclaw-shield/       # Git repo ✅
│   └── .git/
├── securecheck-shield/    # NOT a git repo ❌
└── rules-engine/          # NOT a git repo ❌ (just created)
```

---

## Recommended: Simple `npm link` Approach (Fastest)

This works with your current setup - no Git changes needed!

### Step 1: Build the rules-engine
```bash
cd /home/geoff-whittington/projects/henry/rules-engine
npm install  # Already done ✅
npm run build  # Already done ✅
```

### Step 2: Link to openclaw-shield
```bash
# Create global symlink
cd /home/geoff-whittington/projects/henry/rules-engine
npm link

# Use it in openclaw-shield
cd /home/geoff-whittington/projects/henry/openclaw-shield
npm link @securecheck/rules-engine

# Update package.json
npm install --save @securecheck/rules-engine
```

### Step 3: Link to securecheck-shield/backend
```bash
cd /home/geoff-whittington/projects/henry/securecheck-shield/backend
npm link @securecheck/rules-engine

# Update package.json
npm install --save @securecheck/rules-engine
```

### Step 4: Test it works
```bash
# In openclaw-shield
cd /home/geoff-whittington/projects/henry/openclaw-shield
node -e "console.log(require('@securecheck/rules-engine'))"

# In securecheck-shield/backend
cd /home/geoff-whittington/projects/henry/securecheck-shield/backend
node -e "console.log(require('@securecheck/rules-engine'))"
```

---

## How Development Works with npm link

### Making Changes to rules-engine
```bash
cd rules-engine
# Edit src/rules-engine.ts
npm run build

# Changes are INSTANTLY available in:
# - openclaw-shield
# - securecheck-shield/backend
```

### In openclaw-shield
```typescript
// Just import and use!
import { RulesEngine, Rule } from '@securecheck/rules-engine';

const engine = new RulesEngine();
```

### In securecheck-shield/backend
```typescript
// Same import!
import { RulesEngine, Rule } from '@securecheck/rules-engine';

const engine = new RulesEngine();
```

---

## Git Strategy (What I Recommend)

### Option A: Keep Separate (Current State)
```bash
# Initialize rules-engine as its own repo
cd rules-engine
git init
git add .
git commit -m "Initial commit: shared rules engine"

# Push to GitHub
git remote add origin https://github.com/you/rules-engine.git
git push -u origin main

# openclaw-shield and securecheck-shield stay separate
```

**Pros:** Clean separation, can version independently
**Cons:** Need to keep in sync manually

### Option B: Add rules-engine to openclaw-shield
```bash
# Move rules-engine into openclaw-shield
mv rules-engine openclaw-shield/packages/

cd openclaw-shield
git add packages/rules-engine
git commit -m "Add shared rules engine"
git push

# Update openclaw-shield/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "file:packages/rules-engine"
  }
}

# securecheck-shield still links via npm link
```

**Pros:** Rules engine lives with the plugin
**Cons:** securecheck-shield references code in another repo

### Option C: Create henry monorepo (Most Flexible)
```bash
# Initialize henry as a monorepo
cd /home/geoff-whittington/projects/henry
git init

# Add all projects
git add openclaw openclaw-shield securecheck-shield rules-engine
git commit -m "Initial monorepo setup"

# Create workspace config
cat > package.json << 'EOF'
{
  "name": "henry-monorepo",
  "private": true,
  "workspaces": [
    "openclaw",
    "openclaw-shield", 
    "securecheck-shield/backend",
    "rules-engine"
  ]
}
EOF

# Install (creates symlinks automatically)
npm install
```

**Pros:** Everything in sync, single source of truth
**Cons:** One big repo (but that's fine!)

---

## My Recommendation for You

**Use npm link for now** (Steps 1-4 above). This:
- ✅ Works immediately with your current setup
- ✅ No Git reorganization needed
- ✅ Changes propagate instantly
- ✅ Can decide Git strategy later

Then later, if you want:
- **Production:** Publish to NPM and use versions
- **Monorepo:** Combine everything with workspaces

---

## Troubleshooting npm link

### If link doesn't work:
```bash
# Unlink first
cd openclaw-shield
npm unlink @securecheck/rules-engine

# Re-link
cd ../rules-engine
npm link

cd ../openclaw-shield  
npm link @securecheck/rules-engine
```

### If you see "module not found":
```bash
# Make sure it's built
cd rules-engine
npm run build
ls dist/  # Should see .js and .d.ts files
```

### To check what's linked:
```bash
cd openclaw-shield
ls -la node_modules/@securecheck/rules-engine
# Should show → ../../rules-engine
```

---

## Next Steps

1. **Run the linking steps** (Steps 1-4 above)
2. **Update both projects** to use the shared engine
3. **Test** that rule testing works the same in both
4. **Decide on Git strategy** once everything works

Want me to run the linking steps now?
