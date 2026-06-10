// Pure routing decision: which screen a logged-in user lands on after auth.
// Everyone (doctors, nurses, admins) lands on the clinical dashboard;
// admins reach the management screen via the navbar "관리" link.
export function routeForUser(user) {
  if (!user) return 'login';
  return 'doctor';
}
