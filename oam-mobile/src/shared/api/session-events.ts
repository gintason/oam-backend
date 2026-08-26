/**
 * Tiny pub/sub so the API layer can tell the app "the session is dead" without
 * importing navigation or the auth store (keeps `shared` dependency-free).
 * The auth store subscribes and redirects to sign-in.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const sessionEvents = {
  onExpired(cb: Listener): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  emitExpired() {
    listeners.forEach((l) => l());
  },
};
