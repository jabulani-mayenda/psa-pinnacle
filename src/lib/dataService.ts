import { platformApi } from './platformApi';
import { hasApiBackend } from './apiClient';
import {
  applicationsStore,
  repaymentsStore,
  chatsStore,
  alertsStore,
  customersStore,
  businessesStore,
  documentsStore,
  auditStore,
  type StoredDocument,
} from './store';
import type {
  AlertNotification,
  AuditLogEntry,
  ChatConversation,
  Customer,
  LoanApplication,
  Repayment,
  SmeBusiness,
} from '../types';

function fallback<T>(backendResult: T | null, localFallback: () => T, syncLocal?: (value: T) => void): T {
  if (!hasApiBackend()) return localFallback();
  if (backendResult !== null) {
    syncLocal?.(backendResult);
    return backendResult;
  }
  return localFallback();
}

function fallbackList<T>(
  backendResult: T[] | null,
  localFallback: () => T[],
  syncLocal?: (value: T[]) => void,
  filter?: (item: T) => boolean
): T[] {
  if (!hasApiBackend()) return localFallback();
  if (backendResult !== null) {
    syncLocal?.(backendResult);
    return filter ? backendResult.filter(filter) : backendResult;
  }
  return localFallback();
}

function businessBelongsToUser(business: SmeBusiness, userId: string): boolean {
  return business.customerId === userId || business.customerId === `cust-${userId}`;
}

export async function loadApplications(userId?: string): Promise<LoanApplication[]> {
  const backend = await platformApi.getApplications();
  return fallbackList(
    backend,
    () => applicationsStore.getAll(userId),
    applicationsStore.save,
    userId ? application => application.userId === userId : undefined
  );
}

export async function loadRepayments(userId?: string): Promise<Repayment[]> {
  const backend = await platformApi.getRepayments();
  return fallbackList(
    backend,
    () => repaymentsStore.getAll(userId),
    repaymentsStore.save,
    userId ? repayment => repayment.userId === userId : undefined
  );
}

export async function loadChats(): Promise<ChatConversation[]> {
  return fallback(null, chatsStore.getAll);
}

export async function loadAlerts(userId?: string): Promise<AlertNotification[]> {
  const backend = await platformApi.getAlerts();
  return fallbackList(
    backend,
    () => alertsStore.getAll(userId),
    alertsStore.save,
    userId ? alert => !alert.userId || alert.userId === userId : undefined
  );
}

export async function loadCustomers(): Promise<Customer[]> {
  return fallback(await platformApi.getCustomers(), customersStore.getAll, customersStore.save);
}

export async function loadBusinesses(userId?: string): Promise<SmeBusiness[]> {
  const backend = await platformApi.getBusinesses();
  return fallbackList(
    backend,
    () => businessesStore.getAll(userId),
    businessesStore.save,
    userId ? business => businessBelongsToUser(business, userId) : undefined
  );
}

export async function loadBusinessesForCustomer(customerId: string): Promise<SmeBusiness[]> {
  const loaded = await platformApi.getBusinessesByCustomerId(customerId);
  return fallback(loaded, () => {
    const all = businessesStore.getAll();
    return all.filter(business => businessBelongsToUser(business, customerId));
  }, businesses => {
    const otherBusinesses = businessesStore.getAll().filter(business => !businessBelongsToUser(business, customerId));
    businessesStore.save([...businesses, ...otherBusinesses]);
  });
}

export async function loadDocumentsForUser(userId: string): Promise<StoredDocument[]> {
  return fallback(await platformApi.getDocumentsForUser(userId), () => documentsStore.getForUser(userId));
}

export async function loadAuditLogs(): Promise<AuditLogEntry[]> {
  return fallback(await platformApi.getAuditLogs(), auditStore.getAll);
}

