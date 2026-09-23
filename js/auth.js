/* Autenticação demonstrativa. Trocar estas operações por chamadas ao backend:
   POST /api/usuarios, POST /api/login, GET /api/usuarios/me e POST /api/logout.
   localStorage e código executado no navegador não protegem uma conta real. */
(function () {
  'use strict';

  const USERS_KEY = 'goup-usuarios-v1';
  const SESSION_KEY = 'goup-sessao-v1';

  class AuthError extends Error {
    constructor(message, field = '') {
      super(message);
      this.name = 'AuthError';
      this.field = field;
    }
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new AuthError('Não foi possível salvar os dados neste navegador. Verifique o armazenamento local.'); }
  }

  function users() {
    const value = read(USERS_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function publicUser(user) {
    if (!user) return null;
    const { id, nome, email, cidade, categorias, criadoEm } = user;
    return { id, nome, email, cidade, categorias: Array.isArray(categorias) ? categorias : [], criadoEm };
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validPassword(value) {
    return typeof value === 'string' && value.length >= 8 && /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value);
  }

  function toBase64(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  async function derivePassword(password, salt) {
    if (!window.crypto?.subtle) throw new AuthError('Abra o projeto com Live Server para usar o cadastro demonstrativo.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromBase64(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return toBase64(new Uint8Array(bits));
  }

  // Simula POST /api/usuarios.
  async function criarUsuario(input) {
    const nome = String(input.nome || '').trim().replace(/\s+/g, ' ');
    const email = String(input.email || '').trim().toLowerCase();
    const cidade = String(input.cidade || '').trim();
    const categorias = Array.isArray(input.categorias) ? [...new Set(input.categorias)] : [];
    if (nome.length < 2) throw new AuthError('Informe seu nome com pelo menos 2 caracteres.', 'nome');
    if (!validEmail(email)) throw new AuthError('Informe um e-mail válido.', 'email');
    if (!validPassword(input.senha)) throw new AuthError('Use pelo menos 8 caracteres, com letras e números.', 'senha');
    if (!cidade) throw new AuthError('Selecione sua cidade.', 'cidade');
    if (!input.termos) throw new AuthError('É necessário aceitar os termos para continuar.', 'termos');
    const records = users();
    if (records.some((user) => user.email === email)) throw new AuthError('Este e-mail já está cadastrado.', 'email');
    const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await derivePassword(input.senha, salt);
    const user = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nome, email, cidade, categorias, salt, passwordHash,
      criadoEm: new Date().toISOString()
    };
    records.push(user);
    write(USERS_KEY, records);
    return publicUser(user);
  }

  // Simula POST /api/login.
  async function fazerLogin(emailInput, senha) {
    const email = String(emailInput || '').trim().toLowerCase();
    if (!validEmail(email)) throw new AuthError('Informe um e-mail válido.', 'email');
    if (!senha) throw new AuthError('Informe sua senha.', 'senha');
    const user = users().find((item) => item.email === email);
    if (!user) throw new AuthError('E-mail ou senha incorretos.');
    const passwordHash = await derivePassword(senha, user.salt);
    if (passwordHash !== user.passwordHash) throw new AuthError('E-mail ou senha incorretos.');
    write(SESSION_KEY, { userId: user.id, iniciadoEm: new Date().toISOString() });
    return publicUser(user);
  }

  // Simula GET /api/usuarios/me. A checagem é apenas visual.
  function buscarUsuarioAtual() {
    const session = read(SESSION_KEY, null);
    if (!session || typeof session.userId !== 'string') return null;
    return publicUser(users().find((user) => user.id === session.userId));
  }

  // Simula POST /api/logout.
  function fazerLogout() {
    try { localStorage.removeItem(SESSION_KEY); }
    catch { throw new AuthError('Não foi possível encerrar a sessão neste navegador.'); }
  }

  function atualizarPerfil(input) {
    const session = read(SESSION_KEY, null);
    if (!session) throw new AuthError('Entre na sua conta para editar o perfil.');
    const records = users();
    const index = records.findIndex((user) => user.id === session.userId);
    if (index === -1) throw new AuthError('Sessão não encontrada. Entre novamente.');
    const nome = String(input.nome || '').trim().replace(/\s+/g, ' ');
    const cidade = String(input.cidade || '').trim();
    if (nome.length < 2) throw new AuthError('Informe seu nome com pelo menos 2 caracteres.', 'nome');
    if (!cidade) throw new AuthError('Selecione sua cidade.', 'cidade');
    records[index] = { ...records[index], nome, cidade, categorias: Array.isArray(input.categorias) ? [...new Set(input.categorias)] : [] };
    write(USERS_KEY, records);
    return publicUser(records[index]);
  }

  function syncHeader() {
    const user = buscarUsuarioAtual();
    document.querySelectorAll('[data-auth-guest]').forEach((element) => { element.hidden = Boolean(user); });
    document.querySelectorAll('[data-auth-user]').forEach((element) => {
      element.hidden = !user;
      if (user) element.textContent = `Olá, ${user.nome.split(' ')[0]}`;
    });
    return user;
  }

  window.GoUpAuth = { criarUsuario, fazerLogin, buscarUsuarioAtual, fazerLogout, atualizarPerfil, syncHeader, validEmail, validPassword, AuthError };
})();
