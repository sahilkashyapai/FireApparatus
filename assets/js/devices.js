const DEVICE_COLORS = [
    { key: 'Red', label: 'Red', code: 'E21', light: '#ff6b6b', base: '#ff1111', dark: '#8f1414' },
    { key: 'DarkRed', label: 'Dark Red', code: 'WT21', light: '#c94848', base: '#990a0a', dark: '#5c0606' },
    { key: 'Blue', label: 'Blue', code: 'R21', light: '#7ec8ed', base: '#369ed3', dark: '#1c5380' },
    { key: 'DarkBlue', label: 'Dark Blue', code: 'MR21', light: '#4a7fa5', base: '#1c5380', dark: '#0d2c40' },
    { key: 'Orange', label: 'Orange', code: 'TK21', light: '#ffb366', base: '#ff8000', dark: '#a65200' },
    { key: 'Purple', label: 'Purple', code: 'SQ21', light: '#a873da', base: '#7238b9', dark: '#431f6e' },
    { key: 'Black', label: 'Black', code: 'BC21', light: '#4a4a4a', base: '#2b2b2b', dark: '#000000' },
    { key: 'Green', label: 'Green', code: 'A21', light: '#7cc576', base: '#43a047', dark: '#1b5e20' },
    { key: 'Yellow', label: 'Yellow', code: 'TK24', light: '#f0f050', base: '#d4d400', dark: '#8c8c00' },
];

const DEVICE_STATES = [
    { label: 'On Call / In Shop (grayed-out)', extraClass: 'on-call', code: 'TK21', color: DEVICE_COLORS[4] },
    { label: 'Moved Up', extraClass: 'moved-up', code: 'BC21', color: DEVICE_COLORS[6] },
    { label: 'Browned Out (unstaffed)', extraClass: 'browned-out', code: 'E29', color: DEVICE_COLORS[0] },
    { label: 'Additional Vehicle', extraClass: 'additional-vehicle', code: 'M29', color: DEVICE_COLORS[2] },
];

const SCALE_SIZES = [280, 200, 140, 90, 60];

function labelLengthClass(text) {
    if (text.length >= 9) return 'is-xlong';
    if (text.length > 5) return 'is-long';
    return '';
}

function createTile(color, { pattern = false, code, extraClass = '' } = {}) {
    const tile = document.createElement('div');
    tile.className = `device-tile${pattern ? ' pattern' : ''}${extraClass ? ' ' + extraClass : ''}`;
    tile.style.setProperty('--tile-light', color.light);
    tile.style.setProperty('--tile-base', color.base);
    tile.style.setProperty('--tile-dark', color.dark);

    const frame = document.createElement('div');
    frame.className = 'device-tile-frame';

    const plate = document.createElement('div');
    plate.className = 'device-tile-plate';

    const colorPanel = document.createElement('div');
    colorPanel.className = 'device-tile-color';

    const surfacePanel = document.createElement('div');
    surfacePanel.className = 'device-tile-surface';

    const label = document.createElement('span');
    label.className = `device-tile-label ${labelLengthClass(code)}`.trim();
    label.textContent = code;

    plate.append(colorPanel, surfacePanel, label);
    frame.append(plate);
    tile.append(frame);
    return tile;
}

function buildColorGrid() {
    const grid = document.getElementById('colorGrid');
    if (!grid) return;

    DEVICE_COLORS.forEach((color) => {
        const item = document.createElement('div');
        item.className = 'device-color-item';

        const name = document.createElement('div');
        name.className = 'device-color-name';
        name.innerHTML = `<span>${color.label}</span><code>${color.base}</code>`;

        const swatches = document.createElement('div');
        swatches.className = 'device-color-item-swatches';
        swatches.append(
            createTile(color, { code: color.code }),
            createTile(color, { pattern: true, code: color.code })
        );

        item.append(name, swatches);
        grid.append(item);
    });
}

function buildStateGrid() {
    const grid = document.getElementById('stateGrid');
    if (!grid) return;

    DEVICE_STATES.forEach((state) => {
        const item = document.createElement('div');
        item.className = 'device-state-item';

        const label = document.createElement('span');
        label.textContent = state.label;

        item.append(label, createTile(state.color, { code: state.code, extraClass: state.extraClass }));
        grid.append(item);
    });
}

function buildScaleRow() {
    const row = document.getElementById('scaleRow');
    if (!row) return;

    SCALE_SIZES.forEach((size) => {
        const item = document.createElement('div');
        item.className = 'device-scale-item';

        const box = document.createElement('div');
        box.style.width = size + 'px';
        box.append(createTile(DEVICE_COLORS[0], { code: 'E21' }));

        const caption = document.createElement('span');
        caption.textContent = size + 'px';

        item.append(box, caption);
        row.append(item);
    });
}

const THEME_STORAGE_KEY = 'fireApparatusTheme_v1';
const THEMES = ['glance', 'mainelink', 'mcomms', 'rattler', 'wwe'];
const DEFAULT_THEME = 'glance';

function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = DEFAULT_THEME;

    document.documentElement.setAttribute('data-theme', theme);

    const logo = document.querySelector('.brand-logo');
    if (logo) logo.src = `https://appinfoui.netlify.app/cdn/images/${theme}/logo.png`;

    const select = document.getElementById('themeSelect');
    if (select) select.value = theme;

    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function initThemeSwitcher() {
    const select = document.getElementById('themeSelect');
    if (!select) return;

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(savedTheme || document.documentElement.getAttribute('data-theme') || DEFAULT_THEME);

    select.addEventListener('change', () => applyTheme(select.value));
}

document.addEventListener('DOMContentLoaded', () => {
    buildColorGrid();
    buildStateGrid();
    buildScaleRow();
    initThemeSwitcher();
});
