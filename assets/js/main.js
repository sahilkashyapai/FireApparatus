document.addEventListener('DOMContentLoaded', () => {
    const toggles = [
        { btnId: 'readySparesToggleBtn', cardId: 'readySpares' },
        { btnId: 'inShopToggleBtn', cardId: 'inShop' },
        { btnId: 'swapLogToggleBtn', cardId: 'swapLogCard' },
    ];

    toggles.forEach(({ btnId, cardId }) => {
        const btn = document.getElementById(btnId);
        const card = document.getElementById(cardId);
        if (!btn || !card) return;

        btn.classList.add('active');

        btn.addEventListener('click', () => {
            card.classList.toggle('is-hidden');
            btn.classList.toggle('active');
        });
    });

    const legendBtn = document.getElementById('legendToggleBtn');
    const legendPopup = document.getElementById('legendPopup');

    if (legendBtn && legendPopup) {
        legendBtn.addEventListener('click', () => {
            legendPopup.classList.toggle('is-hidden');
            legendBtn.classList.toggle('active');
        });
    }

    assignStableIds();
    restoreLayout();
    restoreOnCallState();
    document.querySelectorAll('.ai-fam-device').forEach(updateDeviceState);
    initDeviceDragAndDrop();
    initSwapLog();
});

const LAYOUT_STORAGE_KEY = 'fireApparatusLayout_v2';
const ON_CALL_STORAGE_KEY = 'fireApparatusOnCall_v1';
const SWAP_LOG_STORAGE_KEY = 'fireApparatusSwapLog_v1';

function assignStableIds() {
    const textCounts = {};

    document.querySelectorAll('.ai-fam-device').forEach((device) => {
        const text = getDeviceLabel(device);
        const occurrence = textCounts[text] || 0;
        textCounts[text] = occurrence + 1;
        device.dataset.deviceId = `${text}__${occurrence}`;

        const homeCard = device.closest('.content-card');
        device.dataset.homeCard = getCardLabel(homeCard);
        device.dataset.homeZone = getZoneType(homeCard);
    });

    document.querySelectorAll('.ai-fam-device-list').forEach((list, index) => {
        list.dataset.listId = `list-${index}`;
    });
}

function getDeviceLabel(device) {
    const label = device.querySelector('[data-text]');
    return label ? label.getAttribute('data-text') : device.textContent.trim();
}

function getZoneType(card) {
    if (!card) return null;
    if (card.id === 'readySpares') return 'spares';
    if (card.id === 'inShop') return 'shop';
    return 'station';
}

function getCardLabel(card) {
    const heading = card && card.querySelector('.card-heading');
    return heading ? heading.textContent.trim() : '';
}

function findCardByLabel(label) {
    return Array.from(document.querySelectorAll('.content-card'))
        .find((card) => getCardLabel(card) === label);
}

function updateDeviceState(device) {
    const card = device.closest('.content-card');
    const zone = getZoneType(card);
    const isMovedUp = zone === 'station'
        && device.dataset.homeZone === 'station'
        && getCardLabel(card) !== device.dataset.homeCard;

    device.classList.toggle('moved-up', isMovedUp);
    device.classList.toggle('in-shop', zone === 'shop');
    device.title = isMovedUp
        ? 'Moved up from ' + device.dataset.homeCard + ' — double-click to return home'
        : 'Right-click to toggle On Call';
}

function saveLayout() {
    const layout = {};
    document.querySelectorAll('.ai-fam-device-list').forEach((list) => {
        layout[list.dataset.listId] = Array.from(list.querySelectorAll('.ai-fam-device'))
            .map((device) => device.dataset.deviceId);
    });
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

function restoreLayout() {
    let layout;
    try {
        layout = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY));
    } catch (e) {
        return;
    }
    if (!layout) return;

    const devicesById = new Map();
    document.querySelectorAll('.ai-fam-device').forEach((device) => {
        devicesById.set(device.dataset.deviceId, device);
    });

    document.querySelectorAll('.ai-fam-device-list').forEach((list) => {
        const deviceIds = layout[list.dataset.listId];
        if (!deviceIds) return;
        deviceIds.forEach((deviceId) => {
            const device = devicesById.get(deviceId);
            if (device) list.appendChild(device);
        });
    });
}

