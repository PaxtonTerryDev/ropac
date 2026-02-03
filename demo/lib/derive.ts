// type DerivedStateVariable =

import { FieldAccessor } from "./use-permissions";
import { Primitive } from "./utils/types/primitive";

export type DerivedStateValue<T> = Record<
  string,
  DeriveEvaluationJoin<T> | DeriveCondition<T>
>;

type Comparator = "equals" | "less" | "greater" | "lessEqual" | "greaterEqual";

// TODO: WOULD LIKE TO MAKE THIS GENERIC SO WE CAN EXPLICITLY DEFINE ACCESSOR PATHS
type DeriveCondition<T> = [FieldAccessor<T>, Comparator, Primitive];

interface DeriveEvaluationJoin<T> {
  /** Is true if all included instructions evaluate to true */
  and: DeriveCondition<T>[];
  /** Is true if any instructions evaluate to true */
  or: DeriveCondition<T>[];
}
