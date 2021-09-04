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

const List = ({ data, getKey, render }) => {
  return React.useMemo(() => {
    const cache = {};
    const keyIsFunction = typeof getKey === "function";
    const newCache = {};

    let lastList;
    const list$ = _computed(() => {
      const newList = unref(data).map((item) => {
        const cacheKey = keyIsFunction ? getKey(item) : item[getKey];
        const cachedElement = cache[cacheKey];
        const element =
          cachedElement ||
          React.createElement(React.Fragment, {
            key: cacheKey,
            children: render(item),
          });

        cache[cacheKey] = element;
        newCache[cacheKey] = true;

        return element;
      });

      if (
        lastList &&
        lastList.length === newList.length &&
        lastList.every((element, i) => element === newList[i])
      ) {
        return lastList;
      }

      lastList = newList;

      Object.keys(cache).forEach((cacheKey) => {
        if (!newCache.hasOwnProperty(cacheKey)) {
          delete cache[cacheKey];
        }
      });

      return newList;
    });

    return React.createElement(component.Fragment, {
      children: list$,
    });
  }, [data, getKey, render]);
};

const renderList = (data, key, render) =>
  React.createElement(List, {
    data,
    getKey: key,
    render,
  });

const mapValues = (data, mapper) =>
  Object.entries(data).reduce((result, [key, value]) => {
    result[key] = mapper(value);
    return result;
  }, {});

let autoUnRef = false;
const computed = (fn) => {
  const fnIsFunction = typeof fn === "function";
  const finalFn = fnIsFunction ? fn : fn.get;
  const config = {
    get() {
      autoUnRef = true;
      try {
        const result = finalFn();
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
};

const method = (fn) => {
  return function (...args) {
    pauseTracking();
    autoUnRef = true;
    try {
      const result = fn(...args);
      resetTracking();
      autoUnRef = false;
      return result;
    } catch (e) {
      resetTracking();
      autoUnRef = false;
      throw e;
    }
  };
};

const setup = ({ computed: computedConfig, methods, refs }) => {
  const keys = [
    ...(computedConfig ? Object.keys(computedConfig) : []),
    ...(methods ? Object.keys(methods) : []),
    ...(refs ? Object.keys(refs) : []),
  ];

  keys.forEach((key) => {
    if (keys.indexOf(key) !== keys.lastIndexOf(key)) {
      throw new Error(`Key \`${key}\` is duplicated.`);
    }
  });

  // spread to deal with react props
  refs = refs && { ...refs };

  const computed$ = computedConfig && mapValues(computedConfig, computed);
  const methods$ = methods && mapValues(methods, method);
  const seq = [computed$, methods$, refs].filter(Boolean);

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
    return useReactiveProps(props, (props) => {
      const config = typeof setupFn === "function" ? setupFn(props) : setupFn;
      const vm = setup(config);
      return config.render(vm);
    });
  }, displayName);

  return Component;
};

export {
  reactify,
  component,
  renderList,
  setup,
  computed,
  method,
  useData,
  createData,
  withReactiveProps,
  useReactiveProps,
  useWatch,
  createComponent,
};
