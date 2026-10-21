(function () {
    "use strict";

    const ESTADOS = [
        { key: "presente", label: "Presente", color: "presente" },
        { key: "tardia", label: "Tardía", color: "tardia" },
        { key: "ausente", label: "Ausente", color: "ausente" },
    ];

    const ESTUDIANTES_POR_PAGINA = 6;
    const STORAGE_KEY = "asistencia_registros_v1";

    function hoyISO() {
        const d = new Date();
        const off = d.getTimezoneOffset();
        return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
    }

    // ---- Utilidad de color: asigna una de 6 paletas según el texto (estable) ----
    function colorIndex(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        return hash % 6;
    }

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
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

    // ---- Generador de historial de ejemplo para los últimos N días hábiles ----
    function historialEjemplo(pesos) {
        // pesos: probabilidad relativa de [presente, tardia, ausente]
        const registros = {};
        const hoy = new Date();
        let dias = 0;
        for (let i = 1; dias < 18; i++) {
            const d = new Date(hoy);
            d.setDate(d.getDate() - i);
            if (d.getDay() === 0 || d.getDay() === 6) continue; // saltar fines de semana
            dias++;
            const r = Math.random() * (pesos[0] + pesos[1] + pesos[2]);
            let estado;
            if (r < pesos[0]) estado = "presente";
            else if (r < pesos[0] + pesos[1]) estado = "tardia";
            else estado = "ausente";
            const off = d.getTimezoneOffset();
            const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
            registros[iso] = estado;
        }
        return registros;
    }

    // ---- Datos de ejemplo ----
    let seccionesData = [
        {
            id: 1, nombre: "1° - Grupo A",
            estudiantes: [
                { id: 101, nombre: "Emiliano Castro", cedula: "1-0543-5678", activo: true, asistencia: historialEjemplo([8, 1, 1]) },
                { id: 102, nombre: "Sofía Castro", cedula: "1-0543-9911", activo: true, asistencia: historialEjemplo([7, 2, 1]) },
                { id: 108, nombre: "Bryan Solano", cedula: "1-0543-1122", activo: false, asistencia: historialEjemplo([6, 2, 2]) },
            ],
        },
        {
            id: 2, nombre: "1° - Grupo B",
            estudiantes: [
                { id: 103, nombre: "Diego Rojas", cedula: "1-0765-3456", activo: true, asistencia: historialEjemplo([5, 3, 2]) },
            ],
        },
        {
            id: 3, nombre: "4° - Grupo A",
            estudiantes: [
                { id: 104, nombre: "María Rodríguez", cedula: "1-0876-2345", activo: true, asistencia: historialEjemplo([9, 1, 0]) },
                { id: 105, nombre: "Carlos Jiménez", cedula: "1-0987-1234", activo: true, asistencia: historialEjemplo([6, 2, 2]) },
                { id: 106, nombre: "Valentina Méndez", cedula: "1-0654-4567", activo: true, asistencia: historialEjemplo([9, 0, 1]) },
            ],
        },
        {
            id: 4, nombre: "5° - Grupo A",
            estudiantes: [
                { id: 107, nombre: "Ana Fernández", cedula: "1-0322-7788", activo: true, asistencia: historialEjemplo([4, 3, 3]) },
            ],
        },
    ];

    // Aplica cualquier asistencia guardada previamente (por ejemplo, en una
    // sesión anterior) sobre los datos de ejemplo, para que lo registrado
    // no se pierda al recargar la página.
    (function aplicarAsistenciaGuardada() {
        const guardado = cargarAsistenciaGuardada();
        seccionesData.forEach(s => {
            s.estudiantes.forEach(e => {
                if (guardado[e.id]) Object.assign(e.asistencia, guardado[e.id]);
            });
        });
    })();

    // ---- Estado ----
    let vistaActual = "secciones"; // "secciones" | "estudiantes"
    let seccionSeleccionadaId = null;
    let estudianteSearch = "";
    let fechaSeleccionada = hoyISO();
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
    const seccionActualLabel = document.getElementById("seccionActualLabel");

    const btnVolverSecciones = document.getElementById("btnVolverSecciones");
    const estudianteSearchInput = document.getElementById("estudianteSearchInput");
    const fechaAsistenciaInput = document.getElementById("fechaAsistenciaInput");

    const moduleHero = document.getElementById("moduleHero");
    const estudiantesPagination = document.getElementById("estudiantesPagination");
    const btnGuardarAsistencia = document.getElementById("btnGuardarAsistencia");

    fechaAsistenciaInput.value = fechaSeleccionada;
    fechaAsistenciaInput.max = hoyISO();

    // ---- Toast de confirmación ----
    // Solo se invoca al guardar la asistencia (botón "Guardar asistencia" o
    // "Marcar todos presentes", que también persiste el registro del día).
    const successToast = document.getElementById("successToast");
    const successToastText = document.getElementById("successToastText");
    let toastTimer;

    function showSuccessToast(message) {
        clearTimeout(toastTimer);
        successToastText.textContent = message;
        successToast.classList.add("is-open");
        toastTimer = setTimeout(() => successToast.classList.remove("is-open"), 1800);
    }

    // ---- Utilidades de datos ----
    function estudiantesActivos(seccion) {
        return seccion.estudiantes.filter(e => e.activo);
    }

    function estadoDelDia(estudiante, fecha) {
        return estudiante.asistencia[fecha] || null; // null = sin registrar
    }

    function setEstadoDelDia(estudiante, fecha, estado) {
        estudiante.asistencia[fecha] = estado;
    }

    function resumenMes(estudiante, fechaRef) {
        const [anio, mes] = fechaRef.split("-");
        const prefijo = `${anio}-${mes}-`;
        const registros = Object.keys(estudiante.asistencia)
            .filter(f => f.startsWith(prefijo))
            .map(f => estudiante.asistencia[f]);
        const total = registros.length;
        const presentes = registros.filter(r => r === "presente").length;
        const tardias = registros.filter(r => r === "tardia").length;
        const ausentes = registros.filter(r => r === "ausente").length;
        const pct = total ? Math.round(((presentes + tardias) / total) * 100) : null;
        return { total, presentes, tardias, ausentes, pct };
    }

    function fmtPct(n) {
        return n === null || n === undefined ? "—" : `${n}%`;
    }

    function fmtFechaLarga(iso) {
        const [y, m, d] = iso.split("-").map(Number);
        const fecha = new Date(y, m - 1, d);
        return fecha.toLocaleDateString("es-CR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    }

    // ---- Persistencia local de la asistencia registrada ----
    // Nota: en producción esto debe reemplazarse por las llamadas al
    // AsistenciaController (guardar y consultar por fecha en la BD).
    // Mientras tanto, se guarda en localStorage para que la asistencia
    // quede registrada y se pueda consultar al volver a una fecha pasada.
    function cargarAsistenciaGuardada() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function persistirAsistencia() {
        const data = {};
        seccionesData.forEach(s => {
            s.estudiantes.forEach(e => { data[e.id] = e.asistencia; });
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* almacenamiento no disponible: se ignora silenciosamente */ }
    }

    // =========================================================
    // VISTA 1: SECCIONES
    // =========================================================
    function getSeccionesFiltradas() {
        return seccionesData;
    }

    function crearSeccionCard(s, idx) {
        const activos = estudiantesActivos(s);
        const estadosHoy = activos.map(e => estadoDelDia(e, fechaSeleccionada));
        const registrados = estadosHoy.filter(x => x !== null).length;
        const presentesTardias = estadosHoy.filter(x => x === "presente" || x === "tardia").length;
        const pct = registrados ? Math.round((presentesTardias / registrados) * 100) : 0;
        const ausentesHoy = estadosHoy.filter(x => x === "ausente").length;
        const c = colorIndex(s.nombre + idx);

        const card = clonar("tplSeccionCard");
        card.dataset.id = s.id;
        ref(card, "accent").classList.add(`accent--${c}`);
        ref(card, "icon").classList.add(`accent--${c}`);
        ref(card, "nombre").textContent = s.nombre;

        const progreso = ref(card, "progreso");
        progreso.value = Math.max(4, pct);
        progreso.classList.toggle("fill--riesgo", ausentesHoy > 0);

        ref(card, "activos").textContent = `${activos.length} estudiante(s) activo(s)`;
        const chipAusentes = ref(card, "ausentes");
        chipAusentes.textContent = `${ausentesHoy} ausente(s) hoy`;
        chipAusentes.classList.toggle("prom--riesgo", ausentesHoy > 0);

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
    // VISTA 2: ESTUDIANTES ACTIVOS DE UNA SECCIÓN
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

        return estudiantesActivos(seccion).filter(e =>
            !q || e.nombre.toLowerCase().includes(q) || e.cedula.toLowerCase().includes(q));
    }

    // Rellena la mini barra del mes. Los tres <progress> están apilados y usan
    // valores acumulados: ausente (100) > presente + tardía > solo presente.
    function pintarResumenMes(fila, estudiante) {
        const r = resumenMes(estudiante, fechaSeleccionada);
        const hayRegistros = r.total > 0;

        mostrar(ref(fila, "mesSin"), !hayRegistros);
        mostrar(ref(fila, "mesBar"), hayRegistros);
        mostrar(ref(fila, "mesPct"), hayRegistros);
        if (!hayRegistros) return;

        ref(fila, "segTardia").value = ((r.presentes + r.tardias) / r.total) * 100;
        ref(fila, "segPresente").value = (r.presentes / r.total) * 100;

        const pctEl = ref(fila, "mesPct");
        pctEl.textContent = fmtPct(r.pct);
        pctEl.classList.toggle("pct--riesgo", r.pct !== null && r.pct < 80);
    }

    function crearFilaEstudiante(e, idx) {
        const c = colorIndex(e.nombre + idx);
        const fila = clonar("tplEstudianteRow");

        const avatar = ref(fila, "avatar");
        avatar.classList.add(`accent--${c}`);
        avatar.textContent = initials(e.nombre);
        ref(fila, "nombre").textContent = e.nombre;
        ref(fila, "cedula").textContent = e.cedula;

        // Botones de estado (presente / tardía / ausente)
        const actual = estadoDelDia(e, fechaSeleccionada);
        fila.querySelectorAll(".estado-btn").forEach(btn => {
            btn.classList.toggle("is-active", btn.dataset.estado === actual);
            btn.addEventListener("click", () => {
                setEstadoDelDia(e, fechaSeleccionada, btn.dataset.estado);
                persistirAsistencia();
                renderEstudiantes();
            });
        });

        pintarResumenMes(fila, e);

        ref(fila, "verBtn").addEventListener("click", () => openDetailModal(e.id));
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

    function renderPaginacion(totalItems) {
        const totalPaginas = Math.max(1, Math.ceil(totalItems / ESTUDIANTES_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

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
        const inicio = (paginaActual - 1) * ESTUDIANTES_POR_PAGINA;
        const listPagina = listCompleta.slice(inicio, inicio + ESTUDIANTES_POR_PAGINA);

        estudiantesTableBody.replaceChildren(...listPagina.map((e, i) => crearFilaEstudiante(e, inicio + i)));
        estudiantesEmptyState.classList.toggle("is-visible", listCompleta.length === 0);
        estudiantesResultsCount.textContent = `Mostrando ${listPagina.length} de ${listCompleta.length} estudiantes`;

        renderPaginacion(listCompleta.length);
    }

    // ---- Selector de fecha ----
    fechaAsistenciaInput.addEventListener("change", () => {
        fechaSeleccionada = fechaAsistenciaInput.value || hoyISO();
        paginaActual = 1;
        if (vistaActual === "estudiantes") renderEstudiantes();
        else renderSecciones();
    });

    // ---- Buscador (filtra mientras se escribe) ----
    let estudianteSearchTimer;
    estudianteSearchInput.addEventListener("input", () => {
        clearTimeout(estudianteSearchTimer);
        estudianteSearchTimer = setTimeout(() => { estudianteSearch = estudianteSearchInput.value; paginaActual = 1; renderEstudiantes(); }, 200);
    });

    btnVolverSecciones.addEventListener("click", volverASecciones);

    // ---- Marcar todos presentes ----
    document.getElementById("btnMarcarTodosPresentes").addEventListener("click", () => {
        const seccion = getSeccionActual();
        if (!confirm(`¿Marcar como presentes a todos los estudiantes activos de ${seccion.nombre} para el ${fmtFechaLarga(fechaSeleccionada)}?`)) return;
        estudiantesActivos(seccion).forEach(e => setEstadoDelDia(e, fechaSeleccionada, "presente"));
        persistirAsistencia();
        renderEstudiantes();
        showSuccessToast("La asistencia se guardó correctamente");
    });

    // ---- Botón "Guardar asistencia" (único punto donde se confirma el guardado) ----
    btnGuardarAsistencia.addEventListener("click", () => {
        persistirAsistencia();
        showSuccessToast("La asistencia se guardó correctamente");
        // TODO: reemplazar por llamada real al AsistenciaController (POST)
    });

    // =========================================================
    // MODAL: HISTORIAL DE ASISTENCIA
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const historialList = document.getElementById("historialList");
    const historialEmpty = document.getElementById("historialEmpty");
    const histPresentes = document.getElementById("histPresentes");
    const histTardias = document.getElementById("histTardias");
    const histAusentes = document.getElementById("histAusentes");
    const histPct = document.getElementById("histPct");
    let estudianteActualId = null;

    function aplicarBadgeEstado(badge, estado) {
        const es = ESTADOS.find(x => x.key === estado);
        badge.classList.add(es ? `hist-badge--${es.color}` : "hist-badge--sin");
        badge.textContent = es ? es.label : "Sin registrar";
    }

    function crearFilaHistorial(estudiante, fecha) {
        const fila = clonar("tplHistRow");
        ref(fila, "fecha").textContent = fmtFechaLarga(fecha);
        aplicarBadgeEstado(ref(fila, "badge"), estudiante.asistencia[fecha]);
        return fila;
    }

    function renderHistorial() {
        const estudiante = getSeccionActual().estudiantes.find(e => e.id === estudianteActualId);
        const registros = Object.keys(estudiante.asistencia).sort().reverse();

        const total = registros.length;
        const presentes = registros.filter(f => estudiante.asistencia[f] === "presente").length;
        const tardias = registros.filter(f => estudiante.asistencia[f] === "tardia").length;
        const ausentes = registros.filter(f => estudiante.asistencia[f] === "ausente").length;
        const pct = total ? Math.round(((presentes + tardias) / total) * 100) : null;

        histPresentes.textContent = presentes;
        histTardias.textContent = tardias;
        histAusentes.textContent = ausentes;
        histPct.textContent = fmtPct(pct);

        historialList.replaceChildren(...registros.map(f => crearFilaHistorial(estudiante, f)));
        mostrar(historialEmpty, registros.length === 0);
    }

    function openDetailModal(id) {
        const estudiante = getSeccionActual().estudiantes.find(e => e.id === id);
        if (!estudiante) return;

        estudianteActualId = id;
        document.getElementById("detailModalTitle").textContent = estudiante.nombre;
        document.getElementById("detailModalSubtitle").textContent = `Cédula: ${estudiante.cedula} · Sección: ${getSeccionActual().nombre}`;

        renderHistorial();
        detailModal.classList.add("is-open");
    }

    function closeDetailModal() {
        detailModal.classList.remove("is-open");
    }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL (asistencia del día + conteo del mes por estudiante)
    // =========================================================
    document.getElementById("btnExportSeccion").addEventListener("click", async () => {
        const seccion = getSeccionActual();
        const list = getEstudiantesFiltrados();
        if (list.length === 0) { alert("No hay estudiantes para exportar con los filtros actuales."); return; }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Escuela El Valle";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(`Asistencia ${seccion.nombre}`.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });

        // Se agregan las columnas de conteo mensual (Presentes / Tardías / Ausentes)
        // además del estado del día y el porcentaje general.
        const headers = ["Estudiante", "Cédula", "Estado del día", "Presentes (mes)", "Tardías (mes)", "Ausentes (mes)", "% asistencia del mes"];
        const widths = [26, 16, 16, 15, 13, 14, 18];
        const lastCol = String.fromCharCode(64 + headers.length);

        sheet.mergeCells(`A1:${lastCol}1`);
        const titleCell = sheet.getCell("A1");
        titleCell.value = `Escuela El Valle · Asistencia — ${seccion.nombre}`;
        titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
        titleCell.alignment = { vertical: "middle", horizontal: "left" };
        sheet.getRow(1).height = 30;
        sheet.getRow(1).eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF142347" } }; });

        sheet.mergeCells(`A2:${lastCol}2`);
        const subtitleCell = sheet.getCell("A2");
        subtitleCell.value = `Fecha: ${fmtFechaLarga(fechaSeleccionada)} · ${list.length} registro(s)`;
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

        const estadoLabel = { presente: "Presente", tardia: "Tardía", ausente: "Ausente" };
        const PRESENTES_COL = 4, TARDIAS_COL = 5, AUSENTES_COL = 6;

        list.forEach(e => {
            const estado = estadoDelDia(e, fechaSeleccionada);
            const r = resumenMes(e, fechaSeleccionada);
            const fila = [
                e.nombre,
                e.cedula,
                estado ? estadoLabel[estado] : "Sin registrar",
                r.presentes,
                r.tardias,
                r.ausentes,
                fmtPct(r.pct),
            ];
            const row = sheet.addRow(fila);
            row.height = 20;
            row.eachCell((cell, colNumber) => {
                cell.border = { bottom: { style: "hair", color: { argb: "FFE7EAF3" } } };
                cell.alignment = { vertical: "middle", horizontal: colNumber >= PRESENTES_COL && colNumber <= AUSENTES_COL ? "center" : "left", wrapText: true };

                // Resalta cada columna de conteo con el mismo color que su estado.
                if (colNumber === PRESENTES_COL && r.presentes > 0) {
                    cell.font = { bold: true, color: { argb: "FF1A9D5B" } };
                } else if (colNumber === TARDIAS_COL && r.tardias > 0) {
                    cell.font = { bold: true, color: { argb: "FFB9770E" } };
                } else if (colNumber === AUSENTES_COL && r.ausentes > 0) {
                    cell.font = { bold: true, color: { argb: "FFC0392B" } };
                }
            });
        });

        sheet.autoFilter = { from: "A4", to: `${lastCol}4` };
        sheet.columns.forEach((col, i) => { col.width = widths[i] || 16; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, `asistencia_${seccion.nombre.replace(/[^\w]+/g, "_")}_${fechaSeleccionada}.xlsx`);
    });

    // ---- Inicial ----
    actualizarVista();
})();