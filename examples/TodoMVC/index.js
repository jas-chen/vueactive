import React from "react";
import { ref, toRef, computed } from "@vue/runtime-core";
import { component, useConstant, renderList, setup } from "vueactive";

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
      props,
      computed: {
        listClassName() {
          return [
            this.todo.done ? "completed" : "",
            this.editingTodoId === this.todo.id ? "editing" : "",
          ].join(" ");
        },
        editTodo() {
          return (
            props.editingTodoId.value === this.todo.id && (
              <EditTodoInput
                initLabel={this.todo.label}
                onSubmit={(label) => {
                  this.todo.label = label;
                }}
                onFinish={() => {
                  props.editingTodoId.value = null;
                }}
              />
            )
          );
        },
        label() {
          return this.todo.label;
        },
        checked() {
          return this.todo.done;
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
              props.editingTodoId.value = props.todo.id;
            }}
          >
            {vm.label}
          </Label>
          <button className="destroy" onClick={props.onDestroyClick} />
        </div>
        <Fragment>{vm.editTodo}</Fragment>
      </Li>
    );
  });
};

const App = (props) => {
  return useConstant(() => {
    const vm = setup({
      props: {
        routeName: props.routeName,
      },
      data: {
        todoList: [],
        editingTodoId: undefined,
      },
      computed: {
        filteredTodoList() {
          if (this.routeName === "ALL") {
            return this.todoList;
          }

          const filterValue = this.routeName === "COMPLETED";
          return this.todoList.filter(({ done }) => done === filterValue);
        },
        itemsLeft() {
          return this.todoList.reduce(
            (sum, todo) => (sum += todo.done ? 0 : 1),
            0
          );
        },
        isAllCompleted() {
          return (
            this.todoList.length > 0 && this.todoList.every((todo) => todo.done)
          );
        },
      },
      methods: {
        onToggleAll() {
          const done = !this.isAllCompleted;
          this.todoList.forEach((todo) => {
            todo.done = done;
          });
        },
        onClearCompletedClick() {
          this.todoList = this.todoList.filter(({ done }) => !done);
        },
        filterClassName(filterKey) {
          return computed(() =>
            this.routeName === filterKey ? "selected" : ""
          );
        },
      },
    });

    const editingTodoId = toRef(vm, "editingTodoId");

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
                    vm.todoList.splice(
                      vm.todoList.findIndex(({ id }) => id === todo.id),
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
              {["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
                <li key={filterKey}>
                  <A
                    href={Router.getPath(filterKey)}
                    className={vm.filterClassName(filterKey)}
                  >
                    {filterKeyLabelMap[filterKey]}
                  </A>
                </li>
              ))}
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

App.defaultProps = {
  routeName: Router.routeName$,
};

export default App;
