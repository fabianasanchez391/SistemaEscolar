
(function () {
    "use strict";

    // ---- Alternar entre Iniciar sesión y Registro ----
    const shell = document.getElementById("authShell");

    document.getElementById("btnGoSignUp")?.addEventListener("click", () => shell.classList.add("is-signup"));
    document.getElementById("btnGoSignIn")?.addEventListener("click", () => shell.classList.remove("is-signup"));

    // ---- Mostrar / ocultar contraseña ----
    document.querySelectorAll(".auth-field__toggle").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const isHidden = input.type === "password";
            input.type = isHidden ? "text" : "password";
            btn.innerHTML = isHidden ? eyeOffIcon() : eyeIcon();
        });
    });

    function eyeIcon() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>';
    }
    function eyeOffIcon() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18" /><path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1M6.5 6.6C4 8.3 2 12 2 12s3.5 7 10 7c1.4 0 2.6-.3 3.7-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>';
    }

    // ---- Toast de confirmación ----
    const toast = document.getElementById("authToast");
    let toastTimer;
    window.showAuthToast = function (message) {
        if (!toast) return;
        toast.querySelector("span").textContent = message;
        toast.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
    };

    // ---- Modal "Olvidé mi contraseña" ----
    const forgotModal = document.getElementById("forgotModal");
    if (forgotModal) {
        const openBtn = document.getElementById("btnOlvide");
        const closeBtn = document.getElementById("forgotModalClose");
        const closeBtn2 = document.getElementById("forgotModalClose2");
        const form = forgotModal.querySelector(".auth-modal__form");
        const success = forgotModal.querySelector(".auth-modal__success");
        const emailInput = document.getElementById("forgotEmail");

        const openModal = () => {
            form.classList.remove("is-hidden");
            success.classList.remove("is-visible");
            emailInput.value = "";
            forgotModal.classList.add("is-open");
        };
        const closeModal = () => forgotModal.classList.remove("is-open");

        openBtn?.addEventListener("click", e => { e.preventDefault(); openModal(); });
        closeBtn?.addEventListener("click", closeModal);
        closeBtn2?.addEventListener("click", closeModal);
        forgotModal.addEventListener("click", e => { if (e.target === forgotModal) closeModal(); });

        document.getElementById("forgotSubmit")?.addEventListener("click", () => {
            if (!emailInput.value.trim() || !emailInput.value.includes("@")) {
                emailInput.focus();
                return;
            }
            // TODO: reemplazar por la llamada real al controlador (enviar enlace de recuperación)
            form.classList.add("is-hidden");
            success.classList.add("is-visible");
        });
    }

    // ---- Registro: filas dinámicas de "hijos" ----
    // Orden de campos: primero cédula, luego nombre.
    const childrenList = document.getElementById("childrenList");
    if (childrenList) {
        const addBtn = document.getElementById("btnAgregarHijo");

        function addChildRow() {
            const row = document.createElement("div");
            row.className = "child-row";
            row.innerHTML = `
                <input type="text" placeholder="Cédula del hijo/a" class="child-cedula" />
                <input type="text" placeholder="Nombre del hijo/a" class="child-nombre" />
                <button type="button" class="child-row__remove" title="Quitar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
            `;
            row.querySelector(".child-row__remove").addEventListener("click", () => row.remove());
            childrenList.appendChild(row);
            row.querySelector(".child-cedula").focus();
        }

        addBtn.addEventListener("click", addChildRow);
    }

    // ---- Envío del formulario de inicio de sesión ----
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", e => {
            e.preventDefault();
            const correo = document.getElementById("loginCorreo").value.trim();
            const clave = document.getElementById("loginClave").value;
            if (!correo || !clave) {
                showAuthToast("Completá tu correo y contraseña.");
                return;
            }
            // TODO: reemplazar por la llamada real al controlador de autenticación
            showAuthToast(`Bienvenido/a, ${correo}`);
        });
    }

    // ---- Envío del formulario de registro ----
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", e => {
            e.preventDefault();
            const correo = document.getElementById("regCorreo").value.trim();
            const nombre = document.getElementById("regNombre").value.trim();
            const celular = document.getElementById("regCelular").value.trim();
            const clave = document.getElementById("regClave").value;
            const claveConfirm = document.getElementById("regClaveConfirm").value;

            if (!correo || !nombre || !celular || !clave) {
                showAuthToast("Completá correo, nombre, celular y contraseña.");
                return;
            }
            if (clave !== claveConfirm) {
                showAuthToast("Las contraseñas no coinciden.");
                return;
            }

            const hijos = Array.from(document.querySelectorAll("#childrenList .child-row")).map(row => ({
                nombre: row.querySelector(".child-nombre").value.trim(),
                cedula: row.querySelector(".child-cedula").value.trim(),
            })).filter(h => h.nombre || h.cedula);

            const incompleto = hijos.some(h => !h.nombre || !h.cedula);
            if (incompleto) {
                showAuthToast("Completá el nombre y la cédula de cada hijo agregado.");
                return;
            }

            // TODO: reemplazar por la llamada real al controlador (POST de registro + hijos)
            showAuthToast("Cuenta creada. ¡Bienvenido/a a Escuela El Valle!");
        });
    }
})();