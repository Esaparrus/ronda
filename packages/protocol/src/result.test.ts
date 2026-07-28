import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, type Result } from './result.ts';

describe('Result', () => {
  it('ok crea un Ok con valor', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err crea un Err con code', () => {
    const r = err('NOT_YOUR_TURN');
    expect(r.ok).toBe(false);
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (!r.ok) expect(r.code).toBe('NOT_YOUR_TURN');
  });

  it('err acepta detail opcional', () => {
    const r = err('CANNOT_CLOSE', 'te sobran 8 puntos');
    if (!r.ok) {
      expect(r.detail).toBe('te sobran 8 puntos');
    }
  });

  it('el discriminador ok separa los dos lados en un tipo Result<T>', () => {
    function handle(r: Result<number>): string {
      return r.ok ? `valor ${r.value}` : `error ${r.code}`;
    }
    expect(handle(ok(7))).toBe('valor 7');
    expect(handle(err('INTERNAL'))).toBe('error INTERNAL');
  });
});
