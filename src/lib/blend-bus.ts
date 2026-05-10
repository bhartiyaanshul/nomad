// Module-level singleton wrapping a Node EventEmitter. All blend events for
// every group flow through this one bus, fan-out happens via groupId-keyed
// listeners. Survives HMR via globalThis.

import { EventEmitter } from "node:events";

type BlendEventType =
  | "candidate_added"
  | "candidate_removed"
  | "vote_cast"
  | "itinerary_updated"
  | "member_joined"
  | "finalized";

export interface BlendEvent {
  groupId: string;
  type: BlendEventType;
  payload?: unknown;
  ts: number;
}

const globalForBlend = globalThis as unknown as { traveloopBlend?: EventEmitter };
const bus = globalForBlend.traveloopBlend ?? new EventEmitter();
bus.setMaxListeners(0); // many concurrent SSE streams across groups
globalForBlend.traveloopBlend = bus;

function topic(groupId: string): string {
  return `blend:${groupId}`;
}

export function publish(event: BlendEvent): void {
  bus.emit(topic(event.groupId), event);
}

export interface Subscription {
  unsubscribe(): void;
}

export function subscribe(
  groupId: string,
  listener: (event: BlendEvent) => void,
): Subscription {
  const t = topic(groupId);
  bus.on(t, listener);
  return {
    unsubscribe() {
      bus.off(t, listener);
    },
  };
}