function saveOnCallState() {
    const onCallIds = Array.from(document.querySelectorAll('.ai-fam-device.on-call'))
        .map((device) => device.dataset.deviceId);
    localStorage.setItem(ON_CALL_STORAGE_KEY, JSON.stringify(onCallIds));
}

function restoreOnCallState() {
    let onCallIds;
    try {
        onCallIds = JSON.parse(localStorage.getItem(ON_CALL_STORAGE_KEY));
    } catch (e) {
        return;
    }
    if (!Array.isArray(onCallIds)) return;

    document.querySelectorAll('.ai-fam-device').forEach((device) => {
        device.classList.toggle('on-call', onCallIds.includes(device.dataset.deviceId));
    });
}

function initDeviceDragAndDrop() {
    let draggedItem = null;

    function swapNodes(a, b) {
        const aParent = a.parentNode;
        const aNext = a.nextSibling === b ? a : a.nextSibling;
        b.parentNode.insertBefore(a, b);
        aParent.insertBefore(b, aNext);
    }

    function clearDragOver() {
        document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    }

    function handleDragStart() {
        draggedItem = this;
        this.classList.add('dragging');
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        draggedItem = null;
        clearDragOver();
    }

    function handleDeviceDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem && draggedItem !== this) {
            this.classList.add('drag-over');
        }
    }

    function handleDeviceDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDeviceDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        if (!draggedItem || draggedItem === this) return;

        const incomingLabel = getDeviceLabel(draggedItem);
        const outgoingLabel = getDeviceLabel(this);
        const targetCardLabel = getCardLabel(this.closest('.content-card'));

        swapNodes(draggedItem, this);
        updateDeviceState(draggedItem);
        updateDeviceState(this);
        saveLayout();
        logSwap({ unitId: targetCardLabel, deviceInService: incomingLabel, deviceOOS: outgoingLabel });
    }

    function handleListDragOver(e) {
        e.preventDefault();
        if (draggedItem) {
            this.classList.add('drag-over');
        }
    }

    function handleListDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleListDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (!draggedItem || draggedItem.parentElement === this) return;

        const incomingLabel = getDeviceLabel(draggedItem);
        const targetCardLabel = getCardLabel(this.closest('.content-card'));

        this.appendChild(draggedItem);
        updateDeviceState(draggedItem);
        saveLayout();
        logSwap({ unitId: targetCardLabel, deviceInService: incomingLabel, deviceOOS: '—' });
    }

    function handleDeviceDblClick() {
        if (!this.classList.contains('moved-up')) return;

        const homeCard = findCardByLabel(this.dataset.homeCard);
        const homeList = homeCard && homeCard.querySelector('.ai-fam-device-list');
        if (!homeList) return;

        const label = getDeviceLabel(this);
        homeList.appendChild(this);
        updateDeviceState(this);
        saveLayout();
        logSwap({ unitId: this.dataset.homeCard, deviceInService: label, deviceOOS: '—' });
    }

    function handleDeviceContextMenu(e) {
        e.preventDefault();
        this.classList.toggle('on-call');
        saveOnCallState();
    }

    document.querySelectorAll('.ai-fam-device').forEach((device) => {
        device.setAttribute('draggable', 'true');
        device.addEventListener('dragstart', handleDragStart);
        device.addEventListener('dragend', handleDragEnd);
        device.addEventListener('dragover', handleDeviceDragOver);
        device.addEventListener('dragleave', handleDeviceDragLeave);
        device.addEventListener('drop', handleDeviceDrop);
        device.addEventListener('dblclick', handleDeviceDblClick);
        device.addEventListener('contextmenu', handleDeviceContextMenu);
    });

    document.querySelectorAll('.ai-fam-device-list').forEach((list) => {
        list.addEventListener('dragover', handleListDragOver);
        list.addEventListener('dragleave', handleListDragLeave);
        list.addEventListener('drop', handleListDrop);
    });
}

function getSwapLogTbody() {
    return document.querySelector('.swap-log-table tbody');
}

function getCurrentUserName() {
    const el = document.querySelector('.user-name');
    return (el && el.textContent.trim()) || 'user';
}

function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function cellValue(cell) {
    const input = cell.querySelector('input');
    return input ? input.value : cell.textContent.trim();
}

