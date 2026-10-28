export type DocumentType =
  | "rg"
  | "cpf"
  | "comprovante"
  | "contrato"
  | "outro";

export type CustomerDocument = {
  $id: string;
  customerId: string;
  ownerId: string;
  type: DocumentType;
  fileId: string;
  fileName: string;
  $createdAt: string;
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  rg: "RG",
  cpf: "CPF",
  comprovante: "Comprovante",
  contrato: "Contrato",
  outro: "Outro",
};
