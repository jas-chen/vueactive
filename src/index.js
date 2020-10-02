import {
  useState,
  useEffect,
  useRef,
  createElement,
  useCallback,
  useMemo,
} from "react";
import {
  effect as reactivityEffect,
  stop,
  ref,
  reactive,
  readonly,
  unref,
  pauseTracking,
  resetTracking,
  isRef,
} from "@vue/reactivity";

const emptyObject = {};
const dumbEffect = (callback) => callback();

let effect;

const setIsStaticRendering = (isStaticRendering) => {
  effect = isStaticRendering ? dumbEffect : reactivityEffect;
};

// eslint-disable-next-line no-undef
const isBrowser = typeof window !== "undefined" && globalThis === window;

setIsStaticRendering(!isBrowser);

const nextTickScheduler = (() => {
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

const refModel = (initValue) => {
  const value$ = ref(initValue);
  const setValue = (newValue) => {
    value$.value = newValue;
  };
  return [readonly(value$), setValue];
};

const reactiveModel = (actions, initialArg, init) => {
  const value$ = reactive(init ? init(initialArg) : initialArg);
  const finalActions = {};
  for (const [key, action] of Object.entries(actions)) {
    finalActions[key] = (...args) => action(value$, ...args);
  }
  return [readonly(value$), finalActions];
};

const watch = (fn, options) => {
  let scheduler;
  if (options.sync) {
    scheduler = null;
  } else {
    ({ scheduler = nextTickScheduler } = options);
  }

  return effect(fn, {
    ...options,
    scheduler,
  });
};

const useWatchEffect = (fn, options = emptyObject) => {
  const isDone = useRef();
  const effectRef = useRef();

  if (!isDone.current) {
    isDone.current = true;
    effectRef.current = watch(fn, options);
  }

  useEffect(() => {
    if (!effectRef.current) {
      effectRef.current = watch(fn, options);
    }

    return () => {
      stop(effectRef.current);
      effectRef.current = null;
    };
  }, [fn, options]);
};

const useWatch = (ref, options) => {
  const isDone = useRef();
  const firstValue = useRef();

  const ef = useCallback(() => {
    const value = typeof ref === "function" ? ref() : unref(ref);
    if (!isDone.current) {
      isDone.current = true;
      firstValue.current = value;
    } else {
      firstValue.current = null;
      setState(value);
    }
  }, [ref]);

  useWatchEffect(ef, options);
  const [state, setState] = useState(firstValue.current);
  return state;
};

const useRunOnce = (factory) => {
  const isDone = useRef();
  const result = useRef();
  if (!isDone.current) {
    isDone.current = true;
    pauseTracking();
    result.current = factory();
    resetTracking();
  }

  return result.current;
};

const Watch = ({
  children,
  sync,
  scheduler,
  onTrack,
  onTrigger,
  onStop,
  allowRecurse,
}) => {
  const options = useMemo(
    () => ({
      sync,
      scheduler,
      onTrack,
      onTrigger,
      onStop,
      allowRecurse,
    }),
    [sync, scheduler, onTrack, onTrigger, onStop, allowRecurse]
  );
  return useWatch(children, options);
};

const useToRef = (value) => {
  const isDone = useRef();
  const value$ = useRunOnce(() => {
    return ref(value);
  });

  useEffect(() => {
    if (!isDone.current) {
      isDone.current = true;
    } else {
      value$.value = value;
    }
  }, [value$, value]);

  return useRunOnce(() => readonly(value$));
};

const useReactiveProps = (props) => {
  const isDone = useRef();
  const props$ = useRunOnce(() => {
    // react props is readonly
    const _props = {};
    for (const [key, value] of Object.entries(props)) {
      _props[key] = isRef(value) ? value : ref(value);
    }
    return _props;
  });

  useEffect(() => {
    if (!isDone.current) {
      isDone.current = true;
    } else {
      for (const [key, value] of Object.entries(props)) {
        if (!isRef(value)) {
          props$[key].value = value;
        }
      }
    }
  }, [props, props$]);

  return props$;
};

const propsToRefModels = (ReactiveComponent) => {
  const NewComponent = (props) => {
    const reactiveProps = useReactiveProps(props);
    return useRunOnce(() => createElement(ReactiveComponent, reactiveProps));
  };

  NewComponent.displayName = `PropsToRefModels(${
    ReactiveComponent.displayName || ReactiveComponent.name
  })`;
  return NewComponent;
};

export {
  setIsStaticRendering,
  useWatchEffect,
  useWatch,
  Watch,
  useRunOnce,
  useToRef,
  propsToRefModels,
  refModel,
  reactiveModel,
};
