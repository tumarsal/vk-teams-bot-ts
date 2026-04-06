export type EventType =
  | "newMessage"
  | "editedMessage"
  | "deletedMessage"
  | "pinnedMessage"
  | "unpinnedMessage"
  | "newChatMembers"
  | "leftChatMembers"
  | "callbackQuery";

export const NEW_MESSAGE: EventType = "newMessage";
export const EDITED_MESSAGE: EventType = "editedMessage";
export const DELETED_MESSAGE: EventType = "deletedMessage";
export const PINNED_MESSAGE: EventType = "pinnedMessage";
export const UNPINNED_MESSAGE: EventType = "unpinnedMessage";
export const NEW_CHAT_MEMBERS: EventType = "newChatMembers";
export const LEFT_CHAT_MEMBERS: EventType = "leftChatMembers";
export const CALLBACK_QUERY: EventType = "callbackQuery";

export type PartType = "sticker" | "mention" | "voice" | "file" | "forward" | "reply";

export const PART_STICKER: PartType = "sticker";
export const PART_MENTION: PartType = "mention";
export const PART_VOICE: PartType = "voice";
export const PART_FILE: PartType = "file";
export const PART_FORWARD: PartType = "forward";
export const PART_REPLY: PartType = "reply";

export interface ApiResponse {
  ok: boolean;
  description?: string;
}

export interface Thread {
  threadId: string;
}

export interface UserState {
  lastseen: number;
}

export interface Subscriber {
  sn: string;
  userState: UserState;
}

export interface ThreadSubscribers {
  cursor: string;
  subscribers: Subscriber[];
}

export interface Photo {
  url: string;
}

export interface User {
  userId: string;
}

export interface BotInfo extends User {
  nick: string;
  firstName: string;
  about: string;
  photo: Photo[];
}

export interface ChatMember extends User {
  creator: boolean;
  admin: boolean;
}

export interface UsersListResponse {
  users: User[];
}

export interface MembersListResponse {
  members: ChatMember[];
}

export interface AdminsListResponse {
  admins: ChatMember[];
}

export interface Contact extends User {
  firstName: string;
  lastName: string;
}

export interface ParentMessage {
  chatId: string;
  messageId: number;
  type: string;
}

export type ChatType = "private" | "group" | "channel";

export const Private: ChatType = "private";
export const Group: ChatType = "group";
export const Channel: ChatType = "channel";

/** Поля чата из API без `client` и методов; класс `Chat` с ним структурно совместим */
export interface ChatPayload {
  chatId: string;
  type?: ChatType;
  firstName?: string;
  lastName?: string;
  nick?: string;
  about?: string;
  rules?: string;
  title?: string;
  isBot?: boolean;
  public?: boolean;
  joinModeration?: boolean;
  inviteLink?: string;
}

export interface BaseEventPayload {
  msgId?: string;
  chat: ChatPayload;
  from?: Contact;
  text?: string;
  timestamp: number;
  parent_topic?: ParentMessage;
}

export interface PartMessage {
  from: Contact;
  msgId: string;
  text: string;
  timestamp: number;
}

export interface PartPayload {
  firstName?: string;
  lastName?: string;
  userId?: string;
  fileId?: string;
  caption?: string;
  type?: string;
  message: PartMessage;
}

export interface Part {
  type: PartType;
  payload: PartPayload;
}

/** Сырые данные payload из API (до привязки client) */
export interface EventPayloadData extends BaseEventPayload {
  parts?: Part[];
  queryId?: string;
  message?: BaseEventPayload;
  callbackData?: string;
  leftMembers?: Contact[];
  newMembers?: Contact[];
  addedBy?: Contact;
  removedBy?: Contact;
}

export interface EventsApiResponse {
  ok: boolean;
  events: RawEvent[];
}

/** Событие как приходит из JSON */
export interface RawEvent {
  eventId: number;
  type: EventType;
  payload: EventPayloadData;
}
