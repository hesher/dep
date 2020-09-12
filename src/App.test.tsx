import React from 'react';
import {useState, useEffect} from 'react';
import {render} from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  const {getByText} = render(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

function useDep<T>(dep: {value: T; state: StoreState; store}) {
  const [value, setValue] = useState(dep.value);
  useEffect(() => {
    dep.store.subscribe((v) => setValue(v));
  }, []);
  return [value];
}

enum StoreState {
  LOADING,
  RESOLVED,
  REJECTED
}

type ResolutionSubscriber = <T>(val: T) => void;
type RejectionSubscriber = (e: Error) => void;

class Store<T> {
  resolutionSubscribers: ResolutionSubscriber[] = [];
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

  dep(): {value: T | null; state: StoreState} {
    return {value: this.value, state: this.state, store: this};
  }

  subscribe(
    resolutionSubscriber: ResolutionSubscriber,
    rejectionSubscriber: RejectionSubscriber
  ) {
    this.resolutionSubscribers.push(resolutionSubscriber);
    this.rejectionSubscribers.push(rejectionSubscriber);
  }
}

test('dep gets value', async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val] = useDep(dep);

    return <span>Found {val}</span>;
  };
  const {getByText, findByText} = render(<Comp />);
  const comp = await findByText('Found 7');
  // const linkElement = getByText(/Found 7/i);
  expect(comp).toBeInTheDocument();
});

test('dep changes on action', () => {});
