"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange:()=>void){window.addEventListener("online",onChange);window.addEventListener("offline",onChange);return()=>{window.removeEventListener("online",onChange);window.removeEventListener("offline",onChange);};}
function onlineSnapshot(){return navigator.onLine;}

export function NetworkStatus(){const online=useSyncExternalStore(subscribe,onlineSnapshot,()=>true);if(online)return null;return <div className="offline-banner" role="status">目前沒有網路連線，需要網路才能產生新題目與同步學習紀錄。</div>;}
