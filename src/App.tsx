import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { mergeDeps, Store, StoreState, useDep } from "./dep";

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
function App() {
  const [val, state] = useDep(dep);
  return (
    <div className="App">
      {state === StoreState.LOADING ? (
        <header className="App-header">Loading...</header>
      ) : (
        <span>
          <header className="App-header">{val}</header>
          <button onClick={() => store10.update(genRandom10)}>
            Regenerate
          </button>
          {state}
        </span>
      )}
    </div>
  );
}

export default App;
