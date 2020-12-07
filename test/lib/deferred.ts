export interface Deferred<T = undefined> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function createDeferred<T = undefined>(): Deferred<T> {
  let r;
  let j;
  const promise = new Promise<T>(
    (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ): void => {
      r = resolve;
      j = reject;
    }
  );

  // @ts-ignore
  return { promise, resolve: r, reject: j };
}
