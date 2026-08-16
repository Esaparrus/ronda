import { describe, expect, it } from 'vitest';
import { CREATE_ROOM_LOADING_MESSAGES, createLoadingMessage } from './create-loading';

describe('createLoadingMessage', () => {
  it('empieza con una frase corta de bar', () => {
    expect(createLoadingMessage(0)).toBe('Poniendo una ronda…');
  });

  it('recorre todas las frases y vuelve a la primera', () => {
    expect(createLoadingMessage(1)).toBe('Sacando la baraja…');
    expect(createLoadingMessage(CREATE_ROOM_LOADING_MESSAGES.length)).toBe(
      CREATE_ROOM_LOADING_MESSAGES[0],
    );
  });

  it('tolera valores negativos y decimales', () => {
    expect(createLoadingMessage(-3)).toBe(CREATE_ROOM_LOADING_MESSAGES[0]);
    expect(createLoadingMessage(2.9)).toBe('Buscando una mesa libre…');
  });
});
