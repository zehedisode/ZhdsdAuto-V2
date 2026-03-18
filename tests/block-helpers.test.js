/**
 * Block Helpers Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlock, validateBlock, validateFlow, normalizeFlowSchema, getBlockMeta } from '../dashboard/modules/block-helpers.js';
import { FLOW_SCHEMA_VERSION } from '../dashboard/modules/constants.js';

describe('createBlock', () => {
    it('should create a valid block with default params', () => {
        // crypto.randomUUID mock
        vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-123' });

        const block = createBlock('click');
        expect(block).toEqual({
            id: 'test-uuid-123',
            type: 'click',
            params: { selector: '' },
            enabled: true
        });
    });

    it('should include default values for params', () => {
        vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-456' });

        const block = createBlock('wait');
        expect(block.type).toBe('wait');
        expect(block.params.duration).toBe(1000);
    });

    it('should throw on unknown block type', () => {
        expect(() => createBlock('nonexistent')).toThrow('Bilinmeyen blok tipi');
    });

    it('should create blocks for all defined types', () => {
        vi.stubGlobal('crypto', { randomUUID: () => 'uuid' });

        const types = ['click', 'type', 'select', 'scroll', 'hover', 'keyboard',
            'navigate', 'newTab', 'activateTab', 'switchTab', 'closeTab',
            'wait', 'waitForElement', 'refresh',
            'readText', 'readAttribute', 'setVariable', 'getTabInfo',
            'condition', 'loop', 'forEach'];

        types.forEach(type => {
            const block = createBlock(type);
            expect(block.type).toBe(type);
            expect(block.enabled).toBe(true);
            expect(block.params).toBeDefined();
        });
    });
});

describe('validateBlock', () => {
    it('should pass for valid block with required params', () => {
        const result = validateBlock({
            type: 'click',
            params: { selector: '.btn' }
        });
        expect(result).toEqual({ valid: true });
    });

    it('should fail for missing required param', () => {
        const result = validateBlock({
            type: 'click',
            params: { selector: '' }
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('zorunlu');
    });

    it('should fail for unknown block type', () => {
        const result = validateBlock({
            type: 'unknown',
            params: {}
        });
        expect(result).toEqual({ valid: false, error: 'Bilinmeyen blok tipi' });
    });

    it('should pass for block with no required params', () => {
        const result = validateBlock({
            type: 'refresh',
            params: {}
        });
        expect(result).toEqual({ valid: true });
    });

    it('should validate multiple required params', () => {
        const result = validateBlock({
            type: 'type',
            params: { selector: '.input', text: '' }
        });
        expect(result.valid).toBe(false);
    });
});

describe('getBlockMeta', () => {
    it('should return name and icon for known type', () => {
        const meta = getBlockMeta('click');
        expect(meta.name).toBe('Tıkla');
        expect(meta.icon).toBe('🖱️');
    });

    it('should return name and icon for navigate', () => {
        const meta = getBlockMeta('navigate');
        expect(meta.name).toBe('Sayfaya Git');
        expect(meta.icon).toBe('🌐');
    });

    it('should return fallback for unknown type', () => {
        const meta = getBlockMeta('nonexistent');
        expect(meta.name).toBe('nonexistent');
        expect(meta.icon).toBe('⚡');
    });
});

describe('validateFlow', () => {
    it('should fail when flow name is empty', () => {
        const result = validateFlow({
            id: 'f1',
            name: '   ',
            blocks: []
        });

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.type === 'flowName')).toBe(true);
    });

    it('should fail when required block params are missing', () => {
        const result = validateFlow({
            id: 'f2',
            name: 'Test Akış',
            blocks: [
                { id: 'b1', type: 'click', params: { selector: '' }, enabled: true }
            ]
        });

        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('zorunlu');
    });

    it('should pass for a valid flow', () => {
        const result = validateFlow({
            id: 'f3',
            name: 'Geçerli Akış',
            blocks: [
                { id: 'b1', type: 'click', params: { selector: '.btn' }, enabled: true }
            ]
        });

        expect(result).toEqual({ valid: true, errors: [] });
    });
});

describe('normalizeFlowSchema', () => {
    it('should fill missing flow fields and block defaults', () => {
        const ids = ['flow-id', 'block-id'];
        const mockGenerateId = () => ids.shift();

        const result = normalizeFlowSchema(
            {
                id: 'legacy-flow',
                name: 'Legacy Akış',
                blocks: [{ type: 'wait', params: null }]
            },
            { generateId: mockGenerateId }
        );

        expect(result.id).toBe('legacy-flow');
        expect(result.schemaVersion).toBe(FLOW_SCHEMA_VERSION);
        expect(result.blocks[0]).toEqual({
            id: 'flow-id',
            type: 'wait',
            params: {},
            enabled: true
        });
    });
});
