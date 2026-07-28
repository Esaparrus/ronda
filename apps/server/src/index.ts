// @ronda/server
//
// Servidor autoritativo: node:http + socket.io + pg. Salas en memoria, Postgres
// solo como respaldo. El cliente nunca decide nada; solo pinta vistas censuradas.
// Se implementa a partir de P5. Existe para que el monorepo arranque.

export const SERVER_READY = false;
