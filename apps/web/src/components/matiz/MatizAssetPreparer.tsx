'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MATIZ_COLOR_TOKENS, MATIZ_TOOL_TOKENS } from '@/lib/tokens';

interface Point {
  x: number;
  y: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function MatizAssetPreparer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalDataRef = useRef<ImageData | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [slug, setSlug] = useState('mi-reto');
  const [title, setTitle] = useState('Mi reto');
  const [seed, setSeed] = useState<Point | null>(null);
  const [targetColor, setTargetColor] = useState<Rgb | null>(null);
  const [previewColor, setPreviewColor] = useState<string>(MATIZ_COLOR_TOKENS.neutral);
  const [tolerance, setTolerance] = useState(36);
  const [connectedOnly, setConnectedOnly] = useState(true);
  const [mask, setMask] = useState<Uint8Array | null>(null);
  const [selectedPixels, setSelectedPixels] = useState(0);

  useEffect(() => {
    renderPreview(canvasRef.current, image, originalDataRef.current, mask, previewColor);
  }, [image, mask, previewColor]);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const nextImage = new window.Image();
    nextImage.onload = () => {
      const originalData = readImageData(nextImage);
      originalDataRef.current = originalData;
      setImage(nextImage);
      setFileName(file.name);
      setSlug(slugFromFilename(file.name));
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
      setSeed(null);
      setTargetColor(null);
      setMask(null);
      setSelectedPixels(0);
      URL.revokeObjectURL(objectUrl);
    };
    nextImage.onerror = () => URL.revokeObjectURL(objectUrl);
    nextImage.src = objectUrl;
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!image || !originalDataRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp(Math.floor(((event.clientX - rect.left) / rect.width) * image.naturalWidth), 0, image.naturalWidth - 1);
    const y = clamp(Math.floor(((event.clientY - rect.top) / rect.height) * image.naturalHeight), 0, image.naturalHeight - 1);
    const index = (y * image.naturalWidth + x) * 4;
    const pixels = originalDataRef.current.data;
    setSeed({ x, y });
    setTargetColor({ r: pixels[index] ?? 0, g: pixels[index + 1] ?? 0, b: pixels[index + 2] ?? 0 });
    setMask(null);
    setSelectedPixels(0);
  }

  function generateMask() {
    if (!image || !originalDataRef.current || !seed || !targetColor) return;
    const nextMask = selectMask(originalDataRef.current, image.naturalWidth, image.naturalHeight, seed, targetColor, tolerance, connectedOnly);
    setMask(nextMask);
    setSelectedPixels(nextMask.reduce((count, value) => count + (value ? 1 : 0), 0));
  }

  function downloadBase() {
    if (!image || !originalDataRef.current || !mask) return;
    const canvas = createBaseCanvas(originalDataRef.current, mask, image.naturalWidth, image.naturalHeight);
    downloadCanvas(canvas, `${safeSlug(slug)}-base.png`);
  }

  function downloadMask() {
    if (!image || !mask) return;
    const canvas = createMaskCanvas(mask, image.naturalWidth, image.naturalHeight);
    downloadCanvas(canvas, `${safeSlug(slug)}-mask.png`);
  }

  function downloadMetadata() {
    if (!image || !mask || !targetColor) return;
    const metadata = {
      id: safeSlug(slug),
      title: title.trim() || 'Mi reto',
      subtitle: 'Acierta con el color de la zona marcada',
      targetHex: rgbToHex(targetColor),
      asset: {
        image: `/games/matiz/${safeSlug(slug)}-base.png`,
        mask: `/games/matiz/${safeSlug(slug)}-mask.png`,
        width: image.naturalWidth,
        height: image.naturalHeight,
      },
    };
    downloadBlob(new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }), `${safeSlug(slug)}.json`);
  }

  const canGenerate = Boolean(image && seed && targetColor);
  const canDownload = Boolean(image && mask && targetColor);

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-5 pb-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/juegos/matiz" className="eyebrow text-oro">← Volver a Matiz</Link>
          <h1 className="mt-2 font-display text-36 leading-display text-hueso">Preparar un reto</h1>
          <p className="mt-2 max-w-2xl text-15 leading-relaxed text-humo">
            Sube una ilustración, toca el color que quieras ocultar y descarga la base y la máscara. Durante la partida solo se sustituirá esa zona.
          </p>
        </div>
        <span className="hidden rounded-2xl bg-oro/10 px-3 py-2 text-24 sm:block">🎨</span>
      </header>

      <section className="surface-panel flex flex-col gap-4 p-4">
        <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-linea bg-tinta px-4 text-center text-15 font-semibold text-hueso transition hover:border-oro">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} className="sr-only" />
          {fileName ? `Cambiar imagen · ${fileName}` : 'Elegir imagen PNG, JPG, WEBP o SVG'}
        </label>
        {image ? (
          <p className="text-13 text-humo">{image.naturalWidth} × {image.naturalHeight} píxeles · Toca directamente la zona que quieras convertir en objetivo.</p>
        ) : (
          <p className="text-13 text-humo">Consejo: elige una zona de color bastante uniforme. Puedes ampliar la tolerancia si el JPG tiene pequeñas variaciones.</p>
        )}
      </section>

      <section className="surface-panel overflow-hidden p-3">
        <div className="relative rounded-2xl bg-tinta">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`block max-h-[70vh] w-full object-contain ${image ? 'cursor-crosshair' : ''}`}
            aria-label="Previsualización de la imagen; toca un píxel para elegir el color objetivo"
          />
          {!image ? <p className="absolute inset-0 grid place-items-center p-8 text-center text-14 text-humo">La previsualización aparecerá aquí.</p> : null}
        </div>
        {seed && targetColor ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 px-1 text-13 text-humo">
            <span className="size-8 rounded-xl border-2 border-white shadow" style={{ backgroundColor: rgbToHex(targetColor) }} />
            <span>Color elegido <strong className="font-mono text-hueso">{rgbToHex(targetColor)}</strong> · píxel {seed.x}, {seed.y}</span>
          </div>
        ) : null}
      </section>

      <section className="surface-panel grid gap-4 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-14 font-semibold text-hueso sm:col-span-2">
          Nombre del reto
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="field" placeholder="Popeye" />
        </label>
        <label className="flex flex-col gap-2 text-14 font-semibold text-hueso">
          Identificador de archivos
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className="field font-mono" placeholder="popeye-camiseta" />
        </label>
        <label className="flex flex-col gap-2 text-14 font-semibold text-hueso">
          Color que verá el jugador mientras prueba
          <span className="flex h-12 items-center gap-3 rounded-2xl border border-linea bg-tinta px-3">
            <input type="color" value={previewColor} onChange={(event) => setPreviewColor(event.target.value.toLowerCase())} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
            <span className="font-mono text-13 text-humo">{previewColor}</span>
          </span>
        </label>
        <label className="flex flex-col gap-2 text-14 font-semibold text-hueso sm:col-span-2">
          Tolerancia del color · {tolerance}
          <input type="range" min="0" max="120" step="1" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} className="matiz-slider h-3 w-full cursor-pointer appearance-none rounded-full" />
          <span className="text-12 font-normal text-humo">Más tolerancia incluye variaciones de compresión y sombras; menos tolerancia conserva más detalles.</span>
        </label>
        <label className="flex items-start gap-3 text-14 text-hueso sm:col-span-2">
          <input type="checkbox" checked={connectedOnly} onChange={(event) => setConnectedOnly(event.target.checked)} className="mt-0.5 size-4 accent-oro" />
          <span><strong>Solo zona conectada</strong><br /><span className="text-12 text-humo">Actívalo para una pieza concreta. Desactívalo si quieres seleccionar todos los píxeles parecidos de la imagen.</span></span>
        </label>
        <Button onClick={generateMask} disabled={!canGenerate} className="sm:col-span-2">Generar máscara</Button>
      </section>

      {mask ? (
        <section className="surface-panel flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-12 font-semibold uppercase tracking-[0.14em] text-oro">Máscara lista</p>
              <p className="mt-1 text-14 text-humo">{selectedPixels.toLocaleString('es-ES')} píxeles se sustituirán por el color elegido.</p>
            </div>
            <span className="size-12 rounded-2xl border-2 border-white shadow" style={{ backgroundColor: previewColor }} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="ghost" onClick={downloadBase} disabled={!canDownload}>Descargar base</Button>
            <Button variant="ghost" onClick={downloadMask} disabled={!canDownload}>Descargar máscara</Button>
            <Button variant="ghost" onClick={downloadMetadata} disabled={!canDownload}>Descargar JSON</Button>
          </div>
          <p className="text-12 leading-relaxed text-humo">Copia los dos PNG en <code>public/games/matiz/</code> y añade el JSON a la lista de retos para incorporarlo al juego.</p>
        </section>
      ) : null}
    </main>
  );
}

