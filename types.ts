
export enum OrderStatus {
  PENDING = 'Илгээх',
  DELIVERED = 'Хүргэсэн',
  CANCELLED = 'Цуцлагдсан'
}

export enum UserRole {
  ADMIN = 'Admin',
  SALES_MANAGER = 'Sales Manager',
  SALES_REP = 'Sales Representative'
}

export interface User {
  id: string;
  username: string;
  loginName: string;
  role: UserRole;
  isActive: boolean;
  password?: string;
  avatar?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  reorderPoint: number;
  price: number;
  originalCost: number;
  imageUrl?: string;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  region: string;
  avatar: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  timestamp: string;
  amount: number;
  profit: number;
  status: OrderStatus;
  repId: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  cancelledReason?: string;
  paymentMethod?: string;
  deliveryDriver?: string;
  processedBy?: string;
}

export interface MonthlyData {
  month: string;
  sales: number;
  profit: number;
}

export interface AppState {
  inventory: InventoryItem[];
  orders: Order[];
  reps: SalesRep[];
  monthlyStats: MonthlyData[];
  drivers: string[];
  paymentMethods: string[];
  users: User[];
  currentUser: User;
}
