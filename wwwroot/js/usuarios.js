
(function () {
    "use strict";

    // ---- Catálogo de grupos (para la asignación de docentes) ----
    const GRADOS = ["Kínder", "1°", "2°", "3°", "4°", "5°", "6°"];
    const SECCIONES = ["A", "B"];
    const gruposCatalogo = [];
    GRADOS.forEach(g => SECCIONES.forEach(s => gruposCatalogo.push(`${g}${s}`)));
    const MAX_GRUPOS = 3;

    function grupoLabel(codigo) {
        const letra = codigo.slice(-1);
        const grado = codigo.slice(0, -1);
        return `${grado} - Grupo ${letra}`;
    }

    // ---- Datos de ejemplo (modelo unificado) ----
    // rol: 'docente' | 'admin'
    // Campos por rol:
    //   docente: cedula, nombre, correo, grupos[]
    //   admin:   cedula, nombre, correo
    let usersData = [
        { id: 1, rol: "docente", cedula: "1-0234-0567", nombre: "Fabiana Arias", correo: "fabiana.arias@elvalle.ed.cr", grupos: ["5°A"], activo: true },
        { id: 2, rol: "docente", cedula: "1-0345-0678", nombre: "Luis Vargas", correo: "luis.vargas@elvalle.ed.cr", grupos: ["4°A", "4°B"], activo: true },
        { id: 3, rol: "docente", cedula: "1-0456-0789", nombre: "Sofía Herrera", correo: "sofia.herrera@elvalle.ed.cr", grupos: ["6°A"], activo: false },
        { id: 4, rol: "docente", cedula: "1-0567-0890", nombre: "Ricardo Fallas", correo: "ricardo.fallas@elvalle.ed.cr", grupos: ["1°A", "1°B", "2°A"], activo: true },

        { id: 10, rol: "admin", cedula: "1-8901-2345", nombre: "Elena Vargas Peña", correo: "elena.vargas@elvalle.ed.cr", activo: true },
        { id: 11, rol: "admin", cedula: "1-7890-1234", nombre: "Marco Soto León", correo: "marco.soto@elvalle.ed.cr", activo: true },
    ];

    // No existe rol "todos": cada pestaña muestra exclusivamente su tipo de usuario.
    // "inactivo" es una pestaña especial: reúne usuarios de cualquier rol con activo === false,
    // separados por completo de las listas de activos (docente/admin solo muestran activos).
    let currentRole = "docente";
    let currentSubFilter = "todos"; // grupo (docente) | no aplica (admin / inactivo)
    let currentSearch = "";
    let editingId = null;

    // ---- Referencias DOM ----
    const theadEl = document.getElementById("usersTableHead");
    const tbody = document.getElementById("usersTableBody");
    const emptyState = document.getElementById("emptyState");
    const resultsCount = document.getElementById("resultsCount");
    const searchInput = document.getElementById("searchInput");
    const grupoFilter = document.getElementById("grupoFilter");
    const subFilterGroup = document.getElementById("subFilterGroup");
    const subFilterLabel = document.getElementById("subFilterLabel");
    const roleStatsRow = document.getElementById("roleStatsRow");
    const btnRegistrarUsuario = document.getElementById("btnRegistrarUsuario");
    const btnRegistrarLabel = document.getElementById("btnRegistrarLabel");
    const btnExportLabel = document.getElementById("btnExportLabel");

    const avatarColorByRole = { docente: "#22b573", admin: "#5b6a91" };
    const rolLabelByRole = { docente: "Docente", admin: "Personal administrativo" };
    const rolBadgeClassByRole = { docente: "role-badge--docente", admin: "role-badge--admin" };

    // ---- Mensaje de confirmación centrado (éxito / error), desaparece solo a los 3s ----
    let confirmTimer;
    function showToast(message, type) {
        type = type === "error" ? "error" : "success";

        let overlay = document.getElementById("confirmOverlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "confirmOverlay";
            overlay.className = "confirm-overlay";
            overlay.innerHTML = `
                <div class="confirm-box">
                    <div class="confirm-box__icon">
                        <svg class="confirm-box__icon-svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"></svg>
                    </div>
                    <p class="confirm-box__msg"></p>
                </div>`;
            document.body.appendChild(overlay);
        }

        const box = overlay.querySelector(".confirm-box");
        const iconSvg = overlay.querySelector(".confirm-box__icon-svg");

        box.classList.remove("confirm-box--success", "confirm-box--error");
        box.classList.add(type === "error" ? "confirm-box--error" : "confirm-box--success");

        // Ícono de check (éxito) o X (error)
        iconSvg.innerHTML = type === "error"
            ? '<path d="M18 6 6 18M6 6l12 12" />'
            : '<path d="m5 13 4 4L19 7" />';

        overlay.querySelector(".confirm-box__msg").textContent = message;
        overlay.classList.add("is-visible");

        clearTimeout(confirmTimer);
        confirmTimer = setTimeout(() => overlay.classList.remove("is-visible"), 3000);
    }

    // ---- Validar cédula duplicada (entre todos los usuarios, excluyendo el que se edita) ----
    function cedulaExiste(cedula, idExcluido) {
        const c = cedula.trim().toLowerCase();
        return usersData.some(u => u.id !== idExcluido && u.cedula.trim().toLowerCase() === c);
    }

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    const roleMeta = {
        docente: { singular: "docente", plural: "Docentes" },
        admin: { singular: "personal administrativo", plural: "Personal administrativo" },
        inactivo: { singular: "usuario inactivo", plural: "Inactivos" },
    };

    // ---- Configuración de columnas por rol (encabezado + celdas) ----
    const TABLE_HEADERS = {
        docente: ["Nombre", "Cédula", "Correo electrónico", "Grupos asignados", "Estado", "Acciones"],
        admin: ["Nombre", "Cédula", "Correo electrónico", "Estado", "Acciones"],
        inactivo: ["Nombre", "Cédula", "Rol", "Correo electrónico", "Estado", "Acciones"],
    };

    function renderHead() {
        const headers = TABLE_HEADERS[currentRole];
        theadEl.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    }

    function avatarCell(u) {
        return `
            <td>
                <div class="user-cell">
                    <div class="user-avatar" style="background:${avatarColorByRole[u.rol]}">${initials(u.nombre)}</div>
                    <span class="user-cell__name">${u.nombre}</span>
                </div>
            </td>`;
    }

    function statusCell(u) {
        return `
            <td>
                <button class="status-pill ${u.activo ? "status-pill--activo" : "status-pill--inactivo"}" data-id="${u.id}" type="button">
                    ${u.activo ? "Activo" : "Inactivo"}
                </button>
            </td>`;
    }

    function actionsCell(u) {
        // Sin botón de eliminar: solo editar y ver detalle.
        return `
            <td>
                <div class="row-actions">
                    <button class="row-action-btn edit-btn" data-id="${u.id}" title="Editar" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                    <button class="row-action-btn view-btn" data-id="${u.id}" title="Ver detalle" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>
            </td>`;
    }

    // Fila unificada para la pestaña "Inactivos": mezcla usuarios de cualquier rol,
    // así que muestra una columna de Rol.
    function inactivoRowHtml(u) {
        return `
            ${avatarCell(u)}
            <td>${u.cedula}</td>
            <td><span class="role-badge ${rolBadgeClassByRole[u.rol]}">${rolLabelByRole[u.rol]}</span></td>
            <td>${u.correo}</td>
            ${statusCell(u)}
            ${actionsCell(u)}
        `;
    }

    function rowHtml(u) {
        if (currentRole === "inactivo") return inactivoRowHtml(u);

        if (u.rol === "docente") {
            return `
                ${avatarCell(u)}
                <td>${u.cedula}</td>
                <td>${u.correo}</td>
                <td><div class="group-tags">${u.grupos.map(g => `<span class="role-badge role-badge--docente">${grupoLabel(g)}</span>`).join("")}</div></td>
                ${statusCell(u)}
                ${actionsCell(u)}
            `;
        }
        // admin
        return `
            ${avatarCell(u)}
            <td>${u.cedula}</td>
            <td>${u.correo}</td>
            ${statusCell(u)}
            ${actionsCell(u)}
        `;
    }

    // ---- Poblar el filtro secundario (Grupo) según la pestaña activa ----
    // Solo aplica a Docentes; no aplica para Personal administrativo ni para Inactivos.
    function refreshSubFilterOptions() {
        currentSubFilter = "todos";

        if (currentRole !== "docente") {
            subFilterGroup.style.display = "none";
            return;
        }
        subFilterGroup.style.display = "";

        grupoFilter.innerHTML = '<option value="todos">Todos</option>';
        gruposCatalogo.forEach(codigo => {
            const opt = document.createElement("option");
            opt.value = codigo;
            opt.textContent = grupoLabel(codigo);
            grupoFilter.appendChild(opt);
        });
        grupoFilter.value = "todos";
        subFilterLabel.textContent = "Grupo asignado";
    }

    // ---- Estadísticas ----
    // Docentes/Admin cuentan solo a los ACTIVOS de ese rol (los inactivos viven aparte).
    // "Inactivos" cuenta el total de usuarios desactivados, sin importar su rol.
    function updateStats() {
        document.getElementById("statDocentes").textContent = usersData.filter(u => u.rol === "docente" && u.activo).length;
        document.getElementById("statAdmin").textContent = usersData.filter(u => u.rol === "admin" && u.activo).length;
        document.getElementById("statInactivos").textContent = usersData.filter(u => !u.activo).length;
    }

    // ---- Filtro combinado ----
    // Las pestañas de rol (docente/admin) SOLO muestran usuarios activos de ese rol.
    // La pestaña "Inactivos" muestra únicamente usuarios desactivados, de cualquier rol.
    // Así, activos e inactivos nunca se mezclan en una misma lista.
    function getFiltered() {
        const q = currentSearch.trim().toLowerCase();
        return usersData.filter(u => {
            if (currentRole === "inactivo") {
                if (u.activo) return false;
            } else {
                if (u.rol !== currentRole || !u.activo) return false;
            }

            const matchSub = currentRole !== "docente" || currentSubFilter === "todos" ||
                u.grupos.includes(currentSubFilter);

            const matchSearch = !q ||
                u.nombre.toLowerCase().includes(q) ||
                u.cedula.toLowerCase().includes(q) ||
                (u.correo || "").toLowerCase().includes(q);

            return matchSub && matchSearch;
        });
    }

    // ---- Render tabla ----
    function render() {
        updateStats();
        renderHead();
        const list = getFiltered();
        tbody.innerHTML = "";

        list.forEach(u => {
            const tr = document.createElement("tr");
            tr.innerHTML = rowHtml(u);
            tbody.appendChild(tr);
        });

        emptyState.style.display = list.length === 0 ? "block" : "none";

        const totalDeLaPestana = currentRole === "inactivo"
            ? usersData.filter(u => !u.activo).length
            : usersData.filter(u => u.rol === currentRole && u.activo).length;
        resultsCount.textContent = `Mostrando ${list.length} de ${totalDeLaPestana} usuarios`;
        attachRowEvents();
    }

    function attachRowEvents() {
        tbody.querySelectorAll(".status-pill").forEach(el => {
            el.addEventListener("click", () => toggleStatus(el.dataset.id));
        });
        tbody.querySelectorAll(".edit-btn").forEach(el => {
            el.addEventListener("click", () => openEditModal(parseInt(el.dataset.id, 10)));
        });
        tbody.querySelectorAll(".view-btn").forEach(el => {
            el.addEventListener("click", () => openDetailModal(parseInt(el.dataset.id, 10)));
        });
    }

    // El estado se puede activar/desactivar desde la tabla, pero nunca eliminar el registro.
    // Al cambiar el estado, el usuario deja de cumplir el filtro de la pestaña actual
    // (activo -> deja de aparecer en su rol y pasa a "Inactivos"; inactivo -> reactivado,
    // vuelve a la pestaña de su rol), así que basta con volver a renderizar.
    function toggleStatus(id) {
        const u = usersData.find(x => x.id == id);
        if (!u) return;
        u.activo = !u.activo;
        render(); // TODO: reemplazar por llamada real al controlador
    }

    function openEditModal(id) {
        const u = usersData.find(x => x.id === id);
        if (!u) return;
        if (u.rol === "docente") openTeacherModal(id);
        else openAdminModal(id);
    }

    // ---- Cambiar de pestaña (rol / inactivos) ----
    function switchRole(rol) {
        currentRole = rol;
        currentSearch = "";
        searchInput.value = "";
        refreshSubFilterOptions();

        document.querySelectorAll(".role-stat-card").forEach(c => c.classList.toggle("is-active", c.dataset.role === rol));

        // En "Inactivos" no tiene sentido "Registrar", ya que no se crean usuarios inactivos.
        const esInactivos = rol === "inactivo";
        btnRegistrarUsuario.style.display = esInactivos ? "none" : "";
        if (!esInactivos) {
            btnRegistrarLabel.textContent = `Registrar ${roleMeta[rol].singular}`;
        }
        btnExportLabel.textContent = `Exportar ${roleMeta[rol].plural.toLowerCase()}`;

        render();
    }

    // ---- Tarjetas de resumen actúan como pestañas ----
    roleStatsRow.addEventListener("click", e => {
        const card = e.target.closest(".role-stat-card");
        if (!card) return;
        switchRole(card.dataset.role);
    });

    // ---- Filtros: panel lateral ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        currentSubFilter = grupoFilter.value;
        currentSearch = searchInput.value;
        render();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        currentSearch = "";
        searchInput.value = "";
        refreshSubFilterOptions();
        render();
    });

    let searchTimer;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentSearch = searchInput.value; render(); }, 200);
    });

    // ---- Tip panel ----
    document.getElementById("tipCloseBtn").addEventListener("click", () => {
        document.getElementById("tipPanel").style.display = "none";
    });

    // =========================================================
    // BOTÓN "Registrar usuario" -> abre el modal según la pestaña activa
    // =========================================================
    btnRegistrarUsuario.addEventListener("click", () => {
        if (currentRole === "docente") openTeacherModal(null);
        else if (currentRole === "admin") openAdminModal(null);
        // en "inactivo" el botón está oculto, no hace falta manejarlo aquí
    });

    document.getElementById("qaDocente").addEventListener("click", () => openTeacherModal(null));
    document.getElementById("qaAdmin").addEventListener("click", () => openAdminModal(null));

    // =========================================================
    // MODAL DOCENTE
    // =========================================================
    const teacherModal = document.getElementById("teacherModal");
    const tCedula = document.getElementById("tCedula");
    const tNombre = document.getElementById("tNombre");
    const tCorreo = document.getElementById("tCorreo");
    const groupPicker = document.getElementById("groupPicker");

    gruposCatalogo.forEach(codigo => {
        const wrap = document.createElement("div");
        const inputId = `grp_${codigo}`;
        wrap.innerHTML = `<input type="checkbox" class="group-check" id="${inputId}" value="${codigo}" /><label for="${inputId}">${grupoLabel(codigo)}</label>`;
        groupPicker.appendChild(wrap.firstElementChild);
        groupPicker.appendChild(wrap.lastElementChild);
    });

    function getGroupCheckboxes() { return Array.from(groupPicker.querySelectorAll(".group-check")); }

    function updateGroupLimit() {
        const checked = getGroupCheckboxes().filter(c => c.checked);
        getGroupCheckboxes().forEach(c => { c.disabled = !c.checked && checked.length >= MAX_GRUPOS; });
    }

    groupPicker.addEventListener("change", updateGroupLimit);

    function openTeacherModal(id) {
        editingId = id || null;
        document.getElementById("teacherModalTitle").textContent = id ? "Editar Docente" : "Nuevo Docente";
        getGroupCheckboxes().forEach(c => { c.checked = false; c.disabled = false; });

        if (id) {
            const u = usersData.find(x => x.id === id);
            tCedula.value = u.cedula; tNombre.value = u.nombre; tCorreo.value = u.correo;
            u.grupos.forEach(codigo => {
                const cb = groupPicker.querySelector(`.group-check[value="${codigo}"]`);
                if (cb) cb.checked = true;
            });
        } else {
            tCedula.value = ""; tNombre.value = ""; tCorreo.value = "";
        }
        updateGroupLimit();
        teacherModal.classList.add("is-open");
    }

    function closeTeacherModal() { teacherModal.classList.remove("is-open"); editingId = null; }

    document.getElementById("teacherModalCloseBtn").addEventListener("click", closeTeacherModal);
    document.getElementById("teacherModalCancelBtn").addEventListener("click", closeTeacherModal);
    teacherModal.addEventListener("click", e => { if (e.target === teacherModal) closeTeacherModal(); });

    document.getElementById("teacherModalSaveBtn").addEventListener("click", () => {
        const gruposSeleccionados = getGroupCheckboxes().filter(c => c.checked).map(c => c.value);
        if (!tCedula.value.trim() || !tNombre.value.trim() || !tCorreo.value.trim()) {
            alert("Por favor complete cédula, nombre y correo."); return;
        }
        if (gruposSeleccionados.length === 0) {
            alert("Debe asignar al menos un grupo al docente (máximo 3)."); return;
        }

        // ---- Validar cédula duplicada ----
        if (cedulaExiste(tCedula.value, editingId)) {
            showToast("El usuario ya existe", "error");
            return;
        }

        const esEdicion = !!editingId;

        if (editingId) {
            const u = usersData.find(x => x.id === editingId);
            Object.assign(u, {
                cedula: tCedula.value.trim(), nombre: tNombre.value.trim(), correo: tCorreo.value.trim(),
                grupos: gruposSeleccionados,
            });
        } else {
            const newId = Math.max(0, ...usersData.map(u => u.id)) + 1;
            usersData.push({
                id: newId, rol: "docente",
                cedula: tCedula.value.trim(), nombre: tNombre.value.trim(), correo: tCorreo.value.trim(),
                grupos: gruposSeleccionados,
                activo: true, // todo registro nuevo entra como Activo por defecto
            });
        }
        closeTeacherModal();
        if (currentRole !== "docente") switchRole("docente"); else render();
        showToast(esEdicion ? "Docente editado correctamente" : "Docente registrado correctamente", "success");
        // TODO: reemplazar por llamada real al controlador (POST/PUT)
    });

    // =========================================================
    // MODAL PERSONAL ADMINISTRATIVO
    // =========================================================
    const adminModal = document.getElementById("adminModal");
    const aCedula = document.getElementById("aCedula");
    const aNombre = document.getElementById("aNombre");
    const aCorreo = document.getElementById("aCorreo");

    function openAdminModal(id) {
        editingId = id || null;
        document.getElementById("adminModalTitle").textContent = id ? "Editar Personal Administrativo" : "Nuevo Personal Administrativo";
        if (id) {
            const u = usersData.find(x => x.id === id);
            aCedula.value = u.cedula; aNombre.value = u.nombre; aCorreo.value = u.correo;
        } else {
            aCedula.value = ""; aNombre.value = ""; aCorreo.value = "";
        }
        adminModal.classList.add("is-open");
    }

    function closeAdminModal() { adminModal.classList.remove("is-open"); editingId = null; }

    document.getElementById("adminModalCloseBtn").addEventListener("click", closeAdminModal);
    document.getElementById("adminModalCancelBtn").addEventListener("click", closeAdminModal);
    adminModal.addEventListener("click", e => { if (e.target === adminModal) closeAdminModal(); });

    document.getElementById("adminModalSaveBtn").addEventListener("click", () => {
        if (!aCedula.value.trim() || !aNombre.value.trim() || !aCorreo.value.trim()) {
            alert("Por favor complete cédula, nombre y correo."); return;
        }

        // ---- Validar cédula duplicada ----
        if (cedulaExiste(aCedula.value, editingId)) {
            showToast("El usuario ya existe", "error");
            return;
        }

        const esEdicion = !!editingId;

        if (editingId) {
            const u = usersData.find(x => x.id === editingId);
            Object.assign(u, {
                cedula: aCedula.value.trim(), nombre: aNombre.value.trim(), correo: aCorreo.value.trim(),
            });
        } else {
            const newId = Math.max(0, ...usersData.map(u => u.id)) + 1;
            usersData.push({
                id: newId, rol: "admin",
                cedula: aCedula.value.trim(), nombre: aNombre.value.trim(), correo: aCorreo.value.trim(),
                activo: true, // todo registro nuevo entra como Activo por defecto
            });
        }
        closeAdminModal();
        if (currentRole !== "admin") switchRole("admin"); else render();
        showToast(esEdicion ? "Personal administrativo editado correctamente" : "Personal administrativo registrado correctamente", "success");
        // TODO: reemplazar por llamada real al controlador (POST/PUT)
    });

    // =========================================================
    // MODAL VER DETALLE
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const detailModalHead = document.getElementById("detailModalHead");
    const detailModalIcon = document.getElementById("detailModalIcon");
    const detailModalTitle = document.getElementById("detailModalTitle");
    const detailModalSubtitle = document.getElementById("detailModalSubtitle");
    const detailModalBody = document.getElementById("detailModalBody");

    const iconsByRole = {
        docente: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="8" r="3.2" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>',
        admin: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 11h18M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>',
    };

    function detailRow(label, value) {
        return `<div class="detail-row"><span class="d-label">${label}</span><span class="d-value">${value}</span></div>`;
    }

    function openDetailModal(id) {
        const u = usersData.find(x => x.id === id);
        if (!u) return;

        detailModalHead.className = `modal-card__head head-${u.rol}`;
        detailModalIcon.innerHTML = iconsByRole[u.rol];
        detailModalTitle.textContent = u.nombre;
        detailModalSubtitle.textContent = rolLabelByRole[u.rol];

        let rows = [detailRow("Cédula", u.cedula), detailRow("Correo", u.correo)];

        if (u.rol === "docente") {
            rows.push(detailRow("Grupos asignados", u.grupos.map(grupoLabel).join(", ")));
        }

        rows.push(detailRow("Estado", u.activo ? "Activo" : "Inactivo"));

        detailModalBody.innerHTML = rows.join("");
        detailModal.classList.add("is-open");
    }

    function closeDetailModal() { detailModal.classList.remove("is-open"); }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL — siempre solo la categoría de la pestaña
    // activa, nunca mezclada con las otras (archivo y hoja separados
    // por rol, con encabezado de color, bordes y anchos ajustados).
    // =========================================================

    const EXPORT_CONFIG = {
        docente: {
            sheetTitle: "Escuela El Valle · Reporte de Docentes",
            fileName: "docentes",
            headers: ["Nombre", "Cédula", "Correo electrónico", "Grupos asignados", "Estado"],
            widths: [26, 16, 30, 34, 12],
            rowOf(u) {
                return [u.nombre, u.cedula, u.correo, u.grupos.map(grupoLabel).join(", "), u.activo ? "Activo" : "Inactivo"];
            },
        },
        admin: {
            sheetTitle: "Escuela El Valle · Reporte de Personal Administrativo",
            fileName: "personal_administrativo",
            headers: ["Nombre", "Cédula", "Correo electrónico", "Estado"],
            widths: [26, 16, 30, 12],
            rowOf(u) {
                return [u.nombre, u.cedula, u.correo, u.activo ? "Activo" : "Inactivo"];
            },
        },
        inactivo: {
            sheetTitle: "Escuela El Valle · Reporte de Usuarios Inactivos",
            fileName: "usuarios_inactivos",
            headers: ["Nombre", "Cédula", "Rol", "Correo electrónico", "Estado"],
            widths: [26, 16, 22, 30, 12],
            rowOf(u) {
                return [u.nombre, u.cedula, rolLabelByRole[u.rol], u.correo, "Inactivo"];
            },
        },
    };

    document.getElementById("btnExport").addEventListener("click", async () => {
        const config = EXPORT_CONFIG[currentRole];
        const list = getFiltered();
        if (list.length === 0) { alert(`No hay ${roleMeta[currentRole].plural.toLowerCase()} para exportar con los filtros actuales.`); return; }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Escuela El Valle";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(config.sheetTitle.slice(0, 31), {
            views: [{ state: "frozen", ySplit: 4 }],
        });

        // ---- Título del reporte ----
        const lastCol = String.fromCharCode(64 + config.headers.length); // A, B, C... según nº de columnas
        sheet.mergeCells(`A1:${lastCol}1`);
        const titleCell = sheet.getCell("A1");
        titleCell.value = config.sheetTitle;
        titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
        titleCell.alignment = { vertical: "middle", horizontal: "left" };
        sheet.getRow(1).height = 30;
        sheet.getRow(1).eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF142347" } }; });

        sheet.mergeCells(`A2:${lastCol}2`);
        const subtitleCell = sheet.getCell("A2");
        subtitleCell.value = `Generado el ${new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })} · ${list.length} registro(s)`;
        subtitleCell.font = { size: 10.5, italic: true, color: { argb: "FF4A5468" } };
        sheet.getRow(2).height = 20;

        sheet.getRow(3).height = 6; // espacio

        // ---- Encabezados ----
        const headerRow = sheet.getRow(4);
        headerRow.values = config.headers;
        headerRow.height = 24;
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F6FED" } };
            cell.alignment = { vertical: "middle", horizontal: "left" };
            cell.border = {
                top: { style: "thin", color: { argb: "FFDDDDDD" } },
                bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            };
        });

        // ---- Filas de datos ----
        list.forEach(u => {
            const row = sheet.addRow(config.rowOf(u));
            row.height = 20;

            const estadoColIndex = config.headers.length; // Estado siempre es la última columna
            row.eachCell((cell, colNumber) => {
                cell.border = { bottom: { style: "hair", color: { argb: "FFE7EAF3" } } };
                cell.alignment = { vertical: "middle" };
                if (colNumber === estadoColIndex) {
                    cell.font = { bold: true, color: { argb: u.activo ? "FF1A9D5B" : "FF8792A6" } };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: u.activo ? "FFD7F5E3" : "FFF1EEF4" } };
                }
            });
        });

        // ---- Autofiltro y anchos de columna ----
        sheet.autoFilter = { from: "A4", to: `${lastCol}4` };
        sheet.columns.forEach((col, i) => { col.width = config.widths[i] || 18; });

        // ---- Generar y descargar (un archivo por categoría, nunca mezclado) ----
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, `${config.fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    // ---- Inicial ----
    refreshSubFilterOptions();
    btnRegistrarLabel.textContent = `Registrar ${roleMeta[currentRole].singular}`;
    btnExportLabel.textContent = `Exportar ${roleMeta[currentRole].plural.toLowerCase()}`;
    render();
})();
