# S01-UAT.md

## User Acceptance Test: MCP Server Setup

### Test Environment
- Fresh directory with no existing vibemate config
- Node.js 18+ / Bun 1.0+
- Network access to npm registry

### Test Steps

#### 1. Server Starts Successfully
```bash
npx vibemate-mcp
```
**Expected**: Process starts, listens on stdio, no errors
**Pass Criteria**: Process runs without crashing for 10 seconds

#### 2. MCP Initialize Handshake
```json
// Send via stdin
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
```
**Expected Response**:
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"vibemate","version":"1.0.0"}}}
```

#### 3. Tools List Includes vibemate_spec
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```
**Expected**: Response contains `vibemate_spec` in tools array with correct schema

#### 4. Tool Schema Validation
**Expected**: `vibemate_spec` tool has:
- `name`: "vibemate_spec"
- `description`: Mentions "product specification" and "plain English"
- `inputSchema`: Object with required `idea` (string), optional `stack` (object)

#### 5. Graceful Shutdown
**Action**: Close stdin / send SIGTERM
**Expected**: Process exits cleanly (code 0), no error logs

#### 6. Error Handling - Invalid Request
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"nonexistent","arguments":{}}}
```
**Expected**: JSON-RPC error response with code -32601 (Method not found)

### Automation
```bash
# Run all UAT steps
cd .gsd/milestones/M001/slices/S01
bun test:uat
```

### Sign-off
- [ ] Server starts
- [ ] Initialize handshake works
- [ ] Tools list correct
- [ ] Schema valid
- [ ] Shutdown clean
- [ ] Errors handled