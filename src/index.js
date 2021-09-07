import React from "react";
import {
  ref,
  reactive,
  readonly,
  unref,
  computed as _computed,
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

const INPUT_TAGS = ["input", "textarea"];
const reactify = (tagName, options) => {
  const flush = options?.flush;
  const withRef = options?.withRef;
  const isInputTag = INPUT_TAGS.includes(tagName);

  const Component = (props) => {
    const { $$options, forwardedRef, ...restProps } = props;
    const [, setState] = React.useState(0);
    const isControlledInput =
      isInputTag && restProps.onChange && isRef(restProps.value);
    const reactiveProps = Object.keys(restProps)
      .filter((key) => !(isControlledInput && key === "value"))
      .sort()
      .map((key) => {
        return restProps[key];
      })
      .filter((value) => isRef(value));

    React.useEffect(() => {
      return watch(
        reactiveProps,
        () => {
          setState((s) => s + 1);
        },
        { flush, ...$$options }
      );
    }, reactiveProps);

    React.useEffect(() => {
      if (isControlledInput && !flush) {
        return watch(
          [restProps.value],
          () => {
            setState((s) => s + 1);
          },
          { flush: "sync", ...$$options }
        );
      }
    }, [isControlledInput]);

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

let autoUnRef = false;

function computed(fn) {
  const fnIsFunction = typeof fn === "function";
  const finalFn = fnIsFunction ? fn : fn.get;
  const context = this;
  const config = {
    get() {
      return runWithUnref.call(context, finalFn);
    },
  };
  if (!fnIsFunction) {
    config.set = fn.set;
  }
  return _computed(config);
}

function method(fn) {
  return (...args) => {
    return runWithUnref.call(this, function () {
      fn.apply(this, args);
    });
  };
}

const useSetup = (
  { computed: computedConfig, methods, refs, data },
  options
) => {
  [computedConfig, methods, refs, data]
    .map((obj) => (obj ? Object.keys(obj) : []))
    .flat()
    .forEach((key, _, keys) => {
      if (keys.indexOf(key) !== keys.lastIndexOf(key)) {
        throw new Error(`Key \`${key}\` is duplicated.`);
      }
    });

  const readonlyMode = options?.readonly ?? true;

  // spread to deal with react props
  refs = refs && { ...refs };

  const seq = refs ? [refs] : [];

  let state;
  const vm = new Proxy(
    {},
    {
      get(target, key) {
        for (const obj of seq) {
          if (obj.hasOwnProperty(key)) {
            if (autoUnRef) {
              return unref(
                (state && obj === state.readonlyData ? state.mutableData : obj)[
                  key
                ]
              );
            }
            return obj[key];
          }
        }
        console.warn(`Key \`${key}\` not found.`);
      },
      set(target, key, value) {
        for (const obj of seq) {
          if (obj.hasOwnProperty(key)) {
            (autoUnRef && state && obj === state.readonlyData
              ? state.mutableData
              : obj)[key].value = value;
            return true;
          }
        }
        console.warn(`Key \`${key}\` not found.`);
        return true;
      },
    }
  );

  state = React.useState(() => {
    if (data) {
      const finalData = runWithUnref.call(vm, data);
      const mutableData = mapValues(finalData, (value) =>
        value && typeof value === "object" ? ref(reactive(value)) : ref(value)
      );
      return {
        readonlyData: readonlyMode
          ? mapValues(mutableData, readonly)
          : mutableData,
        mutableData,
      };
    }
  })[0];

  const computed$ =
    computedConfig && mapValues(computedConfig, (fn) => computed.call(vm, fn));

  const methods$ = methods && mapValues(methods, (fn) => method.call(vm, fn));

  seq.push(...[state?.readonlyData, computed$, methods$].filter(Boolean));

  return vm;
};

function runWithUnref(fn) {
  if (typeof fn !== "function") {
    return fn;
  }

  autoUnRef = true;
  try {
    const result = fn.call(this);
    autoUnRef = false;
    return result;
  } catch (e) {
    autoUnRef = false;
    throw e;
  }
}

const render = (value, fn) => {
  return _computed(() => {
    return fn(unref(value));
  });
};

const renderList = (arrayLike, fn) => {
  return _computed(() => {
    try {
      const result = Array.from(unref(arrayLike), fn);
      return result;
    } catch (e) {
      throw e;
    }
  });
};

export { reactify, component, useSetup, render, renderList };
