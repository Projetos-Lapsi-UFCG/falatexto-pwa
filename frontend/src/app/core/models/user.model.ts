export type UserType = 'admin' | 'guest';

export interface User {
  type: UserType;
  isLoggedIn: boolean;
}
