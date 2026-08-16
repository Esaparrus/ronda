export const LOADING_MESSAGE_INTERVAL_MS = 3_200;

export const CREATE_ROOM_LOADING_MESSAGES = [
  'Poniendo una ronda…',
  'Sacando la baraja…',
  'Buscando una mesa libre…',
  'Sirviendo algo fresquito…',
  'Que no falten aceitunas…',
  'Ahora mismo te atienden…',
] as const;

export function createLoadingMessage(messageNumber: number) {
  const safeNumber = Math.max(0, Math.floor(messageNumber));
  const messageIndex = safeNumber % CREATE_ROOM_LOADING_MESSAGES.length;
  return CREATE_ROOM_LOADING_MESSAGES[messageIndex] ?? CREATE_ROOM_LOADING_MESSAGES[0];
}
