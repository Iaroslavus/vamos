'use strict';

/** Methods that allocate a new array on every call. */
const ARRAY_METHODS = new Set([
  'concat',
  'filter',
  'flat',
  'flatMap',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'splice',
]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Zustand selectors must return primitives or an existing state field, or be wrapped in useShallow',
    },
    schema: [],
    messages: {
      fresh:
        'Zustand selectors must return a primitive or an existing state field. Wrap an object selector in useShallow from zustand/react/shallow. Derive arrays with useMemo outside the selector.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isStoreHook(node.callee)) return;
        const selector = node.arguments[0];
        if (!selector) return;

        if (isUseShallowCall(selector)) {
          const inner = selector.arguments[0];
          if (inner && selectorReturnsFresh(inner, true)) {
            context.report({ node: inner, messageId: 'fresh' });
          }
          return;
        }

        if (selectorReturnsFresh(selector, false)) {
          context.report({ node: selector, messageId: 'fresh' });
        }
      },
    };
  },
};

function isStoreHook(callee) {
  return callee.type === 'Identifier' && /^use[A-Z]\w*Store$/.test(callee.name);
}

function isUseShallowCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'useShallow'
  );
}

function selectorReturnsFresh(fn, allowObject) {
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') return false;
  return returnedExpressions(fn).some((expression) => isFresh(expression, allowObject));
}

function returnedExpressions(fn) {
  if (fn.body.type !== 'BlockStatement') return [fn.body];

  /** @type {Map<string, import('estree').Expression | import('estree').Pattern>} */
  const locals = new Map();
  /** @type {import('estree').Expression[]} */
  const returned = [];

  for (const statement of fn.body.body) {
    if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        if (declaration.id.type === 'Identifier' && declaration.init) {
          locals.set(declaration.id.name, declaration.init);
        }
      }
      continue;
    }
    if (statement.type === 'ReturnStatement' && statement.argument) {
      returned.push(resolveLocal(statement.argument, locals));
    }
  }

  return returned;
}

function resolveLocal(node, locals) {
  const value = unwrap(node);
  if (value.type === 'Identifier' && locals.has(value.name)) {
    return unwrap(locals.get(value.name));
  }
  return value;
}

function unwrap(node) {
  let current = node;
  while (
    current &&
    (current.type === 'ParenthesizedExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'ChainExpression')
  ) {
    current = current.expression;
  }
  return current;
}

function isFresh(node, allowObject) {
  const value = unwrap(node);
  if (!value) return false;
  if (value.type === 'ObjectExpression') return !allowObject;
  if (value.type === 'ArrayExpression') return true;
  if (value.type === 'CallExpression') {
    const name = propertyName(value.callee);
    return Boolean(name && (ARRAY_METHODS.has(name) || /^get[A-Z]/.test(name)));
  }
  if (value.type === 'ConditionalExpression') {
    return isFresh(value.consequent, allowObject) || isFresh(value.alternate, allowObject);
  }
  if (value.type === 'LogicalExpression') {
    return isFresh(value.left, allowObject) || isFresh(value.right, allowObject);
  }
  return false;
}

function propertyName(callee) {
  if (!callee || callee.type !== 'MemberExpression') return null;
  if (callee.computed) {
    return callee.property.type === 'Literal' && typeof callee.property.value === 'string'
      ? callee.property.value
      : null;
  }
  return callee.property.type === 'Identifier' ? callee.property.name : null;
}
