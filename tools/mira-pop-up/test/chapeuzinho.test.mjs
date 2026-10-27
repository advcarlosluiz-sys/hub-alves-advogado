import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validateStory,ASSET_FILES} from '../engine/story.mjs';
import {effectEvents,validateEffects} from '../engine/effects.mjs';
test('Chapeuzinho preserva acolhimento, arte local, efeitos e legendas temporizadas pela voz',()=>{
 const story=validateStory(JSON.parse(readFileSync(new URL('../stories/chapeuzinho-vermelho.json',import.meta.url))));
 assert.equal(story.scenes.length,10);assert.equal(story.duration+story.endCard.duration,187);
 assert.equal(story.subtitleTiming,'sentence-boundaries-from-tts');
 assert.equal(story.narration.voice,'pt-BR-ThalitaMultilingualNeural');
 assert.match(story.scenes[8].caption,/sem medo/);assert.match(story.scenes.at(-1).caption,/pedir ajuda é um gesto de coragem/);
 assert.ok(effectEvents(story).some(e=>e.type==='knock'));validateEffects(story.effects);
 for(const scene of story.scenes){assert.ok(scene.subtitles.length>0);for(const c of scene.subtitles){assert.ok(c.start>=2&&c.end>c.start&&c.end<scene.duration);}for(const a of scene.actors){const file=ASSET_FILES[a.asset]?.file||'assets/'+a.asset+'.svg';assert.ok(existsSync(new URL('../'+file,import.meta.url)));}}
 assert.ok(story.scenes[5].room);
 assert.ok(story.scenes[4].actors.some(a=>a.asset==='biombo'));
});
