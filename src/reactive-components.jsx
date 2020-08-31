import React, { useMemo, useState, useEffect, useRef } from 'react';
import { effect, stop, unref } from '@vue/reactivity';

export const Reactive = ({ children: render }) => {
  const [element, setElement] = useState(render);
  const effectRef = useRef();
  useEffect(() => {
    effectRef.current = effect(() => {
      if (!effectRef.current) {
        render()
      } else {
        setElement(render());
      }
    },{
      scheduler: (() => {
        let callback;
        let isFlushing = false;
        return (job) => {
          callback = job;
          if (!isFlushing) {
            isFlushing = true;
            requestAnimationFrame(() => {
              callback();
              isFlushing = false;
            });
          }
        }
      })()
    });

    return () => {
      stop(effectRef.current);
      effectRef.current = undefined;
    }
  }, [render]);
  return element;
}

export const reactive = (render) =>
  <Reactive>{
    typeof render === 'function'
      ? render
      : () => unref(render)
  }</Reactive>

export const useMemoOnce = (fn) => {
  return useMemo(fn, []);
}
