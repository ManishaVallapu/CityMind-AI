export type RoleName = "CITIZEN" | "OFFICER" | "ADMIN";

export interface Role {
  id: number;
  name: RoleName;
  description?: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Optional officer-specific fields when enriched
  department_name?: string | null;
  badge_number?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}
