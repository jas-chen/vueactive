import { useMemo, useState, useEffect, useRef } from 'react';
import { effect, stop, unref } from '@vue/reactivity';

const scheduler = (() => {
  let jobs = new Set();
  let isFlushing = false;
  const executeJobs = () => {
    for (const job of jobs) {
      job();
    }

    jobs = new Set();
    isFlushing = false;
  }

  return (job) => {
    jobs.add(job);
    if (!isFlushing) {
      isFlushing = true;
      Promise.resolve().then(executeJobs);
    }
  }
})();

const R = ({ children, ...props }) => {
  const render = useMemo(() => {
    return typeof children === 'function'
      ? children
      : () => unref(children);
  }, [children]);
  const [element, setElement] = useState(render);
  const effectRef = useRef();
  useEffect(() => {
    const update = () => {
      if (!effectRef.current) {
        render()
      } else {
        setElement(render());
      }
    }

    effectRef.current = effect(update, { scheduler, ...props });

    return () => {
      stop(effectRef.current);
      effectRef.current = undefined;
    }
  }, [render]);
  return element;
}

export default R;
