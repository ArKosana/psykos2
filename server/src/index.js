import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import uploadRouter from './routes/upload.js';
import { buildQuestions, generateCode } from './game/engine.js';

const prisma = new PrismaClient();
const app = express();
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: (o,cb)=>cb(null,true), credentials:true }));
app.use(express.json({ limit: '5mb' }));

// local upload serving
const uploadsDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/upload', uploadRouter);

app.get('/health', (req,res)=>res.json({ ok:true, ts:Date.now() }));

app.post('/create-game', async (req,res)=>{
  const { playerName, category, rounds=8, avatarUrl } = req.body;
  if (!playerName || !category) return res.status(400).json({ error:'Missing playerName/category' });
  const code = generateCode();
  const game = await prisma.game.create({ data: { code, category, rounds, currentRound:0, state:'lobby' }});
  const host = await prisma.player.create({
    data: { name: playerName.trim(), isHost:true, score:0, gameId: game.id, avatarUrl: avatarUrl || null }
  });
  res.json({ gameCode: code, playerId: host.id, category: game.category });
});

app.post('/join-game', async (req,res)=>{
  const { code, playerName, avatarUrl } = req.body;
  const game = await prisma.game.findUnique({ where: { code }});
  if (!game) return res.status(404).json({ error:'Game not found' });
  const player = await prisma.player.create({
    data: { name: playerName.trim(), isHost:false, score:0, gameId: game.id, avatarUrl: avatarUrl || null }
  });
  res.json({ playerId: player.id, category: game.category, rounds: game.rounds, gameInProgress: game.state!=='lobby' });
});

const io = new Server(server, { cors: { origin: (o,cb)=>cb(null,true), credentials:true } });
const socketsByPlayer = new Map();
const playersBySocket = new Map();
const readyPerRound = new Map();

function toast(code, msg){ io.to(code).emit('toast', msg); }
function notice(code, msg){ io.to(code).emit('notice', msg); }

