import { useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import { privateFlow, EMPTY_FLOW } from '@/lib/privateFlow.mjs';
const serverState = () => EMPTY_FLOW;
export default function usePrivateRouter() {
  const router = useRouter();
  const state = useSyncExternalStore(privateFlow.subscribe, privateFlow.snapshot, serverState);
  const navigate = useCallback((method, target, as, options) => {
    if (typeof target === 'object' && target.pathname) {
      privateFlow.save(target.pathname, target.query);
      return router[method](target.pathname, undefined, options);
    }
    return router[method](target, as, options);
  }, [router]);
  return { ...router, query: state[router.pathname] || EMPTY_FLOW,
    push: (...args) => navigate('push', ...args), replace: (...args) => navigate('replace', ...args) };
}
