import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import type { Client } from "./client.js";
import { Chat } from "./chat.js";
import type { Keyboard } from "./keyboard.js";
import { voiceMessageLeadingChar, voiceMessageSupportedExtensions } from "./voice.js";
import type { ParentMessage } from "./types.js";
import type { PartMessage } from "./types.js";

export type MessageContentType = "unknown" | "text" | "otherFile" | "voice" | "deeplink";

export const Unknown: MessageContentType = "unknown";
export const Text: MessageContentType = "text";
export const OtherFile: MessageContentType = "otherFile";
export const Voice: MessageContentType = "voice";
export const Deeplink: MessageContentType = "deeplink";

export type ParseMode = "HTML" | "MarkdownV2";

export const ParseModeHTML: ParseMode = "HTML";
export const ParseModeMarkdownV2: ParseMode = "MarkdownV2";

/** Файл для загрузки: путь в ФС или Blob/File с именем */
export type MessageUploadSource =
  | { path: string }
  | { blob: Blob; filename: string };

export class Message {
  client?: Client;
  contentType: MessageContentType = Unknown;

  msgId = "";
  /** Алиас к `msgId`, как поле `ID` в Go */
  get id(): string {
    return this.msgId;
  }
  set id(v: string) {
    this.msgId = v;
  }

  file?: MessageUploadSource;
  fileId = "";
  text = "";
  chat = new Chat();
  replyMsgId = "";
  forwardMsgId = "";
  forwardChatId = "";
  timestamp = 0;
  parent_topic?: ParentMessage;
  inlineKeyboardMarkup?: Keyboard;
  parseMode?: ParseMode;
  requestID = "";
  deeplink = "";

  attachNewFile(source: MessageUploadSource): void {
    this.file = source;
    this.contentType = OtherFile;
  }

  attachExistingFile(fileId: string): void {
    this.fileId = fileId;
    this.contentType = OtherFile;
  }

  attachNewVoice(source: MessageUploadSource): void {
    this.file = source;
    this.contentType = Voice;
  }

  attachExistingVoice(fileId: string): void {
    this.fileId = fileId;
    this.contentType = Voice;
  }

  appendParseMode(mode: ParseMode): void {
    this.parseMode = mode;
  }

  attachInlineKeyboard(keyboard: Keyboard): void {
    this.inlineKeyboardMarkup = keyboard;
  }

  async send(): Promise<void> {
    if (!this.client) {
      throw new Error("client is not inited, create message with constructor newMessage, newTextMessage, etc");
    }
    if (!this.chat.chatId) {
      throw new Error("message should have chat id");
    }

    const c = this.client;
    switch (this.contentType) {
      case Voice:
        if (this.fileId) return c.sendVoiceMessage(this);
        if (this.file) return c.uploadVoice(this);
        break;
      case OtherFile:
        if (this.fileId) return c.sendFileMessage(this);
        if (this.file) return c.uploadFile(this);
        break;
      case Text:
        return c.sendTextMessage(this);
      case Deeplink:
        return c.sendTextWithDeeplinkMessage(this);
      case Unknown:
        if (this.fileId) {
          if (this.fileId[0] === voiceMessageLeadingChar) {
            return c.sendVoiceMessage(this);
          }
          return c.sendFileMessage(this);
        }
        if (this.file) {
          const name =
            "path" in this.file ? basename(this.file.path) : this.file.filename;
          const ext = name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "";
          if (voiceMessageSupportedExtensions.has(ext)) {
            return c.uploadVoice(this);
          }
          return c.uploadFile(this);
        }
        if (this.text) {
          return c.sendTextMessage(this);
        }
        break;
    }

    throw new Error("cannot send message or file without data");
  }

  async edit(): Promise<void> {
    if (!this.msgId) throw new Error("cannot edit message without id");
    return this.client!.editMessage(this);
  }

  async delete(): Promise<void> {
    if (!this.msgId) throw new Error("cannot delete message without id");
    return this.client!.deleteMessage(this);
  }

  async reply(text: string): Promise<void> {
    if (!this.msgId) throw new Error("cannot reply to message without id");
    this.replyMsgId = this.msgId;
    this.text = text;
    return this.client!.sendTextMessage(this);
  }

  async forward(chatId: string): Promise<void> {
    if (!this.msgId) throw new Error("cannot forward message without id");
    this.forwardChatId = this.chat.chatId;
    this.forwardMsgId = this.msgId;
    this.chat.chatId = chatId;
    return this.client!.sendTextMessage(this);
  }

  async pin(): Promise<void> {
    if (!this.msgId) throw new Error("cannot pin message without id");
    return this.client!.pinMessage(this);
  }

  async unpin(): Promise<void> {
    if (!this.msgId) throw new Error("cannot unpin message without id");
    return this.client!.unpinMessage(this);
  }
}

export function messageFromBase(client: Client, msg: import("./types.js").BaseEventPayload): Message {
  const chat = msg.chat as Chat;
  chat.client = client;
  const m = new Message();
  m.client = client;
  m.msgId = msg.msgId ?? "";
  m.text = msg.text ?? "";
  m.chat = chat;
  m.timestamp = msg.timestamp;
  m.parent_topic = msg.parent_topic;
  return m;
}

export async function readUploadBlob(source: MessageUploadSource): Promise<{ blob: Blob; filename: string }> {
  if ("path" in source) {
    const buf = await readFile(source.path);
    const filename = basename(source.path);
    return { blob: new Blob([buf]), filename };
  }
  return { blob: source.blob, filename: source.filename };
}
