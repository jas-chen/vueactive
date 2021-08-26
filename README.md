# vueactive
[![npm version](https://img.shields.io/npm/v/vueactive.svg?style=flat-square)](https://www.npmjs.com/package/vueactive) [![gzip size](https://img.shields.io/bundlephobia/minzip/vueactive.svg?style=flat-square)](https://bundlephobia.com/result?p=vueactive)

> React bindings for [@vue/reactivity](https://www.npmjs.com/package/@vue/reactivity).

## Installation

```
yarn add vueactive @vue/runtime-core
```

## Examples

Counter

```js
import React, { useState } from "react";
import { ref } from "@vue/reactivity";
import { createElement as $ } from "vueactive";

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