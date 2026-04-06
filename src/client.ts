import { chatFromRaw, type ChatAction, Chat } from "./chat.js";
import type { BotInfo } from "./types.js";
import type {
  AdminsListResponse,
  MembersListResponse,
  Thread,
  ThreadSubscribers,
  UsersListResponse,
} from "./types.js";
import type { FileInfo } from "./file.js";
import type { ChatMember, Contact, User } from "./types.js";
import { Message, readUploadBlob, type MessageUploadSource } from "./message.js";
import type { Keyboard } from "./keyboard.js";
import type { ButtonResponse } from "./button.js";
import type { EventPayloadData } from "./types.js";
import type { BaseEventPayload } from "./types.js";
import { Event, EventPayload } from "./event-payload.js";
import type { RawEvent } from "./types.js";

export type Logger = {
  debug?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

function keyboardJson(kb: Keyboard | undefined): string | undefined {
  if (!kb) return undefined;
  return JSON.stringify(kb.getKeyboard());
}

function parseContact(raw: unknown): Contact {
  const r = raw as Record<string, unknown>;
  return {
    userId: String(r.userId ?? ""),
    firstName: String(r.firstName ?? ""),
    lastName: String(r.lastName ?? ""),
  };
}

function parseBasePayload(raw: Record<string, unknown>, client: Client): BaseEventPayload {
  return {
    msgId: raw.msgId != null ? String(raw.msgId) : undefined,
    chat: chatFromRaw((raw.chat as Record<string, unknown>) ?? {}, client),
    from: raw.from !== undefined ? parseContact(raw.from) : undefined,
    text: raw.text !== undefined ? String(raw.text) : undefined,
    timestamp: Number(raw.timestamp ?? 0),
    parent_topic: raw.parent_topic as BaseEventPayload["parent_topic"],
  };
}

function parseEventPayloadData(raw: Record<string, unknown>, client: Client): EventPayloadData {
  const base = parseBasePayload(raw, client);
  const data: EventPayloadData = {
    ...base,
    parts: raw.parts as EventPayloadData["parts"],
    queryId: raw.queryId != null ? String(raw.queryId) : undefined,
    callbackData: raw.callbackData != null ? String(raw.callbackData) : undefined,
    leftMembers: raw.leftMembers as Contact[] | undefined,
    newMembers: raw.newMembers as Contact[] | undefined,
    addedBy: raw.addedBy !== undefined ? parseContact(raw.addedBy) : undefined,
    removedBy: raw.removedBy !== undefined ? parseContact(raw.removedBy) : undefined,
  };
  if (raw.message && typeof raw.message === "object") {
    data.message = parseBasePayload(raw.message as Record<string, unknown>, client);
  }
  return data;
}

export class Client {
  constructor(
    readonly baseUrl: string,
    readonly token: string,
    readonly fetchImpl: typeof fetch,
    readonly logger: Logger
  ) {}

  private logDebug(...args: unknown[]): void {
    this.logger.debug?.(...args);
  }

  private logError(...args: unknown[]): void {
    this.logger.error?.(...args);
  }

  async do(
    path: string,
    params: URLSearchParams,
    file?: MessageUploadSource | null,
    signal?: AbortSignal
  ): Promise<ArrayBuffer> {
    const url = new URL(this.baseUrl.replace(/\/$/, "") + path);
    params.set("token", this.token);
    url.search = params.toString();
    this.logDebug("requesting api", url.toString());

    const init: RequestInit = file
      ? {
          method: "POST",
          body: await this.buildMultipartBody(file),
          signal,
        }
      : { method: "GET", signal };

    const res = await this.fetchImpl(url.toString(), init);
    return this.handleResponse(res);
  }

  private async buildMultipartBody(file: MessageUploadSource): Promise<FormData> {
    const { blob, filename } = await readUploadBlob(file);
    const fd = new FormData();
    fd.append("file", blob, filename);
    return fd;
  }

  private async handleResponse(res: Response): Promise<ArrayBuffer> {
    const body = await res.arrayBuffer();
    const text = new TextDecoder().decode(body);
    this.logDebug("got response from API", text);

    if (!res.ok) {
      throw new Error(`error status from API: ${res.status} ${res.statusText}`);
    }

    let parsed: { ok?: boolean; description?: string };
    try {
      parsed = JSON.parse(text) as { ok?: boolean; description?: string };
    } catch {
      throw new Error("cannot parse json");
    }

    if (parsed.ok === false) {
      throw new Error(`error status from API: ${parsed.description ?? "unknown"}`);
    }

    return body;
  }

  async autosubscribeToThreads(
    chatId: string,
    enable: boolean,
    withExisting: boolean
  ): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const p = new URLSearchParams({
      chatId,
      enable: String(enable),
      withExisting: String(withExisting),
    });
    await this.do("/threads/autosubscribe", p, null);
  }

  async addThread(chatId: string, msgId: string): Promise<Thread> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (!msgId) throw new Error("msgID cannot be empty");
    const buf = await this.do("/threads/add", new URLSearchParams({ chatId, msgId }), null);
    return JSON.parse(new TextDecoder().decode(buf)) as Thread;
  }

  async getThreadSubscribers(
    threadId: string,
    cursor: string,
    pageSize: number
  ): Promise<ThreadSubscribers> {
    if (!threadId) throw new Error("threadID cannot be empty");
    const p = new URLSearchParams({ threadId });
    if (cursor) p.set("cursor", cursor);
    if (pageSize > 0) p.set("pageSize", String(pageSize));
    const buf = await this.do("/threads/subscribers/get", p, null);
    return JSON.parse(new TextDecoder().decode(buf)) as ThreadSubscribers;
  }

  async getInfo(): Promise<BotInfo> {
    const buf = await this.do("/self/get", new URLSearchParams(), null);
    return JSON.parse(new TextDecoder().decode(buf)) as BotInfo;
  }

  async getChatInfo(chatId: string): Promise<Chat> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const buf = await this.do("/chats/getInfo", new URLSearchParams({ chatId }), null);
    const raw = JSON.parse(new TextDecoder().decode(buf)) as Record<string, unknown>;
    const chat = chatFromRaw(raw, this);
    chat.chatId = chatId;
    return chat;
  }

  async sendChatActions(chatId: string, ...actions: ChatAction[]): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (actions.length === 0) throw new Error("actions cannot be empty");
    const seen = new Set<string>();
    const filtered: string[] = [];
    for (const a of actions) {
      if (!seen.has(a)) {
        seen.add(a);
        filtered.push(a);
      }
    }
    const p = new URLSearchParams({ chatId });
    for (const a of filtered) p.append("actions", a);
    await this.do("/chats/sendActions", p, null);
  }

  async getChatAdmins(chatId: string): Promise<ChatMember[]> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const buf = await this.do("/chats/getAdmins", new URLSearchParams({ chatId }), null);
    const r = JSON.parse(new TextDecoder().decode(buf)) as AdminsListResponse;
    return r.admins;
  }

  async getChatMembers(chatId: string): Promise<ChatMember[]> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const buf = await this.do("/chats/getMembers", new URLSearchParams({ chatId }), null);
    const r = JSON.parse(new TextDecoder().decode(buf)) as MembersListResponse;
    return r.members;
  }

  async getChatBlockedUsers(chatId: string): Promise<User[]> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const buf = await this.do("/chats/getBlockedUsers", new URLSearchParams({ chatId }), null);
    const r = JSON.parse(new TextDecoder().decode(buf)) as UsersListResponse;
    return r.users;
  }

  async getChatPendingUsers(chatId: string): Promise<User[]> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const buf = await this.do("/chats/getPendingUsers", new URLSearchParams({ chatId }), null);
    const r = JSON.parse(new TextDecoder().decode(buf)) as UsersListResponse;
    return r.users;
  }

  async blockChatUser(
    chatId: string,
    userId: string,
    deleteLastMessages: boolean
  ): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (!userId) throw new Error("userID cannot be empty");
    const buf = await this.do(
      "/chats/blockUser",
      new URLSearchParams({
        chatId,
        userId,
        delLastMessages: String(deleteLastMessages),
      }),
      null
    );
    JSON.parse(new TextDecoder().decode(buf)) as UsersListResponse;
  }

  async unblockChatUser(chatId: string, userId: string): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (!userId) throw new Error("userID cannot be empty");
    const buf = await this.do("/chats/unblockUser", new URLSearchParams({ chatId, userId }), null);
    JSON.parse(new TextDecoder().decode(buf)) as UsersListResponse;
  }

  async resolveChatPending(
    chatId: string,
    userId: string,
    approve: boolean,
    everyone: boolean
  ): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    const p = new URLSearchParams({ chatId, approve: String(approve) });
    if (everyone) p.set("everyone", "true");
    else p.set("userId", userId);
    await this.do("/chats/resolvePending", p, null);
  }

  async deleteChatMembers(chatId: string, members: string[]): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (members.length === 0) throw new Error("members list cannot be empty");
    const membersJSON = JSON.stringify(members.map((sn) => ({ sn })));
    await this.do(
      "/chats/members/delete",
      new URLSearchParams({ chatId, members: membersJSON }),
      null
    );
  }

  async addChatMembers(chatId: string, members: string[]): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (members.length === 0) throw new Error("members list cannot be empty");
    const membersJSON = JSON.stringify(members.map((sn) => ({ sn })));
    await this.do(
      "/chats/members/add",
      new URLSearchParams({ chatId, members: membersJSON }),
      null
    );
  }

  async setChatTitle(chatId: string, title: string): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    if (!title) throw new Error("title cannot be empty");
    await this.do("/chats/setTitle", new URLSearchParams({ chatId, title }), null);
  }

  async setChatAbout(chatId: string, about: string): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    await this.do("/chats/setAbout", new URLSearchParams({ chatId, about }), null);
  }

  async setChatRules(chatId: string, rules: string): Promise<void> {
    if (!chatId) throw new Error("chatID cannot be empty");
    await this.do("/chats/setRules", new URLSearchParams({ chatId, rules }), null);
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    if (!fileId) throw new Error("fileID cannot be empty");
    const buf = await this.do("/files/getInfo", new URLSearchParams({ fileId }), null);
    return JSON.parse(new TextDecoder().decode(buf)) as FileInfo;
  }

  getVoiceInfo(fileId: string): Promise<FileInfo> {
    return this.getFileInfo(fileId);
  }

  async sendTextMessage(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.text) throw new Error("text cannot be empty");
    const p = new URLSearchParams({
      chatId: message.chat.chatId,
      text: message.text,
      "request-id": message.requestID,
    });
    if (message.replyMsgId) p.set("replyMsgId", message.replyMsgId);
    if (message.forwardMsgId) {
      p.set("forwardMsgId", message.forwardMsgId);
      p.set("forwardChatId", message.forwardChatId);
    }
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    if (message.parseMode) p.set("parseMode", message.parseMode);
    const buf = await this.do("/messages/sendText", p, null);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async sendTextWithDeeplinkMessage(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.text) throw new Error("text cannot be empty");
    if (!message.deeplink) throw new Error("deeplink can't be empty for SendTextWithDeeplink");
    const p = new URLSearchParams({
      chatId: message.chat.chatId,
      text: message.text,
      "request-id": message.requestID,
    });
    if (message.replyMsgId) p.set("replyMsgId", message.replyMsgId);
    if (message.forwardMsgId) {
      p.set("forwardMsgId", message.forwardMsgId);
      p.set("forwardChatId", message.forwardChatId);
    }
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    p.set("deeplink", message.deeplink);
    if (message.parseMode) p.set("parseMode", message.parseMode);
    const buf = await this.do("/messages/sendTextWithDeeplink", p, null);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async editMessage(message: Message): Promise<void> {
    if (!message.msgId) throw new Error("message ID cannot be empty");
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.text) throw new Error("text cannot be empty");
    const p = new URLSearchParams({
      msgId: message.msgId,
      chatId: message.chat.chatId,
      text: message.text,
    });
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    if (message.parseMode) p.set("parseMode", message.parseMode);
    const buf = await this.do("/messages/editText", p, null);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async deleteMessage(message: Message): Promise<void> {
    if (!message.msgId) throw new Error("message ID cannot be empty");
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    await this.do(
      "/messages/deleteMessages",
      new URLSearchParams({ msgId: message.msgId, chatId: message.chat.chatId }),
      null
    );
  }

  async sendFileMessage(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.fileId) throw new Error("fileID cannot be empty");
    const p = new URLSearchParams({
      chatId: message.chat.chatId,
      caption: message.text,
      fileId: message.fileId,
    });
    if (message.replyMsgId) p.set("replyMsgId", message.replyMsgId);
    if (message.forwardMsgId) {
      p.set("forwardMsgId", message.forwardMsgId);
      p.set("forwardChatId", message.forwardChatId);
    }
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    if (message.parseMode) p.set("parseMode", message.parseMode);
    const buf = await this.do("/messages/sendFile", p, null);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async sendVoiceMessage(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.fileId) throw new Error("fileID cannot be empty");
    const p = new URLSearchParams({
      chatId: message.chat.chatId,
      caption: message.text,
      fileId: message.fileId,
    });
    if (message.replyMsgId) p.set("replyMsgId", message.replyMsgId);
    if (message.forwardMsgId) {
      p.set("forwardMsgId", message.forwardMsgId);
      p.set("forwardChatId", message.forwardChatId);
    }
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    const buf = await this.do("/messages/sendVoice", p, null);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async uploadFile(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.file) throw new Error("file cannot be nil");
    const p = new URLSearchParams({
      chatId: message.chat.chatId,
      caption: message.text,
    });
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    const buf = await this.do("/messages/sendFile", p, message.file);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async uploadVoice(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.file) throw new Error("file cannot be nil");
    const p = new URLSearchParams({
      chatId: message.chat.chatId,
      caption: message.text,
    });
    const kb = keyboardJson(message.inlineKeyboardMarkup);
    if (kb) p.set("inlineKeyboardMarkup", kb);
    const buf = await this.do("/messages/sendVoice", p, message.file);
    Object.assign(message, JSON.parse(new TextDecoder().decode(buf)));
  }

  async getEvents(lastEventId: number, pollTime: number, signal?: AbortSignal): Promise<Event[]> {
    const buf = await this.do(
      "/events/get",
      new URLSearchParams({
        lastEventId: String(lastEventId),
        pollTime: String(pollTime),
      }),
      null,
      signal
    );
    const parsed = JSON.parse(new TextDecoder().decode(buf)) as {
      ok?: boolean;
      events?: RawEvent[];
      description?: string;
    };
    const events: Event[] = [];
    for (const ev of parsed.events ?? []) {
      const payloadData = parseEventPayloadData(ev.payload as unknown as Record<string, unknown>, this);
      const ep = new EventPayload(this, payloadData);
      events.push(new Event(this, ev.eventId, ev.type, ep));
    }
    return events;
  }

  async pinMessage(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.msgId) throw new Error("message ID cannot be empty");
    await this.do(
      "/chats/pinMessage",
      new URLSearchParams({ chatId: message.chat.chatId, msgId: message.msgId }),
      null
    );
  }

  async unpinMessage(message: Message): Promise<void> {
    if (!message.chat.chatId) throw new Error("chatID cannot be empty");
    if (!message.msgId) throw new Error("message ID cannot be empty");
    await this.do(
      "/chats/unpinMessage",
      new URLSearchParams({ chatId: message.chat.chatId, msgId: message.msgId }),
      null
    );
  }

  async sendAnswerCallbackQuery(answer: ButtonResponse): Promise<void> {
    if (!answer.queryId) throw new Error("queryID cannot be empty");
    await this.do(
      "/messages/answerCallbackQuery",
      new URLSearchParams({
        queryId: answer.queryId,
        text: answer.text,
        url: answer.url,
        showAlert: String(answer.showAlert),
      }),
      null
    );
  }
}
