export type AppSettings = {
  $id: string;
  evolutionBaseUrl: string;
  evolutionApiKey: string;
  evolutionInstanceName: string;
  templateLoanCreated: string;
  templateDueSoon: string;
  templateDueToday: string;
  templateOverdue: string;
};

export const APP_SETTINGS_ID = "global";

export const emptyAppSettings = (): Omit<AppSettings, "$id"> => ({
  evolutionBaseUrl: "",
  evolutionApiKey: "",
  evolutionInstanceName: "riocred-global",
  templateLoanCreated:
    "Olá {nome}, seu empréstimo de {valor} foi registrado. Total: {total}.",
  templateDueSoon: "Olá {nome}, sua parcela de {valor} vence em breve ({data}).",
  templateDueToday: "Olá {nome}, sua parcela de {valor} vence hoje.",
  templateOverdue: "Olá {nome}, identificamos parcela em atraso de {valor}.",
});
