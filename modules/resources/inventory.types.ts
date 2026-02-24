export type InventoryStatus =
  | "available"
  | "in_use"
  | "maintenance"
  | "retired";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  borrowed: number;
  status?: InventoryStatus;
  serial?: string;
  location?: string;
  assignee?: string;
  acquisitionDate?: string;
  value?: number;
  notes?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};
