import { createRouter as createTSRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const queryClient = new QueryClient();

  const router = createTSRouter({
    routeTree,
    context: {
      queryClient,
    },
    scrollRestoration: true,
  });
  return router;
}

export const getRouter = createRouter;
export const startInstance = undefined;

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
