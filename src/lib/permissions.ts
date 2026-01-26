export type Permission = "create" | "read" | "update" | "delete";
export type PermissionShorthand = `${"C" | ""}${"R" | ""}${"U" | ""}${"D" | ""}`

//
// function parseShorthand(sh: PermissionShorthand): Permission[] {
//   const p: Permission[] = [];
//   const map = {
//     "C": "Create",
//     "R": "Read",
//     "U": "Update",
//     "D": "Delete"
//   } as const;
//
//   for (const char of sh) {
//     p.push(map[char as keyof typeof map]);
//   }
//   return p;
// }
