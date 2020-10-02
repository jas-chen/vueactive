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
import { useRunOnce, Watch } from "vueactive";

const Counter = () => {
  return useRunOnce(() => {
    const count$ = ref(0);

    return (
      <>
        <button onClick={() => count$.value--}>-</button>
        <Watch>{count$}</Watch>
        <button onClick={() => count$.value++}>+</button>
      </>
    );
  });
};

export default Counter;
```


Clock

```js
import React, { useEffect } from "react";
import { ref } from "@vue/reactivity";
import { useRunOnce, Watch } from "vueactive";

const getLocaleTimeString = () => new Date().toLocaleTimeString();

const Clock = () => {
  const time$ = useRunOnce(() => ref(getLocaleTimeString()));

  useEffect(() => {
    const intervalId = setInterval(() => {
      time$.value = getLocaleTimeString();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return useRunOnce(() => (
    <Watch>{time$}</Watch>
  ));
};

export default Clock;
```

[TodoMVC](./examples/TodoMVC/index.js)



## Compare to MobX

| @vue/reactivity | MobX |
|---|---|
| @vue/reactivity [![gzip size](https://img.shields.io/bundlephobia/minzip/@vue/reactivity.svg?style=flat-square)](https://bundlephobia.com/result?p=@vue/reactivity) | mobx [![gzip size](https://img.shields.io/bundlephobia/minzip/mobx.svg?style=flat-square)](https://bundlephobia.com/result?p=mobx) |
| vueactive [![gzip size](https://img.shields.io/bundlephobia/minzip/vueactive.svg?style=flat-square)](https://bundlephobia.com/result?p=vueactive) | mobx-react [![gzip size](https://img.shields.io/bundlephobia/minzip/mobx-react.svg?style=flat-square)](https://bundlephobia.com/result?p=mobx-react) |
