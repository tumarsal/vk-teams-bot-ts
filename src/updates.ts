import type { Client } from "./client.js";
import type { Logger } from "./client.js";
import { Event } from "./event-payload.js";
import { Message } from "./message.js";
import { Chat } from "./chat.js";
import type { EventPayload } from "./event-payload.js";
import type { PartMessage } from "./types.js";

const sleepTimeMs = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Updater {
  lastEventId = 0;
  pollTime: number;

  constructor(
    private readonly client: Client,
    pollTime: number,
    private readonly logger: Logger
  ) {
    this.pollTime = pollTime === 0 ? 60 : pollTime;
  }

  newMessageFromPayload(message: EventPayload): Message {
    const from = message.from;
    const m = new Message();
    m.client = this.client;
    m.msgId = message.msgId ?? "";
    m.chat = new Chat();
    m.chat.client = this.client;
    if (from) {
      m.chat.chatId = from.userId;
      m.chat.title = from.firstName;
    }
    m.text = message.text ?? "";
    m.timestamp = message.timestamp;
    return m;
  }

  async getLastEvents(pollTime: number): Promise<Event[]> {
    return this.getLastEventsWithContext(undefined, pollTime);
  }

  async getLastEventsWithContext(
    signal: AbortSignal | undefined,
    pollTime: number
  ): Promise<Event[]> {
    const events = await this.client.getEvents(this.lastEventId, pollTime, signal);
    if (events.length > 0) {
      this.lastEventId = events[events.length - 1]!.eventId;
    }
    return events;
  }

  async *runUpdatesCheck(signal?: AbortSignal): AsyncGenerator<Event> {
    try {
      await this.getLastEventsWithContext(signal, 0);
    } catch (err) {
      this.logger.debug?.("cannot make initial request to events", err);
    }

    while (!signal?.aborted) {
      try {
        const events = await this.getLastEventsWithContext(signal, this.pollTime);
        for (const ev of events) {
          yield ev;
        }
      } catch (err) {
        this.logger.error?.(
          `Failed to get updates, retrying in ${sleepTimeMs / 1000}s ...`,
          err
        );
        await sleep(sleepTimeMs);
      }
    }
  }
}
