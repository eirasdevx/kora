export type DocumentCategory =
  | "PDF"
  | "Imagenes"
  | "Contratos"
  | "Hojas de Calculo"
  | "Carpetas";

export type DocumentSecurity = "Privado" | "Compartido" | "Cifrado";

export type DocumentType =
  | "pdf"
  | "doc"
  | "sheet"
  | "folder"
  | "csv"
  | "image"
  | "other";

export type DocumentVersion = {
  id: string;
  label: string;
  author: string;
  time: string;
};

export type DocumentItem = {
  id: string;
  associationId?: string;
  name: string;
  category: DocumentCategory;
  security: DocumentSecurity;
  type: DocumentType;
  size: number;
  mimeType: string;
  location: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  file?: Blob;
  access?: string[];
  versions?: DocumentVersion[];
};
