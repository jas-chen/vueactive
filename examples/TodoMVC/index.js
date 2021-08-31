import React from "react";
import { ref, toRef, unref as _, computed } from "@vue/runtime-core";
import { component, useData, useConstant, renderList } from "vueactive";

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
          data.label = "";
          onFinish();
        }
      }}
    />
  );
};

const TodoItem = ({ todo, editingTodoId$, onDestroyClick }) => {
  return useConstant(() => (
    <Li
      className={computed(() =>
        [
          todo.done ? "completed" : "",
          _(editingTodoId$) === todo.id ? "editing" : "",
        ].join(" ")
      )}
    >
      <div className="view">
        <Input
          type="checkbox"
          className="toggle"
          checked={computed(() => todo.done)}
          onChange={() => {
            todo.done = !todo.done;
          }}
        />
        <Label
          onDoubleClick={() => {
            editingTodoId$.value = todo.id;
          }}
        >
          {computed(() => todo.label)}
        </Label>
        <button className="destroy" onClick={onDestroyClick} />
      </div>
      <Fragment>
        {computed(
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
      </Fragment>
    </Li>
  ));
};

const App = (props) => {
  const data = useData(() => ({
    todoList: [],
    editingTodoId: undefined,
  }));

  return useConstant(() => {
    const filteredTodoList = computed(() => {
      const routeName = _(props.routeName);
      if (routeName === "ALL") {
        return data.todoList;
      }

      const filterValue = routeName === "COMPLETED";
      return data.todoList.filter(({ done }) => done === filterValue);
    });

    const itemsLeft = computed(() => {
      return data.todoList.reduce((sum, todo) => (sum += todo.done ? 0 : 1), 0);
    });

    const isAllCompleted = computed(() => {
      return data.todoList.length && data.todoList.every((todo) => todo.done);
    });

    const editingTodoId$ = toRef(data, "editingTodoId");

    const onToggleAll = () => {
      const done = !_(isAllCompleted);
      data.todoList.forEach((todo) => {
        todo.done = done;
      });
    };

    const onClearCompletedClick = () => {
      data.todoList = data.todoList.filter(({ done }) => !done);
    };

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
              checked={isAllCompleted}
              onChange={onToggleAll}
            />
            <label htmlFor="toggle-all" />
            <Ul className="todo-list">
              {renderList(filteredTodoList, "id", (todo) => (
                <TodoItem
                  todo={todo}
                  editingTodoId$={editingTodoId$}
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
              <Strong>{itemsLeft}</Strong> items left
            </span>
            <ul className="filters">
              {["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
                <li key={filterKey}>
                  <A
                    href={Router.getPath(filterKey)}
                    className={computed(() =>
                      _(props.routeName) === filterKey ? "selected" : ""
                    )}
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
  });
};

App.defaultProps = {
  routeName: Router.routeName$,
};

export default App;
