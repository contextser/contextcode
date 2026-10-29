/**
 * What a shell command is doing, in a few words: `npm install` installs packages, `bun run build` builds. The timeline
 * shows it while the command runs so the person can follow along without reading the command itself. A program it does
 * not know is named as it is ("Running cargo"), so the words never claim more than the command says.
 */
export type CommandActivity =
  | { key: (typeof plain)[number]; params?: undefined }
  | { key: "run"; params: { name: string } }
  | { key: "fetch"; params: { host: string } }

const plain = [
  "install",
  "update",
  "build",
  "test",
  "lint",
  "format",
  "typecheck",
  "serve",
  "deploy",
  "generate",
  "migrate",
  "gitStatus",
  "gitDiff",
  "gitHistory",
  "gitStage",
  "gitCommit",
  "gitPush",
  "gitPull",
  "gitBranch",
  "gitClone",
  "gitMerge",
  "gitStash",
  "github",
  "list",
  "search",
  "read",
  "edit",
  "create",
  "copy",
  "move",
  "remove",
  "containers",
  "wait",
  "stop",
] as const

export function describeCommand(command: string): CommandActivity {
  return describe(mainStep(command))
}

// Steps that prepare the shell rather than do the work: `cd app && npm install` installs.
const setup = new Set(["cd", "pushd", "popd", "export", "source", ".", "set", "unset", "echo", "printf", "true"])
// Words in front of a program that leave the program unchanged.
const prefixes = new Set(["sudo", "time", "env", "exec", "nohup", "command", "nice"])

function mainStep(command: string) {
  const steps = command
    .split(/&&|\|\||;|\n/)
    // In a pipeline the first command produces the work; the rest only shape its output.
    .map((step) => (step.split("|")[0] ?? "").trim().split(/\s+/).filter(Boolean))
    .map((words) =>
      words.slice(
        Math.max(
          0,
          words.findIndex((word) => !isPrefix(word)),
        ),
      ),
    )
    .filter((words) => words.length > 0)

  return steps.find((words) => !setup.has(words[0]!)) ?? steps[0] ?? []
}

function isPrefix(word: string) {
  return prefixes.has(word) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(word)
}

