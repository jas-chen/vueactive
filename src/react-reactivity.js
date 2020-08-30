import { effect, stop, unref } from "@vue/reactivity";
import { Component, useMemo } from "react";

export class Rc extends Component {
  constructor(props) {
    super(props);
    if (props.children) {
      this.createElement = props.children;
    } else {
      this.createElement = () => unref(props.unref);
    }

    if (props.unref && props.children) {
      console.warn('Prop `children` and prop `unref` provided in the same time. Prop `unref` will be ignored.')
    }

    this.state = { $$element: this.createElement() };
  }
  render() {
    return this.state.$$element;
  }
  shouldComponentUpdate(nextProps, nextState) {
    return nextState.$$element !== this.state.$$element;
  }
  componentDidMount() {
    this.effectRef = effect(() => {
      const element = this.createElement();
      if (this.effectRef) {
        this.setState({ $$element: element });
      }
    });
  }
  componentWillUnmount() {
    stop(this.effectRef);
  }
}

export const useMemoOnce = (fn) => {
  return useMemo(fn, []);
}
