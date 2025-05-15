// ==UserScript==
// @name         Blaze Double Assertivo
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Bot completo com coleta, estatísticas, IA, filtros, gráficos e relatórios para Double da Blaze
// @match        https://blaze.bet.br/*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    /* ========== Configurações ========== */
    const config = {
        minRepetitions: 2,             // repetições mínimas
        afterNumbers: [7, 0],          // apostar branco após estes números
        minConfidence: 0.9,            // confiança mínima
        historyLength: 50,             // histórico para IA
    };

    /* ========== Carrega libs ========== */
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

    /* ========== SHA-256 ========== */
    async function sha256(str) {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }

    /* ========== WebSocket ========== */
    class BlazeWebSocket {
        constructor(){ this.ws=null; this.ping=null; this.cb=null; }
        doubleTick(cb) {
            this.cb = cb;
            try {
                this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
            } catch {
                console.warn('WS falhou');
                return;
            }
            this.ws.onopen = () => {
                this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
                this.ping = setInterval(()=>this.ws.send('2'), 25000);
                ui.status.textContent = 'Status: Conectado';
            };
            this.ws.onmessage = e => {
                if(e.data==='2') return this.ws.send('3');
                if(e.data.startsWith('42')) {
                    const j = JSON.parse(e.data.slice(2));
                    if(j[0]==='data'&&j[1].id==='double.tick') this.cb(j[1].payload);
                }
            };
            this.ws.onclose = () => { clearInterval(this.ping); ui.status.textContent='Status: Desconectado'; };
            this.ws.onerror = () => console.warn('WS error');
        }
    }

    /* ========== Interface & Lógica ========== */
    class BlazeInterface {
        constructor() {
            this.history=[];
            this.model=null;
            this.stats={counts:{0:0,1:0,2:0}, seq:[], intervals:[], timeMap:{}};
            this.nextPred=null; this.lastResult=null;
            this.initModel();
        }

        initModel(){
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({units:16,activation:'relu',inputShape:[config.historyLength*3]}));
            this.model.add(tf.layers.dense({units:3,activation:'softmax'}));
            this.model.compile({optimizer:'adam',loss:'categoricalCrossentropy'});
        }

        async trainModel(){
            if(this.history.length<config.historyLength+1) return;
            const X=[],Y=[];
            for(let i=0;i<=this.history.length-(config.historyLength+1);i++){
                X.push(this.history.slice(i,i+config.historyLength).flatMap(r=>this.oneHot(r.color)));
                Y.push(this.oneHot(this.history[i+config.historyLength].color));
            }
            const xs=tf.tensor2d(X), ys=tf.tensor2d(Y);
            await this.model.fit(xs,ys,{epochs:5,verbose:0});
            xs.dispose(); ys.dispose();
        }

        oneHot(c){ return c===0?[1,0,0]:c===1?[0,1,0]:[0,0,1]; }

        async makePrediction(){
            const last=this.history.slice(-config.historyLength);
            if(last.length<config.historyLength) return;
            const inp=tf.tensor2d([last.flatMap(r=>this.oneHot(r.color))]);
            const pred=this.model.predict(inp);
            const arr=await pred.array(); inp.dispose(); pred.dispose();
            const [w,r,b]=arr[0],probs=[w,r,b],mx=Math.max(...probs),idx=probs.indexOf(mx);
            if(mx<config.minConfidence) return;
            this.nextPred={color:idx,confidence:mx};
            ui.prediction.textContent=`Próx: ${['Branco','Vermelho','Preto'][idx]} (${(mx*100).toFixed(1)}%)`;
        }

        async onNewResult(r){
            ui.status.textContent='Status: '+r.status;
            if(r.status!=='complete') return;
            r.time=new Date().toISOString();
            r.hash=await sha256(r.id+r.color+r.roll+r.time);
            this.history.push(r);
            this.lastResult=r;
            this.compare();
            this.updateStats(r);
            await this.trainModel();
            this.renderStats();
            this.plotChart();
        }

        compare(){
            if(!this.nextPred||!this.lastResult) return;
            const win=this.nextPred.color===this.lastResult.color;
            ui.winLose.textContent=win?'✅ Ganhou':'❌ Perdeu';
            ui.result.textContent=`Resultado: ${['Branco','Vermelho','Preto'][this.lastResult.color]} ${this.lastResult.roll}`;
        }

        updateStats(r){
            this.stats.counts[r.color]++;
            this.stats.seq.push(r.color);
            if(r.color===0){
                const lw=this.history.slice(0,-1).reverse().find(x=>x.color===0);
                if(lw) this.stats.intervals.push((new Date(r.time)-new Date(lw.time))/1000);
            }
            const hr=new Date(r.time).getHours();
            this.stats.timeMap[hr]=(this.stats.timeMap[hr]||0)+1;
        }

        renderStats(){
            ui.stats.innerHTML=
                `Freq: B${this.stats.counts[0]} V${this.stats.counts[1]} P${this.stats.counts[2]}<br>`+
                `Seq: ${this.stats.seq.slice(-5).join(',')}<br>`+
                `IntBr: ${this.stats.intervals.slice(-5).map(t=>t.toFixed(1)).join(',')}`;
        }

        exportCSV(){
            const hdr='time,color,roll,hash';
            const lines=this.history.map(r=>`${r.time},${r.color},${r.roll},${r.hash}`);
            const blob=new Blob([[hdr],...lines].join('\n'),{type:'text/csv'});
            const url=URL.createObjectURL(blob),a=document.createElement('a');
            a.href=url; a.download='history.csv'; a.click();
        }

        exportPDF(){
            const { jsPDF } = window.jspdf;
            const doc=new jsPDF();
            doc.text('Relatório Blaze',10,10);
            doc.text(ui.stats.innerText,10,20);
            doc.save('relatorio.pdf');
        }

        plotChart(){
            if(!ui.chartArea.getContext) return;
            if(this.chart) this.chart.destroy();
            this.chart=new Chart(ui.chartArea.getContext('2d'),{
                type:'bar',
                data:{
                    labels:['Branco','Vermelho','Preto'],
                    datasets:[{data:[this.stats.counts[0],this.stats.counts[1],this.stats.counts[2]]}]
                }
            });
        }
    }

    /* ========== UI Setup ========== */
    const ui={};
    const panel=document.createElement('div');
    panel.innerHTML=`
        <style>
          #bp{position:fixed;top:10px;right:10px;width:320px;
          background:#222;color:#fff;padding:10px;border-radius:8px;z-index:99999;font-family:sans-serif;}
          #bp button{margin:2px;}
          #bp canvas{width:100%!important;height:100px!important;}
        </style>
        <div id="bp">
          <div><strong>Blaze Assertivo</strong></div>
          <div id="status">Status: ...</div>
          <div id="prediction">Próx: -</div>
          <div id="result">Resultado: -</div>
          <div id="winLose">--</div>
          <div id="stats"></div>
          <canvas id="chartArea"></canvas>
          <button id="manual">Prever</button>
          <button id="csv">CSV</button>
          <button id="pdf">PDF</button>
        </div>`;
    document.body.appendChild(panel);

    ui.status=document.getElementById('status');
    ui.prediction=document.getElementById('prediction');
    ui.result=document.getElementById('result');
    ui.winLose=document.getElementById('winLose');
    ui.stats=document.getElementById('stats');
    ui.chartArea=document.getElementById('chartArea');
    document.getElementById('manual').onclick=()=>app.makePrediction();
    document.getElementById('csv').onclick=()=>app.exportCSV();
    document.getElementById('pdf').onclick=()=>app.exportPDF();

    /* ========== Start ========== */
    const app=new BlazeInterface();
    const ws=new BlazeWebSocket();
    ws.doubleTick(data=>app.onNewResult(data));
    setInterval(async()=>{
        if(!ws.ws||ws.ws.readyState!==1){
            const res=await app.fallbackFetch();
            app.onNewResult(res);
        }
    },5000);

    /* ========== Helper ========== */
    function loadScript(src){
        return new Promise(res=>{
            const s=document.createElement('script');s.src=src;s.onload=res;document.head.appendChild(s);
        });
    }

})();
