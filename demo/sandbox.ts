import { DerivedStateVariableDefinition } from "./lib/derive";

interface TestUser {
  name: {
    first: string;
    last: string;
  },
  age: number;
}

const testData: TestUser = {
  name: {
    first: "Bob",
    last: "Wilkins",
  },
  age: 62
}

const testDerived1: DerivedStateVariableDefinition = ["canEdit", []]
