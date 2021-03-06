import React, { Suspense } from "react";

// import type {StoreState} from './dep';
import { render, act } from "@testing-library/react";
import App from "./App";
import { Store, useDep, StoreState, mergeDeps, useSuspenseDep } from "./dep";
import createSuspenseDepContainer from "./createSuspenseDepContainer";

test("dep gets value", async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val] = useDep(dep);

    return <span>Found {val}</span>;
  };
  const { findByText } = render(<Comp />);
  const comp = await findByText("Found 7");
  // const linkElement = getByText(/Found 7/i);
  expect(comp).toBeInTheDocument();
});

test("dep gets state", async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [value, state] = useDep(dep);

    return (
      <span>
        Found
        {state === StoreState.LOADING
          ? "Loading"
          : state === StoreState.RESOLVED
          ? "Resolved"
          : null}
      </span>
    );
  };
  const { findByText } = render(<Comp />);
  const comp = await findByText("FoundLoading");
  expect(comp).toBeInTheDocument();
  const comp2 = await findByText("FoundResolved");
  expect(comp2).toBeInTheDocument();
});

test("dep changes on action", async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val] = useDep(dep);

    return <span>Found {val}</span>;
  };
  const { findByText } = render(<Comp />);
  const comp = await findByText("Found 7");
  expect(comp).toBeInTheDocument();
  await act(() => store.update((v) => (v ? v + 2 : 0)));
  const comp2 = await findByText("Found 9");
  expect(comp2).toBeInTheDocument();
});

test("dep changes on async action", async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();
  const Comp = () => {
    const [val, state] = useDep(dep);

    return <span>Found {state === StoreState.LOADING ? "Loading" : val}</span>;
  };
  const { findByText, getByText } = render(<Comp />);
  const comp = await findByText("Found 7");
  expect(comp).toBeInTheDocument();
  let resolve: (v: number) => void = () => null;
  let p = act(async () =>
    store.update((v) =>
      new Promise<number>((currResolve) => {
        resolve = currResolve;
      }).then((x) => (v ? v + x : 0))
    )
  );
  const loadingComp = getByText("Found Loading");
  expect(loadingComp).toBeInTheDocument();
  resolve(2);
  await p;
  const comp2 = await findByText("Found 9");
  expect(comp2).toBeInTheDocument();
});

test("dep changes on 2 stores", async () => {
  const store1 = new Store<number>(() => Promise.resolve(7));
  const store2 = new Store<number>(
    () => new Promise((resolve) => window.setTimeout(() => resolve(12), 100))
  );
  const dep1 = store1.dep();
  const dep2 = store2.dep();
  const dep3 = mergeDeps([dep1, dep2], (v1, v2) => v1 + v2);
  const Comp = () => {
    const [val] = useDep(dep3);

    return <span>Found {val}</span>;
  };
  const { findByText, getByText } = render(<Comp />);
  const comp = await findByText("Found 19");
  expect(comp).toBeInTheDocument();
});

test("merged dep changes on async action", async () => {
  const store1 = new Store<number>(() => Promise.resolve(7));
  const store2 = new Store<number>(
    () => new Promise((resolve) => window.setTimeout(() => resolve(12), 100))
  );
  const dep1 = store1.dep();
  const dep2 = store2.dep();
  const dep3 = mergeDeps([dep1, dep2], (v1, v2) => v1 + v2);
  const Comp = () => {
    const [val, state] = useDep(dep3);

    return (
      <span>{`Found ${state === StoreState.LOADING ? "Loading" : val}`}</span>
    );
  };
  const { findByText, getByText } = render(<Comp />);
  const comp = await findByText("Found 19");
  expect(comp).toBeInTheDocument();
  let resolve: (v: number) => void = () => null;
  let p = act(async () =>
    store2.update((v) =>
      new Promise<number>((currResolve) => {
        resolve = currResolve;
      }).then((x) => (v ? v + x : 0))
    )
  );
  const loadingComp = getByText("Found Loading");
  expect(loadingComp).toBeInTheDocument();
  resolve(2);
  await p;
  const comp2 = await findByText("Found 21");
  expect(comp2).toBeInTheDocument();
});

test("useSuspenseDep", async () => {
  const store = new Store(() => Promise.resolve(7));
  const dep = store.dep();

  const Comp = ({ value, add }: { value: number; add: number }) => (
    <span>{value + add}</span>
  );
  const SuspenseComp = createSuspenseDepContainer(
    dep,
    (value) => ({ basic }: { basic: number }) => (
      <Comp add={value} value={basic} />
    )
  );

  const LoadingComp = () => (
    <Suspense fallback={<header className="App-header">Loading...</header>}>
      <SuspenseComp basic={1000} />
    </Suspense>
  );

  const { findByText, getByText } = render(<LoadingComp />);
  const comp = await findByText("1007");
  expect(comp).toBeInTheDocument();
  let resolve: (v: number) => void = () => null;
  let p = act(async () =>
    store.update((v) =>
      new Promise<number>((currResolve) => {
        resolve = currResolve;
      }).then((x) => (v ? v + x : 0))
    )
  );
  const loadingComp = getByText("Loading...");
  expect(loadingComp).toBeInTheDocument();
  resolve(2);
  await p;
  const comp2 = await findByText("1009");
  expect(comp2).toBeInTheDocument();
});
