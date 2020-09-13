import React from 'react';

// import type {StoreState} from './dep';
import {render, act} from '@testing-library/react';
import App from './App';
import {Store, useDep, StoreState} from './dep';

test('renders learn react link', () => {
  const {getByText} = render(<App />);
  const linkElement = getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

test('dep gets value', async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val] = useDep(dep);

    return <span>Found {val}</span>;
  };
  const {findByText} = render(<Comp />);
  const comp = await findByText('Found 7');
  // const linkElement = getByText(/Found 7/i);
  expect(comp).toBeInTheDocument();
});

test('dep gets state', async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [value, state] = useDep(dep);

    return (
      <span>
        Found
        {state === StoreState.LOADING
          ? 'Loading'
          : state === StoreState.RESOLVED
          ? 'Resolved'
          : null}
      </span>
    );
  };
  const {findByText} = render(<Comp />);
  const comp = await findByText('FoundLoading');
  expect(comp).toBeInTheDocument();
  const comp2 = await findByText('FoundResolved');
  expect(comp2).toBeInTheDocument();
});

test('dep changes on action', async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val] = useDep(dep);

    return <span>Found {val}</span>;
  };
  const {findByText} = render(<Comp />);
  const comp = await findByText('Found 7');
  expect(comp).toBeInTheDocument();
  await act(() => store.update((v) => (v ? v + 2 : 0)));
  const comp2 = await findByText('Found 9');
  expect(comp2).toBeInTheDocument();
});

test('dep changes on async action', async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val, state] = useDep(dep);

    return <span>Found {state === StoreState.LOADING ? 'Loading' : val}</span>;
  };
  const {findByText, getByText} = render(<Comp />);
  const comp = await findByText('Found 7');
  expect(comp).toBeInTheDocument();
  let resolve: (v: number) => void = () => null;
  let p = act(async () =>
    store.update((v) =>
      new Promise<number>((currResolve) => {
        resolve = currResolve;
      }).then((x) => (v ? v + x : 0))
    )
  );
  const loadingComp = getByText('Found Loading');
  expect(loadingComp).toBeInTheDocument();
  resolve(2);
  await p;
  const comp2 = await findByText('Found 9');
  expect(comp2).toBeInTheDocument();
});