io.on('connection', (socket)=>{

  socket.on('join-live', async ({ code, playerId })=>{
    const game = await prisma.game.findUnique({ where: { code }, include:{ players:true }});
    if (!game) return;

    let currentPrompt = null;
    if (game.state === 'playing' && game.currentRound > 0) {
      const round = await prisma.round.findFirst({ where: { gameId: game.id, index: game.currentRound }});
      currentPrompt = round?.prompt || null;
    }

    socket.join(code);
    socketsByPlayer.set(playerId, socket.id);
    playersBySocket.set(socket.id, { playerId, gameId: game.id });

    io.to(code).emit('players-updated', game.players);
    notice(code, `${game.players.find(p=>p.id===playerId)?.name || 'Someone'} joined`);

    socket.emit('game-state', {
      code: game.code,
      category: game.category,
      state: game.state,
      round: game.currentRound,
      totalRounds: game.rounds,
      currentPrompt,
      players: game.players.map(p=>({ id:p.id, name:p.name, avatar:p.avatarUrl, isHost:p.isHost, score:p.score }))
    });
  });

  socket.on('start-game', async (code)=>{
    const game = await prisma.game.findUnique({ where: { code }, include:{ players:true }});
    if (!game) return;
    if (game.players.length < 2) { toast(code,'Need at least 2 players to start'); return; }

    const names = game.players.map(p=>p.name);
    const questions = await buildQuestions(game.category, game.rounds, names);

    await prisma.$transaction(questions.map((q,i)=>prisma.round.create({
      data: { gameId: game.id, index: i+1, category: game.category, prompt: q.prompt, meta: q.meta }
    })));

    await prisma.game.update({ where:{ id: game.id }, data:{ currentRound: 1, state:'playing' }});
    io.to(code).emit('game-started', { round:1, totalRounds: game.rounds, question: questions[0].prompt, category: game.category });
  });

  socket.on('submit-answer', async ({ code, playerId, text })=>{
    const game = await prisma.game.findUnique({ where: { code }});
    if (!game || game.state!=='playing') return;
    const round = await prisma.round.findFirst({ where: { gameId: game.id, index: game.currentRound }});
    await prisma.answer.deleteMany({ where: { roundId: round.id, playerId }});
    await prisma.answer.create({ data: { roundId: round.id, playerId, text: String(text||'').trim() }});
    const submitted = await prisma.answer.count({ where: { roundId: round.id }});
    const total = await prisma.player.count({ where: { gameId: game.id }});
    io.to(code).emit('answer-count-update', { submitted, total });
    if (submitted === total) await startVotingOrScoring(io, prisma, game, round);
  });

  socket.on('submit-vote', async ({ code, voterId, targetId })=>{
    const game = await prisma.game.findUnique({ where: { code }});
    if (!game) return;
    const round = await prisma.round.findFirst({ where: { gameId: game.id, index: game.currentRound }});
    if (!round || (game.state!=='voting' && game.state!=='who-guess')) return;
    await prisma.vote.deleteMany({ where: { roundId: round.id, voterId }});
    await prisma.vote.create({ data: { roundId: round.id, voterId, targetId }});
    const voteCount = await prisma.vote.count({ where: { roundId: round.id }});
    const totalPlayers = await prisma.player.count({ where: { gameId: game.id }});
    io.to(code).emit('vote-count-update', { count: voteCount, total: totalPlayers });
    if (game.state==='voting' && voteCount === totalPlayers) await finishVoting(io, prisma, game, round);
    else if (game.state==='who-guess' && voteCount === totalPlayers) await finishWhoGuess(io, prisma, game, round);
  });

  socket.on('skip-question', async ({ code, playerId })=>{
    const game = await prisma.game.findUnique({ where: { code }, include:{ players:true }});
    if (!game || game.state!=='playing') return;

    const round = await prisma.round.findFirst({ where: { gameId: game.id, index: game.currentRound }});
    socket.data[`skip-${round.id}`] = socket.data[`skip-${round.id}`] || new Set();
    socket.data[`skip-${round.id}`].add(playerId);

    const skipVotes = socket.data[`skip-${round.id}`].size;
    const total = game.players.length;
    io.to(code).emit('skip-votes-update', { skipVotes, totalPlayers: total });

    // strict majority: floor(n/2)+1
    const majority = Math.floor(total/2) + 1;
    if (skipVotes >= majority) {
      const names = game.players.map(p=>p.name);
      const [newQ] = await buildQuestions(game.category, 1, names);
      await prisma.answer.deleteMany({ where: { roundId: round.id }});
      await prisma.vote.deleteMany({ where: { roundId: round.id }});
      await prisma.round.update({ where: { id: round.id }, data:{ prompt: newQ.prompt, meta: newQ.meta }});
      socket.data[`skip-${round.id}`].clear();
      io.to(code).emit('next-round', { round: game.currentRound, totalRounds: game.rounds, question: newQ.prompt, category: game.category });
    }
  });

  socket.on('player-ready', async ({ code, playerId })=>{
    const game = await prisma.game.findUnique({ where:{ code }});
    if (!game) return;
    const round = await prisma.round.findFirst({ where:{ gameId: game.id, index: game.currentRound }});
    const key = round?.id || `g-${game.id}-r-${game.currentRound}`;
    if (!readyPerRound.has(key)) readyPerRound.set(key, new Set());
    readyPerRound.get(key).add(playerId);
    const total = await prisma.player.count({ where:{ gameId: game.id }});
    io.to(code).emit('ready-count-update', { count: readyPerRound.get(key).size, total });
    if (readyPerRound.get(key).size >= total) {
      if (game.currentRound >= game.rounds) {
        await prisma.game.update({ where:{ id: game.id }, data:{ state:'game-over' }});
        const players = await prisma.player.findMany({ where:{ gameId: game.id }});
        const scores = players.map(p=>({ playerId:p.id, name:p.name, score:p.score})).sort((a,b)=>b.score-a.score);
        io.to(code).emit('game-over', { scores });
      } else {
        const nextIndex = game.currentRound + 1;
        const nextRound = await prisma.round.findFirst({ where:{ gameId: game.id, index: nextIndex }});
        await prisma.game.update({ where:{ id: game.id }, data:{ currentRound: nextIndex, state:'playing' }});
        readyPerRound.delete(key);
        io.to(code).emit('next-round', { round: nextIndex, totalRounds: game.rounds, question: nextRound.prompt, category: game.category });
      }
    }
  });

  socket.on('leave-game', async ({ code, playerId, goHome })=>{
    const game = await prisma.game.findUnique({ where:{ code }, include:{ players:true }});
    if (!game) return;
    const leaving = game.players.find(p=>p.id===playerId);
    if (!leaving) return;
    await prisma.player.delete({ where:{ id: playerId }});
    const fresh = await prisma.game.findUnique({ where:{ id: game.id }, include:{ players:true }});
    if (leaving.isHost && fresh.players.length>0 && !fresh.players.some(p=>p.isHost)) {
      await prisma.player.update({ where:{ id: fresh.players[0].id }, data:{ isHost:true }});
      notice(code, `${fresh.players[0].name} is now host`);
    }
    notice(code, `${leaving.name} left`);
    if (game.state==='playing' && fresh.players.length === 1) {
      await prisma.game.update({ where:{ id: game.id }, data:{ state:'lobby', currentRound:0 }});
      await prisma.player.update({ where:{ id: fresh.players[0].id }, data:{ isHost:true }});
      notice(code, `Only one player left — returning to Lobby`);
      io.to(code).emit('game-aborted-to-lobby');
    }
    io.to(code).emit('players-updated', (await prisma.player.findMany({ where:{ gameId: game.id }})));
    const sId = socketsByPlayer.get(playerId);
    if (sId) io.to(sId).emit('left-success', { goHome: !!goHome });
  });

  socket.on('kick-player', async ({ code, hostId, targetId })=>{
    const game = await prisma.game.findUnique({ where:{ code }, include:{ players:true }});
    if (!game) return;
    const host = game.players.find(p=>p.id===hostId && p.isHost);
    if (!host) return;
    await prisma.player.delete({ where:{ id: targetId }}).catch(()=>{});
    const fresh = await prisma.game.findUnique({ where:{ id: game.id }, include:{ players:true }});
    notice(code, `${fresh.players.find(p=>p.id===targetId)?.name || 'A player'} was kicked`);
    io.to(code).emit('players-updated', fresh.players);
    const sId = socketsByPlayer.get(targetId);
    if (sId) io.to(sId).emit('kicked');
  });

  // voice relay stays same
  socket.on('voice-start', ()=> {
    const room = Array.from(socket.rooms).find(r=>r!==socket.id);
    if (room) socket.to(room).emit('voice-start', socket.id);
  });
  socket.on('voice-data', (buffer)=> {
    const room = Array.from(socket.rooms).find(r=>r!==socket.id);
    if (room) socket.to(room).emit('voice-data', { from: socket.id, data: buffer });
  });
  socket.on('voice-end', ()=> {
    const room = Array.from(socket.rooms).find(r=>r!==socket.id);
    if (room) socket.to(room).emit('voice-end', socket.id);
  });

  socket.on('disconnect', async ()=>{
    const map = playersBySocket.get(socket.id);
    if (!map) return;
    const { playerId, gameId } = map;
    const game = await prisma.game.findUnique({ where:{ id: gameId }, include:{ players:true }});
    if (!game) return;
    playersBySocket.delete(socket.id);
    socketsByPlayer.delete(playerId);
    const wasHost = game.players.find(p=>p.id===playerId)?.isHost;
    await prisma.player.delete({ where: { id: playerId }}).catch(()=>{});
    const fresh = await prisma.game.findUnique({ where:{ id: gameId }, include:{ players:true }});
    if (wasHost && fresh.players.length>0 && !fresh.players.some(p=>p.isHost)) {
      await prisma.player.update({ where:{ id: fresh.players[0].id }, data:{ isHost: true }});
      notice(game.code, `${fresh.players[0].name} is now host`);
    }
    notice(game.code, `A player disconnected`);
    io.to(game.code).emit('players-updated', fresh.players);
  });
});

