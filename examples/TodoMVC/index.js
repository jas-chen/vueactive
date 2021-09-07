import React, { memo } from "react";
import { ref } from "@vue/runtime-core";
import { component, useSetup, renderList, render } from "vueactive";

const { Input, InputWithRef, Ul, Label, A, Li, Fragment, Strong } = component;

const NewTodoInput = memo(function NewTodoInput(props) {
  const vm = useSetup({
    refs: props,
    data: {
      text: "",
    },
    methods: {
      setText(text) {
        this.text = text;
      },
      handleKeyPress(e) {
        if (e.key === "Enter" && this.text) {
          this.onSubmit(this.text.trim());
          this.setText("");
        }
      },
    },
  });

  return (
    <InputWithRef
      ref={(input) => input?.focus()}
      className="new-todo"
      placeholder="What needs to be done?"
      value={vm.text}
      onChange={(e) => {
        vm.setText(e.target.value);
      }}
      onKeyPress={vm.handleKeyPress}
    />
  );
});

const EditTodoInput = memo(function EditTodoInput(props) {
  const vm = useSetup(
    {
      refs: props,
      data() {
        return {
          text: this.initLabel,
        };
      },
      methods: {
        handleKeyDown(e) {
          if (e.key === "Enter") {
            this.onSubmit(this.text);
            this.onFinish();
          } else if (e.key === "Escape") {
            this.onFinish();
          }
        },
      },
    },
    { readonly: false }
  );

  return (
    <InputWithRef
      className="edit"
      ref={(input) => {
        if (input) {
          input.focus();
        }
      }}
      value={vm.text}
      onChange={(e) => {
        vm.text = e.target.value;
      }}
      onBlur={vm.onFinish}
      onKeyDown={vm.handleKeyDown}
    />
  );
});

const TodoItem = memo(function TodoItem(props) {
  const vm = useSetup({
    refs: props,
    computed: {
      isEditing() {
        return this.editingId === this.todo.id;
      },
      listClassName() {
        return [
          this.todo.done ? "completed" : "",
          this.isEditing ? "editing" : "",
        ].join(" ");
      },
      label() {
        return this.todo.label;
      },
      checked() {
        return this.todo.done;
      },
    },
    methods: {
      handleToggleChange() {
        this.onToggleClick(this.todo);
      },
      handleDoubleClick() {
        this.onEdit(this.todo.id);
      },
      handleDestroyClick() {
        this.onDestroyClick(this.todo);
      },
      handleSubmit(label) {
        this.onSubmit(this.todo, label);
      },
      handleFinish() {
        this.onEdit(null);
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
          onChange={vm.handleToggleChange}
        />
        <Label onDoubleClick={vm.handleDoubleClick}>{vm.label}</Label>
        <button className="destroy" onClick={vm.handleDestroyClick} />
      </div>
      <Fragment>
        {render(
          vm.isEditing,
          (isEditing) =>
            isEditing && (
              <EditTodoInput
                initLabel={vm.todo.label}
                onSubmit={vm.handleSubmit}
                onFinish={vm.handleFinish}
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

const FilterRow = memo((props) => {
  const vm = useSetup({
    refs: props,
    computed: {
      className() {
        return this.routeName === this.filterKey ? "selected" : "";
      },
      path() {
        return Router.getPath(this.filterKey);
      },
      label() {
        return FILTER_KEY_LABEL_MAP[this.filterKey];
      },
    },
  });

  return (
    <li>
      <A href={vm.path} className={vm.className}>
        {vm.label}
      </A>
    </li>
  );
});

const App = () => {
  const vm = useSetup({
    refs: {
      routeName: Router.routeName,
    },
    data: {
      todoList: [],
      editingTodoId: null,
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
      addTodo(label) {
        this.todoList.unshift({
          id: new Date().getTime(),
          label,
          done: false,
        });
      },
      setEditingTodoId(id) {
        this.editingTodoId = id;
      },
      deleteTodo(todo) {
        this.todoList.splice(
          this.todoList.findIndex(({ id }) => id === todo.id),
          1
        );
      },
      toggleTodo(todo) {
        const i = this.todoList.findIndex(({ id }) => todo.id === id);
        this.todoList[i].done = !todo.done;
      },
      setTodoLabel(todo, label) {
        this.todoList.find(({ id }) => todo.id === id).label = label;
      },
      toggleAll() {
        const done = !this.isAllCompleted;
        this.todoList.forEach((todo) => {
          todo.done = done;
        });
      },
      clearCompletedClick() {
        this.todoList = this.todoList.filter(({ done }) => !done);
      },
    },
  });

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
            {renderList(vm.filteredTodoList, (todo) => {
              return (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  editingId={vm.editingTodoId}
                  onToggleClick={vm.toggleTodo}
                  onDestroyClick={vm.deleteTodo}
                  onEdit={vm.setEditingTodoId}
                  onSubmit={vm.setTodoLabel}
                />
              );
            })}
          </Ul>
        </section>
        <footer className="footer">
          <span className="todo-count">
            <Strong>{vm.itemsLeft}</Strong> items left
          </span>
          <ul className="filters">
            {["ALL", "ACTIVE", "COMPLETED"].map((filterKey) => (
              <FilterRow
                key={filterKey}
                filterKey={filterKey}
                routeName={vm.routeName}
              />
            ))}
          </ul>
          <button className="clear-completed" onClick={vm.clearCompletedClick}>
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
