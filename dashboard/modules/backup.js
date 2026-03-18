/**
 * 💾 Backup & Restore Module
 * Akışları yedekleme ve geri yükleme işlemleri.
 */

import { Storage } from './storage.js';
import { showToast, generateId } from './utils.js';
import { BLOCK_TYPES, FLOW_SCHEMA_VERSION } from './constants.js';
import { normalizeFlowSchema, validateFlow } from './block-helpers.js';

const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(['application/json', 'text/plain', '']);

function migrateFlow(flow) {
    const migrated = normalizeFlowSchema(flow, { generateId });

    if (!Number.isFinite(migrated.schemaVersion) || migrated.schemaVersion < 1) {
        migrated.schemaVersion = 1;
    }

    if (migrated.schemaVersion < FLOW_SCHEMA_VERSION) {
        migrated.schemaVersion = FLOW_SCHEMA_VERSION;
    }

    return migrated;
}

function validateImportFile(file) {
    if (file.size > MAX_BACKUP_FILE_BYTES) {
        throw new Error('Yedek dosyası çok büyük (maksimum 5MB)');
    }

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
        throw new Error('Geçersiz dosya türü. Yalnızca JSON yüklenebilir');
    }

    const lowerName = String(file.name || '').toLowerCase();
    if (!lowerName.endsWith('.json')) {
        throw new Error('Geçersiz dosya uzantısı. .json bekleniyor');
    }
}

function parseIncomingFlows(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.flows)) return parsed.flows;
    throw new Error('Yedek dosyası bozuk (akış listesi bulunamadı)');
}

function sanitizeIncomingFlows(incomingFlows) {
    const allowedTypes = new Set(Object.keys(BLOCK_TYPES));
    const migratedFlows = [];
    const skipped = [];

    incomingFlows.forEach((flow, flowIndex) => {
        const migrated = migrateFlow(flow);

        const unsupportedBlocks = migrated.blocks.filter(b => !allowedTypes.has(b.type));
        if (unsupportedBlocks.length > 0) {
            skipped.push({
                flowName: migrated.name || `Akış ${flowIndex + 1}`,
                reason: `Desteklenmeyen blok tipleri: ${unsupportedBlocks.map(b => b.type).join(', ')}`
            });
            return;
        }

        const validation = validateFlow(migrated);
        if (!validation.valid) {
            skipped.push({
                flowName: migrated.name || `Akış ${flowIndex + 1}`,
                reason: validation.errors.map(e => e.message).join(' | ')
            });
            return;
        }

        migratedFlows.push(migrated);
    });

    return { migratedFlows, skipped };
}

export async function handleBackupDownload(State, DOM) {
    try {
        const flows = await Storage.getFlows();
        const backupPayload = {
            app: 'ZhdsdAuto',
            schemaVersion: FLOW_SCHEMA_VERSION,
            version: '1.1',
            exportedAt: new Date().toISOString(),
            flows: flows.map(flow => migrateFlow(flow))
        };

        const dataStr = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `zhdsdauto-backup-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`✅ ${flows.length} akış yedeklendi`, DOM);
    } catch (e) {
        console.error(e);
        showToast('❌ Yedek alınamadı', DOM);
    }
}

export function handleRestoreFileChange(event, State, DOM, renderFlowsView) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            validateImportFile(file);

            const content = e.target.result;
            const parsed = JSON.parse(content);
            const incomingFlows = parseIncomingFlows(parsed);
            const { migratedFlows, skipped } = sanitizeIncomingFlows(incomingFlows);

            if (migratedFlows.length === 0) {
                throw new Error('Yedekten yüklenebilecek geçerli akış bulunamadı');
            }

            if (confirm(`⚠️ DİKKAT: Bu işlem mevcut ${State.flows.length} akışınızı silecek ve yedekten ${migratedFlows.length} akış yükleyecek.\nOnaylıyor musunuz?`)) {
                const savedFlows = await Storage.setFlows(migratedFlows);
                State.setFlows(savedFlows);
                State.reset();
                renderFlowsView();

                if (skipped.length > 0) {
                    const skippedSummary = skipped.slice(0, 2).map(s => `${s.flowName}: ${s.reason}`).join(' | ');
                    showToast(`✅ ${savedFlows.length} akış yüklendi, ${skipped.length} akış atlandı (${skippedSummary})`, DOM);
                } else {
                    showToast(`✅ ${savedFlows.length} akış geri yüklendi`, DOM);
                }
            }
        } catch (error) {
            console.error(error);
            showToast('❌ Hata: ' + error.message, DOM);
        } finally {
            DOM.restoreFileInput.value = '';
        }
    };

    reader.readAsText(file);
}
