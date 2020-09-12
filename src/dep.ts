import {useState, useEffect} from 'react';
export function useDep<T>(dep: {
  value: T | null;
  state: StoreState;
  store: Store<T>;
}) {
  const [value, setValue] = useState<T | null>(dep.value);
  useEffect(() => {
    dep.store.subscribe((v) => setValue(v));
  });
  return [value];
}

type Dep<T> = {value: T | null; state: StoreState; store: Store<T>};

enum StoreState {
  LOADING,
  RESOLVED,
  REJECTED
}

type ResolutionSubscriber<T> = (val: T | null) => void;
type RejectionSubscriber = (e: Error) => void;

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
          subscriber(value);
        });
      })
      .catch((error) => {
        this.value = null;
        this.state = StoreState.REJECTED;
        this.rejectionSubscribers.forEach((subscriber) => {
          subscriber(error);
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
}
