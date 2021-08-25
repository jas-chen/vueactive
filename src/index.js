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

// eslint-disable-next-line no-undef
const isBrowser = typeof window !== "undefined" && globalThis === window;

setIsStaticRendering(!isBrowser);

// const useWatchEffect = (fn, options) => {
//   const effectRef = useRef(useState(() => {
//     return effect(fn, options);
//   })[0]);

//   useEffect(() => {
//     if (!effectRef.current) {
//       effectRef.current = effect(fn, options);
//     }

//     return () => {
//       console.log('unmount')
//       stop(effectRef.current);
//       effectRef.current = null;
//     };
//   }, []);
// };

// const useWatchValue = (ref, options) => {
//   const done = useRef();
//   const firstValue = useRef();

//   useWatchEffect(() => {
//     const value = typeof ref === "function" ? ref() : unref(ref);
//     if (!done.current) {
//       done.current = true;
//       firstValue.current = value;
//     } else {
//       firstValue.current = null;
//       setState(value);
//     }
//   }, options);
//   const [state, setState] = useState(firstValue.current);
//   return state;
// };

// const justTrue = () => true;

// const Reactive = memo(({
//   render,
//   options,
// }) => {
//   return useWatchValue(render, options);
// }, justTrue);

class Reactive extends React.Component {
  constructor(props) {
    super(props);
    let done;
    let firstValue;
    this.runEffect = () => {
      return getEffect(this.props.options?.sync)(() => {
        const { render } = this.props;
        const value = typeof render === "function" ? render() : unref(render);
        if (!done) {
          done = true;
          firstValue = value;
        } else {
          firstValue = null;
          this.setState({ element: value });
        }
      }, this.props.options);
    };

    this.effectRef = this.runEffect();

    this.state = {
      element: firstValue,
    };
  }
  render() {
    return this.state.element;
  }
  componentDidMount() {
    if (!this.effectRef) {
      this.effectRef = this.runEffect();
    }
  }
  componentWillUnmount() {
    this.effectRef?.();
    this.effectRef = null;
  }
  shouldComponentUpdate(nextProps, nextState) {
    return nextState.element !== this.state.element;
  }
}

const createElement = (render, options) => {
  return React.createElement(Reactive, {
    render,
    options,
  });
};

const createComponent = (
  tagName,
  { sync, withRef } = {
    sync:
      typeof tagName === "string" && ["input", "textarea"].includes(tagName),
    withRef: false,
  }
) => {
  const createCommonProps = (restProps, props) => {
    return Object.assign(
      {},
      restProps,
      typeof restProps.children === "function" && {
        children: restProps.children(),
      },
      props?.()
    );
  };

  if (withRef) {
    return React.forwardRef(({ props, options, ...restProps }, ref) => {
      return React.createElement(Reactive, {
        render() {
          return React.createElement(
            tagName,
            Object.assign(createCommonProps(restProps, props), ref && { ref })
          );
        },
        options: {
          sync,
          ...options,
        },
      });
    });
  }

  return ({ props, options, ...restProps }) => {
    return React.createElement(Reactive, {
      render() {
        return React.createElement(
          tagName,
          createCommonProps(restProps, props)
        );
      },
      options: {
        sync,
        ...options,
      },
    });
  };
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
        tagName === "Fragment" ? Fragment : tagName.toLowerCase();

      Component = createComponent(finalTagName, { withRef });
      Component.displayName = `Reactive.${tagName}`;
      target.set(tagName, Component);
    }
    return Component;
  },
});

export {
  // useWatchEffect,
  setIsStaticRendering,
  Reactive,
  createElement,
  createComponent,
  component,
};
