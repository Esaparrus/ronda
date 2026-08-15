import { describe, expect, it } from 'vitest';
import {
  CREATE_ROOM_LOADING_MESSAGES,
  CREATE_ROOM_WAIT_SECONDS,
  createLoadingSnapshot,
} from './create-loading';

describe('createLoadingSnapshot', () => {
  it('starts the countdown at the full wait and shows the first bar message', () => {
    expect(createLoadingSnapshot(0)).toEqual({
      message: 'Poniendo el tapete…',
      remainingSeconds: CREATE_ROOM_WAIT_SECONDS,
    });
  });

  it('changes the message every four seconds and cycles through the list', () => {
    expect(createLoadingSnapshot(4).message).toBe('Barajando las cartas…');
    expect(createLoadingSnapshot(CREATE_ROOM_LOADING_MESSAGES.length * 4).message).toBe(
      CREATE_ROOM_LOADING_MESSAGES[0],
    );
  });

  it('never shows a negative countdown', () => {
    expect(createLoadingSnapshot(CREATE_ROOM_WAIT_SECONDS + 20).remainingSeconds).toBe(0);
    expect(createLoadingSnapshot(-5).remainingSeconds).toBe(CREATE_ROOM_WAIT_SECONDS);
  });
});
