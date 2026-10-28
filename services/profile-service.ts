import { functions } from "@/lib/appwrite";

const FUNCTION_ID = "profile-service";

type ProfileServiceResponse =
  | { ok: true; profile: Record<string, unknown> }
  | { ok: false; message: string };

/** Gravações em perfis passam pela Function, que valida quem chama e aplica as labels de acesso. */
export async function callProfileService(
  action: "bootstrap" | "updateName" | "setManagerAccess",
  payload: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const execution = await functions.createExecution({
    functionId: FUNCTION_ID,
    body: JSON.stringify({ action, ...payload }),
    async: false,
  });

  let data: ProfileServiceResponse | null = null;
  try {
    data = JSON.parse(execution.responseBody) as ProfileServiceResponse;
  } catch {
    data = null;
  }
  if (!data) {
    throw new Error("Não foi possível falar com o servidor. Tente novamente.");
  }
  if (!data.ok) {
    throw new Error(data.message);
  }
  return data.profile;
}
