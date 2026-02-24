export function logObject(title: string, object: Object): void {
  console.log("--");
  console.log(`-- ${title}`);
  console.log("--");
  console.dir(object, { depth: null })
}
