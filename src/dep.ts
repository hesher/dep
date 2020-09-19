import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from "constants";
import { emit } from "process";
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
  return [value, state];
}

type Deppify<T> = {
  [K in keyof T]: Dep<T[K]>;
};

type Arr = readonly unknown[];

export function mergeDeps<Elems extends Arr, Z>(
  deps: Deppify<Elems>,
  cb: (...vals: Elems) => Z
): Dep<Z | null> {
  const subscribers: Subscriber<Z>[] = [];

  let loadingCount = 0;
  let resolvedCount = 0;
  let rejectedCount = 0;

  //xxxx

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

  constructor(resolver: () => Promise<T>) {
    this.state = StoreState.LOADING;
    this.subscribers.forEach(emitLoading());
    resolver()
      .then((value) => {
        this.value = value;
        this.error = null;
        const prevState = this.state;
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
        return emitSuccess(nullThrows(this.value))(subscriber);
      case StoreState.LOADING:
        return emitLoading<T>()(subscriber);
      case StoreState.REJECTED:
        return emitError<T>(nullThrows(this.error))(subscriber);
    }
  }

  subscribe(subscriber: Subscriber<T>) {
    this.subscribers.push(subscriber);
    this.emitState(subscriber);
  }

  async update(modifier: (v: T | null) => Promise<T> | T) {
    this.state = StoreState.LOADING;
    this.subscribers.forEach((subscriber) => {
      this.subscribers.forEach((subscriber) => {
        subscriber({
          state: StoreState.LOADING,
        });
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

function nullThrows<T>(val: T | null): T {
  if (val === null) {
    throw Error("unexpected null");
  }
  return val;
}
