(function () {
    const STORAGE_KEY = 'illo_hitbox_config';
    const CHANGE_EVENT = 'illo:hitbox-config-changed';

    const limb = (label, offsetX, offsetY, w, h, rotation = 0) => ({
        label,
        shape: 'ellipse',
        offsetX,
        offsetY,
        w,
        h,
        rotation,
    });

    const defaults = {
        player: { shape: 'rect', offsetX: 0, offsetY: 0, w: 0.052, h: 0.074, rotation: 0 },
        boss: {
            profiles: {
                floating: {
                    label: 'Flotando',
                    parts: {
                        head: limb('Cabeza', 0, -0.083, 0.038, 0.036),
                        torso: limb('Torso y brazos', 0, -0.018, 0.072, 0.088),
                        legs: limb('Piernas', 0, 0.07, 0.035, 0.092),
                    },
                },
                phase1: {
                    label: 'Segunda forma 1',
                    parts: {
                        head: limb('Cabeza', 0, -0.043, 0.03, 0.032),
                        torso: limb('Torso', 0, 0.012, 0.06, 0.066),
                        leftArm: limb('Brazo izquierdo', -0.038, 0.02, 0.022, 0.072, -0.14),
                        rightArm: limb('Brazo derecho', 0.038, 0.02, 0.022, 0.072, 0.14),
                        leftLeg: limb('Pierna izquierda', -0.018, 0.085, 0.026, 0.09, 0.05),
                        rightLeg: limb('Pierna derecha', 0.018, 0.085, 0.026, 0.09, -0.05),
                    },
                },
                phase2: {
                    label: 'Segunda forma 2',
                    parts: {
                        head: limb('Cabeza', 0, -0.035, 0.03, 0.032),
                        torso: limb('Torso', 0, 0.018, 0.06, 0.064),
                        leftArm: limb('Brazo izquierdo', -0.038, 0.026, 0.022, 0.07, -0.18),
                        rightArm: limb('Brazo derecho', 0.038, 0.026, 0.022, 0.07, 0.18),
                        leftLeg: limb('Pierna elevada', -0.022, 0.078, 0.03, 0.072, 0.38),
                        rightLeg: limb('Pierna de apoyo', 0.018, 0.092, 0.026, 0.09, -0.04),
                    },
                },
                phase3: {
                    label: 'Segunda forma 3',
                    parts: {
                        head: limb('Cabeza', 0, -0.025, 0.03, 0.032),
                        torso: limb('Torso', 0, 0.026, 0.06, 0.064),
                        leftArm: limb('Brazo izquierdo', -0.038, 0.033, 0.022, 0.07, -0.18),
                        rightArm: limb('Brazo derecho', 0.038, 0.033, 0.022, 0.07, 0.18),
                        leftLeg: limb('Pierna elevada', -0.024, 0.082, 0.031, 0.074, 0.5),
                        rightLeg: limb('Pierna de apoyo', 0.019, 0.1, 0.026, 0.09, -0.04),
                    },
                },
                phase4: {
                    label: 'Segunda forma 4',
                    parts: {
                        head: limb('Cabeza', 0.002, -0.003, 0.027, 0.027),
                        torso: limb('Torso', 0.002, 0.041, 0.055, 0.06, -0.04),
                        leftArm: limb('Brazo izquierdo', -0.031, 0.043, 0.022, 0.064, -0.2),
                        rightArm: limb('Brazo derecho', 0.032, 0.04, 0.022, 0.062, 0.18),
                        leftLeg: limb('Pierna adelantada', -0.019, 0.092, 0.03, 0.076, 0.3),
                        rightLeg: limb('Pierna trasera', 0.019, 0.096, 0.029, 0.08, -0.08),
                    },
                },
                phase5: {
                    label: 'Segunda forma 5',
                    parts: {
                        head: limb('Cabeza', 0, 0.003, 0.027, 0.027),
                        torso: limb('Torso', 0, 0.046, 0.056, 0.06),
                        leftArm: limb('Brazo izquierdo', -0.032, 0.047, 0.022, 0.064, -0.22),
                        rightArm: limb('Brazo derecho', 0.032, 0.047, 0.022, 0.064, 0.22),
                        leftLeg: limb('Pierna izquierda', -0.02, 0.1, 0.029, 0.08, 0.16),
                        rightLeg: limb('Pierna derecha', 0.02, 0.1, 0.029, 0.08, -0.16),
                    },
                },
            },
        },
        shot: { shape: 'ellipse', offsetX: 0.002, offsetY: 0, w: 0.021, h: 0.055, rotation: 0 },
        hazard: { shape: 'ellipse', offsetX: 0, offsetY: 0, w: 0.02, h: 0.05, rotation: 0 },
        block: { shape: 'ellipse', offsetX: 0, offsetY: 0, w: 0.022, h: 0.054, rotation: 0 },
    };

    const cloneDefaults = () => JSON.parse(JSON.stringify(defaults));

    const readStoredConfig = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
            console.warn('No se pudo leer la configuración de hitboxes.', error);
            return {};
        }
    };

    const applyStoredConfig = (target, storedRoot = {}) => {
        const stored = storedRoot.ketchupBoss || storedRoot;
        ['player', 'shot', 'hazard', 'block'].forEach((key) => {
            const storedObject = stored[key];
            if (!storedObject) return;
            if (storedObject.parts) {
                target[key] = {
                    parts: Object.fromEntries(
                        Object.entries(storedObject.parts)
                            .filter(([, part]) => !part?.disabled)
                            .map(([partId, part]) => [partId, { ...part }]),
                    ),
                };
                return;
            }
            Object.assign(target[key], storedObject);
        });

        Object.entries(stored.boss?.profiles || {}).forEach(([profileId, storedProfile]) => {
            const profile = target.boss.profiles[profileId];
            if (!profile) return;
            Object.entries(storedProfile.parts || {}).forEach(([partId, storedPart]) => {
                if (storedPart?.disabled) {
                    delete profile.parts[partId];
                    return;
                }
                profile.parts[partId] = {
                    ...(profile.parts[partId] || {}),
                    ...storedPart,
                };
            });
        });
        return target;
    };

    const createEffective = (storedConfig = readStoredConfig()) => applyStoredConfig(cloneDefaults(), storedConfig);

    const subscribe = (listener) => {
        const onStorage = (event) => {
            if (event.key === STORAGE_KEY) listener(createEffective());
        };
        const onChange = () => listener(createEffective());
        window.addEventListener('storage', onStorage);
        window.addEventListener(CHANGE_EVENT, onChange);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(CHANGE_EVENT, onChange);
        };
    };

    const notifyChanged = () => {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    };

    window.KetchupHitboxes = {
        STORAGE_KEY,
        createDefaults: cloneDefaults,
        createEffective,
        applyStoredConfig,
        readStoredConfig,
        subscribe,
        notifyChanged,
    };
})();
