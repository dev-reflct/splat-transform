import playcanvasConfig from '@playcanvas/eslint-config';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    ...playcanvasConfig,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        settings: {
            'import/resolver': {
                typescript: {}
            }
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'lines-between-class-members': 'off',
            'no-await-in-loop': 'off',
            'require-atomic-updates': 'off',
            // Disable rules that conflict with Prettier
            'comma-dangle': 'off',
            'arrow-parens': 'off',
            'indent': 'off',
            'operator-linebreak': 'off'
        }
    },
    {
        files: ['__test__/**/*'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                console: 'readonly',
                process: 'readonly'
            }
        },
        rules: {
            quotes: 'off',
            indent: 'off',
            'no-unused-vars': 'off',
            'no-undef': 'off',
            'comma-dangle': 'off',
            'arrow-parens': 'off',
            'require-await': 'off',
            'import/no-unresolved': 'off',
            'import/named': 'off',
            'no-else-return': 'off'
        }
    }
];
