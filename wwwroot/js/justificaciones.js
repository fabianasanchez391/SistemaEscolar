(function () {
    "use strict";

    // ---- Configuración ----
    const STORAGE_KEY = "justificaciones_v1";
    const POR_PAGINA = 6;
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    const EXTENSIONES = ["pdf", "jpg", "jpeg", "png", "webp"];
    const REQUIERE_ADJUNTO = false; // cámbielo a true si el comprobante debe ser obligatorio

    const ESTADOS = {
        pendiente: "Pendiente",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
    };

    // Estudiantes de ejemplo para autocompletar el nombre al escribir la cédula.
    // En producción: consultar al controlador (GET /Estudiantes/BuscarPorCedula?cedula=...).
    const ESTUDIANTES = [
        { cedula: "1-0543-5678", nombre: "Emiliano Castro", seccion: "1° - Grupo A" },
        { cedula: "1-0543-9911", nombre: "Sofía Castro", seccion: "1° - Grupo A" },
        { cedula: "1-0765-3456", nombre: "Diego Rojas", seccion: "1° - Grupo B" },
        { cedula: "1-0876-2345", nombre: "María Rodríguez", seccion: "4° - Grupo A" },
        { cedula: "1-0987-1234", nombre: "Carlos Jiménez", seccion: "4° - Grupo A" },
        { cedula: "1-0654-4567", nombre: "Valentina Méndez", seccion: "4° - Grupo A" },
        { cedula: "1-0322-7788", nombre: "Ana Fernández", seccion: "5° - Grupo A" },
    ];

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

    const $ = id => document.getElementById(id);

    // ---- Utilidades generales ----
    function pad(n) { return String(n).padStart(2, "0"); }

    function isoDeFecha(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function hoyISO() { return isoDeFecha(new Date()); }

    function diasAtrasISO(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return isoDeFecha(d);
    }

    function colorIndex(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        return hash % 6;
    }

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    function fmtFechaLarga(iso) {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("es-CR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    }

    function fmtFechaCorta(iso) {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("es-CR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    }

    function fmtFechaHora(isoDateTime) {
        return new Date(isoDateTime).toLocaleString("es-CR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function fmtTamano(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    function esImagen(tipo) { return typeof tipo === "string" && tipo.startsWith("image/"); }

    function extension(nombre) {
        const i = nombre.lastIndexOf(".");
        return i === -1 ? "" : nombre.slice(i + 1).toLowerCase();
    }

    function dataUrlABlobUrl(dataUrl) {
        const [meta, b64] = dataUrl.split(",");
        const mime = meta.match(/:(.*?);/)[1];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: mime }));
    }

    // ---- Datos ----
    function datosEjemplo() {
        const ahora = Date.now();
        return [
            {
                id: 3, cedula: "1-0987-1234", nombre: "Carlos Jiménez", fecha: diasAtrasISO(9),
                texto: "Estuvo con fiebre y su pediatra le indicó reposo por dos días. Se adjunta la incapacidad médica.",
                estado: "pendiente", enviada: new Date(ahora - 3 * 86400000).toISOString(),
                archivo: { name: "incapacidad_carlos.pdf", type: "application/pdf", size: 184320, dataUrl: null },
            },
            {
                id: 2, cedula: "1-0543-9911", nombre: "Sofía Castro", fecha: diasAtrasISO(14),
                texto: "Cita médica programada con anterioridad en la clínica del área de salud.",
                estado: "aprobada", enviada: new Date(ahora - 8 * 86400000).toISOString(), archivo: null,
            },
            {
                id: 1, cedula: "1-0322-7788", nombre: "Ana Fernández", fecha: diasAtrasISO(20),
                texto: "Problemas de transporte por el cierre de la ruta principal debido al deslizamiento.",
                estado: "rechazada", enviada: new Date(ahora - 15 * 86400000).toISOString(), archivo: null,
            },
        ];
    }

    function cargar() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignorar */ }
        return datosEjemplo();
    }

    // Nota: en producción reemplazar por llamadas al JustificacionesController
    // (POST con multipart/form-data para el archivo y GET para el listado).
    function persistir() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(justificaciones));
        } catch (e) {
            // Si el archivo es muy pesado para localStorage, se guarda sin el contenido del adjunto.
            try {
                const liviano = justificaciones.map(j => j.archivo ? { ...j, archivo: { ...j.archivo, dataUrl: null } } : j);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(liviano));
            } catch (e2) { /* almacenamiento no disponible */ }
        }
    }

    let justificaciones = cargar();

    // ---- Estado ----
    let filtroEstado = "todas";
    let busqueda = "";
    let paginaActual = 1;
    let archivoActual = null; // { name, type, size, dataUrl }
    let nuevaId = null;

    // ---- Referencias DOM ----
    const form = $("justForm");
    const inCedula = $("justCedula");
    const inNombre = $("justNombre");
    const inFecha = $("justFecha");
    const inTexto = $("justTexto");
    const inArchivo = $("justArchivo");
    const contador = $("justContador");
    const cedulaHint = $("justCedulaHint");
    const dropzone = $("dropzone");
    const filePreview = $("filePreview");
    const errorBox = $("justError");
    const tbody = $("justTableBody");
    const justPagination = $("justPagination");

    inFecha.max = hoyISO();

    // ---- Toast ----
    const successToast = $("successToast");
    let toastTimer;
    function showSuccessToast(msg) {
        clearTimeout(toastTimer);
        $("successToastText").textContent = msg;
        successToast.classList.add("is-open");
        toastTimer = setTimeout(() => successToast.classList.remove("is-open"), 1800);
    }

    // =========================================================
    // FORMULARIO
    // =========================================================
    function mostrarError(msg, campo) {
        errorBox.textContent = msg;
        mostrar(errorBox, true);
        [inCedula, inNombre, inFecha, inTexto].forEach(el => el.classList.remove("is-invalid"));
        if (campo) { campo.classList.add("is-invalid"); campo.focus(); }
    }

    function limpiarError() {
        mostrar(errorBox, false);
        [inCedula, inNombre, inFecha, inTexto].forEach(el => el.classList.remove("is-invalid"));
    }

    // Autocompletar el nombre según la cédula
    inCedula.addEventListener("input", () => {
        const ced = inCedula.value.trim();
        const est = ESTUDIANTES.find(e => e.cedula === ced);
        if (est) {
            inNombre.value = est.nombre;
            cedulaHint.textContent = `Estudiante encontrado · ${est.seccion}`;
            cedulaHint.classList.add("is-ok");
        } else {
            cedulaHint.textContent = ced.length >= 6 ? "No se encontró en el registro; escriba el nombre manualmente." : "";
            cedulaHint.classList.remove("is-ok");
        }
    });

    inTexto.addEventListener("input", () => { contador.textContent = inTexto.value.length; });
    [inCedula, inNombre, inFecha, inTexto].forEach(el => el.addEventListener("input", limpiarError));

    // ---- Archivo adjunto ----
    function renderPreviewArchivo() {
        if (!archivoActual) {
            filePreview.replaceChildren();
            mostrar(filePreview, false);
            return;
        }

        const preview = clonar("tplFilePreview");
        const imagen = esImagen(archivoActual.type);

        const thumbImg = ref(preview, "thumbImg");
        mostrar(thumbImg, imagen);
        if (imagen) thumbImg.src = archivoActual.dataUrl;
        mostrar(ref(preview, "thumbPdf"), !imagen);

        ref(preview, "nombre").textContent = archivoActual.name;
        ref(preview, "tamano").textContent = fmtTamano(archivoActual.size);
        ref(preview, "quitar").addEventListener("click", () => {
            archivoActual = null;
            inArchivo.value = "";
            renderPreviewArchivo();
        });

        filePreview.replaceChildren(preview);
        mostrar(filePreview, true);
    }

    function procesarArchivo(file) {
        if (!file) return;
        const ext = extension(file.name);
        const tipoOk = file.type === "application/pdf" || file.type.startsWith("image/");
        if (!EXTENSIONES.includes(ext) || !tipoOk) {
            mostrarError("Formato no permitido. Suba un PDF o una imagen (JPG, PNG o WEBP).");
            inArchivo.value = "";
            return;
        }
        if (file.size > MAX_BYTES) {
            mostrarError(`El archivo pesa ${fmtTamano(file.size)}. El máximo permitido es 5 MB.`);
            inArchivo.value = "";
            return;
        }
        limpiarError();
        const reader = new FileReader();
        reader.onload = () => {
            archivoActual = { name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
            renderPreviewArchivo();
        };
        reader.onerror = () => mostrarError("No se pudo leer el archivo. Intente de nuevo.");
        reader.readAsDataURL(file);
    }

    dropzone.addEventListener("click", () => inArchivo.click());
    dropzone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inArchivo.click(); } });
    inArchivo.addEventListener("change", () => procesarArchivo(inArchivo.files[0]));

    ["dragenter", "dragover"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove("is-dragover"); }));
    dropzone.addEventListener("drop", e => procesarArchivo(e.dataTransfer.files[0]));

    // ---- Limpiar ----
    function limpiarFormulario() {
        form.reset();
        archivoActual = null;
        renderPreviewArchivo();
        contador.textContent = "0";
        cedulaHint.textContent = "";
        cedulaHint.classList.remove("is-ok");
        limpiarError();
    }

    // ---- Ventana (modal) de nueva justificación ----
    const formModal = $("formModal");

    function abrirFormulario() {
        limpiarError();
        formModal.classList.add("is-open");
        setTimeout(() => inCedula.focus(), 50);
    }

    function cerrarFormulario() {
        formModal.classList.remove("is-open");
        limpiarFormulario();
    }

    $("btnNuevaJustificacion").addEventListener("click", abrirFormulario);
    $("formModalCloseBtn").addEventListener("click", cerrarFormulario);
    $("btnCancelar").addEventListener("click", cerrarFormulario);

    // ---- Enviar ----
    form.addEventListener("submit", e => {
        e.preventDefault();

        const cedula = inCedula.value.trim();
        const nombre = inNombre.value.trim().replace(/\s+/g, " ");
        const fecha = inFecha.value;
        const texto = inTexto.value.trim();

        if (!cedula) return mostrarError("Ingrese la cédula del estudiante.", inCedula);
        if (!/^[\d-]{5,20}$/.test(cedula)) return mostrarError("La cédula solo puede contener números y guiones.", inCedula);
        if (!nombre) return mostrarError("Ingrese el nombre del estudiante.", inNombre);
        if (!fecha) return mostrarError("Seleccione el día que faltó el estudiante.", inFecha);
        if (fecha > hoyISO()) return mostrarError("El día de la ausencia no puede ser una fecha futura.", inFecha);

        const [y, m, d] = fecha.split("-").map(Number);
        const dia = new Date(y, m - 1, d).getDay();
        if (dia === 0 || dia === 6) return mostrarError("La fecha seleccionada es fin de semana; elija un día lectivo.", inFecha);

        if (texto.length < 10) return mostrarError("Escriba una justificación de al menos 10 caracteres.", inTexto);
        if (REQUIERE_ADJUNTO && !archivoActual) return mostrarError("Debe adjuntar el comprobante (PDF o imagen).");

        const duplicada = justificaciones.some(j => j.cedula === cedula && j.fecha === fecha && j.estado !== "rechazada");
        if (duplicada) return mostrarError("Ya existe una justificación para este estudiante en ese día.", inFecha);

        const id = justificaciones.reduce((max, j) => Math.max(max, j.id), 0) + 1;
        justificaciones.unshift({
            id, cedula, nombre, fecha, texto,
            estado: "pendiente",
            enviada: new Date().toISOString(),
            archivo: archivoActual ? { ...archivoActual } : null,
        });
        persistir();

        // Mostrar la justificación recién enviada junto con las demás
        filtroEstado = "todas";
        busqueda = "";
        paginaActual = 1;
        nuevaId = id;
        $("justSearchInput").value = "";

        cerrarFormulario();
        render();
        showSuccessToast("La justificación se envió correctamente");
    });

    // =========================================================
    // LISTADO
    // =========================================================
    function filtradas() {
        const q = busqueda.trim().toLowerCase();
        return justificaciones
            .filter(j => filtroEstado === "todas" || j.estado === filtroEstado)
            .filter(j => !q || j.nombre.toLowerCase().includes(q) || j.cedula.toLowerCase().includes(q))
            .sort((a, b) => b.enviada.localeCompare(a.enviada));
    }

    function actualizarChips() {
        const cuenta = est => justificaciones.filter(j => est === "todas" || j.estado === est).length;
        $("chipTodas").textContent = cuenta("todas");
        $("chipPendiente").textContent = cuenta("pendiente");
        $("chipAprobada").textContent = cuenta("aprobada");
        $("chipRechazada").textContent = cuenta("rechazada");
        document.querySelectorAll("#estadoChips .chip").forEach(c => c.classList.toggle("is-active", c.dataset.estado === filtroEstado));
    }

    function crearFila(j, idx) {
        const fila = clonar("tplJustRow");
        const c = colorIndex(j.nombre + idx);

        fila.dataset.id = j.id;
        fila.classList.toggle("is-new", j.id === nuevaId);

        const avatar = ref(fila, "avatar");
        avatar.classList.add(`accent--${c}`);
        avatar.textContent = initials(j.nombre);
        ref(fila, "nombre").textContent = j.nombre;
        ref(fila, "cedula").textContent = j.cedula;
        ref(fila, "fecha").textContent = fmtFechaCorta(j.fecha);

        const texto = ref(fila, "texto");
        texto.textContent = j.texto;
        texto.title = j.texto;

        // Adjunto: etiqueta con tipo de archivo o "Sin adjunto"
        const tieneAdjunto = !!j.archivo;
        mostrar(ref(fila, "adjuntoSi"), tieneAdjunto);
        mostrar(ref(fila, "adjuntoNo"), !tieneAdjunto);
        if (tieneAdjunto) {
            ref(fila, "adjuntoSi").title = j.archivo.name;
            ref(fila, "adjuntoTipo").textContent = esImagen(j.archivo.type) ? "Imagen" : "PDF";
        }

        const estado = ref(fila, "estado");
        estado.textContent = ESTADOS[j.estado];
        estado.classList.add(`hist-badge--${j.estado}`);

        // Acciones: aprobar/rechazar solo si el estado actual lo permite
        const btnAprobar = ref(fila, "aprobar");
        const btnRechazar = ref(fila, "rechazar");
        mostrar(btnAprobar, j.estado !== "aprobada");
        mostrar(btnRechazar, j.estado !== "rechazada");

        ref(fila, "ver").addEventListener("click", () => abrirDetalle(j));

        btnAprobar.addEventListener("click", () => {
            j.estado = "aprobada";
            persistir();
            render();
        });

        btnRechazar.addEventListener("click", () => {
            if (!confirm(`¿Rechazar la justificación de ${j.nombre} del ${fmtFechaLarga(j.fecha)}?`)) return;
            j.estado = "rechazada";
            persistir();
            render();
        });

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

        justPagination.replaceChildren(...nodos);
    }

    function render() {
        actualizarChips();
        const lista = filtradas();

        // Si la página actual quedó fuera de rango, se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * POR_PAGINA;
        const pagina = lista.slice(inicio, inicio + POR_PAGINA);

        tbody.replaceChildren(...pagina.map((j, i) => crearFila(j, inicio + i)));
        $("justEmptyState").classList.toggle("is-visible", lista.length === 0);
        $("justCountInfo").textContent = `Mostrando ${pagina.length} de ${lista.length} justificaciones`;
        $("justResultsTag").textContent = `${justificaciones.length} justificación(es) en total`;

        renderPaginacion(totalPaginas);
        nuevaId = null;
    }

    // Filtros
    $("estadoChips").addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        filtroEstado = chip.dataset.estado;
        paginaActual = 1;
        render();
    });

    let searchTimer;
    $("justSearchInput").addEventListener("input", e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { busqueda = e.target.value; paginaActual = 1; render(); }, 200);
    });

    // =========================================================
    // MODAL DE DETALLE
    // =========================================================
    const detailModal = $("detailModal");
    const detailBody = $("detailBody");

    // Comprobante: imagen, PDF o mensaje según lo que haya disponible.
    function crearComprobante(j) {
        if (!j.archivo) {
            const vacio = clonar("tplDetalleMuted");
            vacio.textContent = "No se adjuntó comprobante.";
            return vacio;
        }

        if (!j.archivo.dataUrl) {
            const noDisponible = clonar("tplDetalleMuted");
            noDisponible.textContent = `Comprobante: ${j.archivo.name} (${fmtTamano(j.archivo.size)}) — el archivo no está disponible en esta sesión.`;
            return noDisponible;
        }

        if (esImagen(j.archivo.type)) {
            const img = clonar("tplDetalleImg");
            img.src = j.archivo.dataUrl;
            img.alt = `Comprobante de ${j.nombre}`;
            return img;
        }

        const pdf = clonar("tplDetallePdf");
        ref(pdf, "nombre").textContent = j.archivo.name;
        ref(pdf, "info").textContent = `${fmtTamano(j.archivo.size)} · PDF`;
        ref(pdf, "abrir").addEventListener("click", () => window.open(dataUrlABlobUrl(j.archivo.dataUrl), "_blank", "noopener"));
        return pdf;
    }

    function abrirDetalle(j) {
        $("detailModalTitle").textContent = j.nombre;
        $("detailModalSubtitle").textContent = `Cédula: ${j.cedula}`;

        const contenido = clonar("tplDetalle");
        ref(contenido, "fecha").textContent = fmtFechaLarga(j.fecha);
        ref(contenido, "enviada").textContent = fmtFechaHora(j.enviada);
        ref(contenido, "texto").textContent = j.texto;

        const estado = ref(contenido, "estado");
        estado.textContent = ESTADOS[j.estado];
        estado.classList.add(`hist-badge--${j.estado}`);

        ref(contenido, "comprobante").replaceChildren(crearComprobante(j));

        detailBody.replaceChildren(contenido);
        detailModal.classList.add("is-open");
    }

    function cerrarDetalle() { detailModal.classList.remove("is-open"); }

    $("detailModalCloseBtn").addEventListener("click", cerrarDetalle);
    $("detailModalCloseBtn2").addEventListener("click", cerrarDetalle);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) cerrarDetalle(); });
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        if (detailModal.classList.contains("is-open")) cerrarDetalle();
        else if (formModal.classList.contains("is-open")) cerrarFormulario();
    });

    // ---- Inicial ----
    render();
})();