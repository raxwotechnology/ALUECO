import { EventEmitter } from 'events';

/**
 * BackupEventEmitter
 * Decouples CRUD operations from the file generation process.
 * Use this to emit events after a successful create, update, or delete.
 */
class BackupEventEmitter extends EventEmitter {}

const backupEmitter = new BackupEventEmitter();

// Event names
export const BACKUP_EVENTS = {
    PRODUCT_CHANGED: 'product:changed',
    CUSTOMER_CHANGED: 'customer:changed',
    MODULE_CHANGED: 'module:changed', // Generic catch-all
};

export default backupEmitter;
