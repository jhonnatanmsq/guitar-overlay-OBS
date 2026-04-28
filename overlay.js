const params = new URLSearchParams(window.location.search);
const debugEnabled = params.has('debug');
const preferredGamepadIndex = params.has('gamepad') ? Number(params.get('gamepad')) : null;
const strumDeadzone = Number(params.get('deadzone') || 0.5);
const scale = Number(params.get('scale') || 1);

if (Number.isFinite(scale) && scale > 0) {
    document.documentElement.style.setProperty('--overlay-scale', String(scale));
}

document.body.classList.toggle('is-debug', debugEnabled);

const buttonMap = {
    5: 'verde',
    1: 'vermelho',
    0: 'amarelo',
    2: 'azul',
    3: 'laranjado',
    4: 'especial',
    8: 'select',
    9: 'start',
};

const state = {
    verde: false,
    vermelho: false,
    amarelo: false,
    azul: false,
    laranjado: false,
    especial: false,
    select: false,
    start: false,
    strumUp: false,
    strumDown: false,
};

const controls = new Map(
    Array.from(document.querySelectorAll('[data-control]')).map((element) => [
        element.dataset.control,
        element,
    ]),
);
const debugStatus = document.getElementById('debug-status');
const debugButtons = document.getElementById('debug-buttons');

let activeGamepadIndex = Number.isFinite(preferredGamepadIndex) ? preferredGamepadIndex : null;

function setControl(name, pressed) {
    if (!(name in state) || state[name] === pressed) {
        return;
    }

    state[name] = pressed;
    const control = controls.get(name);

    if (control) {
        control.src = pressed ? control.dataset.on : control.dataset.off;
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
    if (!debugEnabled) {
        return;
    }

    if (!gamepad) {
        debugStatus.textContent = 'Waiting for a gamepad...';
        debugButtons.textContent = '';
        return;
    }

    debugStatus.textContent = `Gamepad ${gamepad.index}: ${gamepad.id}`;
    debugButtons.replaceChildren(
        ...gamepad.buttons.map((button, index) => {
            const row = document.createElement('div');
            row.className = 'debug-row';
            row.innerHTML = `
                <span>${index}</span>
                <progress max="1" value="${button.value}"></progress>
                <span>${button.pressed ? 'pressed' : ''}</span>
            `;
            return row;
        }),
    );
}

function update() {
    const gamepad = findGamepad();

    if (!gamepad) {
        resetControls();
        updateDebug(null);
        requestAnimationFrame(update);
        return;
    }

    for (const [index, button] of gamepad.buttons.entries()) {
        const controlName = buttonMap[index];

        if (controlName) {
            setControl(controlName, button.pressed);
        }
    }

    const strumAxis = gamepad.axes[1] || 0;
    setControl('strumUp', strumAxis <= -strumDeadzone);
    setControl('strumDown', strumAxis >= strumDeadzone);
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
        activeGamepadIndex = Number.isFinite(preferredGamepadIndex) ? preferredGamepadIndex : null;
        resetControls();
    }
});

update();
