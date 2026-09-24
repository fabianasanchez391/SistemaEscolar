
(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        initSidebarToggle();
        initActiveNavItem();
        initDropdowns();
    });

    /**
     * Abre/cierra el sidebar en pantallas pequeñas (off-canvas).
     * Se activa con el botón hamburguesa del topbar y se cierra
     * con el botón "X" del sidebar, el overlay, o la tecla Escape.
     */
    function initSidebarToggle() {
        var body = document.body;
        var menuBtn = document.getElementById("menuToggleBtn");
        var closeBtn = document.getElementById("sidebarCloseBtn");
        var overlay = document.getElementById("sidebarOverlay");

        function openSidebar() {
            body.classList.add("sidebar-open");
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
        }

        function closeSidebar() {
            body.classList.remove("sidebar-open");
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
        }

        if (menuBtn) {
            menuBtn.addEventListener("click", function () {
                body.classList.contains("sidebar-open") ? closeSidebar() : openSidebar();
            });
        }

        if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
        if (overlay) overlay.addEventListener("click", closeSidebar);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeSidebar();
        });

        // Si el usuario agranda la ventana, aseguramos que el sidebar
        // off-canvas quede cerrado y no interfiera con el layout de escritorio.
        window.addEventListener("resize", function () {
            if (window.innerWidth > 991) closeSidebar();
        });

        // Cerrar automáticamente al elegir una opción del menú (móvil).
        document.querySelectorAll(".nav-item").forEach(function (item) {
            item.addEventListener("click", function () {
                if (window.innerWidth <= 991) closeSidebar();
            });
        });
    }

    /**
     * Marca como activo el enlace del sidebar que corresponde
     * a la página actual, usando data-page en <body>.
     */
    function initActiveNavItem() {
        var page = document.body.getAttribute("data-page");
        if (!page) return;

        document.querySelectorAll(".nav-item").forEach(function (item) {
            var isActive = item.getAttribute("data-page") === page;
            item.classList.toggle("is-active", isActive);
            if (isActive) item.setAttribute("aria-current", "page");
        });
    }

    /**
     * Controla los dos menús desplegables del topbar:
     * el de notificaciones y el del usuario logueado.
     * Ambos comparten el mismo patrón de marcado:
     *   <div class="dropdown-wrap">
     *       <button ...>...</button>
     *       <div class="dropdown-panel">...</div>
     *   </div>
     */
    function initDropdowns() {
        var wraps = Array.prototype.slice.call(document.querySelectorAll(".dropdown-wrap"));
        if (!wraps.length) return;

        function closeWrap(wrap) {
            var btn = wrap.querySelector("button");
            var panel = wrap.querySelector(".dropdown-panel");
            wrap.setAttribute("data-open", "false");
            if (btn) btn.setAttribute("aria-expanded", "false");
            if (panel) panel.setAttribute("aria-hidden", "true");
        }

        function openWrap(wrap) {
            // Cierra cualquier otro dropdown abierto antes de abrir este.
            wraps.forEach(function (w) {
                if (w !== wrap) closeWrap(w);
            });

            var btn = wrap.querySelector("button");
            var panel = wrap.querySelector(".dropdown-panel");
            wrap.setAttribute("data-open", "true");
            if (btn) btn.setAttribute("aria-expanded", "true");
            if (panel) panel.setAttribute("aria-hidden", "false");
        }

        function toggleWrap(wrap) {
            var isOpen = wrap.getAttribute("data-open") === "true";
            isOpen ? closeWrap(wrap) : openWrap(wrap);
        }

        wraps.forEach(function (wrap) {
            var btn = wrap.querySelector("button");
            if (!btn) return;

            wrap.setAttribute("data-open", "false");

            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleWrap(wrap);
            });

            // Evita que un clic dentro del panel lo cierre por el listener global.
            var panel = wrap.querySelector(".dropdown-panel");
            if (panel) {
                panel.addEventListener("click", function (e) {
                    e.stopPropagation();
                });
            }
        });

        // Cerrar todos al hacer clic fuera de cualquier dropdown.
        document.addEventListener("click", function () {
            wraps.forEach(closeWrap);
        });

        // Cerrar todos con Escape.
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") wraps.forEach(closeWrap);
        });

        initNotifications();
    }

    /**
     * Comportamiento propio del panel de notificaciones:
     * marcar una notificación como leída al hacer clic sobre ella
     * y marcar todas como leídas con el botón del encabezado.
     * El listado en sí (obtener las notificaciones del usuario)
     * debe venir del backend; aquí solo se maneja la interacción.
     */
    function initNotifications() {
        var list = document.getElementById("notifList");
        var badge = document.getElementById("notifBadge");
        var markAllBtn = document.getElementById("markAllReadBtn");

        function updateBadge() {
            if (!badge) return;
            var unreadCount = list ? list.querySelectorAll(".notif-item.is-unread").length : 0;
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
                badge.classList.remove("is-hidden");
            } else {
                badge.classList.add("is-hidden");
            }
        }

        if (list) {
            list.querySelectorAll(".notif-item").forEach(function (item) {
                item.addEventListener("click", function () {
                    // TODO backend: notificar al servidor que esta notificación
                    // (item.dataset.notifId) fue leída, ej. vía fetch/AJAX.
                    item.classList.remove("is-unread");
                    updateBadge();
                });
            });
        }

        if (markAllBtn) {
            markAllBtn.addEventListener("click", function () {
                // TODO backend: notificar al servidor que todas las
                // notificaciones del usuario fueron marcadas como leídas.
                if (list) {
                    list.querySelectorAll(".notif-item.is-unread").forEach(function (item) {
                        item.classList.remove("is-unread");
                    });
                }
                updateBadge();
            });
        }

        updateBadge();
    }
})();