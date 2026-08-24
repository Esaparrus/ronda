import type {
  BanderasCommonView,
  BanderasPlayerView,
  BanderasTableView,
  CifrasCommonView,
  CifrasPlayerView,
  CifrasTableView,
  CompletaLaFraseCommonView,
  CompletaLaFrasePlayerView,
  CompletaLaFraseTableView,
  PublicPlayer,
  QuienLoHariaCommonView,
  QuienLoHariaPlayerView,
  QuienLoHariaTableView,
  RoadmapAvailableAction,
  RoadmapPlayerView,
  RoadmapTableView,
  WhoSummary,
  PlayerId,
} from '@ronda/protocol';
import { cifrasQuestionById, flagQuestionById, sentenceQuestionById, whoQuestionById } from './content.ts';
import {
  activePlayers,
  findPlayer,
  type BanderasState,
  type CifrasState,
  type CompletaLaFraseState,
  type QuienLoHariaState,
  type RoadmapState,
} from './state.ts';

function colorIndex(seat: number): PublicPlayer['colorIndex'] {
  return (seat % 8) as PublicPlayer['colorIndex'];
}

function players(state: RoadmapState): PublicPlayer[] {
  const hostId = activePlayers(state).sort((left, right) => left.seat - right.seat)[0]?.playerId;
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    colorIndex: colorIndex(player.seat),
    score: player.score,
    handCount: 0,
    connected: true,
    isHost: hostId === player.playerId,
    isBot: player.isBot,
    eliminated: player.left,
    teamIndex: null,
  }));
}

function base(state: RoadmapState) {
  return {
    roomCode: state.roomCode,
    status: state.status,
    round: state.round,
    players: players(state),
    turnPlayerId: null,
    winnerId: state.winnerId,
    rematchVotes: [...state.rematchVotes],
  };
}

function flagsCommon(state: BanderasState): BanderasCommonView {
  const question = flagQuestionById(state.flags.questionId, state.questions);
  const revealed = state.phase === 'reveal';
  return {
    ...base(state),
    gameId: 'banderas',
    config: state.config,
    phase: state.phase,
    flags: {
      gameId: 'banderas',
      phase: state.phase,
      questionId: question.id,
      image: question.image,
      entityName: revealed ? question.entityName : null,
      entityType: revealed ? question.entityType : null,
      region: question.region,
      difficulty: question.difficulty,
      options: question.options.map((option) => ({ ...option })),
      explanation: revealed ? question.explanation ?? null : null,
      correctOptionId: revealed ? question.correctOptionId : null,
      deadlineAt: state.flags.deadlineAt,
      submittedPlayerIds: Object.keys(state.flags.submissions),
      answers: revealed
        ? Object.fromEntries(state.players.map((player) => [player.playerId, state.flags.submissions[player.playerId] ?? null]))
        : null,
      scoreDeltas: revealed && state.flags.scoreDeltas ? { ...state.flags.scoreDeltas } : null,
    },
  };
}

function cifrasCommon(state: CifrasState): CifrasCommonView {
  const question = cifrasQuestionById(state.cifras.questionId, state.questions);
  const revealed = state.phase === 'reveal';
  return {
    ...base(state),
    gameId: 'cifras',
    config: state.config,
    phase: state.phase,
    cifras: {
      gameId: 'cifras',
      phase: state.phase,
      questionId: question.id,
      kind: question.kind,
      prompt: question.prompt,
      unit: question.unit,
      definition: question.definition,
      category: question.category,
      direction: question.kind === 'order' ? question.direction : null,
      items: 'items' in question ? question.items.map((item) => ({ id: item.id, label: item.label })) : [],
      referenceValue: revealed && question.kind === 'estimate' ? question.referenceValue : null,
      itemValues: revealed && 'items' in question ? Object.fromEntries(question.items.map((item) => [item.id, item.value])) : null,
      source: revealed ? question.source : null,
      updatedAt: revealed ? question.updatedAt : null,
      deadlineAt: state.cifras.deadlineAt,
      submittedPlayerIds:
        question.kind === 'estimate'
          ? Object.keys(state.cifras.submissions)
          : question.kind === 'order'
            ? Object.keys(state.cifras.orderSubmissions)
            : Object.keys(state.cifras.choiceSubmissions),
      estimates: revealed && state.cifras.estimateResults ? Object.fromEntries(Object.entries(state.cifras.estimateResults).map(([id, result]) => [id, { ...result }])) : null,
      orders: revealed && state.cifras.orderResults ? Object.fromEntries(Object.entries(state.cifras.orderResults).map(([id, result]) => [id, { ...result, order: result.order ? [...result.order] : null, correctOrder: [...result.correctOrder] }])) : null,
      choices: revealed && state.cifras.choiceResults ? Object.fromEntries(Object.entries(state.cifras.choiceResults).map(([id, result]) => [id, { ...result }])) : null,
      scoreDeltas: revealed && state.cifras.scoreDeltas ? { ...state.cifras.scoreDeltas } : null,
    },
  };
}

