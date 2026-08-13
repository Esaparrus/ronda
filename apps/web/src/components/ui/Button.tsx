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
  primary: 'border border-brasa bg-brasa text-crema shadow-lg hover:brightness-110',
  ghost: 'border border-linea bg-mesa/65 text-hueso hover:border-oro/60 hover:bg-madera-clara',
  danger: 'border border-brasa/80 bg-brasa/10 text-hueso hover:bg-brasa/20',
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
      className={`min-h-14 rounded-2xl px-6 text-16 font-semibold transition-[transform,filter,opacity,border-color,background-color] duration-150 active:translate-y-0.5 active:scale-[0.99] ${VARIANT_CLASSES[variant]} ${
        isDisabled ? 'cursor-not-allowed opacity-45' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
