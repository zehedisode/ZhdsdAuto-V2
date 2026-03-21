/**
 * 🔘 ZhdsdAuto - Nuclear Overlay System (Shadow DOM v2)
 * 
 * Bu sürüm, CSS çakışmalarını ve üst üste binme sorunlarını 
 * Shadow DOM ve agresif Flexbox düzeni ile tamamen engeller.
 */

(function () {
    let host = null;
    let shadow = null;
    let lastUrl = location.href;
    let dragButtonId = null;

    // Başlatıcı
    const init = () => {
        refresh();

        // URL Takibi
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                refresh();
            }
        }, 1000);

        // DOM Takibi (Gerektiğinde yeniden oluştur)
        const observer = new MutationObserver(() => {
            if (host && !document.contains(host)) {
                refresh();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    async function refresh() {
        const data = await chrome.storage.local.get(['buttons', 'flows']);
        const buttons = Array.isArray(data.buttons) ? data.buttons : [];
        const flows = data.flows || [];
        const currentUrl = window.location.href;

        const activeButtons = buttons
            .filter(btn => {
                if (!btn?.urlPattern) return false;
                return currentUrl.toLowerCase().includes(String(btn.urlPattern).toLowerCase());
            })
            .sort((a, b) => {
                const ao = Number.isFinite(a?.order) ? a.order : Number.MAX_SAFE_INTEGER;
                const bo = Number.isFinite(b?.order) ? b.order : Number.MAX_SAFE_INTEGER;
                if (ao !== bo) return ao - bo;
                return String(a.id).localeCompare(String(b.id));
            });

        if (activeButtons.length === 0) {
            if (host) { host.remove(); host = null; }
            return;
        }

        ensureHost();
        render(activeButtons, flows);
    }

    function ensureHost() {
        if (!host || !document.contains(host)) {
            if (host) host.remove();
            host = document.createElement('div');
            host.id = 'zhdsd-overlay-host';
            // Z-index ve temel pozisyon (Shadow host için)
            Object.assign(host.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '0',
                height: '0',
                zIndex: '2147483647',
                pointerEvents: 'none'
            });
            shadow = host.attachShadow({ mode: 'open' });

            // Kritik CSS
            const style = document.createElement('style');
            style.textContent = `
                :host { all: initial; }
                .corner {
                    position: fixed;
                    display: flex;
                    gap: 12px;
                    padding: 20px;
                    pointer-events: none;
                    z-index: 2147483647;
                    box-sizing: border-box;
                    flex-direction: column;
                }
                .top-left { top: 0; left: 0; align-items: flex-start; }
                .top-right { top: 0; right: 0; align-items: flex-end; }
                .bottom-left { bottom: 0; left: 0; align-items: flex-start; flex-direction: column-reverse; }
                .bottom-right { bottom: 0; right: 0; align-items: flex-end; flex-direction: column-reverse; }

                .btn-wrapper {
                    pointer-events: auto;
                    display: flex;
                    margin: 0;
                    padding: 0;
                    position: static !important;
                }

                .btn-wrapper.dragging {
                    opacity: 0.45;
                }

                .btn-wrapper.drag-over {
                    outline: 2px dashed rgba(255,255,255,0.65);
                    outline-offset: 4px;
                    border-radius: 10px;
                }

                .zh-btn {
                    all: initial; /* Siteden gelen her şeyi sıfırla */
                    box-sizing: border-box;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 18px;
                    border-radius: 8px;
                    background-color: #3b82f6;
                    color: #ffffff;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: transform 0.2s, filter 0.2s, box-shadow 0.2s;
                    white-space: nowrap;
                    line-height: 1;
                    border: none;
                    pointer-events: auto;
                }

                .zh-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }

                .zh-btn:active {
                    transform: scale(0.96);
                }

                .sm { padding: 8px 12px; font-size: 11px; }
                .lg { padding: 16px 24px; font-size: 15px; }

                .pulse { animation: zh-pulse 2s infinite; }
                @keyframes zh-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }

                .running { background-color: #f59e0b !important; cursor: wait; pointer-events: none; }
            `;
            shadow.appendChild(style);

            ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(c => {
                const div = document.createElement('div');
                div.className = `corner ${c}`;
                shadow.appendChild(div);
            });

            document.body.appendChild(host);
        }
    }

    function render(activeButtons, flows) {
        // İçleri boşalt
        shadow.querySelectorAll('.corner').forEach(c => c.innerHTML = '');

        activeButtons.forEach(btn => {
            const flow = flows.find(f => f.id === btn.flowId);
            if (!flow) return;

            const corner = determineCorner(btn.style);
            const container = shadow.querySelector(`.${corner}`);
            if (!container) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'btn-wrapper';
            wrapper.dataset.buttonId = String(btn.id);
            wrapper.draggable = true;

            const b = document.createElement('button');
            b.className = 'zh-btn';

            // Konfigürasyon
            b.textContent = btn.label || flow.name;
            b.title = `${btn.tooltip || flow.name}\n\nSıralamayı değiştirmek için bu butonu sürükleyin.`;

            if (btn.size) b.classList.add(btn.size);
            if (btn.pulse) b.classList.add('pulse');

            // Stil (Sadece güvenli olanlar)
            if (btn.style) {
                if (btn.style.backgroundColor) b.style.backgroundColor = btn.style.backgroundColor;
                if (btn.style.background) b.style.background = btn.style.background;
                if (btn.style.borderRadius) b.style.borderRadius = btn.style.borderRadius;
                if (btn.style.color) b.style.color = btn.style.color;
            }

            wrapper.ondragstart = (e) => {
                dragButtonId = String(btn.id);
                wrapper.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dragButtonId);
            };

            wrapper.ondragend = () => {
                wrapper.classList.remove('dragging');
                shadow.querySelectorAll('.btn-wrapper.drag-over').forEach(el => el.classList.remove('drag-over'));
                dragButtonId = null;
            };

            wrapper.ondragover = (e) => {
                e.preventDefault();
                if (!dragButtonId || dragButtonId === String(btn.id)) return;
                wrapper.classList.add('drag-over');
            };

            wrapper.ondragleave = () => {
                wrapper.classList.remove('drag-over');
            };

            wrapper.ondrop = async (e) => {
                e.preventDefault();
                wrapper.classList.remove('drag-over');
                const sourceId = dragButtonId || e.dataTransfer.getData('text/plain');
                const targetId = String(btn.id);
                if (!sourceId || !targetId || sourceId === targetId) return;
                await reorderButtons(sourceId, targetId, activeButtons, corner);
            };

            b.onclick = (e) => {
                if (dragButtonId) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                const oldText = b.textContent;
                b.textContent = '⏳ ...';
                b.classList.add('running');
                chrome.runtime.sendMessage({ type: 'RUN_FLOW', flow }, () => {
                    setTimeout(() => { b.textContent = oldText; b.classList.remove('running'); }, 2000);
                });
            };

            wrapper.appendChild(b);
            container.appendChild(wrapper);
        });
    }

    async function reorderButtons(sourceId, targetId, activeButtons, corner) {
        const cornerButtons = activeButtons
            .filter(btn => determineCorner(btn.style) === corner)
            .map(btn => String(btn.id));

        const sourceIndex = cornerButtons.indexOf(String(sourceId));
        const targetIndex = cornerButtons.indexOf(String(targetId));
        if (sourceIndex < 0 || targetIndex < 0) return;

        const reordered = [...cornerButtons];
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(targetIndex, 0, moved);

        const data = await chrome.storage.local.get('buttons');
        const allButtons = Array.isArray(data.buttons) ? data.buttons : [];

        const involved = allButtons.filter(btn => reordered.includes(String(btn.id)));
        const minOrder = involved.reduce((min, btn) => {
            const order = Number.isFinite(btn?.order) ? btn.order : Number.MAX_SAFE_INTEGER;
            return Math.min(min, order);
        }, Number.MAX_SAFE_INTEGER);
        const baseOrder = Number.isFinite(minOrder) && minOrder !== Number.MAX_SAFE_INTEGER ? minOrder : 0;

        const rank = new Map(reordered.map((id, idx) => [id, baseOrder + idx]));
        const updated = allButtons.map(btn => {
            const id = String(btn.id);
            if (!rank.has(id)) return btn;
            return { ...btn, order: rank.get(id) };
        });

        await chrome.storage.local.set({ buttons: updated });
    }

    function determineCorner(s) {
        if (!s) return 'bottom-right';
        const isT = s.top && s.top !== 'auto';
        const isL = s.left && s.left !== 'auto';
        if (isT && isL) return 'top-left';
        if (isT && !isL) return 'top-right';
        if (!isT && isL) return 'bottom-left';
        return 'bottom-right';
    }

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.buttons || changes.flows) refresh();
    });

    init();
})();
