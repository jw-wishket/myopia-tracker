import { describe, it, expect, vi, afterEach } from 'vitest';
import { registerRoute, startRouter } from './router.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startRouter', () => {
  it('세션 복원 직후 큐에 남은 hashchange가 발화해도 같은 해시는 한 번만 렌더링한다', async () => {
    // main.js 세션 복원 순서 재현:
    // 1) window.location.hash = 'doctor' (hashchange 이벤트가 큐에 등록됨)
    // 2) startRouter() → 리스너 등록 + handleRoute() 즉시 실행
    // 3) 큐에 있던 hashchange 발화 → handleRoute() 재실행 (중복 렌더링 버그)
    let hashchangeHandler;
    vi.stubGlobal('window', {
      location: { hash: '#doctor' },
      addEventListener: (event, fn) => {
        if (event === 'hashchange') hashchangeHandler = fn;
      },
    });

    const renders = [];
    registerRoute('doctor', async () => {
      renders.push('doctor');
    });

    startRouter({ innerHTML: '' });
    await Promise.resolve();
    await hashchangeHandler();

    expect(renders).toEqual(['doctor']);
  });

  it('해시가 실제로 바뀌면 다시 렌더링한다', async () => {
    let hashchangeHandler;
    const fakeWindow = {
      location: { hash: '#login' },
      addEventListener: (event, fn) => {
        if (event === 'hashchange') hashchangeHandler = fn;
      },
    };
    vi.stubGlobal('window', fakeWindow);

    const renders = [];
    registerRoute('login', async () => {
      renders.push('login');
    });
    registerRoute('doctor', async () => {
      renders.push('doctor');
    });

    startRouter({ innerHTML: '' });
    await Promise.resolve();

    fakeWindow.location.hash = '#doctor';
    await hashchangeHandler();

    expect(renders).toEqual(['login', 'doctor']);
  });
});
