import {
  Fragment,
  createElement,
  useMemo,
  useState,
  useEffect,
  useRef,
  memo,
  forwardRef,
} from "react";
import {
  effect as reactivityEffect,
  stop,
  shallowReactive,
  ref,
  isRef,
  reactive,
  readonly,
  unref,
} from "@vue/reactivity";

const emptyArray = [];
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

const createMemoWarning = (name) => (prevProps, nextProps) => {
  if (
    Object.keys(prevProps).length !== Object.keys(nextProps).length ||
    Object.keys(prevProps).some(
      (key) => !Object.is(prevProps[key], nextProps[key])
    )
  ) {
    console.warn(`${name} received new props, however it won't apply theme.`, {
      prevProps,
      nextProps,
    });
  }
};

const createUnrefProps = (Component) => {
  const isBuiltinComponent = typeof Component === "string";
  return (props) => {
    const finalProps = {};
    for (const [key, value] of Object.entries(props)) {
      if (
        isBuiltinComponent &&
        typeof value === "function" &&
        !/^on[A-Z]/.test(key)
      ) {
        finalProps[key] = value();
      } else {
        finalProps[key] = unref(value);
      }
    }
    return finalProps;
  };
};

const useTrackProps = (Component, originalProps) => {
  const effectRef = useRef();

  const [props, setProps] = useState(() => {
    const { onTrack, onTrigger, onStop, ...restProps } =
      typeof originalProps === "function" ? originalProps() : originalProps;
    const unrefProps = createUnrefProps(Component);

    let _props;
    effectRef.current = effect(
      () => {
        // trigger tracking
        _props = unrefProps(restProps);

        if (effectRef.current) {
          setProps(_props);
        }
      },
      {
        scheduler,
        onTrack,
        onTrigger,
        onStop,
      }
    );

    return _props;
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(effectRef.current), emptyArray);

  return props;
};

const createReactiveComponent = (Component) => {
  const ReactiveComponent = forwardRef((originalProps, ref) => {
    const props = useTrackProps(Component, originalProps);
    return useMemo(
      () =>
        createElement(Component === "Fragment" ? Fragment : Component, {
          ...props,
          ref,
        }),
      [props, ref]
    );
  });

  return ReactiveComponent;
};

const useTrackValue = (originalValue) => {
  const effectRef = useRef();

  const [value, setValue] = useState(() => {
    let _value;
    effectRef.current = effect(
      () => {
        // trigger tracking
        _value = unref(originalValue);

        if (effectRef.current) {
          setValue(_value);
        }
      },
      { scheduler }
    );

    return _value;
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(effectRef.current), emptyArray);

  return value;
};

const omit = (object, key) => {
  const copied = Object.assign({}, object);
  delete copied[key];
  return copied;
};

const createReactiveInput = (tagName) => {
  const ReactiveInput = forwardRef((originalProps, ref) => {
    const valueFromProp = useTrackValue(originalProps.value);
    const [value, setValue] = useState(valueFromProp);

    // state -> prop
    useEffect(() => {
      if (isRef(originalProps.value) && originalProps.value.value !== value) {
        originalProps.value.value = value;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const props = useTrackProps(tagName, () =>
      isRef(originalProps.value) ? omit(originalProps, "value") : originalProps
    );

    return useMemo(() => {
      const finalProps = {};
      for (const [key, propValue] of Object.entries(props)) {
        if (typeof propValue === "function" && /^on[A-Z]/.test(key)) {
          finalProps[key] = (e) => {
            const nextValue = propValue(e);
            if (nextValue !== undefined) {
              setValue(nextValue);
            }
          };
        } else {
          finalProps[key] = propValue;
        }
      }
      return createElement(tagName, { ...finalProps, value, ref });
    }, [props, value, ref]);
  });

  return ReactiveInput;
};

const inputElements = ["input", "textarea"];

const reactify = (Component, options) => {
  const isInputElement =
    inputElements.includes(Component) || (options && options.isInputElement);
  const ReactiveComponent = isInputElement
    ? createReactiveInput(Component)
    : createReactiveComponent(Component);

  ReactiveComponent.displayName = `R.${
    typeof Component === "string"
      ? Component
      : Component.displayName || Component.name
  }`;

  if (process.env.NODE_ENV !== "production") {
    return memo(
      ReactiveComponent,
      createMemoWarning(`<${ReactiveComponent.displayName}>`)
    );
  }

  return ReactiveComponent;
};

const R = new Proxy(new Map(), {
  get(target, tagName) {
    let Component = target.get(tagName);
    if (!Component) {
      Component = reactify(tagName);
      target.set(tagName, Component);
    }
    return Component;
  },
});

let Effect = ({ children }) => {
  useEffect(children, [children]);
  return null;
};

if (process.env.NODE_ENV !== "production") {
  Effect = memo(Effect, createMemoWarning("<Effect>"));
}

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

const readonlyReactive = (actions, initialArg, init) => {
  const value$ = reactive(init ? init(initialArg) : initialArg);
  const finalActions = {};
  for (const [key, action] of Object.entries(actions)) {
    finalActions[key] = (...args) => action(value$, ...args);
  }
  return [readonly(value$), finalActions];
};

export {
  setIsStaticRendering,
  R,
  reactify,
  Effect,
  useForceMemo,
  useReactiveProps,
  readonlyRef,
  readonlyReactive,
};
