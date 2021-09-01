import React from "react";
import { reactive, ref } from "@vue/runtime-core";
import {
  component,
  useConstant,
  renderList,
  setup,
  computed,
} from "vueactive";

const { Input, Ul, Label, A, Li, Fragment, Strong } = component;

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
};

const EditTodoInput = ({ initLabel, onSubmit, onFinish }) => {
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
          vm.label = "";
          onFinish();
        }
      }}
    />
  );
};

const TodoItem = (props) => {
  return useConstant(() => {
    const vm = setup({
      refs: props,
      computed: {
        listClassName() {
          return [
            vm.todo.done ? "completed" : "",
            vm.editingTodoId === vm.todo.id ? "editing" : "",
          ].join(" ");
        },
        label() {
          return vm.todo.label;
        },
        checked() {
          return vm.todo.done;
        },
      },
    });

    return (
      <Li className={vm.listClassName}>
        <div className="view">
          <Input
            type="checkbox"
            className="toggle"
            checked={vm.checked}
            onChange={() => {
              vm.todo.done = !vm.todo.done;
            }}
          />
          <Label
            onDoubleClick={() => {
              props.editingTodoId.value = vm.todo.id;
            }}
          >
            {vm.label}
          </Label>
          <button className="destroy" onClick={vm.onDestroyClick} />
        </div>
        <Fragment>
          {computed(
            () =>
              vm.editingTodoId === vm.todo.id && (
                <EditTodoInput
                  initLabel={vm.todo.label}
                  onSubmit={(label) => {
                    vm.todo.label = label;
                  }}
                  onFinish={() => {
                    props.editingTodoId.value = null;
                  }}
                />
              )
          )}
        </Fragment>
      </Li>
    );
  });
};

const FilterRow = ({ filterKey }) => {
  return useConstant(() => {
    const vm = setup({
      refs: {
        routeName: Router.routeName$,
      },
      computed: {
        className() {
          return vm.routeName === filterKey ? "selected" : "";
        },
      },
    });

    return (
      <li>
        <A href={Router.getPath(filterKey)} className={vm.className}>
          {filterKeyLabelMap[filterKey]}
        </A>
      </li>
    );
  });
};

const App = () => {
  return useConstant(() => {
    const data = reactive({
      todoList: [],
    });

    const editingTodoId = ref(undefined);

    const vm = setup({
      refs: {
        routeName: Router.routeName$,
      },
      computed: {
        filteredTodoList() {
          if (vm.routeName === "ALL") {
            return data.todoList;
          }

          const filterValue = vm.routeName === "COMPLETED";
          return data.todoList.filter(({ done }) => done === filterValue);
        },
        itemsLeft() {
          return data.todoList.reduce(
            (sum, todo) => (sum += todo.done ? 0 : 1),
            0
          );
        },
        isAllCompleted() {
          return (
            data.todoList.length > 0 && data.todoList.every((todo) => todo.done)
          );
        },
      },
      methods: {
        onToggleAll() {
          const done = !vm.isAllCompleted;
          data.todoList.forEach((todo) => {
            todo.done = done;
          });
        },
        onClearCompletedClick() {
          data.todoList = data.todoList.filter(({ done }) => !done);
        },
      },
    });

    return (
      <>
        <div className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <NewTodoInput
              onSubmit={(label) =>
                data.todoList.unshift({
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
              checked={vm.isAllCompleted}
              onChange={vm.onToggleAll}
            />
            <label htmlFor="toggle-all" />
            <Ul className="todo-list">
              {renderList(vm.filteredTodoList, "id", (todo) => (
                <TodoItem
                  todo={todo}
                  editingTodoId={editingTodoId}
                  onDestroyClick={() => {
                    data.todoList.splice(
                      data.todoList.findIndex(({ id }) => id === todo.id),
                      1
                    );
                  }}
                />
              ))}
            </Ul>
          </section>
          <footer className="footer">
            <span className="todo-count">
              <Strong>{vm.itemsLeft}</Strong> items left
            </span>
            <ul className="filters">
              {renderList(
                ["ALL", "ACTIVE", "COMPLETED"],
                (filterKey) => filterKey,
                (filterKey) => (
                  <FilterRow filterKey={filterKey} />
                )
              )}
            </ul>
            <button
              className="clear-completed"
              onClick={vm.onClearCompletedClick}
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
