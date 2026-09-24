
(function () {
    "use strict";

    // ---- Configuración de materias y tipos de evaluación ----
    const MATERIAS = ["Español", "Estudios Sociales", "Ciencias", "Matemáticas", "Inglés"];

    const TIPOS_EVALUACION = [
        { key: "examenes", label: "Exámenes" },
        { key: "tareas", label: "Tareas" },
        { key: "extraclases", label: "Extraclases" },
        { key: "cotidiano", label: "Cotidiano (trabajo en clase)" },
    ];

    const NOTA_MINIMA_APROBADO = 70;
    const ESTUDIANTES_POR_PAGINA = 6;

    // ---- Utilidad de color: asigna una de 6 paletas según el texto (estable) ----
    function colorIndex(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        return hash % 6;
    }

    // ---- Datos de ejemplo ----
    function notasVacias() {
        const n = {};
        TIPOS_EVALUACION.forEach(t => { n[t.key] = []; });
        return n;
    }

    function calificacionesVacias() {
        const c = {};
        MATERIAS.forEach(m => { c[m] = notasVacias(); });
        return c;
    }

    let seccionesData = [
        {
            id: 1, nombre: "1° - Grupo A",
            estudiantes: [
                { id: 101, nombre: "Emiliano Castro", cedula: "1-0543-5678", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [85, 90], tareas: [95], extraclases: [80], cotidiano: [90, 88] }, "Matemáticas": { examenes: [70, 65], tareas: [80], extraclases: [75], cotidiano: [85] }, "Ciencias": { examenes: [92], tareas: [88], extraclases: [90], cotidiano: [95] }, "Estudios Sociales": { examenes: [78], tareas: [82], extraclases: [80], cotidiano: [85] }, "Inglés": { examenes: [88], tareas: [90], extraclases: [85], cotidiano: [92] } } },
                { id: 102, nombre: "Sofía Castro", cedula: "1-0543-9911", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [95, 92], tareas: [98], extraclases: [90], cotidiano: [95] }, "Matemáticas": { examenes: [60, 55], tareas: [70], extraclases: [65], cotidiano: [72] }, "Ciencias": { examenes: [80], tareas: [85], extraclases: [82], cotidiano: [88] }, "Estudios Sociales": { examenes: [90], tareas: [92], extraclases: [88], cotidiano: [90] }, "Inglés": { examenes: [93], tareas: [95], extraclases: [90], cotidiano: [92] } } },
            ],
        },
        {
            id: 2, nombre: "1° - Grupo B",
            estudiantes: [
                { id: 103, nombre: "Diego Rojas", cedula: "1-0765-3456", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [65, 60], tareas: [70], extraclases: [68], cotidiano: [72] }, "Matemáticas": { examenes: [55, 58], tareas: [60], extraclases: [62], cotidiano: [65] }, "Ciencias": { examenes: [70], tareas: [72], extraclases: [68], cotidiano: [75] }, "Estudios Sociales": { examenes: [68], tareas: [70], extraclases: [65], cotidiano: [72] }, "Inglés": { examenes: [72], tareas: [75], extraclases: [70], cotidiano: [78] } } },
            ],
        },
        {
            id: 3, nombre: "4° - Grupo A",
            estudiantes: [
                { id: 104, nombre: "María Rodríguez", cedula: "1-0876-2345", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [90, 95], tareas: [92], extraclases: [88], cotidiano: [94] }, "Matemáticas": { examenes: [85, 88], tareas: [90], extraclases: [82], cotidiano: [89] }, "Ciencias": { examenes: [93], tareas: [90], extraclases: [91], cotidiano: [95] }, "Estudios Sociales": { examenes: [88], tareas: [85], extraclases: [90], cotidiano: [92] }, "Inglés": { examenes: [91], tareas: [93], extraclases: [89], cotidiano: [90] } } },
                { id: 105, nombre: "Carlos Jiménez", cedula: "1-0987-1234", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [72, 68], tareas: [75], extraclases: [70], cotidiano: [78] }, "Matemáticas": { examenes: [80, 78], tareas: [82], extraclases: [79], cotidiano: [85] }, "Ciencias": { examenes: [65], tareas: [70], extraclases: [68], cotidiano: [72] }, "Estudios Sociales": { examenes: [75], tareas: [78], extraclases: [73], cotidiano: [80] }, "Inglés": { examenes: [70], tareas: [72], extraclases: [68], cotidiano: [75] } } },
                { id: 106, nombre: "Valentina Méndez", cedula: "1-0654-4567", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [98, 96], tareas: [100], extraclases: [95], cotidiano: [98] }, "Matemáticas": { examenes: [92, 90], tareas: [95], extraclases: [88], cotidiano: [93] }, "Ciencias": { examenes: [96], tareas: [94], extraclases: [92], cotidiano: [97] }, "Estudios Sociales": { examenes: [94], tareas: [92], extraclases: [90], cotidiano: [95] }, "Inglés": { examenes: [97], tareas: [95], extraclases: [93], cotidiano: [96] } } },
            ],
        },
        {
            id: 4, nombre: "5° - Grupo A",
            estudiantes: [
                { id: 107, nombre: "Ana Fernández", cedula: "1-0322-7788", calificaciones: { ...calificacionesVacias(), "Español": { examenes: [80, 82], tareas: [85], extraclases: [78], cotidiano: [88] }, "Matemáticas": { examenes: [58, 62], tareas: [65], extraclases: [60], cotidiano: [68] }, "Ciencias": { examenes: [75], tareas: [78], extraclases: [72], cotidiano: [80] }, "Estudios Sociales": { examenes: [82], tareas: [80], extraclases: [78], cotidiano: [85] }, "Inglés": { examenes: [79], tareas: [82], extraclases: [76], cotidiano: [84] } } },
            ],
        },
    ];

    // ---- Estado ----
    let vistaActual = "secciones"; // "secciones" | "estudiantes"
    let seccionSeleccionadaId = null;
    let seccionSearch = "";
    let estudianteSearch = "";
    let materiaResaltada = "todas";
    let rendimientoFilter = "todos";
    let materiaTabActiva = MATERIAS[0];
    let paginaActual = 1;
    let soloSeccionesConRiesgo = false;

    // ---- Referencias DOM ----
    const seccionesView = document.getElementById("seccionesView");
    const estudiantesView = document.getElementById("estudiantesView");
    const seccionesGrid = document.getElementById("seccionesGrid");
    const seccionesEmptyState = document.getElementById("seccionesEmptyState");
    const seccionesCount = document.getElementById("seccionesCount");
    const seccionSearchInput = document.getElementById("seccionSearchInput");

    const estudiantesTableBody = document.getElementById("estudiantesTableBody");
    const estudiantesEmptyState = document.getElementById("estudiantesEmptyState");
    const estudiantesResultsCount = document.getElementById("estudiantesResultsCount");
    const seccionActualLabel = document.getElementById("seccionActualLabel");

    const btnVolverSecciones = document.getElementById("btnVolverSecciones");
    const filtrosPanel = document.getElementById("filtrosPanel");
    const estudianteSearchInput = document.getElementById("estudianteSearchInput");
    const materiaFilter = document.getElementById("materiaFilter");
    const rendimientoFilter_ = document.getElementById("rendimientoFilter");

    const moduleHero = document.getElementById("moduleHero");
    const seccionesStats = document.getElementById("seccionesStats");
    const estudiantesStats = document.getElementById("estudiantesStats");
    const estudiantesPagination = document.getElementById("estudiantesPagination");

    // ---- Utilidades de cálculo ----
    function promedio(arr) {
        if (!arr || arr.length === 0) return null;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    // Promedio de una materia: promedio simple de los 4 promedios de categoría con notas.
    function promedioMateria(estudiante, materia) {
        const notas = estudiante.calificaciones[materia];
        const proms = TIPOS_EVALUACION.map(t => promedio(notas[t.key])).filter(p => p !== null);
        if (proms.length === 0) return null;
        return proms.reduce((a, b) => a + b, 0) / proms.length;
    }

    // Promedio general de un estudiante: promedio de sus materias con nota.
    function promedioGeneral(estudiante) {
        const proms = MATERIAS.map(m => promedioMateria(estudiante, m)).filter(p => p !== null);
        if (proms.length === 0) return null;
        return proms.reduce((a, b) => a + b, 0) / proms.length;
    }

    function promedioSeccion(seccion) {
        const proms = seccion.estudiantes.map(promedioGeneral).filter(p => p !== null);
        if (proms.length === 0) return null;
        return proms.reduce((a, b) => a + b, 0) / proms.length;
    }

    function fmt(n) {
        return n === null || n === undefined ? "—" : n.toFixed(1);
    }

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    function statCardHtml(color, iconSvg, value, label, opts) {
        opts = opts || {};
        const clickable = opts.clickable ? "stat-card--clickable" : "";
        const active = opts.active ? "is-active" : "";
        const idAttr = opts.id ? `id="${opts.id}"` : "";
        return `
            <div class="stat-card stat-card--${color} ${clickable} ${active}" ${idAttr}>
                <div class="stat-card__icon">${iconSvg}</div>
                <div>
                    <div class="stat-card__value">${value}</div>
                    <div class="stat-card__label">${label}</div>
                </div>
            </div>`;
    }

    const ICON_SECCIONES = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>';
    const ICON_ESTUDIANTES = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="9" cy="8" r="3.2" /><path d="M2 20c.8-3.6 3.4-5.6 7-5.6s6.2 2 7 5.6" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M15 14.4c2.6.4 4.3 2.1 5 5.6" /></svg>';
    const ICON_PROMEDIO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>';
    const ICON_RIESGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>';
    const ICON_APROBADOS = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="m5 13 4 4L19 7" /></svg>';

    function renderSeccionesStats() {
        const totalSecciones = seccionesData.length;
        const totalEstudiantes = seccionesData.reduce((a, s) => a + s.estudiantes.length, 0);
        const todosProm = seccionesData.flatMap(s => s.estudiantes.map(promedioGeneral)).filter(p => p !== null);
        const promGeneral = todosProm.length ? todosProm.reduce((a, b) => a + b, 0) / todosProm.length : null;
        const enRiesgo = todosProm.filter(p => p < NOTA_MINIMA_APROBADO).length;

        seccionesStats.innerHTML = [
            statCardHtml("blue", ICON_SECCIONES, totalSecciones, "Secciones"),
            statCardHtml("purple", ICON_ESTUDIANTES, totalEstudiantes, "Estudiantes"),
            statCardHtml("teal", ICON_PROMEDIO, fmt(promGeneral), "Promedio general"),
            statCardHtml("red", ICON_RIESGO, enRiesgo, "Estudiantes en riesgo", { clickable: true, active: soloSeccionesConRiesgo, id: "statRiesgoSecciones" }),
        ].join("");

        const cardRiesgo = document.getElementById("statRiesgoSecciones");
        if (cardRiesgo) {
            cardRiesgo.addEventListener("click", () => {
                soloSeccionesConRiesgo = !soloSeccionesConRiesgo;
                renderSecciones();
            });
        }
    }

    // =========================================================
    // VISTA 1: SECCIONES
    // =========================================================
    function getSeccionesFiltradas() {
        const q = seccionSearch.trim().toLowerCase();
        return seccionesData.filter(s => {
            const matchSearch = !q || s.nombre.toLowerCase().includes(q);
            const matchRiesgo = !soloSeccionesConRiesgo || s.estudiantes.some(e => {
                const p = promedioGeneral(e);
                return p !== null && p < NOTA_MINIMA_APROBADO;
            });
            return matchSearch && matchRiesgo;
        });
    }

    function seccionCardHtml(s, idx) {
        const prom = promedioSeccion(s);
        const riesgo = prom !== null && prom < NOTA_MINIMA_APROBADO;
        const c = colorIndex(s.nombre + idx);
        const pct = prom !== null ? Math.max(4, Math.min(100, prom)) : 0;
        return `
            <div class="seccion-card" data-id="${s.id}">
                <div class="seccion-card__accent accent--${c}"></div>
                <div class="seccion-card__body">
                    <div class="seccion-card__icon accent--${c}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M22 9 12 5 2 9l10 4 10-4Z" /><path d="M6 11v4c0 1.5 2.7 3.5 6 3.5s6-2 6-3.5v-4" /></svg>
                    </div>
                    <div>
                        <div class="seccion-card__name">${s.nombre}</div>
                    </div>
                    <div class="seccion-card__progress">
                        <div class="seccion-card__progress-fill ${riesgo ? "fill--riesgo" : ""}" style="width:${pct}%;"></div>
                    </div>
                    <div class="seccion-card__meta">
                        <span>${s.estudiantes.length} estudiante(s)</span>
                        <span class="seccion-card__prom ${riesgo ? "prom--riesgo" : ""}">Prom. ${fmt(prom)}</span>
                    </div>
                </div>
            </div>`;
    }

    function renderSecciones() {
        renderSeccionesStats();
        const list = getSeccionesFiltradas();
        seccionesGrid.innerHTML = list.map((s, i) => seccionCardHtml(s, i)).join("");
        seccionesEmptyState.style.display = list.length === 0 ? "block" : "none";
        seccionesCount.textContent = `${list.length} sección(es)`;

        const riesgoTag = document.getElementById("riesgoFilterTag");
        riesgoTag.style.display = soloSeccionesConRiesgo ? "inline-flex" : "none";

        seccionesGrid.querySelectorAll(".seccion-card").forEach(card => {
            card.addEventListener("click", () => abrirSeccion(parseInt(card.dataset.id, 10)));
        });
    }

    let seccionSearchTimer;
    seccionSearchInput.addEventListener("input", () => {
        clearTimeout(seccionSearchTimer);
        seccionSearchTimer = setTimeout(() => { seccionSearch = seccionSearchInput.value; renderSecciones(); }, 200);
    });

    // =========================================================
    // VISTA 2: ESTUDIANTES DE UNA SECCIÓN
    // =========================================================
    function abrirSeccion(id) {
        seccionSeleccionadaId = id;
        vistaActual = "estudiantes";
        estudianteSearch = "";
        materiaResaltada = "todas";
        rendimientoFilter = "todos";
        paginaActual = 1;
        estudianteSearchInput.value = "";
        materiaFilter.value = "todas";
        rendimientoFilter_.value = "todos";
        actualizarVista();
    }

    function volverASecciones() {
        vistaActual = "secciones";
        seccionSeleccionadaId = null;
        actualizarVista();
    }

    function actualizarVista() {
        const enSeccion = vistaActual === "estudiantes";
        moduleHero.style.display = enSeccion ? "none" : "flex";
        seccionesView.style.display = enSeccion ? "none" : "block";
        estudiantesView.style.display = enSeccion ? "block" : "none";
        filtrosPanel.style.display = enSeccion ? "block" : "none";

        if (enSeccion) {
            const seccion = seccionesData.find(s => s.id === seccionSeleccionadaId);
            seccionActualLabel.textContent = seccion.nombre;
            renderEstudiantes();
        } else {
            renderSecciones();
        }
    }

    function getSeccionActual() {
        return seccionesData.find(s => s.id === seccionSeleccionadaId);
    }

    function getEstudiantesFiltrados() {
        const seccion = getSeccionActual();
        const q = estudianteSearch.trim().toLowerCase();

        return seccion.estudiantes.filter(e => {
            const matchSearch = !q || e.nombre.toLowerCase().includes(q) || e.cedula.toLowerCase().includes(q);

            let matchRendimiento = true;
            if (rendimientoFilter !== "todos") {
                const prom = promedioGeneral(e);
                matchRendimiento = rendimientoFilter === "aprobado"
                    ? (prom !== null && prom >= NOTA_MINIMA_APROBADO)
                    : (prom !== null && prom < NOTA_MINIMA_APROBADO);
            }

            return matchSearch && matchRendimiento;
        });
    }

    function renderEstudiantesStats() {
        const seccion = getSeccionActual();
        const proms = seccion.estudiantes.map(promedioGeneral).filter(p => p !== null);
        const promSeccion = proms.length ? proms.reduce((a, b) => a + b, 0) / proms.length : null;
        const aprobados = proms.filter(p => p >= NOTA_MINIMA_APROBADO).length;
        const enRiesgo = proms.filter(p => p < NOTA_MINIMA_APROBADO).length;

        estudiantesStats.innerHTML = [
            statCardHtml("blue", ICON_ESTUDIANTES, seccion.estudiantes.length, "Estudiantes"),
            statCardHtml("teal", ICON_PROMEDIO, fmt(promSeccion), "Promedio de sección"),
            statCardHtml("purple", ICON_APROBADOS, aprobados, "Aprobados"),
            statCardHtml("red", ICON_RIESGO, enRiesgo, "En riesgo", { clickable: true, active: rendimientoFilter === "riesgo", id: "statRiesgoEstudiantes" }),
        ].join("");

        document.getElementById("statRiesgoEstudiantes").addEventListener("click", () => {
            rendimientoFilter = rendimientoFilter === "riesgo" ? "todos" : "riesgo";
            rendimientoFilter_.value = rendimientoFilter;
            paginaActual = 1;
            renderEstudiantes();
        });
    }

    function celdaMateria(estudiante, materia) {
        const prom = promedioMateria(estudiante, materia);
        const riesgo = prom !== null && prom < NOTA_MINIMA_APROBADO;
        const resaltar = materiaResaltada === materia ? "font-weight:800;" : "";
        return `<td class="grade-cell ${riesgo ? "grade-cell--riesgo" : "grade-cell--bien"}" style="${resaltar}">${fmt(prom)}</td>`;
    }

    function estudianteRowHtml(e, idx) {
        const prom = promedioGeneral(e);
        const riesgo = prom !== null && prom < NOTA_MINIMA_APROBADO;
        const c = colorIndex(e.nombre + idx);
        return `
            <td>
                <div class="user-cell">
                    <div class="user-avatar accent--${c}">${initials(e.nombre)}</div>
                    <span class="user-cell__name">${e.nombre}</span>
                </div>
            </td>
            <td>${e.cedula}</td>
            ${MATERIAS.map(m => celdaMateria(e, m)).join("")}
            <td class="grade-cell">
                <span class="prom-pill ${riesgo ? "pill--riesgo" : ""}">${fmt(prom)}</span>
            </td>
            <td>
                <div class="row-actions">
                    <button class="row-action-btn view-btn" data-id="${e.id}" title="Ver notas" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button class="row-action-btn edit-btn" data-id="${e.id}" title="Registrar / editar notas" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                </div>
            </td>`;
    }

    function renderPaginacion(totalItems) {
        const totalPaginas = Math.max(1, Math.ceil(totalItems / ESTUDIANTES_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        let botones = `<button class="pg-btn" id="pgPrev" type="button" ${paginaActual === 1 ? "disabled" : ""}>‹</button>`;
        for (let p = 1; p <= totalPaginas; p++) {
            botones += `<button class="pg-btn ${p === paginaActual ? "is-active" : ""}" data-page="${p}" type="button">${p}</button>`;
        }
        botones += `<button class="pg-btn" id="pgNext" type="button" ${paginaActual === totalPaginas ? "disabled" : ""}>›</button>`;

        estudiantesPagination.innerHTML = botones;

        document.getElementById("pgPrev").addEventListener("click", () => { if (paginaActual > 1) { paginaActual--; renderEstudiantes(); } });
        document.getElementById("pgNext").addEventListener("click", () => { if (paginaActual < totalPaginas) { paginaActual++; renderEstudiantes(); } });
        estudiantesPagination.querySelectorAll("[data-page]").forEach(btn => {
            btn.addEventListener("click", () => { paginaActual = parseInt(btn.dataset.page, 10); renderEstudiantes(); });
        });
    }

    function renderEstudiantes() {
        const seccion = getSeccionActual();
        renderEstudiantesStats();

        const listCompleta = getEstudiantesFiltrados();
        const inicio = (paginaActual - 1) * ESTUDIANTES_POR_PAGINA;
        const listPagina = listCompleta.slice(inicio, inicio + ESTUDIANTES_POR_PAGINA);

        estudiantesTableBody.innerHTML = listPagina.map((e, i) => `<tr>${estudianteRowHtml(e, inicio + i)}</tr>`).join("");
        estudiantesEmptyState.style.display = listCompleta.length === 0 ? "block" : "none";
        estudiantesResultsCount.textContent = `Mostrando ${listPagina.length} de ${listCompleta.length} estudiantes`;

        renderPaginacion(listCompleta.length);

        estudiantesTableBody.querySelectorAll(".view-btn").forEach(el => {
            el.addEventListener("click", () => openDetailModal(parseInt(el.dataset.id, 10), "view"));
        });
        estudiantesTableBody.querySelectorAll(".edit-btn").forEach(el => {
            el.addEventListener("click", () => openDetailModal(parseInt(el.dataset.id, 10), "edit"));
        });
    }

    // ---- Filtros del panel lateral ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        estudianteSearch = estudianteSearchInput.value;
        materiaResaltada = materiaFilter.value;
        rendimientoFilter = rendimientoFilter_.value;
        paginaActual = 1;
        renderEstudiantes();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        estudianteSearch = "";
        materiaResaltada = "todas";
        rendimientoFilter = "todos";
        paginaActual = 1;
        estudianteSearchInput.value = "";
        materiaFilter.value = "todas";
        rendimientoFilter_.value = "todos";
        renderEstudiantes();
    });

    let estudianteSearchTimer;
    estudianteSearchInput.addEventListener("input", () => {
        clearTimeout(estudianteSearchTimer);
        estudianteSearchTimer = setTimeout(() => { estudianteSearch = estudianteSearchInput.value; paginaActual = 1; renderEstudiantes(); }, 200);
    });

    btnVolverSecciones.addEventListener("click", volverASecciones);

    // ---- Tip panel ----
    document.getElementById("tipCloseBtn").addEventListener("click", () => {
        document.getElementById("tipPanel").style.display = "none";
    });

    // =========================================================
    // MODAL DETALLE DE CALIFICACIONES
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const materiaTabsEl = document.getElementById("materiaTabs");
    const materiaPanelsEl = document.getElementById("materiaPanels");
    const modalModeBadge = document.getElementById("modalModeBadge");
    let estudianteActualId = null;
    let modalModo = "view"; // "view" | "edit"

    function evalBlockHtml(estudiante, materia, tipo) {
        const notas = estudiante.calificaciones[materia][tipo.key];
        const prom = promedio(notas);
        const editable = modalModo === "edit";
        return `
            <div class="eval-block" data-tipo="${tipo.key}">
                <div class="eval-block__head">
                    <span class="eval-block__title">${tipo.label}</span>
                    <span class="eval-block__prom">Prom. ${fmt(prom)}</span>
                </div>
                <div class="eval-notas">
                    ${notas.map((n, i) => `
                        <span class="eval-nota-chip ${n < NOTA_MINIMA_APROBADO ? "chip--riesgo" : ""}">
                            ${n}
                            ${editable ? `
                            <button class="eval-nota-chip__remove" data-materia="${materia}" data-tipo="${tipo.key}" data-idx="${i}" title="Eliminar nota" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>` : ""}
                        </span>`).join("") || `<span style="font-size:12px;color:var(--ink-500);">Sin notas registradas.</span>`}
                </div>
                ${editable ? `
                <form class="eval-add-form" data-materia="${materia}" data-tipo="${tipo.key}">
                    <input type="number" min="0" max="100" step="0.1" placeholder="Nueva nota (0-100)" required />
                    <button type="submit">Agregar</button>
                </form>` : ""}
            </div>`;
    }

    function materiaPanelHtml(estudiante, materia) {
        const prom = promedioMateria(estudiante, materia);
        return `
            <div class="materia-panel" data-materia="${materia}">
                <div class="materia-panel__promedio">
                    <span>Promedio de ${materia}</span>
                    <strong>${fmt(prom)}</strong>
                </div>
                ${TIPOS_EVALUACION.map(t => evalBlockHtml(estudiante, materia, t)).join("")}
            </div>`;
    }

    function renderMateriaTabs() {
        materiaTabsEl.innerHTML = MATERIAS.map(m => `
            <button class="materia-tab ${m === materiaTabActiva ? "is-active" : ""}" data-materia="${m}" type="button">${m}</button>
        `).join("");

        materiaTabsEl.querySelectorAll(".materia-tab").forEach(btn => {
            btn.addEventListener("click", () => {
                materiaTabActiva = btn.dataset.materia;
                renderMateriaTabs();
                renderMateriaPanels();
            });
        });
    }

    function renderMateriaPanels() {
        const estudiante = getSeccionActual().estudiantes.find(e => e.id === estudianteActualId);
        materiaPanelsEl.innerHTML = MATERIAS.map(m => materiaPanelHtml(estudiante, m)).join("");

        materiaPanelsEl.querySelectorAll(".materia-panel").forEach(p => {
            p.classList.toggle("is-active", p.dataset.materia === materiaTabActiva);
        });

        if (modalModo !== "edit") return;

        // Eliminar nota
        materiaPanelsEl.querySelectorAll(".eval-nota-chip__remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const { materia, tipo, idx } = btn.dataset;
                estudiante.calificaciones[materia][tipo].splice(parseInt(idx, 10), 1);
                renderMateriaPanels();
                renderEstudiantes();
            });
        });

        // Agregar nota
        materiaPanelsEl.querySelectorAll(".eval-add-form").forEach(form => {
            form.addEventListener("submit", (ev) => {
                ev.preventDefault();
                const input = form.querySelector("input");
                const valor = parseFloat(input.value);
                if (isNaN(valor) || valor < 0 || valor > 100) return;
                const { materia, tipo } = form.dataset;
                estudiante.calificaciones[materia][tipo].push(valor);
                input.value = "";
                renderMateriaPanels();
                renderEstudiantes();
            });
        });
    }

    function openDetailModal(id, modo) {
        const estudiante = getSeccionActual().estudiantes.find(e => e.id === id);
        if (!estudiante) return;

        estudianteActualId = id;
        modalModo = modo === "edit" ? "edit" : "view";
        materiaTabActiva = MATERIAS[0];

        document.getElementById("detailModalTitle").textContent = estudiante.nombre;
        document.getElementById("detailModalSubtitle").textContent = `Cédula: ${estudiante.cedula} · Sección: ${getSeccionActual().nombre}`;
        modalModeBadge.textContent = modalModo === "edit" ? "Modo edición" : "Solo lectura";

        renderMateriaTabs();
        renderMateriaPanels();

        detailModal.classList.add("is-open");
    }

    function closeDetailModal() {
        detailModal.classList.remove("is-open");
        renderEstudiantes(); // refrescar promedios en la tabla tras cerrar
    }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL (calificaciones de la sección actual)
    // =========================================================
    document.getElementById("btnExportSeccion").addEventListener("click", async () => {
        const seccion = getSeccionActual();
        const list = getEstudiantesFiltrados();
        if (list.length === 0) { alert("No hay estudiantes para exportar con los filtros actuales."); return; }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Escuela El Valle";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(`Calificaciones ${seccion.nombre}`.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
        const headers = ["Estudiante", "Cédula", ...MATERIAS, "Promedio general"];
        const widths = [24, 16, ...MATERIAS.map(() => 14), 16];
        const lastCol = String.fromCharCode(64 + headers.length);

        sheet.mergeCells(`A1:${lastCol}1`);
        const titleCell = sheet.getCell("A1");
        titleCell.value = `Escuela El Valle · Calificaciones — ${seccion.nombre}`;
        titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
        titleCell.alignment = { vertical: "middle", horizontal: "left" };
        sheet.getRow(1).height = 30;
        sheet.getRow(1).eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF142347" } }; });

        sheet.mergeCells(`A2:${lastCol}2`);
        const subtitleCell = sheet.getCell("A2");
        subtitleCell.value = `Generado el ${new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })} · ${list.length} registro(s)`;
        subtitleCell.font = { size: 10.5, italic: true, color: { argb: "FF4A5468" } };
        sheet.getRow(2).height = 20;
        sheet.getRow(3).height = 6;

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

        list.forEach(e => {
            const fila = [e.nombre, e.cedula, ...MATERIAS.map(m => fmt(promedioMateria(e, m))), fmt(promedioGeneral(e))];
            const row = sheet.addRow(fila);
            row.height = 20;
            row.eachCell(cell => {
                cell.border = { bottom: { style: "hair", color: { argb: "FFE7EAF3" } } };
                cell.alignment = { vertical: "middle", wrapText: true };
            });
        });

        sheet.autoFilter = { from: "A4", to: `${lastCol}4` };
        sheet.columns.forEach((col, i) => { col.width = widths[i] || 16; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, `calificaciones_${seccion.nombre.replace(/[^\w]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    // ---- Inicial ----
    actualizarVista();
})();