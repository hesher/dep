import React, { useEffect, useState } from "react";
import "./App.css";
import { Dep, StoreState } from "./dep";

const p = Promise.resolve();
function createSuspenseDepContainer<T, Props>(
  dep: Dep<T>,
  makeContainer: (depValue: T) => React.ComponentType<Props>
): React.ComponentType<Props> {
  let ret:
    | { value: T; state: StoreState.RESOLVED }
    | { value: null; state: StoreState.LOADING }
    | { error: Error; state: StoreState.REJECTED } = {
    state: StoreState.LOADING,
    value: null,
  };
  let stateResolver: any;
  dep.subscribe((cfg) => {
    switch (cfg.state) {
      case StoreState.RESOLVED:
        ret = { state: StoreState.RESOLVED, value: cfg.value };
        break;
      case StoreState.REJECTED:
        ret = { state: StoreState.REJECTED, error: cfg.error };
        break;
      case StoreState.LOADING:
        ret = { state: StoreState.LOADING, value: null };
        break;
    }
    if (typeof stateResolver === "function") {
      stateResolver(cfg.state);
    }
  });

  return (props: Props) => {
    const [, setState] = useState<T | null>(null);
    useEffect(() => {
      stateResolver = setState;
    }, [setState]);
    switch (ret.state) {
      case StoreState.LOADING:
        throw p;
      case StoreState.REJECTED:
        throw ret.error;
      case StoreState.RESOLVED:
        const Container = makeContainer(ret.value);
        return <Container {...props} />;
    }
  };
}
export default createSuspenseDepContainer;
