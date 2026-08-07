(function () {
    // Shrinks each device label's font size just enough to fit inside its own
    // label-plate box (the white box baked into the vehicle icon artwork).
    // Never grows past the CSS-defined size, and restores back up to it
    // whenever the box has room again (e.g. on resize).
    const SELECTOR = '.ai-fam-device-list .ai-fam-device > span[data-text]';
    const MIN_FONT_SIZE = 8;
    const SAFETY_MARGIN = 0.94;
    const LONG_LABEL_THRESHOLD = 3;
    const LONG_LABEL_RATIO = 0.72;
    const EXTRA_LONG_LABEL_THRESHOLD = 7;
    const EXTRA_LONG_LABEL_RATIO = 0.6;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function measureTextWidth(text, font, letterSpacing) {
        ctx.font = font;
        const base = ctx.measureText(text).width;
        return base + letterSpacing * Math.max(text.length - 1, 0);
    }

    function getCssFontSize(span) {
        // Read the size the current stylesheet/media query would give this
        // span, ignoring any inline size we previously applied.
        const inline = span.style.fontSize;
        span.style.fontSize = '';
        const size = parseFloat(getComputedStyle(span).fontSize);
        span.style.fontSize = inline;
        return size;
    }

    function fitLabel(span) {
        const boxWidth = span.clientWidth;
        if (!boxWidth) return;

        const baseSize = getCssFontSize(span);
        const text = span.dataset.text || span.textContent.trim();
        const style = getComputedStyle(span);
        const letterSpacing = parseFloat(style.letterSpacing) || 0;
        const fontFamily = style.fontFamily;
        const fontWeight = style.fontWeight;
        const availableWidth = boxWidth * SAFETY_MARGIN;

        // Labels longer than 3 characters start from a smaller size so they
        // read visibly smaller than short codes like "E21" or "SpE"; 7+
        // characters (e.g. "SpE(TK126)") drop further still.
        let targetBase = baseSize;
        if (text.length >= EXTRA_LONG_LABEL_THRESHOLD) {
            targetBase = baseSize * EXTRA_LONG_LABEL_RATIO;
        } else if (text.length > LONG_LABEL_THRESHOLD) {
            targetBase = baseSize * LONG_LABEL_RATIO;
        }

        const fullWidth = measureTextWidth(text, `${fontWeight} ${targetBase}px ${fontFamily}`, letterSpacing);

        let fontSize = targetBase;
        if (fullWidth > availableWidth) {
            fontSize = Math.max(MIN_FONT_SIZE, targetBase * (availableWidth / fullWidth));

            let measured = measureTextWidth(text, `${fontWeight} ${fontSize}px ${fontFamily}`, letterSpacing);
            let guard = 0;
            while (measured > boxWidth && fontSize > MIN_FONT_SIZE && guard < 6) {
                fontSize -= 1;
                measured = measureTextWidth(text, `${fontWeight} ${fontSize}px ${fontFamily}`, letterSpacing);
                guard++;
            }
        }

        span.style.fontSize = fontSize + 'px';
    }

    function fitAll() {
        document.querySelectorAll(SELECTOR).forEach(fitLabel);
    }

    function init() {
        fitAll();

        const observed = new WeakSet();
        const ro = new ResizeObserver((entries) => {
            entries.forEach((entry) => fitLabel(entry.target));
        });

        function observeAll() {
            document.querySelectorAll(SELECTOR).forEach((span) => {
                if (!observed.has(span)) {
                    observed.add(span);
                    ro.observe(span);
                }
            });
        }

        observeAll();

        const wrapper = document.querySelector('.ai-fam-wrapper');
        if (wrapper) {
            const mo = new MutationObserver(() => {
                observeAll();
                fitAll();
            });
            mo.observe(wrapper, { childList: true, subtree: true, characterData: true });
        }

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(fitAll);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