// helpers (unchanged from previous message)
async function startVotingOrScoring(io, prisma, game, round) {
  const answers = await prisma.answer.findMany({ where: { roundId: round.id }});
  const players = await prisma.player.findMany({ where: { gameId: game.id }});
  const meta = round.meta;
  if (meta.type === 'truth-comes-out' || meta.type === 'naked-truth') {
    const ids = players.map(p=>p.id);
    const targetId = ids[Math.floor(Math.random()*ids.length)];
    const correct = answers.find(a=>a.playerId===targetId)?.text || '';
    const others = answers.filter(a=>a.playerId!==targetId).map(a=>a.text);
    const grades = await (await import('./ai/aiService.js')).default.gradeCloseness(round.prompt, others, correct);
    let i=0;
    for (const a of answers) {
      if (a.playerId===targetId) continue;
      const g = grades[i++] || 5;
      await prisma.player.update({ where:{ id: a.playerId }, data:{ score: { increment: g } }});
    }
    await prisma.game.update({ where:{ id: game.id }, data:{ state:'results' }});
    io.to(game.code).emit('show-results', await packResults(prisma, game, round, null));
    return;
  }
  let list = answers.map(a=>({ playerId: a.playerId, answer: a.text }));
  if (meta.type === 'acronyms') list.push({ playerId:'CORRECT', answer: meta.expansion });
  if (meta.type === 'is-that-a-fact') list.push({ playerId:'CORRECT', answer: meta.trueFact });
  await prisma.game.update({ where:{ id: game.id }, data:{ state:'voting' }});
  io.to(game.code).emit('start-voting', { answers: list.sort(()=>Math.random()-0.5), question: round.prompt, category: game.category });
}

