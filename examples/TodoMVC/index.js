import React, { useState } from "react";
import { ref, reactive, computed, unref as _ } from "@vue/reactivity";
import { reactive as $, component } from "./vueactive";

const { Input, Ul, Li, Label, A } = component;

document.head.insertAdjacentHTML(
  "beforeend",
  '<link href="https://unpkg.com/todomvc-app-css@2.3.0/index.css" rel="stylesheet">'
);

const createRouter = (routerConfig, defaultUrl = "#/") => {
  const paths = Object.keys(routerConfig);
  const isPathValid = () => paths.includes(window.location.hash);

  if (!isPathValid()) {
    window.location.hash = defaultUrl;
  }

  const routeName$ = ref(routerConfig[window.location.hash]);

  window.addEventListener("hashchange", () => {
    if (!isPathValid()) {
      window.location.hash = defaultUrl;
    } else {
      routeName$.value = routerConfig[window.location.hash];
    }
  });

  return {
    routeName$,
    getPath: (routeName) =>
      paths.find((hash) => routerConfig[hash] === routeName),
  };
};

const Router = createRouter({
  "#/": "ALL",
  "#/active": "ACTIVE",
  "#/completed": "COMPLETED",
});

const filterKeyLabelMap = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const NewTodoInput = ({ onSubmit }) => {
  const label$ = useState(() => ref(""))[0];

  return (
    <Input
      ref={(element) => element?.focus()}
      className="new-todo"
      placeholder="What needs to be done?"
      value={_(label$)}
      onChange={(e) => {
        label$.value = e.target.value;
      }}
      onKeyPress={(e) => {
        if (e.key === "Enter" && e.target.value) {
          onSubmit(e.target.value.trim());
          label$.value = "";
        }
      }}
      props={() => ({
        value: _(label$),
      })}
    />
  );
};

const EditTodoInput = ({ initLabel, onSubmit, onFinish }) => {
  const label$ = useState(() => ref(initLabel))[0];

  return (
    <Input
      className="edit"
      ref={(input) => input && input.focus()}
      onChange={(e) => {
        label$.value = e.target.value;
      }}
      onBlur={onFinish}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSubmit(e.target.value);
          onFinish();
        } else if (e.key === "Escape") {
          label$.value = "";
          onFinish();
        }
      }}
      props={() => ({
        value: _(label$),
      })}
    />
  );
};

const App = ({ routeName$ = Router.routeName$ }) => {
  const todoList = useState(reactive([]))[0];
  const editingTodoId$ = useState(() => ref())[0];

  const filteredTodoList$ = computed(() => {
    const routeName = _(routeName$);
    if (routeName === "ALL") {
      return todoList;
    }

    const filterValue = routeName === "COMPLETED";
    return todoList.filter(({ done }) => done === filterValue);
  });

  const itemsLeft$ = computed(() =>
    todoList.reduce((sum, todo) => (sum += !todo.done ? 1 : 0), 0)
  );

  const isAllCompleted$ = computed(
    () =>
      todoList.length &&
      todoList.reduce((sum, todo) => sum + (todo.done ? 1 : 0), 0) ===
        todoList.length
  );

  const onToggleAll = () => {
    const done = isAllCompleted$.value ? false : true;
    todoList.forEach((todo) => {
      todo.done = done;
    });
  };

  const onClearCompletedClick = () => {
    const notDoneTodoList = todoList.filter(({ done }) => !done);
    todoList.length = notDoneTodoList.length;
    notDoneTodoList.forEach((todo, i) => {
      todoList[i] = todo;
    });
  };

  return (
    <>
      <div className="todoapp">
        <header className="header">
          <h1>todos</h1>
          <NewTodoInput
            onSubmit={(label) =>
              todoList.unshift({
                id: new Date().getTime(),
                label,
                done: false,
              })
            }
          />
        </header>
        <section className="main">
          <Input
            id="toggle-all"
            type="checkbox"
            className="toggle-all"
            onChange={onToggleAll}
            props={() => ({
              checked: _(isAllCompleted$),
            })}
          />
          <label htmlFor="toggle-all" />
          <Ul className="todo-list">
            {() =>
              _(filteredTodoList$).map((todo) => (
                <Li
                  key={todo.id}
                  props={() => ({
                    className: [
                      todo.done ? "completed" : "",
                      _(editingTodoId$) === todo.id ? "editing " : "",
                    ].join(" "),
                  })}
                >
                  <div className="view">
                    <Input
                      type="checkbox"
                      className="toggle"
                      onChange={() => {
                        todo.done = !todo.done;
                      }}
                      props={() => ({
                        checked: todo.done,
                      })}
                    />
                    <Label
                      onDoubleClick={() => {
                        editingTodoId$.value = todo.id;
                      }}
                    >
                      {() => todo.label}
                    </Label>
                    <button
                      className="destroy"
                      onClick={() => {
                        todoList.splice(
                          todoList.findIndex(({ id }) => id === todo.id),
                          1
                        );
                      }}
                    />
                  </div>
                  {$(() =>
                    _(editingTodoId$) === todo.id && (
                      <EditTodoInput
                        initLabel={todo.label}
                        onSubmit={(label) => {
                          todo.label = label;
                        }}
                        onFinish={() => {
                          editingTodoId$.value = null;
                        }}
                      />
                    )
                  )}
                </Li>
              ))
            }
          </Ul>
        </section>
        <footer className="footer">
          <span className="todo-count">
            <strong>
              {$(() => _(itemsLeft$))}
            </strong>{" "}
            items left
          </span>
          <ul className="filters">
            {["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
              <li key={filterKey}>
                <A
                  href={Router.getPath(filterKey)}
                  props={() => ({
                    className: _(routeName$) === filterKey ? "selected" : "",
                  })}
                >
                  {filterKeyLabelMap[filterKey]}
                </A>
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
};

export default App;
