(function () {
    "use strict";

    // ---- Configuración ----
    const STORAGE_KEY = "materiales_v1";
    const POR_PAGINA = 6;
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

    // Extensiones permitidas según el tipo de archivo
    const EXTENSIONES = {
        pdf: ["pdf"],
        word: ["doc", "docx"],
        imagen: ["jpg", "jpeg", "png", "webp"],
    };

    // Etiqueta y texto del ícono de cada tipo de material (los colores están en el CSS: .tipo-badge--*, .thumb--*)
    const TIPOS = {
        pdf: { label: "PDF", icono: "PDF" },
        word: { label: "Word", icono: "DOC" },
        imagen: { label: "Imagen", icono: "IMG" },
        youtube: { label: "YouTube", icono: "VIDEO" },
    };

    // Secciones de ejemplo. En producción: GET /Secciones (las mismas del módulo de calificaciones).
    const SECCIONES = [
        { id: 1, nombre: "1° - Grupo A" },
        { id: 2, nombre: "1° - Grupo B" },
        { id: 3, nombre: "4° - Grupo A" },
        { id: 4, nombre: "5° - Grupo A" },
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
    function colorIndex(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        return hash % 6;
    }

    function fmtFecha(isoDateTime) {
        return new Date(isoDateTime).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
    }

    function fmtFechaHora(isoDateTime) {
        return new Date(isoDateTime).toLocaleString("es-CR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function fmtTamano(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    function extension(nombre) {
        const i = nombre.lastIndexOf(".");
        return i === -1 ? "" : nombre.slice(i + 1).toLowerCase();
    }

    // Devuelve "pdf" | "word" | "imagen" según la extensión, o null si no está permitido.
    function tipoDeArchivo(nombre) {
        const ext = extension(nombre);
        return Object.keys(EXTENSIONES).find(tipo => EXTENSIONES[tipo].includes(ext)) || null;
    }

    function dataUrlABlobUrl(dataUrl) {
        const [meta, b64] = dataUrl.split(",");
        const mime = (meta.match(/:(.*?);/) || [])[1] || "application/octet-stream";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: mime }));
    }

    // Extrae el ID del video de enlaces youtube.com/watch, youtu.be, /shorts, /embed y /live.
    function extraerYoutubeId(texto) {
        let entrada = (texto || "").trim();
        if (!entrada) return null;
        if (!/^https?:\/\//i.test(entrada)) entrada = "https://" + entrada;

        let url;
        try { url = new URL(entrada); } catch (e) { return null; }

        const host = url.hostname.replace(/^(www\.|m\.)/, "");
        let id = null;

        if (host === "youtu.be") {
            id = url.pathname.slice(1).split("/")[0];
        } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
            if (url.pathname === "/watch") {
                id = url.searchParams.get("v");
            } else {
                const m = url.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
                if (m) id = m[2];
            }
        }
        return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    // ---- Datos ----
    // Cada material: { id, seccionId, titulo, comentario, materia, categoria, tipo, archivo, url, videoId, enviada }
    function datosEjemplo() {
        const ahora = Date.now();
        return [
            {
                id: 4, seccionId: 3, titulo: "Video explicativo de ejemplo",
                comentario: "Vean el video antes del examen del viernes y practiquen los ejercicios de la pizarra.",
                materia: "Matemáticas", categoria: "Práctica para examen", tipo: "youtube",
                archivo: null, url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", videoId: "aqz-KE-bpKQ",
                enviada: new Date(ahora - 1 * 86400000).toISOString(),
            },
            {
                id: 3, seccionId: 3, titulo: "Práctica de comprensión de lectura",
                comentario: "Resuelvan las preguntas 1 a 10 y repasen el vocabulario subrayado.",
                materia: "Español", categoria: "Práctica para examen", tipo: "word",
                archivo: { name: "practica_lectura.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 51200, dataUrl: null },
                url: "", videoId: "", enviada: new Date(ahora - 3 * 86400000).toISOString(),
            },
            {
                id: 2, seccionId: 3, titulo: "Guía de estudio: el ciclo del agua",
                comentario: "Material para repasar en casa. Incluye los esquemas vistos en clase.",
                materia: "Ciencias", categoria: "Material de apoyo", tipo: "pdf",
                archivo: { name: "guia_ciencias.pdf", type: "application/pdf", size: 245760, dataUrl: null },
                url: "", videoId: "", enviada: new Date(ahora - 6 * 86400000).toISOString(),
            },
            {
                id: 1, seccionId: 1, titulo: "Tabla de multiplicar",
                comentario: "Pueden imprimirla y pegarla en el cuaderno.",
                materia: "Matemáticas", categoria: "Material de apoyo", tipo: "pdf",
                archivo: { name: "tabla_multiplicar.pdf", type: "application/pdf", size: 98304, dataUrl: null },
                url: "", videoId: "", enviada: new Date(ahora - 9 * 86400000).toISOString(),
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

    // Nota: en producción reemplazar por llamadas al MaterialesController
    // (POST con multipart/form-data para el archivo, GET para el listado, DELETE para eliminar).
    function persistir() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(materiales));
        } catch (e) {
            // Si el archivo es muy pesado para localStorage, se guarda sin el contenido del adjunto.
            try {
                const liviano = materiales.map(m => m.archivo ? { ...m, archivo: { ...m.archivo, dataUrl: null } } : m);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(liviano));
            } catch (e2) { /* almacenamiento no disponible */ }
        }
    }

    let materiales = cargar();

    // ---- Estado ----
    let rol = "docente"; // "docente" | "padre"  (solo demostración; en producción viene del inicio de sesión)
    let vistaActual = "secciones"; // "secciones" | "materiales"
    let seccionSeleccionadaId = null;
    let filtroTipo = "todos";
    let busqueda = "";
    let paginaActual = 1;
    let archivoActual = null; // { name, type, size, dataUrl }
    let nuevaId = null;
    let detalleActual = null;

    // ---- Referencias DOM ----
    const moduleHero = $("moduleHero");
    const seccionesView = $("seccionesView");
    const materialesView = $("materialesView");
    const seccionesGrid = $("seccionesGrid");
    const seccionesCount = $("seccionesCount");
    const materialesGrid = $("materialesGrid");
    const matPagination = $("matPagination");
    const btnSubirMaterial = $("btnSubirMaterial");

    const form = $("matForm");
    const inTitulo = $("matTitulo");
    const inUrl = $("matUrl");
    const inComentario = $("matComentario");
    const contador = $("matContador");
    const errorBox = $("matError");
    const dropzone = $("dropzone");
    const inArchivo = $("matArchivo");
    const filePreview = $("filePreview");
    const campoArchivo = $("campoArchivo");
    const campoYoutube = $("campoYoutube");

    // ---- Toast ----
    const successToast = $("successToast");
    let toastTimer;
    function showSuccessToast(msg) {
        clearTimeout(toastTimer);
        $("successToastText").textContent = msg;
        successToast.classList.add("is-open");
        toastTimer = setTimeout(() => successToast.classList.remove("is-open"), 1800);
    }

    // ---- Acciones comunes sobre un material ----
    function tieneAccion(m) {
        return m.tipo === "youtube" || !!(m.archivo && m.archivo.dataUrl);
    }

    function textoAccion(m) {
        return m.tipo === "youtube" ? "Abrir en YouTube" : "Descargar";
    }

    function descargarArchivo(m) {
        const urlBlob = dataUrlABlobUrl(m.archivo.dataUrl);
        const enlace = document.createElement("a");
        enlace.href = urlBlob;
        enlace.download = m.archivo.name;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(urlBlob), 4000);
    }

    // YouTube: abre el enlace; archivos: los descarga.
    function ejecutarAccion(m) {
        if (m.tipo === "youtube") window.open(m.url, "_blank", "noopener");
        else if (tieneAccion(m)) descargarArchivo(m);
    }

    // =========================================================
    // VISTA 1: SECCIONES
    // =========================================================
    function materialesDeSeccion(seccionId) {
        return materiales.filter(m => m.seccionId === seccionId);
    }

    function crearSeccionCard(s, idx) {
        const lista = materialesDeSeccion(s.id);
        const c = colorIndex(s.nombre + idx);

        const card = clonar("tplSeccionCard");
        card.dataset.id = s.id;
        ref(card, "accent").classList.add(`accent--${c}`);
        ref(card, "icon").classList.add(`accent--${c}`);
        ref(card, "nombre").textContent = s.nombre;
        ref(card, "total").textContent = `${lista.length} material(es)`;

        const chip = ref(card, "chip");
        if (lista.length === 0) {
            chip.textContent = "Sin materiales";
            chip.classList.add("chip--vacio");
        } else {
            const ultimo = lista.reduce((a, b) => (a.enviada > b.enviada ? a : b));
            chip.textContent = `Actualizado ${fmtFecha(ultimo.enviada)}`;
        }

        card.addEventListener("click", () => abrirSeccion(s.id));
        return card;
    }

    function renderSecciones() {
        seccionesGrid.replaceChildren(...SECCIONES.map((s, i) => crearSeccionCard(s, i)));
        seccionesCount.textContent = `${SECCIONES.length} sección(es)`;
    }

    // =========================================================
    // VISTA 2: MATERIALES DE UNA SECCIÓN
    // =========================================================
    function getSeccionActual() {
        return SECCIONES.find(s => s.id === seccionSeleccionadaId);
    }

    function abrirSeccion(id) {
        seccionSeleccionadaId = id;
        vistaActual = "materiales";
        filtroTipo = "todos";
        busqueda = "";
        paginaActual = 1;
        $("matSearchInput").value = "";
        actualizarVista();
    }

    function volverASecciones() {
        vistaActual = "secciones";
        seccionSeleccionadaId = null;
        actualizarVista();
    }

    function actualizarVista() {
        const enSeccion = vistaActual === "materiales";
        mostrar(moduleHero, !enSeccion);
        mostrar(seccionesView, !enSeccion);
        mostrar(materialesView, enSeccion);

        if (enSeccion) {
            $("seccionActualNombre").textContent = getSeccionActual().nombre;
            mostrar(btnSubirMaterial, rol === "docente");
            renderMateriales();
        } else {
            renderSecciones();
        }
    }

    $("btnVolverSecciones").addEventListener("click", volverASecciones);

    function filtrados(lista) {
        const q = busqueda.trim().toLowerCase();
        return lista
            .filter(m => filtroTipo === "todos" || m.tipo === filtroTipo)
            .filter(m => !q ||
                m.titulo.toLowerCase().includes(q) ||
                m.materia.toLowerCase().includes(q) ||
                m.categoria.toLowerCase().includes(q) ||
                (m.comentario || "").toLowerCase().includes(q))
            .sort((a, b) => b.enviada.localeCompare(a.enviada));
    }

    function actualizarChips(lista) {
        const cuenta = tipo => lista.filter(m => tipo === "todos" || m.tipo === tipo).length;
        $("chipTodos").textContent = cuenta("todos");
        $("chipPdf").textContent = cuenta("pdf");
        $("chipWord").textContent = cuenta("word");
        $("chipImagen").textContent = cuenta("imagen");
        $("chipYoutube").textContent = cuenta("youtube");
        document.querySelectorAll("#tipoChips .chip").forEach(c => c.classList.toggle("is-active", c.dataset.tipo === filtroTipo));
    }

    // Miniatura: imagen subida, portada del video de YouTube o ícono con el tipo de archivo.
    function pintarMiniatura(contenedor, m) {
        const img = ref(contenedor, "thumbImg");
        const icono = ref(contenedor, "thumbIcon");

        let src = null;
        if (m.tipo === "youtube" && /^[\w-]{11}$/.test(m.videoId)) src = `https://img.youtube.com/vi/${m.videoId}/hqdefault.jpg`;
        else if (m.tipo === "imagen" && m.archivo && m.archivo.dataUrl) src = m.archivo.dataUrl;

        icono.textContent = TIPOS[m.tipo].icono;
        mostrar(img, !!src);
        mostrar(icono, !src);
        if (src) {
            img.src = src;
            // Si la portada no carga (sin internet, por ejemplo), se muestra el ícono
            img.addEventListener("error", () => { mostrar(img, false); mostrar(icono, true); });
        }
    }

    function crearTarjetaMaterial(m) {
        const card = clonar("tplMaterialCard");
        card.dataset.id = m.id;
        card.classList.toggle("is-new", m.id === nuevaId);

        const thumb = ref(card, "thumb");
        thumb.classList.add(`thumb--${m.tipo}`);
        pintarMiniatura(thumb, m);
        mostrar(ref(card, "play"), m.tipo === "youtube");

        const tipo = ref(card, "tipo");
        tipo.textContent = TIPOS[m.tipo].label;
        tipo.classList.add(`tipo-badge--${m.tipo}`);
        ref(card, "categoria").textContent = m.categoria;

        ref(card, "titulo").textContent = m.titulo;
        ref(card, "materia").textContent = m.materia;

        const comentario = ref(card, "comentario");
        mostrar(comentario, !!m.comentario);
        comentario.textContent = m.comentario;

        const tamano = m.archivo ? ` · ${fmtTamano(m.archivo.size)}` : "";
        ref(card, "meta").textContent = `Publicado el ${fmtFecha(m.enviada)}${tamano}`;

        // Acciones: ver detalle, descargar / abrir enlace y (solo docente) eliminar
        ref(card, "ver").addEventListener("click", () => abrirDetalle(m));

        const btnAccion = ref(card, "accion");
        mostrar(btnAccion, tieneAccion(m));
        ref(card, "accionTexto").textContent = textoAccion(m);
        btnAccion.addEventListener("click", () => ejecutarAccion(m));

        const btnEliminar = ref(card, "eliminar");
        mostrar(btnEliminar, rol === "docente");
        btnEliminar.addEventListener("click", () => eliminarMaterial(m));

        return card;
    }

    function eliminarMaterial(m) {
        if (!confirm(`¿Eliminar el material "${m.titulo}"? Los padres ya no podrán verlo.`)) return;
        materiales = materiales.filter(x => x.id !== m.id);
        persistir();
        renderMateriales();
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
            alClic: () => { if (paginaActual > 1) { paginaActual--; renderMateriales(); } },
        }));

        paginasVisibles(paginaActual, totalPaginas).forEach(p => {
            if (p === "…") {
                nodos.push(clonar("tplPgDots"));
            } else {
                nodos.push(crearBotonPagina(String(p), {
                    activo: p === paginaActual,
                    alClic: () => { paginaActual = p; renderMateriales(); },
                }));
            }
        });

        nodos.push(crearBotonPagina("›", {
            deshabilitado: paginaActual === totalPaginas,
            alClic: () => { if (paginaActual < totalPaginas) { paginaActual++; renderMateriales(); } },
        }));

        matPagination.replaceChildren(...nodos);
    }

    function renderMateriales() {
        const deSeccion = materialesDeSeccion(seccionSeleccionadaId);
        actualizarChips(deSeccion);

        const lista = filtrados(deSeccion);

        // Si la página actual quedó fuera de rango, se vuelve a la última página válida.
        const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * POR_PAGINA;
        const pagina = lista.slice(inicio, inicio + POR_PAGINA);

        materialesGrid.replaceChildren(...pagina.map(crearTarjetaMaterial));
        mostrar(materialesGrid, lista.length > 0);
        $("matEmptyState").classList.toggle("is-visible", lista.length === 0);
        $("matCountInfo").textContent = `Mostrando ${pagina.length} de ${lista.length} materiales`;
        $("matResultsTag").textContent = `${deSeccion.length} material(es) en esta sección`;

        renderPaginacion(totalPaginas);
        nuevaId = null;
    }

    // ---- Filtros ----
    $("tipoChips").addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        filtroTipo = chip.dataset.tipo;
        paginaActual = 1;
        renderMateriales();
    });

    let searchTimer;
    $("matSearchInput").addEventListener("input", e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { busqueda = e.target.value; paginaActual = 1; renderMateriales(); }, 200);
    });

    // ---- Cambio de vista (docente / padre) ----
    $("roleSwitch").addEventListener("click", e => {
        const btn = e.target.closest(".role-btn");
        if (!btn) return;
        rol = btn.dataset.rol;
        document.querySelectorAll("#roleSwitch .role-btn").forEach(b => b.classList.toggle("is-active", b.dataset.rol === rol));
        actualizarVista();
    });

    // =========================================================
    // FORMULARIO: SUBIR MATERIAL
    // =========================================================
    function mostrarError(msg, campo) {
        errorBox.textContent = msg;
        mostrar(errorBox, true);
        [inTitulo, inUrl, inComentario].forEach(el => el.classList.remove("is-invalid"));
        if (campo) { campo.classList.add("is-invalid"); campo.focus(); }
    }

    function limpiarError() {
        mostrar(errorBox, false);
        [inTitulo, inUrl, inComentario].forEach(el => el.classList.remove("is-invalid"));
    }

    [inTitulo, inUrl, inComentario].forEach(el => el.addEventListener("input", limpiarError));
    inComentario.addEventListener("input", () => { contador.textContent = inComentario.value.length; });

    function origenSeleccionado() {
        const marcado = form.querySelector('input[name="materialOrigen"]:checked');
        return marcado ? marcado.value : "archivo";
    }

    // Alterna entre subir un archivo o pegar un enlace de YouTube
    function actualizarOrigen() {
        const origen = origenSeleccionado();
        mostrar(campoArchivo, origen === "archivo");
        mostrar(campoYoutube, origen === "youtube");
    }

    form.querySelectorAll('input[name="materialOrigen"]').forEach(r => {
        r.addEventListener("change", () => { limpiarError(); actualizarOrigen(); });
    });

    // ---- Archivo adjunto ----
    function renderPreviewArchivo() {
        if (!archivoActual) {
            filePreview.replaceChildren();
            mostrar(filePreview, false);
            return;
        }

        const preview = clonar("tplFilePreview");
        const tipo = tipoDeArchivo(archivoActual.name);

        const thumb = ref(preview, "thumb");
        thumb.classList.add(`thumb--${tipo}`);

        const img = ref(preview, "thumbImg");
        const icono = ref(preview, "thumbIcon");
        const esImagen = tipo === "imagen";
        mostrar(img, esImagen);
        mostrar(icono, !esImagen);
        if (esImagen) img.src = archivoActual.dataUrl;
        icono.textContent = TIPOS[tipo].icono;

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
        if (!tipoDeArchivo(file.name)) {
            mostrarError("Formato no permitido. Suba un PDF, un documento de Word (DOC, DOCX) o una imagen (JPG, PNG, WEBP).");
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
        form.reset(); // devuelve el origen a "Archivo" y las listas a su valor inicial
        archivoActual = null;
        renderPreviewArchivo();
        contador.textContent = "0";
        actualizarOrigen();
        limpiarError();
    }

    // ---- Ventana (modal) de subir material ----
    const formModal = $("formModal");

    function abrirFormulario() {
        limpiarError();
        $("formModalSubtitle").textContent = `Sección: ${getSeccionActual().nombre} · los campos con * son obligatorios`;
        formModal.classList.add("is-open");
        setTimeout(() => inTitulo.focus(), 50);
    }

    function cerrarFormulario() {
        formModal.classList.remove("is-open");
        limpiarFormulario();
    }

    btnSubirMaterial.addEventListener("click", abrirFormulario);
    $("formModalCloseBtn").addEventListener("click", cerrarFormulario);
    $("btnCancelar").addEventListener("click", cerrarFormulario);

    // ---- Publicar ----
    form.addEventListener("submit", e => {
        e.preventDefault();

        const titulo = inTitulo.value.trim().replace(/\s+/g, " ");
        const comentario = inComentario.value.trim();
        const materia = $("matMateria").value;
        const categoria = $("matCategoria").value;
        const origen = origenSeleccionado();

        if (titulo.length < 3) return mostrarError("Escriba un título para el material (mínimo 3 caracteres).", inTitulo);

        let tipo, archivo = null, url = "", videoId = "";

        if (origen === "archivo") {
            if (!archivoActual) return mostrarError("Seleccione el archivo que desea compartir.");
            tipo = tipoDeArchivo(archivoActual.name);
            archivo = { ...archivoActual };
        } else {
            videoId = extraerYoutubeId(inUrl.value);
            if (!videoId) return mostrarError("Ingrese un enlace válido de YouTube (youtube.com o youtu.be).", inUrl);
            tipo = "youtube";
            url = `https://www.youtube.com/watch?v=${videoId}`;
        }

        const id = materiales.reduce((max, m) => Math.max(max, m.id), 0) + 1;
        materiales.unshift({
            id, seccionId: seccionSeleccionadaId,
            titulo, comentario, materia, categoria,
            tipo, archivo, url, videoId,
            enviada: new Date().toISOString(),
        });
        persistir();

        // Mostrar el material recién publicado junto con los demás
        filtroTipo = "todos";
        busqueda = "";
        paginaActual = 1;
        nuevaId = id;
        $("matSearchInput").value = "";

        cerrarFormulario();
        renderMateriales();
        showSuccessToast("El material se publicó correctamente");
    });

    // =========================================================
    // MODAL DE DETALLE
    // =========================================================
    const detailModal = $("detailModal");
    const detailBody = $("detailBody");
    const btnDetalleAccion = $("btnDetalleAccion");

    // Vista del material: imagen, video incrustado, o tarjeta del archivo (PDF/Word).
    function crearVista(m) {
        if (m.tipo === "youtube") {
            const video = clonar("tplDetalleVideo");
            if (/^[\w-]{11}$/.test(m.videoId)) ref(video, "frame").src = `https://www.youtube-nocookie.com/embed/${m.videoId}`;
            return video;
        }

        if (!m.archivo || !m.archivo.dataUrl) {
            const noDisponible = clonar("tplDetalleMuted");
            noDisponible.textContent = m.archivo
                ? `Archivo: ${m.archivo.name} (${fmtTamano(m.archivo.size)}) — no está disponible en esta sesión.`
                : "El material no está disponible.";
            return noDisponible;
        }

        if (m.tipo === "imagen") {
            const img = clonar("tplDetalleImg");
            img.src = m.archivo.dataUrl;
            img.alt = m.titulo;
            return img;
        }

        const archivo = clonar("tplDetalleArchivo");
        ref(archivo, "nombre").textContent = m.archivo.name;
        ref(archivo, "info").textContent = m.tipo === "pdf"
            ? `${fmtTamano(m.archivo.size)} · PDF`
            : `${fmtTamano(m.archivo.size)} · Word (descárguelo para abrirlo)`;

        const btnAbrir = ref(archivo, "abrir");
        mostrar(btnAbrir, m.tipo === "pdf");
        btnAbrir.addEventListener("click", () => window.open(dataUrlABlobUrl(m.archivo.dataUrl), "_blank", "noopener"));
        return archivo;
    }

    function abrirDetalle(m) {
        detalleActual = m;

        $("detailModalTitle").textContent = m.titulo;
        $("detailModalSubtitle").textContent = `Sección: ${getSeccionActual().nombre}`;

        const contenido = clonar("tplDetalle");
        const tipo = ref(contenido, "tipo");
        tipo.textContent = TIPOS[m.tipo].label;
        tipo.classList.add(`tipo-badge--${m.tipo}`);

        ref(contenido, "categoria").textContent = m.categoria;
        ref(contenido, "materia").textContent = m.materia;
        ref(contenido, "subido").textContent = fmtFechaHora(m.enviada);

        const comentario = ref(contenido, "comentario");
        comentario.textContent = m.comentario || "El docente no agregó comentarios.";
        comentario.classList.toggle("is-empty", !m.comentario);

        ref(contenido, "vista").replaceChildren(crearVista(m));
        detailBody.replaceChildren(contenido);

        mostrar(btnDetalleAccion, tieneAccion(m));
        $("btnDetalleAccionTexto").textContent = textoAccion(m);

        detailModal.classList.add("is-open");
    }

    function cerrarDetalle() {
        detailModal.classList.remove("is-open");
        detailBody.replaceChildren(); // detiene el video si estaba reproduciéndose
        detalleActual = null;
    }

    btnDetalleAccion.addEventListener("click", () => { if (detalleActual) ejecutarAccion(detalleActual); });
    $("detailModalCloseBtn").addEventListener("click", cerrarDetalle);
    $("detailModalCloseBtn2").addEventListener("click", cerrarDetalle);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) cerrarDetalle(); });
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        if (detailModal.classList.contains("is-open")) cerrarDetalle();
        else if (formModal.classList.contains("is-open")) cerrarFormulario();
    });

    // ---- Inicial ----
    actualizarOrigen();
    actualizarVista();
})();