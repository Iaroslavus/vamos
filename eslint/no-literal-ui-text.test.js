const { Linter } = require('eslint');

const rule = require('./no-literal-ui-text');

function lint(code) {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, [
    {
      plugins: { vamos: { rules: { 'no-literal-ui-text': rule } } },
      rules: { 'vamos/no-literal-ui-text': 'error' },
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
  ]);
}

describe('no literal UI text', () => {
  it('allows translations, numbers, and punctuation', () => {
    const messages = lint(`
      function Screen() {
        return (
          <View>
            <Text>{t('settings.title')}</Text>
            <Text>{UI_LANGUAGE_LABELS[code]}</Text>
            <Text>{count}</Text>
            <Text>—</Text>
            <Button title={t('common.retry')} />
            <View accessibilityLabel={t('lesson.builtAnswer')} />
          </View>
        );
      }
    `);

    expect(messages).toEqual([]);
  });

  it('rejects interface copy written directly in JSX', () => {
    const messages = lint(`
      function Screen() {
        return (
          <View accessibilityLabel="Собранный ответ">
            <Text>Настройки</Text>
            <Text>{"Language"}</Text>
            <Button title="Продолжить" />
            <Input placeholder={\`Имя\`} />
          </View>
        );
      }
    `);

    expect(messages.map((message) => message.message)).toHaveLength(5);
    expect(messages.every((message) => message.ruleId === 'vamos/no-literal-ui-text')).toBe(true);
  });
});
