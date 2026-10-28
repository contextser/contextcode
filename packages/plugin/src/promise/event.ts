import type { ContextCodeEvent } from "@contextcode/client"
import type { SelectedEvent, SubscribeOptions } from "@contextcode/client/promise/api"

type EventType = Exclude<ContextCodeEvent["type"], "server.connected">

export interface EventDomain {
  readonly subscribe: <Type extends EventType = EventType>(
    options?: SubscribeOptions<Type>,
  ) => AsyncIterable<SelectedEvent<ContextCodeEvent, Type>>
}
