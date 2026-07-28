// @ronda/engine
//
// Motor puro y determinista: reglas del juego, sin red, sin base de datos, sin
// reloj, sin Math.random (el RNG lleva semilla en el estado).

export * from './core/types.ts';
export * from './core/rng.ts';
export * from './core/deck.ts';
export * from './core/registry.ts';
export * from './core/freeze.ts';

// Registro del juego Chinchón (efecto lateral: lo añade a GAMES).
import './games/chinchon/index.ts';
export * from './games/chinchon/index.ts';
