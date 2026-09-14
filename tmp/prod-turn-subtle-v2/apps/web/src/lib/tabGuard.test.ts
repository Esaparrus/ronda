// Tests de startTabGuard contra el BroadcastChannel real de Node (global
// desde Node 18): dos "pestañas" son, aquí, dos llamadas a startTabGuard en
// el mismo proceso -- BroadcastChannel entrega entre instancias del mismo
// nombre de canal igual que entre pestañas reales del mismo origen.
import { describe, expect, it, vi } from 'vitest';
import { startTabGuard } from './tabGuard.ts';

describe('startTabGuard', () => {
  it('la pestaña más nueva se queda activa; la más vieja se marca inactiva', async () => {
    const inactiveOld = vi.fn();
    const inactiveNew = vi.fn();

    const oldTab = startTabGuard('ABCD', inactiveOld);
    const newTab = startTabGuard('ABCD', inactiveNew);

    await vi.waitFor(() => {
      expect(inactiveOld).toHaveBeenCalledTimes(1);
    });
    expect(inactiveNew).not.toHaveBeenCalled();

    oldTab.dispose();
    newTab.dispose();
  });

  it('una tercera pestaña deja inactivas tanto a la primera como a la segunda', async () => {
    const inactive1 = vi.fn();
    const inactive2 = vi.fn();
    const inactive3 = vi.fn();

    const tab1 = startTabGuard('WXYZ', inactive1);
    const tab2 = startTabGuard('WXYZ', inactive2);
    await vi.waitFor(() => expect(inactive1).toHaveBeenCalledTimes(1));

    const tab3 = startTabGuard('WXYZ', inactive3);
    await vi.waitFor(() => expect(inactive2).toHaveBeenCalledTimes(1));

    expect(inactive1).toHaveBeenCalledTimes(1); // no se repite
    expect(inactive3).not.toHaveBeenCalled();

    tab1.dispose();
    tab2.dispose();
    tab3.dispose();
  });

  it('salas con código distinto no se interfieren entre sí', async () => {
    const inactiveA = vi.fn();
    const inactiveB = vi.fn();

    const tabA = startTabGuard('AAAA', inactiveA);
    const tabB = startTabGuard('BBBB', inactiveB);

    // Da tiempo a que, si hubiera una fuga entre canales, se propagara.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(inactiveA).not.toHaveBeenCalled();
    expect(inactiveB).not.toHaveBeenCalled();

    tabA.dispose();
    tabB.dispose();
  });

  it('dispose() detiene la escucha: mensajes posteriores no llaman a onInactive', async () => {
    const inactiveOld = vi.fn();
    const oldTab = startTabGuard('DISP', inactiveOld);
    oldTab.dispose();

    const newTab = startTabGuard('DISP', vi.fn());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(inactiveOld).not.toHaveBeenCalled();
    newTab.dispose();
  });
});
