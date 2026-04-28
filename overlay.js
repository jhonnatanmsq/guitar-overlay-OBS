const params = new URLSearchParams(window.location.search);
const CONFIG_URL = params.get('config') || './config.json';

const DEFAULT_CONFIG = {
    debug: false,
    gamepad: null,
    scale: 1,
    buttons: {
        5: 'verde',
        1: 'vermelho',
        0: 'amarelo',
        2: 'azul',
        3: 'laranjado',
        4: 'especial',
        8: 'select',
        9: 'start',
    },
    axes: {
        strum: {
            index: 1,
            deadzone: 0.5,
            negative: 'strumUp',
            positive: 'strumDown',
        },
    },
    strum: {
        up: {
            type: 'axis',
            index: 1,
            direction: 'negative',
            deadzone: 0.5,
            control: 'strumUp',
        },
        down: {
            type: 'axis',
            index: 1,
            direction: 'positive',
            deadzone: 0.5,
            control: 'strumDown',
        },
    },
};

const DEFAULT_AXIS_SOURCE = {
    type: 'axis',
    index: null,
    direction: 'positive',
    deadzone: 0.5,
    control: null,
};

const state = {
    verde: false,
    vermelho: false,
    amarelo: false,
    azul: false,
    laranjado: false,
    whammy: false,
    especial: false,
    select: false,
    start: false,
    strumUp: false,
    strumDown: false,
};

const controlElements = Array.from(document.querySelectorAll('[data-control]')).map((element) => ({
    element,
    names: getElementControlNames(element),
}));
const controls = new Map();
const debugStatus = document.getElementById('debug-status');
const debugButtons = document.getElementById('debug-buttons');
const debugAxes = document.getElementById('debug-axes');

let config = clone(DEFAULT_CONFIG);
let activeGamepadIndex = null;

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function readNumber(value, fallback) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getElementControlNames(element) {
    const names = element.dataset.controls || element.dataset.control;
    return Array.from(new Set(names.split(/[\s,]+/).filter(Boolean)));
}

for (const controlElement of controlElements) {
    for (const name of controlElement.names) {
        controls.set(name, [...(controls.get(name) || []), controlElement]);
    }
}

function mergeInputSource(defaultSource, source) {
    const nextSource = {
        ...defaultSource,
        ...(isPlainObject(source) ? source : {}),
    };

    nextSource.index = readNumber(nextSource.index, defaultSource.index);
    nextSource.deadzone = readNumber(nextSource.deadzone, defaultSource.deadzone);
    return nextSource;
}

function mergeStrumConfig(strumConfig) {
    return {
        up: mergeInputSource(DEFAULT_CONFIG.strum.up, strumConfig && strumConfig.up),
        down: mergeInputSource(DEFAULT_CONFIG.strum.down, strumConfig && strumConfig.down),
    };
}

function normalizeButtonSources(buttons) {
    if (!isPlainObject(buttons)) {
        return [];
    }

    return Object.entries(buttons)
        .map(([index, control]) => ({
            type: 'button',
            index: readNumber(index, null),
            control,
        }))
        .filter((source) => Number.isFinite(source.index) && source.control);
}

function normalizeAxisSource(index, source) {
    if (typeof source === 'string') {
        return {
            ...DEFAULT_AXIS_SOURCE,
            index: readNumber(index, null),
            control: source,
        };
    }

    if (!isPlainObject(source)) {
        return null;
    }

    const nextSource = {
        ...DEFAULT_AXIS_SOURCE,
        ...source,
    };

    nextSource.type = 'axis';
    nextSource.index = readNumber(nextSource.index, readNumber(index, null));
    nextSource.deadzone = readNumber(nextSource.deadzone, DEFAULT_AXIS_SOURCE.deadzone);
    return nextSource;
}

function normalizeAxisSources(axes) {
    if (!isPlainObject(axes)) {
        return [];
    }

    const sources = [];

    for (const [index, source] of Object.entries(axes)) {
        if (index === 'strum' || index === 'controls') {
            continue;
        }

        const axisSource = normalizeAxisSource(index, source);

        if (axisSource && Number.isFinite(axisSource.index) && axisSource.control) {
            sources.push(axisSource);
        }
    }

    if (isPlainObject(axes.controls)) {
        for (const [index, source] of Object.entries(axes.controls)) {
            const axisSource = normalizeAxisSource(index, source);

            if (axisSource && Number.isFinite(axisSource.index) && axisSource.control) {
                sources.push(axisSource);
            }
        }
    }

    return sources;
}

function getControlSources(nextConfig) {
    return [
        ...normalizeButtonSources(nextConfig.buttons),
        ...normalizeAxisSources(nextConfig.axes),
    ];
}

