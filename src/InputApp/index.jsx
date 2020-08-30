import React from 'react';
import { ref, unref } from '@vue/reactivity';
import { Reactive, useMemoOnce } from '../react-reactivity';

const Text$ = (props) => {
  return useMemoOnce(() => {
    return (
      <h4>
        <Reactive>{() => unref(props.text)}</Reactive>
      </h4>
    )
  });
}

const InputApp = () =>
  useMemoOnce(() => {
    const text$ = ref('');
    return (
      <>
        <Reactive>{
          () => (
            <input
              value={text$.value}
              onChange={(e) => { text$.value = e.target.value }}
            />
          )
        }</Reactive>
        <Text$ text={text$} />
      </>
    )
  });

export default InputApp;
