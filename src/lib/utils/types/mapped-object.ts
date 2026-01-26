export type MappedObject<BaseObj, MappedValue> = {
  [K in keyof BaseObj]: BaseObj[K] extends any[]
    ? MappedValue
    : BaseObj[K] extends object
      ? MappedObject<BaseObj[K], MappedValue>
      : MappedValue
};
