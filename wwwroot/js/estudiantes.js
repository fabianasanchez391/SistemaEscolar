(function () {
    "use strict";

    // ---- Catálogos ----
    const GRADOS = ["Kínder", "1°", "2°", "3°", "4°", "5°", "6°"];
    const LETRAS = ["A", "B", "C"];

    // Cantidad de colores que rotan entre las tarjetas de sección.
    // Los colores en sí viven en el CSS (clases .section-color--0 ... .section-color--4).
    const CANTIDAD_COLORES = 5;

    // Cantidad de estudiantes por página (igual que en el módulo de asistencia)
    const ESTUDIANTES_POR_PAGINA = 6;

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
    let paginaActual = 1;

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

    // ---- Referencias DOM ----
    const statsRow = document.getElementById("statsRow");
    const layoutEl = document.querySelector(".estudiantes-layout");
    const filtersBar = document.getElementById("filtersBar");
    const seccionesView = document.getElementById("seccionesView");
    const estudiantesView = document.getElementById("estudiantesView");
    const seccionesGrid = document.getElementById("seccionesGrid");
    const seccionesEmpty = document.getElementById("seccionesEmpty");
    const seccionesEmptyText = document.getElementById("seccionesEmptyText");
    const tbody = document.getElementById("estudiantesTableBody");
    const estudiantesEmpty = document.getElementById("estudiantesEmpty");
    const estudiantesEmptyText = document.getElementById("estudiantesEmptyText");
    const estudiantesResultsCount = document.getElementById("estudiantesResultsCount");
    const estudiantesPagination = document.getElementById("estudiantesPagination");
    const tableHeadCells = document.querySelectorAll(".users-table thead [data-col]");
    const searchInput = document.getElementById("searchInput");
    const gradoFilter = document.getElementById("gradoFilter");
    const gradoFilterGroup = document.getElementById("gradoFilterGroup");
    const estadoFilter = document.getElementById("estadoFilter");
    const estadoFilterGroup = document.getElementById("estadoFilterGroup");
    const btnEditarSeccion = document.getElementById("btnEditarSeccion");
    const btnVolverSecciones = document.getElementById("btnVolverSecciones");
    const sectionHeader = document.getElementById("sectionHeader");
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

    function crearSeccionCard(s, index) {
        const est = estudiantesDeSeccion(s.id);
        const activos = est.filter(e => e.activo).length;
        const total = est.length;
        const porcentajeActivos = total === 0 ? 0 : Math.round((activos / total) * 100);

        const card = clonar("tplSeccionCard");
        card.dataset.id = s.id;
        card.classList.add(`section-color--${index % CANTIDAD_COLORES}`);

        ref(card, "titulo").textContent = seccionLabel(s);
        ref(card, "docente").textContent = docenteNombre(s.docenteId);
        ref(card, "progreso").value = porcentajeActivos;
        ref(card, "total").textContent = `${total} estudiante(s)`;
        ref(card, "activos").textContent = `${activos} activo(s)`;

        // Toda la tarjeta abre la sección; el lápiz (con stopPropagation) abre editar.
        card.addEventListener("click", () => abrirSeccion(s.id));
        ref(card, "editBtn").addEventListener("click", e => {
            e.stopPropagation();
            openSectionModal(s.id);
        });

        return card;
    }

    function renderSecciones() {
        const list = getSeccionesFiltradas();
        seccionesGrid.replaceChildren(...list.map((s, i) => crearSeccionCard(s, i)));
        seccionesEmpty.classList.toggle("is-visible", list.length === 0);
        seccionesEmptyText.textContent = seccionesData.length === 0
            ? "Todavía no hay secciones. Cree la primera para empezar a registrar estudiantes."
            : "No se encontraron secciones con los filtros seleccionados.";
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

    // Columnas visibles: la de "Sección" solo aparece en la vista global.
    function columnasVisibles() {
        const cols = ["nombre", "cedula", "encargado", "telefono"];
        if (currentSeccionId === null) cols.push("seccion");
        cols.push("estado", "acciones");
        return cols;
    }

    function aplicarColumnasEncabezado() {
        const visibles = columnasVisibles();
        tableHeadCells.forEach(th => mostrar(th, visibles.includes(th.dataset.col)));
    }

    function crearFilaEstudiante(e) {
        const s = seccionById(e.seccionId);
        const fila = clonar("tplEstudianteRow");

        const visibles = columnasVisibles();
        fila.querySelectorAll("[data-col]").forEach(td => mostrar(td, visibles.includes(td.dataset.col)));

        ref(fila, "avatar").textContent = initials(e.nombre);
        ref(fila, "nombre").textContent = e.nombre;
        ref(fila, "cedula").textContent = e.cedula;
        ref(fila, "encargado").textContent = e.encargado;
        ref(fila, "telefono").textContent = e.telefono;
        ref(fila, "seccion").textContent = s ? seccionLabel(s) : "Sin sección";

        const estado = ref(fila, "estado");
        estado.classList.add(e.activo ? "status-pill--activo" : "status-pill--inactivo");
        estado.textContent = e.activo ? "Activo" : "Inactivo";
        estado.addEventListener("click", () => toggleEstado(e.id));

        ref(fila, "editBtn").addEventListener("click", () => openStudentModal(e.id));
        ref(fila, "viewBtn").addEventListener("click", () => openDetailModal(e.id));

        return fila;
    }

    // Encabezado de la vista: solo existe cuando se abrió una sección concreta.
    // En la vista global (activos/inactivos de todas las secciones) no se muestra
    // "Volver a secciones" ni la tarjeta de encabezado.
    function renderViewHeader() {
        const enSeccion = currentSeccionId !== null;

        // El filtro de Estado solo tiene sentido en la vista global (todos los
        // estudiantes); dentro de una sección siempre se ven solo los activos.
        mostrar(estadoFilterGroup, !enSeccion);
        mostrar(btnVolverSecciones, enSeccion);
        mostrar(sectionHeader, enSeccion);

        if (!enSeccion) return;

        const s = seccionById(currentSeccionId);
        viewBadge.textContent = seccionCodigo(s);
        viewTitulo.textContent = seccionLabel(s);
        viewSubtitulo.textContent = `Docente a cargo: ${docenteNombre(s.docenteId)}`;
        mostrar(btnEditarSeccion, true);
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
            alClic: () => { if (paginaActual > 1) { paginaActual--; renderEstudiantes(); } },
        }));

        paginasVisibles(paginaActual, totalPaginas).forEach(p => {
            if (p === "…") {
                nodos.push(clonar("tplPgDots"));
            } else {
                nodos.push(crearBotonPagina(String(p), {
                    activo: p === paginaActual,
                    alClic: () => { paginaActual = p; renderEstudiantes(); },
                }));
            }
        });

        nodos.push(crearBotonPagina("›", {
            deshabilitado: paginaActual === totalPaginas,
            alClic: () => { if (paginaActual < totalPaginas) { paginaActual++; renderEstudiantes(); } },
        }));

        estudiantesPagination.replaceChildren(...nodos);
    }

    function renderEstudiantes() {
        // Si la sección abierta fue eliminada o no existe, volvemos a la grilla.
        if (currentSeccionId !== null && !seccionById(currentSeccionId)) { volverASecciones(); return; }

        renderViewHeader();
        aplicarColumnasEncabezado();

        const listCompleta = getEstudiantesFiltrados();

        // Si la página actual quedó fuera de rango (por ejemplo, al desactivar al
        // último estudiante de la última página), se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(listCompleta.length / ESTUDIANTES_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * ESTUDIANTES_POR_PAGINA;
        const listPagina = listCompleta.slice(inicio, inicio + ESTUDIANTES_POR_PAGINA);

        tbody.replaceChildren(...listPagina.map(crearFilaEstudiante));

        estudiantesEmpty.classList.toggle("is-visible", listCompleta.length === 0);
        estudiantesEmptyText.textContent = currentSeccionId === null
            ? "No se encontraron estudiantes con los filtros seleccionados."
            : "Esta sección todavía no tiene estudiantes activos registrados.";

        estudiantesResultsCount.textContent = `Mostrando ${listPagina.length} de ${listCompleta.length} estudiantes`;
        renderPaginacion(totalPaginas);
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
        // Dentro de una sección concreta se muestra una vista enfocada:
        // solo buscador, "Volver a secciones", exportar y la tabla.
        layoutEl.classList.toggle("is-section-focus", enEstudiantes && currentSeccionId !== null);
        // En el inicio (lista de secciones) no se muestra la barra de filtros.
        mostrar(filtersBar, enEstudiantes);
        mostrar(seccionesView, !enEstudiantes);
        mostrar(estudiantesView, enEstudiantes);
        mostrar(gradoFilterGroup, !enEstudiantes);
        // El filtro de estado solo aplica a la vista global de estudiantes.
        mostrar(estadoFilterGroup, enEstudiantes && currentSeccionId === null);
        searchInput.placeholder = enEstudiantes
            ? "Buscar por nombre o cédula..."
            : "Buscar sección, docente o estudiante...";
    }

    function limpiarFiltros(estado) {
        currentSearch = "";
        currentGrado = "todos";
        currentEstado = estado || "todos";
        paginaActual = 1;
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

    btnVolverSecciones.addEventListener("click", volverASecciones);
    btnEditarSeccion.addEventListener("click", () => {
        if (currentSeccionId !== null) openSectionModal(currentSeccionId);
    });

    // ---- Barra de filtros ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        currentSearch = searchInput.value;
        currentGrado = gradoFilter.value;
        currentEstado = estadoFilter.value;
        paginaActual = 1;
        render();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        limpiarFiltros("todos");
        render();
    });

    estadoFilter.addEventListener("change", () => {
        currentEstado = estadoFilter.value;
        paginaActual = 1;
        render();
    });

    let searchTimer;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentSearch = searchInput.value; paginaActual = 1; render(); }, 200);
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
        secDocente.replaceChildren();
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
        eSeccion.replaceChildren();
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

    function crearFilaDetalle(label, value) {
        const fila = clonar("tplDetalleRow");
        ref(fila, "label").textContent = label;
        ref(fila, "value").textContent = value;
        return fila;
    }

    function openDetailModal(id) {
        const e = estudiantesData.find(x => x.id === id);
        if (!e) return;
        const s = seccionById(e.seccionId);

        document.getElementById("detailModalTitle").textContent = e.nombre;
        document.getElementById("detailModalSubtitle").textContent = s ? seccionLabel(s) : "Sin sección";

        const filas = [
            ["Cédula", e.cedula],
            ["Padre o encargado", e.encargado],
            ["Celular", e.telefono],
            ["Sección", s ? seccionLabel(s) : "Sin sección"],
            ["Docente a cargo", s ? docenteNombre(s.docenteId) : "Sin asignar"],
            ["Estado", e.activo ? "Activo" : "Inactivo"],
        ];

        detailModalBody.replaceChildren(...filas.map(([label, value]) => crearFilaDetalle(label, value)));
        detailModal.classList.add("is-open");
    }

    function closeDetailModal() { detailModal.classList.remove("is-open"); }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL
    // Exporta TODOS los registros filtrados, no solo los de la página visible.
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