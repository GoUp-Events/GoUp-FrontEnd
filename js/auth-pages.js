(function () {
  'use strict';

  const auth = window.GoUpAuth;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const page = document.body.dataset.page;

  function readTheme() {
    try { return JSON.parse(localStorage.getItem('goup-tema')) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function setTheme(theme) {
    if (window.GoUpSite) { window.GoUpSite.setTheme(theme); return; }
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('goup-tema', JSON.stringify(next)); } catch { /* tema permanece nesta página */ }
    $('.theme-toggle').setAttribute('aria-label', next === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    $('.theme-toggle').title = next === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
    $('meta[name="theme-color"]').content = next === 'dark' ? '#111511' : '#f8f9f4';
    if ($('#theme-label')) $('#theme-label').textContent = next === 'dark' ? 'Escuro ativado' : 'Claro ativado';
  }

  function toast(message, error = false) {
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.textContent = message;
    $('#toast-region').append(node);
    window.setTimeout(() => node.remove(), 4300);
  }

  function showMessage(message, success = false) {
    const element = $('#form-message');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('success', success);
    element.hidden = false;
  }

  function clearMessage() {
    const element = $('#form-message');
    if (element) element.hidden = true;
  }

  function setError(inputId, message) {
    const input = $(`#${inputId}`);
    const error = $(`#${inputId}-error`);
    if (!input || !error) return;
    input.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
  }

  function clearErrors(form) {
    $$('[aria-invalid="true"]', form).forEach((input) => input.removeAttribute('aria-invalid'));
    $$('.field-error', form).forEach((error) => { error.hidden = true; error.textContent = ''; });
    clearMessage();
  }

  function focusFirstError(form) {
    form.querySelector('[aria-invalid="true"]')?.focus();
  }

  function selectedCategories(form) {
    return $$('input[name="categorias"]:checked', form).map((input) => input.value);
  }

  function initPasswordToggles() {
    $$('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.textContent = visible ? 'Ocultar' : 'Mostrar';
      button.setAttribute('aria-pressed', String(visible));
    }));
  }

  function initLogin() {
    const params = new URLSearchParams(location.search);
    if (params.has('registered')) {
      showMessage('Conta criada! Agora entre com seu e-mail e senha.', true);
      $('#login-email').value = params.get('email') || '';
    } else if (params.has('loggedout')) showMessage('Você saiu da sua conta.', true);

    const form = $('#login-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      const email = $('#login-email').value.trim();
      const senha = $('#login-password').value;
      let valid = true;
      if (!auth.validEmail(email)) { setError('login-email', 'Informe um e-mail válido.'); valid = false; }
      if (!senha) { setError('login-password', 'Informe sua senha.'); valid = false; }
      if (!valid) { focusFirstError(form); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Entrando...';
      try {
        const user = await auth.fazerLogin(email, senha);
        showMessage(`Bem-vindo de volta, ${user.nome.split(' ')[0]}!`, true);
        const next = params.get('next') === 'perfil.html' ? 'perfil.html' : '../index.html';
        window.setTimeout(() => { location.href = next; }, 450);
      } catch (error) {
        showMessage(error.message || 'Não foi possível entrar. Tente novamente.');
        if (error.field) setError(error.field === 'email' ? 'login-email' : 'login-password', error.message);
      } finally {
        submit.disabled = false;
        submit.innerHTML = 'Entrar na minha conta <span aria-hidden="true">→</span>';
      }
    });

    const dialog = $('#recovery-dialog');
    $('#open-recovery').addEventListener('click', () => { $('#recovery-email').value = $('#login-email').value; dialog.showModal(); });
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    $('#recovery-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#recovery-email');
      if (!auth.validEmail(input.value.trim())) { setError('recovery-email', 'Informe um e-mail válido.'); input.focus(); return; }
      input.removeAttribute('aria-invalid');
      $('#recovery-email-error').hidden = true;
      dialog.close();
      toast('O envio de recuperação ficará disponível quando o backend estiver pronto.');
    });
  }

  function initRegistration() {
    const form = $('#register-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      const nome = $('#register-name').value.trim();
      const email = $('#register-email').value.trim();
      const cidade = $('#register-city').value;
      const senha = $('#register-password').value;
      const confirmacao = $('#register-confirm').value;
      const termos = $('#register-terms').checked;
      let valid = true;
      if (nome.length < 2) { setError('register-name', 'Informe pelo menos 2 caracteres.'); valid = false; }
      if (!cidade) { setError('register-city', 'Selecione sua cidade.'); valid = false; }
      if (!auth.validEmail(email)) { setError('register-email', 'Informe um e-mail válido.'); valid = false; }
      if (!auth.validPassword(senha)) { setError('register-password', 'Use pelo menos 8 caracteres, com letras e números.'); valid = false; }
      if (confirmacao !== senha || !confirmacao) { setError('register-confirm', 'As senhas devem ser iguais.'); valid = false; }
      if (!termos) { setError('register-terms', 'Aceite as condições para continuar.'); valid = false; }
      if (!valid) { focusFirstError(form); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Criando conta...';
      try {
        await auth.criarUsuario({ nome, email, cidade, senha, categorias: selectedCategories(form), termos });
        showMessage('Sua conta foi criada. Vamos para a tela de login!', true);
        window.setTimeout(() => { location.href = `login.html?registered=1&email=${encodeURIComponent(email)}`; }, 550);
      } catch (error) {
        showMessage(error.message || 'Não foi possível criar sua conta.');
        const inputId = { nome: 'register-name', email: 'register-email', senha: 'register-password', cidade: 'register-city', termos: 'register-terms' }[error.field];
        if (inputId) setError(inputId, error.message);
      } finally {
        submit.disabled = false;
        submit.innerHTML = 'Criar minha conta <span aria-hidden="true">→</span>';
      }
    });
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  }

  function renderProfile(user) {
    const headerName = $('.auth-user-link');
    if (headerName) headerName.textContent = `Olá, ${user.nome.split(' ')[0]}`;
    $('#profile-avatar').textContent = initials(user.nome);
    $('#profile-title').textContent = user.nome;
    $('#profile-email').textContent = user.email;
    $('#profile-city').textContent = `📍 ${user.cidade}, SC`;
    const tags = $('#profile-categories');
    tags.replaceChildren();
    if (user.categorias.length) user.categorias.forEach((category) => { const tag = document.createElement('span'); tag.textContent = category; tags.append(tag); });
    else { const tag = document.createElement('span'); tag.className = 'muted-tag'; tag.textContent = 'Escolha suas categorias favoritas'; tags.append(tag); }
    const ids = window.GoUpFavoritos.obterFavoritos();
    const favorites = (window.GoUpData?.eventos || []).filter((event) => ids.includes(event.id));
    $('#favorites-count').textContent = String(favorites.length);
    const list = $('#profile-favorites');
    list.replaceChildren();
    if (!favorites.length) {
      const empty = document.createElement('p');
      empty.className = 'favorites-empty';
      empty.textContent = 'Você ainda não salvou eventos. Explore a Home e marque os que chamarem sua atenção.';
      list.append(empty);
    } else favorites.forEach((event) => {
      const item = document.createElement('div');
      item.className = 'favorite-item';
      const title = document.createElement('a'); title.className = 'favorite-title'; title.href = window.GoUpSite.eventHref(event.id); title.textContent = event.nome;
      const city = document.createElement('small'); city.textContent = `${event.cidade} · ${event.categoria}`;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'favorite-remove'; remove.dataset.favorite = String(event.id); remove.dataset.eventName = event.nome; remove.innerHTML = `${window.GoUpSite.icon('heart')} Remover`;
      item.append(title, city, remove);
      list.append(item);
    });
    window.GoUpFavoritos.atualizarBotoesDeFavorito(list);
  }

  function initProfile() {
    const user = auth.buscarUsuarioAtual();
    if (!user) { location.replace('login.html?next=perfil.html'); return; }
    $('#conteudo').hidden = false;
    renderProfile(user);
    window.addEventListener('goup:favoritos', () => renderProfile(auth.buscarUsuarioAtual()));
    $('#edit-profile').addEventListener('click', () => {
      const current = auth.buscarUsuarioAtual();
      $('#edit-name').value = current.nome;
      $('#edit-city').value = current.cidade;
      $$('#edit-form input[name="categorias"]').forEach((input) => { input.checked = current.categorias.includes(input.value); });
      $('#edit-panel').hidden = false;
      $('#edit-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#edit-name').focus();
    });
    $('#cancel-edit').addEventListener('click', () => { $('#edit-panel').hidden = true; clearMessage(); });
    $('#edit-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = $('#edit-form');
      clearErrors(form);
      const nome = $('#edit-name').value.trim();
      const cidade = $('#edit-city').value;
      let valid = true;
      if (nome.length < 2) { setError('edit-name', 'Informe pelo menos 2 caracteres.'); valid = false; }
      if (!cidade) { setError('edit-city', 'Selecione sua cidade.'); valid = false; }
      if (!valid) { focusFirstError(form); return; }
      try {
        const updated = auth.atualizarPerfil({ nome, cidade, categorias: selectedCategories(form) });
        renderProfile(updated);
        showMessage('Perfil atualizado com sucesso.', true);
      } catch (error) { showMessage(error.message || 'Não foi possível atualizar o perfil.'); }
    });
    $('[data-logout]').addEventListener('click', () => {
      try { auth.fazerLogout(); location.href = 'login.html?loggedout=1'; }
      catch (error) { toast(error.message, true); }
    });
    $('#profile-theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  }

  function init() {
    if (!window.GoUpSite) {
      setTheme(readTheme());
      $('.theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    }
    $$('[data-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
    initPasswordToggles();
    if (page === 'login') initLogin();
    if (page === 'cadastro') initRegistration();
    if (page === 'perfil') initProfile();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
