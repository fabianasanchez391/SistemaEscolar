(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        initTabs();
        initAvatarUpload();
        initPasswordToggles();
        initPasswordStrength();
        initDirtyStateAndSubmit();
    });

    /**
     * Navegación de secciones "Datos personales" / "Seguridad".
     */
    function initTabs() {
        var tabs = document.querySelectorAll(".ep-tab");
        var panels = document.querySelectorAll(".ep-panel");
        if (!tabs.length) return;

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                var target = tab.getAttribute("data-tab");

                tabs.forEach(function (t) {
                    var isActive = t === tab;
                    t.classList.toggle("is-active", isActive);
                    t.setAttribute("aria-selected", isActive ? "true" : "false");
                });

                panels.forEach(function (panel) {
                    panel.hidden = panel.getAttribute("data-tab-panel") !== target;
                });
            });
        });
    }

    /**
     * Vista previa de la foto de perfil al seleccionar un archivo,
     * y botón para quitarla (vuelve a mostrar las iniciales).
     */
    function initAvatarUpload() {
        var input = document.getElementById("avatarInput");
        var img = document.getElementById("avatarImg");
        var initials = document.getElementById("avatarInitials");
        var removeBtn = document.getElementById("avatarRemoveBtn");

        if (!input || !img || !initials) return;

        input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) return;

            var maxBytes = 2 * 1024 * 1024; // 2 MB
            if (file.size > maxBytes) {
                alert("La imagen supera el tamaño máximo de 2 MB.");
                input.value = "";
                return;
            }

            var reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                img.hidden = false;
                initials.hidden = true;
                markDirty();
            };
            reader.readAsDataURL(file);
        });

        if (removeBtn) {
            removeBtn.addEventListener("click", function () {
                input.value = "";
                img.src = "";
                img.hidden = true;
                initials.hidden = false;
                markDirty();
            });
        }
    }

    /**
     * Botones de "mostrar/ocultar" en cada campo de contraseña.
     */
    function initPasswordToggles() {
        document.querySelectorAll(".ep-password__toggle").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var targetId = btn.getAttribute("data-target");
                var field = document.getElementById(targetId);
                if (!field) return;

                var isVisible = field.type === "text";
                field.type = isVisible ? "password" : "text";
                btn.classList.toggle("is-active", !isVisible);
                btn.setAttribute("aria-label", isVisible ? "Mostrar contraseña" : "Ocultar contraseña");
            });
        });
    }

    /**
     * Medidor visual de fuerza para el campo "Nueva contraseña".
     */
    function initPasswordStrength() {
        var nuevaPass = document.getElementById("PasswordNueva");
        var wrap = document.getElementById("epStrength");
        var fill = document.getElementById("epStrengthFill");
        var label = document.getElementById("epStrengthLabel");
        if (!nuevaPass || !wrap || !fill || !label) return;

        function scorePassword(value) {
            var score = 0;
            if (value.length >= 8) score++;
            if (value.length >= 12) score++;
            if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
            if (/\d/.test(value)) score++;
            if (/[^A-Za-z0-9]/.test(value)) score++;
            return score;
        }

        nuevaPass.addEventListener("input", function () {
            var value = nuevaPass.value;

            if (!value) {
                wrap.hidden = true;
                return;
            }

            wrap.hidden = false;
            var score = scorePassword(value);
            var levels = [
                { pct: 20, color: "var(--red-500)", text: "Muy débil" },
                { pct: 40, color: "var(--red-500)", text: "Débil" },
                { pct: 60, color: "var(--yellow-500)", text: "Aceptable" },
                { pct: 80, color: "var(--teal-600)", text: "Fuerte" },
                { pct: 100, color: "var(--green-600)", text: "Muy fuerte" }
            ];
            var level = levels[Math.min(score, levels.length - 1)];

            fill.style.width = level.pct + "%";
            fill.style.background = level.color;
            label.textContent = level.text;
        });
    }

    /**
     * Detecta cambios respecto al estado inicial del formulario para
     * mostrar/ocultar la barra de guardado, valida las contraseñas
     * antes de enviar, y maneja el botón "Descartar cambios".
     */
    var isDirty = false;
    var saveBar;

    function markDirty() {
        if (!saveBar) saveBar = document.getElementById("epSaveBar");
        isDirty = true;
        if (saveBar) saveBar.classList.add("is-visible");
    }

    function clearDirty() {
        isDirty = false;
        if (saveBar) saveBar.classList.remove("is-visible");
    }

    function initDirtyStateAndSubmit() {
        var form = document.getElementById("editarPerfilForm");
        if (!form) return;

        saveBar = document.getElementById("epSaveBar");
        var initialData = new FormData(form);
        var initialSnapshot = snapshot(initialData);

        var nuevaPass = document.getElementById("PasswordNueva");
        var confirmarPass = document.getElementById("PasswordConfirmar");
        var actualPass = document.getElementById("PasswordActual");
        var errorMsg = document.getElementById("passwordError");
        var saveBtn = document.getElementById("epSaveBtn");
        var cancelBtn = document.getElementById("epCancelBtn");

        function snapshot(formData) {
            var obj = {};
            formData.forEach(function (value, key) {
                obj[key] = value;
            });
            return JSON.stringify(obj);
        }

        form.addEventListener("input", function () {
            var current = snapshot(new FormData(form));
            current === initialSnapshot ? clearDirty() : markDirty();
        });

        function validatePasswords() {
            var wantsChange = (nuevaPass && nuevaPass.value) || (confirmarPass && confirmarPass.value);

            if (!wantsChange) {
                if (errorMsg) errorMsg.hidden = true;
                return true;
            }

            var matches = nuevaPass.value === confirmarPass.value && nuevaPass.value.length >= 8;
            var hasCurrent = actualPass && actualPass.value.length > 0;

            if (!matches || !hasCurrent) {
                if (errorMsg) {
                    errorMsg.hidden = false;
                    errorMsg.textContent = !hasCurrent
                        ? "Ingresa tu contraseña actual para poder cambiarla."
                        : "Las contraseñas no coinciden o tienen menos de 8 caracteres.";
                }
                return false;
            }

            if (errorMsg) errorMsg.hidden = true;
            return true;
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", function () {
                form.reset();
                var img = document.getElementById("avatarImg");
                var initials = document.getElementById("avatarInitials");
                if (img) img.hidden = true;
                if (initials) initials.hidden = false;
                if (errorMsg) errorMsg.hidden = true;
                var strengthWrap = document.getElementById("epStrength");
                if (strengthWrap) strengthWrap.hidden = true;
                clearDirty();
            });
        }

        form.addEventListener("submit", function (e) {
            // TODO backend: quitar este preventDefault una vez que el
            // formulario apunte a la acción real del controlador
            // (asp-controller="GestionPerfiles" asp-action="EditarPerfil").
            e.preventDefault();

            if (!validatePasswords()) return;

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = "Guardando...";
            }

            // Simulación de guardado. Sustituir por un fetch/submit real, ej.:
            // fetch(form.action, { method: "POST", body: new FormData(form) })
            //     .then(...)
            setTimeout(function () {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Guardar cambios";
                }
                if (nuevaPass) nuevaPass.value = "";
                if (confirmarPass) confirmarPass.value = "";
                if (actualPass) actualPass.value = "";
                initialSnapshot = snapshot(new FormData(form));
                clearDirty();
            }, 600);
        });
    }
})();