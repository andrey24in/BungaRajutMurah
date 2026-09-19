(function () {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasGsap = typeof gsap !== 'undefined';
    var activeTl = null;

    var ENTER_FROM = { opacity: 0, scale: 1.06, y: 20, rotationZ: 0.6, filter: 'blur(8px)' };
    var ENTER_TO = { opacity: 1, scale: 1, y: 0, rotationZ: 0, filter: 'blur(0px)' };

    // Wipe transition-related inline styles so an interrupted transition
    // can never leave a page stuck half-visible.
    function resetAll(activeEl) {
        Array.prototype.forEach.call(document.querySelectorAll('.page'), function (p) {
            gsap.set(p, {
                clearProps: 'clipPath,zIndex,filter,transform',
                opacity: p === activeEl ? 1 : 0
            });
            var img = p.querySelector('.page-img');
            if (img) gsap.set(img, { clearProps: 'transform' });
        });
    }

    function transition(fromEl, toEl) {
        if (!hasGsap || prefersReducedMotion) {
            if (fromEl) fromEl.style.opacity = 0;
            toEl.style.opacity = 1;
            return;
        }

        if (activeTl) activeTl.kill();
        gsap.killTweensOf([fromEl, toEl]);

        var tl = gsap.timeline({
            onComplete: function () {
                resetAll(toEl);
                activeTl = null;
            }
        });
        activeTl = tl;

        gsap.set(toEl, { zIndex: 3 });
        if (fromEl) {
            gsap.set(fromEl, { zIndex: 2, opacity: 1 });
            tl.to(fromEl, {
                opacity: 0, scale: 0.97, y: -10, filter: 'blur(5px)',
                duration: 0.8, ease: 'power2.inOut'
            }, 0);
        }
        tl.fromTo(toEl, ENTER_FROM,
            Object.assign({ duration: 1.3, ease: 'power3.out' }, ENTER_TO), 0.15);

        return tl;
    }

    function intro(el) {
        if (!hasGsap || prefersReducedMotion) {
            el.style.opacity = 1;
            return;
        }
        gsap.fromTo(el, ENTER_FROM, Object.assign({
            duration: 1.6,
            ease: 'power3.out',
            clearProps: 'filter,transform'
        }, ENTER_TO));
    }

    window.FairishAnim = { transition: transition, intro: intro };
})();
