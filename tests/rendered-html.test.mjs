import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function worker(){const url=new URL("../dist/server/index.js",import.meta.url);url.searchParams.set("test",`${process.pid}-${Date.now()}`);return(await import(url.href)).default;}
async function render(path="/"){const app=await worker();return app.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});}

test("server-renders TOEIC PATH production shell",async()=>{const response=await render();assert.equal(response.status,200);assert.match(response.headers.get("content-type")??"",/^text\/html\b/i);const html=await response.text();assert.match(html,/<html lang="zh-Hant">/);assert.match(html,/<title>TOEIC Path｜多益練習<\/title>/);assert.match(html,/href="\/manifest\.webmanifest"/);assert.match(html,/href="\/icon-192\.png"/);assert.match(html,/aria-label="主要導覽"/);assert.match(html,/TOEIC PATH/);assert.doesNotMatch(html,/codex-preview|Your site is taking shape|react-loading-skeleton/);});

test("ships an installable manifest and safe offline scope",async()=>{const manifest=JSON.parse(await readFile(new URL("../public/manifest.webmanifest",import.meta.url),"utf8"));assert.equal(manifest.start_url,"/");assert.equal(manifest.display,"standalone");assert.equal(manifest.scope,"/");assert.ok(manifest.icons.some(icon=>icon.sizes==="192x192"));assert.ok(manifest.icons.some(icon=>icon.sizes==="512x512"));const files=await Promise.all(["icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png"].map(name=>readFile(new URL(`../public/${name}`,import.meta.url))));assert.ok(files.every(file=>file.length>100));await assert.rejects(readFile(new URL("../public/sw.js",import.meta.url)));});

test("renders a friendly not-found boundary",async()=>{const response=await render("/phase-9-does-not-exist");assert.equal(response.status,404);const html=await response.text();assert.match(html,/找不到這個頁面/);assert.doesNotMatch(html,/stack trace|PostgreSQL|ZodError/i);});
