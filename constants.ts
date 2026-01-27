
import { OrderStatus, InventoryItem, SalesRep, Order, MonthlyData, User, UserRole } from './types';

export const CURRENCY = '₮';

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Цай', sku: 'TEA-001', category: 'Ундаа', stock: 5, reorderPoint: 2, price: 5000, originalCost: 3500, imageUrl: 'https://picsum.photos/seed/tea/300/300' },
  { id: '2', name: 'Кофе', sku: 'COF-002', category: 'Ундаа', stock: 1, reorderPoint: 2, price: 8000, originalCost: 5500, imageUrl: 'https://picsum.photos/seed/coffee/300/300' },
  { id: '3', name: 'Сүүний үр', sku: 'MIL-003', category: 'Хүнс', stock: 5, reorderPoint: 3, price: 3000, originalCost: 2000, imageUrl: 'https://picsum.photos/seed/milk/300/300' },
  { id: '4', name: 'Үр', sku: 'SEE-004', category: 'Хүнс', stock: 0, reorderPoint: 5, price: 4500, originalCost: 3000, imageUrl: 'https://picsum.photos/seed/seeds/300/300' },
  { id: '5', name: 'Савлагаа', sku: 'PKG-005', category: 'Гэр ахуй', stock: 10, reorderPoint: 2, price: 1500, originalCost: 800, imageUrl: 'https://picsum.photos/seed/pack/300/300' },
];

export const MOCK_USERS: User[] = [
  { 
    id: 'u-admin', 
    username: 'Admin', 
    loginName: 'admin', 
    role: UserRole.ADMIN, 
    isActive: true, 
    password: 'Neo123456' 
  },
  { 
    id: 'u2', 
    username: 'Сараа Жэнкинс', 
    loginName: 'sarah', 
    role: UserRole.SALES_REP, 
    isActive: true, 
    password: 'password' 
  },
];

export const MOCK_REPS: SalesRep[] = [
  { id: 'rep1', name: 'Сараа Жэнкинс', email: 'sarah.j@neoerp.mn', region: 'Улаанбаатар', avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { id: 'rep2', name: 'Мишээл Чэн', email: 'm.chen@neoerp.mn', region: 'Дархан', avatar: 'https://picsum.photos/seed/michael/100/100' },
  { id: 'rep3', name: 'Елена Родригез', email: 'elena.r@neoerp.mn', region: 'Эрдэнэт', avatar: 'https://picsum.photos/seed/elena/100/100' },
];

export const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-1001', 
    customerName: 'Алис Жонсон', 
    customerPhone: '99112233',
    customerAddress: 'БЗД, 14-р хороо',
    date: '2023-10-15', 
    timestamp: '14:30:00',
    amount: 15000, 
    profit: 4500, 
    status: OrderStatus.DELIVERED, 
    repId: 'rep1', 
    items: [{ productId: '1', name: 'Цай', quantity: 3, price: 5000 }] 
  },
];

export const MOCK_MONTHLY_STATS: MonthlyData[] = [
  { month: '7-р сар', sales: 42500000, profit: 12000000 },
  { month: '8-р сар', sales: 55800000, profit: 15100000 },
  { month: '9-р сар', sales: 48200000, profit: 14800000 },
  { month: '10-р сар', sales: 69500000, profit: 16500000 },
  { month: '11-р сар', sales: 72000000, profit: 17800000 },
  { month: '12-р сар', sales: 88500000, profit: 22200000 },
];
