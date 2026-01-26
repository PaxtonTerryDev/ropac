export interface Action {}

export class ActionSet<T extends Action> {
  data: Set<T>;

  constructor(...args: T[]) {
    this.data = new Set<T>([...args])
  }
}
