import React from 'react';

// import type {StoreState} from './dep';
import {render} from '@testing-library/react';
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
  // const linkElement = getByText(/Found 7/i);
});

test('dep changes on action', () => {});
