import type { Client } from "./client.js";
import type { ChatMember, User } from "./types.js";
import { Channel, Group, Private, type ChatType } from "./types.js";

export type ChatAction = string;

export const TypingAction: ChatAction = "typing";
export const LookingAction: ChatAction = "looking";

export class Chat {
  client?: Client;

  chatId = "";
  type?: ChatType;
  firstName = "";
  lastName = "";
  nick = "";
  about = "";
  rules = "";
  title = "";
  isBot = false;
  public = false;
  joinModeration = false;
  inviteLink = "";

  constructor(chatId?: string) {
    if (chatId !== undefined) this.chatId = chatId;
  }

  /** Как поле `ID` в Go: идентификатор чата */
  get id(): string {
    return this.chatId;
  }
  set id(v: string) {
    this.chatId = v;
  }

  resolveID(): string {
    if (this.type === Private) return this.nick || this.chatId;
    return this.chatId;
  }

  SendActions(...actions: ChatAction[]): Promise<void> {
    return this.client!.sendChatActions(this.resolveID(), ...actions);
  }

  GetAdmins(): Promise<ChatMember[]> {
    return this.client!.getChatAdmins(this.chatId);
  }

  GetMembers(): Promise<ChatMember[]> {
    return this.client!.getChatMembers(this.chatId);
  }

  GetBlockedUsers(): Promise<User[]> {
    return this.client!.getChatBlockedUsers(this.chatId);
  }

  GetPendingUsers(): Promise<User[]> {
    return this.client!.getChatPendingUsers(this.chatId);
  }

  DeleteMembers(members: string[]): Promise<void> {
    return this.client!.deleteChatMembers(this.chatId, members);
  }

  AddMembers(members: string[]): Promise<void> {
    return this.client!.addChatMembers(this.chatId, members);
  }

  BlockUser(userId: string, deleteLastMessages: boolean): Promise<void> {
    return this.client!.blockChatUser(this.chatId, userId, deleteLastMessages);
  }

  UnblockUser(userId: string): Promise<void> {
    return this.client!.unblockChatUser(this.chatId, userId);
  }

  ResolveJoinRequest(userId: string, accept: boolean): Promise<void> {
    return this.client!.resolveChatPending(this.chatId, userId, accept, false);
  }

  ResolveAllJoinRequests(accept: boolean): Promise<void> {
    return this.client!.resolveChatPending(this.chatId, "", accept, true);
  }

  SetTitle(title: string): Promise<void> {
    return this.client!.setChatTitle(this.chatId, title);
  }

  SetAbout(about: string): Promise<void> {
    return this.client!.setChatAbout(this.chatId, about);
  }

  SetRules(rules: string): Promise<void> {
    return this.client!.setChatRules(this.chatId, rules);
  }

  AddThread(msgId: string): Promise<import("./types.js").Thread> {
    return this.client!.addThread(this.chatId, msgId);
  }

  AutosubscribeToThreads(enable: boolean, withExisting: boolean): Promise<void> {
    return this.client!.autosubscribeToThreads(this.chatId, enable, withExisting);
  }
}

export function chatFromRaw(raw: Record<string, unknown>, client?: Client): Chat {
  const c = new Chat();
  c.client = client;
  c.chatId = String(raw.chatId ?? "");
  if (raw.type !== undefined) c.type = raw.type as ChatType;
  if (raw.firstName !== undefined) c.firstName = String(raw.firstName);
  if (raw.lastName !== undefined) c.lastName = String(raw.lastName);
  if (raw.nick !== undefined) c.nick = String(raw.nick);
  if (raw.about !== undefined) c.about = String(raw.about);
  if (raw.rules !== undefined) c.rules = String(raw.rules);
  if (raw.title !== undefined) c.title = String(raw.title);
  if (raw.isBot !== undefined) c.isBot = Boolean(raw.isBot);
  if (raw.public !== undefined) c.public = Boolean(raw.public);
  if (raw.joinModeration !== undefined) c.joinModeration = Boolean(raw.joinModeration);
  if (raw.inviteLink !== undefined) c.inviteLink = String(raw.inviteLink);
  return c;
}
