const routes = {};
let currentCleanup = null;

export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function startRouter(container) {
  let lastHash = null;
  async function handleRoute() {
    const hash = window.location.hash.slice(1) || 'login';
    // 세션 복원 시 hash 변경 → startRouter 직접 호출 + 큐에 남은 hashchange가
    // 연달아 발화해 같은 화면이 두 번 렌더링(요청 중복)되는 것을 방지
    if (hash === lastHash) return;
    lastHash = hash;
    const renderFn = routes[hash];
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (renderFn) {
      container.innerHTML = '';
      const result = await renderFn(container);
      currentCleanup = result || null;
    } else {
      navigate('login');
    }
  }
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
