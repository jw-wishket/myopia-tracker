// Pure routing decision: which screen a logged-in user lands on.
export function routeForUser(user) {
  if (!user) return 'login';
  return user.isAdmin ? 'admin' : 'doctor';
}
