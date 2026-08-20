'use client';

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { getMusicSuggestions, type MusicSuggestionField } from '@/lib/musical';

export interface MusicAutocompleteInputProps {
  field: MusicSuggestionField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MusicAutocompleteInput({
  field,
  label,
  value,
  onChange,
  placeholder,
}: MusicAutocompleteInputProps) {
  const generatedId = useId().replace(/:/g, '');
  const inputId = `musical-${field}-${generatedId}`;
  const listId = `${inputId}-suggestions`;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const term = value.trim();
    const currentRequest = ++requestId.current;
    if (!term) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void getMusicSuggestions(field, term, controller.signal)
        .then((nextSuggestions) => {
          if (currentRequest !== requestId.current) return;
          setSuggestions(nextSuggestions);
          setActiveIndex(-1);
        })
        .catch((error: unknown) => {
          if (currentRequest !== requestId.current || isAbortError(error)) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (currentRequest === requestId.current) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [field, value]);

  function selectSuggestion(suggestion: string) {
    onChange(suggestion);
    setSuggestions([]);
    setActiveIndex(-1);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) selectSuggestion(suggestion);
    }
  }

  const visibleSuggestions = isOpen && suggestions.length > 0;

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-14 font-semibold text-hueso">
        {label}
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length) setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        className="form-control px-4 text-16"
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visibleSuggestions}
        aria-controls={visibleSuggestions ? listId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      />
      {visibleSuggestions ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-linea bg-tinta shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <button
              id={`${listId}-${index}`}
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`block min-h-12 w-full border-b border-linea/70 px-4 py-2 text-left text-14 last:border-b-0 ${
                index === activeIndex ? 'bg-madera-clara text-crema' : 'text-hueso hover:bg-mesa'
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : loading && isOpen ? (
        <p className="mt-1 text-12 text-humo" role="status">
          Buscando sugerencias…
        </p>
      ) : null}
    </div>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
