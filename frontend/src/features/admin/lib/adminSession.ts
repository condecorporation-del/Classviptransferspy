export function readAdminToken() {
  return null;
}

export function writeAdminToken(_token: string) {
  // Admin auth now relies on the secure httpOnly cookie set by the backend.
}

export function clearAdminToken() {
  // Nothing to clear client-side; server cookie is cleared on logout or auth failure.
}
