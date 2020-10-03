import { nullthrows, Store } from "./dep";

type Person = {
  id: string;
  name: string;
  age: number;
  street: string;
  houseNumber: number;
};

const Names = ["John", "Mary", "Beth", "Max", "Tim", "Philip", "Turd"];
const SurNames = [
  "Fart",
  "Kart",
  "Trudo",
  "Ross",
  "Nerf",
  "Roberto",
  "Escavar",
];
const Streets = [
  "Kenters Lodge",
  "Movers Lodge",
  "Masters Flurge",
  "Danderlane",
];
const randItem: <T>(arr: T[]) => T = (arr) =>
  arr[Math.floor(arr.length * Math.random())];

let id = 0;
const people: { [key: string]: Person } = Object.fromEntries(
  // [
  //   {
  //     id: "1",
  //     name: "John",
  //     age: 32,
  //     street: "Kenters Lodge",
  //     houseNumber: 32,
  //   },
  // ]
  Array(100)
    .fill(null)
    .map((p) => [
      `${id}`,
      {
        id: `${id++}`,
        name: `${randItem(Names)} ${randItem(SurNames)}`,
        age: Math.floor(Math.random() * 30) + 20,
        street: randItem(Streets),
        houseNumber: Math.floor(Math.random() * 50) + 10,
      },
    ])
);

const PeopleServer: { get(id: string): Promise<Person> } = {
  get: (id) =>
    new Promise((resolve) =>
      window.setTimeout(() => {
        resolve(nullthrows(people[id], `No person found for id:${id}`));
      }, 2000)
    ),
};

const peopleMap = new Map();
const PeopleStore: (id: string) => Store<Person> = (id: string) => {
  if (!peopleMap.has(id)) {
    peopleMap.set(id, new Store(() => PeopleServer.get(id)));
  }

  return peopleMap.get(id);
};

export default PeopleStore;
