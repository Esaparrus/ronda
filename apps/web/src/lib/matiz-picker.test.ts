import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('Matiz hue picker', () => {
  it('ends at 359 degrees so the right edge cannot wrap back to 0', () => {
    const source = readFileSync(join(here, '../components/matiz/MatizGame.tsx'), 'utf8');

    expect(source).toMatch(/label="(?:Color|Tono)"[\s\S]*?max=\{359\}/);
    expect(source).not.toMatch(/label="(?:Color|Tono)"[\s\S]*?max=\{360\}/);
  });
});
