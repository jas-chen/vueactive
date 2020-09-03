import { useMemo, useState, useEffect, useRef } from "react";
import { effect, stop, unref } from "@vue/reactivity";

const scheduler = (() => {
  let jobs = new Set();
  let isFlushing = false;
  const executeJobs = () => {
    for (const job of jobs) {
      job();
    }

    jobs = new Set();
    isFlushing = false;
  };

  return (job) => {
    jobs.add(job);
    if (!isFlushing) {
      isFlushing = true;
      Promise.resolve().then(executeJobs);
    }
  };
})();

const Reactive = ({ children, onTrack, onTrigger, onStop }) => {
  const effectOptions = useMemo(
    () => ({
      scheduler,
      onTrack,
      onTrigger,
      onStop,
    }),
    [onTrack, onTrigger, onStop],
  );

  const effectRef = useRef();
  const render = useMemo(() => {
    return typeof children === "function" ? children : () => unref(children);
  }, [children]);

  const [element, setElement] = useState(() => {
    let _element;
    effectRef.current = effect(() => {
      if (!effectRef.current) {
        _element = render();
      } else {
        setElement(render());
      }
    }, effectOptions);

    return _element;
  });

  useEffect(() => {
    if (!effectRef.current) {
      effectRef.current = effect(() => {
        setElement(render());
      }, effectOptions);
    }

    return () => {
      stop(effectRef.current);
      effectRef.current = undefined;
    };
  }, [render, effectOptions]);

  return element;
};

export const Effect = ({ children }) => {
  useEffect(children, [children]);
  return null;
};

export default Reactive;
