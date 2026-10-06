import tseslint from 'typescript-eslint';

// Lint the backend package only. web-ui has its own config and is ignored here.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'web-ui/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase uses `any` deliberately in a few API seams.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
