import { mergeShorthandPermissions, PermissionShorthand } from "@/lib/permissions";
import { Role, UserProfile, UserRole } from "../types/user";


export const defaultRolePermissions: Record<Role, PermissionShorthand> = {
  "admin": "CRUD",
  "team_lead": "RU",
  "employee": "R",
}

export const userRoles: UserRole[] = [
  { userId: "1", roles: ["admin", "employee"] },
  { userId: "2", roles: ["team_lead", "employee"] },
  { userId: "3", roles: ["employee"] },
  { userId: "4", roles: ["team_lead", "employee"] },
];

export function getUserRoles(userId: string): Role[] {
  const userRoleAssignment = userRoles.find(ur => ur.userId === userId);
  if (!userRoleAssignment) throw new Error(`No Roles found for user: ${userId}`)
  return userRoleAssignment.roles;
}

export function getDefaultRolePermissions(userId: string) {
  try {
    const roles = getUserRoles(userId);
    const defaultPermissions = roles.map(r => defaultRolePermissions[r]) 
    const merged = mergeShorthandPermissions(...defaultPermissions);
    return merged;
  } catch {
    throw new Error("Could not fetch default role permissions");
  }
}

export const users: UserProfile[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    address: {
      street: "123 Main St",
      city: "Seattle",
      country: "USA",
      coordinates: {
        lat: 47.6062,
        lng: -122.3321,
      },
    },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        push: {
          enabled: true,
          frequency: "daily",
        },
      },
      theme: "dark",
    },
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    address: {
      street: "456 Oak Ave",
      city: "Portland",
      country: "USA",
      coordinates: {
        lat: 45.5152,
        lng: -122.6784,
      },
    },
    preferences: {
      notifications: {
        email: false,
        sms: true,
        push: {
          enabled: false,
          frequency: "weekly",
        },
      },
      theme: "light",
    },
  },
  {
    id: "3",
    name: "Carol Davis",
    email: "carol@example.com",
    address: {
      street: "789 Pine Rd",
      city: "Denver",
      country: "USA",
      coordinates: {
        lat: 39.7392,
        lng: -104.9903,
      },
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        push: {
          enabled: true,
          frequency: "instant",
        },
      },
      theme: "dark",
    },
  },
  {
    id: "4",
    name: "Dan Miller",
    email: "dan@example.com",
    address: {
      street: "321 Elm Blvd",
      city: "Austin",
      country: "USA",
      coordinates: {
        lat: 30.2672,
        lng: -97.7431,
      },
    },
    preferences: {
      notifications: {
        email: false,
        sms: false,
        push: {
          enabled: true,
          frequency: "weekly",
        },
      },
      theme: "light",
    },
  },
];
