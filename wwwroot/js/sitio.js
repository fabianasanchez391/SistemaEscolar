
(function () {
    "use strict";

    // ---- Navbar: cambia de estilo al hacer scroll ----
    const navbar = document.getElementById("navbar");
    function actualizarNavbar() {
        navbar.classList.toggle("is-scrolled", window.scrollY > 12);
    }
    actualizarNavbar();
    window.addEventListener("scroll", actualizarNavbar, { passive: true });

    // ---- Menú móvil ----
    const burger = document.getElementById("navbarBurger");
    const links = document.getElementById("navbarLinks");

    burger.addEventListener("click", () => {
        const abierto = links.classList.toggle("is-open");
        burger.classList.toggle("is-open", abierto);
    });

    links.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", () => {
            links.classList.remove("is-open");
            burger.classList.remove("is-open");
        });
    });

    // ---- Botón "volver arriba" ----
    const backToTop = document.getElementById("backToTop");
    function actualizarBackToTop() {
        backToTop.classList.toggle("is-visible", window.scrollY > 480);
    }
    actualizarBackToTop();
    window.addEventListener("scroll", actualizarBackToTop, { passive: true });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // ---- Contadores animados (franja de estadísticas / pizarra) ----
    const contadores = document.querySelectorAll("[data-counter]");
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animarContador(el) {
        const destino = parseInt(el.dataset.counter, 10) || 0;
        if (prefiereMenosMovimiento) {
            el.textContent = destino;
            return;
        }
        const duracion = 1200;
        const inicio = performance.now();

        function paso(ahora) {
            const progreso = Math.min((ahora - inicio) / duracion, 1);
            const facilitado = 1 - Math.pow(1 - progreso, 3); // ease-out cúbico
            el.textContent = Math.round(destino * facilitado);
            if (progreso < 1) requestAnimationFrame(paso);
        }
        requestAnimationFrame(paso);
    }

    if ("IntersectionObserver" in window && contadores.length) {
        const counterObserver = new IntersectionObserver((entradas) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    animarContador(entrada.target);
                    counterObserver.unobserve(entrada.target);
                }
            });
        }, { threshold: 0.5 });

        contadores.forEach(el => counterObserver.observe(el));
    } else {
        contadores.forEach(el => { el.textContent = el.dataset.counter; });
    }

    // ---- Formulario de contacto (demo visual) ----
    const formContacto = document.getElementById("formContacto");
    if (formContacto) {
        formContacto.addEventListener("submit", (ev) => {
            ev.preventDefault();
            if (!formContacto.checkValidity()) {
                formContacto.reportValidity();
                return;
            }
            // Aquí se conecta el envío real (fetch a un ContactoController, por ejemplo).
            const boton = formContacto.querySelector("button[type='submit']");
            const textoOriginal = boton.innerHTML;
            boton.innerHTML = "Enviando...";
            boton.disabled = true;
            setTimeout(() => {
                boton.innerHTML = "¡Mensaje enviado!";
                setTimeout(() => {
                    boton.innerHTML = textoOriginal;
                    boton.disabled = false;
                    formContacto.reset();
                }, 1800);
            }, 900);
        });
    }
})();