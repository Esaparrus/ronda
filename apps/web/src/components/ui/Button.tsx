// Botón principal de la interfaz. Contrato P11 / §8.5.2 (zona táctil mínima
// 56px, min-h-14 en la escala de Tailwind).
'use client';

import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  /**
   * Bloquea la interacción mientras una acción está en vuelo. Contrato P11:
   * "Estado loading que bloquea". Deliberadamente sin icono girando: el
   * contrato (§8.4) cierra la lista de animaciones permitidas y un spinner
   * no está en ella, así que el estado de carga se comunica solo con
   * atenuado + `aria-busy`, sin movimiento añadido.
   */
  loading?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brasa text-hueso',
  ghost: 'bg-transparent text-hueso border border-linea',
  danger: 'bg-transparent text-brasa border border-brasa',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={`min-h-14 rounded-lg px-6 text-16 font-semibold transition-opacity ${VARIANT_CLASSES[variant]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
