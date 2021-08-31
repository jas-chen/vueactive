import React from "react";
import { pauseTracking, resetTracking } from "@vue/reactivity";
import {
  unref,
  reactive,
  watchEffect,
  watchSyncEffect,
  isRef,
  computed,
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

const useData = (data) => {
  return useConstant(() => {
    pauseTracking();
    const value = data();
    resetTracking();
    return reactive(value);
  });
};

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

export {
  setIsStaticRendering,
  reactify,
  component,
  useConstant,
  useData,
  renderList,
};
