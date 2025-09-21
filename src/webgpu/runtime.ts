let _adapter: GPUAdapter | null = null;
let _device: GPUDevice | null = null;

export async function getDevice(): Promise<GPUDevice> {
    if (!("gpu" in navigator)) throw new Error("WebGPU unsupported");
    if (_device) return _device;

    _adapter = await navigator.gpu.requestAdapter();
    if (!_adapter) throw new Error("No GPU adapter");
    _device = await _adapter.requestDevice();

    _device.lost.then((info) => {
        console.warn("WebGPU device lost:", info.message);
        _device = null;
    });

    return _device;
}

export function getPreferredFormat(): GPUTextureFormat {
    return navigator.gpu.getPreferredCanvasFormat();
}
