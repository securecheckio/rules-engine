# Setup for Separate Repositories

## Your Architecture

```
GitHub:
├── openclaw-shield          # Plugin repo (separate)
│   └── depends on: @securecheck/rules-engine
│
├── securecheck-shield       # Backend repo (separate)  
│   └── depends on: @securecheck/rules-engine
│
└── rules-engine             # Shared engine repo (separate)
    └── published as: @securecheck/rules-engine
```

---

## Setup Steps

### 1. Initialize rules-engine as Git Repo

```bash
cd /home/geoff-whittington/projects/henry/rules-engine

# Initialize git
git init
git add .
git commit -m "Initial commit: shared rules engine

- Supports keyword, regex, semantic, stateful rules
- In-memory caching and optimizations
- Used by both openclaw-shield and securecheck-shield"

# Create GitHub repo and push
git remote add origin https://github.com/securecheck/rules-engine.git
git branch -M main
git push -u origin main
```

### 2. Publish to NPM

#### Option A: Public NPM (Free, Open Source)
```bash
cd rules-engine

# Login to NPM
npm login

# Publish
npm publish --access public
```

#### Option B: Private NPM Registry (Recommended)
```bash
# Use GitHub Packages (free for private repos)
npm login --registry=https://npm.pkg.github.com

# Update package.json
{
  "name": "@securecheck/rules-engine",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}

# Publish
npm publish
```

#### Option C: Verdaccio (Self-Hosted Private Registry)
```bash
# Install Verdaccio
npm install -g verdaccio

# Run it
verdaccio

# Configure in both projects
npm set registry http://localhost:4873

# Publish
npm publish --registry http://localhost:4873
```

### 3. Use in openclaw-shield

```bash
cd openclaw-shield

# Install from NPM
npm install @securecheck/rules-engine

# Or from GitHub Packages
npm install @securecheck/rules-engine --registry=https://npm.pkg.github.com
```

```json
// openclaw-shield/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "^1.0.0"
  }
}
```

### 4. Use in securecheck-shield

```bash
cd securecheck-shield/backend

# Install from NPM
npm install @securecheck/rules-engine
```

```json
// securecheck-shield/backend/package.json
{
  "dependencies": {
    "@securecheck/rules-engine": "^1.0.0"
  }
}
```

---

## Development Workflow

### For Local Development: Use npm link

```bash
# Terminal 1: Link rules-engine
cd rules-engine
npm link

# Terminal 2: Link in openclaw-shield
cd openclaw-shield
npm link @securecheck/rules-engine

# Terminal 3: Link in securecheck-shield
cd securecheck-shield/backend
npm link @securecheck/rules-engine
```

Now changes to rules-engine are instantly available in both projects!

### When Ready to Deploy: Publish New Version

```bash
cd rules-engine

# Make changes...
git add .
git commit -m "feat: add new optimization"

# Bump version (updates package.json)
npm version patch  # 1.0.0 → 1.0.1
# or
npm version minor  # 1.0.0 → 1.1.0
# or  
npm version major  # 1.0.0 → 2.0.0

# Push to GitHub
git push && git push --tags

# Publish to NPM
npm publish

# Update both projects
cd ../openclaw-shield
npm update @securecheck/rules-engine

cd ../securecheck-shield/backend
npm update @securecheck/rules-engine
```

---

## CI/CD Integration

### GitHub Actions for rules-engine

```yaml
# .github/workflows/publish.yml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### In openclaw-shield CI

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci  # Installs @securecheck/rules-engine from NPM
      - run: npm test
```

### In securecheck-shield CI

```yaml
# Same - npm ci installs from NPM
jobs:
  test:
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci  # Installs @securecheck/rules-engine from NPM
      - run: npm test
```

---

## Version Management

### Semantic Versioning

Follow semver for rules-engine:
- **Patch** (1.0.1): Bug fixes, performance improvements
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

### Keeping Projects in Sync

```bash
# Check what version each project uses
cd openclaw-shield
npm list @securecheck/rules-engine

cd ../securecheck-shield/backend
npm list @securecheck/rules-engine

# Update to latest
npm update @securecheck/rules-engine
```

### Lock Files

Commit `package-lock.json` in both projects to ensure consistent versions:
```bash
# After installing/updating
git add package-lock.json
git commit -m "chore: update rules-engine to 1.2.0"
```

---

## Testing Strategy

### 1. Test rules-engine independently

```bash
cd rules-engine
npm test
```

### 2. Test in openclaw-shield

```bash
cd openclaw-shield
npm test  # Uses @securecheck/rules-engine
```

### 3. Test in securecheck-shield

```bash
cd securecheck-shield/backend
npm test  # Uses same @securecheck/rules-engine
```

This ensures both projects test the **exact same engine code**.

---

## Git Workflow Summary

```bash
# 1. Work on rules-engine
cd rules-engine
# Make changes...
npm test
git commit -m "feat: improve performance"
npm version patch
git push && git push --tags
npm publish

# 2. Update openclaw-shield
cd ../openclaw-shield
npm update @securecheck/rules-engine
git add package.json package-lock.json
git commit -m "chore: update rules-engine to 1.0.1"
git push

# 3. Update securecheck-shield
cd ../securecheck-shield
git add backend/package.json backend/package-lock.json
git commit -m "chore: update rules-engine to 1.0.1"
git push
```

---

## Advantages of This Approach

✅ **Separate repos** - Plugin and backend evolve independently
✅ **Shared engine** - Both use identical rule evaluation
✅ **Version control** - Can pin to specific engine versions
✅ **Standard workflow** - Normal NPM dependencies
✅ **CI/CD friendly** - Works in automated pipelines
✅ **Development speed** - Use npm link for instant changes
✅ **Production stability** - Use published versions
✅ **Single source of truth** - Rules engine tested once
✅ **Easy rollback** - Downgrade engine version if needed

---

## Quick Reference

### Development Commands
```bash
# Link for local dev
npm link @securecheck/rules-engine

# Unlink when done
npm unlink @securecheck/rules-engine
npm install  # Re-install from registry
```

### Publishing Commands
```bash
# Patch release (bug fix)
npm version patch && git push --tags && npm publish

# Minor release (new feature)
npm version minor && git push --tags && npm publish

# Major release (breaking change)
npm version major && git push --tags && npm publish
```

### Update Commands
```bash
# Update to latest
npm update @securecheck/rules-engine

# Install specific version
npm install @securecheck/rules-engine@1.2.3

# Check installed version
npm list @securecheck/rules-engine
```
