import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { setState } from './state.js';

registerRoute('login', (container) => {
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <h1 class="text-2xl font-semibold text-slate-800 mb-4">근시관리 트래커</h1>
        <p class="text-slate-500 mb-6">Myopia Management Tracker</p>
        <div class="space-y-3">
          <button class="demo-login w-48 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" data-role="doctor">의사로 체험</button><br>
          <button class="demo-login w-48 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" data-role="customer">보호자로 체험</button><br>
          <button class="demo-login w-48 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" data-role="admin">관리자로 체험</button>
        </div>
      </div>
    </div>
  `;
  container.querySelectorAll('.demo-login').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      import('./data/dataService.js').then(ds => {
        const user = ds.login(role);
        setState({ currentUser: user });
        navigate(role === 'admin' ? 'admin' : role === 'customer' ? 'customer' : 'doctor');
      });
    });
  });
});

['doctor', 'customer', 'admin', 'register', 'patient-result', 'pending'].forEach(route => {
  registerRoute(route, (container) => {
    container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-slate-400">${route} screen - coming soon</p></div>`;
  });
});

const user = getCurrentUser();
if (user) {
  setState({ currentUser: user });
  const route = user.role === 'admin' ? 'admin' : user.role === 'customer' ? 'customer' : 'doctor';
  window.location.hash = route;
}

startRouter(document.getElementById('app'));
