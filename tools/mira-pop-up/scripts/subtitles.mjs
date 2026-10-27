import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {ROOT} from './create.mjs';
const at=process.argv.indexOf('--deck'),root=resolve(at<0?ROOT:process.argv[at+1]);
const path=join(root,'stories/joao.json'),story=JSON.parse(readFileSync(path));
const manifest=JSON.parse(readFileSync(join(root,'assets/narracao/manifest.json')));
function seconds(v){const [h,m,s]=v.replace(',','.').split(':').map(Number);return h*3600+m*60+s;}
for(const scene of story.scenes){
 const clip=manifest.clips.find(c=>c.scene===scene.id);
 const content=readFileSync(join(root,clip.file+'.srt'),'utf8').trim();
 scene.subtitles=content.split(/\r?\n\s*\r?\n/).map(block=>{
  const lines=block.split(/\r?\n/), match=lines[1]?.match(/([\d:,]+) --> ([\d:,]+)/);
  if(!match)throw Error('Legenda inválida: '+scene.id);
  return {start:2+seconds(match[1]),end:2+seconds(match[2]),text:lines.slice(2).join(' ')};
 });
 if(!scene.subtitles.length || scene.subtitles.some(c=>c.end>scene.duration || c.start<2 || c.end<=c.start))throw Error('Tempo de legenda inválido: '+scene.id);
}
story.subtitleTiming='sentence-boundaries-from-tts';
writeFileSync(path,JSON.stringify(story,null,2)+'\n');
console.log('PASS: legendas por frase com tempos fornecidos pelo serviço de voz.');
