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
  let configResolver: any;
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
    if (typeof configResolver === "function") {
      configResolver(cfg);
    }
  });

  return (props: Props) => {
    const [config, setConfig] = useState(ret);
    useEffect(() => {
      configResolver = setConfig;
    }, [setConfig]);
    switch (config.state) {
      case StoreState.LOADING:
        throw p;
      case StoreState.REJECTED:
        throw config.error;
      case StoreState.RESOLVED:
        const Container = makeContainer(config.value);
        return <Container {...props} />;
    }
  };
}
export default createSuspenseDepContainer;
