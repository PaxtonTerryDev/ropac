import { Recursive } from "./recursive";

/** Property that can be reliably serialized */
export type Primitive = string | number | boolean | null;

export type PrimitiveArray = Primitive[];

/** Primitive array which all values are of the same Primitive type */
export type StrictPrimitiveArray<T extends Primitive> = T[];

/** Property of either a Primitive, or an array of Primitives */
export type SerializableProperty = Primitive | PrimitiveArray[];

/** Object in which every key is a Serializable property */
type Serializable<T> = Recursive<Required<T>, SerializableProperty>

/** when provided with an object, and an array of possibly undefined object paths, sets those properties to null */
function enforceSerialization() {}

interface Name {
  first: string;
  middle?: string | null;
  last: string;
}

interface Author {
  name: Name,
  institution: "Corporate" | "Education"
}

interface Documents {
  author: Author;
  url: string; 
}

interface User {
  name: Name,
  age: number,
  documents: Documents[]
}

type UserResponse = Serializable<User>

const names: Name[] = [
  { first: "Jill", middle: "Jack", last: "Joy" },
  { first: "Marcus", last: "Vey" },
  { first: "Tanya", middle: "Rose", last: "Albrecht" },
  { first: "Owen", last: "Sato" },
  { first: "Lina", middle: "Kay", last: "Dreyfuss" },
];

const authors: Author[] = [
  { name: names[0], institution: "Corporate" },
  { name: names[1], institution: "Education" },
  { name: names[2], institution: "Corporate" },
  { name: names[3], institution: "Education" },
  { name: names[4], institution: "Corporate" },
];

const documents: Documents[] = [
  { author: authors[0], url: "https://corp.io/reports/q3" },
  { author: authors[1], url: "https://edu.org/papers/lattice-theory" },
  { author: authors[2], url: "https://corp.io/briefs/market-analysis" },
  { author: authors[3], url: "https://edu.org/papers/topology-intro" },
  { author: authors[4], url: "https://corp.io/specs/v2-migration" },
  { author: authors[1], url: "https://edu.org/papers/graph-coloring" },
];

const users: User[] = [
  { name: names[0], age: 34, documents: [documents[0], documents[2]] },
  { name: names[1], age: 51, documents: [documents[1], documents[5]] },
  { name: names[2], age: 28, documents: [documents[2]] },
  { name: names[3], age: 43, documents: [documents[3], documents[1]] },
  { name: names[4], age: 39, documents: [documents[4], documents[0], documents[5]] },
];

const userReponse: UserResponse = users[0];
