// It's here, because stock `@types/p-props` didn't work

/*
declare module 'p-props' {
  function promiseProps<V, M extends { [key: string]: PromiseLike<V> | V }>(input: M): Promise<Record<keyof M, V>>;
  function promiseProps<K, V>(input: Map<K, PromiseLike<V> | V>): Promise<Map<K, V>>;

  export default promiseProps
}
*/
