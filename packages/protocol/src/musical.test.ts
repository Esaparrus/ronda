import { describe, expect, it } from 'vitest';
import { musicalArtistCandidates, musicalArtistMatches, musicalTextMatches } from './musical.ts';

describe('musicalArtistMatches', () => {
  it('acepta cualquiera de los artistas acreditados', () => {
    expect(musicalArtistMatches('Aitana', 'Aitana & Sebastián Yatra')).toBe(true);
    expect(musicalArtistMatches('Sebastian Yatra', 'Aitana & Sebastián Yatra')).toBe(true);
    expect(musicalArtistMatches('Aitana & Sebastián Yatra', 'Aitana & Sebastián Yatra')).toBe(true);
  });

  it('entiende créditos con feat y mantiene fuera a artistas distintos', () => {
    expect(musicalArtistMatches('Dua Lipa', 'Dua Lipa feat. Elton John')).toBe(true);
    expect(musicalArtistMatches('Elton John', 'Dua Lipa feat. Elton John')).toBe(true);
    expect(musicalArtistMatches('Adele', 'Dua Lipa feat. Elton John')).toBe(false);
  });

  it('conserva el nombre completo y sus partes como candidatos', () => {
    expect(musicalArtistCandidates('Artist A, Artist B')).toEqual([
      'artist a artist b',
      'artist a',
      'artist b',
    ]);
  });
});

describe('musicalTextMatches', () => {
  it('acepta una palabra reconocible o una parte suficiente del título', () => {
    expect(musicalTextMatches('Bohemian', 'Bohemian Rhapsody')).toBe(true);
    expect(musicalTextMatches('Rolling Deep', 'Rolling in the Deep')).toBe(true);
    expect(musicalTextMatches('rhapsod', 'Bohemian Rhapsody')).toBe(true);
  });

  it('tolera tildes y pequeños errores, pero no conectores aislados', () => {
    expect(musicalTextMatches('Beyonce', 'Beyoncé')).toBe(true);
    expect(musicalTextMatches('Queeen', 'Queen')).toBe(true);
    expect(musicalTextMatches('the', 'The Beatles')).toBe(false);
    expect(musicalTextMatches('Otra', 'Bohemian Rhapsody')).toBe(false);
  });
});
