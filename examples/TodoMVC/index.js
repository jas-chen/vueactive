import React, { useMemo } from "react";
import { toRef, ref } from "@vue/runtime-core";
import { component, renderList, setup, computed, useData } from "vueactive";

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
  const vm = useMemo(() => {
    return setup({
      refs: {
        todo: props.todo,
        editingTodoId: props.editingTodoId,
        onDestroyClick: props.onDestroyClick,
      },
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
  }, [props.todo, props.editingTodoId, props.onDestroyClick]);

  return useMemo(() => {
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
              vm.editingTodoId = vm.todo.id;
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
                    vm.editingTodoId = null;
                  }}
                />
              )
          )}
        </Fragment>
      </Li>
    );
  }, [vm]);
};

const FILTER_KEY_LABEL_MAP = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const FilterRow = (props) => {
  const vm = useMemo(() => {
    return setup({
      refs: {
        routeName: Router.routeName$,
        filterKey: props.filterKey,
      },
      computed: {
        className() {
          return vm.routeName === vm.filterKey ? "selected" : "";
        },
      },
    });
  }, [props.filterKey]);

  return useMemo(() => {
    return (
      <li>
        <A href={Router.getPath(vm.filterKey)} className={vm.className}>
          {FILTER_KEY_LABEL_MAP[vm.filterKey]}
        </A>
      </li>
    );
  }, [vm]);
};

const App = () => {
  const data = useData(() => ({
    todoList: [],
    editingTodoId: undefined,
  }));

  const vm = useMemo(() => {
    return setup({
      refs: {
        routeName: Router.routeName$,
        todoList: toRef(data, "todoList"),
        editingTodoId: toRef(data, "editingTodoId"),
      },
      computed: {
        filteredTodoList() {
          if (vm.routeName === "ALL") {
            return vm.todoList;
          }

          const filterValue = vm.routeName === "COMPLETED";
          return vm.todoList.filter(({ done }) => done === filterValue);
        },
        itemsLeft() {
          return vm.todoList.reduce(
            (sum, todo) => (sum += todo.done ? 0 : 1),
            0
          );
        },
        isAllCompleted() {
          return (
            vm.todoList.length > 0 && vm.todoList.every((todo) => todo.done)
          );
        },
      },
      methods: {
        addTodo(label) {
          vm.todoList.unshift({
            id: new Date().getTime(),
            label,
            done: false,
          });
        },
        deleteTodo(todo) {
          vm.todoList.splice(
            vm.todoList.findIndex(({ id }) => id === todo.id),
            1
          );
        },
        toggleAll() {
          const done = !vm.isAllCompleted;
          vm.todoList.forEach((todo) => {
            todo.done = done;
          });
        },
        onClearCompletedClick() {
          vm.todoList = vm.todoList.filter(({ done }) => !done);
        },
      },
    });
  }, []);

  return useMemo(() => {
    return (
      <>
        <div className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <NewTodoInput onSubmit={vm.addTodo} />
          </header>
          <section className="main">
            <Input
              id="toggle-all"
              type="checkbox"
              className="toggle-all"
              checked={vm.isAllCompleted}
              onChange={vm.toggleAll}
            />
            <label htmlFor="toggle-all" />
            <Ul className="todo-list">
              {renderList(vm.filteredTodoList, "id", (todo) => (
                <TodoItem
                  todo={todo}
                  editingTodoId={vm.editingTodoId}
                  onDestroyClick={() => {
                    vm.deleteTodo(todo);
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
  }, [vm]);
};

export default App;
