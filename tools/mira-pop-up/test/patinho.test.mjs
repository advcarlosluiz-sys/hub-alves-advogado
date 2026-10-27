import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validateStory,ASSET_FILES} from '../engine/story.mjs';
test('patinho tem dez cenas, arte local, legendas contínuas e mensagem de acolhimento',()=>{
 const story=validateStory(JSON.parse(readFileSync(new URL('../stories/patinho-feio.json',import.meta.url))));
 assert.equal(story.scenes.length,10);
 assert.ok(story.duration>=170&&story.duration<=210);
 assert.equal(story.narration.voice,'pt-BR-ThalitaMultilingualNeural');
 assert.match(story.scenes.at(-1).caption,/Você merece carinho e respeito do jeitinho que é!/);
 assert.match(story.scenes[8].caption,/Desde o nascimento, já merecia respeito/);
 for(const scene of story.scenes){assert.ok(scene.subtitles.length>1);let end=2;for(const c of scene.subtitles){assert.ok(Math.abs(c.start-end)<.002);assert.ok(c.end>c.start&&c.end<scene.duration);end=c.end;}for(const a of scene.actors){const file=ASSET_FILES[a.asset]?.file||'assets/'+a.asset+'.svg';assert.ok(existsSync(new URL('../'+file,import.meta.url)));}}
});
