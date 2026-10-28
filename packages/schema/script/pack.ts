#!/usr/bin/env bun
import path from "node:path"
import { pack } from "@contextcode/script/pack"

await pack(path.resolve(import.meta.dir, ".."))