function whoSummary(state: QuienLoHariaState): WhoSummary | null {
  if (state.history.length === 0 || state.status !== 'gameEnd') return null;
  const totals = Object.fromEntries(state.players.map((player) => [player.playerId, 0])) as Record<PlayerId, number>;
  let maxSingleRound = 0;
  const tieRounds: number[] = [];
  for (const entry of state.history) {
    for (const [playerId, count] of Object.entries(entry.voteCounts)) totals[playerId] = (totals[playerId] ?? 0) + count;
    maxSingleRound = Math.max(maxSingleRound, ...Object.values(entry.voteCounts));
    if (entry.winners.length !== 1) tieRounds.push(entry.round);
  }
  const values = Object.values(totals);
  const high = Math.max(...values, 0);
  const low = Math.min(...values, 0);
  return {
    voteTotals: totals,
    mostChosenPlayerIds: Object.keys(totals).filter((id) => totals[id] === high),
    leastChosenPlayerIds: Object.keys(totals).filter((id) => totals[id] === low),
    maxSingleRound,
    tieRounds,
  };
}

function whoCommon(state: QuienLoHariaState): QuienLoHariaCommonView {
  const question = whoQuestionById(state.who.questionId, state.questions);
  const visible = state.phase === 'reveal' && (state.config.results === 'cada-ronda' || state.status === 'gameEnd');
  return {
    ...base(state),
    gameId: 'quienloharia',
    config: state.config,
    phase: state.phase,
    who: {
      gameId: 'quienloharia',
      phase: state.phase,
      questionId: question.id,
      prompt: question.prompt,
      pack: question.pack,
      allowSelfVote: state.config.allowSelfVote,
      resultsVisible: visible,
      deadlineAt: state.who.deadlineAt,
      submittedPlayerIds: Object.keys(state.who.submissions),
      votes: visible ? { ...state.who.submissions } : null,
      voteCounts: visible && state.who.voteCounts ? { ...state.who.voteCounts } : null,
      scoreDeltas: visible && state.who.scoreDeltas ? { ...state.who.scoreDeltas } : null,
      summary: whoSummary(state),
    },
  };
}

function sentenceCommon(state: CompletaLaFraseState, playerId?: PlayerId): CompletaLaFraseCommonView {
  const question = sentenceQuestionById(state.sentence.questionId, state.questions);
  const revealed = state.phase === 'reveal';
  return {
    ...base(state),
    gameId: 'completalafrase',
    config: state.config,
    phase: state.phase,
    sentence: {
      gameId: 'completalafrase',
      phase: state.phase,
      questionId: question.id,
      prompt: question.prompt,
      category: question.category,
      author: revealed ? question.author ?? null : null,
      source: revealed ? question.source ?? null : null,
      hint: revealed || (playerId !== undefined && state.sentence.hintUsed[playerId]) ? question.hint ?? null : null,
      deadlineAt: state.sentence.deadlineAt,
      canonicalAnswer: revealed ? question.canonicalAnswer : null,
      submittedPlayerIds: Object.keys(state.sentence.submissions),
      answers: revealed && state.sentence.results ? Object.fromEntries(Object.entries(state.sentence.results).map(([id, result]) => [id, { ...result, answer: result.answer }])) : null,
      scoreDeltas: revealed && state.sentence.scoreDeltas ? { ...state.sentence.scoreDeltas } : null,
    },
  };
}

