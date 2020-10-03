import { useState, useEffect } from "react";
export enum StoreState {
  LOADING,
  RESOLVED,
  REJECTED,
}

type ResolvedCallbackParams<T> = {
  state: StoreState.RESOLVED;
  value: T;
};
type RejectedCallbackParams = {
  state: StoreState.REJECTED;
  error: Error;
};
type LoadingCallbackParams = {
  state: StoreState.LOADING;
};
type SubscriberParams<T> =
  | ResolvedCallbackParams<T>
  | RejectedCallbackParams
  | LoadingCallbackParams;
type Subscriber<T> = (config: SubscriberParams<T>) => void;

export type Dep<T> = {
  subscribe: (subscriber: Subscriber<T>) => void;
};

export function useDep<T>(dep: Dep<T>) {
  const [value, setValue] = useState<T | null>();
  const [error, setError] = useState<Error | null>();
  const [state, setState] = useState<StoreState>(StoreState.LOADING);
  useEffect(() => {
    dep.subscribe((cfg) => {
      setState(cfg.state);
      switch (cfg.state) {
        case StoreState.RESOLVED:
          setValue(cfg.value);
          return;
        case StoreState.REJECTED:
          setError(cfg.error);
          return;
        case StoreState.LOADING:
          setValue(null);
          setError(null);
          return;
      }
    });
  });
  return [value, state, error];
}

type Deppify<T> = {
  [K in keyof T]: Dep<T[K]>;
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

type Arr = readonly unknown[];

export function mergeDeps<Elems extends Arr, Z>(
  deps: Deppify<Elems>,
  cb: (...vals: Elems) => Z
): Dep<Z> {
  const subscribers: Array<Subscriber<Z>> = [];
  const values: Array<unknown> = (new Array(deps.length).fill(
    null
  ) as unknown) as Array<unknown>;
  const errors: Array<Error | null> = new Array(deps.length).fill(null);
  const loading: Array<number> = new Array(deps.length).fill(0);

  let resolvedCount = 0;
  let rejectedCount = 0;
  let loadingCount = 0;

  deps.forEach((dep, depIndex) =>
    dep.subscribe((config) => {
      switch (config.state) {
        case StoreState.RESOLVED:
          if (values[depIndex] === null) {
            resolvedCount++;
          }
          if (errors[depIndex] !== null) {
            rejectedCount--;
          }
          if (loading[depIndex] === 1) {
            loadingCount--;
          }
          values[depIndex] = config.value;
          errors[depIndex] = null;
          loading[depIndex]--;
          if (resolvedCount === deps.length && loadingCount === 0) {
            subscribers.forEach(emitSuccess(cb(...((values as any) as Elems))));
          }
          break;
        case StoreState.REJECTED:
          if (values[depIndex] !== null) {
            resolvedCount--;
          }
          if (errors[depIndex] === null) {
            rejectedCount++;
          }
          if (loading[depIndex] === 1) {
            loadingCount--;
          }
          values[depIndex] = null;
          errors[depIndex] = config.error;
          loading[depIndex]--;
          if (rejectedCount === 1) {
            subscribers.forEach(emitError(config.error));
          }
          break;
        case StoreState.LOADING:
          if (values[depIndex] !== null) {
            resolvedCount--;
          }
          if (errors[depIndex] !== null) {
            rejectedCount--;
          }
          if (loading[depIndex] === 0) {
            loadingCount++;
          }
          values[depIndex] = null;
          errors[depIndex] = null;
          loading[depIndex]++;
          if (loadingCount === 1) {
            subscribers.forEach(emitLoading());
          }
          break;
      }
    })
  );

  return {
    subscribe(subscriber: Subscriber<Z>) {
      subscribers.push(subscriber);
    },
  };
}

const emitError = <T>(error: Error) => (subscriber: Subscriber<T>) =>
  subscriber({ state: StoreState.REJECTED, error });

const emitSuccess = <T>(value: T) => (subscriber: Subscriber<T>) =>
  subscriber({ state: StoreState.RESOLVED, value });

const emitLoading = <T>() => (subscriber: Subscriber<T>) =>
  subscriber({
    state: StoreState.LOADING,
  });

export class Store<T> {
  subscribers: Subscriber<T>[] = [];
  state: StoreState;
  value: T | null = null;
  error: Error | null = null;

  constructor(resolver: (...args: any[]) => Promise<T>) {
    this.state = StoreState.LOADING;
    this.subscribers.forEach(emitLoading());
    resolver()
      .then((value) => {
        this.value = value;
        this.error = null;
        this.state = StoreState.RESOLVED;
        this.subscribers.forEach(emitSuccess(value));
      })
      .catch((error) => {
        this.value = null;
        this.error = error;
        this.state = StoreState.REJECTED;
        this.subscribers.forEach((subscriber) => emitError(error));
      });
  }

  dep(): Dep<T> {
    return {
      subscribe: this.subscribe.bind(this),
    };
  }

  emitState(subscriber: Subscriber<T>) {
    switch (this.state) {
      case StoreState.RESOLVED:
        return emitSuccess(nullthrows(this.value))(subscriber);
      case StoreState.LOADING:
        return emitLoading<T>()(subscriber);
      case StoreState.REJECTED:
        return emitError<T>(nullthrows(this.error))(subscriber);
    }
  }

  subscribe(subscriber: Subscriber<T>) {
    this.subscribers.push(subscriber);
    this.emitState(subscriber);
  }

  async update(modifier: (v: T | null) => Promise<T> | T) {
    this.state = StoreState.LOADING;
    this.subscribers.forEach((subscriber) => {
      subscriber({
        state: StoreState.LOADING,
      });
    });
    try {
      const value = await modifier(this.value);
      this.value = value;
      this.state = StoreState.RESOLVED;
      this.subscribers.forEach((subscriber) => {
        this.subscribers.forEach((subscriber) => {
          subscriber({ state: StoreState.RESOLVED, value });
        });
      });
    } catch (error) {
      this.state = StoreState.REJECTED;
      this.value = null;
      this.subscribers.forEach((subscriber) => {
        subscriber({ state: StoreState.REJECTED, error });
      });
    }
  }
}

export function nullthrows<T>(val: T | null, errorMsg?: string): T {
  if (val === null) {
    throw Error(errorMsg ?? "unexpected null");
  }
  return val;
}

export function useSuspenseDep<T>(dep: Dep<T>) {
  const [value, setValue] = useState<T | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    dep.subscribe((cfg) => {
      switch (cfg.state) {
        case StoreState.RESOLVED:
          setValue(cfg.value);
          setLoading(false);
          break;
        case StoreState.REJECTED:
          setValue(null);
          setLoading(false);
          break;
        case StoreState.LOADING:
          setValue(null);
          setLoading(true);
          break;
      }
    });
  });

  return () => {
    if (isLoading) {
      throw Promise.resolve();
    }

    return value;
  };
}
