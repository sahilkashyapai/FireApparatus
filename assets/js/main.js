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
});
