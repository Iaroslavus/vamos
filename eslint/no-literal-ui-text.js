'use strict';

/** Props that render copy or are read aloud. */
const USER_FACING_PROPS = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'label',
  'placeholder',
  'title',
]);

const LETTER = /\p{L}/u;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasLetters(value) {
  return typeof value === 'string' && LETTER.test(value);
}

/**
 * @param {import('estree').Literal | import('estree').TemplateLiteral} node
 * @returns {string | null}
 */
function literalText(node) {
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((part) => part.value.cooked ?? '').join('');
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Interface copy must come from i18n, not from string literals in JSX',
    },
    schema: [],
    messages: {
      literal:
        'Interface text must go through i18n (t(...)). Do not put user-facing string literals in JSX.',
    },
  },
  create(context) {
    /**
     * @param {import('estree').Node} node
     */
    function report(node) {
      context.report({ node, messageId: 'literal' });
    }

    /**
     * @param {import('estree').Node | null | undefined} node
     */
    function checkLiteral(node) {
      if (!node) return;
      if (node.type !== 'Literal' && node.type !== 'TemplateLiteral') return;
      const text = literalText(node);
      if (text != null && hasLetters(text)) report(node);
    }

    return {
      JSXText(node) {
        if (hasLetters(node.value)) report(node);
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !USER_FACING_PROPS.has(node.name.name)) return;
        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') {
          if (value && value.type === 'Literal') checkLiteral(value);
          return;
        }
        checkLiteral(value.expression);
      },
      JSXExpressionContainer(node) {
        if (node.parent && node.parent.type === 'JSXElement') checkLiteral(node.expression);
      },
    };
  },
};
