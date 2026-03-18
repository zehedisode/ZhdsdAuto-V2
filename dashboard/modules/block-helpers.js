/**
 * Block Helper Functions
 * createBlock ve validateBlock fonksiyonları.
 * Blok tanımları constants.js'ten gelir.
 */
import { BLOCK_TYPES, FLOW_SCHEMA_VERSION } from './constants.js';

const BLOCK_LIST = Object.values(BLOCK_TYPES);

/**
 * Yeni bir blok örneği oluştur
 * @param {string} typeId - Blok tipi (örn: 'click', 'type', 'navigate')
 * @returns {Object} Yeni blok nesnesi
 */
export function createBlock(typeId) {
    const typeDef = BLOCK_LIST.find(b => b.id === typeId);
    if (!typeDef) throw new Error(`Bilinmeyen blok tipi: ${typeId}`);

    const params = {};
    typeDef.params.forEach(p => {
        params[p.key] = p.default !== undefined ? p.default : '';
    });

    return {
        id: crypto.randomUUID(),
        type: typeId,
        params,
        enabled: true
    };
}

/**
 * Bloku doğrula — zorunlu alanları kontrol et
 * @param {Object} block - Doğrulanacak blok
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBlock(block) {
    if (!block || typeof block !== 'object') {
        return { valid: false, error: 'Geçersiz blok verisi' };
    }

    const typeDef = BLOCK_LIST.find(b => b.id === block.type);
    if (!typeDef) return { valid: false, error: 'Bilinmeyen blok tipi' };

    const params = block.params && typeof block.params === 'object' ? block.params : {};

    for (const param of typeDef.params) {
        if (param.required && !params[param.key]) {
            return { valid: false, error: `"${param.label}" alanı zorunlu` };
        }
    }
    return { valid: true };
}

/**
 * Akış doğrulama (flow + block)
 * @param {Object} flow
 * @returns {{ valid: boolean, errors: Array<{type: string, message: string, blockId?: string}> }}
 */
export function validateFlow(flow) {
    const errors = [];

    if (!flow || typeof flow !== 'object') {
        return { valid: false, errors: [{ type: 'flow', message: 'Geçersiz akış verisi' }] };
    }

    const name = String(flow.name || '').trim();
    if (!name) {
        errors.push({ type: 'flowName', message: 'Akış adı boş olamaz' });
    }

    if (!Array.isArray(flow.blocks)) {
        errors.push({ type: 'flow', message: 'Akış blok listesi geçersiz' });
        return { valid: false, errors };
    }

    flow.blocks.forEach((block, index) => {
        if (!block || typeof block !== 'object') {
            errors.push({ type: 'block', blockId: null, message: `#${index + 1} blok geçersiz` });
            return;
        }

        const res = validateBlock(block);
        if (!res.valid) {
            errors.push({
                type: 'block',
                blockId: block.id,
                message: `#${index + 1} ${res.error}`
            });
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Akış şemasını normalize eder (migration-safe)
 */
export function normalizeFlowSchema(flow, { generateId }) {
    const safeFlow = flow && typeof flow === 'object' ? flow : {};

    const rawBlocks = Array.isArray(safeFlow.blocks) ? safeFlow.blocks : [];
    const blocks = rawBlocks
        .filter(block => block && typeof block === 'object' && typeof block.type === 'string')
        .map(block => ({
            id: block.id || generateId(),
            type: block.type,
            params: block.params && typeof block.params === 'object' ? block.params : {},
            enabled: block.enabled !== false
        }));

    return {
        id: safeFlow.id || generateId(),
        name: String(safeFlow.name || 'İsimsiz Akış'),
        schemaVersion: Number.isFinite(safeFlow.schemaVersion) ? safeFlow.schemaVersion : FLOW_SCHEMA_VERSION,
        createdAt: Number.isFinite(safeFlow.createdAt) ? safeFlow.createdAt : Date.now(),
        blocks
    };
}

/**
 * Blok tipinden isim ve ikon bilgisini al
 * @param {string} typeId - Blok tipi
 * @returns {{ name: string, icon: string }}
 */
export function getBlockMeta(typeId) {
    const def = BLOCK_TYPES[typeId] || BLOCK_LIST.find(b => b.id === typeId);
    if (def) return { name: def.name, icon: def.icon };
    return { name: typeId, icon: '⚡' };
}
