export type UUID = string;
export type MembershipRole =
  "owner" | "admin" | "manager" | "operator" | "viewer";
export interface Workspace {
  organizationId: UUID;
  organizationName: string;
  branchId: UUID | null;
  branchName: string | null;
  role: MembershipRole;
}
export interface Ingredient {
  id: UUID;
  organization_id: UUID;
  name: string;
  sku: string | null;
  brand: string | null;
  base_unit: string;
  current_cost: number;
  raw_cost?: number;
  yield_percentage: number;
  current_stock: number;
  minimum_stock: number;
  cost_method: "latest_purchase" | "weighted_average" | "manual_reference";
  active: boolean;
}
export interface Supplier {
  id: UUID;
  organization_id: UUID;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
}
export interface RecipeSummary {
  id: UUID;
  organization_id: UUID;
  name: string;
  category: string | null;
  portions: number;
  total_cost: number;
  unit_cost: number;
  current_price: number | null;
  margin_percentage: number | null;
  active: boolean;
}
export interface DashboardMetrics {
  ingredients: number;
  recipes: number;
  lowStock: number;
  averageMargin: number;
  monthlyPurchases: number;
  inventoryValue: number;
}
export interface SimpleResourceRecord {
  id: UUID;
  organization_id: UUID;
  created_at?: string;
  [key: string]: string | number | boolean | null | undefined;
}
