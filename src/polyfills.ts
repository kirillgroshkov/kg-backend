// Symbol.asyncIterator
// from: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html
if (!(Symbol as any).asyncIterator) {
  (Symbol as any).asyncIterator = Symbol.for('Symbol.asyncIterator')
}
