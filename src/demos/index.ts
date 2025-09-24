import type { DemoFactory } from "./types";

export async function loadDemo(id: string): Promise<DemoFactory> {
    switch (id) {
        case "rotating-triangle":
            return (await import("./rotatingTriangle")).createRotatingTriangle;
        case "clear-colors":
            return (await import("./clearColors")).createClearColors;
        case "compute-particles-free-fall":
            return (await import("./computeParticlesFreeFall")).createComputeParticles;
        case "demo":
            return (await import("./demo")).createDemo;
        case "input-mouse":
            return (await import("./inputMouse")).createInputMouse;
        default:
            return (await import("./rotatingTriangle")).createRotatingTriangle;
    }
}
