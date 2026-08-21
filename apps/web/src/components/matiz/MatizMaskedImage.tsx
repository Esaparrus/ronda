'use client';

import { useEffect, useRef, useState } from 'react';

interface LoadedAsset {
  image: HTMLImageElement;
  mask: HTMLImageElement;
}

export interface MatizMaskedImageProps {
  imageSrc: string;
  maskSrc: string;
  color: string;
  alt: string;
  className?: string;
}

/**
 * Pinta la ilustración y sustituye únicamente los píxeles cubiertos por la
 * máscara. La máscara se genera una vez al preparar el reto; durante la
 * partida solo cambia el color de esa zona.
 */
export function MatizMaskedImage({ imageSrc, maskSrc, color, alt, className = '' }: MatizMaskedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetRef = useRef<LoadedAsset | null>(null);
  const [assetVersion, setAssetVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const image = new window.Image();
    const mask = new window.Image();
    image.decoding = 'async';
    mask.decoding = 'async';

    Promise.all([loadImage(image, imageSrc), loadImage(mask, maskSrc)]).then(() => {
      if (!active) return;
      assetRef.current = { image, mask };
      setAssetVersion((version) => version + 1);
    }).catch(() => {
      if (active) assetRef.current = null;
    });

    return () => {
      active = false;
    };
  }, [imageSrc, maskSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const asset = assetRef.current;
    if (!canvas || !asset) return;

    drawMaskedImage(canvas, asset.image, asset.mask, color);
  }, [assetVersion, color]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
    />
  );
}

function loadImage(image: HTMLImageElement, src: string) {
  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  });
}

function drawMaskedImage(canvas: HTMLCanvasElement, image: HTMLImageElement, mask: HTMLImageElement, color: string) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) return;
  maskContext.clearRect(0, 0, width, height);
  maskContext.drawImage(mask, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height);
  const maskPixels = maskContext.getImageData(0, 0, width, height);
  const [red, green, blue] = parseHex(color);

  for (let index = 0; index < pixels.data.length; index += 4) {
    const maskAlpha = maskPixels.data[index + 3] ?? 0;
    if (maskAlpha === 0) continue;

    const baseAlpha = pixels.data[index + 3] ?? 0;
    pixels.data[index] = red;
    pixels.data[index + 1] = green;
    pixels.data[index + 2] = blue;
    pixels.data[index + 3] = Math.max(baseAlpha, maskAlpha);
  }

  context.putImageData(pixels, 0, 0);
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}
