export type BotOptions = {
  /** По умолчанию https://api.icq.net/bot/v1 */
  apiUrl?: string;
  debug?: boolean;
  /** Кастомный fetch (например, с прокси или таймаутами) */
  fetch?: typeof fetch;
};

export function resolveOptions(opts: BotOptions | undefined): {
  apiUrl: string;
  debug: boolean;
  fetch: typeof fetch;
} {
  return {
    apiUrl: opts?.apiUrl ?? "https://api.icq.net/bot/v1",
    debug: opts?.debug ?? false,
    fetch: opts?.fetch ?? globalThis.fetch.bind(globalThis),
  };
}
