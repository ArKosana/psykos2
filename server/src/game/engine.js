import { ROOM_WORDS } from '../data/roomWords.js';
import AI from '../ai/aiService.js';
// NEW: modern JSON import (no 'assert' deprecation)
import captionImages from '../data/captionImages.json' with { type: 'json' };
import { v4 as uuid } from 'uuid';

export function generateCode(used = new Set()) {
  const pool = ROOM_WORDS.filter(w => !used.has(w));
  if (!pool.length) return Math.random().toString(36).slice(2,6).toUpperCase();
  const code = pool[Math.floor(Math.random()*pool.length)];
  used.add(code);
  return code;
}

export function cleanPrompt(s) {
  return (s||'')
    .replace(/^[^:]+:\s*/, '')
    .replace(/\([^)]*\)/g,'')
    .replace(/\[[^\]]*\]/g,'')
    .trim();
}

export async function buildQuestions(category, rounds, playerNames=[]) {
  const list = [];
  for (let i=0;i<rounds;i++) {
    const meta = {};
    let prompt = '';

    if (category === 'acronyms') {
      const pair = await AI.generateAcronymPair();
      meta.type='acronyms';
      meta.acronym=(pair.acronym||'NASA').toUpperCase();
      meta.expansion=pair.expansion||'National Aeronautics and Space Administration';
      prompt = meta.acronym;
    } else if (category === 'is-that-a-fact') {
      const seedWords = ['pig','ocean','coffee','black','honey','ant','moon','snake','ice','rain','gold','mango','whale'];
      meta.type='is-that-a-fact';
      meta.word = seedWords[Math.floor(Math.random()*seedWords.length)];
      meta.trueFact = await AI.trueFactFor(meta.word);
      prompt = meta.word;
    } else if (category === 'truth-comes-out' || category === 'naked-truth') {
      meta.type=category;
      prompt = cleanPrompt(await AI.generateQuestion(category, playerNames));
    } else if (category === 'who-among-us') {
      meta.type='who-among-us';
      prompt = cleanPrompt(await AI.generateQuestion('who-among-us', playerNames));
    } else if (category === 'ridleys-think-fast') {
      meta.type='ridleys-think-fast';
      meta.timeLimit = 5;
      prompt = cleanPrompt(await AI.generateQuestion('ridleys-think-fast', playerNames));
    } else if (category === 'caption-this-image') {
      meta.type='caption-this-image';
      meta.imageUrl = captionImages[Math.floor(Math.random()*captionImages.length)];
      prompt = 'Write a caption';
    } else {
      meta.type=category;
      prompt = cleanPrompt(await AI.generateQuestion(category, playerNames));
    }

    list.push({ prompt, meta, id: uuid() });
  }
  return list;
}
