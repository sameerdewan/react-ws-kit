# Publishing react-websocket-kit to npm

This guide explains how to publish the `react-websocket-kit` package to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm CLI Login**: Run `npm login` and enter your credentials
3. **Package Name Available**: Check if the name is available with `npm search react-websocket-kit`

## Before Publishing

### 1. Update Package Metadata

Edit `packages/react-websocket-kit/package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/react-websocket-kit.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/react-websocket-kit/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/react-websocket-kit#readme",
  "author": "Your Name <your.email@example.com>"
}
```

### 2. Build the Package

```bash
cd packages/react-websocket-kit
npm run build
```

This creates the `dist/` folder with:
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (TypeScript definitions)

### 3. Run Tests

```bash
npm test
```

Ensure all tests pass before publishing.

### 4. Verify Package Contents

```bash
npm pack --dry-run
```

This shows what will be included in the published package. Should include:
- `dist/` folder
- `README.md`
- `LICENSE`
- `package.json`

## Publishing Steps

### First Time Publishing

```bash
cd packages/react-websocket-kit

# Login to npm (if not already logged in)
npm login

# Publish the package
npm publish --access public
```

### Subsequent Releases

1. **Update version** in `package.json`:
   - Patch: `1.0.1` (bug fixes)
   - Minor: `1.1.0` (new features, backward compatible)
   - Major: `2.0.0` (breaking changes)

2. **Update CHANGELOG.md** with changes

3. **Commit changes**:
   ```bash
   git add .
   git commit -m "chore: bump version to x.x.x"
   git tag -a v1.0.1 -m "Release v1.0.1"
   ```

4. **Publish**:
   ```bash
   npm publish
   ```

5. **Push to GitHub**:
   ```bash
   git push origin main --tags
   ```

## Version Management Commands

```bash
# Bump patch version (1.0.0 -> 1.0.1)
npm version patch

# Bump minor version (1.0.0 -> 1.1.0)
npm version minor

# Bump major version (1.0.0 -> 2.0.0)
npm version major

# Publish with specific tag (e.g., beta)
npm publish --tag beta
```

## After Publishing

1. **Verify on npm**: Visit https://www.npmjs.com/package/react-websocket-kit

2. **Test installation**:
   ```bash
   mkdir test-install
   cd test-install
   npm init -y
   npm install react-websocket-kit react
   ```

3. **Create GitHub Release**: Go to your repository and create a release from the tag

## Scoped Package (Alternative)

If you want to publish under your npm username or organization:

```bash
# Update package.json name
"name": "@yourusername/react-websocket-kit"

# Publish as scoped package
npm publish --access public
```

## Unpublishing (Use with Caution)

```bash
# Unpublish specific version (within 72 hours)
npm unpublish react-websocket-kit@1.0.0

# Deprecate instead (preferred)
npm deprecate react-websocket-kit@1.0.0 "This version has bugs, please upgrade"
```

## Best Practices

1. ✅ Always test before publishing
2. ✅ Use semantic versioning
3. ✅ Keep CHANGELOG.md updated
4. ✅ Tag releases in git
5. ✅ Never unpublish published versions (use deprecate instead)
6. ✅ Use `prepublishOnly` script to ensure build and tests run
7. ✅ Review package contents with `npm pack --dry-run`

## Troubleshooting

### "Package name already exists"
- Choose a different name or use a scoped package (@yourname/react-websocket-kit)

### "You need to be logged in"
- Run `npm login` and enter your credentials
- Verify with `npm whoami`

### "Missing dist/ folder"
- Run `npm run build` before publishing
- Check that `.npmignore` doesn't exclude `dist/`

### "Tests failed"
- Fix failing tests before publishing
- The `prepublishOnly` script prevents publishing with failing tests

## Package Info

After publishing, users can install with:

```bash
npm install react-websocket-kit
# or
yarn add react-websocket-kit
# or
pnpm add react-websocket-kit
```

And use in their projects:

```typescript
import { useSocket } from 'react-websocket-kit'

const { connect, send, status } = useSocket('ws://localhost:3001/chat')
```

## CI/CD Integration

For automated publishing with GitHub Actions, create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: cd packages/react-websocket-kit && npm run build
      - run: cd packages/react-websocket-kit && npm test
      - run: cd packages/react-websocket-kit && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to your repository secrets.

