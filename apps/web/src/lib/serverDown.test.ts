// Tests del umbral de "servidor caído" (contrato P17). Con temporizadores
// falsos: no depende de ningún socket real, así que se puede probar el
// umbral de 30s (o cualquier otro) sin esperar 30s de verdad ni arrastrar
// la inestabilidad de una conexión de red simulada.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerDownWatcher } from './serverDown.ts';

describe('createServerDownWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no avisa antes del umbral', () => {
    const onDown = vi.fn();
    const watcher = createServerDownWatcher(onDown, 30_000);

    watcher.disconnected();
    vi.advanceTimersByTime(29_999);

    expect(onDown).not.toHaveBeenCalled();
    watcher.dispose();
  });

  it('avisa exactamente al cumplirse el umbral', () => {
    const onDown = vi.fn();
    const watcher = createServerDownWatcher(onDown, 30_000);

    watcher.disconnected();
    vi.advanceTimersByTime(30_000);

    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onDown).toHaveBeenCalledWith(true);
  });

  it('reconnected() antes del umbral cancela el aviso y no dispara onDown(true)', () => {
    const onDown = vi.fn();
    const watcher = createServerDownWatcher(onDown, 30_000);

    watcher.disconnected();
    vi.advanceTimersByTime(15_000);
    watcher.reconnected();
    vi.advanceTimersByTime(30_000);

    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onDown).toHaveBeenCalledWith(false);
  });

  it('llamar dos veces a disconnected() sin reconectar no reinicia el reloj', () => {
    const onDown = vi.fn();
    const watcher = createServerDownWatcher(onDown, 30_000);

    watcher.disconnected();
    vi.advanceTimersByTime(20_000);
    watcher.disconnected(); // reintento fallido intermedio: no debe reiniciar
    vi.advanceTimersByTime(10_000); // total 30_000 desde la primera llamada

    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onDown).toHaveBeenCalledWith(true);
  });

  it('reconnected() es idempotente si no había ningún aviso pendiente', () => {
    const onDown = vi.fn();
    const watcher = createServerDownWatcher(onDown, 30_000);

    watcher.reconnected();
    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onDown).toHaveBeenCalledWith(false);
  });
});
