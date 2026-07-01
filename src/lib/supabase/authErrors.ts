const KNOWN_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos.",
  "Email not confirmed": "Confirmá tu email antes de iniciar sesión.",
  "User already registered": "Ya existe una cuenta con ese email.",
  "Unable to validate email address: invalid format": "Ese email no es válido.",
  "Password should be at least 6 characters": "La contraseña es demasiado corta.",
};

export function translateAuthError(message: string): string {
  return KNOWN_MESSAGES[message] ?? "No pudimos completar la operación. Probá de nuevo.";
}
