// Page-to-page navigation always starts at the top of the new page (or at its #anchor).
// Some hosts, including the preview viewer, otherwise carry the previous page's scroll
// position over. Only link clicks set the flag, so Back and Forward keep the browser's
// normal scroll restoration.
(function () {
  var KEY = 'lh-nav-top';
  function store(v) { try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch (e) {} }
  function read() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url; try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page: let anchors work normally
    store('1');
  });
  if (!read()) return;
  store(null);
  function place() {
    var id = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
    var t = id && document.getElementById(id);
    if (t) t.scrollIntoView(); else window.scrollTo(0, 0);
  }
  place();
  document.addEventListener('DOMContentLoaded', place);
  window.addEventListener('load', function () { place(); requestAnimationFrame(place); setTimeout(place, 120); });
})();

// Mobile navigation toggle. The menu stays fully visible when JavaScript is off.
// The open menu closes on: the toggle, Escape, a tap or click outside it, focus moving
// out of it, following one of its links, or widening the window to the desktop layout.
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  function isOpen() { return nav.classList.contains('open'); }
  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Close' : 'Menu';
  }
  btn.addEventListener('click', function () { setOpen(!isOpen()); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (isOpen() && !nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  document.addEventListener('focusin', function (e) {
    if (isOpen() && !nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  window.matchMedia('(min-width: 921px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
})();
