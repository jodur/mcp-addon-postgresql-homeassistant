# Version Update Checklist

Use this checklist every time you make changes that need to be deployed to users.

## 📋 Pre-Release Checklist

### 1. Version Numbers
- [ ] Update `postgresql-mcp-server/config.yaml` → `version` field
- [ ] Update `postgresql-mcp-server/package.json` → `version` field
- [ ] Update `postgresql-mcp-server/src/index.ts` → McpServer `version`
- [ ] Update `postgresql-mcp-server/src/index.ts` → Health check `version`
- [ ] Update `postgresql-mcp-server/src/index.ts` → Server info `version`

### 2. Documentation
- [ ] Update `CHANGELOG.md` (main repository)
- [ ] Update `postgresql-mcp-server/CHANGELOG.md` (addon specific)
- [ ] Document new features/fixes in changelog

### 3. Build & Test
- [ ] Run `npm run build` in `postgresql-mcp-server/`
- [ ] Test locally if possible
- [ ] Verify no TypeScript errors

### 4. Commit & Deploy
- [ ] `git add .`
- [ ] `git commit -m "Release version X.Y.Z with [description]"`
- [ ] `git push origin main`

### 5. Home Assistant Update
- [ ] Verify update appears in Home Assistant addon store
- [ ] Test that container restarts (not rebuilds) with new configuration
- [ ] Verify new version shows in logs and health endpoint

## 🎯 Version Increment Guidelines

- **Patch (X.Y.Z → X.Y.Z+1)**: Bug fixes, logging improvements, small tweaks
- **Minor (X.Y.Z → X.Y+1.0)**: New features, significant improvements
- **Major (X.Y.Z → X+1.0.0)**: Breaking changes, major overhauls

## 🚨 Remember

**Home Assistant users won't see updates without version number changes!**
The version in `config.yaml` is what Home Assistant uses to detect updates.
