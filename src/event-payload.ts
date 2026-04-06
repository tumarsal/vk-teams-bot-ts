import type { Client } from "./client.js";
import { ButtonResponse } from "./button.js";
import { messageFromBase } from "./message.js";
import type { Message } from "./message.js";
import type { ChatPayload, Contact, EventPayloadData, EventType } from "./types.js";
import { Chat } from "./chat.js";

function wireChat(client: Client, chat: ChatPayload): void {
  (chat as Chat).client = client;
}

function wirePayload(client: Client, data: EventPayloadData): void {
  wireChat(client, data.chat);
  if (data.message?.chat) wireChat(client, data.message.chat);
}

export class EventPayload {
  constructor(
    private readonly client: Client,
    readonly data: EventPayloadData
  ) {
    wirePayload(client, data);
  }

  get msgId(): string | undefined {
    return this.data.msgId;
  }
  get chat(): Chat {
    return this.data.chat as Chat;
  }
  get from(): Contact | undefined {
    return this.data.from;
  }
  get text(): string | undefined {
    return this.data.text;
  }
  get timestamp(): number {
    return this.data.timestamp;
  }
  get parts(): import("./types.js").Part[] | undefined {
    return this.data.parts;
  }
  get queryId(): string | undefined {
    return this.data.queryId;
  }
  get callbackData(): string | undefined {
    return this.data.callbackData;
  }
  get leftMembers(): Contact[] | undefined {
    return this.data.leftMembers;
  }
  get newMembers(): Contact[] | undefined {
    return this.data.newMembers;
  }

  message(): Message {
    return messageFromBase(this.client, this.data);
  }

  callbackMessage(): Message {
    if (!this.data.message) {
      throw new Error("no callback message in payload");
    }
    return messageFromBase(this.client, this.data.message);
  }

  callbackQuery(): ButtonResponse {
    return new ButtonResponse(
      this.client,
      this.data.queryId ?? "",
      "",
      "",
      false,
      this.data.callbackData ?? ""
    );
  }
}

export class Event {
  constructor(
    readonly client: Client,
    readonly eventId: number,
    readonly type: EventType,
    readonly payload: EventPayload
  ) {}
}
