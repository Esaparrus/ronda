import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // El monorepo usa pnpm y puede convivir con otros proyectos en el equipo.
  // Fijar la raíz evita que Next use por accidente otro package-lock.json
  // para el tracing de producción.
  outputFileTracingRoot: path.join(appDirectory, '../..'),
};

export default nextConfig;
