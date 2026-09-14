#!/usr/bin/env node
// Genera los PNG de los iconos PWA a partir de los SVG propios de
// public/icons/source/. Contrato P10: "iconos 192/512 y maskable generados
// como SVG→PNG propios".
//
// Requiere ImageMagick (`convert`) instalado en el sistema — es una
// herramienta de sistema, no una dependencia npm del proyecto, así que no
// hace falta para `pnpm dev`/`pnpm build`: los PNG ya generados se versionan
// en public/icons/. Solo hace falta volver a correr este script si se toca
// el SVG de origen.
//
// Nota de tipografía: los SVG piden 'Familjen Grotesk' primero y 'Poppins'
// como alternativa. Si la máquina donde se genera no tiene Familjen Grotesk
// instalada como fuente de sistema, el renderizador cae a Poppins (u otra
// sans disponible) para el PNG estático — la app en el navegador sí carga la
// tipografía real vía next/font/google; esto solo afecta al icono congelado.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(here, '..', 'public', 'icons');
const sourceDir = join(iconsDir, 'source');

const targets = [
  { source: 'icon.svg', out: 'icon-192.png', size: 192 },
  { source: 'icon.svg', out: 'icon-512.png', size: 512 },
  { source: 'icon-maskable.svg', out: 'icon-maskable-192.png', size: 192 },
  { source: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
];

function assertImageMagick() {
  try {
    execFileSync('convert', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error(
      'Falta ImageMagick ("convert"). Instálalo (p.ej. `apt install imagemagick` o `brew install imagemagick`) y vuelve a intentarlo.',
    );
    process.exit(1);
  }
}

function main() {
  assertImageMagick();
  if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

  for (const t of targets) {
    const src = join(sourceDir, t.source);
    const out = join(iconsDir, t.out);
    execFileSync('convert', ['-background', 'none', src, '-resize', `${t.size}x${t.size}`, out]);
    console.log(`generado ${t.out} (${t.size}x${t.size})`);
  }
}

main();
