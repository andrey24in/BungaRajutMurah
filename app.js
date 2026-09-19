(function () {
    var app = document.getElementById('app');
    var tapHint = document.getElementById('tapHint');
    var fsBtn = document.getElementById('fsBtn');
    var pageEls = Array.prototype.slice.call(document.querySelectorAll('.page'));
    var TRACE_GAP = 3; // must match the negative inset on .cta-trace

    // Hotspots on a `contain`-fit image (data-rx/ry/rw/rh, % of the image's
    // own content) must be positioned against the image's actual rendered
    // box, not the full-viewport container, because `contain` letterboxes.
    function layoutImageHotspots() {
        pageEls.forEach(function (pageEl) {
            var img = pageEl.querySelector('.page-img.contain');
            var hotspots = pageEl.querySelectorAll('.hotspot[data-rx]');
            if (!img || !hotspots.length || !img.naturalWidth) return;

            var cw = pageEl.clientWidth, ch = pageEl.clientHeight;
            var iw = img.naturalWidth, ih = img.naturalHeight;
            var scale = Math.min(cw / iw, ch / ih);
            var renderW = iw * scale, renderH = ih * scale;
            var offsetX = (cw - renderW) / 2, offsetY = (ch - renderH) / 2;

            hotspots.forEach(function (h) {
                var rx = parseFloat(h.dataset.rx) / 100;
                var ry = parseFloat(h.dataset.ry) / 100;
                var rw = parseFloat(h.dataset.rw) / 100;
                var rh = parseFloat(h.dataset.rh) / 100;
                h.style.left = (offsetX + rx * renderW) + 'px';
                h.style.top = (offsetY + ry * renderH) + 'px';
                h.style.width = (rw * renderW) + 'px';
                h.style.height = (rh * renderH) + 'px';

                var corner = (rh * renderH) / 2 + TRACE_GAP;
                h.querySelectorAll('.cta-trace rect').forEach(function (rect) {
                    rect.setAttribute('rx', corner);
                    rect.setAttribute('ry', corner);
                });
            });
        });
    }

    pageEls.forEach(function (pageEl) {
        var img = pageEl.querySelector('.page-img.contain');
        if (img && img.complete) layoutImageHotspots();
        else if (img) img.addEventListener('load', layoutImageHotspots);
    });
    window.addEventListener('resize', layoutImageHotspots);
    window.addEventListener('load', layoutImageHotspots);
    layoutImageHotspots();

    var pages = {};
    pageEls.forEach(function (el) {
        pages[el.getAttribute('data-id')] = el;
    });

    var currentId = 'welcome';
    var history = [];
    var animating = false;
    var lastPointer = { x: null, y: null };

    document.addEventListener('pointerdown', function (event) {
        lastPointer.x = event.clientX;
        lastPointer.y = event.clientY;
    }, true);

    function goTo(id, opts) {
        opts = opts || {};
        if (animating || id === currentId || !pages[id]) return;
        animating = true;

        if (!opts.isBack) history.push(currentId);

        var currEl = pages[currentId];
        var nextEl = pages[id];

        currEl.classList.remove('active');
        nextEl.classList.add('active');

        if (window.FairishAnim) {
            window.FairishAnim.transition(currEl, nextEl, {
                isBack: !!opts.isBack,
                originX: lastPointer.x,
                originY: lastPointer.y
            });
        }

        currentId = id;
        window.setTimeout(function () { animating = false; }, 420);
    }

    function goBack() {
        if (!history.length) return;
        goTo(history.pop(), { isBack: true });
    }

    function hideHint() {
        if (tapHint) tapHint.classList.add('hidden');
    }

    // --- Swipe: left = forward (if the active page defines one), right = back ---
    var swipeStart = null;
    var swipeHandled = false;
    var SWIPE_MIN_X = 55;
    var SWIPE_MAX_Y = 70;

    app.addEventListener('pointerdown', function (event) {
        swipeStart = { x: event.clientX, y: event.clientY };
    });

    // While the pointer is moving horizontally, actively block the
    // browser/OS edge-swipe "go back" gesture from hijacking it.
    app.addEventListener('pointermove', function (event) {
        if (!swipeStart) return;
        var dx = event.clientX - swipeStart.x;
        var dy = event.clientY - swipeStart.y;
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
            event.preventDefault();
        }
    });

    app.addEventListener('pointerup', function (event) {
        if (!swipeStart) return;
        var dx = event.clientX - swipeStart.x;
        var dy = event.clientY - swipeStart.y;
        swipeStart = null;

        if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dy) > SWIPE_MAX_Y) return;

        swipeHandled = true;
        hideHint();

        if (dx < 0) {
            var next = pages[currentId].dataset.swipeNext;
            if (next) goTo(next);
        } else {
            goBack();
        }
    });

    app.addEventListener('click', function (event) {
        if (swipeHandled) { swipeHandled = false; return; }

        // A plain link (WhatsApp, Instagram, ...) with no data-goto/data-back
        // of its own should just navigate normally, even if it sits inside a
        // tap-anywhere page whose outer section carries data-goto.
        var link = event.target.closest('a[href]');
        if (link && !link.hasAttribute('data-goto') && !link.hasAttribute('data-back')) {
            hideHint();
            return;
        }

        var target = event.target.closest('[data-goto], [data-back]');
        if (!target) return;

        hideHint();
        if (target.hasAttribute('data-back')) goBack();
        else goTo(target.getAttribute('data-goto'));
    });

    // --- Fullscreen ---
    function fsSupported() {
        var el = document.documentElement;
        return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen);
    }

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    function requestFS() {
        var el = document.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) { try { req.call(el); } catch (e) {} }
    }

    function exitFS() {
        var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (ex) { try { ex.call(document); } catch (e) {} }
    }

    if (!fsSupported()) {
        if (fsBtn) fsBtn.classList.add('hidden');
    } else {
        // Browsers require a user gesture to enter fullscreen, so request
        // it on the very first tap/click anywhere (this also fires on the
        // welcome-page tap, so it feels automatic in practice).
        document.addEventListener('pointerdown', function autoFs() {
            if (!isFullscreen()) requestFS();
            document.removeEventListener('pointerdown', autoFs);
        }, { once: true });

        if (fsBtn) {
            fsBtn.addEventListener('click', function () {
                if (isFullscreen()) exitFS(); else requestFS();
            });
        }
    }

    // --- Tap ripple + press feedback, so every button/card feels alive ---
    function spawnRipple(el, clientX, clientY) {
        var rect = el.getBoundingClientRect();
        var lx = clientX - rect.left, ly = clientY - rect.top;
        var maxDist = Math.max(
            Math.hypot(lx, ly),
            Math.hypot(rect.width - lx, ly),
            Math.hypot(lx, rect.height - ly),
            Math.hypot(rect.width - lx, rect.height - ly)
        );
        var size = maxDist * 2;

        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = (lx - maxDist) + 'px';
        ripple.style.top = (ly - maxDist) + 'px';
        (el.querySelector(':scope > .ripple-clip') || el).appendChild(ripple);

        if (window.gsap) {
            gsap.fromTo(ripple, { scale: 0, opacity: 0.5 }, {
                scale: 1, opacity: 0, duration: 0.55, ease: 'power2.out',
                onComplete: function () { ripple.remove(); }
            });
        } else {
            window.setTimeout(function () { ripple.remove(); }, 400);
        }
    }

    function bindTapFX(el) {
        el.addEventListener('pointerdown', function (event) {
            spawnRipple(el, event.clientX, event.clientY);
            if (window.gsap) gsap.to(el, { scale: 0.93, duration: 0.12, ease: 'power2.out' });
        });
        function release() {
            if (window.gsap) gsap.to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        }
        el.addEventListener('pointerup', release);
        el.addEventListener('pointerleave', release);
        el.addEventListener('pointercancel', release);
    }

    // CTA ripples are clipped to the pill so they don't spill over the artwork.
    Array.prototype.slice.call(document.querySelectorAll('.cta')).forEach(function (cta) {
        var clip = document.createElement('span');
        clip.className = 'ripple-clip';
        cta.appendChild(clip);
    });

    Array.prototype.slice.call(document.querySelectorAll('.hotspot, .back-btn, .fs-btn')).forEach(bindTapFX);

    // First page entrance animation on load.
    if (window.FairishAnim) {
        window.FairishAnim.intro(pages[currentId]);
    }

    window.setTimeout(hideHint, 4000);
})();
