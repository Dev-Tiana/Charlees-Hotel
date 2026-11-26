/**
 * Charlees Hotel & Suites — Clean Data Service Layer
 *
 * This service layer isolates all public website pages, booking workflows,
 * and management dashboard modules from the underlying persistence engine.
 *
 * Currently in Development Mode (local mock dataset via store.ts) with
 * Supabase integration paused cleanly in lib/supabase/server.ts.
 * Set NEXT_PUBLIC_ENABLE_SUPABASE_LIVE=true with valid Supabase env vars
 * to switch every query and mutation over to live Supabase PostgreSQL & Storage
 * without rebuilding any UI components.
 */

import * as store from '@/lib/db/store';
import {
  DEV_PREVIEW_STAFF,
  SAMPLE_BOOKING_PREVIEWS,
} from '@/lib/db/seed-data';
import { SUPABASE_INTEGRATION_PAUSED } from '@/lib/supabase/server';

export const HotelDataService = {
  // Environment & Mode
  isDevelopmentMockMode: () =>
    SUPABASE_INTEGRATION_PAUSED || store.getStorageMode() !== 'supabase_live',
  getStorageMode: store.getStorageMode,

  // Public Catalog & Property Data
  getRoomCategories: store.getRoomCategories,
  getRoomCategoryBySlug: store.getRoomCategoryBySlug,
  getFacilities: store.getFacilities,
  getMediaAssets: store.getMediaAssets,
  getHotelSettings: store.getHotelSettings,

  // Availability & Guest Booking Engine
  checkAvailability: store.checkAvailability,
  createReservation: store.createReservation,
  lookupReservationByReference: store.lookupReservationByReference,
  requestReservationCancellation: store.requestReservationCancellation,
  cancelReservation: store.cancelReservation,
  submitBankTransferProof: store.submitBankTransferProof,
  setPaymentProviderReference: store.setPaymentProviderReference,
  updatePaymentProviderStatus: store.updatePaymentProviderStatus,
  confirmPaymentRecord: store.confirmPaymentRecord,
  recordContactInquiry: store.recordContactInquiry,
  recordAnalyticsEvent: store.recordAnalyticsEvent,

  // Live Chat Operations
  startOrGetGuestChat: store.startOrGetGuestChat,
  getGuestChatThread: store.getGuestChatThread,
  sendGuestChatMessage: store.sendGuestChatMessage,
  replyStaffChat: store.replyStaffChat,
  setChatStatusStaff: store.setChatStatusStaff,
  markStaffChatRead: store.markStaffChatRead,

  // Staff & Management Operations
  getAdminSnapshot: store.getAdminSnapshot,
  getAllRoomCategoriesAdmin: store.getAllRoomCategoriesAdmin,
  getPhysicalRooms: store.getPhysicalRooms,
  getStaffUsers: store.getStaffUsers,
  getStaffUserByEmail: store.getStaffUserByEmail,
  hasActiveOwnerAccount: store.hasActiveOwnerAccount,
  createOrBootstrapStaff: store.createOrBootstrapStaff,
  updateReservationAdmin: store.updateReservationAdmin,
  reviewCancellationRequestAdmin: store.reviewCancellationRequestAdmin,
  processRefundAdmin: store.processRefundAdmin,
  upsertPhysicalRoomAdmin: store.upsertPhysicalRoomAdmin,
  updateRoomCategoryAdmin: store.updateRoomCategoryAdmin,
  createOrUpdateHousekeepingTask: store.createOrUpdateHousekeepingTask,
  createOrUpdateMaintenanceIssue: store.createOrUpdateMaintenanceIssue,
  addMediaAssetAdmin: store.addMediaAssetAdmin,
  deleteMediaAssetAdmin: store.deleteMediaAssetAdmin,
  updateHotelSettingsAdmin: store.updateHotelSettingsAdmin,

  // Development Mode Helpers
  resetMockRuntimeDb: store.resetMockRuntimeDb,
  getDevPreviewStaffAccounts: () => DEV_PREVIEW_STAFF,
  getSampleLookupBookings: () => SAMPLE_BOOKING_PREVIEWS,
};
