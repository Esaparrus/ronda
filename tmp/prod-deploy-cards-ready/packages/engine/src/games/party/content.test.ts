import { describe, expect, it } from 'vitest';
import { COLOR_NAMES, COLOR_QUESTIONS } from './content.ts';

describe('banco de preguntas de Colores', () => {
  it('es amplio, variado y no repite identificadores', () => {
    const ids = COLOR_QUESTIONS.map((question) => question.id);
    const prompts = COLOR_QUESTIONS.map((question) => question.prompt);

    expect(COLOR_QUESTIONS.length).toBeGreaterThanOrEqual(800);
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

  it('mantiene bancos temáticos amplios y categorías válidas', () => {
    const minimumByCategory = {
      animacion: 400,
      series: 30,
      cine: 40,
      banderas: 100,
      logos: 100,
      juegos: 50,
      cultura: 40,
    } as const;

    for (const [category, minimum] of Object.entries(minimumByCategory)) {
      const total = COLOR_QUESTIONS.filter((question) => question.category === category).length;
      expect(total, category).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('incluye detalles de personajes y decorados de series', () => {
    expect(COLOR_QUESTIONS.some((question) => question.id === 'simpsons-sofa-salon')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'friends-sofa-central-perk')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'himym-trompa-francesa')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'cars-chick-hicks')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'historia-coche-kennedy')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'bandera-mozambique-fusil')).toBe(true);
    expect(COLOR_QUESTIONS.some((question) => question.id === 'logo-google-segundo-o')).toBe(true);
  });
});
