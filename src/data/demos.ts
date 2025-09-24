export type Demo = {
    id: string;
    title: string;
    description: string;
};


export const DEMOS: Demo[] = [
    {
        id: "rotating-triangle",
        title: "回転する三角形",
        description: "WebGPU の最小レンダリング。頂点色＋回転。"
    },
    {
        id: "clear-colors",
        title: "クリアカラー切替",
        description: "フレームごとにクリアカラーが変化するだけの超最小。"
    },
    {
        id: "compute-particles-free-fall",
        title: "重力落下する粒子",
        description: "コンピュートシェーダで粒子の位置を重力計算で落下させ、頂点シェーダで描画。"
    },
    {
        id: "demo",
        title: "デモ",
        description: ""
    },
    {
        id: "input-mouse-color",
        title: "マウス入力",
        description: "マウス位置に反応して色が変わる。"
    },
    {
        id: "input-mouse-ring",
        title: "マウス入力（リング）",
        description: "マウス位置に反応してリングが表示される。"
    },
];