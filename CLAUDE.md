# Claude Code Guidelines for Respira

This document contains guidelines for Claude Code when working on this repository.

## Commit Message Conventions

When creating commits, use the following prefixes to ensure proper categorization in automated releases:

### Commit Prefixes

- **`fix:`** - For bug fixes and corrections
  - Example: `fix: memory leak in image processing`
  - Example: `fix: layout overflow on small screens`

- **`feature:`** - For new features and enhancements
  - Example: `feature: Add dark mode toggle to settings`
  - Example: `feature: Implement Bluetooth device reconnection`

- **`breaking:`** - For breaking changes (backwards-incompatible changes)
  - Example: `breaking: Remove legacy API endpoints`
  - Example: `breaking: Change configuration file format`

### Additional Guidelines

1. After the prefix, use a space and write the commit message in imperative mood
2. Capitalize the first word after the prefix
3. Do not use a period at the end of the commit message
4. Be descriptive and clear about what the change does

### Complete Examples

```
fix: Correct calculation in embroidery path generator
feature: Add support for custom thread colors
breaking: Remove deprecated USB serial communication
fix: Prevent crash when device disconnects unexpectedly
feature: Implement auto-save for design projects
```

## Pull Request Labels

When creating pull requests, the commit prefix should align with PR labels:

- `fix:` commits → use `fix` label (triggers patch version bump)
- `feature:` commits → use `feature` label (triggers minor version bump)
- `breaking:` commits → use `breaking` label (triggers major version bump)

See `docs/COMMIT_GUIDELINES.md` for complete release automation details.
