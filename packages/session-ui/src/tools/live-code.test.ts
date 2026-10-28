import { describe, expect, test } from "bun:test"
import type { SessionMessageAssistantTool } from "@contextcode/client/promise"
import { editContext, liveCode, partialStrings } from "./live-code"

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

describe("editContext", () => {
  test("places an edit in its file from the first hunk of the diff", () => {
    const patch = [
      "Index: a.ts",
      "--- a.ts",
      "+++ a.ts",
      "@@ -10,6 +10,6 @@",
      " const a = 1",
      " const b = 2",
      "-const c = 3",
      "+const c = 4",
      " const d = 5",
      " const e = 6",
      "",
    ].join("\n")
    const tool = {
      type: "tool",
      id: "edit_1",
      name: "edit",
      time: { created: 0 },
      state: { status: "completed", input: {}, metadata: { files: [{ file: "a.ts", patch }] }, content: [] },
    } as unknown as SessionMessageAssistantTool

    expect(editContext(tool)).toEqual({
      start: 10,
      before: ["const a = 1", "const b = 2"],
      removed: ["const c = 3"],
      after: ["const d = 5", "const e = 6"],
    })
  })
})
