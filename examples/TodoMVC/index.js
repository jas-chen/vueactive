import React from "react";
import { ref, reactive, computed } from "@vue/reactivity";
import R, { Effect, useForceMemo } from "@jas-chen/reactive-components";

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

const Layout = ({
  renderNewTodo,
  renderToggleAll,
  renderTodoList,
  renderItemsLeft,
  renderFilters,
  onClearCompletedClick,
}) => (
  <>
    <div className="todoapp">
      <header className="header">
        <h1>todos</h1>
        {renderNewTodo()}
      </header>

      <section className="main">
        {renderToggleAll()}
        <label htmlFor="toggle-all" />
        <ul className="todo-list">{renderTodoList()}</ul>
      </section>

      <footer className="footer">
        <span className="todo-count">
          <strong>{renderItemsLeft()}</strong> items left
        </span>
        <ul className="filters">{renderFilters()}</ul>
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
    const editingTodo$ = ref(null);

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

    const renderNewTodo = () => (
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
    );

    const renderToggleAll = () => (
      <R>
        {() => (
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
        )}
      </R>
    );

    const renderTodoItem = (todo) => {
      const destroyBtn = (
        <button
          className="destroy"
          onClick={() => todoList$.splice(todoList$.indexOf(todo), 1)}
        />
      );
      return (
        <R key={todo.id}>
          {() => (
            <li
              className={[
                todo.done ? "completed" : "",
                editingTodo$.value === todo ? "editing " : "",
              ].join("")}
            >
              <div className="view">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={todo.done}
                  onChange={() => {
                    todo.done = !todo.done;
                  }}
                />
                <label
                  onDoubleClick={() => {
                    editingTodo$.value = todo;
                  }}
                >
                  {todo.label}
                </label>
                {destroyBtn}
              </div>
              {editingTodo$.value === todo && (
                <input
                  className="edit"
                  value={editingTodo$.value.label}
                  ref={(input) => input && input.focus()}
                  onChange={(e) => {
                    editingTodo$.value.label = e.target.value;
                  }}
                  onBlur={() => {
                    editingTodo$.value = null;
                  }}
                  onKeyDown={({ key }) => {
                    if (["Enter", "Escape"].includes(key)) {
                      editingTodo$.value = null;
                    }
                  }}
                />
              )}
            </li>
          )}
        </R>
      );
    };

    const renderTodoList = () => (
      <R>{() => filteredTodoList$.value.map(renderTodoItem)}</R>
    );

    const renderItemsLeft = () => <R>{itemsLeft$}</R>;

    const renderFilters = () =>
      ["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
        <li key={filterKey}>
          <R>
            {() => (
              <a
                href={hashes.find(
                  (hash) => hashFilterKeyMap[hash] === filterKey,
                )}
                className={todoFilter$.value === filterKey ? "selected" : ""}
              >
                {filterKeyLabelMap[filterKey]}
              </a>
            )}
          </R>
        </li>
      ));

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
        <Layout
          {...{
            renderNewTodo,
            renderToggleAll,
            renderTodoList,
            renderItemsLeft,
            renderFilters,
            onClearCompletedClick,
          }}
        />
      </>
    );
  });
};

export default App;