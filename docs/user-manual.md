# Berth User Manual

## Table of Contents

- [Installation](#installation)
- [First Launch](#first-launch)
- [Overview Dashboard](#overview-dashboard)
- [Sessions](#sessions)
- [Configuration — Instructions](#configuration--instructions)
- [Configuration — Capabilities](#configuration--capabilities)
- [Usage Analytics](#usage-analytics)
- [Settings](#settings)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Download

Download the latest installer for your platform from the [Releases](https://github.com/Caldis/berth/releases) page:

- **macOS**: `.dmg` or `.zip`
- **Windows**: `.exe` installer or portable `.exe`

### Build from Source

```bash
git clone https://github.com/Caldis/berth.git
cd berth
pnpm install
pnpm dev        # Development mode with hot reload
pnpm package    # Build distributable
```

### Requirements

- **Claude Code** or **Codex** must have local data — Berth scans `~/.claude/`, `~/.codex/`, and supported project files when present
- macOS 11+ or Windows 10+

---

## First Launch

When you first open Berth, it will:

1. **Detect local agent data** — Check if Claude Code or Codex files exist
2. **Full scan** — Read all asset files (skills, MCP configs, sessions, etc.)
3. **Show Overview** — Display your asset dashboard

If no supported agent data exists, Berth will show a welcome screen with installation guidance.

> Berth is **read-only**. It never modifies your files. It never sends data anywhere.

---

## Overview Dashboard

The Overview is your home screen. It shows:

### Stat Cards
Four cards at the top showing counts of:
- **Skills** — Click to jump to Instructions
- **MCP Servers** — Click to jump to Capabilities
- **Sessions** — Click to jump to Sessions
- **Plugins** — Click to jump to Capabilities

### Recent Sessions
Your last 5 sessions, grouped by project. Each shows:
- Session title
- Time ago
- Cost and token count

Click any session to see its full detail.

### Cost Chart
A bar chart showing daily spending over the last 7 days.

### Health Checks
Read-only local diagnostics for Claude Code and Codex. Checks are grouped by agent and severity.

Berth checks:
- Source files and directories, such as `~/.claude/`, `~/.codex/`, project `.claude/`, project `.codex/`, `CLAUDE.md`, `AGENTS.md`, and skills directories
- Syntax for JSON, TOML, and Markdown YAML frontmatter
- Required structure for skills, MCP servers, hooks, and custom agents
- Missing `@path` imports in `CLAUDE.md` and `AGENTS.md`
- Windows-specific hook hints, such as Codex `commandWindows` and Claude Code `shell: powershell`
- Session directories and incomplete transcript metadata

Berth does not:
- Run `claude`, `codex`, `/doctor`, `/mcp`, or any hook command
- Modify configuration files
- Read or display credential values
- Guess across WSL and Windows home directories; it scans the current OS home and current project roots

Green checkmark means no health check returned info, warning, or error.

---

## Sessions

Browse all your Claude Code sessions.

### Filtering
Type in the search box to filter by session title, project name, or model.

### Grouping
Toggle between **Project** and **Date** grouping using the buttons next to the search box.

### Session Detail
Click any session to see:
- **Metadata**: project, model, duration, cost, tokens, start time
- **Skills used**: Which skills were loaded
- **MCP servers**: Which servers connected (with error indicators)
- **Hooks fired**: Grouped by event type (PreToolUse, PostToolUse, etc.)
- **Artifacts**: Plans, todos, file history checkpoints

---

## Configuration — Instructions

View all the text files that shape your agent's behavior.

### Tabs

| Tab | What it shows |
|-----|--------------|
| **Memories** | CLAUDE.md and AGENTS.md files with their `@path` import chains |
| **Skills** | Installed skills with description, trigger type, tools, and file count |
| **Subagents** | Agent definitions from `agents/` directories |
| **Commands** | Custom slash commands from `commands/` directories |
| **Output Modes** | Response style presets from `output-modes/` |
| **Agent Teams** | Team definitions from `teams/` |

### Actions
- **Search**: Filter by name or description
- **Scope filter**: Show only User, Project, or all scopes
- **Expand card**: Click to see full details
- **View File**: Opens the raw file in the Inspector panel
- **Show in Explorer**: Opens the file location in Finder/Explorer

---

## Configuration — Capabilities

View everything that gives your agent abilities.

### MCP Tab
Shows the **merged effective configuration** from all three scopes:
- User scope (`~/.claude.json`)
- Project scope (`.mcp.json`)
- Enterprise scope (managed)

Each server shows its name, scope badge, connection status, and any override conflicts.

### Hooks Tab
Groups hooks by the 8 event types: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, Notification, PreCompact, SessionStart.

### Plugins Tab
Shows installed plugins and their contained components (skills, commands, subagents).

### Permissions Tab
Shows allow and deny lists. **Warning banner** appears if `bypassPermissions: true` is detected.

### Env Tab
Shows environment variables from settings. Sensitive values are redacted.

---

## Usage Analytics

Track your AI spending and usage patterns.

### Time Range
Switch between 7 days, 30 days, or all time using the buttons in the header.

### Charts
- **Daily Cost**: Bar chart of daily spending
- **By Model**: Pie chart showing spend distribution across models (Opus, Sonnet, Haiku)
- **By Project**: Progress bars showing which projects cost the most

### Rate Limits
Shows current rate limit status with progress bars. Turns red when below 25%.

---

## Settings

### Theme
Choose Light, Dark, or System (follows your OS preference).

### Language
Switch between English and 中文.

### File Watching
Toggle automatic refresh when asset files change on disk.

### Advanced Mode
Show normally-hidden assets like debug logs, cache files, and ephemeral data.

### Scan Directories
View which directories Berth is scanning. Click "Show in Explorer" to open `~/.claude/`.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open global search |
| `Escape` | Close search / inspector panel |

---

## Troubleshooting

### Berth shows "No assets found"
- Make sure Claude Code is installed
- Check that `~/.claude/` exists
- Try closing and reopening Berth

### Assets are outdated
- Check that File Watching is enabled in Settings
- Close and reopen Berth to trigger a fresh scan

### High memory usage
- This can happen with very large session histories
- Berth uses lazy loading — only open sessions you need

### MCP servers show "failed"
- This doesn't mean Berth is broken — it reflects MCP status from your last session
- Berth reads status, it doesn't connect to MCP servers itself

### Report a bug
File an issue at [github.com/Caldis/berth/issues](https://github.com/Caldis/berth/issues) with:
- OS and version
- Berth version (Settings → About)
- Steps to reproduce
