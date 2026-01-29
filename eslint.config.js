import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
	js.configs.recommended,

	...tseslint.configs.recommended,

	{
		files: ['**/*.ts', '**/*.tsx', '**/*.js'],
		ignores: ['dist/**', 'node_modules/**'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		rules: {
			'@typescript-eslint/no-unused-vars': ['warn'],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
		},
	},
]
