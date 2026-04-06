import type { Client } from "./client.js";

export type ButtonStyle = "primary" | "attention";

export const ButtonPrimary: ButtonStyle = "primary";
export const ButtonAttention: ButtonStyle = "attention";

export interface Button {
  text: string;
  url?: string;
  callbackData?: string;
  style?: ButtonStyle;
}

export function newURLButton(text: string, url: string): Button {
  return { text, url };
}

export function newCallbackButton(text: string, callbackData: string): Button {
  return { text, callbackData };
}

export function withStyle(button: Button, style: ButtonStyle): Button {
  return { ...button, style };
}

export class ButtonResponse {
  constructor(
    private readonly client: Client,
    public queryId: string,
    public url: string,
    public text: string,
    public showAlert: boolean,
    public callbackData = ""
  ) {}

  send(): Promise<void> {
    return this.client.sendAnswerCallbackQuery(this);
  }
}
