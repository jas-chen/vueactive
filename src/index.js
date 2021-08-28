import React from "react";
import { unref, reactive } from "@vue/reactivity";
import { computed, watchEffect, watchSyncEffect } from "@vue/runtime-core";

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

const createComponent = (tagName, options) => {
  const sync =
    options?.sync ?? typeof tagName === "string"
      ? ["input", "textarea"].includes(tagName)
      : false;
  const withRef = options?.withRef;

  class Component extends React.Component {
    constructor(props) {
      super(props);
      let firstChildProps;
      const { props: props$, options, forwardedRef, ...restProps } = props;
      const constantProps = Object.assign(
        {},
        restProps,
        forwardedRef && { ref: forwardedRef }
      );
      const props$IsFunction = typeof props$ === "function";
      const childrenIsFunction = typeof restProps.children === "function";

      this.runEffect = () => {
        return getEffect(sync)(() => {
          const incomingProps = Object.assign(
            {},
            props$IsFunction ? props$() : unref(props$)
          );

          if (childrenIsFunction) {
            incomingProps.children = restProps.children();
          }

          const getChildProps = () =>
            Object.assign({}, constantProps, incomingProps);

          if (!this.state) {
            firstChildProps = getChildProps();
          } else {
            firstChildProps = null;

            if (
              sync ||
              (incomingProps &&
                Object.keys(incomingProps).some((key) => {
                  const nextValue = incomingProps[key];

                  // avoid comparing large string
                  if (typeof nextValue === "string" && nextValue.length > 120) {
                    return true;
                  }

                  return nextValue !== this.state.childProps[key];
                }))
            ) {
              this.setState({ childProps: getChildProps() });
            }
          }
        }, options);
      };

      this.effectRef = this.runEffect();

      this.state = {
        childProps: firstChildProps,
      };
    }
    render() {
      return React.createElement(tagName, this.state.childProps);
    }
    componentDidMount() {
      this.effectRef ??= this.runEffect();
    }
    componentWillUnmount() {
      this.effectRef?.();
      this.effectRef = undefined;
    }
    shouldComponentUpdate(nextProps, nextState) {
      return nextState.childProps !== this.state.childProps;
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

  return Component;
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

      Component = createComponent(finalTagName, { withRef });
      target.set(tagName, Component);
    }
    return Component;
  },
});

const createElement = (render, options) => {
  return React.createElement(component.Fragment, {
    children: () => (typeof render === "function" ? render() : unref(render)),
    options,
  });
};

const useReadOnlyState = (state) => React.useState(state)[0];

const useReactive = (config) => {
  return useReadOnlyState(() => {
    if (typeof config === "function") {
      config = config();
    }

    const data$ = config.data ? reactive(config.data) : undefined;
    const computed$ = config.computed
      ? Object.entries(config.computed).reduce((result, [key, fn]) => {
          result[key] = computed(fn);
          return result;
        }, {})
      : undefined;

    return new Proxy(config, {
      get({ data }, key) {
        if (data && data.hasOwnProperty(key)) {
          return data$[key];
        }

        return computed$ ? unref(computed$[key]) : undefined;
      },
      set(config, key, value) {
        data$[key] = value;
        return true;
      },
    });
  });
};

const useUnRefs = (refs) => {
  return useReadOnlyState(() => {
    return new Proxy(Object.assign({}, refs), {
      get(target, key) {
        return unref(target[key]);
      },
    });
  });
};

const justTrue = () => true;
const forceMemo = (Component) => React.memo(Component, justTrue);

export {
  setIsStaticRendering,
  createElement,
  createComponent,
  component,
  useReactive,
  useUnRefs,
  forceMemo,
};
