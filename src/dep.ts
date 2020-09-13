import { useState, useEffect } from 'react';
export enum StoreState {
  LOADING,
  RESOLVED,
  REJECTED
}

type ResolvedCallbackParams<T> = { state: StoreState.RESOLVED, value: T };
type RejectedCallbackParams = { state: StoreState.REJECTED, error: Error };
type LoadingCallbackParams = { state: StoreState.LOADING };
type SubscriberParams<T> = (ResolvedCallbackParams<T> | RejectedCallbackParams | LoadingCallbackParams);
type Subscriber<T> = (config: SubscriberParams<T>) => void

export type Dep<T> = {
  subscribe: (subscriber: Subscriber<T>) => void;
};


export function useDep<T>(dep: Dep<T>) {
  const [value, setValue] = useState<T | null>();
  const [error, setError] = useState<Error | null>();
  const [state, setState] = useState<StoreState>(StoreState.LOADING);
  useEffect(() => {
    dep.subscribe(cfg => {
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

export function mergeDeps<T, S, Z>(deps: [Dep<T>, Dep<S>], cb: (v1: T, v2: S) => Z): Dep<Z> {
  const subscribers: Subscriber<Z>[] = [];
  // subscribers.forEach(sub => sub(cb(deps[0] + deps[1])))
  return {
    subscribe(subscriber: Subscriber<Z>) {
      subscribers.push(subscriber)
    }
  }
};


export class Store<T> {
  subscribers: Subscriber<T>[] = [];
  state: StoreState;
  value: T | null = null;

  constructor(resolver: () => Promise<T>) {
    this.state = StoreState.LOADING;
    resolver()
      .then((value) => {
        this.value = value;
        this.state = StoreState.RESOLVED;
        this.subscribers.forEach((subscriber) => {
          subscriber({ state: StoreState.RESOLVED, value });
        });
      })
      .catch((error) => {
        this.value = null;
        this.state = StoreState.REJECTED;
        this.subscribers.forEach((subscriber) => {
          subscriber({ state: StoreState.REJECTED, error });
        });
      });
  }

  dep(): Dep<T> {
    return {
      subscribe: this.subscribe.bind(this)
    };
  }

  subscribe(subscriber: Subscriber<T>) {
    this.subscribers.push(subscriber);
  }

  async update(modifier: (v: T | null) => Promise<T> | T) {
    this.state = StoreState.LOADING;
    this.subscribers.forEach((subscriber) => {
      this.subscribers.forEach((subscriber) => {
        subscriber({ state: StoreState.LOADING });
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
