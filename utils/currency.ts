export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseBRLInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) / 100 : 0;
}

export function maskBRLInput(value: string): string {
  const n = parseBRLInput(value);
  return formatBRL(n).replace("R$", "").trim();
}
