// ==UserScript== // @name         Blaze Predictor AI // @version      1.0 // @description  Previsão de cores com IA e análises combinadas // @match        ://blaze.com/ // @grant        none // ==/UserScript==

(async () => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.14.0/dist/tf.min.js'; script.onload = init; document.head.appendChild(script);

function init() { const BlazeAI = (() => { const colorMap = { red: 0, black: 1, white: 2 }; const reverseColorMap = ['red', 'black', 'white']; let model = null; let trainingData = [];

function encodeHash(hash) {
    return hash
      .slice(0, 8)
      .split('')
      .map((c) => (parseInt(c, 16) || 0) / 15);
  }

  function prepareData(data) {
    return data.map((entry) => {
      const lastColors = entry.lastColors.map((c) => colorMap[c] ?? 0);
      const number = entry.number / 14;
      const minute = entry.minute / 59;
      const hash = encodeHash(entry.hash);
      const input = [...lastColors, number, minute, ...hash];
      const output = [0, 0, 0];
      output[colorMap[entry.nextColor] ?? 0] = 1;
      return { input, output };
    });
  }

  async function trainModel() {
    if (!trainingData.length) return;
    model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, inputShape: [inputSize()], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

    const { inputs, outputs } = convertToTensors(trainingData);
    await model.fit(inputs, outputs, { epochs: 25, batchSize: 8 });
  }

  function inputSize() {
    return 4 + 1 + 1 + 8;
  }

  function convertToTensors(data) {
    const inputs = tf.tensor2d(data.map((d) => d.input));
    const outputs = tf.tensor2d(data.map((d) => d.output));
    return { inputs, outputs };
  }

  function predictNext(input) {
    if (!model) return null;
    const tensorInput = tf.tensor2d([input]);
    const prediction = model.predict(tensorInput);
    const index = prediction.argMax(1).dataSync()[0];
    return reverseColorMap[index];
  }

  function updateWithNewResult(newResult) {
    const entry = {
      lastColors: newResult.lastColors,
      number: newResult.number,
      minute: newResult.minute,
      hash: newResult.hash,
      nextColor: newResult.nextColor,
    };
    const formatted = prepareData([entry])[0];
    trainingData.push(formatted);
    if (model) {
      const { inputs, outputs } = convertToTensors([formatted]);
      model.fit(inputs, outputs, { epochs: 1, batchSize: 1 });
    }
  }

  function importCSVandTrain(csvData) {
    const lines = csvData.trim().split('\n');
    const parsed = lines.map((line) => {
      const [c1, c2, c3, c4, number, minute, hash, nextColor] = line.split(',');
      return {
        lastColors: [c1, c2, c3, c4],
        number: parseInt(number),
        minute: parseInt(minute),
        hash,
        nextColor,
      };
    });
    trainingData = prepareData(parsed);
    return trainModel();
  }

  return {
    predictNext,
    updateWithNewResult,
    importCSVandTrain,
  };
})();

window.BlazeAI = BlazeAI;

// Exemplo de integração com o menu (chamar previsão com entrada simulada)
const testInput = {
  lastColors: ['black', 'red', 'red', 'white'],
  number: 13,
  minute: 21,
  hash: 'a1b2c3d4e5f67890',
};
const encodedInput = [
  ...testInput.lastColors.map((c) => ({ red: 0, black: 1, white: 2 }[c])),
  testInput.number / 14,
  testInput.minute / 59,
  ...testInput.hash.slice(0, 8).split('').map((c) => (parseInt(c, 16) || 0) / 15),
];
setTimeout(() => {
  const predictedColor = BlazeAI.predictNext(encodedInput);
  console.log('Previsão com IA:', predictedColor);
}, 2000);

} })();

