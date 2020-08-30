import React from 'react';
import { ref, computed, unref } from '@vue/reactivity';
import { useMemoOnce, reactive as r } from '../react-reactivity';

const Counter$ = ({ name }) =>
  useMemoOnce(() => {
    const count$ = ref(0);

    return (
      <div>
        {r(name)}
        {' '}counter:{' '}
        {r(count$)}
        <button onClick={() => count$.value++}>+</button>
        <div>
          {
            r(() => {
              return unref(name) === 'outer' &&
                (() => {
                  const innerName$ = computed(
                    () => `[outer counter: ${count$.value}] inner`
                  );
                  return <Counter$ name={innerName$} />
                })();
            })
          }
        </div>
      </div>
    );
  });

export default Counter$;
