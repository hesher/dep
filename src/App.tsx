import React, { Suspense, useState } from "react";
import "./App.css";
import genDepContainer from "./createSuspenseDepContainer";
import { mergeDeps, Store } from "./dep";

const genRandom10 = (): Promise<number> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(Math.floor(Math.random() * 100) * 10), 500)
  );

const genRandom1 = (): Promise<number> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(Math.floor(Math.random() * 10)), 2000)
  );

const store10 = new Store(genRandom10); // Lazy evaluation so we're passing a resolver (function that returns a promise)
const store1 = new Store(genRandom1);

const dep = mergeDeps([store10.dep(), store1.dep()], (ten, one) => {
  return ten + one;
});

function DepSuspenseComp<T>({ val }: { val: T }) {
  return (
    <div className="App">
      <span>
        <header className="App-header">{val}</header>
        <button onClick={() => store10.update(genRandom10)}>Regenerate</button>
      </span>
    </div>
  );
}
const MyContainer = genDepContainer<number, { add: number }>(
  dep,
  (value) => ({ add }) => {
    const [count, setCount] = useState(1);
    return (
      <span>
        <DepSuspenseComp val={value + add + count} />
        <button onClick={() => setCount(count + 1)}>ADD</button>
      </span>
    );
  }
);
const DevSuspenseTest = () => {
  return (
    <Suspense fallback={<header className="App-header">Loading...</header>}>
      <MyContainer add={1000} />
    </Suspense>
  );
};

export default DevSuspenseTest;