function buildActions(state: RoadmapState, playerId: PlayerId): RoadmapAvailableAction[] {
  const player = findPlayer(state, playerId);
  if (!player || player.left) return [];
  const actions: RoadmapAvailableAction[] = [];
  const host = players(state).find((candidate) => candidate.playerId === playerId)?.isHost ?? false;
  if (state.status === 'playing' && state.phase === 'input') {
    if (state.gameId === 'banderas' && state.flags.submissions[playerId] === undefined) actions.push('submitFlag');
    if (state.gameId === 'cifras') {
      const question = cifrasQuestionById(state.cifras.questionId, state.questions);
      const submitted =
        question.kind === 'estimate'
          ? state.cifras.submissions[playerId] !== undefined
          : question.kind === 'order'
            ? state.cifras.orderSubmissions[playerId] !== undefined
            : state.cifras.choiceSubmissions[playerId] !== undefined;
      if (!submitted) {
        actions.push(
          question.kind === 'estimate'
            ? 'submitNumber'
            : question.kind === 'order'
              ? 'submitOrder'
              : 'submitChoice',
        );
      }
    }
    if (state.gameId === 'quienloharia' && state.who.submissions[playerId] === undefined) actions.push('submitWhoVote');
    if (state.gameId === 'completalafrase') {
      if (state.config.hints && !state.sentence.hintUsed[playerId] && state.sentence.submissions[playerId] === undefined) actions.push('useSentenceHint');
      if (state.sentence.submissions[playerId] === undefined) actions.push('submitSentence');
    }
    if (host && state.config.answerTimeSeconds === 0) {
      if (state.gameId === 'banderas') actions.push('finishFlags');
      if (state.gameId === 'cifras') actions.push('finishCifras');
      if (state.gameId === 'quienloharia') actions.push('finishWho');
      if (state.gameId === 'completalafrase') actions.push('finishSentence');
    }
  }
  if (state.status === 'playing' && state.phase === 'reveal' && host) actions.push('nextRound');
  return actions;
}

export function getPlayerView(state: BanderasState, playerId: PlayerId): BanderasPlayerView;
export function getPlayerView(state: CifrasState, playerId: PlayerId): CifrasPlayerView;
export function getPlayerView(state: QuienLoHariaState, playerId: PlayerId): QuienLoHariaPlayerView;
export function getPlayerView(state: CompletaLaFraseState, playerId: PlayerId): CompletaLaFrasePlayerView;
export function getPlayerView(state: RoadmapState, playerId: PlayerId): RoadmapPlayerView;
export function getPlayerView(state: RoadmapState, playerId: PlayerId): RoadmapPlayerView {
  const availableActions = buildActions(state, playerId);
  if (state.gameId === 'banderas') {
    const common = flagsCommon(state);
    return { kind: 'player', ...common, me: { playerId, selectedOptionId: state.flags.submissions[playerId] ?? null, submitted: state.flags.submissions[playerId] !== undefined, availableActions } };
  }
  if (state.gameId === 'cifras') {
    const common = cifrasCommon(state);
    return {
      kind: 'player',
      ...common,
      me: {
        playerId,
        submitted: common.cifras.submittedPlayerIds.includes(playerId),
        selectedOrder: state.cifras.orderSubmissions[playerId]
          ? [...state.cifras.orderSubmissions[playerId]]
          : [],
        selectedChoiceId: state.cifras.choiceSubmissions[playerId] ?? null,
        availableActions,
      },
    };
  }
  if (state.gameId === 'quienloharia') {
    const common = whoCommon(state);
    return { kind: 'player', ...common, me: { playerId, selectedPlayerId: state.who.submissions[playerId] ?? null, submitted: state.who.submissions[playerId] !== undefined, availableActions } };
  }
  const common = sentenceCommon(state, playerId);
  return { kind: 'player', ...common, me: { playerId, submitted: state.sentence.submissions[playerId] !== undefined, hintUsed: state.sentence.hintUsed[playerId] ?? false, availableActions } };
}

export function getTableView(state: BanderasState): BanderasTableView;
export function getTableView(state: CifrasState): CifrasTableView;
export function getTableView(state: QuienLoHariaState): QuienLoHariaTableView;
export function getTableView(state: CompletaLaFraseState): CompletaLaFraseTableView;
export function getTableView(state: RoadmapState): RoadmapTableView;
export function getTableView(state: RoadmapState): RoadmapTableView {
  if (state.gameId === 'banderas') return { kind: 'table', ...flagsCommon(state) };
  if (state.gameId === 'cifras') return { kind: 'table', ...cifrasCommon(state) };
  if (state.gameId === 'quienloharia') return { kind: 'table', ...whoCommon(state) };
  return { kind: 'table', ...sentenceCommon(state) };
}
