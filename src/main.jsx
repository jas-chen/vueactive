import React from 'react'
import ReactDOM from 'react-dom'
import * as reactivity from '@vue/reactivity'
import CounterApp from './CounterApp'
// import InputApp from './InputApp'

console.log({ reactivity });

const App = CounterApp;
// const App = InputApp;

ReactDOM.render(
  <App />,
  document.getElementById('root')
)
