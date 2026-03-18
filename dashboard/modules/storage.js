/**
 * Storage Module
 * Sadece veri okuma/yazma işlerinden sorumludur.
 * UI ile ilgili hiçbir kod içermez.
 */

import { FLOW_SCHEMA_VERSION } from './constants.js';
import { normalizeFlowSchema } from './block-helpers.js';
import { generateId } from './utils.js';

function migrateFlow(flow) {
    const migrated = normalizeFlowSchema(flow, { generateId });
    if (!Number.isFinite(migrated.schemaVersion) || migrated.schemaVersion < FLOW_SCHEMA_VERSION) {
        migrated.schemaVersion = FLOW_SCHEMA_VERSION;
    }
    return migrated;
}

export const Storage = {
    async getFlows() {
        const data = await chrome.storage.local.get('flows');
        const rawFlows = Array.isArray(data.flows) ? data.flows : [];
        const flows = rawFlows.map(migrateFlow);

        // Legacy verileri otomatik yükselt
        if (JSON.stringify(rawFlows) !== JSON.stringify(flows)) {
            await chrome.storage.local.set({ flows });
        }

        return flows;
    },

    async saveFlow(flow) {
        const flows = await this.getFlows();
        const index = flows.findIndex(f => String(f.id) === String(flow.id));

        const safeFlow = migrateFlow(flow);

        if (index > -1) {
            flows[index] = safeFlow;
        } else {
            flows.push(safeFlow);
        }

        await chrome.storage.local.set({ flows });
        return flows;
    },

    async deleteFlow(flowId) {
        const flows = await this.getFlows();
        const newFlows = flows.filter(f => String(f.id) !== String(flowId));
        await chrome.storage.local.set({ flows: newFlows });
        return newFlows;
    },

    async setFlows(flows) {
        const safeFlows = Array.isArray(flows) ? flows.map(migrateFlow) : [];
        await chrome.storage.local.set({ flows: safeFlows });
        return safeFlows;
    },

    async getLogs() {
        const data = await chrome.storage.local.get('logs');
        return data.logs || [];
    },

    // Buttons
    async getButtons() {
        const data = await chrome.storage.local.get('buttons');
        return data.buttons || [];
    },

    async saveButtons(buttons) {
        await chrome.storage.local.set({ buttons });
        return buttons;
    }
};
