let _state = {
  currentUser: null,
  currentPatient: null,
  currentChartType: 'AL',
};

const listeners = new Set();

export function getState() {
  return _state;
}

export function setState(partial) {
  _state = { ..._state, ...partial };
  listeners.forEach(fn => fn(_state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
