// "My Kadó" (SPEC F3b): the first Kadó opened in this browser. Per browser on
// purpose: another browser or an incognito window is another person.
// Storage can be blocked or wiped; the app then behaves as one code = one account.
const KEY = "kado:my-kado";

export function getMyKado(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setMyKado(code: string): void {
  try {
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, code);
  } catch {
    // storage unavailable: nothing to remember
  }
}
