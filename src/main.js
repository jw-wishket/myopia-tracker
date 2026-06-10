import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { getState, setState } from './state.js';
import { routeForUser } from './routing.js';

// Lazy screen loaders
const screens = {
  login: () => import('./screens/loginScreen.js').then(m => m.renderLoginScreen),
  doctor: () => import('./screens/doctorScreen.js').then(m => m.renderDoctorScreen),
  admin: () => import('./screens/adminScreen.js').then(m => m.renderAdminScreen),
  register: () => import('./screens/registerScreen.js').then(m => m.renderRegisterScreen),
};

function lazyRoute(screenKey) {
  return async (container) => {
    const renderFn = await screens[screenKey]();
    return renderFn(container);
  };
}

// Public routes
registerRoute('login', lazyRoute('login'));
registerRoute('register', lazyRoute('register'));

// Auth-guarded routes
function authGuard(renderFn) {
  return async (container) => {
    const user = getState().currentUser;
    if (!user) { navigate('login'); return; }
    return await renderFn(container);
  };
}

function adminGuard(renderFn) {
  return async (container) => {
    const user = getState().currentUser;
    if (!user) { navigate('login'); return; }
    if (!user.isAdmin) { navigate('doctor'); return; }
    return await renderFn(container);
  };
}

registerRoute('doctor', authGuard(lazyRoute('doctor')));
registerRoute('admin', adminGuard(lazyRoute('admin')));

// Restore session
(async () => {
  const user = await getCurrentUser();
  if (user) {
    setState({ currentUser: user });
    window.location.hash = routeForUser(user);
  }
  startRouter(document.getElementById('app'));
  document.getElementById('loadingOverlay')?.classList.add('hidden');
})();
