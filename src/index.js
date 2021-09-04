import React from "react";
import { pauseTracking, resetTracking } from "@vue/reactivity";
import {
  reactive,
  unref,
  watch,
  watchEffect,
  isRef,
  computed as _computed,
} from "@vue/runtime-core";

const getComponentName = (Component) => {
  if (Component === React.Fragment) {
    return "React.Fragment";
  }

  return typeof Component === "string"
    ? Component
    : Component.displayName || Component.name || "Anonymous";
};

const reactify = (tagName, options) => {
  const sync = options?.sync || false;
  const withRef = options?.withRef;

  const Component = (props) => {
    const { $$options, forwardedRef, ...restProps } = props;
    const [, setState] = React.useState(0);
    const reactiveProps = Object.keys(restProps)
      .sort()
      .map((key) => restProps[key])
      .filter((value) => isRef(value));

    React.useEffect(() => {
      return watch(
        reactiveProps,
        () => {
          setState((s) => s + 1);
        },
        { ...$$options, sync }
      );
    }, reactiveProps);

    pauseTracking();
    const childProps = Object.assign(
      forwardedRef ? { ref: forwardedRef } : {},
      mapValues(restProps, unref)
    );
    resetTracking();

    return React.createElement(tagName, childProps);
  };

  const PropsGuard = (props) => {
    const key = Object.entries(props)
      .map(([key, value]) => {
        if (isRef(value)) {
          return `${key}$`;
        }

        return key;
      })
      .join("~");

    return React.createElement(Component, { ...props, key });
  };

  Component.displayName = `reactive(${getComponentName(tagName)})`;
  PropsGuard.displayName = `withReactiveProps(${Component.displayName})`;

  if (withRef) {
    return React.forwardRef(function ReactiveWithRef(props, ref) {
      return React.createElement(PropsGuard, {
        ...props,
        forwardedRef: ref,
      });
    });
  }

  return PropsGuard;
};

const WITH_REF = "WithRef";

const component = new Proxy(new Map(), {
  get(target, tagName) {
    let Component = target.get(tagName);
    if (!Component) {
      let withRef = false;
      if (typeof tagName === "string" && tagName.endsWith(WITH_REF)) {
        withRef = true;
        tagName = tagName.replace(WITH_REF, "");
      }

      const finalTagName =
        tagName === "Fragment" ? React.Fragment : tagName.toLowerCase();

      Component = reactify(finalTagName, { withRef });
      target.set(tagName, Component);
    }
    return Component;
  },
});

const mapValues = (data, mapper) =>
  Object.entries(data).reduce((result, [key, value]) => {
    result[key] = mapper(value);
    return result;
  }, {});

let autoUnRef = false;
function computed(fn) {
  const fnIsFunction = typeof fn === "function";
  const finalFn = fnIsFunction ? fn : fn.get;
  const config = {
    get() {
      autoUnRef = true;
      try {
        const result = finalFn.call(this);
        autoUnRef = false;
        return result;
      } catch (e) {
        autoUnRef = false;
        throw e;
      }
    },
  };
  if (!fnIsFunction) {
    config.set = fn.set;
  }
  return _computed(config);
}

function method(fn) {
  const context = this;
  return function () {
    pauseTracking();
    autoUnRef = true;
    try {
      const result = fn.apply(context, arguments);
      resetTracking();
      autoUnRef = false;
      return result;
    } catch (e) {
      resetTracking();
      autoUnRef = false;
      throw e;
    }
  };
}

const setup = ({ computed: computedConfig, methods, refs }) => {
  [computedConfig, methods, refs]
    .map((obj) => (obj ? Object.keys(obj) : []))
    .flat()
    .forEach((key, _, keys) => {
      if (keys.indexOf(key) !== keys.lastIndexOf(key)) {
        throw new Error(`Key \`${key}\` is duplicated.`);
      }
    });

  // spread to deal with react props
  refs = refs && { ...refs };

  const vm = new Proxy(
    {},
    {
      get(target, key) {
        for (const obj of seq) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (autoUnRef) {
              return unref(value);
            }
            return value;
          }
        }
        console.warn(`Key \`${key}\` not found.`);
      },
      set(target, key, value) {
        for (const obj of seq) {
          if (obj.hasOwnProperty(key)) {
            obj[key].value = value;
            return true;
          }
        }
        console.warn(`Key \`${key}\` not found.`);
        return true;
      },
    }
  );

  const computed$ =
    computedConfig && mapValues(computedConfig, (fn) => computed.call(vm, fn));
  const methods$ = methods && mapValues(methods, (fn) => method.call(vm, fn));
  const seq = [computed$, methods$, refs].filter(Boolean);

  return vm;
};

const createData = (data, props) => {
  const props$ = props && setup({ refs: props });
  pauseTracking();
  autoUnRef = true;
  let result;

  try {
    if (typeof data === "function") {
      result = data(props$);
    } else {
      result = data;
    }
  } catch (e) {
    autoUnRef = false;
    resetTracking();
    throw e;
  }

  autoUnRef = false;
  resetTracking();
  return reactive(result);
};

const useData = (data, props) => {
  return React.useState(() => {
    return createData(data, props);
  })[0];
};

const withReactiveProps = (Component, displayName) => {
  const PropsGuard = (props) => {
    const key = Object.entries(props)
      .map(([key, value]) => {
        if (isRef(value)) {
          return `${key}$`;
        }

        return key;
      })
      .join("~");

    return React.createElement(Component, {
      ...props,
      key,
      $$PROPS_GUARD: true,
    });
  };

  if (displayName) {
    Component.displayName = displayName;
  }

  PropsGuard.displayName = `withReactiveProps(${getComponentName(Component)})`;

  return PropsGuard;
};

const useReactiveProps = (props, fn) => {
  if (!props.hasOwnProperty("$$PROPS_GUARD")) {
    throw new Error("useReactiveProps must use with withReactiveProps.");
  }
  const reactiveProps = Object.keys(props)
    .sort()
    .map((key) => props[key]);

  return React.useMemo(() => {
    const props$ = setup({
      refs: props,
    });

    if (fn) {
      return fn(props$);
    }

    return props$;
  }, reactiveProps);
};

const useWatch = (fn, option, deps = []) => {
  if (Array.isArray(option)) {
    option = undefined;
    deps = option;
  }

  React.useEffect(() => {
    return watchEffect(() => {
      autoUnRef = true;
      try {
        fn();
      } catch (e) {}
      autoUnRef = false;
    }, option);
  }, deps);
};

const createComponent = ({ displayName, setup: setupFn }) => {
  const Component = withReactiveProps((props) => {
    const mountedRef = React.useRef();
    const element = useReactiveProps(props, (props) => {
      const config = typeof setupFn === "function" ? setupFn(props) : setupFn;
      const vm = setup(config);
      mountedRef.current = () => config.mounted?.call(vm);
      return config.render.call(vm);
    });

    React.useEffect(() => {
      return mountedRef.current?.();
    }, []);

    return element;
  }, displayName);

  return Component;
};

export {
  reactify,
  component,
  setup,
  method,
  useData,
  createData,
  withReactiveProps,
  useReactiveProps,
  useWatch,
  createComponent,
};
