import type { DemoFactory } from "./types";

export async function loadDemo(id: string): Promise<DemoFactory> {
  switch (id) {
    case "rotating-triangle":
      return (await import("./rotatingTriangle")).createRotatingTriangle;
    case "clear-colors":
      return (await import("./clearColors")).createClearColors;
    default:
      return (await import("./rotatingTriangle")).createRotatingTriangle;
  }
}
