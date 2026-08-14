import { describe, expect, it } from 'vitest';
import { COLOR_NAMES, COLOR_QUESTIONS } from './content.ts';

describe('banco de preguntas de Colores', () => {
  it('es amplio, variado y no repite identificadores', () => {
    const ids = COLOR_QUESTIONS.map((question) => question.id);
    const prompts = COLOR_QUESTIONS.map((question) => question.prompt);

    expect(COLOR_QUESTIONS.length).toBeGreaterThanOrEqual(600);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('solo admite una respuesta disponible en el selector', () => {
    const validColors = new Set<string>(COLOR_NAMES);

    for (const question of COLOR_QUESTIONS) {
      expect(question.allowMultiple, question.id).toBe(false);
      expect(question.correctColors, question.id).toHaveLength(1);
      expect(question.correctColors.every((color) => validColors.has(color)), question.id).toBe(true);
    }
  });

  it('incluye detalles de personajes y decorados de series', () => {
    expect(COLOR_QUESTIONS.some((question) => question.id === 'simpsons-sofa-salon')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'friends-sofa-central-perk')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'himym-trompa-francesa')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'cars-chick-hicks')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'historia-coche-kennedy')).toBe(true);
  });
});
