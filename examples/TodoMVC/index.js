import React, { memo } from "react";
import { ref, unref as $, computed } from "@vue/runtime-core";
import { component, useData } from "vueactive";

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

const TodoItem = memo(function TodoItem({
  editingId,
  todo,
  onToggleClick,
  onDestroyClick,
  onEdit,
  onSubmit,
}) {
  const isEditing = computed(() => {
    return $(editingId) === $(todo).id;
  });

  const listClassName = computed(() => {
    return [
      $(todo).done ? "completed" : "",
      $(isEditing) ? "editing" : "",
    ].join(" ");
  });

  const label = computed(() => {
    return $(todo).label;
  });

  const checked = computed(() => {
    return $(todo).done;
  });

  return (
    <Li className={listClassName}>
      <div className="view">
        <Input
          type="checkbox"
          className="toggle"
          checked={checked}
          onChange={() => {
            onToggleClick($(todo));
          }}
        />
        <Label
          onDoubleClick={() => {
            onEdit($(todo).id);
          }}
        >
          {label}
        </Label>
        <button
          className="destroy"
          onClick={() => {
            onDestroyClick($(todo));
          }}
        />
      </div>
      <Fragment>
        {computed(
          () =>
            $(isEditing) && (
              <EditTodoInput
                initLabel={$(todo).label}
                onSubmit={(label) => {
                  onSubmit(todo, label);
                }}
                onFinish={() => {
                  onEdit(null);
                }}
              />
            )
        )}
      </Fragment>
    </Li>
  );
});

const FILTER_KEY_LABEL_MAP = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const FilterRow = memo(({ routeName, filterKey }) => {
  const className = computed(() => {
    return $(routeName) === $(filterKey) ? "selected" : "";
  });

  return (
    <li>
      <A href={Router.getPath($(filterKey))} className={className}>
        {FILTER_KEY_LABEL_MAP[$(filterKey)]}
      </A>
    </li>
  );
});

const App = () => {
  const [todoList, setTodoList] = useData([]);
  const [editingTodoId, setEditingTodoId] = useData(null);

  const filteredTodoList = computed(() => {
    if ($(Router.routeName) === "ALL") {
      return $(todoList);
    }

    const filterValue = $(Router.routeName) === "COMPLETED";
    return $(todoList).filter(({ done }) => done === filterValue);
  });

  const itemsLeft = computed(() => {
    return $(todoList).reduce((sum, todo) => (sum += todo.done ? 0 : 1), 0);
  });

  const isAllCompleted = computed(() => {
    return $(todoList).length > 0 && $(todoList).every((todo) => todo.done);
  });

  function addTodo(label) {
    setTodoList((todoList) => {
      $(todoList).unshift({
        id: new Date().getTime(),
        label,
        done: false,
      });
    });
  }

  function deleteTodo(todo) {
    setTodoList((todoList) => {
      $(todoList).splice(
        $(todoList).findIndex(({ id }) => id === todo.id),
        1
      );
    });
  }

  function toggleTodo(todo) {
    const i = $(todoList).findIndex((t) => todo === t);
    setTodoList((todoList) => {
      $(todoList)[i].done = !todo.done;
    });
  }

  function setTodoLabel(todo, label) {
    const i = $(todoList).findIndex((t) => todo === t);
    setTodoList((todoList) => {
      $(todoList)[i].label = label;
    });
  }

  function toggleAll() {
    const done = !$(isAllCompleted);
    setTodoList((todoList) => {
      $(todoList).forEach((todo) => {
        todo.done = done;
      });
    });
  }

  function clearCompletedClick() {
    setTodoList((todoList) => {
      todoList.value = $(todoList).filter(({ done }) => !done);
    });
  }

  return (
    <>
      <div className="todoapp">
        <header className="header">
          <h1>todos</h1>
          <NewTodoInput onSubmit={addTodo} />
        </header>
        <section className="main">
          <Input
            id="toggle-all"
            type="checkbox"
            className="toggle-all"
            checked={isAllCompleted}
            onChange={toggleAll}
          />
          <label htmlFor="toggle-all" />
          <Ul className="todo-list">
            {computed(() =>
              $(filteredTodoList).map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  editingId={editingTodoId}
                  onToggleClick={toggleTodo}
                  onDestroyClick={deleteTodo}
                  onEdit={setEditingTodoId}
                  onSubmit={setTodoLabel}
                />
              ))
            )}
          </Ul>
        </section>
        <footer className="footer">
          <span className="todo-count">
            <Strong>{itemsLeft}</Strong> items left
          </span>
          <Ul className="filters">
            {computed(() =>
              ["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
                <FilterRow
                  key={filterKey}
                  filterKey={filterKey}
                  routeName={Router.routeName}
                />
              ))
            )}
          </Ul>
          <button className="clear-completed" onClick={clearCompletedClick}>
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

  const routeName = ref(routerConfig[window.location.hash]);

  window.addEventListener("hashchange", () => {
    if (!isPathValid()) {
      window.location.hash = defaultUrl;
    } else {
      routeName.value = routerConfig[window.location.hash];
    }
  });

  return {
    routeName,
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
