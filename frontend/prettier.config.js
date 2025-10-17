/** @type {import("prettier").Config} */
export default {
  semi: true, // add semicolons
  singleQuote: true, // use ' instead of "
  trailingComma: 'es5', // trailing commas where valid in ES5 (objects, arrays, etc.)
  printWidth: 100, // wrap lines after 100 characters
  tabWidth: 2, // two spaces per indent
  useTabs: false, // use spaces, not tabs
  bracketSpacing: true, // { foo: bar } instead of {foo: bar}
  arrowParens: 'always', // always wrap arrow function params: (x) => x
  endOfLine: 'lf', // normalize line endings
};
