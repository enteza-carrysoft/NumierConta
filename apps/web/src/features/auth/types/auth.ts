export type AuthResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string }

export type AuthProvider = 'email'
