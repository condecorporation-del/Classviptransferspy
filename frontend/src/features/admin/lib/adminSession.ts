// Token de sesión del admin (JWT). Se guarda en localStorage y se manda como
// `Authorization: Bearer <token>` en cada request al panel.
//
// ¿Por qué token + header y no solo la cookie httpOnly? El frontend (Vercel /
// www.classviptransfers.com) y el backend (Railway) viven en dominios DISTINTOS,
// así que la cookie de sesión es "cross-site". Safari iOS (ITP) y cada vez más
// navegadores móviles BLOQUEAN las cookies cross-site → en el celular el login
// respondía 200 pero la cookie nunca se guardaba y /me daba 401 (no se podía
// entrar). El header Authorization no sufre esa restricción y funciona en todos
// los dispositivos. La cookie se mantiene como camino secundario (desktop).
const TOKEN_KEY = 'cvt-admin-token';

export function readAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeAdminToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage no disponible (modo privado muy estricto): se cae a la cookie.
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // noop
  }
}
