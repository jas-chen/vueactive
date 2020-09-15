import React, { useState } from "react";
import { ref, reactive, computed, readonly } from "@vue/reactivity";
import { R, useForceMemo, readonlyRef } from "vueactive";

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
  const [label, setLabel] = useState("");
  return (
    <input
      className="new-todo"
      placeholder="What needs to be done?"
      value={label}
      onChange={(e) => setLabel(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === "Enter" && label) {
          onSubmit(label);
          setLabel("");
        }
      }}
    />
  );
};

const EditTodoInput = ({ initLabel, onCancel, onSubmit }) => {
  const [label, setLabel] = useState(initLabel);
  return (
    <input
      className="edit"
      value={label}
      ref={(input) => input && input.focus()}
      onChange={(e) => setLabel(e.target.value)}
      onBlur={onCancel}
      onKeyDown={({ key }) => {
        if (key === "Enter") {
          onSubmit(label);
        } else if (key === "Escape") {
          onCancel();
        }
      }}
    />
  );
};

const TodoItem = ({
  todo,
  editingTodoId,
  onStartEditing,
  onCancel,
  onSubmit,
  onToggleCompleted,
  onDestroy,
}) => {
  return useForceMemo(() => {
    const editInput = (
      <R>
        {() =>
          editingTodoId.value === todo.id && (
            <EditTodoInput
              initLabel={todo.label}
              onCancel={onCancel}
              onSubmit={(label) => onSubmit(todo, label)}
            />
          )
        }
      </R>
    );

    const view = (
      <div className="view">
        <R>
          {() => (
            <input
              type="checkbox"
              className="toggle"
              checked={todo.done}
              onChange={() => onToggleCompleted(todo)}
            />
          )}
        </R>
        <label onDoubleClick={() => onStartEditing(todo)}>
          <R>{() => todo.label}</R>
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
                editingTodoId.value === todo.id ? "editing " : "",
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

const filterKeyLabelMap = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const createTodoList = () => {
  const todoList = reactive([]);
  const addTodo = (label) =>
    todoList.unshift({
      id: new Date().getTime(),
      label: (label || "").trim(),
      done: false,
    });
  const updateTodo = (todo, data) => {
    Object.assign(
      todoList.find(({ id }) => id === todo.id),
      data
    );
  };
  const deleteTodo = (todo) =>
    todoList.splice(
      todoList.findIndex(({ id }) => id === todo.id),
      1
    );
  const filterTodo = (fn) => {
    const leftTodo = todoList.filter(fn);
    todoList.length = leftTodo.length;
    leftTodo.forEach((todo, i) => {
      todoList[i] = todo;
    });
  };

  return {
    todoList: readonly(todoList),
    addTodo,
    updateTodo,
    deleteTodo,
    filterTodo,
  };
};

const App = ({ routeName$ = Router.routeName$ }) => {
  const {
    todoList,
    addTodo,
    updateTodo,
    deleteTodo,
    filterTodo,
  } = useForceMemo(createTodoList);

  return useForceMemo(() => {
    const filteredTodoList$ = computed(() => {
      if (routeName$.value === "ALL") {
        return todoList;
      }

      const filterValue = routeName$.value === "COMPLETED";
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
        updateTodo(todo, { done });
      });
    };

    const renderTodoItem = (() => {
      const [editingTodoId$, setEditingTodoId] = readonlyRef(null);
      const onEditTodo = (todo, label) => updateTodo(todo, { label });
      const onToggleCompleted = (todo) => {
        updateTodo(todo, { done: !todo.done });
      };
      const onCancel = () => setEditingTodoId(null);
      const onSubmit = (todo, label) => {
        updateTodo(todo, { label });
        setEditingTodoId(null);
      };
      const onStartEditing = (todo) => {
        setEditingTodoId(todo.id);
      };

      return (todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          editingTodoId={editingTodoId$}
          onDestroy={deleteTodo}
          onToggleCompleted={onToggleCompleted}
          onStartEditing={onStartEditing}
          onEditTodo={onEditTodo}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      );
    })();

    const onClearCompletedClick = () => filterTodo(({ done }) => !done);

    return (
      <>
        <div className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <NewTodoInput onSubmit={addTodo} />
          </header>
          <section className="main">
            <R>
              {() => (
                <input
                  id="toggle-all"
                  type="checkbox"
                  className="toggle-all"
                  checked={isAllCompleted$.value}
                  onChange={onToggleAll}
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
                        href={Router.getPath(filterKey)}
                        className={
                          routeName$.value === filterKey ? "selected" : ""
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