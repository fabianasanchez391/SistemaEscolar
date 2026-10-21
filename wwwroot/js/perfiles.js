(function () {
    "use strict";

    // Cantidad de padres por página (igual que en el módulo de asistencia)
    const PADRES_POR_PAGINA = 6;

    // ---- Utilidades de DOM (las plantillas viven en el .cshtml) ----
    // Clona el primer elemento de un <template>.
    function clonar(idTemplate) {
        return document.getElementById(idTemplate).content.firstElementChild.cloneNode(true);
    }

    // Busca dentro de una plantilla clonada el elemento marcado con data-ref="nombre".
    function ref(raiz, nombre) {
        return raiz.querySelector(`[data-ref="${nombre}"]`);
    }

    // ---- Datos de ejemplo ----
    // Cada padre agrupa a sus hijos con la sección en la que están matriculados.
    let padresData = [
        {
            id: 1,
            cedula: "1-0400-1122",
            nombre: "Ana Jiménez",
            telefono: "8811-2233",
            correo: "ana.jimenez@correo.com",
            hijos: [
                { nombre: "Carlos Jiménez", cedula: "1-0987-1234", seccion: "5° - Grupo A", activo: true },
            ],
        },
        {
            id: 2,
            cedula: "1-0355-9087",
            nombre: "Karla Méndez",
            telefono: "8877-1100",
            correo: "karla.mendez@correo.com",
            hijos: [
                { nombre: "Valentina Méndez", cedula: "1-0654-4567", seccion: "5° - Grupo A", activo: true },
            ],
        },
        {
            id: 3,
            cedula: "1-0512-3344",
            nombre: "Jorge Rodríguez",
            telefono: "8822-5566",
            correo: "jorge.rodriguez@correo.com",
            hijos: [
                { nombre: "María Rodríguez", cedula: "1-0876-2345", seccion: "4° - Grupo A", activo: true },
            ],
        },
        {
            id: 4,
            cedula: "1-0699-8877",
            nombre: "Paola Solano",
            telefono: "8899-4433",
            correo: "paola.solano@correo.com",
            hijos: [
                { nombre: "Diego Rojas", cedula: "1-0765-3456", seccion: "4° - Grupo A", activo: false },
            ],
        },
        {
            id: 5,
            cedula: "1-0288-6611",
            nombre: "Luis Castro",
            telefono: "8844-7722",
            correo: "luis.castro@correo.com",
            hijos: [
                { nombre: "Emiliano Castro", cedula: "1-0543-5678", seccion: "1° - Grupo B", activo: true },
                { nombre: "Sofía Castro", cedula: "1-0543-9911", seccion: "1° - Grupo B", activo: true },
            ],
        },
    ];

    // ---- Estado ----
    let currentSearch = "";
    let currentSeccion = "todos";
    let paginaActual = 1;

    // ---- Referencias DOM ----
    const tbody = document.getElementById("padresTableBody");
    const emptyState = document.getElementById("emptyState");
    const padresResultsCount = document.getElementById("padresResultsCount");
    const padresPagination = document.getElementById("padresPagination");
    const searchInput = document.getElementById("searchInput");
    const seccionFilter = document.getElementById("seccionFilter");

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    // ---- Poblar el filtro de secciones a partir de los hijos registrados ----
    function refreshSeccionOptions() {
        const secciones = [...new Set(padresData.flatMap(p => p.hijos).map(h => h.seccion))].sort();
        seccionFilter.replaceChildren();
        seccionFilter.add(new Option("Todas", "todos"));
        secciones.forEach(s => seccionFilter.add(new Option(s, s)));
    }

    // ---- Filtro combinado ----
    // La búsqueda es solo por nombre o cédula, del padre o de sus hijos.
    function getFiltered() {
        const q = currentSearch.trim().toLowerCase();
        return padresData.filter(p => {
            const matchSeccion = currentSeccion === "todos" || p.hijos.some(h => h.seccion === currentSeccion);

            const matchSearch = !q ||
                p.nombre.toLowerCase().includes(q) ||
                p.cedula.toLowerCase().includes(q) ||
                p.hijos.some(h => h.nombre.toLowerCase().includes(q) || h.cedula.toLowerCase().includes(q));

            return matchSeccion && matchSearch;
        });
    }

    // ---- Fila de la tabla ----
    function crearFilaPadre(p) {
        const fila = clonar("tplPadreRow");

        ref(fila, "avatar").textContent = initials(p.nombre);
        ref(fila, "nombre").textContent = p.nombre;
        ref(fila, "cedula").textContent = p.cedula;
        ref(fila, "telefono").textContent = p.telefono;
        ref(fila, "correo").textContent = p.correo;
        ref(fila, "hijos").textContent = `${p.hijos.length} hijo(s)`;

        ref(fila, "viewBtn").addEventListener("click", () => openDetailModal(p.id));

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

        padresPagination.replaceChildren(...nodos);
    }

    function render() {
        const listCompleta = getFiltered();

        // Si la página actual quedó fuera de rango, se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(listCompleta.length / PADRES_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * PADRES_POR_PAGINA;
        const listPagina = listCompleta.slice(inicio, inicio + PADRES_POR_PAGINA);

        tbody.replaceChildren(...listPagina.map(crearFilaPadre));
        emptyState.classList.toggle("is-visible", listCompleta.length === 0);
        padresResultsCount.textContent = `Mostrando ${listPagina.length} de ${listCompleta.length} padres`;

        renderPaginacion(totalPaginas);
    }

    // ---- Barra de filtros ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        currentSearch = searchInput.value;
        currentSeccion = seccionFilter.value;
        paginaActual = 1;
        render();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        currentSearch = "";
        currentSeccion = "todos";
        paginaActual = 1;
        searchInput.value = "";
        seccionFilter.value = "todos";
        render();
    });

    let searchTimer;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentSearch = searchInput.value; paginaActual = 1; render(); }, 200);
    });

    // =========================================================
    // MODAL VER DETALLE
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const detailModalInfo = document.getElementById("detailModalInfo");
    const detailModalChildren = document.getElementById("detailModalChildren");

    function crearFilaDetalle(label, value) {
        const fila = clonar("tplDetalleRow");
        ref(fila, "label").textContent = label;
        ref(fila, "value").textContent = value;
        return fila;
    }

    function crearTarjetaHijo(h) {
        const card = clonar("tplHijoCard");
        ref(card, "nombre").textContent = h.nombre;
        ref(card, "meta").textContent = `${h.cedula} · ${h.seccion}`;

        const estado = ref(card, "estado");
        estado.classList.add(h.activo ? "status-pill--activo" : "status-pill--inactivo");
        estado.textContent = h.activo ? "Activo" : "Inactivo";

        return card;
    }

    function openDetailModal(id) {
        const p = padresData.find(x => x.id === id);
        if (!p) return;

        document.getElementById("detailModalTitle").textContent = p.nombre;
        document.getElementById("detailModalSubtitle").textContent = `${p.hijos.length} hijo(s) registrado(s)`;

        const filas = [
            ["Cédula", p.cedula],
            ["Celular", p.telefono],
            ["Correo", p.correo],
        ];

        detailModalInfo.replaceChildren(...filas.map(([label, value]) => crearFilaDetalle(label, value)));
        detailModalChildren.replaceChildren(...p.hijos.map(crearTarjetaHijo));

        detailModal.classList.add("is-open");
    }

    function closeDetailModal() { detailModal.classList.remove("is-open"); }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL
    // Exporta TODOS los padres filtrados, no solo los de la página visible.
    // =========================================================
    document.getElementById("btnExport").addEventListener("click", async () => {
        const list = getFiltered();
        if (list.length === 0) { alert("No hay padres para exportar con los filtros actuales."); return; }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Escuela El Valle";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Escuela El Valle · Reporte de Padres", { views: [{ state: "frozen", ySplit: 4 }] });
        const headers = ["Padre o encargado", "Cédula", "Celular", "Correo electrónico", "Hijos registrados"];
        const widths = [26, 16, 14, 30, 40];
        const lastCol = String.fromCharCode(64 + headers.length);

        // ---- Título ----
        sheet.mergeCells(`A1:${lastCol}1`);
        const titleCell = sheet.getCell("A1");
        titleCell.value = "Escuela El Valle · Reporte de Padres";
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
        list.forEach(p => {
            const hijosTexto = p.hijos.map(h => `${h.nombre} (${h.seccion})`).join("; ");
            const row = sheet.addRow([p.nombre, p.cedula, p.telefono, p.correo, hijosTexto]);
            row.height = 20;
            row.eachCell(cell => {
                cell.border = { bottom: { style: "hair", color: { argb: "FFE7EAF3" } } };
                cell.alignment = { vertical: "middle", wrapText: true };
            });
        });

        sheet.autoFilter = { from: "A4", to: `${lastCol}4` };
        sheet.columns.forEach((col, i) => { col.width = widths[i] || 18; });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, `padres_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    // ---- Inicial ----
    refreshSeccionOptions();
    render();
})();