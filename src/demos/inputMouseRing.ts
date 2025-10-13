import { DemoFactory } from "./types";

export const createInputMouse: DemoFactory = async ({ device, context, format }) => {
    const code = /* wgsl */`
struct Params {
    time: f32,
    width: f32,
    height: f32,
    _pad: f32,
    mouseX: f32,
    mouseY: f32,
    _pad2: vec2<f32>,
}
@group(0) @binding(0) var<uniform> params: Params;

fn ndc_to_uv(nbc: vec2<f32>) -> vec2<f32> {
    return 0.5 * (nbc +  vec2<f32>(1.0,  1.0));
}

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3> (
        vec2<f32>(-1.0, -3.0),
        vec2<f32>( 3.0,  1.0),
        vec2<f32>(-1.0,  1.0)
    );
    let p = pos[vid];
    return vec4<f32>(p, 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let res = vec2<f32>(params.width, params.height);
    let uv  = pos.xy / res;

    let m = vec2<f32>(params.mouseX, params.mouseY) / res;
    let d = distance(uv, m);
    let ring = smoothstep(0.03, 0.02, abs(d - 0.2 +  0.05 * sin(params.time)));

    let base = vec3<f32>(0.1, 0.1, 0.12);
    let color = mix(base, vec3<f32>(0.9, 0.6, 0.2), ring);
    return vec4<f32>(color, 1.0);
}
`;

    const module = device.createShaderModule({ code });

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs", targets: [{ format }] },
        primitive: { topology: "triangle-list" }
    });

    let mouse = { x: 0, y: 0 };
    context.canvas.addEventListener("mousemove", (e) => {
        const event = e as MouseEvent;
        const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
        mouse.x = (event.clientX - rect.left) * (context.canvas.width / rect.width);
        mouse.y = (event.clientY - rect.top) * (context.canvas.height / rect.height);
    });

    const uniformSize = 32;
    const uniformBuffer = device.createBuffer({ size: uniformSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });

    let time = 0;

    function tick(dt: number) {
        time += dt;
        const tmp = new Float32Array([
            time,
            context.canvas.width,
            context.canvas.height,
            0,
            mouse.x,
            mouse.y,
            0,
            0
        ]);
        device.queue.writeBuffer(uniformBuffer, 0, tmp.buffer);

        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }]
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
    }

    return { tick, dispose() { uniformBuffer.destroy(); } };
};