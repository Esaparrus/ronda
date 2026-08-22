'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { MATIZ_CHALLENGES } from '@ronda/protocol';

interface MatizChallengeSelectorProps {
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
}

type MatizCategory = 'all' | 'pokemon' | 'characters' | 'logos';

const CATEGORY_OPTIONS: { value: MatizCategory; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'characters', label: 'Personajes' },
  { value: 'logos', label: 'Logos' },
];

const ALL_IDS = MATIZ_CHALLENGES.map((challenge) => challenge.id);
const ALL_ID_SET = new Set<string>(ALL_IDS);

export function MatizChallengeSelector({
  selectedIds,
  onChange,
}: MatizChallengeSelectorProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MatizCategory>('all');

  const selectedIdSet = useMemo(() => {
    const validIds = selectedIds.filter((id) => ALL_ID_SET.has(id));
    return new Set(validIds.length > 0 ? validIds : ALL_IDS);
  }, [selectedIds]);

  const visibleChallenges = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return MATIZ_CHALLENGES.filter((challenge) => {
      if (category !== 'all' && challengeCategory(challenge.id) !== category) return false;
      if (!normalizedQuery) return true;

      return `${challenge.title} ${challenge.subtitle} ${challenge.id}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [category, query]);

  function toggleChallenge(id: string) {
    if (selectedIdSet.has(id)) {
      if (selectedIdSet.size === 1) return;
      onChange(ALL_IDS.filter((challengeId) => challengeId !== id && selectedIdSet.has(challengeId)));
      return;
    }

    onChange(ALL_IDS.filter((challengeId) => challengeId === id || selectedIdSet.has(challengeId)));
  }

  function selectAll() {
    onChange([...ALL_IDS]);
  }

  return (
    <section className="surface-panel flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-16 font-semibold text-hueso">Imágenes disponibles</h2>
          <span className="font-mono text-12 text-oro" aria-live="polite">
            {selectedIdSet.size}/{ALL_IDS.length} activas
          </span>
        </div>
        <p className="text-13 leading-relaxed text-humo">
          Desmarca los retos cuyo color no te convenza. En grupo, esta selección se guarda dentro de
          la sala y todos recibirán únicamente estos dibujos.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="matiz-search" className="text-13 font-semibold text-hueso">
          Buscar una imagen
        </label>
        <input
          id="matiz-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="form-control px-4 text-15"
          placeholder="Pikachu, logo, pantalón..."
          type="search"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar catálogo">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              aria-pressed={category === option.value}
              className={`rounded-full border px-3 py-2 text-12 font-semibold transition-colors ${
                category === option.value
                  ? 'border-oro bg-oro text-mesa'
                  : 'border-linea bg-mesa/60 text-humo hover:border-oro/60 hover:text-hueso'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={selectAll}
            className="rounded-full border border-linea bg-transparent px-3 py-2 text-12 font-semibold text-oro transition-colors hover:border-oro"
          >
            Activar todos
          </button>
        </div>
      </div>

      <p className="text-12 text-humo">
        Mostrando {visibleChallenges.length} de {ALL_IDS.length}. Debe quedar al menos un reto activo.
      </p>

      <div className="grid max-h-[min(54rem,68dvh)] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {visibleChallenges.map((challenge) => {
          const active = selectedIdSet.has(challenge.id);
          const inputId = `matiz-challenge-${challenge.id}`;

          return (
            <article
              key={challenge.id}
              className={`rounded-2xl border p-2.5 transition-colors ${
                active ? 'border-oro/60 bg-oro/5' : 'border-linea bg-mesa/50 opacity-65'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleChallenge(challenge.id)}
                  className="sr-only"
                />
                <label
                  htmlFor={inputId}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                >
                  <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-linea bg-white/90">
                    <Image
                      src={`/games/matiz/${challenge.id}-base.png`}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-contain p-1"
                      loading="lazy"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-13 font-semibold text-hueso">
                      {challenge.title}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-11 leading-snug text-humo">
                      {challenge.subtitle}
                    </span>
                  </span>
                </label>
                <span
                  className="size-5 shrink-0 rounded-full border border-white/30 shadow-inner"
                  style={{ backgroundColor: challenge.targetHex }}
                  title="Color objetivo guardado"
                  aria-label="Color objetivo guardado"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 pl-[4.5rem]">
                <span className="font-mono text-10 text-humo">{active ? 'Activa' : 'Oculta'}</span>
                <a
                  href={challenge.source}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-11 font-semibold text-oro underline decoration-oro/40 underline-offset-2 hover:decoration-oro"
                >
                  Ver origen ↗
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {visibleChallenges.length === 0 ? (
        <p className="rounded-xl border border-linea bg-mesa/60 p-4 text-13 text-humo">
          No hay retos que coincidan con esa búsqueda.
        </p>
      ) : null}
    </section>
  );
}

function challengeCategory(id: string): Exclude<MatizCategory, 'all'> {
  if (id.startsWith('pokemon-')) return 'pokemon';
  if (id.startsWith('logo-')) return 'logos';
  return 'characters';
}
