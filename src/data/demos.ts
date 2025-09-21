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
    }
];