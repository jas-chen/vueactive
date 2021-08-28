import React from "react";
import { ref, toRef, unref as _ } from "@vue/reactivity";
import {
  createElement as $,
  component,
  forceMemo,
  useUnRefs,
  useReactive,
} from "vueactive";

const { Input, Ul, Label, A, Li } = component;

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

const NewTodoInput = forceMemo(({ onSubmit }) => {
  return (
    <input
      ref={(element) => element?.focus()}
      className="new-todo"
      placeholder="What needs to be done?"
      onKeyPress={(e) => {
        if (e.key === "Enter" && e.target.value) {
          onSubmit(e.target.value.trim());
          e.target.value = "";
        }
      }}
    />
  );
});

const EditTodoInput = forceMemo(({ initLabel, onSubmit, onFinish }) => {
  return (
    <input
      className="edit"
      ref={(input) => {
        if (input) {
          input.focus();
        }
      }}
      defaultValue={initLabel}
      onBlur={onFinish}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSubmit(e.target.value);
          onFinish();
        } else if (e.key === "Escape") {
          data.label = "";
          onFinish();
        }
      }}
    />
  );
});

const TodoItem = forceMemo(({ todo, editingTodoId$, onDestroyClick }) => {
  return (
    <Li
      props={() => ({
        className: [
          todo.done ? "completed" : "",
          _(editingTodoId$) === todo.id ? "editing" : "",
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
        <button className="destroy" onClick={onDestroyClick} />
      </div>
      {$(
        () =>
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
  );
});

const App = (rawProps) => {
  const props = useUnRefs(rawProps);
  const vm = useReactive(() => ({
    data: {
      todoList: [],
      editingTodoId: undefined,
    },
    computed: {
      filteredTodoList() {
        if (props.routeName === "ALL") {
          return vm.todoList;
        }

        const filterValue = props.routeName === "COMPLETED";
        return vm.todoList.filter(({ done }) => done === filterValue);
      },
      itemsLeft() {
        return vm.todoList.reduce((sum, todo) => (sum += todo.done ? 0 : 1), 0);
      },
      isAllCompleted() {
        return vm.todoList.every((todo) => todo.done);
      },
    },
  }));

  const editingTodoId$ = toRef(vm, "editingTodoId");

  const onToggleAll = () => {
    const done = !_(vm.isAllCompleted);
    vm.todoList.forEach((todo) => {
      todo.done = done;
    });
  };

  const onClearCompletedClick = () => {
    const notDoneTodoList = vm.todoList.filter(({ done }) => !done);
    vm.todoList.length = notDoneTodoList.length;
    notDoneTodoList.forEach((todo, i) => {
      vm.todoList[i] = todo;
    });
  };

  return (
    <>
      <div className="todoapp">
        <header className="header">
          <h1>todos</h1>
          <NewTodoInput
            onSubmit={(label) =>
              vm.todoList.unshift({
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
              checked: vm.isAllCompleted,
            })}
          />
          <label htmlFor="toggle-all" />
          <Ul className="todo-list">
            {() =>
              vm.filteredTodoList.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  editingTodoId$={editingTodoId$}
                  onDestroyClick={() => {
                    vm.todoList.splice(
                      vm.todoList.findIndex(({ id }) => id === todo.id),
                      1
                    );
                  }}
                />
              ))
            }
          </Ul>
        </section>
        <footer className="footer">
          <span className="todo-count">
            <strong>{$(() => vm.itemsLeft)}</strong> items left
          </span>
          <ul className="filters">
            {["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
              <li key={filterKey}>
                <A
                  href={Router.getPath(filterKey)}
                  props={() => ({
                    className: props.routeName === filterKey ? "selected" : "",
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

App.defaultProps = {
  routeName: Router.routeName$,
};

export default App;