function strumFromAxisConfig(axisConfig) {
    return {
        up: {
            type: 'axis',
            index: readNumber(axisConfig.index, DEFAULT_CONFIG.axes.strum.index),
            direction: 'negative',
            deadzone: readNumber(axisConfig.deadzone, DEFAULT_CONFIG.axes.strum.deadzone),
            control: axisConfig.negative || DEFAULT_CONFIG.axes.strum.negative,
        },
        down: {
            type: 'axis',
            index: readNumber(axisConfig.index, DEFAULT_CONFIG.axes.strum.index),
            direction: 'positive',
            deadzone: readNumber(axisConfig.deadzone, DEFAULT_CONFIG.axes.strum.deadzone),
            control: axisConfig.positive || DEFAULT_CONFIG.axes.strum.positive,
        },
    };
}

function strumFromButtonMappings(buttons) {
    if (!isPlainObject(buttons)) {
        return null;
    }

    let up = null;
    let down = null;

    for (const [index, controlName] of Object.entries(buttons)) {
        if (controlName === 'strumUp') {
            up = readNumber(index, null);
        }

        if (controlName === 'strumDown') {
            down = readNumber(index, null);
        }
    }

    if (!Number.isFinite(up) || !Number.isFinite(down)) {
        return null;
    }

    return {
        up: {
            type: 'button',
            index: up,
            control: 'strumUp',
        },
        down: {
            type: 'button',
            index: down,
            control: 'strumDown',
        },
    };
}

function setStrumDeadzone(strumConfig, deadzone) {
    for (const source of Object.values(strumConfig)) {
        if (source.type === 'axis') {
            source.deadzone = deadzone;
        }
    }
}

function mergeConfig(fileConfig) {
    const nextConfig = clone(DEFAULT_CONFIG);

    if (fileConfig && typeof fileConfig === 'object') {
        const hasStrumConfig = isPlainObject(fileConfig.strum);
        const hasAxisStrumConfig = isPlainObject(fileConfig.axes && fileConfig.axes.strum);
        const buttonStrumConfig = strumFromButtonMappings(fileConfig.buttons);

        Object.assign(nextConfig, fileConfig);
        nextConfig.buttons = {
            ...DEFAULT_CONFIG.buttons,
            ...(fileConfig.buttons || {}),
        };
        nextConfig.axes = {
            ...DEFAULT_CONFIG.axes,
            ...(fileConfig.axes || {}),
        };
        nextConfig.axes.strum = {
            ...DEFAULT_CONFIG.axes.strum,
            ...((fileConfig.axes && fileConfig.axes.strum) || {}),
        };

        if (hasStrumConfig) {
            nextConfig.strum = mergeStrumConfig(fileConfig.strum);
        } else if (hasAxisStrumConfig) {
            nextConfig.strum = strumFromAxisConfig(nextConfig.axes.strum);
        } else if (buttonStrumConfig) {
            nextConfig.strum = buttonStrumConfig;
        } else {
            nextConfig.strum = mergeStrumConfig(DEFAULT_CONFIG.strum);
        }
    }

    if (params.has('debug')) {
        nextConfig.debug = true;
    }

    if (params.has('gamepad')) {
        nextConfig.gamepad = readNumber(params.get('gamepad'), null);
    }

    if (params.has('deadzone')) {
        const deadzone = readNumber(params.get('deadzone'), nextConfig.axes.strum.deadzone);
        nextConfig.axes.strum.deadzone = deadzone;
        setStrumDeadzone(nextConfig.strum, deadzone);
    }

    if (params.has('scale')) {
        nextConfig.scale = readNumber(params.get('scale'), nextConfig.scale);
    }

    nextConfig.controlSources = getControlSources(nextConfig);

    return nextConfig;
}

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_URL, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn(`Using default overlay configuration. Could not load ${CONFIG_URL}.`, error);
        return null;
    }
}

function applyConfig(nextConfig) {
    config = nextConfig;
    activeGamepadIndex = Number.isFinite(config.gamepad) ? config.gamepad : null;

    if (Number.isFinite(config.scale) && config.scale > 0) {
        document.documentElement.style.setProperty('--overlay-scale', String(config.scale));
    }

    document.body.classList.toggle('is-debug', Boolean(config.debug));
}

function setControl(name, pressed) {
    if (!(name in state) || state[name] === pressed) {
        return;
    }

    state[name] = pressed;
    const affectedElements = controls.get(name) || [];

    for (const controlElement of affectedElements) {
        const isPressed = controlElement.names.some((controlName) => state[controlName]);
        controlElement.element.src = isPressed ? controlElement.element.dataset.on : controlElement.element.dataset.off;
    }
}

function resetControls() {
    for (const name of Object.keys(state)) {
        setControl(name, false);
    }
}

function findGamepad() {
    const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];

    if (activeGamepadIndex !== null) {
        return gamepads.find((gamepad) => gamepad && gamepad.index === activeGamepadIndex) || null;
    }

    const firstGamepad = gamepads.find(Boolean) || null;
    activeGamepadIndex = firstGamepad ? firstGamepad.index : null;
    return firstGamepad;
}

