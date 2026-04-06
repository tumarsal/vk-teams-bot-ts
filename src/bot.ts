import type { BotOptions } from "./options.js";
import { resolveOptions } from "./options.js";
import { Client, type Logger } from "./client.js";
import { Updater } from "./updates.js";
import type { BotInfo } from "./types.js";
import type { Thread, ThreadSubscribers } from "./types.js";
import type { ChatMember, User } from "./types.js";
import type { PartMessage } from "./types.js";
import { Chat } from "./chat.js";
import type { ChatAction } from "./chat.js";
import {
  Deeplink,
  Message,
  OtherFile,
  Text,
  Voice,
  type MessageUploadSource,
} from "./message.js";
import { Keyboard } from "./keyboard.js";
import { ButtonResponse } from "./button.js";
import type { FileInfo } from "./file.js";
import { Event } from "./event-payload.js";

function createLogger(debug: boolean): Logger {
  if (!debug) {
    return {};
  }
  return {
    debug: (...args: unknown[]) => console.debug("[bot-ts]", ...args),
    error: (...args: unknown[]) => console.error("[bot-ts]", ...args),
  };
}

export class Bot {
  private readonly client: Client;
  private readonly updater: Updater;
  readonly info: BotInfo;

  constructor(client: Client, updater: Updater, info: BotInfo) {
    this.client = client;
    this.updater = updater;
    this.info = info;
  }

  autosubscribeToThreads(
    chatId: string,
    enable: boolean,
    withExisting: boolean
  ): Promise<void> {
    return this.client.autosubscribeToThreads(chatId, enable, withExisting);
  }

  addThread(chatId: string, msgId: string): Promise<Thread> {
    return this.client.addThread(chatId, msgId);
  }

  getThreadSubscribers(
    threadId: string,
    cursor: string,
    pageSize: number
  ): Promise<ThreadSubscribers> {
    return this.client.getThreadSubscribers(threadId, cursor, pageSize);
  }

  getInfo(): Promise<BotInfo> {
    return this.client.getInfo();
  }

  getChatInfo(chatId: string): Promise<Chat> {
    return this.client.getChatInfo(chatId);
  }

  sendChatActions(chatId: string, ...actions: ChatAction[]): Promise<void> {
    return this.client.sendChatActions(chatId, ...actions);
  }

  getChatAdmins(chatId: string): Promise<ChatMember[]> {
    return this.client.getChatAdmins(chatId);
  }

  getChatMembers(chatId: string): Promise<ChatMember[]> {
    return this.client.getChatMembers(chatId);
  }

  getChatBlockedUsers(chatId: string): Promise<User[]> {
    return this.client.getChatBlockedUsers(chatId);
  }

  getChatPendingUsers(chatId: string): Promise<User[]> {
    return this.client.getChatPendingUsers(chatId);
  }

  blockChatUser(
    chatId: string,
    userId: string,
    deleteLastMessages: boolean
  ): Promise<void> {
    return this.client.blockChatUser(chatId, userId, deleteLastMessages);
  }

  unblockChatUser(chatId: string, userId: string): Promise<void> {
    return this.client.unblockChatUser(chatId, userId);
  }

  deleteChatMembers(chatId: string, members: string[]): Promise<void> {
    return this.client.deleteChatMembers(chatId, members);
  }

  addChatMembers(chatId: string, members: string[]): Promise<void> {
    return this.client.addChatMembers(chatId, members);
  }

  resolveChatJoinRequests(
    chatId: string,
    userId: string,
    accept: boolean,
    everyone: boolean
  ): Promise<void> {
    return this.client.resolveChatPending(chatId, userId, accept, everyone);
  }

  setChatTitle(chatId: string, title: string): Promise<void> {
    return this.client.setChatTitle(chatId, title);
  }

  setChatAbout(chatId: string, about: string): Promise<void> {
    return this.client.setChatAbout(chatId, about);
  }

  setChatRules(chatId: string, rules: string): Promise<void> {
    return this.client.setChatRules(chatId, rules);
  }

  getFileInfo(fileId: string): Promise<FileInfo> {
    return this.client.getFileInfo(fileId);
  }

  getVoiceInfo(fileId: string): Promise<FileInfo> {
    return this.client.getVoiceInfo(fileId);
  }

  newMessage(chatId: string): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    return m;
  }

  newTextMessage(chatId: string, text: string): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.text = text;
    m.contentType = Text;
    return m;
  }

  newTextMessageWithRequestID(
    chatId: string,
    text: string,
    requestId: string
  ): Message {
    const m = this.newTextMessage(chatId, text);
    m.requestID = requestId;
    return m;
  }

  newInlineKeyboardMessage(
    chatId: string,
    text: string,
    keyboard: Keyboard
  ): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.text = text;
    m.contentType = Text;
    m.inlineKeyboardMarkup = keyboard;
    return m;
  }

  newDeeplinkMessage(
    chatId: string,
    text: string,
    keyboard: Keyboard,
    deeplink: string
  ): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.text = text;
    m.contentType = Deeplink;
    m.inlineKeyboardMarkup = keyboard;
    m.deeplink = deeplink;
    return m;
  }

  newFileMessage(chatId: string, file: MessageUploadSource): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.file = file;
    m.contentType = OtherFile;
    return m;
  }

  newFileMessageByFileID(chatId: string, fileId: string): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.fileId = fileId;
    m.contentType = OtherFile;
    return m;
  }

  newVoiceMessage(chatId: string, file: MessageUploadSource): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.file = file;
    m.contentType = Voice;
    return m;
  }

  newVoiceMessageByFileID(chatId: string, fileId: string): Message {
    const m = new Message();
    m.client = this.client;
    m.chat = new Chat(chatId);
    m.chat.client = this.client;
    m.fileId = fileId;
    m.contentType = Voice;
    return m;
  }

  newMessageFromPart(message: PartMessage): Message {
    const m = new Message();
    m.client = this.client;
    m.msgId = message.msgId;
    m.chat = new Chat();
    m.chat.client = this.client;
    m.chat.chatId = message.from.userId;
    m.chat.title = message.from.firstName;
    m.text = message.text;
    m.timestamp = message.timestamp;
    return m;
  }

  newButtonResponse(
    queryId: string,
    url: string,
    text: string,
    showAlert: boolean
  ): ButtonResponse {
    return new ButtonResponse(this.client, queryId, url, text, showAlert);
  }

  newChat(id: string): Chat {
    const c = new Chat(id);
    c.client = this.client;
    return c;
  }

  async sendMessage(message: Message): Promise<void> {
    message.client = this.client;
    return message.send();
  }

  editMessage(message: Message): Promise<void> {
    return this.client.editMessage(message);
  }

  /** Асинхронная итерация событий (аналог GetUpdatesChannel из Go) */
  getUpdatesIterator(signal?: AbortSignal): AsyncGenerator<Event> {
    return this.updater.runUpdatesCheck(signal);
  }
}

export async function newBot(token: string, opts?: BotOptions): Promise<Bot> {
  const o = resolveOptions(opts);
  const logger = createLogger(o.debug);
  const client = new Client(o.apiUrl, token, o.fetch, logger);
  const info = await client.getInfo();
  const updater = new Updater(client, 0, logger);
  return new Bot(client, updater, info);
}
