(function () {
    "use strict";

    // ---- Configuración ----
    const STORAGE_KEY = "calendario_v1";
    const MAX_CHIPS = 2;        // eventos visibles por día antes de mostrar "+N más"
    const PROXIMOS_MAX = 8;     // eventos en la lista de próximos
    const MAX_DIAS_EVENTO = 366;

    // Tipos de evento. Los colores están en el CSS (.ev--examen, .ev--matricula, ...).
    const TIPOS = {
        examen: { label: "Examen" },
        matricula: { label: "Matrícula" },
        actividad: { label: "Actividad" },
        feriado: { label: "Feriado" },
        sinclases: { label: "Sin clases" },
        reunion: { label: "Reunión" },
        otro: { label: "Otro" },
    };

    // Usuario con sesión iniciada: el .cshtml entrega su rol y su nombre en data-rol y data-nombre.
    // Solo docentes y directora pueden agregar eventos; el padre de familia solo consulta.
    const CARGOS = { docente: "Docente", directora: "Directora", padre: "Padre de familia" };
    const paginaEl = document.getElementById("calPage");
    const ROL = paginaEl.dataset.rol in CARGOS ? paginaEl.dataset.rol : "padre"; // valor desconocido = solo consulta
    const USUARIO = {
        nombre: (paginaEl.dataset.nombre || "").trim() || CARGOS[ROL],
        cargo: CARGOS[ROL],
    };

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

    // ---- Utilidades de fecha ----
    function pad(n) { return String(n).padStart(2, "0"); }

    function isoDeFecha(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function fechaDeIso(iso) {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function fmtFechaLarga(iso) {
        return fechaDeIso(iso).toLocaleDateString("es-CR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    }

    function fmtFechaCorta(iso) {
        return fechaDeIso(iso).toLocaleDateString("es-CR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    }

    function fmtFechaHora(isoDateTime) {
        return new Date(isoDateTime).toLocaleString("es-CR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function fmtHora(hhmm) {
        const [h, m] = hhmm.split(":").map(Number);
        return new Date(2000, 0, 1, h, m).toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit" });
    }

    function colorIndex(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        return hash % 6;
    }

    function initials(name) {
        return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    // Un evento puede durar varios días: del campo "inicio" al campo "fin" (ambos incluidos).
    function textoRango(ev) {
        return ev.inicio === ev.fin
            ? fmtFechaLarga(ev.inicio)
            : `Del ${fmtFechaCorta(ev.inicio)} al ${fmtFechaCorta(ev.fin)}`;
    }

    // ---- Datos ----
    // Cada evento: { id, titulo, tipo, inicio, fin, hora, dirigido, descripcion, autor, autorCargo, autorRol, creado }
    // Los eventos de ejemplo se calculan a partir de la fecha de hoy para que siempre se vean en el calendario.
    function datosEjemplo() {
        const hoy = new Date();
        const f = n => isoDeFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n));
        const hace = n => new Date(Date.now() - n * 86400000).toISOString();

        const laura = { autor: "Laura Mora", autorCargo: "Docente", autorRol: "docente" };
        const carlos = { autor: "Carlos Ruiz", autorCargo: "Docente", autorRol: "docente" };
        const ana = { autor: "Ana Vargas", autorCargo: "Directora", autorRol: "directora" };

        return [
            { id: 1, titulo: "Examen de Matemáticas", tipo: "examen", inicio: f(3), fin: f(3), hora: "08:00", dirigido: "4° - Grupo A", descripcion: "Fracciones y decimales. No se permite el uso de calculadora.", ...laura, creado: hace(5) },
            { id: 2, titulo: "Examen de Ciencias", tipo: "examen", inicio: f(3), fin: f(3), hora: "10:30", dirigido: "5° - Grupo A", descripcion: "Repasar el ciclo del agua y los estados de la materia.", ...carlos, creado: hace(4) },
            { id: 3, titulo: "Entrega de proyectos", tipo: "actividad", inicio: f(3), fin: f(3), hora: "", dirigido: "todas", descripcion: "Los proyectos se reciben durante toda la jornada.", ...ana, creado: hace(6) },
            { id: 4, titulo: "Reunión de padres de familia", tipo: "reunion", inicio: f(5), fin: f(5), hora: "17:30", dirigido: "1° - Grupo A", descripcion: "Se entregarán las calificaciones del trimestre.", ...laura, creado: hace(3) },
            { id: 5, titulo: "Festival de ciencias", tipo: "actividad", inicio: f(8), fin: f(8), hora: "09:00", dirigido: "todas", descripcion: "Cada sección presentará su experimento en el gimnasio.", ...ana, creado: hace(8) },
            { id: 6, titulo: "Capacitación del personal docente", tipo: "sinclases", inicio: f(11), fin: f(11), hora: "", dirigido: "todas", descripcion: "No habrá lecciones para los estudiantes.", ...ana, creado: hace(9) },
            { id: 7, titulo: "Día feriado", tipo: "feriado", inicio: f(15), fin: f(15), hora: "", dirigido: "todas", descripcion: "", ...ana, creado: hace(20) },
            { id: 8, titulo: "Matrícula del próximo curso lectivo", tipo: "matricula", inicio: f(20), fin: f(24), hora: "08:00", dirigido: "todas", descripcion: "Presentar la cédula del estudiante y del encargado legal en la oficina de la dirección.", ...ana, creado: hace(10) },
        ];
    }

    function cargar() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignorar */ }
        return datosEjemplo();
    }

    // Nota: en producción reemplazar por llamadas al CalendarioController
    // (GET para listar, POST para agregar y DELETE para eliminar; el autor se toma de la sesión en el servidor).
    function persistir() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
        } catch (e) { /* almacenamiento no disponible */ }
    }

    let eventos = cargar();

    // ---- Estado ----
    const hoyInicial = new Date();
    const rol = ROL; // "docente" | "directora" | "padre"
    let filtroTipo = "todos";
    let anio = hoyInicial.getFullYear();
    let mes = hoyInicial.getMonth();
    let detalleActual = null;
    let diaActual = null;

    // ---- Permisos ----
    function puedeAgregar() {
        return rol === "docente" || rol === "directora";
    }

    // La directora puede eliminar cualquier evento; un docente solo los que él mismo registró.
    function puedeEliminar(ev) {
        if (rol === "directora") return true;
        return rol === "docente" && ev.autorRol === "docente" && ev.autor === USUARIO.nombre;
    }

    // ---- Referencias DOM ----
    const calGrid = $("calGrid");
    const proximosList = $("proximosList");
    const btnNuevoEvento = $("btnNuevoEvento");

    const form = $("evForm");
    const inTitulo = $("evTitulo");
    const inTipo = $("evTipo");
    const inInicio = $("evInicio");
    const inFin = $("evFin");
    const inHora = $("evHora");
    const inDirigido = $("evDirigido");
    const inDescripcion = $("evDescripcion");
    const contador = $("evContador");
    const errorBox = $("evError");

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
    // CALENDARIO
    // =========================================================
    function eventosFiltrados() {
        return eventos.filter(e => filtroTipo === "todos" || e.tipo === filtroTipo);
    }

    function compararEventos(a, b) {
        return (a.hora || "").localeCompare(b.hora || "") || a.titulo.localeCompare(b.titulo);
    }

    function eventosDelDia(iso, lista) {
        return lista.filter(e => e.inicio <= iso && iso <= e.fin).sort(compararEventos);
    }

    function nombreAutor(ev) {
        return `${ev.autor} · ${ev.autorCargo}`;
    }

    function crearChip(ev) {
        const chip = clonar("tplEventoChip");
        chip.classList.add(`ev--${ev.tipo}`);
        chip.title = ev.titulo;
        ref(chip, "texto").textContent = ev.hora ? `${ev.hora} ${ev.titulo}` : ev.titulo;
        chip.addEventListener("click", e => { e.stopPropagation(); abrirDetalle(ev); });
        return chip;
    }

    function crearCelda(fecha, lista, hoyIso) {
        const iso = isoDeFecha(fecha);
        const delDia = eventosDelDia(iso, lista);
        const celda = clonar("tplDiaCelda");

        celda.dataset.fecha = iso;
        celda.classList.toggle("is-outside", fecha.getMonth() !== mes);
        celda.classList.toggle("is-weekend", fecha.getDay() === 0 || fecha.getDay() === 6);
        celda.classList.toggle("is-today", iso === hoyIso);
        celda.setAttribute("aria-label", `${fmtFechaLarga(iso)}: ${delDia.length} evento(s)`);

        ref(celda, "num").textContent = fecha.getDate();
        ref(celda, "eventos").replaceChildren(...delDia.slice(0, MAX_CHIPS).map(crearChip));

        const mas = ref(celda, "mas");
        mostrar(mas, delDia.length > MAX_CHIPS);
        mas.textContent = `+${delDia.length - MAX_CHIPS} más`;

        celda.addEventListener("click", () => abrirDia(iso));
        celda.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirDia(iso); }
        });
        return celda;
    }

    function renderCalendario() {
        const lista = eventosFiltrados();
        const hoyIso = isoDeFecha(new Date());

        $("calTitulo").textContent = new Date(anio, mes, 1).toLocaleDateString("es-CR", { month: "long", year: "numeric" });

        // La semana empieza en lunes. Se muestran solo las semanas necesarias (4 a 6).
        const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
        const diasMes = new Date(anio, mes + 1, 0).getDate();
        const semanas = Math.ceil((desfase + diasMes) / 7);

        const celdas = [];
        for (let i = 0; i < semanas * 7; i++) {
            celdas.push(crearCelda(new Date(anio, mes, 1 - desfase + i), lista, hoyIso));
        }
        calGrid.replaceChildren(...celdas);
    }

    // ---- Próximos eventos ----
    function crearProximo(ev, hoyIso) {
        // Si el evento ya empezó pero sigue en curso, se muestra con la fecha de hoy
        const fechaMostrada = fechaDeIso(ev.inicio < hoyIso ? hoyIso : ev.inicio);
        const item = clonar("tplProximo");

        const fecha = ref(item, "fecha");
        fecha.classList.add(`ev--${ev.tipo}`);
        ref(item, "dia").textContent = fechaMostrada.getDate();
        ref(item, "mes").textContent = fechaMostrada.toLocaleDateString("es-CR", { month: "short" });

        ref(item, "titulo").textContent = ev.titulo;

        const tipo = ref(item, "tipo");
        tipo.textContent = TIPOS[ev.tipo].label;
        tipo.classList.add(`ev--${ev.tipo}`);

        ref(item, "autor").textContent = `Por ${ev.autor}`;

        item.addEventListener("click", () => abrirDetalle(ev));
        return item;
    }

    function renderProximos() {
        const hoyIso = isoDeFecha(new Date());
        const lista = eventosFiltrados()
            .filter(e => e.fin >= hoyIso)
            .sort((a, b) => a.inicio.localeCompare(b.inicio) || compararEventos(a, b))
            .slice(0, PROXIMOS_MAX);

        proximosList.replaceChildren(...lista.map(ev => crearProximo(ev, hoyIso)));
        $("proximosEmpty").classList.toggle("is-visible", lista.length === 0);
    }

    function render() {
        renderCalendario();
        renderProximos();
    }

    // ---- Navegación por meses ----
    function cambiarMes(delta) {
        const nueva = new Date(anio, mes + delta, 1);
        anio = nueva.getFullYear();
        mes = nueva.getMonth();
        renderCalendario();
    }

    $("btnMesAnterior").addEventListener("click", () => cambiarMes(-1));
    $("btnMesSiguiente").addEventListener("click", () => cambiarMes(1));
    $("btnHoy").addEventListener("click", () => {
        const hoy = new Date();
        anio = hoy.getFullYear();
        mes = hoy.getMonth();
        renderCalendario();
    });

    // ---- Filtros por tipo ----
    $("tipoChips").addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        filtroTipo = chip.dataset.tipo;
        document.querySelectorAll("#tipoChips .chip").forEach(c => c.classList.toggle("is-active", c === chip));
        render();
    });

    // =========================================================
    // MODAL: EVENTOS DEL DÍA
    // =========================================================
    const dayModal = $("dayModal");
    const btnDiaAgregar = $("btnDiaAgregar");

    function crearItemDia(ev) {
        const item = clonar("tplDiaEvento");
        item.classList.add(`ev--${ev.tipo}`);

        ref(item, "titulo").textContent = ev.titulo;
        const tipo = ref(item, "tipo");
        tipo.textContent = TIPOS[ev.tipo].label;
        tipo.classList.add(`ev--${ev.tipo}`);

        const partes = [ev.hora ? fmtHora(ev.hora) : "Todo el día"];
        if (ev.dirigido !== "todas") partes.push(ev.dirigido);
        if (ev.inicio !== ev.fin) partes.push("Varios días");
        ref(item, "meta").textContent = partes.join(" · ");

        ref(item, "autor").textContent = `Agregado por ${nombreAutor(ev)}`;

        item.addEventListener("click", () => { cerrarDia(); abrirDetalle(ev); });
        return item;
    }

    function abrirDia(iso) {
        diaActual = iso;
        const lista = eventosDelDia(iso, eventos); // en este modal se muestran todos los tipos

        $("dayModalTitle").textContent = fmtFechaLarga(iso);
        $("dayModalSubtitle").textContent = lista.length ? `${lista.length} evento(s)` : "Sin eventos";
        $("diaLista").replaceChildren(...lista.map(crearItemDia));
        mostrar($("diaVacio"), lista.length === 0);
        mostrar(btnDiaAgregar, puedeAgregar());

        dayModal.classList.add("is-open");
    }

    function cerrarDia() {
        dayModal.classList.remove("is-open");
    }

    btnDiaAgregar.addEventListener("click", () => {
        const iso = diaActual;
        cerrarDia();
        abrirFormulario(iso);
    });
    $("dayModalCloseBtn").addEventListener("click", cerrarDia);
    $("dayModalCloseBtn2").addEventListener("click", cerrarDia);
    dayModal.addEventListener("click", e => { if (e.target === dayModal) cerrarDia(); });

    // =========================================================
    // MODAL: AGREGAR EVENTO
    // =========================================================
    const formModal = $("formModal");

    function mostrarError(msg, campo) {
        errorBox.textContent = msg;
        mostrar(errorBox, true);
        [inTitulo, inInicio, inFin].forEach(el => el.classList.remove("is-invalid"));
        if (campo) { campo.classList.add("is-invalid"); campo.focus(); }
    }

    function limpiarError() {
        mostrar(errorBox, false);
        [inTitulo, inInicio, inFin].forEach(el => el.classList.remove("is-invalid"));
    }

    [inTitulo, inInicio, inFin].forEach(el => el.addEventListener("input", limpiarError));
    inDescripcion.addEventListener("input", () => { contador.textContent = inDescripcion.value.length; });
    inInicio.addEventListener("change", () => { inFin.min = inInicio.value; });

    function limpiarFormulario() {
        form.reset();
        inFin.min = "";
        contador.textContent = "0";
        limpiarError();
    }

    // Fecha sugerida cuando se abre el formulario desde el botón principal
    function fechaPorDefecto() {
        const hoy = new Date();
        return (hoy.getFullYear() === anio && hoy.getMonth() === mes)
            ? isoDeFecha(hoy)
            : isoDeFecha(new Date(anio, mes, 1));
    }

    function abrirFormulario(isoFecha) {
        if (!puedeAgregar()) return;
        limpiarFormulario();

        $("formAutorNombre").textContent = `${USUARIO.nombre} (${USUARIO.cargo})`;

        inInicio.value = isoFecha || fechaPorDefecto();
        inFin.min = inInicio.value;

        formModal.classList.add("is-open");
        setTimeout(() => inTitulo.focus(), 50);
    }

    function cerrarFormulario() {
        formModal.classList.remove("is-open");
        limpiarFormulario();
    }

    btnNuevoEvento.addEventListener("click", () => abrirFormulario());
    $("formModalCloseBtn").addEventListener("click", cerrarFormulario);
    $("btnCancelar").addEventListener("click", cerrarFormulario);

    form.addEventListener("submit", e => {
        e.preventDefault();
        if (!puedeAgregar()) return;

        const titulo = inTitulo.value.trim().replace(/\s+/g, " ");
        const tipo = inTipo.value;
        const inicio = inInicio.value;
        const fin = inFin.value || inicio;
        const hora = inHora.value;
        const dirigido = inDirigido.value;
        const descripcion = inDescripcion.value.trim();

        if (titulo.length < 3) return mostrarError("Escriba un título para el evento (mínimo 3 caracteres).", inTitulo);
        if (!(tipo in TIPOS)) return mostrarError("Seleccione el tipo de evento.");
        if (!inicio) return mostrarError("Seleccione la fecha del evento.", inInicio);
        if (fin < inicio) return mostrarError("La fecha final no puede ser anterior a la fecha de inicio.", inFin);

        const dias = Math.round((fechaDeIso(fin) - fechaDeIso(inicio)) / 86400000);
        if (dias > MAX_DIAS_EVENTO) return mostrarError("El evento no puede durar más de un año.", inFin);

        // El autor siempre es el usuario que tiene la sesión: no se puede escribir a mano.
        const id = eventos.reduce((max, ev) => Math.max(max, ev.id), 0) + 1;

        eventos.push({
            id, titulo, tipo, inicio, fin, hora, dirigido, descripcion,
            autor: USUARIO.nombre,
            autorCargo: USUARIO.cargo,
            autorRol: rol,
            creado: new Date().toISOString(),
        });
        persistir();

        // Mostrar el calendario en el mes del nuevo evento, sin filtros
        const fechaEvento = fechaDeIso(inicio);
        anio = fechaEvento.getFullYear();
        mes = fechaEvento.getMonth();
        filtroTipo = "todos";
        document.querySelectorAll("#tipoChips .chip").forEach(c => c.classList.toggle("is-active", c.dataset.tipo === "todos"));

        cerrarFormulario();
        render();
        showSuccessToast("El evento se agregó correctamente");
    });

    // =========================================================
    // MODAL: DETALLE DEL EVENTO
    // =========================================================
    const detailModal = $("detailModal");
    const detailBody = $("detailBody");
    const btnDetalleEliminar = $("btnDetalleEliminar");

    function abrirDetalle(ev) {
        detalleActual = ev;

        $("detailModalTitle").textContent = ev.titulo;
        $("detailModalSubtitle").textContent = TIPOS[ev.tipo].label;

        const contenido = clonar("tplDetalle");

        const tipo = ref(contenido, "tipo");
        tipo.textContent = TIPOS[ev.tipo].label;
        tipo.classList.add(`ev--${ev.tipo}`);

        ref(contenido, "dirigido").textContent = ev.dirigido === "todas" ? "Toda la escuela" : ev.dirigido;
        ref(contenido, "fecha").textContent = textoRango(ev);
        ref(contenido, "hora").textContent = ev.hora ? fmtHora(ev.hora) : "Todo el día";

        const descripcion = ref(contenido, "descripcion");
        descripcion.textContent = ev.descripcion || "Sin descripción.";
        descripcion.classList.toggle("is-empty", !ev.descripcion);

        // Quién agregó el evento y cuándo
        const avatar = ref(contenido, "autorAvatar");
        avatar.classList.add(`accent--${colorIndex(ev.autor)}`);
        avatar.textContent = initials(ev.autor);
        ref(contenido, "autorNombre").textContent = ev.autor;
        ref(contenido, "autorMeta").textContent = `${ev.autorCargo} · registrado el ${fmtFechaHora(ev.creado)}`;

        detailBody.replaceChildren(contenido);
        mostrar(btnDetalleEliminar, puedeEliminar(ev));
        detailModal.classList.add("is-open");
    }

    function cerrarDetalle() {
        detailModal.classList.remove("is-open");
        detalleActual = null;
    }

    btnDetalleEliminar.addEventListener("click", () => {
        const ev = detalleActual;
        if (!ev || !puedeEliminar(ev)) return;
        if (!confirm(`¿Eliminar el evento "${ev.titulo}"?`)) return;

        eventos = eventos.filter(x => x.id !== ev.id);
        persistir();
        cerrarDetalle();
        render();
    });

    $("detailModalCloseBtn").addEventListener("click", cerrarDetalle);
    $("detailModalCloseBtn2").addEventListener("click", cerrarDetalle);
    detailModal.addEventListener("click", e => { if (e.target === detailModal) cerrarDetalle(); });

    // ---- Cierre con la tecla Escape (se cierra primero la ventana que está encima) ----
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        if (formModal.classList.contains("is-open")) cerrarFormulario();
        else if (detailModal.classList.contains("is-open")) cerrarDetalle();
        else if (dayModal.classList.contains("is-open")) cerrarDia();
    });

    // ---- Inicial ----
    mostrar(btnNuevoEvento, puedeAgregar());
    render();
})();