async function finishVoting(io, prisma, game, round) {
  const meta = round.meta;
  const votes = await prisma.vote.findMany({ where: { roundId: round.id }});
  const details = [];
  if (meta.type==='acronyms' || meta.type==='is-that-a-fact') {
    for (const v of votes) {
      if (v.targetId==='CORRECT') { await prisma.player.update({ where:{ id: v.voterId }, data:{ score: { increment: 10 } }}); details.push({ voterId:v.voterId, targetId:v.targetId, correct:true }); }
      else if (v.targetId!==v.voterId) { await prisma.player.update({ where:{ id: v.targetId }, data:{ score: { increment: 20 } }}); details.push({ voterId:v.voterId, targetId:v.targetId, correct:false, fooledBy:v.targetId }); }
    }
  } else {
    for (const v of votes) {
      if (v.targetId!==v.voterId) { await prisma.player.update({ where:{ id: v.targetId }, data:{ score: { increment: 10 } }}); details.push({ voterId:v.voterId, targetId:v.targetId, correct:false }); }
    }
  }
  await prisma.game.update({ where:{ id: game.id }, data:{ state:'results' }});
  io.to(game.code).emit('show-results', await packResults(prisma, game, round, details));
}

async function finishWhoGuess(io, prisma, game, round) {
  const votes = await prisma.vote.findMany({ where:{ roundId: round.id }});
  for (const v of votes) await prisma.player.update({ where:{ id: v.voterId }, data:{ score: { increment: 10 } }});
  await prisma.game.update({ where:{ id: game.id }, data:{ state:'results' }});
  io.to(game.code).emit('show-results', await packResults(prisma, game, round, null));
}

async function packResults(prisma, game, round, details) {
  const players = await prisma.player.findMany({ where:{ gameId: game.id }});
  const scores = players.map(p=>({ playerId: p.id, name: p.name, score: p.score })).sort((a,b)=>b.score-a.score);
  return { round: game.currentRound, totalRounds: game.rounds, question: round.prompt, scores, details };
}

const PORT = process.env.PORT || 5174;
server.listen(PORT, ()=> console.log('Server on', PORT));
