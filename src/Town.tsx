import React from "react";
import createSuspenseDepContainer from "./createSuspenseDepContainer";
import PeopleStore from "./People";

const oneStore = PeopleStore("1");

const oneDep = oneStore.dep();

export default createSuspenseDepContainer(oneDep, (person) => () => (
  <span>
    <div>{person.name}</div>
    <div>From {person.street}</div>
  </span>
));
