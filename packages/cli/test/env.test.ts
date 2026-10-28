import { expect, test } from "bun:test"
import { Env } from "../src/env"

test("session environment omits server credentials", () => {
  const previousPassword = process.env.CONTEXTCODE_PASSWORD
  const previousLegacyPassword = process.env.CONTEXTCODE_SERVER_PASSWORD
  const previousValue = process.env.CONTEXTCODE_SESSION_ENV_TEST
  process.env.CONTEXTCODE_PASSWORD = "password"
  process.env.CONTEXTCODE_SERVER_PASSWORD = "legacy"
  process.env.CONTEXTCODE_SESSION_ENV_TEST = "included"

  const environment = Env.session()

  if (previousPassword === undefined) delete process.env.CONTEXTCODE_PASSWORD
  else process.env.CONTEXTCODE_PASSWORD = previousPassword
  if (previousLegacyPassword === undefined) delete process.env.CONTEXTCODE_SERVER_PASSWORD
  else process.env.CONTEXTCODE_SERVER_PASSWORD = previousLegacyPassword
  if (previousValue === undefined) delete process.env.CONTEXTCODE_SESSION_ENV_TEST
  else process.env.CONTEXTCODE_SESSION_ENV_TEST = previousValue

  expect(environment.CONTEXTCODE_PASSWORD).toBeUndefined()
  expect(environment.CONTEXTCODE_SERVER_PASSWORD).toBeUndefined()
  expect(environment.CONTEXTCODE_SESSION_ENV_TEST).toBe("included")
})
