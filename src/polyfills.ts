// Symbol.asyncIterator
// from: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html
(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator')
