(function () {
    "use strict";

    // ---- Configuración de materias y tipos de evaluación ----
    // El orden de MATERIAS coincide con las columnas del encabezado y de la plantilla de fila.
    const MATERIAS = ["Español", "Estudios Sociales", "Ciencias", "Matemáticas", "Inglés"];

    const TIPOS_EVALUACION = [
        { key: "examenes", label: "Exámenes" },
        { key: "tareas", label: "Tareas" },
        { key: "extraclases", label: "Extraclases" },
        { key: "cotidiano", label: "Cotidiano (trabajo en clase)" },
    ];

    const NOTA_MINIMA_APROBADO = 70;
    const ESTUDIANTES_POR_PAGINA = 6;

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

    // Cada nota se guarda como { valor, obs }: la observación es opcional.
    // Se convierte aquí el formato simple (número) de los datos de ejemplo.
    seccionesData.forEach(s => s.estudiantes.forEach(e => {
        MATERIAS.forEach(m => TIPOS_EVALUACION.forEach(t => {
            e.calificaciones[m][t.key] = e.calificaciones[m][t.key].map(n =>
                typeof n === "object" ? n : { valor: n, obs: "" });
        }));
    }));

    // ---- Estado ----
    let vistaActual = "secciones"; // "secciones" | "estudiantes"
    let seccionSeleccionadaId = null;
    let estudianteSearch = "";
    let materiaTabActiva = MATERIAS[0];
    let paginaActual = 1;

    // ---- Referencias DOM ----
    const seccionesView = document.getElementById("seccionesView");
    const estudiantesView = document.getElementById("estudiantesView");
    const seccionesGrid = document.getElementById("seccionesGrid");
    const seccionesEmptyState = document.getElementById("seccionesEmptyState");
    const seccionesCount = document.getElementById("seccionesCount");

    const estudiantesTableBody = document.getElementById("estudiantesTableBody");
    const estudiantesEmptyState = document.getElementById("estudiantesEmptyState");
    const estudiantesResultsCount = document.getElementById("estudiantesResultsCount");
    const seccionActualNombre = document.getElementById("seccionActualNombre");

    const btnVolverSecciones = document.getElementById("btnVolverSecciones");
    const estudianteSearchInput = document.getElementById("estudianteSearchInput");

    const moduleHero = document.getElementById("moduleHero");
    const estudiantesPagination = document.getElementById("estudiantesPagination");

    // ---- Utilidades de cálculo ----
    function promedio(arr) {
        if (!arr || arr.length === 0) return null;
        return arr.reduce((a, b) => a + b.valor, 0) / arr.length;
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

    // =========================================================
    // VISTA 1: SECCIONES
    // =========================================================
    function getSeccionesFiltradas() {
        return seccionesData;
    }

    function crearSeccionCard(s, idx) {
        const prom = promedioSeccion(s);
        const riesgo = prom !== null && prom < NOTA_MINIMA_APROBADO;
        const c = colorIndex(s.nombre + idx);

        const card = clonar("tplSeccionCard");
        card.dataset.id = s.id;
        ref(card, "accent").classList.add(`accent--${c}`);
        ref(card, "icon").classList.add(`accent--${c}`);
        ref(card, "nombre").textContent = s.nombre;

        const progreso = ref(card, "progreso");
        progreso.value = prom !== null ? Math.max(4, Math.min(100, prom)) : 0;
        progreso.classList.toggle("fill--riesgo", riesgo);

        ref(card, "total").textContent = `${s.estudiantes.length} estudiante(s)`;
        const chipProm = ref(card, "prom");
        chipProm.textContent = `Prom. ${fmt(prom)}`;
        chipProm.classList.toggle("prom--riesgo", riesgo);

        card.addEventListener("click", () => abrirSeccion(s.id));
        return card;
    }

    function renderSecciones() {
        const list = getSeccionesFiltradas();
        seccionesGrid.replaceChildren(...list.map((s, i) => crearSeccionCard(s, i)));
        seccionesEmptyState.classList.toggle("is-visible", list.length === 0);
        seccionesCount.textContent = `${list.length} sección(es)`;
    }

    // =========================================================
    // VISTA 2: ESTUDIANTES DE UNA SECCIÓN
    // =========================================================
    function abrirSeccion(id) {
        seccionSeleccionadaId = id;
        vistaActual = "estudiantes";
        estudianteSearch = "";
        paginaActual = 1;
        estudianteSearchInput.value = "";
        actualizarVista();
    }

    function volverASecciones() {
        vistaActual = "secciones";
        seccionSeleccionadaId = null;
        actualizarVista();
    }

    function actualizarVista() {
        const enSeccion = vistaActual === "estudiantes";
        mostrar(moduleHero, !enSeccion);
        mostrar(seccionesView, !enSeccion);
        mostrar(estudiantesView, enSeccion);

        if (enSeccion) {
            const seccion = seccionesData.find(s => s.id === seccionSeleccionadaId);
            seccionActualNombre.textContent = seccion.nombre;
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

        return seccion.estudiantes.filter(e =>
            !q || e.nombre.toLowerCase().includes(q) || e.cedula.toLowerCase().includes(q));
    }

    function crearFilaEstudiante(e, idx) {
        const fila = clonar("tplEstudianteRow");
        const c = colorIndex(e.nombre + idx);

        const avatar = ref(fila, "avatar");
        avatar.classList.add(`accent--${c}`);
        avatar.textContent = initials(e.nombre);
        ref(fila, "nombre").textContent = e.nombre;
        ref(fila, "cedula").textContent = e.cedula;

        // Una celda por materia, en el mismo orden que el encabezado
        MATERIAS.forEach((m, i) => {
            const prom = promedioMateria(e, m);
            const riesgo = prom !== null && prom < NOTA_MINIMA_APROBADO;
            const celda = ref(fila, `materia${i}`);
            celda.classList.add(riesgo ? "grade-cell--riesgo" : "grade-cell--bien");
            celda.textContent = fmt(prom);
        });

        const promGeneral = promedioGeneral(e);
        const pill = ref(fila, "promedio");
        pill.textContent = fmt(promGeneral);
        pill.classList.toggle("pill--riesgo", promGeneral !== null && promGeneral < NOTA_MINIMA_APROBADO);

        ref(fila, "viewBtn").addEventListener("click", () => openDetailModal(e.id, "view"));
        ref(fila, "editBtn").addEventListener("click", () => openDetailModal(e.id, "edit"));

        return fila;
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
        const listCompleta = getEstudiantesFiltrados();

        // Si la página actual quedó fuera de rango, se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(listCompleta.length / ESTUDIANTES_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * ESTUDIANTES_POR_PAGINA;
        const listPagina = listCompleta.slice(inicio, inicio + ESTUDIANTES_POR_PAGINA);

        estudiantesTableBody.replaceChildren(...listPagina.map((e, i) => crearFilaEstudiante(e, inicio + i)));
        estudiantesEmptyState.classList.toggle("is-visible", listCompleta.length === 0);
        estudiantesResultsCount.textContent = `Mostrando ${listPagina.length} de ${listCompleta.length} estudiantes`;

        renderPaginacion(totalPaginas);
    }

    // ---- Buscador (filtra mientras se escribe) ----
    let estudianteSearchTimer;
    estudianteSearchInput.addEventListener("input", () => {
        clearTimeout(estudianteSearchTimer);
        estudianteSearchTimer = setTimeout(() => { estudianteSearch = estudianteSearchInput.value; paginaActual = 1; renderEstudiantes(); }, 200);
    });

    btnVolverSecciones.addEventListener("click", volverASecciones);

    // =========================================================
    // MODAL DETALLE DE CALIFICACIONES
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const materiaTabsEl = document.getElementById("materiaTabs");
    const materiaPanelsEl = document.getElementById("materiaPanels");
    const modalModeBadge = document.getElementById("modalModeBadge");
    let estudianteActualId = null;
    let modalModo = "view"; // "view" | "edit"

    function getEstudianteActual() {
        return getSeccionActual().estudiantes.find(e => e.id === estudianteActualId);
    }

    // Una nota con su observación: editable en modo edición, solo texto en modo lectura.
    function crearNota(lista, nota, editable) {
        const fila = clonar("tplEvalNota");

        ref(fila, "valor").textContent = nota.valor;
        ref(fila, "chip").classList.toggle("chip--riesgo", nota.valor < NOTA_MINIMA_APROBADO);

        const quitar = ref(fila, "quitar");
        const obsInput = ref(fila, "obsInput");
        const obsTexto = ref(fila, "obsTexto");

        mostrar(quitar, editable);
        mostrar(obsInput, editable);
        mostrar(obsTexto, !editable);

        if (editable) {
            obsInput.value = nota.obs;

            // Editar la observación de una nota existente (se guarda mientras se escribe)
            obsInput.addEventListener("input", () => { nota.obs = obsInput.value.trim(); });

            // Eliminar nota
            quitar.addEventListener("click", () => {
                lista.splice(lista.indexOf(nota), 1);
                renderMateriaPanels();
                renderEstudiantes();
            });
        } else {
            obsTexto.textContent = nota.obs ? nota.obs : "Sin observación";
            obsTexto.classList.toggle("is-empty", !nota.obs);
        }

        return fila;
    }

    // Bloque de un tipo de evaluación: lista de notas y, en modo edición, el formulario para agregar.
    function crearBloqueEval(estudiante, materia, tipo) {
        const lista = estudiante.calificaciones[materia][tipo.key];
        const editable = modalModo === "edit";
        const bloque = clonar("tplEvalBlock");

        ref(bloque, "titulo").textContent = tipo.label;
        ref(bloque, "prom").textContent = `Prom. ${fmt(promedio(lista))}`;

        const contenedorNotas = ref(bloque, "notas");
        contenedorNotas.replaceChildren(...lista.map(n => crearNota(lista, n, editable)));
        mostrar(contenedorNotas, lista.length > 0);
        mostrar(ref(bloque, "vacio"), lista.length === 0);

        const form = ref(bloque, "form");
        mostrar(form, editable);

        if (editable) {
            // Agregar nota (con observación opcional)
            form.addEventListener("submit", ev => {
                ev.preventDefault();
                const valor = parseFloat(ref(form, "notaInput").value);
                if (isNaN(valor) || valor < 0 || valor > 100) return;
                lista.push({ valor, obs: ref(form, "obsInput").value.trim() });
                renderMateriaPanels();
                renderEstudiantes();
            });
        }

        return bloque;
    }

    function crearPanelMateria(estudiante, materia) {
        const panel = clonar("tplMateriaPanel");
        panel.dataset.materia = materia;
        panel.classList.toggle("is-active", materia === materiaTabActiva);

        ref(panel, "label").textContent = `Promedio de ${materia}`;
        ref(panel, "prom").textContent = fmt(promedioMateria(estudiante, materia));

        panel.append(...TIPOS_EVALUACION.map(t => crearBloqueEval(estudiante, materia, t)));
        return panel;
    }

    function renderMateriaTabs() {
        materiaTabsEl.replaceChildren(...MATERIAS.map(m => {
            const tab = clonar("tplMateriaTab");
            tab.textContent = m;
            tab.classList.toggle("is-active", m === materiaTabActiva);
            tab.addEventListener("click", () => {
                materiaTabActiva = m;
                renderMateriaTabs();
                renderMateriaPanels();
            });
            return tab;
        }));
    }

    function renderMateriaPanels() {
        const estudiante = getEstudianteActual();
        materiaPanelsEl.replaceChildren(...MATERIAS.map(m => crearPanelMateria(estudiante, m)));
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
    // Exporta TODOS los estudiantes filtrados, no solo los de la página visible.
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