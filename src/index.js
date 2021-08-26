import React from "react";
import { unref } from "@vue/reactivity";
import { watchEffect, watchSyncEffect } from "@vue/runtime-core";

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
      let done;
      let firstChildProps;
      const { props: props$, options, forwardedRef, ...restProps } = props;

      this.runEffect = () => {
        return getEffect(sync)(() => {
          const reactiveProps =
            typeof props$ === "function" ? props$() : unref(props$);
          this.reactivePropsKeys ??=
            reactiveProps && Object.keys(reactiveProps);

          const childrenIsFunction = typeof restProps.children === "function";
          if (childrenIsFunction) {
            if (this.reactivePropsKeys) {
              this.reactivePropsKeys.push("children");
            } else {
              this.reactivePropsKeys = ["children"];
            }
          }

          const childProps = Object.assign(
            {},
            restProps,
            childrenIsFunction && {
              children: restProps.children(),
            },
            reactiveProps,
            forwardedRef && { ref: forwardedRef }
          );

          if (!done) {
            done = true;
            firstChildProps = childProps;
          } else {
            firstChildProps = null;
            this.setState({ childProps });
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
      return (
        !!this.reactivePropsKeys &&
        this.reactivePropsKeys.some(
          (key) =>
            !Object.is(nextState.childProps[key], this.state.childProps[key])
        )
      );
    }
  }

  if (tagName === React.Fragment) {
    Component.displayName = `Reactive.Fragment`;
  } else {
    Component.displayName = `Reactive.${
      typeof tagName === "string"
        ? tagName
        : tagName.displayName || tagName.name
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

export { setIsStaticRendering, createElement, createComponent, component };
