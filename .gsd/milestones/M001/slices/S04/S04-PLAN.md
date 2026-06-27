# S04: Config Injector (CLI Installer)

## Goal
Allow users to install vibemate MCP server into their AI coding tool's config.

## Tasks

### T018: Detect Platform
Detect which AI coding tool the user is using:
- Claude Code: `~/.claude/claude_desktop_config.json`
- Cursor: `~/.cursor/mcp.json`
- Codex: `~/.codex/config.json`
- Kilocode: `~/.kilocode/mcp.json`
- OpenCode: `~/.config/opencode/opencode.json`

### T019: Read Existing Config
Read the existing MCP config file without destroying other server entries.

### T020: Write Vibemate Entry
Add vibemate server entry with auth token env var.

### T021: Backup Original Config
Create backup before writing.

### T022: Unit Tests
Test each platform, conflict handling, backup.

### T023: Integration Test
Test full install flow.

## Output
- `src/mcp/installer.ts` - Config injector implementation
- `tests/mcp/installer.test.ts` - Unit tests
