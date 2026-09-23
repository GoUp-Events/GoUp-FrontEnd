(function () {
  'use strict';
  const KEY = 'goup-roteiros-v1';
  function buscarRoteiros() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
    } catch { return []; }
  }
  function salvarRoteiro(route) {
    const saved = { ...route, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`, criadoEm: new Date().toISOString() };
    const list = [saved, ...buscarRoteiros()];
    try { localStorage.setItem(KEY, JSON.stringify(list)); }
    catch { return null; }
    window.dispatchEvent(new CustomEvent('goup:roteiros', { detail: list }));
    return saved;
  }
  function removerRoteiro(id) {
    const list = buscarRoteiros().filter((route) => route.id !== id);
    try { localStorage.setItem(KEY, JSON.stringify(list)); }
    catch { return false; }
    window.dispatchEvent(new CustomEvent('goup:roteiros', { detail: list }));
    return true;
  }
  window.GoUpRoteiros = { buscarRoteiros, salvarRoteiro, removerRoteiro };
})();
