import React, { useMemo, useEffect } from 'react';
import { ref, reactive, computed } from '@vue/reactivity';
import R, { Effect } from '../reactive-components';

document.head.insertAdjacentHTML(
  'beforeend',
  '<link href="https://unpkg.com/todomvc-app-css@2.3.0/index.css" rel="stylesheet">'
);

const validHash = () => ['#/', '#/active', '#/completed'].includes(location.hash);

if (!validHash()) {
  location.hash = '#/';
}

const hashFilterMap = {
  '#/': 'ALL',
  '#/active': 'ACTIVE',
  '#/completed': 'COMPLETED',
};

const App = () => {
  return useMemo(() => {
    const todoFilter$ = ref(hashFilterMap[location.hash]);
    const newTodo = label => ({
      id: (new Date()).getTime(),
      label: (label || '').trim(),
      done: false,
    });
    const todoList$ = reactive([]);
    const filteredTodoList$ = computed(() => {
      if (todoFilter$.value === 'ALL') {
        return todoList$;
      }

      const filterValue = todoFilter$.value === 'COMPLETED';
      return todoList$.filter(({ done }) => done === filterValue);
    })
    const itemsLeft$ = computed(() => todoList$.reduce(
      (sum, todo) => sum += !todo.done ? 1 : 0,
      0,
    ));
    const isAllCompleted$ = computed(() =>
      todoList$.length 
      && todoList$.reduce(
        (sum, todo) => sum + (todo.done ? 1 : 0),
        0
      ) === todoList$.length
    );

    const newTodo$ = ref('');
    const editingTodo$ = ref(null);

    const onNewTodoChange = (e) => {
      newTodo$.value = e.target.value;
    }
    const onAddTodo = (e) => {
      if (e.key === "Enter") {
        const { value } = newTodo$;
        if (value) {
          todoList$.unshift(newTodo(value));
          newTodo$.value = '';
        }
      }
    }

    return (
      <>
        <Effect>{() => {
          const setTodoFilter = () => {
            if (!validHash()) {
              location.hash = '#/';
            } else {
              todoFilter$.value = hashFilterMap[location.hash];
            }
          }

          window.addEventListener('hashchange', setTodoFilter);

          return () => window.removeEventListener('hashchange', setTodoFilter);
        }}</Effect>
        <div className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <R>{
              () => (
                <input
                  className="new-todo"
                  placeholder="What needs to be done?"
                  value={newTodo$.value}
                  onChange={onNewTodoChange}
                  onKeyPress={onAddTodo}
                />
              )
            }</R>
          </header>

          <section className="main">
            <R>{() => (
              <input
                id="toggle-all"
                type="checkbox"
                className="toggle-all"
                checked={isAllCompleted$.value}
                onChange={() => {
                  const setTo = isAllCompleted$.value ? false : true;
                  todoList$.forEach((todo) => {
                    todo.done = setTo;
                  });
                }}
              />
            )}</R>
            <label htmlFor="toggle-all" />
            <ul className="todo-list">
            <R>{
                () =>
                  filteredTodoList$.value.map((todo) => {
                    console.log(todo);
                    const destroyBtn = (
                      <button
                        className="destroy"
                        onClick={() => todoList$.splice(todoList$.indexOf(todo), 1)}
                      />
                    );
                    return (
                      <R key={todo.id}>{
                        () => (
                          <li
                            className={
                              [
                                todo.done ? 'completed' : '',
                                editingTodo$.value === todo ? 'editing ' : '',
                              ].join('')
                            }
                          >
                            <div className="view">
                              <input
                                type="checkbox"
                                className="toggle"
                                checked={todo.done}
                                onChange={() => {
                                  todo.done = !todo.done
                                }}
                              />
                              <label onDoubleClick={() => {
                                editingTodo$.value = todo;
                              }}>{todo.label}</label>
                              {destroyBtn}
                            </div>
                            {
                              editingTodo$.value === todo
                              && (
                                <input
                                  className="edit"
                                  value={editingTodo$.value.label}
                                  onChange={(e) => {
                                    editingTodo$.value.label = e.target.value;
                                  }}
                                  onBlur={() => {
                                    editingTodo$.value = null;
                                  }}
                                  onKeyDown={({key}) => {
                                    if (['Enter', 'Escape'].includes(key)) {
                                      editingTodo$.value = null;
                                    }
                                  }}
                                />
                              )
                            }
                          </li>
                        )
                      }</R>
                    )})
            }</R>
            </ul>
          </section>

          <footer className="footer">
            <span className="todo-count">
              <strong>
              <R>{itemsLeft$}</R>
              </strong> items left
            </span>
            <ul className="filters">
              <li>
                <R>{() => (
                  <a href="#/" className={todoFilter$.value === 'ALL' ? 'selected' : ''}>All</a>
                )}</R>
              </li>
              <li>
                <R>{() => (
                  <a href="#/active" className={todoFilter$.value === 'ACTIVE' ? 'selected' : ''}>Active</a>
                )}</R>
              </li>
              <li>
                <R>{() => (
                  <a href="#/completed" className={todoFilter$.value === 'COMPLETED' ? 'selected' : ''}>Completed</a>
                )}</R>
              </li>
            </ul>
            <button
              className="clear-completed"
              onClick={() => {
                const notCompletedTodoList = todoList$.filter(({ done }) => !done);
                if (todoList$.length - notCompletedTodoList.length > 0) {
                  todoList$.splice(
                    0,
                    todoList$.length,
                    ...notCompletedTodoList,
                  );
                }
              }}
            >
              Clear completed
            </button>
          </footer>
        </div>
        <footer className="info">
          <p>Double-click to edit a todo</p>
          <p>
            Created by <a href="http://github.com/jas-chen/">Jas Chen</a>
          </p>
          <p>
            Part of <a href="http://todomvc.com">TodoMVC</a>
          </p>
        </footer>
      </>
    );
  });
};

export default App;
