import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

// Flat config for ESLint 9. Lints TS/TSX only (matches the legacy --ext .ts,.tsx
// scope); .mjs/.js/.cjs are ignored. typescript-eslint 7.x ships legacy configs,
// so rules are spread from their `.rules` objects rather than flat presets.
export default [
  {
    ignores: [
      'out/**',
      'dist/**',
      'build/**',
      'release/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '**/*.tsbuildinfo',
      '**/*.{js,cjs,mjs}'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: { ...globals.node, ...globals.browser }
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript 编译器负责这些, ESLint 关掉避免误报
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // GH-105 "blue-on-grey" root-cause guard (subagent investigation). Business
      // code must go through berth's semantic wrappers in @/components/ui, never the
      // raw HeroUI Chip/Button/Tabs — the wrappers constrain the flat+primary combo
      // that renders bg-primary/20 (grey-blue slab) + blue text.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@heroui/react',
              importNames: ['Chip', 'Button', 'Tabs', 'Tab'],
              message:
                'Import Chip/Button/Tabs from @/components/ui (semantic wrappers), not @heroui/react directly — prevents the flat+primary blue-on-grey anti-pattern (GH-105).'
            }
          ]
        }
      ],
      // Block the literal flat/light/faded + primary combo (the blue-on-grey source).
      // Static-only: cannot catch dynamically-bound variant/color, but kills the
      // most common literal misuse on Button/Tabs/Chip.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement:has(JSXAttribute[name.name='color'][value.value='primary']):has(JSXAttribute[name.name='variant'][value.value=/^(flat|light|faded)$/])",
          message:
            'color="primary" + variant="flat|light|faded" renders blue-on-grey (bg-primary/20 + blue text). Use a solid CTA (color="primary" without flat) or a neutral tone. (GH-105)'
        }
      ]
    }
  },
  {
    // The ui/** wrappers ARE allowed to import + constrain raw HeroUI primitives.
    files: ['src/renderer/src/components/ui/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' }
  }
]
