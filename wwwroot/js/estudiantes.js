
(function () {
    "use strict";

    // ---- Catálogos ----
    const GRADOS = ["Kínder", "1°", "2°", "3°", "4°", "5°", "6°"];
    const LETRAS = ["A", "B", "C"];

    // Colores que rotan entre las tarjetas de sección.
    const SECTION_COLORS = [
        { name: "violeta", from: "#8b7cf6", to: "#5b4bd6" },
        { name: "coral", from: "#ff8a7a", to: "#ef5b4e" },
        { name: "teal", from: "#2dd4bf", to: "#0f9c8f" },
        { name: "azul", from: "#4c86f5", to: "#2f6fed" },
        { name: "ambar", from: "#ffb84c", to: "#f5910b" },
    ];

    // Docentes disponibles para asignar a una sección (vienen del módulo de usuarios).
    const docentesCatalogo = [
        { id: 1, nombre: "Fabiana Arias" },
        { id: 2, nombre: "Luis Vargas" },
        { id: 4, nombre: "Ricardo Fallas" },
    ];

    // ---- Datos de ejemplo ----
    let seccionesData = [
        { id: 1, grado: "5°", letra: "A", docenteId: 1 },
        { id: 2, grado: "4°", letra: "A", docenteId: 2 },
        { id: 3, grado: "1°", letra: "B", docenteId: null },
    ];

    let estudiantesData = [
        { id: 1, seccionId: 1, cedula: "1-0987-1234", nombre: "Carlos Jiménez", encargado: "Ana Jiménez", telefono: "8855-6677", activo: true },
        { id: 2, seccionId: 1, cedula: "1-0654-4567", nombre: "Valentina Méndez", encargado: "Karla Méndez", telefono: "8888-9900", activo: true },
        { id: 3, seccionId: 2, cedula: "1-0876-2345", nombre: "María Rodríguez", encargado: "Jorge Rodríguez", telefono: "8866-7788", activo: true },
        { id: 4, seccionId: 2, cedula: "1-0765-3456", nombre: "Diego Rojas", encargado: "Paola Solano", telefono: "8877-8899", activo: false },
    ];

    // ---- Estado de la vista ----
    let currentView = "secciones";   // "secciones" | "estudiantes"
    let currentSeccionId = null;     // null = estudiantes de todas las secciones
    let currentSearch = "";
    let currentGrado = "todos";
    let currentEstado = "todos";
    let editingSeccionId = null;
    let editingEstudianteId = null;

    // ---- Referencias DOM ----
    const statsRow = document.getElementById("statsRow");
    const seccionesView = document.getElementById("seccionesView");
    const estudiantesView = document.getElementById("estudiantesView");
    const seccionesGrid = document.getElementById("seccionesGrid");
    const seccionesEmpty = document.getElementById("seccionesEmpty");
    const theadEl = document.getElementById("estudiantesTableHead");
    const tbody = document.getElementById("estudiantesTableBody");
    const estudiantesEmpty = document.getElementById("estudiantesEmpty");
    const resultsCount = document.getElementById("resultsCount");
    const searchInput = document.getElementById("searchInput");
    const gradoFilter = document.getElementById("gradoFilter");
    const gradoFilterGroup = document.getElementById("gradoFilterGroup");
    const estadoFilter = document.getElementById("estadoFilter");
    const estadoFilterGroup = document.getElementById("estadoFilterGroup");
    const btnEditarSeccion = document.getElementById("btnEditarSeccion");
    const viewBadge = document.getElementById("viewBadge");
    const viewTitulo = document.getElementById("viewTitulo");
    const viewSubtitulo = document.getElementById("viewSubtitulo");

    // ---- Toast de confirmación ----
    const successToast = document.getElementById("successToast");
    const successToastText = document.getElementById("successToastText");
    let toastTimer;

    function showSuccessToast(message) {
        clearTimeout(toastTimer);
        successToastText.textContent = message;
        successToast.classList.add("is-open");
        toastTimer = setTimeout(() => successToast.classList.remove("is-open"), 1800);
    }

    // ---- Helpers ----
    function seccionLabel(s) { return `${s.grado} - Grupo ${s.letra}`; }
    function seccionCodigo(s) { return `${s.grado}${s.letra}`; }

    function docenteNombre(docenteId) {
        const d = docentesCatalogo.find(x => x.id === docenteId);
        return d ? d.nombre : "Sin asignar";
    }

    function seccionById(id) { return seccionesData.find(s => s.id === id); }

    function estudiantesDeSeccion(seccionId) {
        return estudiantesData.filter(e => e.seccionId === seccionId);
    }

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    function ordenarSecciones(list) {
        return list.slice().sort((a, b) =>
            GRADOS.indexOf(a.grado) - GRADOS.indexOf(b.grado) || a.letra.localeCompare(b.letra));
    }

    // ---- Estadísticas ----
    function updateStats() {
        document.getElementById("statSecciones").textContent = seccionesData.length;
        document.getElementById("statEstudiantes").textContent = estudiantesData.filter(e => e.activo).length;
        document.getElementById("statInactivos").textContent = estudiantesData.filter(e => !e.activo).length;
    }

    // Marca cuál tarjeta está activa. Dentro de una sección concreta
    // no se resalta ninguna, porque no corresponde a ningún resumen.
    function updateStatsActive() {
        let activa = null;
        if (currentView === "secciones") activa = "secciones";
        else if (currentSeccionId === null && (currentEstado === "activo" || currentEstado === "inactivo")) activa = currentEstado;

        statsRow.querySelectorAll(".role-stat-card").forEach(c => {
            c.classList.toggle("is-active", c.dataset.stat === activa);
        });
    }

    // =========================================================
    // VISTA 1: LISTA DE SECCIONES
    // =========================================================
    function getSeccionesFiltradas() {
        const q = currentSearch.trim().toLowerCase();
        return ordenarSecciones(seccionesData.filter(s => {
            const matchGrado = currentGrado === "todos" || s.grado === currentGrado;
            const matchSearch = !q ||
                seccionLabel(s).toLowerCase().includes(q) ||
                seccionCodigo(s).toLowerCase().includes(q) ||
                docenteNombre(s.docenteId).toLowerCase().includes(q);
            return matchGrado && matchSearch;
        }));
    }

    function seccionCardHtml(s, index) {
        const est = estudiantesDeSeccion(s.id);
        const activos = est.filter(e => e.activo).length;
        const total = est.length;
        const porcentajeActivos = total === 0 ? 0 : Math.round((activos / total) * 100);
        const color = SECTION_COLORS[index % SECTION_COLORS.length];

        return `
            <article class="section-card" data-id="${s.id}" style="--card-from:${color.from}; --card-to:${color.to};">
                <button class="section-card__edit edit-section-btn" data-id="${s.id}" title="Editar sección" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <div class="section-card__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M22 9 12 5 2 9l10 4 10-4Z" /><path d="M6 11v4c0 1.5 2.7 3.5 6 3.5s6-2 6-3.5v-4" /></svg>
                </div>
                <h3 class="section-card__title">${seccionLabel(s)}</h3>
                <div class="section-card__docente">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.2" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>
                    ${docenteNombre(s.docenteId)}
                </div>
                <div class="section-card__progress">
                    <div class="section-card__progress-fill" style="width:${porcentajeActivos}%;"></div>
                </div>
                <div class="section-card__footer">
                    <span class="section-card__count">${total} estudiante(s)</span>
                    <span class="section-card__pill">${activos} activo(s)</span>
                </div>
            </article>`;
    }

    function renderSecciones() {
        const list = getSeccionesFiltradas();
        seccionesGrid.innerHTML = list.map((s, i) => seccionCardHtml(s, i)).join("");
        seccionesEmpty.style.display = list.length === 0 ? "block" : "none";
        seccionesEmpty.querySelector("div").textContent = seccionesData.length === 0
            ? "Todavía no hay secciones. Cree la primera para empezar a registrar estudiantes."
            : "No se encontraron secciones con los filtros seleccionados.";

        // Toda la tarjeta abre la sección; el lápiz (con stopPropagation) abre editar.
        seccionesGrid.querySelectorAll(".section-card").forEach(card => {
            card.addEventListener("click", () => abrirSeccion(parseInt(card.dataset.id, 10)));
        });
        seccionesGrid.querySelectorAll(".edit-section-btn").forEach(btn => {
            btn.addEventListener("click", e => { e.stopPropagation(); openSectionModal(parseInt(btn.dataset.id, 10)); });
        });
    }

    // =========================================================
    // VISTA 2: ESTUDIANTES (de una sección o de todas)
    // =========================================================
    function getEstudiantesFiltrados() {
        const q = currentSearch.trim().toLowerCase();

        // Dentro de una sección concreta solo se listan ACTIVOS: los inactivos
        // se consultan desde la tarjeta "Estudiantes inactivos" (vista global).
        const base = currentSeccionId === null
            ? estudiantesData
            : estudiantesDeSeccion(currentSeccionId).filter(e => e.activo);

        return base.filter(e => {
            const matchEstado = currentSeccionId !== null || currentEstado === "todos" ||
                (currentEstado === "activo" && e.activo) ||
                (currentEstado === "inactivo" && !e.activo);
            const matchSearch = !q ||
                e.nombre.toLowerCase().includes(q) ||
                e.cedula.toLowerCase().includes(q);
            return matchEstado && matchSearch;
        });
    }

    function renderHead() {
        const headers = ["Nombre", "Cédula", "Padre o encargado", "Celular"];
        if (currentSeccionId === null) headers.push("Sección");
        headers.push("Estado", "Acciones");
        theadEl.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    }

    function estudianteRowHtml(e) {
        const s = seccionById(e.seccionId);
        const seccionCell = currentSeccionId === null
            ? `<td><span class="section-tag">${s ? seccionLabel(s) : "Sin sección"}</span></td>`
            : "";
        return `
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${initials(e.nombre)}</div>
                    <span class="user-cell__name">${e.nombre}</span>
                </div>
            </td>
            <td>${e.cedula}</td>
            <td>${e.encargado}</td>
            <td>${e.telefono}</td>
            ${seccionCell}
            <td>
                <button class="status-pill ${e.activo ? "status-pill--activo" : "status-pill--inactivo"}" data-id="${e.id}" type="button">
                    ${e.activo ? "Activo" : "Inactivo"}
                </button>
            </td>
            <td>
                <div class="row-actions">
                    <button class="row-action-btn edit-btn" data-id="${e.id}" title="Editar" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                    <button class="row-action-btn view-btn" data-id="${e.id}" title="Ver información" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>
            </td>`;
    }

    // Encabezado de la vista: solo existe cuando se abrió una sección concreta.
    // En la vista global (activos/inactivos de todas las secciones) no se muestra
    // "Volver a secciones" ni la tarjeta de encabezado.
    function renderViewHeader() {
        const backLink = document.getElementById("btnVolverSecciones");
        const sectionHeader = document.querySelector(".section-header");

        // El filtro de Estado solo tiene sentido en la vista global (todos los
        // estudiantes); dentro de una sección siempre se ven solo los activos.
        estadoFilterGroup.style.display = currentSeccionId === null ? "" : "none";

        if (currentSeccionId !== null) {
            backLink.style.display = "";
            sectionHeader.style.display = "";

            const s = seccionById(currentSeccionId);
            viewBadge.textContent = seccionCodigo(s);
            viewTitulo.textContent = seccionLabel(s);
            viewSubtitulo.textContent = `Docente a cargo: ${docenteNombre(s.docenteId)}`;
            btnEditarSeccion.style.display = "";
            return;
        }

        backLink.style.display = "none";
        sectionHeader.style.display = "none";
    }

    function renderEstudiantes() {
        // Si la sección abierta fue eliminada o no existe, volvemos a la grilla.
        if (currentSeccionId !== null && !seccionById(currentSeccionId)) { volverASecciones(); return; }

        renderViewHeader();
        renderHead();

        const list = getEstudiantesFiltrados();
        tbody.innerHTML = "";
        list.forEach(e => {
            const tr = document.createElement("tr");
            tr.innerHTML = estudianteRowHtml(e);
            tbody.appendChild(tr);
        });

        estudiantesEmpty.style.display = list.length === 0 ? "block" : "none";
        estudiantesEmpty.querySelector("div").textContent = currentSeccionId === null
            ? "No se encontraron estudiantes con los filtros seleccionados."
            : "Esta sección todavía no tiene estudiantes activos registrados.";

        const total = currentSeccionId === null
            ? estudiantesData.length
            : estudiantesDeSeccion(currentSeccionId).filter(e => e.activo).length;
        resultsCount.textContent = `Mostrando ${list.length} de ${total} estudiantes`;

        tbody.querySelectorAll(".status-pill").forEach(el => {
            el.addEventListener("click", () => toggleEstado(parseInt(el.dataset.id, 10)));
        });
        tbody.querySelectorAll(".edit-btn").forEach(el => {
            el.addEventListener("click", () => openStudentModal(parseInt(el.dataset.id, 10)));
        });
        tbody.querySelectorAll(".view-btn").forEach(el => {
            el.addEventListener("click", () => openDetailModal(parseInt(el.dataset.id, 10)));
        });
    }

    // El registro nunca se elimina: solo cambia de estado.
    // Si se desactiva a un estudiante viendo su sección, desaparece de la lista
    // de inmediato (ya que ahí solo se muestran activos).
    function toggleEstado(id) {
        const e = estudiantesData.find(x => x.id === id);
        if (!e) return;
        e.activo = !e.activo;
        showSuccessToast(e.activo ? "Estudiante activado correctamente" : "Estudiante desactivado correctamente");
        render(); // TODO: reemplazar por llamada real al controlador
    }

    // =========================================================
    // NAVEGACIÓN ENTRE VISTAS
    // =========================================================
    function render() {
        updateStats();
        updateStatsActive();
        if (currentView === "secciones") renderSecciones();
        else renderEstudiantes();
    }

    function aplicarVista() {
        const enEstudiantes = currentView === "estudiantes";
        seccionesView.style.display = enEstudiantes ? "none" : "";
        estudiantesView.style.display = enEstudiantes ? "" : "none";
        gradoFilterGroup.style.display = enEstudiantes ? "none" : "";
        // estadoFilterGroup se ajusta en renderViewHeader según si hay
        // sección abierta o es la vista global de estudiantes.
        estadoFilterGroup.style.display = enEstudiantes && currentSeccionId === null ? "" : "none";
        searchInput.placeholder = enEstudiantes
            ? "Buscar por nombre o cédula..."
            : "Buscar sección, docente o estudiante...";
    }

    function limpiarFiltros(estado) {
        currentSearch = "";
        currentGrado = "todos";
        currentEstado = estado || "todos";
        searchInput.value = "";
        gradoFilter.value = "todos";
        estadoFilter.value = currentEstado;
    }

    // Abre una sección concreta (siempre lista solo estudiantes activos)
    function abrirSeccion(id) {
        currentSeccionId = id;
        currentView = "estudiantes";
        limpiarFiltros("todos");
        aplicarVista();
        render();
    }

    // Abre la lista global de estudiantes con un estado ya filtrado
    function abrirTodosLosEstudiantes(estado) {
        currentSeccionId = null;
        currentView = "estudiantes";
        limpiarFiltros(estado);
        aplicarVista();
        render();
    }

    function volverASecciones() {
        currentView = "secciones";
        currentSeccionId = null;
        limpiarFiltros("todos");
        aplicarVista();
        render();
    }

    // ---- Tarjetas de resumen: cada una abre su vista ----
    function activarTarjeta(card) {
        const stat = card.dataset.stat;
        if (stat === "secciones") volverASecciones();
        else abrirTodosLosEstudiantes(stat); // "activo" | "inactivo"
    }

    statsRow.addEventListener("click", e => {
        const card = e.target.closest(".role-stat-card");
        if (card) activarTarjeta(card);
    });

    // Accesible también con teclado (las tarjetas tienen role="button" y tabindex)
    statsRow.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest(".role-stat-card");
        if (!card) return;
        e.preventDefault();
        activarTarjeta(card);
    });

    document.getElementById("btnVolverSecciones").addEventListener("click", volverASecciones);
    btnEditarSeccion.addEventListener("click", () => {
        if (currentSeccionId !== null) openSectionModal(currentSeccionId);
    });

    // ---- Filtros del panel lateral ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        currentSearch = searchInput.value;
        currentGrado = gradoFilter.value;
        currentEstado = estadoFilter.value;
        render();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        limpiarFiltros("todos");
        render();
    });

    estadoFilter.addEventListener("change", () => {
        currentEstado = estadoFilter.value;
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
    // MODAL SECCIÓN
    // =========================================================
    const sectionModal = document.getElementById("sectionModal");
    const secGrado = document.getElementById("secGrado");
    const secLetra = document.getElementById("secLetra");
    const secDocente = document.getElementById("secDocente");
    const secInfo = document.getElementById("secInfo");

    GRADOS.forEach(g => secGrado.add(new Option(g, g)));
    LETRAS.forEach(l => secLetra.add(new Option(`Grupo ${l}`, l)));

    function refreshDocenteOptions() {
        secDocente.innerHTML = "";
        secDocente.add(new Option("Sin asignar", ""));
        docentesCatalogo.forEach(d => secDocente.add(new Option(d.nombre, String(d.id))));
    }

    function updateSecInfo() {
        secInfo.textContent = `Se guardará la sección ${secGrado.value} - Grupo ${secLetra.value}.`;
    }
    secGrado.addEventListener("change", updateSecInfo);
    secLetra.addEventListener("change", updateSecInfo);

    function openSectionModal(id) {
        editingSeccionId = id || null;
        refreshDocenteOptions();
        document.getElementById("sectionModalTitle").textContent = id ? "Editar Sección" : "Nueva Sección";

        if (id) {
            const s = seccionById(id);
            secGrado.value = s.grado;
            secLetra.value = s.letra;
            secDocente.value = s.docenteId ? String(s.docenteId) : "";
        } else {
            secGrado.value = GRADOS[0];
            secLetra.value = LETRAS[0];
            secDocente.value = "";
        }
        updateSecInfo();
        sectionModal.classList.add("is-open");
    }

    function closeSectionModal() { sectionModal.classList.remove("is-open"); editingSeccionId = null; }

    document.getElementById("sectionModalCloseBtn").addEventListener("click", closeSectionModal);
    document.getElementById("sectionModalCancelBtn").addEventListener("click", closeSectionModal);
    sectionModal.addEventListener("click", e => { if (e.target === sectionModal) closeSectionModal(); });

    document.getElementById("sectionModalSaveBtn").addEventListener("click", () => {
        const grado = secGrado.value;
        const letra = secLetra.value;
        const docenteId = secDocente.value ? parseInt(secDocente.value, 10) : null;

        // No se permiten dos secciones con el mismo grado y grupo.
        const duplicada = seccionesData.some(s => s.grado === grado && s.letra === letra && s.id !== editingSeccionId);
        if (duplicada) {
            alert(`La sección ${grado} - Grupo ${letra} ya existe.`);
            return;
        }

        if (editingSeccionId) {
            Object.assign(seccionById(editingSeccionId), { grado, letra, docenteId });
            closeSectionModal();
            showSuccessToast("Sección editada correctamente");
            render();
        } else {
            const newId = Math.max(0, ...seccionesData.map(s => s.id)) + 1;
            seccionesData.push({ id: newId, grado, letra, docenteId });
            closeSectionModal();
            showSuccessToast("Sección creada correctamente");
            render();
        }
        // TODO: reemplazar por llamada real al controlador (POST/PUT)
    });

    document.getElementById("btnCrearSeccion").addEventListener("click", () => openSectionModal(null));
    document.getElementById("qaSeccion").addEventListener("click", () => openSectionModal(null));

    // =========================================================
    // MODAL ESTUDIANTE
    // =========================================================
    const studentModal = document.getElementById("studentModal");
    const eCedula = document.getElementById("eCedula");
    const eNombre = document.getElementById("eNombre");
    const eEncargado = document.getElementById("eEncargado");
    const eTelefono = document.getElementById("eTelefono");
    const eSeccion = document.getElementById("eSeccion");
    const eDocenteInfo = document.getElementById("eDocenteInfo");

    // El select de secciones se arma cada vez que se abre, para reflejar
    // las secciones creadas hasta ese momento.
    function refreshSeccionOptions() {
        eSeccion.innerHTML = "";
        ordenarSecciones(seccionesData).forEach(s => eSeccion.add(new Option(seccionLabel(s), String(s.id))));
    }

    function updateEstudianteInfo() {
        const s = seccionById(parseInt(eSeccion.value, 10));
        eDocenteInfo.textContent = s
            ? `Sección ${seccionLabel(s)} · Docente a cargo: ${docenteNombre(s.docenteId)}`
            : "Seleccione una sección para ver el docente a cargo.";
    }
    eSeccion.addEventListener("change", updateEstudianteInfo);

    function openStudentModal(id) {
        if (seccionesData.length === 0) {
            alert("Primero cree una sección: todo estudiante debe pertenecer a una.");
            return;
        }
        editingEstudianteId = id || null;
        refreshSeccionOptions();
        document.getElementById("studentModalTitle").textContent = id ? "Editar Estudiante" : "Nuevo Estudiante";

        if (id) {
            const e = estudiantesData.find(x => x.id === id);
            eCedula.value = e.cedula;
            eNombre.value = e.nombre;
            eEncargado.value = e.encargado;
            eTelefono.value = e.telefono;
            eSeccion.value = String(e.seccionId);
        } else {
            eCedula.value = ""; eNombre.value = ""; eEncargado.value = ""; eTelefono.value = "";
            eSeccion.value = String(currentSeccionId || ordenarSecciones(seccionesData)[0].id);
        }
        updateEstudianteInfo();
        studentModal.classList.add("is-open");
    }

    function closeStudentModal() { studentModal.classList.remove("is-open"); editingEstudianteId = null; }

    document.getElementById("studentModalCloseBtn").addEventListener("click", closeStudentModal);
    document.getElementById("studentModalCancelBtn").addEventListener("click", closeStudentModal);
    studentModal.addEventListener("click", e => { if (e.target === studentModal) closeStudentModal(); });

    document.getElementById("studentModalSaveBtn").addEventListener("click", () => {
        const cedula = eCedula.value.trim();
        const nombre = eNombre.value.trim();
        const encargado = eEncargado.value.trim();
        const telefono = eTelefono.value.trim();
        const seccionId = parseInt(eSeccion.value, 10);

        if (!cedula || !nombre || !encargado || !telefono) {
            alert("Por favor complete cédula, nombre, padre o encargado y celular.");
            return;
        }
        const cedulaRepetida = estudiantesData.some(e => e.cedula === cedula && e.id !== editingEstudianteId);
        if (cedulaRepetida) {
            alert("Ya existe un estudiante registrado con esa cédula.");
            return;
        }

        if (editingEstudianteId) {
            Object.assign(estudiantesData.find(x => x.id === editingEstudianteId),
                { cedula, nombre, encargado, telefono, seccionId });
            closeStudentModal();
            showSuccessToast("Estudiante editado correctamente");
            render();
        } else {
            const newId = Math.max(0, ...estudiantesData.map(e => e.id)) + 1;
            estudiantesData.push({
                id: newId, seccionId, cedula, nombre, encargado, telefono,
                activo: true, // todo registro nuevo entra como Activo por defecto
            });
            closeStudentModal();
            showSuccessToast("Estudiante registrado correctamente");
            // Nos llevamos al usuario a la sección donde quedó el estudiante.
            abrirSeccion(seccionId);
        }
        // TODO: reemplazar por llamada real al controlador (POST/PUT)
    });

    document.getElementById("btnRegistrarEstudiante").addEventListener("click", () => openStudentModal(null));
    document.getElementById("qaEstudiante").addEventListener("click", () => openStudentModal(null));

    // =========================================================
    // MODAL VER INFORMACIÓN
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const detailModalBody = document.getElementById("detailModalBody");

    function detailRow(label, value) {
        return `<div class="detail-row"><span class="d-label">${label}</span><span class="d-value">${value}</span></div>`;
    }

    function openDetailModal(id) {
        const e = estudiantesData.find(x => x.id === id);
        if (!e) return;
        const s = seccionById(e.seccionId);

        document.getElementById("detailModalTitle").textContent = e.nombre;
        document.getElementById("detailModalSubtitle").textContent = s ? seccionLabel(s) : "Sin sección";

        detailModalBody.innerHTML = [
            detailRow("Cédula", e.cedula),
            detailRow("Padre o encargado", e.encargado),
            detailRow("Celular", e.telefono),
            detailRow("Sección", s ? seccionLabel(s) : "Sin sección"),
            detailRow("Docente a cargo", s ? docenteNombre(s.docenteId) : "Sin asignar"),
            detailRow("Estado", e.activo ? "Activo" : "Inactivo"),
        ].join("");

        detailModal.classList.add("is-open");
    }

    function closeDetailModal() { detailModal.classList.remove("is-open"); }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL
    // =========================================================
    async function exportarExcel({ sheetTitle, fileName, headers, widths, rows, estadoDeFila }) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Escuela El Valle";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(sheetTitle.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
        const lastCol = String.fromCharCode(64 + headers.length);

        // ---- Título ----
        sheet.mergeCells(`A1:${lastCol}1`);
        const titleCell = sheet.getCell("A1");
        titleCell.value = sheetTitle;
        titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
        titleCell.alignment = { vertical: "middle", horizontal: "left" };
        sheet.getRow(1).height = 30;
        sheet.getRow(1).eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF142347" } }; });

        sheet.mergeCells(`A2:${lastCol}2`);
        const subtitleCell = sheet.getCell("A2");
        subtitleCell.value = `Generado el ${new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })} · ${rows.length} registro(s)`;
        subtitleCell.font = { size: 10.5, italic: true, color: { argb: "FF4A5468" } };
        sheet.getRow(2).height = 20;
        sheet.getRow(3).height = 6;

        // ---- Encabezados ----
        const headerRow = sheet.getRow(4);
        headerRow.values = headers;
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

        // ---- Filas ----
        rows.forEach((values, i) => {
            const row = sheet.addRow(values);
            row.height = 20;
            const estadoColIndex = headers.length;
            row.eachCell((cell, colNumber) => {
                cell.border = { bottom: { style: "hair", color: { argb: "FFE7EAF3" } } };
                cell.alignment = { vertical: "middle" };
                if (estadoDeFila && colNumber === estadoColIndex) {
                    const activo = estadoDeFila(i);
                    cell.font = { bold: true, color: { argb: activo ? "FF1A9D5B" : "FF8792A6" } };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: activo ? "FFD7F5E3" : "FFF1EEF4" } };
                }
            });
        });

        sheet.autoFilter = { from: "A4", to: `${lastCol}4` };
        sheet.columns.forEach((col, i) => { col.width = widths[i] || 18; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    document.getElementById("btnExportSecciones").addEventListener("click", () => {
        const list = getSeccionesFiltradas();
        if (list.length === 0) { alert("No hay secciones para exportar con los filtros actuales."); return; }
        exportarExcel({
            sheetTitle: "Escuela El Valle · Reporte de Secciones",
            fileName: "secciones",
            headers: ["Sección", "Grado", "Grupo", "Docente a cargo", "Estudiantes", "Activos"],
            widths: [18, 12, 10, 28, 14, 12],
            rows: list.map(s => {
                const est = estudiantesDeSeccion(s.id);
                return [seccionLabel(s), s.grado, s.letra, docenteNombre(s.docenteId), est.length, est.filter(e => e.activo).length];
            }),
        });
    });

    document.getElementById("btnExportEstudiantes").addEventListener("click", () => {
        const list = getEstudiantesFiltrados();
        if (list.length === 0) { alert("No hay estudiantes para exportar con los filtros actuales."); return; }

        const s = currentSeccionId !== null ? seccionById(currentSeccionId) : null;
        exportarExcel({
            sheetTitle: s ? `Escuela El Valle · ${seccionLabel(s)}` : "Escuela El Valle · Estudiantes",
            fileName: s ? `estudiantes_${seccionCodigo(s).replace(/[^\w]/g, "")}` : "estudiantes",
            headers: ["Nombre", "Cédula", "Padre o encargado", "Celular", "Sección", "Docente a cargo", "Estado"],
            widths: [26, 16, 26, 14, 18, 26, 12],
            rows: list.map(e => {
                const sec = seccionById(e.seccionId);
                return [
                    e.nombre, e.cedula, e.encargado, e.telefono,
                    sec ? seccionLabel(sec) : "Sin sección",
                    sec ? docenteNombre(sec.docenteId) : "Sin asignar",
                    e.activo ? "Activo" : "Inactivo",
                ];
            }),
            estadoDeFila: i => list[i].activo,
        });
    });

    // ---- Inicial ----
    GRADOS.forEach(g => gradoFilter.add(new Option(g, g)));
    aplicarVista();
    render();
})();