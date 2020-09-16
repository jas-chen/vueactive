import {
  Fragment,
  createElement,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  effect as reactivityEffect,
  stop,
  shallowReactive,
  ref,
  readonly,
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

const createRender = (Component) => {
  const isBuiltinComponent = typeof Component === "string";
  return (props) => {
    const finalProps = {};
    for (const [key, value] of Object.entries(props)) {
      if (
        isBuiltinComponent &&
        typeof value === "function" &&
        !/on[A-Z]/.test(key)
      ) {
        finalProps[key] = value();
      } else {
        finalProps[key] = unref(value);
      }
    }
    return createElement(
      Component === "Fragment" ? Fragment : Component,
      finalProps
    );
  };
};

const createReactiveComponent = (Component) => {
  const ReactiveComponent = ({ onTrack, onTrigger, onStop, ...restProps }) => {
    const effectRef = useRef();

    const [element, setElement] = useState(() => {
      const render = createRender(Component);

      let _element;
      effectRef.current = effect(
        () => {
          // trigger tracking
          _element = render(restProps);

          if (effectRef.current) {
            setElement(_element);
          }
        },
        {
          scheduler,
          onTrack,
          onTrigger,
          onStop,
        }
      );

      return _element;
    });

    useEffect(() => () => stop(effectRef.current), []);

    return element;
  };

  ReactiveComponent.displayName = `R.${
    typeof Component === "string"
      ? Component
      : Component.displayName || Component.name
  }`;

  return ReactiveComponent;
};

const R = new Proxy(new Map(), {
  get(target, tagName) {
    let Component = target.get(tagName);
    if (!Component) {
      Component = createReactiveComponent(tagName);
      target.set(tagName, Component);
    }
    return Component;
  },
});

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

const readonlyRef = (value) => {
  const value$ = ref(value);
  const setValue = (newValue) => {
    value$.value = newValue;
  };
  return [readonly(value$), setValue];
};

export {
  setIsStaticRendering,
  R,
  createReactiveComponent,
  Effect,
  useForceMemo,
  useReactiveProps,
  readonlyRef,
};