function wireRowControls(row) {
    const editCell = row.querySelector('.swap-log-edit-cell');
    const primaryBtn = editCell.querySelector('.icon-btn:not(.icon-btn-delete)');
    const deleteBtn = editCell.querySelector('.icon-btn-delete');
    const unitCell = row.children[2];
    const serviceCell = row.children[3];
    const oosCell = row.children[4];
    const primaryIcon = primaryBtn.querySelector('.material-symbols-outlined');

    function isEditing() {
        return primaryIcon.textContent.trim() === 'check';
    }

    function enterEditMode() {
        [unitCell, serviceCell, oosCell].forEach((cell) => {
            const value = cellValue(cell);
            cell.textContent = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'swap-log-input';
            input.value = value;
            cell.appendChild(input);
        });
        primaryIcon.textContent = 'check';
    }

    function exitEditMode() {
        [unitCell, serviceCell, oosCell].forEach((cell) => {
            cell.textContent = cellValue(cell);
        });
        primaryIcon.textContent = 'edit_square';
    }

    primaryBtn.addEventListener('click', () => {
        if (isEditing()) {
            exitEditMode();
            persistSwapLog();
        } else {
            enterEditMode();
        }
    });

    deleteBtn.addEventListener('click', () => {
        row.remove();
        persistSwapLog();
    });
}

function buildLogRow(entry) {
    const row = document.createElement('tr');
    row.className = 'swap-log-row';

    const userCell = document.createElement('td');
    userCell.textContent = entry.user;
    const timeCell = document.createElement('td');
    timeCell.textContent = entry.time;
    const unitCell = document.createElement('td');
    unitCell.textContent = entry.unitId;
    const serviceCell = document.createElement('td');
    serviceCell.textContent = entry.deviceInService;
    const oosCell = document.createElement('td');
    oosCell.textContent = entry.deviceOOS;

    const editCell = document.createElement('td');
    editCell.className = 'swap-log-edit-cell';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.type = 'button';
    editBtn.innerHTML = '<span class="material-symbols-outlined">edit_square</span>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn icon-btn-delete';
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';

    editCell.append(editBtn, deleteBtn);
    row.append(userCell, timeCell, unitCell, serviceCell, oosCell, editCell);

    wireRowControls(row);
    return row;
}

function persistSwapLog() {
    const tbody = getSwapLogTbody();
    if (!tbody) return;
    const data = Array.from(tbody.querySelectorAll('tr')).map((row) => ({
        user: row.children[0].textContent.trim(),
        time: row.children[1].textContent.trim(),
        unitId: cellValue(row.children[2]),
        deviceInService: cellValue(row.children[3]),
        deviceOOS: cellValue(row.children[4]),
    }));
    localStorage.setItem(SWAP_LOG_STORAGE_KEY, JSON.stringify(data));
}

function logSwap({ unitId, deviceInService, deviceOOS }) {
    const tbody = getSwapLogTbody();
    if (!tbody) return;
    const row = buildLogRow({
        user: getCurrentUserName(),
        time: formatTimestamp(new Date()),
        unitId,
        deviceInService,
        deviceOOS,
    });
    tbody.insertBefore(row, tbody.firstChild);
    persistSwapLog();
}

function initSwapLog() {
    const tbody = getSwapLogTbody();
    if (!tbody) return;

    let savedRows;
    try {
        savedRows = JSON.parse(localStorage.getItem(SWAP_LOG_STORAGE_KEY));
    } catch (e) {
        savedRows = null;
    }

    if (Array.isArray(savedRows)) {
        tbody.innerHTML = '';
        savedRows.forEach((entry) => tbody.appendChild(buildLogRow(entry)));
    } else {
        tbody.querySelectorAll('tr').forEach(wireRowControls);
    }

    const addSwapBtn = document.querySelector('.swap-log-add-btn');
    if (addSwapBtn) {
        addSwapBtn.addEventListener('click', () => {
            const row = buildLogRow({
                user: getCurrentUserName(),
                time: formatTimestamp(new Date()),
                unitId: '',
                deviceInService: '',
                deviceOOS: '',
            });
            tbody.insertBefore(row, tbody.firstChild);
            row.querySelector('.swap-log-edit-cell .icon-btn:not(.icon-btn-delete)').click();
        });
    }
}
