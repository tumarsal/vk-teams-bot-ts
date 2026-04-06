/** Расширения файлов, распознаваемые как голосовое сообщение */
export const voiceMessageSupportedExtensions: ReadonlySet<string> = new Set([
  ".aac",
  ".ogg",
  ".m4a",
]);

/** fileId голосовых сообщений в API начинается с этой буквы */
export const voiceMessageLeadingChar = "I";
