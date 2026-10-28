export function assertOnline(online: boolean): void {
  if (!online) {
    throw new Error("Esta ação requer conexão com a internet.");
  }
}
