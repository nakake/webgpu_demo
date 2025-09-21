import React from "react";
import { useParams, Link } from "react-router-dom";
import { DEMOS } from "../data/demos";
import { WebGPUCanvas } from "../components/WebGPUCanvas";


export default function Detail() {
    const params = useParams();
    const id = params["*"] ?? params.id;
    const demo = DEMOS.find((d) => d.id === id) ?? DEMOS[0];


    return (
        <>
            <header>
                <div className="container">
                    <h1>{demo.title}</h1>
                    <p>{demo.description}</p>
                    <Link className="btn" to="/">← 一覧へ戻る</Link>
                </div>
            </header>
            <main className="container">
                <WebGPUCanvas demoId={demo.id} />
            </main>
        </>
    );
}