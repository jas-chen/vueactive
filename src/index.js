import { useMemo, useState, useEffect, useRef } from "react";
import { effect as reactivityEffect, stop, shallowReactive } from "@vue/reactivity";

const dumbEffect = (callback) => callback();

let effect;

export const setIsStaticRendering = (isStaticRendering) => {
  effect = isStaticRendering ? dumbEffect : reactivityEffect;
}

// eslint-disable-next-line no-undef
const isBrowser = typeof window !== 'undefined' && globalThis === window;

setIsStaticRendering(!isBrowser);

const scheduler = (() => {
  let jobs = new Set();
  let isFlushing = false;
  const executeJobs = () => {
    for (const job of jobs) {
      job();
    }

    jobs = new Set();
    isFlushing = false;
  };

  return (job) => {
    jobs.add(job);
    if (!isFlushing) {
      isFlushing = true;
      Promise.resolve().then(executeJobs);
    }
  };
})();

export const Reactive = ({ children, onTrack, onTrigger, onStop }) => {
  const effectOptions = useMemo(
    () => ({
      scheduler,
      onTrack,
      onTrigger,
      onStop,
    }),
    [onTrack, onTrigger, onStop],
  );

  const effectRef = useRef();
  const render = useMemo(() => children, [children]);

  const [element, setElement] = useState(() => {
    let _element;
    effectRef.current = effect(() => {
      if (!effectRef.current) {
        _element = render();
      } else {
        setElement(render());
      }
    }, effectOptions);

    return _element;
  });

  useEffect(() => {
    if (!effectRef.current) {
      effectRef.current = effect(() => {
        setElement(render());
      }, effectOptions);
    }

    return () => {
      stop(effectRef.current);
      effectRef.current = undefined;
    };
  }, [render, effectOptions]);

  return element;
};

export const R = Reactive;

export const Effect = ({ children }) => {
  useEffect(children, [children]);
  return null;
};

export const useForceMemo = (factory) => useMemo(factory, []);

export const useReactiveProps = (props) => {
  const props$ = useForceMemo(() => shallowReactive({ ...props }));
  const keys = new Set([...Object.keys(props), ...Object.keys(props$)]);

  for (const key of keys) {
    if (props$[key] !== props[key]) {
      props$[key] = props[key];
    }
  }

  return props$;
}
