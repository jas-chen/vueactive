import React from "react";
import {
  toRef,
  reactive,
  readonly,
  unref,
  watch,
  isRef,
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

    const childProps = Object.assign(
      forwardedRef ? { ref: forwardedRef } : {},
      mapValues(restProps, unref)
    );

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

const useData = (data) => {
  return React.useState(() => {
    if (typeof data === "function") {
      data = data();
    }

    data = toRef(reactive({ value: data }), "value");

    return [
      readonly(data),
      function setData(value) {
        if (typeof value === "function") {
          value(data);
        } else {
          data.value = value;
        }
      },
    ];
  })[0];
};

export { reactify, component, useData };
