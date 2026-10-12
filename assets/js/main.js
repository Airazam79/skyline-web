/* Skyline Apartments. Script clásico (sin módulos ni fetch) para que funcione abriendo los HTML desde el disco. */
(function () {
  "use strict";
  var d = document;
  var cfg = window.SKYLINE || {};
  var lang = cfg.lang === "en" ? "en" : "es";
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* Cabecera: transparente sobre la portada, sólida al bajar */
  var cab = $("[data-cabecera]");
  if (cab && cab.classList.contains("transparente")) {
    var hero = $("[data-hero]");
    var umbral = function () { return hero ? hero.offsetHeight - 120 : 80; };
    var revisar = function () {
      var abajo = window.scrollY > umbral() * 0.08;
      cab.classList.toggle("solida", abajo);
      cab.classList.toggle("transparente", !abajo);
    };
    window.addEventListener("scroll", revisar, { passive: true });
    revisar();
  }

  /* Menú móvil */
  var mb = $(".menu-btn"), nav = $("#nav");
  if (mb && nav) {
    var cerrar = function () {
      nav.classList.remove("abierto"); d.body.classList.remove("menu-abierto");
      mb.setAttribute("aria-expanded", "false"); $(".menu-txt", mb).textContent = mb.getAttribute("data-abre");
    };
    mb.addEventListener("click", function () {
      var abierto = nav.classList.toggle("abierto");
      d.body.classList.toggle("menu-abierto", abierto);
      mb.setAttribute("aria-expanded", abierto ? "true" : "false");
      $(".menu-txt", mb).textContent = mb.getAttribute(abierto ? "data-cierra" : "data-abre");
      if (abierto && cab) cab.classList.add("solida");
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", cerrar); });
    d.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && nav.classList.contains("abierto")) { cerrar(); mb.focus(); } });
  }

  /* Persiana: si el usuario prefiere poco movimiento, fuera */
  if (reducido) $$(".persiana").forEach(function (p) { p.remove(); });

  /* Baldosas: el suelo de la sección cambia con la baldosa elegida */
  var bal = $("[data-baldosas]");
  if (bal) {
    var capas = $$(".suelo", bal), tiles = $$(".tile", bal), fichas = $$(".tile-ficha", bal), pausa = $(".pausa", bal);
    var actual = "", k = 0, temporizador = null, parado = false;
    var activar = function (slug) {
      actual = slug;
      capas.forEach(function (c) { c.classList.toggle("activa", c.getAttribute("data-capa") === slug); });
      tiles.forEach(function (t, i) { var si = t.getAttribute("data-suelo") === slug; t.classList.toggle("activa", si); if (si) k = i; });
      fichas.forEach(function (f) { f.hidden = f.getAttribute("data-ficha") !== slug; });
    };
    // Cualquier interacción del usuario detiene el cambio automático
    var vivo = $(".tile-fichas", bal);
    var parar = function () {
      parado = true;
      if (temporizador) { clearInterval(temporizador); temporizador = null; }
      // Solo se anuncia la ficha cuando la elige el usuario, no durante el ciclo automático
      if (vivo) vivo.setAttribute("aria-live", "polite");
      if (pausa) $(".pausa-txt", pausa).textContent = pausa.getAttribute("data-seguir");
    };
    var tactil = false, elegidaPorToque = "";
    tiles.forEach(function (t) {
      var s = t.getAttribute("data-suelo");
      t.addEventListener("pointerdown", function (ev) { tactil = ev.pointerType !== "mouse"; });
      t.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) { parar(); activar(s); } });
      t.addEventListener("focus", function () { if (!tactil) { parar(); activar(s); } });
      // En táctil, el primer toque enseña la ficha y el segundo abre el apartamento
      t.addEventListener("click", function (ev) {
        if (!tactil) return;
        if (elegidaPorToque !== s) {
          ev.preventDefault(); parar(); activar(s); elegidaPorToque = s;
          var fv = $(".tile-ficha:not([hidden])", bal);
          if (fv && fv.scrollIntoView) fv.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "nearest" });
        }
        tactil = false;
      });
    });
    activar(tiles.length ? tiles[0].getAttribute("data-suelo") : "");
    var arrancar = function () {
      if (temporizador || parado || reducido) return;
      temporizador = setInterval(function () { k = (k + 1) % tiles.length; activar(tiles[k].getAttribute("data-suelo")); }, 3200);
    };
    if (pausa) {
      if (reducido) pausa.hidden = true;
      pausa.addEventListener("click", function () {
        if (parado) {
          parado = false; if (vivo) vivo.setAttribute("aria-live", "off");
          $(".pausa-txt", pausa).textContent = pausa.getAttribute("data-pausa"); arrancar();
        } else parar();
      });
    }
    // Sin interacción, el suelo va cambiando solo mientras la sección está a la vista
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) arrancar();
          else if (temporizador) { clearInterval(temporizador); temporizador = null; }
        });
      }, { threshold: 0.35 }).observe(bal);
    }
  }

  /* Visor de cada apartamento en la portada: al mover el ratón se recorren sus fotos */
  $$("[data-visor]").forEach(function (v) {
    var caps = $$(".cap", v), puntos = $$(".apt-puntos span", v);
    if (caps.length < 2) return;
    var mostrar = function (n) {
      caps.forEach(function (c, i) { c.classList.toggle("activa", i === n); });
      puntos.forEach(function (p, i) { p.classList.toggle("activa", i === n); });
    };
    v.addEventListener("mousemove", function (ev) {
      var r = v.getBoundingClientRect();
      mostrar(Math.min(caps.length - 1, Math.floor((ev.clientX - r.left) / r.width * caps.length)));
    });
    v.addEventListener("mouseleave", function () { mostrar(0); });
    // En táctil: deslizar pasa de foto; tocar abre el apartamento
    var n = 0, x0 = null, deslizado = false;
    v.addEventListener("touchstart", function (ev) { x0 = ev.touches[0].clientX; deslizado = false; }, { passive: true });
    v.addEventListener("touchmove", function (ev) {
      if (x0 === null) return;
      var dx = ev.touches[0].clientX - x0;
      if (Math.abs(dx) > 40) { n = (n + (dx < 0 ? 1 : -1) + caps.length) % caps.length; mostrar(n); x0 = null; deslizado = true; }
    }, { passive: true });
    v.addEventListener("click", function (ev) { if (deslizado) { ev.preventDefault(); deslizado = false; } });
  });

  /* Buscador: dos o tres preguntas y una recomendación */
  var bus = $("[data-buscador]");
  if (bus) {
    var datos = JSON.parse($(".buscador-datos", bus).textContent);
    var pasos = $$(".paso", bus), res = $(".resultado", bus), otra = $(".otra-vez", bus);
    var resp = {};
    var alternativa = { "skyline-2": "skyline-3", "skyline-3": "skyline-2", "skyline-jacuzzi": "skyline-rooftop-jacuzzi", "skyline-rooftop-jacuzzi": "skyline-jacuzzi", "skyline-triplex": null };
    var paso = function (n) { return pasos[n - 1]; };
    var mostrarPaso = function (n) { var p = paso(n); p.hidden = false; p.classList.add("activo"); var b = $(".op", p); if (b) b.focus({ preventScroll: true }); };
    var resultado = function (slug) {
      var r = datos[slug], alt = alternativa[slug];
      var html = '<div>' + r.b + '</div><div><p class="res-pre">' + res.getAttribute("data-txt-res") + '</p><h3>' + r.n + '</h3><p>' + r.m + '</p>';
      if (alt) html += '<p class="res-alt">' + res.getAttribute("data-txt-tambien").replace("{otro}", '<a href="' + datos[alt].u + '">' + datos[alt].n + '</a>') + '</p>';
      html += '<a class="boton" href="' + r.u + '">' + res.getAttribute("data-txt-ver") + '</a></div>';
      res.innerHTML = html; res.hidden = false; otra.hidden = false;
      var s = res.querySelector("svg"); if (s) s.setAttribute("class", "res-baldosa");
    };
    $$(".op", bus).forEach(function (b) {
      b.addEventListener("click", function () {
        var p = +b.getAttribute("data-paso"), v = b.getAttribute("data-valor");
        $$(".op", paso(p)).forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        paso(p).classList.add("hecho");
        // Si cambia una respuesta anterior, se rehace desde ahí
        for (var k = p + 1; k <= pasos.length; k++) { paso(k).hidden = true; paso(k).classList.remove("hecho"); $$(".op", paso(k)).forEach(function (o) { o.removeAttribute("aria-pressed"); }); }
        res.hidden = true; otra.hidden = true;
        resp[p] = v;
        if (p === 1) { if (v === "cuatro") resultado("skyline-triplex"); else mostrarPaso(2); }
        else if (p === 2) {
          if (v === "jacuzzi-fuera") resultado("skyline-rooftop-jacuzzi");
          else if (v === "jacuzzi-dentro") resultado("skyline-jacuzzi");
          else if (v === "trabajo") resultado("skyline-3");
          else mostrarPaso(3);
        } else if (p === 3) resultado(v);
      });
    });
    otra.addEventListener("click", function () {
      pasos.forEach(function (p, i) { p.hidden = i > 0; p.classList.remove("hecho"); $$(".op", p).forEach(function (o) { o.removeAttribute("aria-pressed"); }); });
      res.hidden = true; otra.hidden = true; $(".op", pasos[0]).focus();
    });
  }

  /* Mapa: ruta real desde Calle Nueva 10 hasta el sitio elegido */
  $$("[data-mapa]").forEach(function (m) {
    var datos = JSON.parse($(".mapa-datos", m).textContent);
    var ruta = $(".mp-ruta", m), sombra = $(".mp-ruta-sombra", m), dato = $(".mapa-dato", m);
    var svg = $(".mapa-capa", m), formato = m.getAttribute("data-formato");
    var vb = svg.viewBox.baseVal;
    var elegir = function (clave, animar) {
      var p = datos[clave]; if (!p) return;
      var dd = "M" + p.r.map(function (q) { return q[0] + " " + q[1]; }).join(" L");
      ruta.setAttribute("d", dd); sombra.setAttribute("d", dd);
      var largo = ruta.getTotalLength ? ruta.getTotalLength() : 0;
      if (animar && !reducido && largo) {
        ruta.style.transition = "none"; ruta.style.strokeDasharray = largo; ruta.style.strokeDashoffset = largo;
        ruta.getBoundingClientRect();
        ruta.style.transition = "stroke-dashoffset " + Math.min(1.6, 0.5 + largo / 900) + "s cubic-bezier(.7,0,.2,1)";
        ruta.style.strokeDashoffset = 0;
      } else { ruta.style.strokeDasharray = "none"; }
      var destino = p.a || clave;
      $$(".mp-marca", m).forEach(function (g) { g.classList.toggle("activa", g.getAttribute("data-marca") === destino); });
      $$(".mapa-lista button", m).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-punto") === clave ? "true" : "false"); });
      dato.innerHTML = "<strong>" + p.n + "</strong>" + formato.replace("{m}", p.m).replace("{min}", p.min);
      dato.classList.add("visible");
      dato.style.left = "0px"; dato.style.top = "0px";   // medir el ancho sin que influya la posición anterior
      // Globo en píxeles: encima del destino; si no cabe o tapa la puerta, debajo. Siempre dentro del plano.
      var lz = dato.parentNode, W = lz.clientWidth, H = lz.clientHeight;
      var px = p.xy[0] / vb.width * W, py = p.xy[1] / vb.height * H;
      // Zona que no se puede tapar: la etiqueta «Calle Nueva 10» y el punto de la puerta
      var lr = lz.getBoundingClientRect();
      // Si la etiqueta de la puerta tapa el destino, pasa debajo del punto
      etiqueta.classList.remove("abajo");
      var e0 = etiqueta.getBoundingClientRect(), dxp = lr.left + px, dyp = lr.top + py;
      if (dxp > e0.left - 12 && dxp < e0.right + 12 && dyp > e0.top - 12 && dyp < e0.bottom + 12) etiqueta.classList.add("abajo");
      var er = etiqueta.getBoundingClientRect();
      var ox = origen[0] / vb.width * W, oy = origen[1] / vb.height * H;
      var z = { l: Math.min(er.left - lr.left, ox - 14) - 8, r: Math.max(er.right - lr.left, ox + 14) + 8, t: Math.min(er.top - lr.top, oy - 14) - 8, b: Math.max(er.bottom - lr.top, oy + 14) + 8 };
      var bw = dato.offsetWidth, bh = dato.offsetHeight, sep = 18;
      // El rótulo del destino se oculta (el globo ya dice su nombre); los demás rótulos no se tapan
      $$(".mp-marca", m).forEach(function (g) { g.classList.toggle("oculta", g.getAttribute("data-marca") === destino); });
      var rotulos = $$(".mp-marca:not(.oculta) text", m).map(function (tx) {
        var r = tx.getBoundingClientRect(); return { l: r.left - lr.left - 4, r: r.right - lr.left + 4, t: r.top - lr.top - 4, b: r.bottom - lr.top + 4 };
      });
      var area = function (l, t, q) { return Math.max(0, Math.min(l + bw, q.r) - Math.max(l, q.l)) * Math.max(0, Math.min(t + bh, q.b) - Math.max(t, q.t)); };
      var enPuerta = destino === "origen";
      // Punto del borde del globo más cercano al destino (donde empezaría la guía)
      var borde = function (l, t) { return [Math.max(l, Math.min(px, l + bw)), Math.max(t, Math.min(py, t + bh))]; };
      // ¿Cruza la guía la zona de la puerta? Se muestrea el segmento
      var cruza = function (l, t) {
        var b = borde(l, t);
        for (var k = 1; k < 20; k++) {
          var x = px + (b[0] - px) * k / 20, y = py + (b[1] - py) * k / 20;
          if (x > z.l && x < z.r && y > z.t && y < z.b) return true;
        }
        return false;
      };
      // Coste de cada posición: tapar la puerta o un rótulo, tapar el destino, guías que crucen la puerta y la distancia
      var coste = function (l, t) {
        var a = area(l, t, z) * 4;
        rotulos.forEach(function (q) { a += area(l, t, q) * 6; });
        if (px > l - 10 && px < l + bw + 10 && py > t - 10 && py < t + bh + 10) a += 1e6;
        if (!enPuerta && cruza(l, t)) a += 1e5;
        var b = borde(l, t);
        return a + Math.hypot(b[0] - px, b[1] - py) * (enPuerta ? 0.5 : 20);
      };
      // Candidatas: alrededor del punto en ocho direcciones y tres distancias, más las esquinas
      var opciones = [];
      [sep, 60, 110].forEach(function (r) {
        [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]].forEach(function (d) {
          opciones.push([px + d[0] * r - bw / 2 + d[0] * bw / 2, py + d[1] * r - bh / 2 + d[1] * bh / 2]);
        });
      });
      opciones.push([W - bw - 8, H - bh - 8], [8, H - bh - 8], [W - bw - 8, 8], [8, 8]);
      var elegida = null, mejor = Infinity;
      opciones.forEach(function (o) {
        o[0] = Math.max(8, Math.min(W - bw - 8, o[0]));
        o[1] = Math.max(8, Math.min(H - bh - 8, o[1]));
        var s = coste(o[0], o[1]);
        if (s < mejor) { mejor = s; elegida = o; }
      });
      dato.style.left = elegida[0] + "px"; dato.style.top = elegida[1] + "px";
      // Si el globo queda lejos del punto, una línea guía los une (no cuando el destino es la propia puerta)
      var cb = borde(elegida[0], elegida[1]), cx = cb[0], cy = cb[1];
      var lejos = !enPuerta && Math.hypot(cx - px, cy - py) > 40;
      guia.setAttribute("x1", px / W * vb.width); guia.setAttribute("y1", py / H * vb.height);
      guia.setAttribute("x2", cx / W * vb.width); guia.setAttribute("y2", cy / H * vb.height);
      guia.classList.toggle("visible", lejos);
    };
    var guia = $(".mp-guia", m);
    var og = $(".mp-origen circle:last-child", m);
    var origen = [+og.getAttribute("cx"), +og.getAttribute("cy")], etiqueta = $(".mapa-origen", m);
    window.addEventListener("resize", function () { var a = $(".mapa-lista button[aria-pressed=true]", m); if (a) elegir(a.getAttribute("data-punto"), false); });
    $$(".mapa-lista button", m).forEach(function (b) {
      b.addEventListener("click", function () { elegir(b.getAttribute("data-punto"), true); });
      b.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) elegir(b.getAttribute("data-punto"), true); });
    });
    m.elegir = elegir;
    var inicial = ($(".mapa-lista button[aria-pressed=true]", m) || $(".mapa-lista button", m)).getAttribute("data-punto");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { elegir(inicial, true); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(m);
    } else elegir(inicial, false);
  });

  /* «Ver en el mapa» desde el recorrido del día */
  $$("[data-ir-punto]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = $("[data-mapa]"); if (!m) return;
      m.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "center" });
      setTimeout(function () { if (m.elegir) m.elegir(b.getAttribute("data-ir-punto"), true); }, reducido ? 0 : 500);
    });
  });

  /* Carriles horizontales: arrastrar con el ratón */
  $$("[data-arrastre]").forEach(function (c) {
    var x0 = 0, s0 = 0, abajo = false, movido = false;
    c.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse") return;
      abajo = true; movido = false; x0 = ev.clientX; s0 = c.scrollLeft;
    });
    window.addEventListener("pointermove", function (ev) {
      if (!abajo) return;
      var dx = ev.clientX - x0;
      if (Math.abs(dx) > 5) { movido = true; c.classList.add("arrastrando"); }
      if (movido) c.scrollLeft = s0 - dx;
    });
    window.addEventListener("pointerup", function () { abajo = false; c.classList.remove("arrastrando"); });
    c.addEventListener("click", function (ev) { if (movido) { ev.preventDefault(); ev.stopPropagation(); movido = false; } }, true);
    c.addEventListener("dragstart", function (ev) { ev.preventDefault(); });
  });

  /* Flechas: mueven el carril de su sección una tarjeta */
  $$("[data-flechas]").forEach(function (f) {
    var sec = f.closest("section"), c = sec && $("[data-arrastre]", sec);
    if (!c) return;
    $$("button", f).forEach(function (b) {
      b.addEventListener("click", function () {
        var item = c.firstElementChild, paso = item ? item.getBoundingClientRect().width + 24 : c.clientWidth * 0.8;
        c.scrollBy({ left: +b.getAttribute("data-dir") * paso, behavior: reducido ? "auto" : "smooth" });
      });
    });
  });

  /* Galería de la ficha */
  var gd = $("#galeria-datos"), visor = $("dialog.visor");
  if (gd && visor) {
    var fotos = JSON.parse(gd.textContent), img = $("img", visor), pie = $("figcaption", visor), i = 0, origen = null;
    var mostrar = function (n) {
      i = (n + fotos.length) % fotos.length; img.src = fotos[i].src; img.alt = fotos[i].alt;
      pie.textContent = fotos[i].alt + " (" + (i + 1) + "/" + fotos.length + ")";
    };
    var abrir = function (n) {
      mostrar(n); origen = d.activeElement;
      if (typeof visor.showModal === "function") visor.showModal(); else visor.setAttribute("open", "");
    };
    $$("[data-foto]").forEach(function (el) { el.addEventListener("click", function () { abrir(+el.getAttribute("data-foto")); }); });
    var cerrarV = function () { if (visor.close) visor.close(); else visor.removeAttribute("open"); };
    $(".v-cerrar", visor).addEventListener("click", cerrarV);
    visor.addEventListener("close", function () { if (origen) origen.focus(); });
    $(".v-ant", visor).addEventListener("click", function () { mostrar(i - 1); });
    $(".v-sig", visor).addEventListener("click", function () { mostrar(i + 1); });
    visor.addEventListener("click", function (ev) { if (ev.target === visor || ev.target.tagName === "FIGURE") cerrarV(); });
    visor.addEventListener("keydown", function (ev) { if (ev.key === "ArrowLeft") mostrar(i - 1); if (ev.key === "ArrowRight") mostrar(i + 1); });
    var tx = null;
    visor.addEventListener("touchstart", function (ev) { tx = ev.touches[0].clientX; }, { passive: true });
    visor.addEventListener("touchend", function (ev) {
      if (tx === null) return; var dx = ev.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) mostrar(dx < 0 ? i + 1 : i - 1); tx = null;
    });
  }

  /* Barra de reserva en móvil: aparece cuando el botón principal sale de la vista */
  var barra = $("[data-barra]"), cta = $("[data-cta-principal]");
  if (barra && cta && "IntersectionObserver" in window) {
    barra.hidden = false;
    new IntersectionObserver(function (es) { barra.classList.toggle("visible", !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(cta);
  }

  /* Vídeo de portada: pausa si el usuario prefiere poco movimiento */
  var hv = $(".hero-video");
  if (hv && reducido) { hv.removeAttribute("autoplay"); hv.pause(); }

  /* Consentimiento de cookies: no se carga ninguna medición hasta que se acepta */
  var med = cfg.medicion || {};
  if (!med.ga4 && !med.pixel) return;
  var CLAVE = "skyline-cookies";
  var leer = function () { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
  var guardar = function (v) { try { localStorage.setItem(CLAVE, v); } catch (e) {} };
  var cargar = function () {
    if (med.ga4) {
      var s = d.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + med.ga4; d.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date()); window.gtag("config", med.ga4);
    }
    if (med.pixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, d, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", med.pixel); window.fbq("track", "PageView");
    }
  };
  var estado = leer();
  if (estado === "si") { cargar(); return; }
  if (estado === "no") return;
  var t = lang === "en"
    ? { txt: "We use analytics and advertising cookies only if you accept them. They help us see which pages are useful.", si: "Accept", no: "Reject", mas: "Cookie policy", url: "legal-notice.html#cookies" }
    : { txt: "Usamos cookies de analítica y publicidad solo si las aceptas. Nos ayudan a saber qué páginas resultan útiles.", si: "Aceptar", no: "Rechazar", mas: "Política de cookies", url: "aviso-legal.html#cookies" };
  var caja = d.createElement("div");
  caja.className = "cookies"; caja.setAttribute("role", "region"); caja.setAttribute("aria-label", "Cookies");
  caja.innerHTML = "<p>" + t.txt + ' <a href="' + t.url + '">' + t.mas + '</a></p><div class="acciones"><button class="boton linea" data-v="no">' + t.no + '</button><button class="boton" data-v="si">' + t.si + "</button></div>";
  d.body.appendChild(caja);
  caja.addEventListener("click", function (ev) {
    var v = ev.target.getAttribute && ev.target.getAttribute("data-v"); if (!v) return;
    guardar(v); caja.remove(); if (v === "si") cargar();
  });
})();
