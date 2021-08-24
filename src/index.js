import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
  createElement,
  Component,
  forwardRef,
  Fragment,
} from "react";
import {
  effect as reactivityEffect,
  stop,
  unref,
} from "@vue/reactivity";

const dumbEffect = (callback) => callback();

let effect;

const setIsStaticRendering = (isStaticRendering) => {
  effect = isStaticRendering ? dumbEffect : reactivityEffect;
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

class Reactive extends Component {
  constructor(props) {
    super(props);
    let done;
    let firstValue;
    this.runEffect = () => {
      return effect(() => {
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
    }

    this.effectRef = this.runEffect();

    this.state = {
      element: firstValue
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
    stop(this.effectRef);
    this.effectRef = null;
  }
  shouldComponentUpdate(nextProps, nextState) {
    return nextState.element !== this.state.element;
  }
}

const reactive = (render, options) => {
  return createElement(Reactive, {
    render,
    options,
  });
}

const component = new Proxy(new Map(), {
  get(target, tagName) {
    let Component = target.get(tagName);
    if (!Component) {
      Component = forwardRef(({ props, ...restProps}, ref) => {
        return createElement(Reactive, {
          render() {
            return createElement(
              tagName === 'Fragment' ? Fragment : tagName.toLowerCase(),
              Object.assign(
                {},
                restProps,
                typeof restProps.children === 'function' && { children: restProps.children() },
                props?.(),
                ref && { ref },
              ),
            )
          },
        });
      });
      Component.displayName = `Reactive.${tagName}`;
      target.set(tagName, Component);
    }
    return Component;
  },
});

export {
  setIsStaticRendering,
  // useWatchEffect,
  Reactive,
  reactive,
  component,
};
