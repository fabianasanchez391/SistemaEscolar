(function () {
    "use strict";

    // ---- Catálogo de grupos (para la asignación de docentes) ----
    const GRADOS = ["Kínder", "1°", "2°", "3°", "4°", "5°", "6°"];
    const SECCIONES = ["A", "B"];
    const gruposCatalogo = [];
    GRADOS.forEach(g => SECCIONES.forEach(s => gruposCatalogo.push(`${g}${s}`)));
    const MAX_GRUPOS = 3;

    // Cantidad de usuarios por página (igual que en el módulo de asistencia)
    const USUARIOS_POR_PAGINA = 6;

    function grupoLabel(codigo) {
        const letra = codigo.slice(-1);
        const grado = codigo.slice(0, -1);
        return `${grado} - Grupo ${letra}`;
    }

    // ---- Utilidades de DOM (las plantillas viven en el .cshtml) ----
    // Clona el primer elemento de un <template>.
    function clonar(idTemplate) {
        return document.getElementById(idTemplate).content.firstElementChild.cloneNode(true);
    }

    // Busca dentro de una plantilla clonada el elemento marcado con data-ref="nombre".
    function ref(raiz, nombre) {
        return raiz.querySelector(`[data-ref="${nombre}"]`);
    }

    // Muestra u oculta un elemento mediante la clase .is-hidden (definida en el CSS).
    function mostrar(el, visible) {
        el.classList.toggle("is-hidden", !visible);
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
    let currentSearch = "";
    let editingId = null;
    let paginaActual = 1;

    // ---- Referencias DOM ----
    const tbody = document.getElementById("usersTableBody");
    const emptyState = document.getElementById("emptyState");
    const searchInput = document.getElementById("searchInput");
    const roleStatsRow = document.getElementById("roleStatsRow");
    const registrarGroup = document.getElementById("registrarGroup");
    const btnExportLabel = document.getElementById("btnExportLabel");
    const usersResultsCount = document.getElementById("usersResultsCount");
    const usersPagination = document.getElementById("usersPagination");
    const tableHeadCells = document.querySelectorAll(".users-table thead [data-col]");

    const rolLabelByRole = { docente: "Docente", admin: "Personal administrativo" };
    const rolBadgeClassByRole = { docente: "role-badge--docente", admin: "role-badge--admin" };

    // ---- Mensaje de confirmación centrado (éxito / error), desaparece solo a los 3s ----
    const confirmOverlay = document.getElementById("confirmOverlay");
    const confirmBox = document.getElementById("confirmBox");
    const confirmMsg = document.getElementById("confirmMsg");
    const confirmIconCheck = document.getElementById("confirmIconCheck");
    const confirmIconX = document.getElementById("confirmIconX");
    let confirmTimer;

    function showToast(message, type) {
        const esError = type === "error";

        confirmBox.classList.toggle("confirm-box--error", esError);
        confirmBox.classList.toggle("confirm-box--success", !esError);

        // Ícono de check (éxito) o X (error)
        mostrar(confirmIconCheck, !esError);
        mostrar(confirmIconX, esError);

        confirmMsg.textContent = message;
        confirmOverlay.classList.add("is-visible");

        clearTimeout(confirmTimer);
        confirmTimer = setTimeout(() => confirmOverlay.classList.remove("is-visible"), 3000);
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

    // ---- Columnas visibles por pestaña (las columnas existen en el .cshtml con data-col) ----
    const COLUMNAS = {
        docente: ["nombre", "cedula", "correo", "grupos", "estado", "acciones"],
        admin: ["nombre", "cedula", "correo", "estado", "acciones"],
        inactivo: ["nombre", "cedula", "rol", "correo", "estado", "acciones"],
    };

    function aplicarColumnasEncabezado() {
        const visibles = COLUMNAS[currentRole];
        tableHeadCells.forEach(th => mostrar(th, visibles.includes(th.dataset.col)));
    }

    // ---- Fila de la tabla ----
    function crearFilaUsuario(u) {
        const fila = clonar("tplUsuarioRow");

        // Solo se muestran las columnas que corresponden a la pestaña actual
        const visibles = COLUMNAS[currentRole];
        fila.querySelectorAll("[data-col]").forEach(td => mostrar(td, visibles.includes(td.dataset.col)));

        const avatar = ref(fila, "avatar");
        avatar.classList.add(`avatar--${u.rol}`);
        avatar.textContent = initials(u.nombre);

        ref(fila, "nombre").textContent = u.nombre;
        ref(fila, "cedula").textContent = u.cedula;
        ref(fila, "correo").textContent = u.correo;

        const rolEl = ref(fila, "rol");
        rolEl.classList.add(rolBadgeClassByRole[u.rol]);
        rolEl.textContent = rolLabelByRole[u.rol];

        ref(fila, "grupos").replaceChildren(...(u.grupos || []).map(g => {
            const tag = clonar("tplGrupoTag");
            tag.textContent = grupoLabel(g);
            return tag;
        }));

        const estado = ref(fila, "estado");
        estado.classList.add(u.activo ? "status-pill--activo" : "status-pill--inactivo");
        estado.textContent = u.activo ? "Activo" : "Inactivo";
        estado.addEventListener("click", () => toggleStatus(u.id));

        // Sin botón de eliminar: solo editar y ver detalle.
        ref(fila, "editBtn").addEventListener("click", () => openEditModal(u.id));
        ref(fila, "viewBtn").addEventListener("click", () => openDetailModal(u.id));

        return fila;
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

            const matchSearch = !q ||
                u.nombre.toLowerCase().includes(q) ||
                u.cedula.toLowerCase().includes(q) ||
                (u.correo || "").toLowerCase().includes(q);

            return matchSearch;
        });
    }

    // ---- Paginación compacta: 1 … 4 5 6 … 12 (no se desborda en móvil) ----
    function paginasVisibles(actual, total) {
        const set = new Set([1, total, actual - 1, actual, actual + 1]);
        const pages = [...set].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
        const out = [];
        pages.forEach((p, i) => {
            if (i && p - pages[i - 1] > 1) out.push("…");
            out.push(p);
        });
        return out;
    }

    function crearBotonPagina(texto, opciones) {
        const btn = clonar("tplPgBtn");
        btn.textContent = texto;
        btn.classList.toggle("is-active", !!opciones.activo);
        btn.disabled = !!opciones.deshabilitado;
        btn.addEventListener("click", opciones.alClic);
        return btn;
    }

    function renderPaginacion(totalPaginas) {
        const nodos = [];

        nodos.push(crearBotonPagina("‹", {
            deshabilitado: paginaActual === 1,
            alClic: () => { if (paginaActual > 1) { paginaActual--; render(); } },
        }));

        paginasVisibles(paginaActual, totalPaginas).forEach(p => {
            if (p === "…") {
                nodos.push(clonar("tplPgDots"));
            } else {
                nodos.push(crearBotonPagina(String(p), {
                    activo: p === paginaActual,
                    alClic: () => { paginaActual = p; render(); },
                }));
            }
        });

        nodos.push(crearBotonPagina("›", {
            deshabilitado: paginaActual === totalPaginas,
            alClic: () => { if (paginaActual < totalPaginas) { paginaActual++; render(); } },
        }));

        usersPagination.replaceChildren(...nodos);
    }

    // ---- Render tabla ----
    function render() {
        updateStats();
        aplicarColumnasEncabezado();

        const listCompleta = getFiltered();

        // Si la página actual quedó fuera de rango (por ejemplo, al inactivar al
        // último usuario de la última página), se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(listCompleta.length / USUARIOS_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * USUARIOS_POR_PAGINA;
        const listPagina = listCompleta.slice(inicio, inicio + USUARIOS_POR_PAGINA);

        tbody.replaceChildren(...listPagina.map(crearFilaUsuario));
        emptyState.classList.toggle("is-visible", listCompleta.length === 0);
        usersResultsCount.textContent = `Mostrando ${listPagina.length} de ${listCompleta.length} usuarios`;

        renderPaginacion(totalPaginas);
    }

    // El estado se puede activar/desactivar desde la tabla, pero nunca eliminar el registro.
    // Al cambiar el estado, el usuario deja de cumplir el filtro de la pestaña actual
    // (activo -> deja de aparecer en su rol y pasa a "Inactivos"; inactivo -> reactivado,
    // vuelve a la pestaña de su rol), así que basta con volver a renderizar.
    function toggleStatus(id) {
        const u = usersData.find(x => x.id === id);
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
        paginaActual = 1;
        searchInput.value = "";
        document.querySelectorAll(".role-stat-card").forEach(c => c.classList.toggle("is-active", c.dataset.role === rol));

        // En "Inactivos" no tiene sentido "Registrar", ya que no se crean usuarios inactivos.
        mostrar(registrarGroup, rol !== "inactivo");
        btnExportLabel.textContent = `Exportar ${roleMeta[rol].plural.toLowerCase()}`;

        render();
    }

    // ---- Tarjetas de resumen actúan como pestañas ----
    roleStatsRow.addEventListener("click", e => {
        const card = e.target.closest(".role-stat-card");
        if (!card) return;
        switchRole(card.dataset.role);
    });

    // ---- Filtros: barra sobre la tabla ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        currentSearch = searchInput.value;
        paginaActual = 1;
        render();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        currentSearch = "";
        paginaActual = 1;
        searchInput.value = "";
        render();
    });

    let searchTimer;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentSearch = searchInput.value; paginaActual = 1; render(); }, 200);
    });

    // =========================================================
    // BOTONES "Registrar docente" / "Registrar personal administrativo"
    // (barra de acciones; se ocultan en la pestaña Inactivos)
    // =========================================================
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
        const opcion = clonar("tplGrupoOption");
        const inputId = `grp_${codigo}`;

        const input = ref(opcion, "input");
        input.id = inputId;
        input.value = codigo;

        const label = ref(opcion, "label");
        label.htmlFor = inputId;
        label.textContent = grupoLabel(codigo);

        groupPicker.appendChild(opcion);
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
    const detailIconDocente = document.getElementById("detailIconDocente");
    const detailIconAdmin = document.getElementById("detailIconAdmin");
    const detailModalTitle = document.getElementById("detailModalTitle");
    const detailModalSubtitle = document.getElementById("detailModalSubtitle");
    const detailModalBody = document.getElementById("detailModalBody");

    function crearFilaDetalle(label, value) {
        const fila = clonar("tplDetalleRow");
        ref(fila, "label").textContent = label;
        ref(fila, "value").textContent = value;
        return fila;
    }

    function openDetailModal(id) {
        const u = usersData.find(x => x.id === id);
        if (!u) return;

        detailModalHead.className = `modal-card__head head-${u.rol}`;
        mostrar(detailIconDocente, u.rol === "docente");
        mostrar(detailIconAdmin, u.rol === "admin");
        detailModalTitle.textContent = u.nombre;
        detailModalSubtitle.textContent = rolLabelByRole[u.rol];

        const filas = [["Cédula", u.cedula], ["Correo", u.correo]];

        if (u.rol === "docente") {
            filas.push(["Grupos asignados", u.grupos.map(grupoLabel).join(", ")]);
        }

        filas.push(["Estado", u.activo ? "Activo" : "Inactivo"]);

        detailModalBody.replaceChildren(...filas.map(([label, value]) => crearFilaDetalle(label, value)));
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
    // Exporta TODOS los usuarios filtrados, no solo los de la página visible.
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
    btnExportLabel.textContent = `Exportar ${roleMeta[currentRole].plural.toLowerCase()}`;
    render();
})();