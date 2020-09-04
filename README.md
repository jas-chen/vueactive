# reactive-components
> Reactive React components, powered by [@vue/reactivity](https://www.npmjs.com/package/@vue/reactivity).

## Installation

```
yarn add @jas-chen/reactive-components
```

## Usage

Clock example

```js
import React from "react";
import { ref } from "@vue/reactivity";
import R, { Effect, useForceMemo } from "@jas-chen/reactive-components";

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
