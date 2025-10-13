import { DemoFactory } from "./types";

export const createTextureDemo: DemoFactory = async ({ device, context, format }) => {
    const code = /* wgsl */ `
struct Params {
    width: f32,
    height: f32,
    _pad: vec2<f32>,
    mouseX: f32,
    mouseY: f32,
    _pad2: vec2<f32>,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

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

    let c = textureSample(tex, samp, uv).rgb;
    let outCol = pow(c, vec3<f32>(0.9));  // 0.9〜1.0あたりで明るさを微調整
    return vec4<f32>(outCol, 1.0);  
}

// 近似ガンマ変換（線形→sRGB / sRGB→線形）
fn to_srgb(linear: vec3<f32>) -> vec3<f32> {
  return pow(linear, vec3<f32>(1.0/2.2));
}
  
fn to_linear(srgb: vec3<f32>) -> vec3<f32> {
  return pow(srgb, vec3<f32>(2.2));
}

// rgb<->hsv（h:0..1, s:0..1, v:0..1）
fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), step(c.b, c.g));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));

  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  let h = abs(q.z + (q.w - q.y) / (6.0 * d + e));
  let s = d / (q.x + e);
  let v = q.x;
  return vec3<f32>(h, s, v);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  let p = abs(fract(vec3<f32>(c.x) + vec3<f32>(K.y, K.z, 0.0)) * 6.0 - vec3<f32>(K.w));
  return c.z * mix(vec3<f32>(K.x), clamp(p - vec3<f32>(K.x), vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

@fragment
fn fs2(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let res = vec2<f32>(params.width, params.height);
  let uv  = pos.xy / res;

  // サンプル（線形色）
  let lin = textureSample(tex, samp, uv).rgb;

  // sRGB へ一旦寄せて HSV で操作
  let srgb = to_srgb(lin);
  var hsv  = rgb2hsv(srgb);

  // マウス距離に応じて hue を回す（近いほど強い）
  let m  = vec2<f32>(params.mouseX, params.mouseY) / res;
  let d  = distance(uv, m);
  let R  = 0.25;          // 影響半径
  let W  = 0.18;          // 滑らか境界幅
  let w  = smoothstep(R, R - W, d); // 0..1（近い=1, 遠い=0）

  let hueShift = 0.20 * w;          // 最大+0.20回転（72°）
  hsv.x = fract(hsv.x + hueShift);  // 0..1に折り返し

  // RGBに戻し、線形へ戻して出力
  let srgb2 = hsv2rgb(hsv);
  let lin2  = to_linear(srgb2);
  return vec4<f32>(lin2, 1.0);
}
`;

    const module = device.createShaderModule({ code });
    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs" },
        fragment: {
            module, entryPoint: "fs2",
            targets: [{ format }]
        },
        primitive: { topology: "triangle-list", cullMode: "none" }
    });

    // 初期テクスチャ作成
    function createFallbackTexture(device: GPUDevice) {
        const tex = device.createTexture({
            size: { width: 1, height: 1 },
            format: "rgba8unorm-srgb",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        const white = new Uint8Array([255, 255, 255, 255]);
        device.queue.writeTexture(
            { texture: tex },
            white,
            { bytesPerRow: 4 },
            { width: 1, height: 1, depthOrArrayLayers: 1 }
        );
        return tex.createView();
    }

    async function fileToTextureView(device: GPUDevice, file: File) {
        const bmp = await createImageBitmap(file, { colorSpaceConversion: "none" });
        const tex = device.createTexture({
            size: { width: bmp.width, height: bmp.height },
            format: "rgba8unorm-srgb",
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });
        device.queue.copyExternalImageToTexture(
            { source: bmp },
            { texture: tex },
            { width: bmp.width, height: bmp.height }
        );
        return { view: tex.createView(), width: bmp.width, height: bmp.height };
    }

    const dropArea = context.canvas;
    dropArea.addEventListener("dragover", (e) => { e.preventDefault(); });
    dropArea.addEventListener("drop", async (e: any) => {
        e.preventDefault();
        const file = (e.dataTransfer?.files && e.dataTransfer.files[0]) || null;
        if (!file) return;
        const { view } = await fileToTextureView(device, file);
        bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: view },
                { binding: 2, resource: sampler },
            ],
        });
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

    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    let view = createFallbackTexture(device);

    let bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: { buffer: uniformBuffer }
            },
            { binding: 1, resource: view },
            { binding: 2, resource: sampler }
        ]
    });

    const frame = (dt: number) => {
        const tmp = new Float32Array([
            context.canvas.width,
            context.canvas.height,
            0,
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
    };

    return {
        tick: frame,
        dispose() {
            uniformBuffer.destroy();
        }
    };
};