(function () {
    "use strict";

    // ---- Configuración ----
    const STORAGE_KEY = "boletas_v1";
    const POR_PAGINA = 6;

    // Tipos de boleta según los puntos que se rebajan (0 = solo aviso).
    // "clase" se usa para el color de la etiqueta (ver .tipo-badge--* en el CSS).
    const TIPOS = {
        0: { label: "Aviso", clase: "aviso" },
        5: { label: "-5 puntos", clase: "5" },
        10: { label: "-10 puntos", clase: "10" },
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

    // ---- Datos ----
    // Cada boleta: { id, cedula, nombre, seccion, fecha, texto, puntos (0|5|10), enviada, visto, vistoEn }
    function datosEjemplo() {
        const ahora = Date.now();
        return [
            {
                id: 4, cedula: "1-0987-1234", nombre: "Carlos Jiménez", seccion: "4° - Grupo A", fecha: diasAtrasISO(1),
                texto: "Interrumpió la lección varias veces y no atendió las indicaciones de la docente.",
                puntos: 0, enviada: new Date(ahora - 1 * 86400000).toISOString(), visto: false, vistoEn: null,
            },
            {
                id: 3, cedula: "1-0765-3456", nombre: "Diego Rojas", seccion: "1° - Grupo B", fecha: diasAtrasISO(4),
                texto: "Se agarró a empujones con un compañero durante el recreo.",
                puntos: 10, enviada: new Date(ahora - 4 * 86400000).toISOString(), visto: true, vistoEn: new Date(ahora - 3 * 86400000).toISOString(),
            },
            {
                id: 2, cedula: "1-0322-7788", nombre: "Ana Fernández", seccion: "5° - Grupo A", fecha: diasAtrasISO(7),
                texto: "Utilizó el celular en clase después de habérsele indicado que lo guardara.",
                puntos: 5, enviada: new Date(ahora - 7 * 86400000).toISOString(), visto: false, vistoEn: null,
            },
            {
                id: 1, cedula: "1-0543-9911", nombre: "Sofía Castro", seccion: "1° - Grupo A", fecha: diasAtrasISO(12),
                texto: "Llegó tarde por tercera vez en la semana sin justificación.",
                puntos: 0, enviada: new Date(ahora - 12 * 86400000).toISOString(), visto: true, vistoEn: new Date(ahora - 10 * 86400000).toISOString(),
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

    // Nota: en producción reemplazar por llamadas al BoletasController
    // (POST para registrar, PUT para marcar como vista, GET para el listado).
    function persistir() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(boletas));
        } catch (e) { /* almacenamiento no disponible */ }
    }

    let boletas = cargar();

    // ---- Estado ----
    let rol = "docente"; // "docente" | "padre"  (solo demostración; en producción viene del inicio de sesión)
    let filtroEstado = "todas";
    let busqueda = "";
    let paginaActual = 1;
    let nuevaId = null;
    let detalleActual = null;

    // ---- Referencias DOM ----
    const form = $("bolForm");
    const inCedula = $("bolCedula");
    const inNombre = $("bolNombre");
    const inFecha = $("bolFecha");
    const inTexto = $("bolTexto");
    const contador = $("bolContador");
    const cedulaHint = $("bolCedulaHint");
    const errorBox = $("bolError");
    const tbody = $("bolTableBody");
    const bolPagination = $("bolPagination");
    const btnNuevaBoleta = $("btnNuevaBoleta");

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

    function limpiarFormulario() {
        form.reset(); // también devuelve el tipo de boleta a "Aviso"
        contador.textContent = "0";
        cedulaHint.textContent = "";
        cedulaHint.classList.remove("is-ok");
        limpiarError();
    }

    // ---- Ventana (modal) de nueva boleta ----
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

    btnNuevaBoleta.addEventListener("click", abrirFormulario);
    $("formModalCloseBtn").addEventListener("click", cerrarFormulario);
    $("btnCancelar").addEventListener("click", cerrarFormulario);

    // ---- Registrar ----
    form.addEventListener("submit", e => {
        e.preventDefault();

        const cedula = inCedula.value.trim();
        const nombre = inNombre.value.trim().replace(/\s+/g, " ");
        const fecha = inFecha.value;
        const texto = inTexto.value.trim();
        const tipoSeleccionado = form.querySelector('input[name="boletaTipo"]:checked');
        const puntos = tipoSeleccionado ? parseInt(tipoSeleccionado.value, 10) : 0;

        if (!cedula) return mostrarError("Ingrese la cédula del estudiante.", inCedula);
        if (!/^[\d-]{5,20}$/.test(cedula)) return mostrarError("La cédula solo puede contener números y guiones.", inCedula);
        if (!nombre) return mostrarError("Ingrese el nombre del estudiante.", inNombre);
        if (!fecha) return mostrarError("Seleccione la fecha del incidente.", inFecha);
        if (fecha > hoyISO()) return mostrarError("La fecha del incidente no puede ser futura.", inFecha);
        if (texto.length < 10) return mostrarError("Describa lo que hizo el estudiante (mínimo 10 caracteres).", inTexto);
        if (!(puntos in TIPOS)) return mostrarError("Seleccione el tipo de boleta.");

        const est = ESTUDIANTES.find(x => x.cedula === cedula);
        const id = boletas.reduce((max, b) => Math.max(max, b.id), 0) + 1;

        boletas.unshift({
            id, cedula, nombre, fecha, texto, puntos,
            seccion: est ? est.seccion : "",
            enviada: new Date().toISOString(),
            visto: false,
            vistoEn: null,
        });
        persistir();

        // Mostrar la boleta recién registrada junto con las demás
        filtroEstado = "todas";
        busqueda = "";
        paginaActual = 1;
        nuevaId = id;
        $("bolSearchInput").value = "";

        cerrarFormulario();
        render();
        showSuccessToast("La boleta se registró correctamente");
    });

    // =========================================================
    // ACCIONES SOBRE UNA BOLETA
    // =========================================================
    // El padre marca la boleta como vista; el docente ve la fecha y hora en que ocurrió.
    function marcarVista(boleta) {
        boleta.visto = true;
        boleta.vistoEn = new Date().toISOString();
        persistir();
        render();
        showSuccessToast("La boleta se marcó como vista");
    }

    function eliminarBoleta(boleta) {
        if (!confirm(`¿Eliminar la boleta de ${boleta.nombre} del ${fmtFechaLarga(boleta.fecha)}?`)) return;
        boletas = boletas.filter(b => b.id !== boleta.id);
        persistir();
        render();
    }

    // =========================================================
    // LISTADO
    // =========================================================
    function filtradas() {
        const q = busqueda.trim().toLowerCase();
        return boletas
            .filter(b => filtroEstado === "todas" || (filtroEstado === "visto" ? b.visto : !b.visto))
            .filter(b => !q || b.nombre.toLowerCase().includes(q) || b.cedula.toLowerCase().includes(q))
            .sort((a, b) => b.enviada.localeCompare(a.enviada));
    }

    function actualizarChips() {
        $("chipTodas").textContent = boletas.length;
        $("chipPendiente").textContent = boletas.filter(b => !b.visto).length;
        $("chipVisto").textContent = boletas.filter(b => b.visto).length;
        document.querySelectorAll("#estadoChips .chip").forEach(c => c.classList.toggle("is-active", c.dataset.estado === filtroEstado));
    }

    // Etiqueta de estado (vista / pendiente) reutilizada en la tabla y en el detalle.
    function pintarEstado(el, boleta) {
        el.textContent = boleta.visto
            ? (rol === "docente" ? "Vista por el padre" : "Vista")
            : "Pendiente de ver";
        el.classList.add(boleta.visto ? "hist-badge--visto" : "hist-badge--pendiente");
    }

    function pintarTipo(el, boleta) {
        const tipo = TIPOS[boleta.puntos];
        el.textContent = tipo.label;
        el.classList.add(`tipo-badge--${tipo.clase}`);
    }

    function crearFila(b, idx) {
        const fila = clonar("tplBoletaRow");
        const c = colorIndex(b.nombre + idx);

        fila.dataset.id = b.id;
        fila.classList.toggle("is-new", b.id === nuevaId);

        const avatar = ref(fila, "avatar");
        avatar.classList.add(`accent--${c}`);
        avatar.textContent = initials(b.nombre);
        ref(fila, "nombre").textContent = b.nombre;
        ref(fila, "cedula").textContent = b.cedula;
        ref(fila, "fecha").textContent = fmtFechaCorta(b.fecha);

        const texto = ref(fila, "texto");
        texto.textContent = b.texto;
        texto.title = b.texto;

        pintarTipo(ref(fila, "tipo"), b);
        pintarEstado(ref(fila, "estado"), b);

        // Si el padre ya la vio, se muestra cuándo (el docente lo confirma aquí)
        const estadoFecha = ref(fila, "estadoFecha");
        mostrar(estadoFecha, b.visto);
        if (b.visto) estadoFecha.textContent = fmtFechaHora(b.vistoEn);

        // Acciones según el rol
        const btnVisto = ref(fila, "visto");
        const btnEliminar = ref(fila, "eliminar");
        mostrar(btnVisto, rol === "padre" && !b.visto);
        mostrar(btnEliminar, rol === "docente" && !b.visto);

        ref(fila, "ver").addEventListener("click", () => abrirDetalle(b));
        btnVisto.addEventListener("click", () => marcarVista(b));
        btnEliminar.addEventListener("click", () => eliminarBoleta(b));

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

        bolPagination.replaceChildren(...nodos);
    }

    function render() {
        actualizarChips();
        const lista = filtradas();

        // Si la página actual quedó fuera de rango, se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * POR_PAGINA;
        const pagina = lista.slice(inicio, inicio + POR_PAGINA);

        tbody.replaceChildren(...pagina.map((b, i) => crearFila(b, inicio + i)));
        $("bolEmptyState").classList.toggle("is-visible", lista.length === 0);
        $("bolCountInfo").textContent = `Mostrando ${pagina.length} de ${lista.length} boletas`;
        $("bolResultsTag").textContent = `${boletas.length} boleta(s) en total`;

        renderPaginacion(totalPaginas);
        nuevaId = null;
    }

    // ---- Filtros ----
    $("estadoChips").addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        filtroEstado = chip.dataset.estado;
        paginaActual = 1;
        render();
    });

    let searchTimer;
    $("bolSearchInput").addEventListener("input", e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { busqueda = e.target.value; paginaActual = 1; render(); }, 200);
    });

    // ---- Cambio de vista (docente / padre) ----
    $("roleSwitch").addEventListener("click", e => {
        const btn = e.target.closest(".role-btn");
        if (!btn) return;
        rol = btn.dataset.rol;
        document.querySelectorAll("#roleSwitch .role-btn").forEach(b => b.classList.toggle("is-active", b.dataset.rol === rol));
        mostrar(btnNuevaBoleta, rol === "docente");
        paginaActual = 1;
        render();
    });

    // =========================================================
    // MODAL DE DETALLE
    // =========================================================
    const detailModal = $("detailModal");
    const detailBody = $("detailBody");
    const btnDetalleVisto = $("btnDetalleVisto");

    function abrirDetalle(b) {
        detalleActual = b;

        $("detailModalTitle").textContent = b.nombre;
        $("detailModalSubtitle").textContent = b.seccion ? `Cédula: ${b.cedula} · Sección: ${b.seccion}` : `Cédula: ${b.cedula}`;

        const contenido = clonar("tplDetalle");
        ref(contenido, "fecha").textContent = fmtFechaLarga(b.fecha);
        ref(contenido, "enviada").textContent = fmtFechaHora(b.enviada);
        ref(contenido, "texto").textContent = b.texto;
        pintarTipo(ref(contenido, "tipo"), b);
        pintarEstado(ref(contenido, "estado"), b);
        ref(contenido, "visto").textContent = b.visto
            ? fmtFechaHora(b.vistoEn)
            : "Todavía no la ha visto el padre de familia.";

        detailBody.replaceChildren(contenido);
        mostrar(btnDetalleVisto, rol === "padre" && !b.visto);
        detailModal.classList.add("is-open");
    }

    function cerrarDetalle() {
        detailModal.classList.remove("is-open");
        detalleActual = null;
    }

    btnDetalleVisto.addEventListener("click", () => {
        if (!detalleActual) return;
        const boleta = detalleActual;
        cerrarDetalle();
        marcarVista(boleta);
    });

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