function readImageData(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite leer la imagen');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
}

function renderPreview(canvas: HTMLCanvasElement | null, image: HTMLImageElement | null, originalData: ImageData | null, mask: Uint8Array | null, color: string) {
  if (!canvas || !image || !originalData) return;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.putImageData(new ImageData(new Uint8ClampedArray(originalData.data), image.naturalWidth, image.naturalHeight), 0, 0);
  if (!mask) return;

  const pixels = context.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
  const [red, green, blue] = parseHex(color);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const pixelIndex = index * 4;
    pixels.data[pixelIndex] = red;
    pixels.data[pixelIndex + 1] = green;
    pixels.data[pixelIndex + 2] = blue;
  }
  context.putImageData(pixels, 0, 0);
}

function selectMask(data: ImageData, width: number, height: number, seed: Point, target: Rgb, tolerance: number, connectedOnly: boolean) {
  const selected = new Uint8Array(width * height);
  const matches = (x: number, y: number) => {
    const pixelIndex = (y * width + x) * 4;
    const red = data.data[pixelIndex] ?? 0;
    const green = data.data[pixelIndex + 1] ?? 0;
    const blue = data.data[pixelIndex + 2] ?? 0;
    const distance = Math.sqrt(
      (red - target.r) ** 2
      + (green - target.g) ** 2
      + (blue - target.b) ** 2,
    );
    return distance <= tolerance && (data.data[pixelIndex + 3] ?? 0) > 0;
  };

  if (!connectedOnly) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (matches(x, y)) selected[y * width + x] = 1;
      }
    }
    return selected;
  }

  const pending: Point[] = [seed];
  selected[seed.y * width + seed.x] = 1;
  while (pending.length > 0) {
    const point = pending.shift();
    if (!point) continue;
    for (const next of [{ x: point.x - 1, y: point.y }, { x: point.x + 1, y: point.y }, { x: point.x, y: point.y - 1 }, { x: point.x, y: point.y + 1 }]) {
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      const index = next.y * width + next.x;
      if (selected[index] || !matches(next.x, next.y)) continue;
      selected[index] = 1;
      pending.push(next);
    }
  }
  return selected;
}

function createBaseCanvas(data: ImageData, mask: Uint8Array, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const pixels = new ImageData(new Uint8ClampedArray(data.data), width, height);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    pixels.data[index * 4 + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function createMaskCanvas(mask: Uint8Array, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const pixels = new ImageData(width, height);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const pixelIndex = index * 4;
    pixels.data[pixelIndex] = parseHex(MATIZ_TOOL_TOKENS.maskWhite)[0];
    pixels.data[pixelIndex + 1] = parseHex(MATIZ_TOOL_TOKENS.maskWhite)[1];
    pixels.data[pixelIndex + 2] = parseHex(MATIZ_TOOL_TOKENS.maskWhite)[2];
    pixels.data[pixelIndex + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function slugFromFilename(filename: string) {
  return safeSlug(filename.replace(/\.[^.]+$/, '')) || 'mi-reto';
}

function safeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'mi-reto';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
