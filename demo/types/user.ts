export interface UserProfile {
  id: string;
  name: string;
  email: string;
  address: {
    street: string;
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: {
        enabled: boolean;
        frequency: string;
      };
    };
    theme: string;
  };
}

export interface FetchUserProfileArgs {
  userId: string;
}

export type Role = 'admin' | 'team_lead' | 'employee';

export interface UserRole {
  userId: string;
  roles: Role[];
}

