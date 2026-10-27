// Efeitos originais sintetizados: nenhum arquivo externo é necessário.
export function validateEffects(config) {
  if (!config || !/^assets\/efeitos\/[a-zA-Z0-9_-]+\.wav$/.test(config.file) ||
      !Number.isFinite(config.volume) || config.volume < 0 || config.volume > 0.5)
    throw Error('Trilha de efeitos inválida');
  return config;
}
export function effectEvents(story) {
  let offset = 0;
  return story.scenes.flatMap(scene => {
    const events = (scene.soundEvents || []).map(event => {
      if (!['birds', 'steps', 'knock'].includes(event.type) || !Number.isFinite(event.time) || event.time < 0 || event.time + 3 >= scene.duration)
        throw Error('Evento sonoro inválido em ' + scene.id);
      return {...event, time: offset + event.time};
    });
    offset += scene.duration;
    return events;
  });
}
export function synthesizeEffects(story, rate = 48000) {
  const duration = story.duration + (story.endCard?.duration || 0);
  const samples = new Float32Array(Math.ceil(duration * rate));
  let seed = 15433;
  function noise() {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1;}
  function tone(start, length, kind) {
    const first = Math.round(start * rate);
    for (let i=0; i<Math.round(length*rate); i++) {
      const t=i/rate, p=t/length;
      let sample;
      if (kind==='birds') {
        const phase = 2*Math.PI*(2200*t + 1200*t*t / (2*length));
        sample = .10*Math.sin(Math.PI*p)**2*(Math.sin(phase)+.2*Math.sin(phase*2));
      } else if (kind==='knock') {
        sample = .12*Math.exp(-t*35)*(Math.sin(2*Math.PI*180*t)+.3*noise());
      } else {
        sample = .065*Math.exp(-t*35)*(noise()*.7+Math.sin(2*Math.PI*90*t)*.3);
      }
      if (first+i<samples.length) samples[first+i]+=sample;
    }
  }
  for (const event of effectEvents(story)) {
    const count = event.type==='steps' ? 6 : 3;
    for(let n=0;n<count;n++) tone(event.time+n*(event.type==='birds'?.55:event.type==='steps'?.45:.32),event.type==='birds'?.18:.16,event.type);
  }
  return samples;
}
