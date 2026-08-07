(function () {
    const colors = {
        player: '#ff3054',
        boss: '#53d2ff',
        shot: '#ffeb4a',
        hazard: '#ff5252',
        block: '#be4cff',
        default: '#ffffff',
    };

    const state = {
        enabled: false,
        editMode: false,
        overlay: null,
        field: null,
        lastGameId: null,
        lastLabel: '',
        hitboxes: new Map(),
        selectedId: null,
        panelSelectedId: null,
        drag: null,
    };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function setEnabled(value) {
        state.enabled = !!value;
        if (!state.enabled) clear();
    }

    function setEditMode(value) {
        state.editMode = !!value;
        if (state.overlay) {
            state.overlay.style.pointerEvents = 'none';
            state.overlay.classList.toggle('is-editing', state.editMode);
        }
    }

    function clear() {
        if (state.overlay) state.overlay.remove();
        state.overlay = null;
        state.field = null;
        state.lastGameId = null;
        state.lastLabel = '';
        state.hitboxes.clear();
        state.selectedId = null;
        state.panelSelectedId = null;
        state.drag = null;
    }

    function ensureOverlay(field, gameId, label) {
        if (!field) return null;
        if (state.overlay && state.field === field) return state.overlay;

        clear();
        const overlay = document.createElement('div');
        overlay.className = 'hitbox-debugger-overlay';
        overlay.style.cssText = [
            'position:absolute',
            'inset:0',
            'z-index:30',
            'pointer-events:none',
            'overflow:hidden',
        ].join(';');
        overlay.classList.toggle('is-editing', state.editMode);

        const title = document.createElement('div');
        title.className = 'hitbox-debugger-title';
        title.style.cssText = [
            'position:absolute',
            'left:8px',
            'top:8px',
            'padding:4px 7px',
            'border:1px solid rgba(255,255,255,.45)',
            'border-radius:4px',
            'background:rgba(0,0,0,.62)',
            'color:#fff',
            'font:700 11px/1.2 Arial,sans-serif',
            'letter-spacing:.04em',
            'text-transform:uppercase',
            'text-shadow:0 1px 0 #000',
        ].join(';');
        overlay.appendChild(title);

        const panel = document.createElement('div');
        panel.className = 'hitbox-debugger-panel';
        panel.style.cssText = [
            'position:absolute',
            'right:8px',
            'top:8px',
            'width:190px',
            'padding:8px',
            'border:1px solid rgba(255,255,255,.35)',
            'border-radius:6px',
            'background:rgba(0,0,0,.72)',
            'color:#fff',
            'font:11px/1.25 Arial,sans-serif',
            'display:none',
            'pointer-events:auto',
            'box-shadow:0 0 18px rgba(0,0,0,.45)',
        ].join(';');
        overlay.appendChild(panel);

        field.appendChild(overlay);
        state.overlay = overlay;
        state.field = field;
        state.lastGameId = gameId;
        state.lastLabel = label || gameId;
        return overlay;
    }

    function boxStyle(hitbox, fieldSize) {
        const color = hitbox.color || colors[hitbox.kind] || colors.default;
        const inactive = Boolean(hitbox.inactive);
        const x = clamp((Number(hitbox.x) || 0) + (Number(hitbox.offsetX) || 0), -0.5, 1.5);
        const y = clamp((Number(hitbox.y) || 0) + (Number(hitbox.offsetY) || 0), -0.5, 1.5);
        const w = Math.max(1, fieldSize.width * Math.max(0.001, Number(hitbox.w) || 0.001));
        const h = Math.max(1, fieldSize.height * Math.max(0.001, Number(hitbox.h) || 0.001));

        return {
            text: [
                'position:absolute',
                `left:${x * 100}%`,
                `top:${y * 100}%`,
                `width:${w}px`,
                `height:${h}px`,
                `transform:translate(-50%,-50%) rotate(${Number(hitbox.rotation) || 0}rad)`,
                `border:2px ${inactive ? 'dashed' : 'solid'} ${color}`,
                `background:${color}${inactive ? '0d' : '26'}`,
                `box-shadow:${inactive ? 'none' : `0 0 0 1px rgba(255,255,255,.72),0 0 10px ${color}b3`}`,
                `opacity:${inactive ? '.48' : '1'}`,
                ['circle', 'ellipse'].includes(hitbox.shape || hitbox.type) ? 'border-radius:50%' : 'border-radius:4px',
                'box-sizing:border-box',
            ].join(';'),
            color,
        };
    }

    function selectedHitbox() {
        return state.selectedId ? state.hitboxes.get(state.selectedId) : null;
    }

    function applyHitboxChange(hitbox, patch) {
        if (!hitbox || typeof hitbox.set !== 'function') return;
        hitbox.set(patch);
    }

    function formatNumber(value) {
        return String(Number(value || 0).toFixed(4))
            .replace(/0+$/, '')
            .replace(/\.$/, '');
    }

    function updatePanel() {
        if (!state.overlay) return;
        const panel = state.overlay.querySelector('.hitbox-debugger-panel');
        if (!panel) return;
        const hitbox = selectedHitbox();
        panel.style.display = state.editMode && hitbox ? 'grid' : 'none';
        if (!state.editMode || !hitbox) return;
        if (state.panelSelectedId === hitbox.id && panel.contains(document.activeElement)) return;
        state.panelSelectedId = hitbox.id;

        const fields = [
            ['offsetX', 'Offset X'],
            ['offsetY', 'Offset Y'],
            ['w', 'Ancho'],
            ['h', 'Alto'],
            ['rotation', 'Rotación'],
        ];
        panel.innerHTML = `
      <strong style="display:block;margin-bottom:4px;color:#ffd166">${hitbox.label || hitbox.id}</strong>
      <label style="display:grid;grid-template-columns:62px 1fr;gap:5px;align-items:center;margin-top:5px">
        <span>Forma</span>
        <select data-hitbox-input="shape"
          style="width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.35);border-radius:4px;background:rgba(255,255,255,.08);color:#fff;padding:3px 4px">
          <option value="rect" ${(hitbox.shape || hitbox.type || 'rect') === 'rect' ? 'selected' : ''}>Rect</option>
          <option value="circle" ${(hitbox.shape || hitbox.type) === 'circle' ? 'selected' : ''}>Circle</option>
          <option value="ellipse" ${(hitbox.shape || hitbox.type) === 'ellipse' ? 'selected' : ''}>Ellipse</option>
        </select>
      </label>
      ${fields
          .map(
              ([key, label]) => `
        <label style="display:grid;grid-template-columns:62px 1fr;gap:5px;align-items:center;margin-top:5px">
          <span>${label}</span>
          <input data-hitbox-input="${key}" type="number" step="0.001" value="${formatNumber(hitbox[key])}"
            style="width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.35);border-radius:4px;background:rgba(255,255,255,.08);color:#fff;padding:3px 4px">
        </label>
      `,
          )
          .join('')}
      <button type="button" data-hitbox-copy
        style="margin-top:7px;border:1px solid rgba(255,255,255,.35);border-radius:4px;background:rgba(83,210,255,.18);color:#fff;padding:5px;cursor:pointer">
        Copiar JSON
      </button>
    `;
        panel.querySelectorAll('[data-hitbox-input]').forEach((input) => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-hitbox-input');
                if (key === 'shape') {
                    applyHitboxChange(selectedHitbox(), {
                        shape: ['circle', 'ellipse'].includes(input.value) ? input.value : 'rect',
                    });
                    return;
                }
                const value = Number(input.value);
                if (!Number.isFinite(value)) return;
                applyHitboxChange(selectedHitbox(), { [key]: value });
            });
        });
        panel.querySelector('[data-hitbox-copy]')?.addEventListener('click', () => {
            const current = selectedHitbox();
            if (!current) return;
            const payload = {
                id: current.id,
                shape: current.shape || current.type || 'rect',
                offsetX: Number(current.offsetX) || 0,
                offsetY: Number(current.offsetY) || 0,
                w: Number(current.w) || 0,
                h: Number(current.h) || 0,
                rotation: Number(current.rotation) || 0,
            };
            navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
        });
    }

    function beginDrag(event, hitbox, mode) {
        if (!state.editMode || !hitbox || typeof hitbox.set !== 'function') return;
        event.preventDefault();
        event.stopPropagation();
        state.selectedId = hitbox.id;
        const rect = state.field.getBoundingClientRect();
        state.drag = {
            id: hitbox.id,
            mode,
            startX: event.clientX,
            startY: event.clientY,
            fieldW: rect.width || 1,
            fieldH: rect.height || 1,
            offsetX: Number(hitbox.offsetX) || 0,
            offsetY: Number(hitbox.offsetY) || 0,
            w: Number(hitbox.w) || 0.001,
            h: Number(hitbox.h) || 0.001,
            rotation: Number(hitbox.rotation) || 0,
        };
        updatePanel();
    }

    function onPointerMove(event) {
        if (!state.drag) return;
        const hitbox = state.hitboxes.get(state.drag.id);
        if (!hitbox) return;
        const dx = (event.clientX - state.drag.startX) / state.drag.fieldW;
        const dy = (event.clientY - state.drag.startY) / state.drag.fieldH;
        if (state.drag.mode === 'resize') {
            applyHitboxChange(hitbox, {
                w: Math.max(0.001, state.drag.w + dx * 2),
                h: Math.max(0.001, state.drag.h + dy * 2),
            });
        } else {
            applyHitboxChange(hitbox, {
                offsetX: state.drag.offsetX + dx,
                offsetY: state.drag.offsetY + dy,
            });
        }
    }

    function onPointerUp() {
        state.drag = null;
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    function drawLabel(box, label, color) {
        if (!label) return;
        const tag = document.createElement('span');
        tag.textContent = label;
        tag.style.cssText = [
            'position:absolute',
            'left:50%',
            'bottom:calc(100% + 3px)',
            'transform:translateX(-50%)',
            'padding:1px 4px',
            'border-radius:3px',
            'background:rgba(0,0,0,.78)',
            `border:1px solid ${color}`,
            'color:#fff',
            'font:700 9px/1 Arial,sans-serif',
            'letter-spacing:.05em',
            'white-space:nowrap',
            'text-shadow:0 1px 0 #000',
        ].join(';');
        box.appendChild(tag);
    }

    function render({ gameId, label, field, hitboxes }) {
        if (!state.enabled) return;
        const overlay = ensureOverlay(field, gameId, label);
        if (!overlay) return;

        const title = overlay.querySelector('.hitbox-debugger-title');
        if (title) title.textContent = label || gameId || 'Hitboxes';
        overlay.querySelectorAll('.hitbox-debugger-box').forEach((box) => box.remove());

        // Las cajas son hijas del campo: necesitan píxeles de layout, no el tamaño
        // visual ya transformado de getBoundingClientRect(), que se escalaría otra vez.
        const fieldSize = {
            width: Math.max(1, field.clientWidth),
            height: Math.max(1, field.clientHeight),
        };
        state.hitboxes.clear();
        (hitboxes || []).forEach((hitbox) => {
            if (!hitbox || hitbox.hidden) return;
            state.hitboxes.set(hitbox.id, hitbox);
            const box = document.createElement('div');
            box.className = 'hitbox-debugger-box';
            const style = boxStyle(hitbox, fieldSize);
            box.style.cssText = style.text;
            box.dataset.gameId = gameId || '';
            box.dataset.hitboxId = hitbox.id || '';
            box.style.pointerEvents = state.editMode && typeof hitbox.set === 'function' ? 'auto' : 'none';
            box.style.cursor = state.editMode && typeof hitbox.set === 'function' ? 'move' : 'default';
            if (state.selectedId === hitbox.id) {
                box.style.outline = '2px solid #fff';
                box.style.outlineOffset = '2px';
            }
            drawLabel(box, hitbox.label || hitbox.id, style.color);
            if (state.editMode && typeof hitbox.set === 'function') {
                const handle = document.createElement('b');
                handle.setAttribute('aria-hidden', 'true');
                handle.style.cssText = [
                    'position:absolute',
                    'right:-5px',
                    'bottom:-5px',
                    'width:10px',
                    'height:10px',
                    'border:1px solid #fff',
                    `background:${style.color}`,
                    'box-shadow:0 0 5px rgba(0,0,0,.8)',
                    'cursor:nwse-resize',
                ].join(';');
                handle.addEventListener('pointerdown', (event) => beginDrag(event, hitbox, 'resize'));
                box.appendChild(handle);
                box.addEventListener('pointerdown', (event) => beginDrag(event, hitbox, 'move'));
            }
            overlay.appendChild(box);
        });
        if (state.selectedId && !state.hitboxes.has(state.selectedId)) state.selectedId = null;
        updatePanel();
    }

    function exportConfig() {
        return {
            enabled: state.enabled,
            editMode: state.editMode,
            gameId: state.lastGameId,
            label: state.lastLabel,
        };
    }

    window.HitboxDebugger = {
        setEnabled,
        setEditMode,
        clear,
        render,
        exportConfig,
        isEnabled: () => state.enabled,
        isEditMode: () => state.editMode,
    };
})();
