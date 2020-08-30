import React from 'react';
import { ref, computed, unref } from '@vue/reactivity';
import { useMemoOnce, Rc } from '../react-reactivity';

const Counter$ = ({ name }) =>
  useMemoOnce(() => {
    const count$ = ref(0);

    return (
      <div>
        <Rc unref={name} />
        {' '}counter:{' '}
        <Rc unref={count$} />
        <button onClick={() => count$.value++}>+</button>
        <div>
          <Rc>
            {
              () => unref(name) === 'outer' &&
              (() => {
                const innerName$ = computed(() => `[outer counter: ${count$.value}] inner`);
                return <Counter$ name={innerName$} />
              })()
            }
          </Rc>
        </div>
      </div>
    );
  });

export default Counter$;
