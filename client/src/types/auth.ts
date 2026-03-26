export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  login: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AuthSuccessPayload = {
  token: string;
  user: AuthUser;
  rememberMe: boolean;
};
