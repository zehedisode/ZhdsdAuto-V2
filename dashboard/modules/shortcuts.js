/**
 * Keyboard Shortcuts & Context Menu
 * Dashboard için kısayol tuşları ve sağ tık menüsü
 */

const GLOBAL_CLIPBOARD_KEY = 'globalBlockClipboard';

/**
 * Bloğu klonla (derin kopya + yeni ID)
 */
export function cloneBlock(blockId, currentFlow, generateId) {
    if (!currentFlow) return null;
    const block = currentFlow.blocks.find(b => String(b.id) === String(blockId));
    if (!block) return null;

    const clone = JSON.parse(JSON.stringify(block));
    clone.id = generateId();

    // Orijinalin hemen altına ekle
    const idx = currentFlow.blocks.indexOf(block);
    currentFlow.blocks.splice(idx + 1, 0, clone);
    return clone;
}

/**
 * Bloğu global panoya kopyalar (akışlar arası)
 */
export async function copyBlockToGlobalClipboard(blockId, currentFlow) {
    if (!currentFlow) return false;
    const block = currentFlow.blocks.find(b => String(b.id) === String(blockId));
    if (!block) return false;

    const payload = {
        copiedAt: Date.now(),
        block: JSON.parse(JSON.stringify(block))
    };

    await chrome.storage.local.set({ [GLOBAL_CLIPBOARD_KEY]: payload });
    return true;
}

/**
 * Global panodaki bloğu mevcut akışa yapıştırır
 */
export async function pasteBlockFromGlobalClipboard(currentFlow, generateId, insertAfterBlockId = null) {
    if (!currentFlow) return null;

    const data = await chrome.storage.local.get(GLOBAL_CLIPBOARD_KEY);
    const source = data?.[GLOBAL_CLIPBOARD_KEY]?.block;
    if (!source) return null;

    const clone = JSON.parse(JSON.stringify(source));
    clone.id = generateId();

    if (!clone.params || typeof clone.params !== 'object') {
        clone.params = {};
    }

    const targetIndex = insertAfterBlockId
        ? currentFlow.blocks.findIndex(b => String(b.id) === String(insertAfterBlockId))
        : -1;

    if (targetIndex >= 0) {
        currentFlow.blocks.splice(targetIndex + 1, 0, clone);
    } else {
        currentFlow.blocks.push(clone);
    }

    return clone;
}

/**
 * Context Menu (Sağ Tık Menüsü)
 */
export function setupContextMenu(container, { onCopy, onPaste, onClone, onDelete, onMoveUp, onMoveDown }) {
    let menu = document.getElementById('block-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'block-context-menu';
        menu.className = 'block-context-menu';
        menu.innerHTML = `
            <button data-action="copy">📄 Kopyala <kbd>Ctrl+C</kbd></button>
            <button data-action="paste">📥 Yapıştır <kbd>Ctrl+V</kbd></button>
            <div class="context-menu-divider"></div>
            <button data-action="clone">📋 Klonla <kbd>Ctrl+D</kbd></button>
            <button data-action="moveUp">⬆️ Yukarı Taşı</button>
            <button data-action="moveDown">⬇️ Aşağı Taşı</button>
            <div class="context-menu-divider"></div>
            <button data-action="delete" class="danger">🗑️ Sil <kbd>Del</kbd></button>
        `;
        document.body.appendChild(menu);
    }

    container.addEventListener('contextmenu', (e) => {
        const blockEl = e.target.closest('.block-item');
        if (!blockEl) return;
        e.preventDefault();

        const blockId = blockEl.dataset.blockId;
        menu.dataset.blockId = blockId;

        // Pozisyon
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.classList.add('visible');

        // Action handler
        menu.onclick = (ev) => {
            const action = ev.target.closest('button')?.dataset.action;
            if (!action) return;
            menu.classList.remove('visible');

            switch (action) {
                case 'copy': onCopy(blockId); break;
                case 'paste': onPaste(blockId); break;
                case 'clone': onClone(blockId); break;
                case 'delete': onDelete(blockId); break;
                case 'moveUp': onMoveUp(blockId, 'up'); break;
                case 'moveDown': onMoveDown(blockId, 'down'); break;
            }
        };
    });

    // Menüyü kapat
    document.addEventListener('click', () => menu.classList.remove('visible'));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') menu.classList.remove('visible');
    });
}

/**
 * Keyboard Shortcuts
 */
export function setupKeyboardShortcuts({ onSave, onRun, onDelete, onCopy, onPaste, onClone, onEscape, getSelectedBlockId }) {
    document.addEventListener('keydown', (e) => {
        // Input/textarea içindeyken kısayolları engelle (Ctrl hariç)
        const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        // Ctrl+S → Kaydet
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            onSave();
            return;
        }

        // Ctrl+C → Kopyala
        if (e.ctrlKey && e.key.toLowerCase() === 'c' && !inInput) {
            e.preventDefault();
            const id = getSelectedBlockId();
            if (id) onCopy(id);
            return;
        }

        // Ctrl+V → Yapıştır
        if (e.ctrlKey && e.key.toLowerCase() === 'v' && !inInput) {
            e.preventDefault();
            const id = getSelectedBlockId();
            onPaste(id || null);
            return;
        }

        // Ctrl+D → Klonla
        if (e.ctrlKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            const id = getSelectedBlockId();
            if (id) onClone(id);
            return;
        }

        // Input içindeyken diğer kısayollar çalışmasın
        if (inInput) return;

        // F5 → Çalıştır
        if (e.key === 'F5') {
            e.preventDefault();
            onRun();
            return;
        }

        // Delete → Seçili bloğu sil
        if (e.key === 'Delete') {
            const id = getSelectedBlockId();
            if (id) onDelete(id);
            return;
        }

        // Escape → Seçimi kaldır
        if (e.key === 'Escape') {
            onEscape();
        }
    });
}
