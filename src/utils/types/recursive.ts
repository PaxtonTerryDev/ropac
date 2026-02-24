/** 
 * Utility type that enforces type T eventually results in type A, so long as each key of T extends type Branch
 *
 * @default Branch object
 */
export type Recursive<Trunk, Leaf, Branch = object> = {
  [K in keyof Trunk]: Trunk[K] extends Leaf
  ? Trunk[K]
  : Trunk[K] extends Branch
    ? Recursive<Trunk[K], Leaf, Branch>
    : never;
}
