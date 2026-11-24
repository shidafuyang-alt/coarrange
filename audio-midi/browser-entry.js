import { transcribeSamples } from './transcribe.mjs';

const modelUrl = new URL('./model/model.json', import.meta.url).href;

window.CoPitch = {
  transcribeSamples(samples) {
    return transcribeSamples(samples, modelUrl);
  },
};
