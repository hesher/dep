import React from 'react';

import {render} from '@testing-library/react';
import App from './App';
import {Store, useDep} from './dep';

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

test('dep changes on action', () => {});
