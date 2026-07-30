// Criterio de aceptación literal de P15: "un test comprueba que este
// componente jamás lee `view.me` (no existe en `TableView`)".
//
// Doble garantía, deliberadamente:
//   1. Todos los componentes de /mesa tipan su prop `view` como `TableView`
//      (no la unión `PlayerView | TableView`), así que `view.me` ni
//      siquiera compila -- eso ya lo comprueba `pnpm -r typecheck`.
//   2. Este test, además, escanea el CÓDIGO FUENTE (comentarios aparte) de
//      cada componente de /mesa y falla si aparece la cadena `.me` como
//      acceso a propiedad. Es una comprobación en tiempo de test, no solo
//      de tipos, tal cual pide el contrato literalmente ("un test
//      comprueba").
//
// Se excluyen los comentarios antes de buscar: varios ficheros de este
// directorio EXPLICAN por qué no leen `view.me` citando esa misma cadena en
// prosa, lo que daría un falso positivo si se buscara sobre el texto crudo.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '') // bloque /* ... */
    .replace(/\/\/.*$/gm, ''); // línea // ...
}

function componentFiles(): string[] {
  return readdirSync(here).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
}

describe('/mesa nunca lee view.me', () => {
  const files = componentFiles();

  it('encuentra al menos los componentes esperados (red de seguridad: que el test no esté escaneando un directorio vacío)', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it.each(componentFiles())('%s no accede a `.me` como propiedad fuera de comentarios', (file) => {
    const raw = readFileSync(join(here, file), 'utf8');
    const code = stripComments(raw);
    expect(code).not.toMatch(/\.me\b/);
  });
});
