import {useState, useEffect} from 'react';
export type Dep<T> = {value: T | null; state: StoreState; store: Store<T>};

export enum StoreState {
  LOADING,
  RESOLVED,
  REJECTED
}

export function useDep<T>(dep: Dep<T>) {
  const [value, setValue] = useState<T | null>(dep.value);
  const [state, setState] = useState<StoreState>(StoreState.LOADING);
  useEffect(() => {
    dep.store.subscribe((v, s) => {
      setValue(v);
      setState(s);
    });
  });
  return [value, state];
}

type ResolutionSubscriber<T> = (val: T | null, state: StoreState) => void;
type RejectionSubscriber = (e: Error, state: StoreState) => void;

export class Store<T> {
  resolutionSubscribers: ResolutionSubscriber<T>[] = [];
  rejectionSubscribers: RejectionSubscriber[] = [];
  state: StoreState;
  value: T | null = null;

  constructor(resolver: () => Promise<T>) {
    this.state = StoreState.LOADING;
    resolver()
      .then((value) => {
        this.value = value;
        this.state = StoreState.RESOLVED;
        this.resolutionSubscribers.forEach((subscriber) => {
          subscriber(this.value, this.state);
        });
      })
      .catch((error) => {
        this.value = null;
        this.state = StoreState.REJECTED;
        this.rejectionSubscribers.forEach((subscriber) => {
          subscriber(error, this.state);
        });
      });
  }

  dep(): Dep<T> {
    return {value: this.value, state: this.state, store: this};
  }

  subscribe(
    resolutionSubscriber: ResolutionSubscriber<T>,
    rejectionSubscriber?: RejectionSubscriber
  ) {
    this.resolutionSubscribers.push(resolutionSubscriber);
    if (rejectionSubscriber != null) {
      this.rejectionSubscribers.push(rejectionSubscriber);
    }
  }

  async update(modifier: (v: T | null) => Promise<T> | T) {
    this.value = await modifier(this.value);
    this.resolutionSubscribers.forEach((subscriber) => {
      subscriber(this.value, this.state);
    });
  }
}
