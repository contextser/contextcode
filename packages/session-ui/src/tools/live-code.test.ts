import { describe, expect, test } from "bun:test"
import type { SessionMessageAssistantTool } from "@contextcode/client/promise"
import { liveCode, partialStrings } from "./live-code"

const streaming = (name: string, input: string) =>
  ({
    type: "tool",
    id: "call_1",
    name,
    time: { created: 0 },
    state: { status: "streaming", input },
  }) as SessionMessageAssistantTool

describe("partialStrings", () => {
  test("reads a string value that is still streaming, with its escapes decoded", () => {
    expect(partialStrings('{"path":"src/a.ts","content":"const a = \\"x\\"\\n\\tret')).toEqual({
      path: "src/a.ts",
      content: 'const a = "x"\n\tret',
    })
  })

  test("waits for an escape split across deltas", () => {
    expect(partialStrings('{"content":"line\\')).toEqual({ content: "line" })
    expect(partialStrings('{"content":"caf\\u00')).toEqual({ content: "caf" })
    expect(partialStrings('{"content":"caf\\u00e9"}')).toEqual({ content: "café" })
  })

  test("finds a key after non-string values and ignores look-alike text inside strings", () => {
    expect(partialStrings('{"replaceAll":true,"lines":[1,{"a":"}"}],"newString":"x \\"path\\": \\"y"')).toEqual({
      newString: 'x "path": "y',
    })
  })
})

describe("liveCode", () => {
  test("follows the file a patch is currently writing", () => {
    const patch = "*** Begin Patch\\n*** Add File: a.ts\\n+one\\n*** Update File: src/b.ts\\n@@\\n-old\\n+new"

    expect(liveCode(streaming("patch", `{"patchText":"${patch}`))).toMatchObject({ mode: "patch", path: "src/b.ts" })
  })

  test("shows an edit's replacement text", () => {
    expect(liveCode(streaming("edit", '{"path":"a.ts","oldString":"a","newString":"b'))).toEqual({
      mode: "edit",
      path: "a.ts",
      code: "b",
    })
  })
})
