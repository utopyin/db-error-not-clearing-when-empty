import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, useLiveQuery } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

interface Todo {
  id: number;
  title: string;
}

// Fake server store - initialize with a no items
const fakeServer = new Map<number, Todo>([
  // uncomment the following line will enable the error to be cleared correctly
  // [1, { id: 1, title: "Buy groceries" }],
]);

const queryClient = new QueryClient();

// Create a collection with fake sync
const todosCollection = createCollection(
  queryCollectionOptions({
    getKey: (item) => item.id,
    queryFn: () => {
      if (Math.random() > 0.5) {
        toast.error("Failed to fetch items");
        throw new Error("Failed to fetch items");
      }
      toast.success("Items fetched successfully (should clear the error)");
      return new Promise<Todo[]>((r) => r(Array.from(fakeServer.values())));
    },
    queryClient,
    retry: false,
    queryKey: ["items"],
  })
);

export function App() {
  const { data, isLoading } = useLiveQuery((q) =>
    q.from({ todos: todosCollection })
  );

  const isError = todosCollection.utils.errorCount > 0;

  const content = useMemo(() => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (isError) {
      const lastError = todosCollection.utils.lastError;
      const errorMessage =
        lastError instanceof Error ? lastError.message : "Unexpected error";
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: "fit-content",
          }}
        >
          Error: {errorMessage}
          <button
            onClick={() => todosCollection.utils.clearError()}
            type="button"
          >
            Reset
          </button>
        </div>
      );
    }

    return (
      <div>
        <h2 style={{ marginBottom: 8 }}>Todos</h2>
        <ul>
          {data.map((todo) => (
            <li key={todo.id}>{todo.title}</li>
          ))}
          {data.length === 0 && <p style={{ color: "#666" }}>No todos found</p>}
        </ul>
      </div>
    );
  }, [data, isLoading, isError]);

  return (
    <div>
      <h1>
        Reproduction of the error not clearing when an empty list is returned
      </h1>
      <p>
        <strong>To reproduce:</strong> reload the page until you hit an error
        during initial load, then click the "Reset" button. The error will never
        be cleared.
      </p>
      <p>
        This seem to be happening when the query returns an empty list. If you
        uncomment the line inside the fakeServer map, the error will be cleared
        correctly because the query will return a non-empty list.
      </p>
      <hr style={{ marginBlock: 20 }} />
      {content}
    </div>
  );
}
