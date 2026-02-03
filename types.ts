
export enum OrderStatus {
  PENDING = 'Захиалга үүссэн',
  SHIPPED = 'Хүргэлтэнд гарсан',
  DELIVERED = 'Бараа хүргэгдсэн',
  PAID = 'Төлбөр баталгаажсан',
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
  discountPrice?: number; // Хөнгөлөх дүн
  discountPercent?: number; // Хөнгөлөх хувь
  imageUrl?: string;
}

export interface InventoryBatch {
  id: string;
  item_id: string;
  quantity: number;
  cost: number;
  created_at: string;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  region: string;
  avatar: string;
}

export interface OrderComment {
  id: string;
  orderId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: 'order' | 'system' | 'mention';
  orderId?: string; // Аль захиалга руу очихыг заана
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  customerLink?: string;
  date: string;
  timestamp: string;
  amount: number;
  profit: number;
  status: OrderStatus;
  repId: string;
  items: { 
    productId: string; 
    name: string; 
    quantity: number; 
    price: number;
    cost?: number; // Added to track cost at the time of sale for returns
  }[];
  cancelledReason?: string;
  paymentMethod?: string;
  deliveryDriver?: string;
  processedBy?: string;
  comments?: OrderComment[];
  lastStatusUpdate?: string; // New field for tracking status duration
}

export interface RestockLog {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  cost_yuan: number;
  mnt_cost: number;
  exchange_rate: number;
  extra_costs?: { label: string; amount: number }[];
  restock_date: string;
  created_at: string;
}

export interface RestockTemplate {
  id: string;
  name: string;
  costs: { label: string; amount: number }[];
}

export interface MonthlyData {
  month: string;
  sales: number;
  profit: number;
}

export interface AppState {
  inventory: InventoryItem[];
  orders: Order[];
  restockLogs: RestockLog[];
  restockTemplates: RestockTemplate[];
  reps: SalesRep[];
  monthlyStats: MonthlyData[];
  drivers: string[];
  paymentMethods: string[];
  users: User[];
  currentUser: User;
  notifications: Notification[];
}