function describe(words: readonly string[]): CommandActivity {
  const program = basename(words[0] ?? "")
  const args = words.slice(1).filter((word) => !word.startsWith("-"))
  const sub = args[0]
  const named = { key: "run", params: { name: program || "command" } } as const

  if (!program) return named

  if (["npx", "bunx", "pnpx"].includes(program)) return describe(args)

  if (["npm", "pnpm", "yarn", "bun"].includes(program)) return packageManager(program, args)

  if (installers.has(program)) return installer(program, args)

  if (program === "git") return git(words.slice(1))

  if (program === "gh") return { key: "github" }

  // Writing a file through a redirect, as in `cat > notes.md <<EOF`.
  if (["cat", "echo", "printf", "tee"].includes(program) && words.some((word) => /^>>?/.test(word)))
    return { key: "create" }

  if (program === "sed") return words.some((word) => /^-[a-zA-Z]*i/.test(word)) ? { key: "edit" } : { key: "read" }

  if (["curl", "wget", "http", "https", "xh"].includes(program)) {
    const host = args.map((arg) => URL.parse(arg.replace(/^['"]|['"]$/g, ""))?.hostname).find(Boolean)

    return host ? { key: "fetch", params: { host: host.replace(/^www\./, "") } } : named
  }

  if (["python", "python3", "node", "ruby", "php", "perl", "tsx", "ts-node"].includes(program)) {
    // `python -m pytest` is pytest; inline code (`-c`, `-e`) has no name of its own.
    const module = words.indexOf("-m")
    if (module !== -1 && words[module + 1]) return describe(words.slice(module + 1))
    if (words.includes("-c") || words.includes("-e") || !sub) return named

    return { key: "run", params: { name: basename(sub) } }
  }

  if (["docker", "docker-compose", "podman"].includes(program))
    return sub === "build" ? { key: "build" } : { key: "containers" }

  if (["cargo", "go", "swift", "dotnet", "deno", "zig"].includes(program)) return toolchain(sub) ?? named

  return known[program] ?? (sub ? script(sub) : undefined) ?? named
}

const known: Record<string, CommandActivity> = {
  tsc: { key: "typecheck" },
  "vue-tsc": { key: "typecheck" },
  make: { key: "build" },
  cmake: { key: "build" },
  ninja: { key: "build" },
  gradle: { key: "build" },
  gradlew: { key: "build" },
  mvn: { key: "build" },
  xcodebuild: { key: "build" },
  webpack: { key: "build" },
  esbuild: { key: "build" },
  rollup: { key: "build" },
  tsup: { key: "build" },
  jest: { key: "test" },
  vitest: { key: "test" },
  mocha: { key: "test" },
  pytest: { key: "test" },
  cypress: { key: "test" },
  eslint: { key: "lint" },
  stylelint: { key: "lint" },
  rubocop: { key: "lint" },
  swiftlint: { key: "lint" },
  "golangci-lint": { key: "lint" },
  prettier: { key: "format" },
  black: { key: "format" },
  gofmt: { key: "format" },
  rustfmt: { key: "format" },
  ls: { key: "list" },
  tree: { key: "list" },
  find: { key: "list" },
  fd: { key: "list" },
  du: { key: "list" },
  grep: { key: "search" },
  rg: { key: "search" },
  ag: { key: "search" },
  ack: { key: "search" },
  cat: { key: "read" },
  head: { key: "read" },
  tail: { key: "read" },
  less: { key: "read" },
  bat: { key: "read" },
  wc: { key: "read" },
  awk: { key: "read" },
  mkdir: { key: "create" },
  touch: { key: "create" },
  cp: { key: "copy" },
  rsync: { key: "copy" },
  mv: { key: "move" },
  rm: { key: "remove" },
  rmdir: { key: "remove" },
  sleep: { key: "wait" },
  kill: { key: "stop" },
  pkill: { key: "stop" },
  killall: { key: "stop" },
  vercel: { key: "deploy" },
  netlify: { key: "deploy" },
  flyctl: { key: "deploy" },
}

function packageManager(program: string, args: readonly string[]): CommandActivity {
  const sub = args[0]

  // Bare `yarn` and `pnpm` install; bare `npm` and `bun` only print help.
  if (!sub)
    return program === "yarn" || program === "pnpm" ? { key: "install" } : { key: "run", params: { name: program } }

  if (["install", "i", "ci", "add"].includes(sub)) return { key: "install" }

  if (["update", "upgrade", "up", "outdated"].includes(sub)) return { key: "update" }

  if (["remove", "rm", "uninstall", "un"].includes(sub)) return { key: "remove" }

  if (["x", "dlx", "exec"].includes(sub)) return describe(args.slice(1))

  if (sub === "test" || sub === "t") return { key: "test" }

  if (sub === "run" || sub === "run-script") {
    // A path is the value of a flag such as `--cwd` or `--filter`, not the script.
    const name = args.slice(1).find((arg) => !arg.includes("/"))

    return name ? (script(name) ?? { key: "run", params: { name } }) : { key: "run", params: { name: program } }
  }

  // `bun src/index.ts` runs a file; `yarn build` and `bun dev` run a package script.
  if (program === "bun" && /[./]/.test(sub)) return { key: "run", params: { name: basename(sub) } }

  return script(sub) ?? { key: "run", params: { name: sub } }
}

// Package managers outside JavaScript, whose subcommand says what they do.
const installers = new Set([
  "pip",
  "pip3",
  "uv",
  "poetry",
  "pipenv",
  "pdm",
  "conda",
  "brew",
  "apt",
  "apt-get",
  "gem",
  "bundle",
  "composer",
  "pod",
])

function installer(program: string, args: readonly string[]): CommandActivity {
  const sub = args[0]

  // `uv run pytest` is pytest.
  if (sub === "run") return describe(args.slice(1))

  if (!sub && program === "bundle") return { key: "install" }

  if (["install", "add", "sync", "i"].includes(sub ?? "")) return { key: "install" }

  if (["update", "upgrade"].includes(sub ?? "")) return { key: "update" }

  if (["remove", "uninstall"].includes(sub ?? "")) return { key: "remove" }

  return { key: "run", params: { name: program } }
}

// A package script or a tool's subcommand, read by its name.
function script(name: string): CommandActivity | undefined {
  const rules: [RegExp, CommandActivity][] = [
    [/^(type-?check|tsc|check:types)/i, { key: "typecheck" }],
    [/^(build|compile|bundle)|:build$/i, { key: "build" }],
    [/^(test|spec|e2e)|:test$/i, { key: "test" }],
    [/^lint/i, { key: "lint" }],
    [/^(format|fmt|prettier)/i, { key: "format" }],
    [/^(dev|start|serve|preview|watch)/i, { key: "serve" }],
    [/^(deploy|release|publish)/i, { key: "deploy" }],
    [/^(generate|gen|codegen)/i, { key: "generate" }],
    [/^(migrate|db:)/i, { key: "migrate" }],
    [/^(install|add)$/i, { key: "install" }],
  ]

  return rules.find(([pattern]) => pattern.test(name))?.[1]
}

function toolchain(sub: string | undefined): CommandActivity | undefined {
  if (sub === "build") return { key: "build" }
  if (sub === "test") return { key: "test" }
  if (["add", "get", "install", "fetch", "restore"].includes(sub ?? "")) return { key: "install" }
  if (sub === "fmt" || sub === "format") return { key: "format" }
  if (["clippy", "vet", "lint", "check"].includes(sub ?? "")) return { key: "lint" }

  return undefined
}

function git(words: readonly string[]): CommandActivity {
  // `-C <dir>` and `-c <key=value>` take a value, so the subcommand is the first word that is neither.
  const sub = words.find(
    (word, index) => !word.startsWith("-") && words[index - 1] !== "-C" && words[index - 1] !== "-c",
  )
  const subcommands: Record<string, CommandActivity> = {
    status: { key: "gitStatus" },
    diff: { key: "gitDiff" },
    show: { key: "gitDiff" },
    log: { key: "gitHistory" },
    blame: { key: "gitHistory" },
    reflog: { key: "gitHistory" },
    add: { key: "gitStage" },
    commit: { key: "gitCommit" },
    push: { key: "gitPush" },
    pull: { key: "gitPull" },
    fetch: { key: "gitPull" },
    checkout: { key: "gitBranch" },
    switch: { key: "gitBranch" },
    branch: { key: "gitBranch" },
    worktree: { key: "gitBranch" },
    clone: { key: "gitClone" },
    merge: { key: "gitMerge" },
    rebase: { key: "gitMerge" },
    "cherry-pick": { key: "gitMerge" },
    stash: { key: "gitStash" },
  }

  return subcommands[sub ?? ""] ?? { key: "run", params: { name: "git" } }
}

function basename(path: string) {
  return (
    path
      .replace(/^['"]|['"]$/g, "")
      .split(/[\\/]/)
      .at(-1) ?? path
  )
}
