import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEffects,effectEvents,synthesizeEffects} from '../engine/effects.mjs';
test('efeitos respeitam tempo de cena, limite de volume e permanecem silenciosos fora dos eventos',()=>{
 assert.throws(()=>validateEffects({file:'https://external/effects.wav',volume:.2}),/inválida/);
 assert.throws(()=>validateEffects({file:'assets/efeitos/ambiente.wav',volume:1}),/inválida/);
 const story={duration:12,endCard:{duration:6},scenes:[{id:'a',duration:6,soundEvents:[{type:'knock',time:1}]},{id:'b',duration:6,soundEvents:[{type:'birds',time:1}]}]};
 assert.deepEqual(effectEvents(story).map(e=>e.time),[1,7]);
 const samples=synthesizeEffects(story,8000);
 assert.equal(samples.length,18*8000);
 assert.ok(samples.slice(0,8000).every(x=>x===0));
 assert.ok(samples.slice(8000,12000).some(x=>Math.abs(x)>.01));
 assert.ok(samples.slice(12*8000).every(x=>x===0));
 assert.ok(samples.every(x=>Math.abs(x)<.2));
 assert.deepEqual(samples,synthesizeEffects(story,8000));
 assert.throws(()=>effectEvents({scenes:[{id:'x',duration:3,soundEvents:[{type:'knock',time:2}]}]}),/inválido/);
});
