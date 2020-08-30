import React, { useMemo, useState, useEffect, useRef } from 'react';
import { effect, stop, unref } from '@vue/reactivity';

export const Reactive = ({ children: render }) => {
  const [element, setElement] = useState(render);
  const effectRef = useRef();
  useEffect(() => {
    effectRef.current = effect(() => {
      const nextElement = render();
      if (effectRef.current) {
        setElement(nextElement);
      }
    })

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
