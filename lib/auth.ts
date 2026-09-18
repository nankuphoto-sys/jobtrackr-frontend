const TOKEN_KEY = 'jobtrackr_token';
const USER_EMAIL_KEY = 'jobtrackr_user_email';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export function saveUserEmail(email: string) {
  localStorage.setItem(USER_EMAIL_KEY, email);
}

export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_EMAIL_KEY);
}
