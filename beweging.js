/* Voorbeeld S Baro: open/dicht-melding en rustige beweging.
   Eigen script, niets van buiten. Zonder JavaScript is alles gewoon zichtbaar. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;

  /* 1. Open of dicht, in de tijd van Calpe (werkt ook zonder beweging) */
  var TIJDEN = { 0: [15, 22], 1: [15, 22], 2: [15, 22], 3: [15, 22], 4: null, 5: [15, 22], 6: [15, 22] };
  var DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  function calpeNu() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      var dag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      return { dag: dag, uur: (+o.hour % 24) + (+o.minute) / 60 };
    } catch (e) { var n = new Date(); return { dag: n.getDay(), uur: n.getHours() + n.getMinutes() / 60 }; }
  }
  function volgendeOpen(dag) {
    for (var i = 1; i <= 7; i++) { var k = (dag + i) % 7; if (TIJDEN[k]) return i === 1 ? 'morgen' : DAGEN[k]; }
    return '';
  }
  function status() {
    var nu = calpeNu(), t = TIJDEN[nu.dag], kort, lang, open = false;
    if (t && nu.uur >= t[0] && nu.uur < t[1]) { open = true; kort = 'Nu open · tot 22:00'; lang = 'Nu open, tot 22:00. Loop gerust binnen.'; }
    else if (t && nu.uur < t[0]) { kort = 'Vandaag open vanaf 15:00'; lang = 'Vandaag open vanaf 15:00 tot 22:00.'; }
    else { var v = volgendeOpen(nu.dag); kort = 'Nu dicht · ' + v + ' vanaf 15:00'; lang = 'Nu gesloten. We zijn ' + v + ' weer open vanaf 15:00.'; }
    [].forEach.call(d.querySelectorAll('[data-status]'), function (el) { el.textContent = kort; el.classList.toggle('open', open); el.classList.toggle('dicht', !open); });
    var l = d.querySelector('[data-status-lang]'); if (l) { l.textContent = lang; l.hidden = false; }
    [].forEach.call(d.querySelectorAll('.tijden tr'), function (tr) { tr.classList.toggle('vandaag', +tr.getAttribute('data-dag') === nu.dag); });
  }
  status(); setInterval(status, 60000);

  if (!root.classList.contains('beweeg')) return;
  function opslaan(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  /* 2. Binnenvallen, kort na elkaar */
  var kies = 'section h2, section .lead, .foto.groot, .foto.mini, .strook figure, .sport .onder .foto, .chips li, .bord, .borden .foto, .ook article, .tijden, .adres, section .oogje';
  var lijst = [].slice.call(d.querySelectorAll(kies)).filter(function (el) { return !el.closest('.opening'); });
  lijst.forEach(function (el) { el.classList.add('op'); });
  var io = new IntersectionObserver(function (items) {
    items.filter(function (it) { return it.isIntersecting; }).forEach(function (it, i) {
      it.target.style.transitionDelay = Math.min(i * 80, 480) + 'ms';
      it.target.classList.add('in'); io.unobserve(it.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  lijst.forEach(function (el) { io.observe(el); });

  /* 3. Citaat woord voor woord */
  [].forEach.call(d.querySelectorAll('[data-woorden]'), function (bq) {
    var n = 0;
    [].slice.call(bq.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = d.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (stuk) {
        if (!stuk) return;
        if (/^\s+$/.test(stuk)) { frag.appendChild(d.createTextNode(stuk)); return; }
        var s = d.createElement('span'); s.className = 'w'; s.style.setProperty('--i', n++); s.textContent = stuk; frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    var o = new IntersectionObserver(function (it) { if (it[0].isIntersecting) { bq.classList.add('in'); o.disconnect(); } }, { threshold: 0.3 });
    o.observe(bq);
  });

  /* 4. Scroll: kop weg en terug, veeg-onthulling, parallax */
  var kop = d.querySelector('header.top'), vorige = window.scrollY, wacht = false;
  var veeg = [].slice.call(d.querySelectorAll('.veeg'));
  var para = [].slice.call(d.querySelectorAll('.parallax .pl'));
  function rek() {
    wacht = false;
    var h = window.innerHeight, y = window.scrollY;
    if (kop) {
      if (y > vorige + 6 && y > 240) kop.classList.add('weg');
      else if (y < vorige - 6 || y < 240) kop.classList.remove('weg');
    }
    vorige = y;
    veeg.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = (h - r.top) / (Math.min(r.height, h) * 0.9 + h * 0.1);
      el.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
    });
    para.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      var t = (h - r.top) / (h + r.height);
      img.style.transform = 'translate3d(0,' + ((t - 0.5) * -20).toFixed(2) + '%,0)';
    });
  }
  function plan() { if (!wacht) { wacht = true; requestAnimationFrame(rek); } }
  window.addEventListener('scroll', plan, { passive: true });
  window.addEventListener('resize', plan);
  rek();

  /* 5. Opening: gordijn en wisselende foto's */
  var opening = d.querySelector('.opening');
  if (!opening) return;
  var dias = [].slice.call(opening.querySelectorAll('.dia'));
  var tekst = opening.querySelector('.bijschrift .tekst'), nr = opening.querySelector('.bijschrift .nr');
  var delen = [].slice.call(opening.querySelectorAll('.wrap>*'));
  var nu = 0, z = 1, inBeeld = true;
  delen.forEach(function (el) { el.classList.add('op'); });
  function toon(k) {
    var dia = dias[k];
    dia.style.zIndex = ++z;
    dia.classList.remove('actief'); void dia.offsetWidth; dia.classList.add('actief');
    setTimeout(function () { dias.forEach(function (o, j) { if (j !== k) o.classList.remove('actief'); }); }, 1500);
    if (tekst) {
      tekst.classList.add('wissel');
      setTimeout(function () { tekst.textContent = dia.getAttribute('data-bijschrift') || ''; tekst.classList.remove('wissel'); }, 500);
    }
    if (nr) nr.textContent = ('0' + (k + 1)).slice(-2) + ' / ' + ('0' + dias.length).slice(-2);
    nu = k;
  }
  function start() {
    toon(0);
    delen.forEach(function (el, i) { el.style.transitionDelay = (300 + i * 120) + 'ms'; el.classList.add('in'); });
    setInterval(function () { if (!d.hidden && inBeeld && dias.length > 1) toon((nu + 1) % dias.length); }, 5500);
  }
  new IntersectionObserver(function (it) { inBeeld = it[0].isIntersecting; }).observe(opening);
  var gordijn = d.querySelector('.gordijn');
  if (gordijn && root.classList.contains('intro')) {
    opslaan('sb-gezien', '1');
    setTimeout(function () {
      gordijn.classList.add('open'); start();
      setTimeout(function () { gordijn.classList.add('klaar'); root.classList.remove('intro'); }, 1400);
    }, 650);
  } else { start(); }
})();
