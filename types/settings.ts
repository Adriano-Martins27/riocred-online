export type UserSettings = {
  $id: string;
  ownerId: string;
  whatsapp: string;
  companyName: string;
  pixKey: string;
  whatsappEnabled: boolean;
  templateDefault: string;
  templateDueToday: string;
  templateOverdue: string;
};

export type UserSettingsInput = Omit<UserSettings, "$id" | "ownerId">;

export const emptySettings = (): UserSettingsInput => ({
  whatsapp: "",
  companyName: "RioCred",
  pixKey: "",
  whatsappEnabled: true,
  templateDefault: "Olá {nome}, sua parcela de {valor} vence em {data}.",
  templateDueToday: "Olá {nome}, sua parcela de {valor} vence hoje.",
  templateOverdue: "Olá {nome}, identificamos parcela em atraso de {valor}.",
});
