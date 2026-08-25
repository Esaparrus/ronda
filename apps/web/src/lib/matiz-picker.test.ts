import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('Matiz hue picker', () => {
  const source = readFileSync(join(here, '../components/matiz/MatizGame.tsx'), 'utf8');

  it('ends at 359 degrees so the right edge cannot wrap back to 0', () => {
    expect(source).toMatch(/label="(?:Color|Tono)"[\s\S]*?max=\{359\}/);
    expect(source).not.toMatch(/label="(?:Color|Tono)"[\s\S]*?max=\{360\}/);
  });

  it('keeps the selected hue stable across the lossy HEX round trip', () => {
    expect(source).toContain('const [hue, setHue] = useState(decodedColor.h)');
    expect(source).toContain('({ ...decodedColor, h: hue })');
    expect(source).toContain('if (next.h !== undefined) setHue(nextColor.h)');
  });
});
