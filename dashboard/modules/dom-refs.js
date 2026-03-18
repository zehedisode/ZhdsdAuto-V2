/**
 * 📋 DOM References Module
 * Tüm DOM referanslarını önbelleğe alır.
 */

export function cacheDOMRefs() {
    return {
        // Views
        flowsView: document.getElementById('flowsView'),
        builderView: document.getElementById('builderView'),
        navItems: document.querySelectorAll('.nav-item'),

        // Flows
        flowsGrid: document.getElementById('flowsGrid'),
        emptyState: document.getElementById('emptyState'),
        createFlowBtn: document.getElementById('createFlowBtn'),
        emptyCreateBtn: document.getElementById('emptyCreateBtn'),

        // Backup / Restore
        backupDownloadBtn: document.getElementById('backupDownloadBtn'),
        restoreTriggerBtn: document.getElementById('restoreTriggerBtn'),
        restoreFileInput: document.getElementById('restoreFileInput'),

        // Builder
        flowNameInput: document.getElementById('flowNameInput'),
        canvasEmpty: document.getElementById('canvasEmpty'),
        blocksList: document.getElementById('blocksList'),
        saveFlowBtn: document.getElementById('saveFlowBtn'),
        runFlowBtn: document.getElementById('runFlowBtn'),
        backToFlows: document.getElementById('backToFlows'),
        blockSearchInput: document.getElementById('blockSearchInput'),
        unsavedBadge: document.getElementById('unsavedBadge'),

        // Console
        execConsole: document.getElementById('execConsole'),
        execConsoleBody: document.getElementById('execConsoleBody'),
        toggleConsoleBtn: document.getElementById('toggleConsoleBtn'),
        clearConsoleBtn: document.getElementById('clearConsoleBtn'),
        closeConsoleBtn: document.getElementById('closeConsoleBtn'),

        // Status
        statusBanner: document.getElementById('statusBanner'),
        bannerMessage: document.getElementById('bannerMessage'),
        progressBar: document.getElementById('progressBar'),
        stopBtn: document.getElementById('stopBtn'),
        toast: document.getElementById('toast'),
    };
}
