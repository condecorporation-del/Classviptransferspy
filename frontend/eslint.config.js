import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Permite marcar args/vars intencionalmente sin usar con prefijo "_"
      // (convención estándar para parámetros requeridos por una firma pero no usados).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Regla advisory del React Compiler. En este código los efectos que llaman
      // setState son cargas de datos (fetch al montar) o reseteo de estado derivado
      // (p.ej. limpiar el detalle cuando no hay selección) — patrones correctos que
      // React permite. Se deja como aviso (no error) tras revisarlos uno por uno.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
