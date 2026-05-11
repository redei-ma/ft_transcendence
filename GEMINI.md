1. **Preserve Comments:** NEVER delete or modify existing comments unless explicitly requested. This includes TODOs, documentation, and logic explanations.
2. **Minimal Invasiveness:** When asked to "fix" or "improve" code, modify only the strictly necessary lines. Do not rewrite entire files if a small change suffices.
3. **No Stealth Deletions:** Do not remove unused imports, variables, or functions unless I specifically ask for a "cleanup".
4. **Consistency:** Match the existing indentation (tabs vs spaces) and naming conventions (camelCase, PascalCase) of the file you are editing.
5. **Formatting:** Do not run an automatic "prettier" or "formatter" on the whole file. Keep my manual line breaks.

1. **Error Handling:** When adding new logic, always include robust error handling (try/catch, proper HTTP exceptions in NestJS).
2. **Security:** Never suggest code that bypasses authentication or uses `eval()`.
3. **Dependencies:** Do not add new `npm` packages to `package.json` without asking me first.

- **Proposed Changes:** Before applying a change, explain briefly *what* you are changing and *why*.
- **Impact Analysis:** If a change might break the Matchmaking logic or the WebSocket connection, warn me immediately.
- **Dry Run:** If I ask to "refactor", first show me the diff or the specific lines, don't just overwrite the file.

- **Current Branch:** `matchamking` (Focus on WebSocket gateways and Matchmaking queues).
- **Environment:** Everything runs in Docker. Always consider how changes affect the containerized environment.
