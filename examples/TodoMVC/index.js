import React from "react";
import { ref, reactive, computed } from "@vue/reactivity";
import { R, Effect, useForceMemo } from "vueactive";

document.head.insertAdjacentHTML(
  "beforeend",
  '<link href="https://unpkg.com/todomvc-app-css@2.3.0/index.css" rel="stylesheet">',
);

const hashFilterKeyMap = {
  "#/": "ALL",
  "#/active": "ACTIVE",
  "#/completed": "COMPLETED",
};

const filterKeyLabelMap = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const hashes = Object.keys(hashFilterKeyMap);

const isUrlValid = () => hashes.includes(window.location.hash);

if (!isUrlValid()) {
  window.location.hash = "#/";
}
const Rerendr = () => {
  console.log("rerenderd");
  return null;
};

const TodoItem = ({ todo, editingTodo, onDestroy }) => {
  return useForceMemo(() => {
    const checkbox = (
      <R>
        {() => (
          <input
            type="checkbox"
            className="toggle"
            checked={todo.done}
            onChange={() => {
              todo.done = !todo.done;
            }}
          />
        )}
      </R>
    );

    const label = <R>{() => todo.label}</R>;

    const editInput = (
      <R>
        {() =>
          editingTodo.id === todo.id && (
            <input
              className="edit"
              value={editingTodo.label}
              ref={(input) => input && input.focus()}
              onChange={(e) => {
                editingTodo.label = e.target.value;
              }}
              onBlur={() => {
                editingTodo.id = null;
              }}
              onKeyDown={({ key }) => {
                if (["Enter", "Escape"].includes(key)) {
                  if (key === "Enter") {
                    todo.label = editingTodo.label;
                  }
                  editingTodo.id = null;
                }
              }}
            />
          )
        }
      </R>
    );

    const view = (
      <div className="view">
        <Rerendr />
        {checkbox}
        <label
          onDoubleClick={() => {
            Object.assign(editingTodo, todo);
          }}
        >
          {label}
        </label>
        <button className="destroy" onClick={() => onDestroy(todo)} />
      </div>
    );

    return (
      <R>
        {() => {
          return (
            <li
              className={[
                todo.done ? "completed" : "",
                editingTodo.id === todo.id ? "editing " : "",
              ].join(" ")}
            >
              {view}
              {editInput}
            </li>
          );
        }}
      </R>
    );
  });
};

const App = () => {
  return useForceMemo(() => {
    const todoFilter$ = ref(hashFilterKeyMap[window.location.hash]);
    const newTodo = (label) => ({
      id: new Date().getTime(),
      label: (label || "").trim(),
      done: false,
    });
    const todoList$ = reactive([]);
    const filteredTodoList$ = computed(() => {
      if (todoFilter$.value === "ALL") {
        return todoList$;
      }

      const filterValue = todoFilter$.value === "COMPLETED";
      return todoList$.filter(({ done }) => done === filterValue);
    });
    const itemsLeft$ = computed(() =>
      todoList$.reduce((sum, todo) => (sum += !todo.done ? 1 : 0), 0),
    );
    const isAllCompleted$ = computed(
      () =>
        todoList$.length &&
        todoList$.reduce((sum, todo) => sum + (todo.done ? 1 : 0), 0) ===
          todoList$.length,
    );

    const newTodo$ = ref("");
    const editingTodo$ = reactive({});

    const onNewTodoChange = (e) => {
      newTodo$.value = e.target.value;
    };
    const onAddTodo = (e) => {
      if (e.key === "Enter") {
        const { value } = newTodo$;
        if (value) {
          todoList$.unshift(newTodo(value));
          newTodo$.value = "";
        }
      }
    };

    const destroy = (todo) => todoList$.splice(todoList$.indexOf(todo), 1);
    const renderTodoItem = (todo) => (
      <TodoItem
        key={todo.id}
        todo={todo}
        editingTodo={editingTodo$}
        onDestroy={destroy}
      />
    );

    const onClearCompletedClick = () => {
      const notCompletedTodoList = todoList$.filter(({ done }) => !done);
      todoList$.length = notCompletedTodoList.length;
      notCompletedTodoList.forEach((todo, i) => {
        todoList$[i] = todo;
      });
    };

    return (
      <>
        <Effect>
          {() => {
            const setTodoFilter = () => {
              if (!isUrlValid()) {
                window.location.hash = "#/";
              } else {
                todoFilter$.value = hashFilterKeyMap[window.location.hash];
              }
            };

            window.addEventListener("hashchange", setTodoFilter);

            return () =>
              window.removeEventListener("hashchange", setTodoFilter);
          }}
        </Effect>
        <div className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <R>
              {() => (
                <input
                  className="new-todo"
                  placeholder="What needs to be done?"
                  value={newTodo$.value}
                  onChange={onNewTodoChange}
                  onKeyPress={onAddTodo}
                />
              )}
            </R>
          </header>

          <section className="main">
            <R>
              {() => (
                <input
                  id="toggle-all"
                  type="checkbox"
                  className="toggle-all"
                  checked={isAllCompleted$.value}
                  onChange={() => {
                    const done = isAllCompleted$.value ? false : true;
                    todoList$.forEach((todo) => {
                      todo.done = done;
                    });
                  }}
                />
              )}
            </R>
            <label htmlFor="toggle-all" />
            <ul className="todo-list">
              <R>{() => filteredTodoList$.value.map(renderTodoItem)}</R>
            </ul>
          </section>

          <footer className="footer">
            <span className="todo-count">
              <strong>
                <R>{itemsLeft$}</R>
              </strong>{" "}
              items left
            </span>
            <ul className="filters">
              {["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
                <li key={filterKey}>
                  <R>
                    {() => (
                      <a
                        href={hashes.find(
                          (hash) => hashFilterKeyMap[hash] === filterKey,
                        )}
                        className={
                          todoFilter$.value === filterKey ? "selected" : ""
                        }
                      >
                        {filterKeyLabelMap[filterKey]}
                      </a>
                    )}
                  </R>
                </li>
              ))}
            </ul>
            <button className="clear-completed" onClick={onClearCompletedClick}>
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