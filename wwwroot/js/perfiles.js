
(function () {
    "use strict";

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

    // ---- Referencias DOM ----
    const tbody = document.getElementById("padresTableBody");
    const emptyState = document.getElementById("emptyState");
    const resultsCount = document.getElementById("resultsCount");
    const searchInput = document.getElementById("searchInput");
    const seccionFilter = document.getElementById("seccionFilter");

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    // ---- Poblar el filtro de secciones a partir de los hijos registrados ----
    function refreshSeccionOptions() {
        const secciones = [...new Set(padresData.flatMap(p => p.hijos).map(h => h.seccion))].sort();
        seccionFilter.innerHTML = '<option value="todos">Todas</option>';
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

    function padreRowHtml(p) {
        return `
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${initials(p.nombre)}</div>
                    <span class="user-cell__name">${p.nombre}</span>
                </div>
            </td>
            <td>${p.cedula}</td>
            <td>${p.telefono}</td>
            <td>${p.correo}</td>
            <td>
                <span class="children-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 9 12 5 2 9l10 4 10-4Z" /><path d="M6 11v4c0 1.5 2.7 3.5 6 3.5s6-2 6-3.5v-4" /></svg>
                    ${p.hijos.length} hijo(s)
                </span>
            </td>
            <td>
                <div class="row-actions">
                    <button class="row-action-btn view-btn" data-id="${p.id}" title="Ver detalle" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>
            </td>`;
    }

    function render() {
        const list = getFiltered();
        tbody.innerHTML = "";

        list.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = padreRowHtml(p);
            tbody.appendChild(tr);
        });

        emptyState.style.display = list.length === 0 ? "block" : "none";
        resultsCount.textContent = `Mostrando ${list.length} de ${padresData.length} padres`;

        tbody.querySelectorAll(".view-btn").forEach(el => {
            el.addEventListener("click", () => openDetailModal(parseInt(el.dataset.id, 10)));
        });
    }

    // ---- Filtros del panel lateral ----
    document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
        currentSearch = searchInput.value;
        currentSeccion = seccionFilter.value;
        render();
    });

    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        currentSearch = "";
        currentSeccion = "todos";
        searchInput.value = "";
        seccionFilter.value = "todos";
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
    // MODAL VER DETALLE
    // =========================================================
    const detailModal = document.getElementById("detailModal");
    const detailModalInfo = document.getElementById("detailModalInfo");
    const detailModalChildren = document.getElementById("detailModalChildren");

    function detailRow(label, value) {
        return `<div class="detail-row"><span class="d-label">${label}</span><span class="d-value">${value}</span></div>`;
    }

    function childCardHtml(h) {
        return `
            <div class="child-card">
                <div class="child-card__info">
                    <span class="child-card__name">${h.nombre}</span>
                    <span class="child-card__meta">${h.cedula} · ${h.seccion}</span>
                </div>
                <span class="status-pill ${h.activo ? "status-pill--activo" : "status-pill--inactivo"}">
                    ${h.activo ? "Activo" : "Inactivo"}
                </span>
            </div>`;
    }

    function openDetailModal(id) {
        const p = padresData.find(x => x.id === id);
        if (!p) return;

        document.getElementById("detailModalTitle").textContent = p.nombre;
        document.getElementById("detailModalSubtitle").textContent = `${p.hijos.length} hijo(s) registrado(s)`;

        detailModalInfo.innerHTML = [
            detailRow("Cédula", p.cedula),
            detailRow("Celular", p.telefono),
            detailRow("Correo", p.correo),
        ].join("");

        detailModalChildren.innerHTML = p.hijos.map(childCardHtml).join("");

        detailModal.classList.add("is-open");
    }

    function closeDetailModal() { detailModal.classList.remove("is-open"); }

    document.getElementById("detailModalCloseBtn").addEventListener("click", closeDetailModal);
    document.getElementById("detailModalCloseBtn2").addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

    // =========================================================
    // EXPORTAR A EXCEL
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
