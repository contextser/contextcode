import type { ContextCodeEvent } from "@contextcode/client"
import { useClient } from "./client"

type EventMetadata = {
  directory: string | undefined
}
type ContextCodeEventMap = { [Type in ContextCodeEvent["type"]]: Extract<ContextCodeEvent, { type: Type }> }

export function useEvent() {
  const client = useClient()

  function subscribe(handler: (event: ContextCodeEvent, metadata: EventMetadata) => void) {
    return client.event.listen(({ details }) => {
      if (details.type === "server.connected") return
      handler(details, { directory: details.location?.directory })
    })
  }

  function on<T extends ContextCodeEvent["type"]>(
    type: T,
    handler: (event: ContextCodeEventMap[T], metadata: EventMetadata) => void,
  ) {
    return client.event.on(type, (event) => {
      handler(event, { directory: event.location?.directory })
    })
  }

  return {
    subscribe,
    on,
  }
}
