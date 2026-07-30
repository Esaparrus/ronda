import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**', '**/next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
    },
  },
  {
    // El logger del servidor es la única salida de consola permitida en
    // producción (definición de "terminado" §5.7: prohibido console.log).
    files: ['apps/server/src/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Equivalente de cliente del logger del servidor (contrato P17): única
    // salida de consola permitida en apps/web, usada solo por error.tsx.
    files: ['apps/web/src/lib/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // public/sw.js corre en el contexto global del Service Worker (ni Node
    // ni DOM de página): declara sus propios globales. Contrato P10.
    files: ['apps/web/public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
      },
    },
  },
  {
    // Scripts de Node sueltos (p.ej. generación de iconos). Contrato P10.
    files: ['apps/web/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    // P10: nada de colores escritos a mano fuera de globals.css. Todo pasa
    // por los tokens (bg-mesa, text-hueso, border-linea...) o, en los pocos
    // sitios donde hace falta un valor JS literal, por apps/web/src/lib/tokens.ts.
    files: ['apps/web/src/app/**/*.{ts,tsx}', 'apps/web/src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'No hardcodees colores: usa las clases de globals.css (bg-mesa, text-hueso, border-brasa...) o, si de verdad hace falta un literal JS, impórtalo de apps/web/src/lib/tokens.ts.',
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'No hardcodees colores en template literals: usa las clases de globals.css o apps/web/src/lib/tokens.ts.',
        },
      ],
    },
  },
  prettier,
);
