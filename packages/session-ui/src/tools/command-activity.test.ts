import { describe, expect, test } from "bun:test"
import { describeCommand } from "./command-activity"

describe("describeCommand", () => {
  test.each([
    ["npm install", { key: "install" }],
    ["cd app && bun install", { key: "install" }],
    ["NODE_ENV=production npm run build", { key: "build" }],
    ["bun run --filter @scope/app build", { key: "build" }],
    ["bun run typecheck:tsc", { key: "typecheck" }],
    ["bun run dev:desktop", { key: "serve" }],
    ["bun test src/foo.test.ts", { key: "test" }],
    ["yarn", { key: "install" }],
    ["bun run seed", { key: "run", params: { name: "seed" } }],
    ["bun src/index.ts", { key: "run", params: { name: "index.ts" } }],
    ["npx -y prettier --write .", { key: "format" }],
    ["npx wrangler deploy", { key: "deploy" }],
    ["npx playwright install chromium", { key: "install" }],
    ["tsc --noEmit", { key: "typecheck" }],
    ["cargo build --release", { key: "build" }],
    ["cargo run", { key: "run", params: { name: "cargo" } }],
    ["python -m pytest -q", { key: "test" }],
    ["uv run pytest", { key: "test" }],
    ["python scripts/seed.py", { key: "run", params: { name: "seed.py" } }],
    ['python -c "print(1)"', { key: "run", params: { name: "python" } }],
    ["pip install requests", { key: "install" }],
    ["pip list", { key: "run", params: { name: "pip" } }],
    ["git status --short && git diff", { key: "gitStatus" }],
    ["git -C ../repo log --oneline -5", { key: "gitHistory" }],
    ['git commit -m "fix: x"', { key: "gitCommit" }],
    ["curl -s https://www.example.com/api | jq .", { key: "fetch", params: { host: "example.com" } }],
    ["ls -la", { key: "list" }],
    ["rg -n describe src | head", { key: "search" }],
    ["sed -n '1,80p' src/app.ts", { key: "read" }],
    ["sed -i '' 's/a/b/' src/app.ts", { key: "edit" }],
    ["cat > notes.md <<'EOF'", { key: "create" }],
    ["docker build -t app .", { key: "build" }],
    ["docker compose up", { key: "containers" }],
    ["sudo rm -rf dist", { key: "remove" }],
    ["unknown-tool --flag", { key: "run", params: { name: "unknown-tool" } }],
  ] as const)("%s", (command, expected) => {
    expect(describeCommand(command)).toEqual(expected)
  })
})
