/* ======================================================================= Blaze – Bot Assertivo para Double da Blaze (Único Script) ======================================================================= */

// ==UserScript== // @name         Blaze Double Assertivo // @namespace    http://tampermonkey.net/ // @version      2.0 // @description  Bot completo com coleta, estatísticas, IA, filtros e relatórios // @match        ://blaze.bet.br/ // @grant        none // ==/UserScript==

(async function() { 'use strict';

/* ======================= Configurações de Filtros ======================= */
const config = {
    minRepetitions: 2,
    afterNumbers: [7,0],
    minConfidence: 0.9,
    historyLength: 50,
    autoPredict: true
};

/* ======================= Carregar TensorFlow.js ======================= */
await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js');

/* ======================= SHA-256 ======================= */
async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ======================= BlazeWebSocket ======================= */
class BlazeWebSocket {
    constructor(){this.ws=null;this.ping=null;this.cb=null;}
    doubleTick(cb){
        this.cb=cb;
        try{this.ws=new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');}
        catch{console.warn('WS falhou');return;}
        this.ws.onopen=()=>{this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');this.ping=setInterval(()=>this.ws.send('2'),25000)};
        this.ws.onmessage=e=>{
            if(e.data==='2')return this.ws.send('3');
            if(e.data.startsWith('42')){
                const j=JSON.parse(e.data.slice(2));
                if(j[0]==='data'&&j[1].id==='double.tick')this.cb(j[1].payload);
            }
        };
        this.ws.onclose=()=>{clearInterval(this.ping);console.warn('WS fechado');};
        this.ws.onerror=()=>console.warn('WS error');
    }
}

/* ======================= BlazeInterface ======================= */
class BlazeInterface {
    constructor(){
        this.history=[];this.model=null;
        this.stats={counts:{0:0,1:0,2:0}, sequences:[], whiteIntervals:[], timeMap:{}};
        this.nextPred=null;this.lastResult=null; this.resultsEl=null;
        this.injectStyles();this.initUI();this.initModel();
    }

    injectStyles(){
        const css=`
        .blaze-panel{position:fixed;bottom:20px;right:20px;width:350px;background:rgba(34,34,34,0.9);color:#fff;
        font-family:sans-serif;border-radius:10px;padding:10px;z-index:99999;}
        .blaze-header{display:flex;justify-content:space-between;align-items:center;}
        .blaze-btn{background:#007bff;border:none;padding:6px 12px;margin-left:4px;border-radius:5px;color:#fff;cursor:pointer;}
        .blaze-body{margin-top:10px;}
        .blaze-status{margin:5px 0;}
        `;
        document.head.insertAdjacentHTML('beforeend',`<style>${css}</style>`);
    }

    initUI(){
        this.panel=document.createElement('div');this.panel.className='blaze-panel';
        this.panel.innerHTML=`
        <div class="blaze-header">
          <strong>Blaze Assertivo</strong>
          <div>
            <button id="manualPredict" class="blaze-btn">Prever</button>
            <button id="exportCSV" class="blaze-btn">Exportar CSV</button>
          </div>
        </div>
        <div class="blaze-body">
          <div id="stats"></div>
          <div id="rollingStatus" class="blaze-status">Status: -</div>
          <div id="prediction" class="blaze-status">Próx: -</div>
          <div id="result" class="blaze-status">Último: -</div>
          <div id="winLose" class="blaze-status">--</div>
        </div>`;
        document.body.appendChild(this.panel);
        document.getElementById('manualPredict').onclick=()=>this.makePrediction();
        document.getElementById('exportCSV').onclick=()=>this.exportCSV();
    }

    async initModel(){
        this.model=tf.sequential();
        this.model.add(tf.layers.dense({units:16,activation:'relu',inputShape:[config.historyLength*3]}));
        this.model.add(tf.layers.dense({units:3,activation:'softmax'}));
        this.model.compile({optimizer:'adam',loss:'categoricalCrossentropy'});
    }

    oneHot(c){return c===0?[1,0,0]:c===1?[0,1,0]:[0,0,1];}

    async trainModel(){
        if(this.history.length<config.historyLength+1)return;
        const X=[],Y=[];
        for(let i=0;i<=this.history.length-(config.historyLength+1);i++){
            X.push(this.history.slice(i,i+config.historyLength).flatMap(r=>this.oneHot(r.color)));
            Y.push(this.oneHot(this.history[i+config.historyLength].color));
        }
        const xs=tf.tensor2d(X),ys=tf.tensor2d(Y);
        await this.model.fit(xs,ys,{epochs:5,verbose:0});xs.dispose();ys.dispose();
    }

    async makePrediction(){
        const last=this.history.slice(-config.historyLength);
        if(last.length<config.historyLength)return;
        const inpt=tf.tensor2d([last.flatMap(r=>this.oneHot(r.color))]);
        const pred=this.model.predict(inpt);
        const arr=await pred.array();inpt.dispose();pred.dispose();
        const [w,r,b]=arr[0],probs=[w,r,b];
        const mx=Math.max(...probs),idx=probs.indexOf(mx);
        if(mx<config.minConfidence)return;
        this.nextPred={color:idx,confidence:mx};
        this.renderPrediction();
    }

    renderPrediction(){
        const p=this.nextPred;const col=['Branco','Vermelho','Preto'][p.color];
        document.getElementById('prediction').textContent=`Próx: ${col} (${(p.confidence*100).toFixed(1)}%)`;
    }

    async onNewResult(r){
        document.getElementById('rollingStatus').textContent=`Status: ${r.status}`;
        if(r.status!=='complete')return;
        r.time=new Date().toISOString();
        r.hash=await sha256(r.id+r.color+r.roll+r.time);
        this.lastResult=r;this.history.push(r);
        this.compareWinLose();
        this.updateStats(r);await this.trainModel();
        this.renderStats();
    }

    compareWinLose(){
        if(!this.nextPred||!this.lastResult)return;
        const win=this.nextPred.color===this.lastResult.color;
        document.getElementById('winLose').textContent=win?`✅ Ganhou (${['B','V','P'][this.nextPred.color]})`:`❌ Perdeu (${['B','V','P'][this.nextPred.color]})`;
        document.getElementById('result').textContent=`Último: ${['Branco','Vermelho','Preto'][this.lastResult.color]} ${this.lastResult.roll}`;
    }

    updateStats(r){
        const c=this.stats.counts; c[r.color]++;
        this.stats.sequences.push(r.color);
        if(this.stats.sequences.length>10) this.stats.sequences.shift();
        if(r.color===0){
            const lw=this.history.slice(0,-1).reverse().find(x=>x.color===0);
            if(lw) this.stats.whiteIntervals.push((new Date(r.time)-new Date(lw.time))/1000);
        }
        const hr=new Date(r.time).getHours();
        this.stats.timeMap[hr]=(this.stats.timeMap[hr]||0)+1;
    }

    renderStats(){
        const c=this.stats.counts,wi=this.stats.whiteIntervals.map(t=>t.toFixed(1)).join(', ');
        const freq=Object.entries(c).map(([k,v])=>`${['B','V','P'][k]}:${v}`).join(' ');
        document.getElementById('stats').innerHTML=`${freq}<br>Int Br:${wi}`;
    }

    exportCSV(){
        const hdr='time,color,roll,hash';
        const lines=this.history.map(r=>`${r.time},${r.color},${r.roll},${r.hash}`);
        const blob=new Blob([[hdr],...lines].join('\n'),{type:'text/csv'});
        const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='history.csv';a.click();
    }

    async fallbackFetch(){
        try{const res=await fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1');
            const j=await res.json();const p=j.payload;return {id:p.id,color:p.color,roll:p.roll,status:'complete'};
        }catch{const el=document.querySelector('.roulette-result');
            return{id:Date.now(),color:parseInt(el.dataset.color),roll:el.textContent,status:'complete'};}
    }
}

function loadScript(src){return new Promise(r=>{const s=document.createElement('script');s.src=src;s.onload=r;document.head.appendChild(s);});}

const iface=new BlazeInterface();
const ws=new BlazeWebSocket();
ws.doubleTick(d=>iface.onNewResult(d));
setInterval(async()=>{if(!ws.ws||ws.ws.readyState!==1){const r=await iface.fallbackFetch();iface.onNewResult(r);}},5000);

})();

