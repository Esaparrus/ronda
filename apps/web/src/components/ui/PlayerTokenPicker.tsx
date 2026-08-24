import { PLAYER_TOKEN_ICONS, type PlayerTokenIcon } from '@ronda/protocol';

const TOKEN_LABELS: Record<PlayerTokenIcon, string> = {
  '🎲': 'Dado',
  '🗝️': 'Llave',
  '🧭': 'Brújula',
  '🍀': 'Trébol',
  '🪶': 'Pluma',
  '🔔': 'Campana',
  '🏺': 'Ánfora',
  '🧩': 'Pieza',
};

export interface PlayerTokenPickerProps {
  value: PlayerTokenIcon;
  onChange: (value: PlayerTokenIcon) => void;
}

export function PlayerTokenPicker({ value, onChange }: PlayerTokenPickerProps) {
  return (
    <fieldset className="player-token-picker">
      <legend className="text-16 font-semibold text-hueso">Tu ficha</legend>
      <p className="mt-1 text-12 leading-relaxed text-humo">
        Elige un objeto. Será tu marcador en La Gran Ronda.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Elige tu ficha">
        {PLAYER_TOKEN_ICONS.map((icon) => {
          const selected = value === icon;
          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={TOKEN_LABELS[icon]}
              title={TOKEN_LABELS[icon]}
              onClick={() => onChange(icon)}
              className={`player-token-picker__option ${selected ? 'player-token-picker__option--selected' : ''}`}
            >
              <span aria-hidden="true">{icon}</span>
              <small>{TOKEN_LABELS[icon]}</small>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
