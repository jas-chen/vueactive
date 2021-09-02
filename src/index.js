import React from "react";
import { pauseTracking, resetTracking } from "@vue/reactivity";
import {
  unref,
  watchEffect,
  watchSyncEffect,
  isRef,
  computed as _computed,
} from "@vue/runtime-core";

const dumbEffect = (callback) => callback();

let _isStaticRendering = false;

const setIsStaticRendering = (isStaticRendering) => {
  _isStaticRendering = isStaticRendering;
};

const getEffect = (sync) => {
  if (_isStaticRendering) return dumbEffect;

  return sync ? watchSyncEffect : watchEffect;
};

const isBrowser = typeof window !== "undefined" && globalThis === window;

setIsStaticRendering(!isBrowser);

const reactify = (tagName, options) => {
  const sync =
    options?.sync ?? typeof tagName === "string"
      ? ["input", "textarea"].includes(tagName)
      : false;

  const withRef = options?.withRef;

  class Component extends React.Component {
    constructor(props) {
      super(props);
      const { $$options, forwardedRef, ...restProps } = props;

      this.stopEffect = getEffect(sync)(() => {
        const childProps = Object.entries(restProps).reduce(
          (result, [key, value]) => {
            if (isRef(value)) {
              this.hasReactiveProp = true;
              result[key] = unref(value);
            } else {
              result[key] = value;
            }

            return result;
          },
          forwardedRef ? { ref: forwardedRef } : {}
        );

        const element = React.createElement(tagName, childProps);

        if (!this.state) {
          this.state = { element };
        } else {
          this.setState(() => ({ element }));
        }
      }, $$options);
    }
    render() {
      return this.state.element;
    }
    componentWillUnmount() {
      this.stopEffect();
    }
    shouldComponentUpdate(nextProps, nextState) {
      return !this.hasReactiveProp || nextState.element !== this.state.element;
    }
  }

  if (tagName === React.Fragment) {
    Component.displayName = `Reactive.Fragment`;
  } else {
    Component.displayName = `Reactive.${
      typeof tagName === "string"
        ? tagName
        : tagName.displayName || tagName.name || "Anonymous"
    }`;
  }

  if (withRef) {
    return React.forwardRef(function ReactiveWithRef(props, ref) {
      return React.createElement(Component, {
        ...props,
        forwardedRef: ref,
      });
    });
  }

  return React.memo(Component);
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

const useConstant = (state) => React.useState(state)[0];

const List = ({ data, getKey, render }) => {
  return useConstant(() => {
    const cache = {};
    const keyIsFunction = typeof getKey === "function";
    const newCache = {};

    const list$ = computed(() => {
      const result = unref(data).map((item) => {
        const cacheKey = keyIsFunction ? getKey(item) : item[getKey];
        const element =
          cache[cacheKey] ||
          React.createElement(React.Fragment, {
            key: cacheKey,
            children: render(item),
          });

        cache[cacheKey] = element;
        newCache[cacheKey] = true;

        return element;
      });

      Object.keys(cache).forEach((cacheKey) => {
        if (!newCache.hasOwnProperty(cacheKey)) {
          delete cache[cacheKey];
        }
      });

      return result;
    });

    return React.createElement(component.Fragment, {
      children: list$,
    });
  });
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
      }
    }
  );

  return vm;
};

export {
  setIsStaticRendering,
  reactify,
  component,
  useConstant,
  renderList,
  setup,
  computed,
  method,
};
