import React from 'react';
import { ref, unref } from '@vue/reactivity';
import { Rc, useMemoOnce } from '../react-reactivity';

const Text$ = (props) => {
  return useMemoOnce(() => {
    return (
      <h4>
        <Rc>{() => unref(props.text)}</Rc>
      </h4>
    )
  });
}

const InputApp = () =>
  useMemoOnce(() => {
    const text$ = ref('');
    return (
      <>
        <Rc>{
          () => (
            <input
              value={text$.value}
              onChange={(e) => { text$.value = e.target.value }}
            />
          )
        }</Rc>
        <Text$ text={text$} />
      </>
    )
  });

export default InputApp;
