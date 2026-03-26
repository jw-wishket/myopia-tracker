const routes = {};
let currentCleanup = null;

export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function startRouter(container) {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || 'login';
    const renderFn = routes[hash];
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (renderFn) {
      container.innerHTML = '';
      currentCleanup = renderFn(container) || null;
    } else {
      navigate('login');
    }
  }
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
