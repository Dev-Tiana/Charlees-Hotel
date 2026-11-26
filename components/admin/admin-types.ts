import {
  AuditLog,
  CancellationRecord,
  ChatConversation,
  ChatMessage,
  Guest,
  HotelSettings,
  HousekeepingTask,
  MaintenanceIssue,
  MediaAsset,
  NotificationRecord,
  PaymentRecord,
  PhysicalRoom,
  RefundRecord,
  Reservation,
  RoomCategory,
  StaffUser,
} from '@/lib/types';

export interface AdminSnapshotData {
  storageMode: 'supabase_live' | 'preview_runtime';
  categories: RoomCategory[];
  rooms: PhysicalRoom[];
  guests: Guest[];
  reservations: Reservation[];
  payments: PaymentRecord[];
  cancellations: CancellationRecord[];
  refunds: RefundRecord[];
  housekeeping: HousekeepingTask[];
  maintenance: MaintenanceIssue[];
  media: MediaAsset[];
  notifications: NotificationRecord[];
  auditLogs: AuditLog[];
  chatConversations: ChatConversation[];
  chatMessages: ChatMessage[];
  settings: HotelSettings;
  staff: Omit<StaffUser, 'password_hash'>[];
}
