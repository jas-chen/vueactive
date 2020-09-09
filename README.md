# vueactive
[![npm version](https://img.shields.io/npm/v/vueactive.svg?style=flat-square)](https://www.npmjs.com/package/vueactive) [![gzip size](https://img.shields.io/bundlephobia/minzip/vueactive.svg?style=flat-square)](https://bundlephobia.com/result?p=vueactive)

> React bindings for [@vue/reactivity](https://www.npmjs.com/package/@vue/reactivity).

## Installation

```
yarn add vueactive
```

## Examples

Counter

```js
import React from "react";
import { ref } from "@vue/reactivity";
import { R, useForceMemo } from "vueactive";

const Counter = () => {
  return useForceMemo(() => {
    const count$ = ref(0);

    return (
      <>
        <button onClick={() => count$.value--}>-</button>
        <R>{count$}</R>
        <button onClick={() => count$.value++}>+</button>
      </>
    );
  });
};

export default Counter;
```


Clock

```js
import React from "react";
import { ref } from "@vue/reactivity";
import { R, Effect, useForceMemo } from "vueactive";

const getLocaleTimeString = () => new Date().toLocaleTimeString();

const Clock = () => {
  return useForceMemo(() => {
    const time$ = ref(getLocaleTimeString());
    let intervalId;

    return (
      <>
        <Effect>
          {() => {
            intervalId = setInterval(() => {
              time$.value = getLocaleTimeString();
            }, 1000);

            return () => clearInterval(intervalId);
          }}
        </Effect>
        <R>{time$}</R>
      </>
    );
  });
};

export default Clock;
```

[TodoMVC](./examples/TodoMVC/index.js)



## Compare to MobX

| @vue/reactivity | MobX |
|---|---|
| @vue/reactivity [![gzip size](https://img.shields.io/bundlephobia/minzip/@vue/reactivity.svg?style=flat-square)](https://bundlephobia.com/result?p=@vue/reactivity) | mobx@6 [![gzip size](https://img.shields.io/bundlephobia/minzip/mobx@6.0.0-rc.7.svg?style=flat-square)](https://bundlephobia.com/result?p=mobx@6.0.0-rc.7) |
| vueactive [![gzip size](https://img.shields.io/bundlephobia/minzip/vueactive.svg?style=flat-square)](https://bundlephobia.com/result?p=vueactive) | mobx-react [![gzip size](https://img.shields.io/bundlephobia/minzip/mobx-react.svg?style=flat-square)](https://bundlephobia.com/result?p=mobx-react) |
