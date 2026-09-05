/**
 * No-op version of attachSyncTriggers
 * Used to decommission the old event-driven sync system.
 */
export const attachSyncTriggers = (schema, module, modelName) => {
    // Triggers disabled as system moved to direct ExcelService sync in controllers.
    // console.log(`[SyncTriggers] Disabled triggers for ${modelName}`);
};
