# vueactive
> React bindings for [@vue/reactivity](https://www.npmjs.com/package/@vue/reactivity).

## Installation

```
yarn add vueactive
```

## Usage

Clock example

```js
import React from "react";
import { ref } from "@vue/reactivity";
import R, { Effect, useForceMemo } from "vueactive";

const App = () => {
  return useForceMemo(() => {
    const time$ = ref(new Date().toLocaleTimeString());
    let intervalId;

    return (
      <>
        <Effect>
          {() => {
            intervalId = setInterval(() => {
              time$.value = new Date().toLocaleTimeString();
            }, 1000);

            return () => clearInterval(intervalId);
          }}
        </Effect>
        <R>{time$}</R>
      </>
    );
  });
};

export default App;
```

[TodoMVC](./examples/TodoMVC/index.js)
