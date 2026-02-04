# Deployment & Distribution Strategies

## Overview

You have 3 main options for managing the shared `@securecheck/rules-engine` package:

---

## Option 1: NPM Package (Best for Production) ⭐

### Setup
```bash
cd rules-engine

# Option A: Publish to NPM (public)
npm publish

# Option B: Publish to private registry
npm publish --registry=https://npm.yourcompany.com
```

### In Both Projects
```json
// openclaw-shield/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "^1.0.0"
  }
}

// securecheck-shield/backend/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "^1.0.0"
  }
}
```

### Git Structure
```
henry/
├── .git/
├── rules-engine/          # Separate repo (optional)
│   └── .git/
├── openclaw-shield/       # Uses published package
│   └── .git/
└── securecheck-shield/    # Uses published package
    └── .git/
```

### Workflow
```bash
# 1. Make changes to rules-engine
cd rules-engine
git commit -m "fix: improve performance"

# 2. Bump version
npm version patch  # 1.0.0 → 1.0.1

# 3. Publish
npm publish

# 4. Update both projects
cd ../openclaw-shield
npm update @securecheck/rules-engine

cd ../securecheck-shield/backend
npm update @securecheck/rules-engine
```

**Pros:**
✅ Clean separation of concerns
✅ Version control per package
✅ Can publish publicly or privately
✅ Standard NPM workflow
✅ Works in CI/CD easily

**Cons:**
❌ Requires publish step for changes
❌ Need to update both projects after changes

---

## Option 2: Git Submodule (Good for Co-Development) ⭐

### Setup
```bash
cd henry

# Remove the standalone rules-engine folder
rm -rf rules-engine

# Add as submodule in openclaw-shield
cd openclaw-shield
git submodule add ../rules-engine packages/rules-engine
npm link packages/rules-engine

# Add as submodule in securecheck-shield
cd ../securecheck-shield/backend
git submodule add ../../rules-engine packages/rules-engine
npm link packages/rules-engine
```

### Git Structure
```
henry/
├── rules-engine/          # Standalone repo
│   └── .git/
├── openclaw-shield/
│   ├── .git/
│   ├── packages/
│   │   └── rules-engine/  # Submodule → points to rules-engine
│   └── package.json       # Uses "file:packages/rules-engine"
└── securecheck-shield/
    └── backend/
        ├── .git/
        ├── packages/
        │   └── rules-engine/  # Submodule → points to rules-engine
        └── package.json       # Uses "file:packages/rules-engine"
```

### In Both Projects
```json
// openclaw-shield/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "file:packages/rules-engine"
  }
}
```

### Workflow
```bash
# Clone projects with submodules
git clone --recursive https://github.com/you/openclaw-shield

# Update submodules
git submodule update --remote

# Make changes to rules-engine
cd packages/rules-engine
git checkout main
# Make changes...
git commit -m "feat: add new feature"
git push

# Update parent repo to track new commit
cd ../..
git add packages/rules-engine
git commit -m "chore: update rules-engine"
git push
```

**Pros:**
✅ Changes immediately available in both projects
✅ Single source of truth
✅ Version pinned via Git commit SHA
✅ Easy to develop across all three repos

**Cons:**
❌ More complex Git workflow
❌ Need to update submodule references
❌ Team needs to understand submodules

---

## Option 3: Monorepo with Workspaces (Best for Active Development) ⭐⭐⭐

### Setup
```bash
cd henry

# Create monorepo structure
mkdir -p packages
mv rules-engine packages/
mv openclaw-shield packages/
mv securecheck-shield packages/

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "securecheck-monorepo",
  "private": true,
  "workspaces": [
    "packages/rules-engine",
    "packages/openclaw-shield",
    "packages/securecheck-shield/backend"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
EOF

# Initialize git at root
git init
```

### Git Structure
```
henry/                      # Single repo
├── .git/
├── package.json           # Workspace config
├── packages/
│   ├── rules-engine/
│   │   └── package.json
│   ├── openclaw-shield/
│   │   └── package.json
│   └── securecheck-shield/
│       └── backend/
│           └── package.json
```

### In Both Projects
```json
// packages/openclaw-shield/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "*"  // Auto-resolves to workspace
  }
}

// packages/securecheck-shield/backend/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "*"  // Auto-resolves to workspace
  }
}
```

### Workflow
```bash
# Install all dependencies (links automatically)
npm install

# Build all packages
npm run build

# Make changes anywhere - instantly available
cd packages/rules-engine
# Edit code...
npm run build  # Updates linked packages immediately

# Test everything together
npm test

# Commit everything together
git add .
git commit -m "feat: improve rules engine"
git push
```

**Pros:**
✅ Immediate changes across all packages
✅ Single `npm install` for everything
✅ Single version control
✅ Easier to keep in sync
✅ Single CI/CD pipeline
✅ No linking/submodule complexity

**Cons:**
❌ Single large repo
❌ Can't version packages independently (unless using Lerna/Nx)

---

## Recommended Approach

### For Your Use Case: **Option 3 (Monorepo)** 🏆

**Why:**
1. Backend and plugin are tightly coupled (same product)
2. Rules engine changes affect both immediately
3. Testing changes across all three is easier
4. Simpler for the team - no submodules or publish steps
5. Single CI/CD pipeline

### Migration Steps

```bash
# 1. Create monorepo structure
cd /home/geoff-whittington/projects/henry
mkdir -p monorepo/packages

# 2. Move projects
mv rules-engine monorepo/packages/
mv openclaw-shield monorepo/packages/
mv securecheck-shield monorepo/packages/

# 3. Create root package.json
cd monorepo
npm init -y
```

I can help you set this up if you'd like!

---

## Alternative: Hybrid Approach

Keep separate repos but use `npm link` for development:

```bash
# Development (local linking)
cd rules-engine && npm link
cd openclaw-shield && npm link @securecheck/rules-engine
cd securecheck-shield/backend && npm link @securecheck/rules-engine

# Production (published package)
# Both projects use: "@securecheck/rules-engine": "^1.0.0"
```

**Best of both worlds:**
- Develop with instant changes
- Deploy with stable versions
- Keep repos separate if needed

---

## Summary

| Approach | Git | Dev Experience | CI/CD | Best For |
|----------|-----|----------------|-------|----------|
| **NPM Package** | 3 repos | Medium | Easy | Stable APIs |
| **Submodule** | 3 repos | Complex | Medium | Separate teams |
| **Monorepo** | 1 repo | Excellent | Easy | Coupled projects |
| **Hybrid** | 3 repos | Good | Medium | Flexible |

**My Recommendation:** Monorepo (Option 3) for your tightly-coupled system.
