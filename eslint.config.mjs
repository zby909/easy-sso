/*
 * @Description:
 * @Author: zby
 * @Date: 2024-09-04 15:39:19
 * @LastEditors: zby
 * @Reference:
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  {
    name: 'app/files-to-ignore',
    ignores: ['node_modules', '.history', 'dist', 'out.', '.gitignore'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
