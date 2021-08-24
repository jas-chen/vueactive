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
import React, { useState } from "react";
import { ref } from "@vue/reactivity";
import { reactive as $ } from "vueactive";

const Counter = () => {
  const count$ = useState(() => ref(0))[0];

  return (
    <>
      <button onClick={() => count$.value--}>-</button>
      {$(count$)}
      <button onClick={() => count$.value++}>+</button>
    </>
  );
};

export default Counter;
```

[TodoMVC](./examples/TodoMVC/index.js)



## Compare to MobX

| @vue/reactivity | MobX |
|---|---|
| @vue/reactivity [![gzip size](https://img.shields.io/bundlephobia/minzip/@vue/reactivity.svg?style=flat-square)](https://bundlephobia.com/result?p=@vue/reactivity) | mobx [![gzip size](https://img.shields.io/bundlephobia/minzip/mobx.svg?style=flat-square)](https://bundlephobia.com/result?p=mobx) |
| vueactive [![gzip size](https://img.shields.io/bundlephobia/minzip/vueactive.svg?style=flat-square)](https://bundlephobia.com/result?p=vueactive) | mobx-react [![gzip size](https://img.shields.io/bundlephobia/minzip/mobx-react.svg?style=flat-square)](https://bundlephobia.com/result?p=mobx-react) |
