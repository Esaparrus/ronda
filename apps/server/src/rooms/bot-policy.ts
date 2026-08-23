// Fachada de las estrategias de robots. Cada juego tiene una política propia
// en `bot-strategies/`; todas son puras y solo reciben la PlayerView censurada
// del robot. El servidor nunca les entrega manos rivales ni el estado privado.

export { decideChinchonAction, decideChinchonTimeoutDiscard } from './bot-strategies/chinchon.ts';
export { decidePochaAction } from './bot-strategies/pocha.ts';
export { decideMusAction } from './bot-strategies/mus.ts';
export { decideClassicAction } from './bot-strategies/classics.ts';
export { decidePartyAction } from './bot-strategies/party.ts';
export { decideRondaAction } from './bot-strategies/laronda.ts';
export { decidePrecioJustoAction } from './bot-strategies/preciojusto.ts';
export { decideRoadmapAction } from './bot-strategies/roadmap.ts';
