const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT?.trim() ?? "";
const APPWRITE_PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID?.trim() ?? "";

export function isAppwriteConfigured(): boolean {
  return Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);
}

export function getAppwriteConnectionMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Erro desconhecido";

  if (message.includes("paused due to inactivity")) {
    return "Projeto Appwrite pausado por inatividade. Abra cloud.appwrite.io → projeto RioCred → Restore project.";
  }

  if (/failed to fetch|network request failed|network error/i.test(message)) {
    return "Não foi possível alcançar o Appwrite. Verifique internet, firewall e se o domínio está cadastrado em Auth → Platforms.";
  }

  if (/invalid origin|platform/i.test(message)) {
    return "Domínio não autorizado no Appwrite. Cadastre este hostname em Auth → Settings → Platforms (Web).";
  }

  if (!isAppwriteConfigured()) {
    return "Configure EXPO_PUBLIC_APPWRITE_ENDPOINT e EXPO_PUBLIC_APPWRITE_PROJECT_ID no .env (ou nas variáveis do Netlify).";
  }

  return message;
}

export async function pingAppwrite(
  ping: () => Promise<string>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isAppwriteConfigured()) {
    return {
      ok: false,
      message: getAppwriteConnectionMessage(new Error("missing config")),
    };
  }

  try {
    await ping();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getAppwriteConnectionMessage(error) };
  }
}
