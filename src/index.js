import { useMemo, useState, useEffect, useRef } from "react";
import {
  effect as reactivityEffect,
  stop,
  shallowReactive,
  unref,
} from "@vue/reactivity";

const dumbEffect = (callback) => callback();

let effect;

const setIsStaticRendering = (isStaticRendering) => {
  effect = isStaticRendering ? dumbEffect : reactivityEffect;
};

// eslint-disable-next-line no-undef
const isBrowser = typeof window !== "undefined" && globalThis === window;

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

const Reactive = ({
  children,
  onTrack,
  onTrigger,
  onStop,
  showReRenderWarning = true,
}) => {
  const effectOptions = useMemo(
    () => ({
      scheduler,
      onTrack,
      onTrigger,
      onStop,
    }),
    [onTrack, onTrigger, onStop]
  );

  const effectRef = useRef();

  const [element, setElement] = useState(() => {
    const render =
      typeof children === "function" ? children : () => unref(children);

    let _element;
    effectRef.current = effect(() => {
      // trigger tracking
      _element = render();

      if (effectRef.current) {
        setElement(_element);
      }
    }, effectOptions);

    return _element;
  });

  useEffect(() => {
    if (!effectRef.current) {
      if (process.env.NODE_ENV !== "production" && showReRenderWarning) {
        console.warn(
          "A <Reactive> element has re-rended. It would be better to keep the reference of the element to avoid the re-rendering.\n",
          children
        );
      }

      const render =
        typeof children === "function" ? children : () => unref(children);

      effectRef.current = effect(() => {
        setElement(render());
      }, effectOptions);
    }

    return () => {
      stop(effectRef.current);
      effectRef.current = undefined;
    };
  }, [children, effectOptions, showReRenderWarning]);

  return element;
};

const Effect = ({ children }) => {
  useEffect(children, [children]);
  return null;
};

const emptyArray = [];
const useForceMemo = (factory) => useMemo(factory, emptyArray);

const useReactiveProps = (props) => {
  const props$ = useForceMemo(() => shallowReactive({ ...props }));
  const keys = new Set([...Object.keys(props), ...Object.keys(props$)]);

  for (const key of keys) {
    if (props$[key] !== props[key]) {
      props$[key] = props[key];
    }
  }

  return props$;
};

export {
  setIsStaticRendering,
  Reactive,
  Reactive as R,
  Effect,
  useForceMemo,
  useReactiveProps,
};