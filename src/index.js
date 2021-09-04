import React, { useMemo } from "react";
import { toRef, ref } from "@vue/runtime-core";
import {
  component,
  renderList,
  setup,
  computed,
  useData,
  createComponent,
} from "vueactive";

const { Input, Ul, Label, A, Li, Fragment, Strong } = component;

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

const TodoItem = createComponent({
  displayName: "TodoItem",
  setup: (props) => ({
    computed: {
      listClassName() {
        return [
          props.todo.done ? "completed" : "",
          props.editingTodoId === props.todo.id ? "editing" : "",
        ].join(" ");
      },
      label() {
        return props.todo.label;
      },
      checked() {
        return props.todo.done;
      },
    },
    render: (vm) => (
      <Li className={vm.listClassName}>
        <div className="view">
          <Input
            type="checkbox"
            className="toggle"
            checked={vm.checked}
            onChange={() => {
              props.todo.done = !props.todo.done;
            }}
          />
          <Label
            onDoubleClick={() => {
              props.editingTodoId = props.todo.id;
            }}
          >
            {vm.label}
          </Label>
          <button className="destroy" onClick={props.onDestroyClick} />
        </div>
        <Fragment>
          {computed(
            () =>
              props.editingTodoId === props.todo.id && (
                <EditTodoInput
                  initLabel={props.todo.label}
                  onSubmit={(label) => {
                    props.todo.label = label;
                  }}
                  onFinish={() => {
                    props.editingTodoId = null;
                  }}
                />
              )
          )}
        </Fragment>
      </Li>
    ),
  }),
});

const FILTER_KEY_LABEL_MAP = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const FilterRow = createComponent({
  displayName: "FilterRow",
  setup: (props) => ({
    computed: {
      className() {
        return props.routeName === props.filterKey ? "selected" : "";
      },
    },
    render: (vm) => (
      <li>
        <A href={Router.getPath(props.filterKey)} className={vm.className}>
          {FILTER_KEY_LABEL_MAP[props.filterKey]}
        </A>
      </li>
    ),
  }),
});

const App = () => {
  const data = useData(() => ({
    todoList: [],
    editingTodoId: null,
  }));

  const vm = useMemo(() => {
    return setup({
      refs: {
        routeName: Router.routeName$,
        editingTodoId: toRef(data, "editingTodoId"),
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
        addTodo(label) {
          data.todoList.unshift({
            id: new Date().getTime(),
            label,
            done: false,
          });
        },
        deleteTodo(todo) {
          data.todoList.splice(
            data.todoList.findIndex(({ id }) => id === todo.id),
            1
          );
        },
        toggleAll() {
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
                  <FilterRow filterKey={filterKey} routeName={vm.routeName} />
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

// ==== Router ====

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

// ==== Router ====

export default App;
