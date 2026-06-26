export type OnboardingResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string }
