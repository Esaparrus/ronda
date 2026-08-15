export const CREATE_ROOM_WAIT_SECONDS = 90;
export const LOADING_MESSAGE_INTERVAL_SECONDS = 4;

export const CREATE_ROOM_LOADING_MESSAGES = [
  'Poniendo el tapete…',
  'Barajando las cartas…',
  'Pidiendo algo en la barra…',
  'Buscando una mesa que no cojee…',
  'Sacando los garbanzos para el tanteo…',
  'Haciendo hueco entre las tapas…',
  'Preguntando quién reparte…',
  'Apuntando la ronda en la libreta…',
] as const;

export interface CreateLoadingSnapshot {
  message: (typeof CREATE_ROOM_LOADING_MESSAGES)[number];
  remainingSeconds: number;
}

export function createLoadingSnapshot(elapsedSeconds: number): CreateLoadingSnapshot {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  const messageIndex =
    Math.floor(elapsed / LOADING_MESSAGE_INTERVAL_SECONDS) % CREATE_ROOM_LOADING_MESSAGES.length;

  return {
    message: CREATE_ROOM_LOADING_MESSAGES[messageIndex] ?? CREATE_ROOM_LOADING_MESSAGES[0],
    remainingSeconds: Math.max(0, CREATE_ROOM_WAIT_SECONDS - elapsed),
  };
}
