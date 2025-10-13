import type { DemoFactory } from "./types";

export const createClearColors: DemoFactory = async ({ device, context }) => {
    let t = 0;
    return {
        tick(dt) {
            t += dt;
            const r = 0.5 + 0.5 * Math.sin(t * 0.8);
            const g = 0.5 + 0.5 * Math.sin(t * 1.1 + 1.0);
            const b = 0.5 + 0.5 * Math.sin(t * 1.4 + 2.0);
            const enc = device.createCommandEncoder();
            const view = context.getCurrentTexture().createView();
            const pass = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: { r, g, b, a: 1 } }] });
            pass.end();
            device.queue.submit([enc.finish()]);
        }
    };
};