function updateDebug(gamepad) {
    if (!config.debug) {
        return;
    }

    if (!gamepad) {
        debugStatus.textContent = 'Waiting for a gamepad...';
        debugButtons.textContent = '';
        debugAxes.textContent = '';
        return;
    }

    debugStatus.textContent = `Gamepad ${gamepad.index}: ${gamepad.id}`;
    debugButtons.replaceChildren(
        ...gamepad.buttons.map((button, index) => {
            const row = document.createElement('div');
            const mappedControl = getButtonDebugLabel(index);
            const indexLabel = document.createElement('span');
            const meter = document.createElement('progress');
            const stateLabel = document.createElement('span');

            indexLabel.textContent = String(index);
            meter.max = 1;
            meter.value = button.value;
            stateLabel.textContent = button.pressed ? `pressed ${mappedControl}`.trim() : mappedControl;

            row.className = 'debug-row';
            row.replaceChildren(indexLabel, meter, stateLabel);
            return row;
        }),
    );
    debugAxes.replaceChildren(
        ...gamepad.axes.map((axis, index) => {
            const row = document.createElement('div');
            const mappedControl = getAxisDebugLabel(index);
            const indexLabel = document.createElement('span');
            const meter = document.createElement('progress');
            const stateLabel = document.createElement('span');

            indexLabel.textContent = String(index);
            meter.max = 1;
            meter.value = (axis + 1) / 2;
            stateLabel.textContent = `${axis.toFixed(2)} ${mappedControl}`.trim();

            row.className = 'debug-row';
            row.replaceChildren(indexLabel, meter, stateLabel);
            return row;
        }),
    );
}

function getButtonDebugLabel(index) {
    const controls = [];
    const mappedControls = config.controlSources
        .filter((source) => source.type === 'button' && source.index === index)
        .map((source) => source.control);

    controls.push(...mappedControls);

    if (config.strum.up.type === 'button' && config.strum.up.index === index) {
        controls.push(config.strum.up.control);
    }

    if (config.strum.down.type === 'button' && config.strum.down.index === index) {
        controls.push(config.strum.down.control);
    }

    return Array.from(new Set(controls)).join(', ');
}

function getAxisDebugLabel(index) {
    const controls = config.controlSources
        .filter((source) => source.type === 'axis' && source.index === index)
        .map((source) => source.control);

    if (config.strum.up.type === 'axis' && config.strum.up.index === index) {
        controls.push(config.strum.up.control);
    }

    if (config.strum.down.type === 'axis' && config.strum.down.index === index) {
        controls.push(config.strum.down.control);
    }

    return Array.from(new Set(controls)).join(', ');
}

function isSourcePressed(source, gamepad) {
    if (!source || source.enabled === false || !Number.isFinite(source.index)) {
        return false;
    }

    if (source.type === 'button') {
        const button = gamepad.buttons[source.index];
        return Boolean(button && button.pressed);
    }

    const axis = gamepad.axes[source.index] || 0;
    const deadzone = readNumber(source.deadzone, DEFAULT_AXIS_SOURCE.deadzone);

    if (source.direction === 'positive') {
        return axis >= deadzone;
    }

    if (source.direction === 'any' || source.direction === 'absolute') {
        return Math.abs(axis) >= deadzone;
    }

    return axis <= -deadzone;
}

function getNextState(gamepad) {
    const nextState = Object.fromEntries(Object.keys(state).map((name) => [name, false]));

    for (const source of config.controlSources) {
        if (isSourcePressed(source, gamepad)) {
            nextState[source.control] = true;
        }
    }

    nextState[config.strum.up.control] = nextState[config.strum.up.control] || isSourcePressed(config.strum.up, gamepad);
    nextState[config.strum.down.control] = nextState[config.strum.down.control] || isSourcePressed(config.strum.down, gamepad);
    return nextState;
}

function applyControlState(nextState) {
    for (const [controlName, pressed] of Object.entries(nextState)) {
        setControl(controlName, pressed);
    }
}

function update() {
    const gamepad = findGamepad();

    if (!gamepad) {
        resetControls();
        updateDebug(null);
        requestAnimationFrame(update);
        return;
    }

    applyControlState(getNextState(gamepad));
    updateDebug(gamepad);
    requestAnimationFrame(update);
}

window.addEventListener('gamepadconnected', (event) => {
    if (activeGamepadIndex === null) {
        activeGamepadIndex = event.gamepad.index;
    }
});

window.addEventListener('gamepaddisconnected', (event) => {
    if (event.gamepad.index === activeGamepadIndex) {
        activeGamepadIndex = Number.isFinite(config.gamepad) ? config.gamepad : null;
        resetControls();
    }
});

loadConfig().then((fileConfig) => {
    applyConfig(mergeConfig(fileConfig));
    update();
});
