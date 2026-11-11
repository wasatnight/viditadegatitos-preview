(() => {
  const canvas = document.querySelector('#pixel-house');
  const ctx = canvas.getContext('2d');
  const message = document.querySelector('#game-status');
  const count = document.querySelector('#game-count');
  const album = document.querySelector('#game-photos');
  const player = {x: 78, y: 165, facing: 1};
  const directions = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]};
  const keys = {ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', w:'up', a:'left', s:'down', d:'right'};
  const rooms = [
    ['Sala','#e8acbb','sillón','caja','cojines'],
    ['Cocina','#e6c192','alacena','mesa','cajón'],
    ['Estudio','#b9c5ab','escritorio','librero','caja de papel'],
    ['Lavandería','#fffdf8','lavadora','canasta de ropa','repisa'],
    ['Dormitorio','#cdb2ce','cama','buró','canasta'],
    ['Cuarto de juegos','#e4b8ce','rascador','túnel','caja de juguetes'],
  ];
  const layouts = [
    [[24,55,100,42],[253,171,30,28],[183,75,43,24]],
    [[24,46,105,34],[112,103,83,47],[251,167,40,32]],
    [[200,43,85,42],[25,91,37,76],[94,172,31,29]],
    [[225,55,54,54],[25,164,47,32],[80,46,77,27]],
    [[37,35,93,67],[137,53,25,29],[180,165,29,27]],
    [[246,67,38,64],[59,146,74,28],[186,163,40,34]],
  ];
  const places = rooms.flatMap((room, index) => layouts[index].map(([x,y,w,h], slot) => ({
    room:index, name:room[slot+2], x:x+320*(index%3), y:y+224*Math.floor(index/3), w,h,
    kind:[[0,1,0],[1,4,1],[4,1,3],[5,3,1],[2,1,3],[3,0,1]][index][slot],
  })));
  const extraFurniture = [
  [
    ["mesa de centro", 62, 171, 43, 23, 4],
    ["maceta", 34, 172, 20, 24, 6]
  ],
  [
    ["despensa", 251, 51, 34, 49, 1],
    ["frutero", 36, 163, 27, 22, 6]
  ],
  [
    ["archivero", 243, 164, 36, 34, 1],
    ["sillón de lectura", 112, 52, 41, 34, 0]
  ],
  [
    ["cesto de toallas", 43, 97, 32, 27, 3],
    ["tabla de planchar", 207, 172, 61, 19, 4]
  ],
  [
    ["tocador", 185, 48, 51, 32, 4],
    ["baúl", 220, 173, 37, 24, 1]
  ],
  [
    ["torre de cojines", 42, 57, 33, 30, 0],
    ["casita de cartón", 238, 164, 47, 32, 7]
  ]
];
  extraFurniture.forEach((items, room) => {
    items.forEach(([name,x,y,w,h,kind]) => {
      places.push({name, room, x:x+320*(room%3), y:y+224*Math.floor(room/3), w,h,kind});
    });
  });
  const roomName = document.querySelector('#room-name');
  const roomMap = document.querySelector('#room-map');
  const soundButton = document.querySelector('#game-sound');
  const treasures = document.querySelector('#game-treasures');
  const treasureCount = document.querySelector('#treasure-count');
  const souvenirs = [
    'Lazo rosa', 'Cucharita de madera', 'Estrella de papel',
    'Calcetín mini', 'Botón de corazón', 'Ratón de tela',
    'Pelota de colores', 'Pescadito de juguete', 'Ovillo de lana',
    'Pluma suave', 'Cascabel dorado', 'Huellita de papel',
    'Collar de luna', 'Sobre secreto', 'Cajita de cartón',
    'Cepillo de Nini', 'Hoja del jardín', 'Foto de recuerdo',
  ];
  let running = false;
  let introUntil = 0;
  let roomIndex = -2;
  let audio;
  let soundOn = false;
  let lastMeow = 0;
  let soundOutput;
  let musicOutput;
  let nextMusicNote = 0;
  let musicPosition = 0;
  const melody = [
    72, 76, 79, 76, 74, 77, 81, 77,
    76, 79, 84, 79, 81, 79, 76, null,
    77, 81, 84, 81, 76, 79, 83, 79,
    74, 77, 79, 71, 72, 76, 79, null,
    84, 83, 81, 79, 76, 79, 81, 84,
    83, 79, 77, 74, 76, 79, 84, null,
    81, 84, 86, 84, 79, 83, 84, 79,
    77, 76, 74, 71, 72, 76, 72, null,
  ];
  const roomAt = (x,y) => x < 0 ? -1 : Math.floor(y/224)*3 + Math.floor(x/320);
  function playNote(note, when, length, volume, output = soundOutput, waveform = 'sine') {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, when + length);
    oscillator.connect(gain).connect(output);
    oscillator.start(when);
    oscillator.stop(when + length + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function scheduleMusic() {
    if (!soundOn || audio?.state !== 'running' || document.hidden) return;
    const now = audio.currentTime;
    if (nextMusicNote < now) nextMusicNote = now + .04;
    while (nextMusicNote < now + .15) {
      const note = melody[musicPosition];
      if (note !== null) playNote(note, nextMusicNote, .26, .045, musicOutput, 'triangle');
      if (musicPosition % 4 === 0) {
        const root = [48, 53, 57, 55][Math.floor(musicPosition / 8) % 4];
        const bass = root + (musicPosition % 8 === 4 ? 7 : 0);
        playNote(bass, nextMusicNote, .32, .045, musicOutput, 'triangle');
        playNote(root + 16, nextMusicNote + .06, .18, .016, musicOutput);
        playNote(root + 19, nextMusicNote + .06, .18, .016, musicOutput);
      }
      nextMusicNote += .22;
      musicPosition = (musicPosition + 1) % melody.length;
    }
  }
  async function discoverySound(cat = false) {
    try {
      if (audio?.state !== 'running') await unlockAudio();
      const now = audio.currentTime;
      if (cat && soundOn) {
        musicOutput.gain.cancelScheduledValues(now);
        musicOutput.gain.setValueAtTime(musicOutput.gain.value, now);
        musicOutput.gain.linearRampToValueAtTime(.18, now + .06);
        musicOutput.gain.setValueAtTime(.18, now + 1.8);
        musicOutput.gain.linearRampToValueAtTime(1, now + 2.5);
      }
      if (cat) {
        const celebration = [72, 76, 79, 84, 79, 84, 88];
        celebration.forEach((note,index) => playNote(note, now + index * .15, .8, .15));
        [72, 76, 79].forEach(note => playNote(note, now + 1.1, 1.15, .055));
      } else {
        [79, 84].forEach((note,index) => playNote(note, now + index * .11, .65, .075));
      }
    } catch {
      message.textContent += ' Pulsa Activar música para recuperar el audio.';
    }
  }
  async function unlockAudio() {
    // iOS otherwise treats Web Audio as ambient audio and follows the silent switch.
    if (navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch {
        // Browsers without playback sessions can still use their normal audio output.
      }
    }
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) throw new Error('Audio no disponible');
    if (!audio || audio.state === 'closed') {
      audio = new AudioEngine();
      soundOutput = audio.createGain();
      soundOutput.gain.value = 1;
      soundOutput.connect(audio.destination);
      musicOutput = audio.createGain();
      musicOutput.gain.value = 0;
      musicOutput.connect(soundOutput);
    }
    // Start a source during the gesture so Safari can unlock its audio output.
    const source = audio.createBufferSource();
    source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    source.connect(audio.destination);
    source.start();
    await audio.resume();
    if (audio.state !== 'running') throw new Error('Audio suspendido');
  }
  soundButton.addEventListener('click', async () => {
    try {
      if (!soundOn) await unlockAudio();
      soundOn = !soundOn;
      soundButton.setAttribute('aria-pressed', String(soundOn));
      soundButton.textContent = soundOn ? 'Silenciar música' : 'Activar música';
      musicOutput.gain.cancelScheduledValues(audio.currentTime);
      musicOutput.gain.setTargetAtTime(soundOn ? 1 : 0, audio.currentTime, .08);
      if (soundOn) {
        nextMusicNote = audio.currentTime + .04;
        scheduleMusic();
        message.textContent = 'Música activada ♡ Los descubrimientos tienen su propio tintineo.';
      }
    } catch {
      soundOn = false;
      soundButton.setAttribute('aria-pressed', 'false');
      soundButton.textContent = 'Activar música';
      message.textContent = 'No se pudo activar el audio. Revisa el volumen y vuelve a pulsar Activar música.';
    }
  });
  const cats = [
    {name:'Nini',photo:'nini-rascador.png', fur:'#51403b', patch:'#b6784e'},
    {name:'Manchas',photo:'manchas-recostada.png', fur:'#fff0dc', patch:'#d18b51'},
  ];
  const gardenCats = [
    {name:'Tobias', fur:'#a69a82', patch:'#685c50', tabby:true},
    {name:'Harfusha', fur:'#e5d3b8', patch:'#c3a886', blueEyes:true},
  ];
  const gardenPoses = [
    [{x:168,y:98,pose:'sit'}, {x:190,y:98,pose:'sit'}],
    [{x:171,y:100,pose:'cuddle'}, {x:188,y:100,pose:'cuddle'}],
    [{x:160,y:103,pose:'lie'}, {x:195,y:99,pose:'sit'}],
    [{x:165,y:99,pose:'sit'}, {x:195,y:103,pose:'lie'}],
  ];
  let gardenPose = -1;
  const gardenObstacles = [
    {x:26,y:155,w:82,h:43},
    {x:28,y:40,w:39,h:46},
    {x:253,y:31,w:40,h:48},
  ];
  const companions = [];
  const trail = [];
  const pressed = new Map();
  let hiding = [];
  let found = 0;
  let last = 0;
  let steps = 0;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rect = (x,y,w,h,color) => {ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const label = (text,x,y,color='#624151') => {ctx.fillStyle=color;ctx.font='bold 9px monospace';ctx.fillText(text,x,y);};

  function furniture(p,index) {
    const {x,y,w,h}=p;
    if (index === 6) {
      rect(x+3,y+11,w-6,h-11,'#a96857');
      rect(x,y+8,w,5,'#dca488');
      rect(x+4,y+3,w-8,7,'#82956d');
      rect(x+8,y,w-16,8,'#a5af77');
      return;
    }
    if (index === 7) {
      rect(x,y+7,w,h-7,'#b57852');
      rect(x+3,y+10,w-6,h-10,'#e1b783');
      rect(x+5,y,w-10,8,'#c78e61');
      rect(x+w/2-8,y+15,16,h-15,'#765044');
      return;
    }
    rect(x+3,y+5,w,h,'#986878');
    rect(x,y,w,h,['#a75f7d','#ab7049','#825868','#956746','#825868','#7894a0'][index]);
    rect(x+3,y+3,w-6,h-6,['#db9aae','#d7a470','#f6ded0','#dbac78','#cf9c79','#d0e0df'][index]);
    if (index === 0 && p.room === 0 && p.name === 'sillón') {
      rect(x,y,w,h,'#526d61');
      rect(x+3,y+3,w-6,h-6,'#8da38b');
      rect(x+8,y+17,w-16,16,'#a9bba0');
      rect(x+12,y+7,29,8,'#efce83');
      rect(x+55,y+7,29,8,'#c4d9d3');
      rect(x+48,y+17,2,16,'#718b76');
    } else if (index===0) {
      rect(x+8,y+17,w-16,16,'#efb5c2');
      rect(x+8,y+7,31,8,'#f2c2ca'); rect(x+46,y+7,31,8,'#f2c2ca');
      rect(x+42,y+17,2,16,'#cb8298');
    } else if(index===2) {
      rect(x+7,y+6,27,13,'#fff4e3'); rect(x+42,y+6,27,13,'#fff4e3');
      rect(x+4,y+25,w-8,30,'#cf8da8');
      for(let stripe=30;stripe<55;stripe+=8) rect(x+4,y+stripe,w-8,2,'#e5a9bf');
    } else if(index===1) {
      rect(x+11,y,6,h,'#f2ce9f'); rect(x+2,y+6,w-4,2,'#b67e51');
    } else if(index===4) {
      rect(x+5,y+5,w-10,h-16,'#ecc5a1'); rect(x+9,y+10,18,12,'#f4ecd8'); rect(x+w-25,y+9,12,12,'#a8ae91');
    } else if(index===5) {
      rect(x+5,y+5,w-10,7,'#a3b9c1'); rect(x+w/2-12,y+16,24,22,'#69838e'); rect(x+w/2-8,y+20,16,14,'#b1cdd4');
    } else {
      for(let slat=5;slat<w-4;slat+=5) rect(x+slat,y+4,2,h-8,'#bc875c');
      rect(x+4,y+8,w-8,4,'#f1c5aa');
    }
  }

  function kitten(cat,x,y) {
    rect(x-7,y-4,14,10,cat.fur);
    rect(x-7,y-8,4,6,cat.fur); rect(x+3,y-8,4,6,cat.patch);
    rect(x+2,y-3,5,6,cat.patch);
    rect(x-4,y,2,2,'#372c30'); rect(x+3,y,2,2,'#372c30');
    rect(x-1,y+3,2,1,'#cf8291');
  }

  function decorateRoom(index) {
    const tiles = index === 1 || index === 3;
    if (tiles) {
      const palette = index === 1 ? ['#f6e3c6','#e6bc9c'] : ['#e4eef0','#bacfd5'];
      for (let row=0;row<10;row++) {
        for (let column=0;column<16;column++) {
          rect(8+column*19,35+row*18,19,18,palette[(row+column)%2]);
        }
      }
    } else {
      for (let y=38;y<215;y+=9) {
        rect(8,y,304,1,'#d6a886');
        for (let x=10+(y%4)*9;x<310;x+=44) rect(x,y+1,1,8,'#d6a886');
      }
    }
    const windowX = [56,206,117,209,112,35][index];
    rect(windowX,12,62,19,'#fff0d8');
    rect(windowX+4,15,54,13,'#a4c6ca');
    rect(windowX+29,14,4,15,'#fff0d8');
    const rugs = [
      [76,119,135,46,'#b77590','#efc3c9'],
      [19,96,61,36,'#b77556','#f8dcb8'],
      [101,83,80,69,'#7f9478','#d9dfb9'],
      [105,155,83,34,'#819eab','#d5e7e9'],
      [92,147,131,45,'#917698','#dbc0df'],
      [107,69,101,70,'#bd8aa5','#f4d2df'],
    ];
    const [x,y,w,h,edge,fill] = rugs[index];
    rect(x,y,w,h,edge);
    rect(x+4,y+4,w-8,h-8,fill);
    for (let dx=10;dx<w-8;dx+=12) rect(x+dx,y+8,3,h-16,rooms[index][1]);

    const details = [
      [[225,47,23,13,'#a77762'],[231,42,10,9,'#e8b781'],[253,48,16,19,'#8b9b77']],
      [[49,51,11,10,'#a97c5d'],[74,51,17,10,'#fff2dd'],[97,51,11,10,'#91a696']],
      [[30,100,7,29,'#a87c8c'],[39,106,8,23,'#e9b885'],[48,98,8,31,'#a5b99a']],
      [[90,48,11,14,'#779dab'],[108,49,15,13,'#eab1ba'],[130,49,12,13,'#a4b697']],
      [[148,66,15,11,'#f9d6a2'],[153,77,4,7,'#ac795f'],[260,42,20,16,'#a5a47d']],
      [[154,92,10,10,'#bd6e96'],[166,104,8,8,'#e7ab5d'],[181,93,8,8,'#85a6ad']],
    ];
    return details[index];
  }

  function decorateLivingRoom() {
    // Televisor y mueble bajo.
    rect(172,43,72,21,'#6f5146');
    rect(176,43,64,14,'#ad795d');
    rect(180,57,4,8,'#58433b');
    rect(232,57,4,8,'#58433b');
    rect(188,29,40,23,'#384d58');
    rect(192,32,32,15,'#58818b');
    rect(195,34,10,2,'#a4c7c6');
    rect(205,48,7,3,'#e4bf76');

    // Lámpara de pie y lámpara pequeña.
    rect(20,105,17,4,'#705849');
    rect(27,80,3,25,'#705849');
    rect(22,73,13,8,'#e6b957');
    rect(19,81,19,4,'#f3d184');
    rect(246,54,14,3,'#645248');
    rect(252,45,2,9,'#645248');
    rect(246,38,14,8,'#d9aa54');

    // Rascador con plataformas y cuerda.
    rect(264,94,34,8,'#647d80');
    rect(278,64,7,31,'#c09b69');
    for (let y=68;y<94;y+=4) rect(278,y,7,1,'#f1d7a1');
    rect(267,73,17,5,'#7c9c98');
    rect(271,57,24,8,'#7c9c98');
    rect(273,57,20,3,'#b6cec1');
  }

  function decorateLaundry() {
    // Secadora, con puerta oscura y controles ámbar.
    rect(174,62,46,47,'#a38779');
    rect(172,58,46,47,'#daccc1');
    rect(175,61,40,41,'#fff6eb');
    rect(177,65,36,6,'#dbb492');
    rect(204,66,4,3,'#8c634a');
    rect(183,76,24,21,'#8c726e');
    rect(186,79,18,15,'#b59891');
    rect(189,83,11,7,'#e4b28d');

    // Tendedero y prendas.
    rect(25,19,149,1,'#a59a91');
    for (const [x,y,w,h,color] of [
      [32,20,19,12,'#81a6a6'],[66,20,15,15,'#d59aa6'],
      [101,20,22,12,'#d8ad64'],[140,20,20,13,'#96a985'],
    ]) {
      rect(x,y,w,h,color);
      rect(x-3,y+2,w+6,4,color);
      rect(x+3,y-1,2,3,'#805f49');
    }

    // Botellas en la repisa y toallas en los cestos.
    for (const [x,color] of [[92,'#88a5bb'],[111,'#d291a3'],[132,'#90a278']]) {
      rect(x+3,45,6,3,'#675e65');
      rect(x,48,12,12,color);
      rect(x+2,53,8,4,'#fff4de');
    }
    rect(48,99,20,5,'#efd4a5');
    rect(49,103,19,4,'#a6bdc1');
    rect(30,166,34,5,'#e1aeb6');
    rect(37,162,24,5,'#fff3e5');
    rect(218,175,18,7,'#bad0ba');
    rect(236,174,8,6,'#e9ba74');
  }

  function decorateBedroom() {
    // Retratos sobre la cabecera.
    cats.forEach((cat,i) => {
      const x = 55+i*34;
      rect(x,10,25,22,'#785466');
      rect(x+2,12,21,18,i ? '#e6c39c' : '#a9b8a2');
      kitten(cat,x+12,23);
    });

    // Clóset de dos puertas y librero.
    rect(249,37,54,53,'#735749');
    rect(252,40,23,46,'#c99874');
    rect(277,40,23,46,'#dcb292');
    rect(270,62,3,4,'#f4d79c');
    rect(279,62,3,4,'#f4d79c');
    rect(265,164,39,40,'#775949');
    rect(269,167,31,33,'#b58d6c');
    for (const y of [170,186]) {
      ['#b77991','#8ca6a4','#e5ba70','#a1a782'].forEach((color,i) => rect(271+i*7,y+i%2,5,10-i%2,color));
      rect(268,y+10,33,2,'#775949');
    }

    // Tele frente a la cama y lámparas a ambos lados.
    rect(59,189,49,12,'#8f6650');
    rect(63,197,4,7,'#65483c');
    rect(100,197,4,7,'#65483c');
    rect(64,167,39,23,'#43515a');
    rect(67,170,33,15,'#789da4');
    rect(79,189,9,3,'#43515a');
    for (const x of [8,137]) {
      rect(x,53,25,29,'#795747');
      rect(x+2,54,21,13,'#c29270');
      rect(x+3,68,19,10,'#ab795b');
      rect(x+10,71,5,2,'#efca82');
      const y = 45;
      const lampX = x+6;
      rect(lampX+5,y+7,3,8,'#785d51');
      rect(lampX+1,y+14,11,2,'#785d51');
      rect(lampX+2,y,9,5,'#e5bf72');
      rect(lampX,y+5,13,3,'#f5d89a');
    }
  }

  function gardenPetPosition(index) {
    return gardenPoses[Math.max(0,gardenPose)][index];
  }

  function nearbyGardenCat() {
    const x = player.x + 320;
    return gardenCats.find((cat,index) => {
      const position = gardenPetPosition(index);
      return Math.hypot(x-position.x, player.y-position.y) < 27;
    });
  }

  function drawGardenPet(cat, position, time) {
    const {x,y,pose} = position;
    const bodyWidth = cat.tabby ? 22 : 16;
    rect(x-bodyWidth/2-2,y+5,bodyWidth+4,3,'#889568');
    if (pose === 'lie') {
      rect(x-bodyWidth/2-4,y-1,bodyWidth+7,9,cat.fur);
      kitten(cat,x+5,y-3);
    } else {
      rect(x-bodyWidth/2,y-3,bodyWidth,12,cat.fur);
      rect(x-bodyWidth/2-4,y+5,8,3,cat.patch);
      kitten(cat,x,y-7);
      rect(x-6,y+7,5,2,cat.patch);
      rect(x+2,y+7,5,2,cat.patch);
      if (pose === 'cuddle') rect(x+(cat.tabby?6:-12),y-5,9,4,cat.fur);
    }
    if (cat.tabby) {
      for (const offset of [-6,0,6]) rect(x+offset,y,2,5,cat.patch);
      rect(x-5,y-12,3,2,cat.patch);
      rect(x+2,y-12,3,2,cat.patch);
    } else {
      rect(x-4,y-7,2,2,'#7bafb8');
      rect(x+3,y-7,2,2,'#7bafb8');
    }
    if (nearbyGardenCat() === cat) {
      rect(x-3,y-27,6,2,'#fff1dc');
      rect(x-1,y-29,2,6,'#fff1dc');
    }
  }

  function drawGarden(time) {
    rect(0,0,320,224,'#a8bc82');
    for (let y=28;y<216;y+=16) {
      for (let x=10;x<312;x+=17) rect(x,y,2,2,(x+y)%3?'#bacb95':'#90a771');
    }
    rect(0,6,320,13,'#e8d6ba');
    for (let x=3;x<312;x+=15) {
      rect(x,2,8,27,'#f4e5ce');
      rect(x+6,3,2,25,'#d0b899');
    }
    rect(3,22,4,194,'#d0b899');
    rect(7,212,304,5,'#d0b899');
    // Pavers lead from the parking area to the living-room entrance.
    for (let x=112;x<314;x+=24) {
      rect(x,123,22,27,'#d6c7af');
      rect(x+2,125,18,2,'#e8deca');
    }
    for (let y=151;y<201;y+=24) rect(112,y,22,21,'#d6c7af');
    rect(136,82,77,34,'#d9d9ac');
    rect(140,85,69,28,'#ede4bd');
    rect(306,98,14,59,'#ba8a6b');
    rect(311,104,9,47,'#ead8b8');
    rect(316,118,4,32,'#fff0d5');
    const tree = (x,y) => {
      rect(x+13,y+24,10,22,'#997254');
      rect(x+6,y+41,27,4,'#8fa171');
      rect(x+3,y+3,29,29,'#668b67');
      rect(x-3,y+10,41,18,'#668b67');
      rect(x+4,y,24,24,'#83a776');
      rect(x+7,y+4,10,4,'#a7bd84');
      rect(x+27,y+15,7,8,'#5d7f5c');
    };
    tree(31,40);
    tree(255,31);
    // Original three-quarter pixel car, drawn on a two-pixel grid.
    rect(20,148,95,56,'#c1b8a7');
    const carPixel = (x,y,w,h,color) => rect(23+x*2,149+y*2,w*2,h*2,color);
    const carShape = (points,color) => {
      for (let y=0;y<26;y++) {
        const edges=[];
        for(let i=0;i<points.length;i++) {
          const a=points[i],b=points[(i+1)%points.length];
          if((a[1]<=y+.5 && b[1]>y+.5)||(b[1]<=y+.5 && a[1]>y+.5))
            edges.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
        }
        edges.sort((a,b)=>a-b);
        for(let i=0;i<edges.length;i+=2) carPixel(Math.round(edges[i]),y,Math.round(edges[i+1])-Math.round(edges[i]),1,color);
      }
    };
    const ink='#394549', shade='#b5c0bc', white='#fffdf3', glass='#8eafb5';
    carPixel(3,21,38,3,'#9c9c8e');
    carShape([[1,12],[3,8],[10,3],[17,1],[26,3],[32,11],[42,15],[43,21],[35,24],[10,22],[1,18]],ink);
    carShape([[3,11],[10,5],[18,3],[26,5],[30,12],[19,16],[3,15]],shade);
    carShape([[9,5],[17,2],[25,4],[28,7],[18,10]],white);
    // Rear side window and driver's window, framed in charcoal.
    carShape([[5,10],[10,6],[16,8],[15,14],[5,13]],ink);
    carShape([[7,10],[10,8],[14,9],[13,12],[7,12]],glass);
    carShape([[17,8],[24,6],[29,12],[28,16],[17,14]],ink);
    carShape([[19,9],[24,8],[27,12],[26,14],[19,13]],glass);
    carPixel(20,9,3,1,'#cbe0dd');
    // Far windshield and gently sloped white hood.
    carShape([[29,9],[32,12],[40,15],[29,18],[21,15]],ink);
    carShape([[30,11],[32,13],[37,15],[29,16],[24,15]],glass);
    carShape([[3,14],[15,15],[28,19],[28,23],[19,22],[15,19],[11,19],[9,21],[3,18]],'#e1e5dc');
    carShape([[29,17],[38,15],[42,17],[41,19],[31,22],[25,20]],white);
    carShape([[30,21],[42,18],[42,21],[33,24],[29,23]],shade);
    carPixel(17,16,3,1,'#7d918f');
    carPixel(16,16,1,4,'#b5c0bc');
    // Two visible tires with stepped round silhouettes and silver hubs.
    for(const [x,y] of [[7,17],[27,21]]) {
      carPixel(x+1,y-2,4,1,ink);carPixel(x,y-1,6,5,ink);carPixel(x+1,y+4,4,1,ink);
      carPixel(x+2,y-1,2,1,'#929d9a');carPixel(x+1,y,4,3,'#697777');carPixel(x+2,y,2,3,'#a9b2ac');
    }
    // Front grille, warm lamps, bumper, rear lamp and side mirror.
    carShape([[33,21],[40,19],[40,21],[33,23]],ink);
    carPixel(34,21,1,1,'#96a29a');carPixel(37,20,1,1,'#96a29a');
    carPixel(30,20,3,2,'#f7dd89');carPixel(40,18,2,2,'#f7dd89');
    carPixel(31,20,2,1,'#fff3c3');carPixel(2,14,2,3,'#ce837e');
    carPixel(33,24,8,1,ink);carPixel(29,15,3,2,ink);carPixel(29,15,2,1,'#e1e5dc');
    for (const [x,y] of [[82,52],[224,186],[270,183],[18,114],[230,49]]) {
      rect(x,y,17,10,'#819b65');
      rect(x+4,y-3,3,5,'#f0bdc6');
      rect(x+11,y-1,3,5,'#f0d28f');
    }
    rect(21,98,35,16,'#bc8a64');
    rect(23,96,31,4,'#e5ba88');
    rect(24,114,4,8,'#90684e');
    rect(49,114,4,8,'#90684e');
    gardenCats.forEach((cat,index) => drawGardenPet(cat,gardenPetPosition(index),time));
  }

  async function gardenMeow() {
    try {
      if (audio?.state !== 'running') await unlockAudio();
      const now = audio.currentTime;
      const voice = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(520,now);
      voice.frequency.exponentialRampToValueAtTime(760,now+.12);
      voice.frequency.exponentialRampToValueAtTime(390,now+.48);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1300,now);
      filter.frequency.linearRampToValueAtTime(750,now+.5);
      filter.Q.value = 2.5;
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.linearRampToValueAtTime(.1,now+.07);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.55);
      voice.connect(filter).connect(gain).connect(soundOutput);
      voice.start(now);
      voice.stop(now+.56);
      voice.onended = () => {voice.disconnect();filter.disconnect();gain.disconnect();};
    } catch {
      message.textContent += ' Activa el audio para escuchar su miau.';
    }
  }

  function followerPositions() {
    return companions.map((cat,index) => {
      let remaining = 23 + index*22;
      for (let i=1;i<trail.length;i++) {
        const a=trail[i-1], b=trail[i];
        const distance=Math.hypot(b.x-a.x,b.y-a.y);
        if (distance >= remaining && distance > 0) {
          const fraction=remaining/distance;
          return {cat,x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};
        }
        remaining-=distance;
      }
      const tail=trail.at(-1) || player;
      return {cat,x:tail.x,y:tail.y};
    });
  }

  function draw(time) {
    const index = roomAt(player.x,player.y);
    const ox = index === -1 ? -320 : (index%3)*320;
    const oy = index === -1 ? 0 : Math.floor(index/3)*224;
    if(index!==roomIndex){
      roomIndex=index;
      if(running) {
        lastMeow=time;
      }
      if (index === -1) {
        gardenPose = (gardenPose + 1 + Math.floor(Math.random()*(gardenPoses.length-1))) % gardenPoses.length;
        message.textContent='Tobias y Harfusha te esperan en el jardín. Acércate y pulsa Saludar.';
      }
      roomName.textContent=index === -1 ? 'Jardín de casa' : rooms[index][0];
      roomMap.textContent=index === -1 ? 'Una visita a Tobias y Harfusha' : 'Habitación '+(index+1)+' de '+rooms.length;
      document.querySelector('#game-search').textContent=index === -1 ? 'Saludar ♡' : 'Buscar ♡';
    }
    if (index === -1) {
      drawGarden(time);
    } else {
    rect(0,0,320,224,'#674d60');
    rect(8,8,304,208,'#e5bb96');
    rect(8,8,304,27,rooms[index][1]);
    const decorations = decorateRoom(index);
    if(index%3>0 || index===0)rect(0,114,8,44,'#d6a886');
    if(index%3<2)rect(312,114,8,44,'#d6a886');
    if(index>=3)rect(140,0,40,8,'#d6a886');
    if(index<3)rect(140,216,40,8,'#d6a886');
    ctx.save();
    ctx.translate(-ox,-oy);
    const target=nearby();
    places.filter(p=>p.room===index).forEach(p=>{
      if (p.room !== 4 || p.name !== 'buró') furniture(p,p.kind);
      if(p===target) {
        const bx = Math.round(p.x+p.w/2-7);
        const by = Math.round(p.y+p.h+4);
        rect(bx,by,15,19,'#71344e');
        rect(bx+1,by+1,13,17,'#fff1d6');
        const pixels = ['01110','11011','00011','00110','00100','00000','00100'];
        pixels.forEach((row,y) => [...row].forEach((pixel,x) => {
          if (pixel === '1') rect(bx+3+x*2,by+2+y*2,2,2,'#71344e');
        }));
      }
    });
    ctx.restore();
    decorations.forEach(detail => rect(...detail));
    if (index === 0) decorateLivingRoom();
    if (index === 3) decorateLaundry();
    if (index === 4) decorateBedroom();
    if (index === 0) {
    }
    }
    ctx.save();
    ctx.translate(-ox,-oy);
    if (index === 0 && running && time < introUntil) {
      const progress = Math.max(0, 1 - (introUntil-time)/2200);
      cats.forEach((cat,i) => {
        const distance = Math.max(0,Math.min(1,progress*1.35-i*.22));
        if (distance < 1) {
          const x = 108 + distance*213;
          const y = 143 + i*9 - (reduced.matches ? 0 : Math.abs(Math.sin(distance*31))*4);
          rect(x-12,y+3,14,5,cat.fur);
          rect(x-17,y,7,2,cat.patch);
          rect(x-10,y+7,3,3,cat.fur);
          rect(x-3,y+7,3,3,cat.fur);
          kitten(cat,x,y);
        }
      });
    }
    followerPositions().filter(p => roomAt(p.x,p.y) === index).forEach(p => {
      rect(p.x-9,p.y+1,16,6,p.cat.fur);
      rect(p.x-13,p.y+1,5,2,p.cat.patch);
      kitten(p.cat,p.x,p.y-2);
    });
    const {x,y,facing}=player;
    const stride=pressed.size ? (Math.floor(steps/7)%2 ? 2:-2):0;
    rect(x-7,y+1,14,4,'#ba8e7d');
    rect(x-5,y-8,4,8+stride,'#654559');rect(x+1,y-8,4,8-stride,'#654559');
    rect(x-7,y-13,14,10,'#a85d8e'); rect(x-8,y-7,16,4,'#d989ad');
    rect(x-8,y-24,16,12,'#553747'); rect(x-5,y-21,11,9,'#f4ba99');
    rect(x-8,y-22,6,4,'#553747'); rect(x+facing*3,y-18,2,2,'#47313d');
    rect(x-8,y-24,4,3,'#f1b4ca');
    ctx.restore();
  }

  function nearby() {
    return places.find(p=>p.room===roomAt(player.x,player.y) && !p.checked && player.x >= p.x-16 && player.x <= p.x+p.w+16 &&
      player.y >= p.y-10 && player.y <= p.y+p.h+23);
  }

  const discovery = document.querySelector('#game-discovery');
  const discoveryIcon = discovery.querySelector('.discovery-icon');
  const discoveryTitle = discovery.querySelector('strong');
  let discoveryTimer;
  const smallFinds = ['Papel arrugado', 'Hilo de lana', 'Plumita perdida', 'Un bigotito', 'Un pelito'];
  let smallFindIndex = 0;
  const itemArt = {
    'Papel arrugado': '<path fill="#f4dfb9" d="M8 3h12v4h6v8h4v8h-7v6H9v-4H3V12h5z"/><path fill="#c19c83" d="M10 8h3v8h-3zM15 16h9v3h-9zM9 23h9v3H9z"/>',
    'Hilo de lana': '<path fill="#bd9cca" d="M3 5h18v4H7v8h20v11H11v-4h12v-3H3z"/>',
    'Plumita perdida': '<path fill="#aac4ba" d="M22 2h6v13h-4v6h-8v4H8V13h5V7h9z"/><path fill="#fff0dc" d="M21 8h3v7h-4v6h-4v5h-4v6H8v-8h4v-6h4v-6h5z"/>',
    'Un bigotito': '<path fill="#765144" d="M2 25h4v-5h4v-5h6v-5h14v3H17v5h-6v5H7v5H2z"/>',
    'Lazo rosa': '<path fill="#e3a2bc" d="M3 9h7v3h4V9h7v14h-7v-3h-4v3H3z"/><path fill="#fff0dc" d="M10 13h4v6h-4z"/>',
    'Cucharita de madera': '<path fill="#dca367" d="M8 2h8v3h3v8h-5v17h-4V13H5V5h3z"/><path fill="#f6ce94" d="M9 5h6v6H9z"/>',
    'Estrella de papel': '<path fill="#f2cd78" d="M14 2h4v8h8v4h6v4h-8v6h-4v8h-8v-8H8v-6H0v-4h6v-4h8z"/>',
    'Calcetín mini': '<path fill="#a9b9d3" d="M12 3h14v19h-4v4h-4v4H4v-4H1v-8h11z"/><path fill="#fff0dc" d="M12 3h14v5H12zM1 20h7v8H4v-2H1z"/>',
    'Botón de corazón': '<path fill="#e3a2bc" d="M4 4h8v4h8V4h8v4h4v12h-4v4h-4v4h-4v4h-8v-4H8v-4H4v-4H0V8h4z"/><path fill="#71344e" d="M10 13h3v3h-3zM19 13h3v3h-3z"/>',
    'Ratón de tela': '<path fill="#b3beb4" d="M5 12h18v4h4v10H3V16h2z"/><path fill="#e3a2bc" d="M5 5h8v9H5zM18 5h8v9h-8z"/><path fill="#513444" d="M9 18h3v3H9zM20 18h3v3h-3z"/><path fill="#d58ca5" d="M14 23h4v3h-4z"/>',
    'Pelota de colores': '<path fill="#e7a6be" d="M9 2h14v4h5v5h3v12h-4v5H9v-4H3V10h6z"/><path fill="#f3d386" d="M14 2h7v26h-7z"/><path fill="#a0bccb" d="M4 13h26v6H4z"/>',
    'Pescadito de juguete': '<path fill="#90b7bf" d="M7 8h13v4h5l7-8v24l-7-8h-5v4H7v-4H3V12h4z"/><path fill="#513444" d="M8 12h3v3H8z"/><path fill="#f5d68c" d="M16 8h4v16h-4z"/>',
    'Ovillo de lana': '<path fill="#b6a2cb" d="M8 3h15v4h5v17h-5v4H8v-4H4V7h4zM23 25h4v4h5v3h-9z"/><path fill="#e4d3ed" d="M8 8h15v3H8zM8 15h15v3H8zM10 22h11v3H10z"/>',
    'Pluma suave': '<path fill="#a2c2b0" d="M22 2h7v11h-4v6h-5v5h-7v-5H8v-7h5V7h5V3z"/><path fill="#fff0dc" d="M21 10h3v5h-4v5h-4v5h-4v7H8v-9h4v-5h4v-5h5z"/>',
    'Cascabel dorado': '<path fill="#edc16c" d="M11 1h10v5h5v5h4v14h-5v4H7v-4H2V11h4V6h5z"/><path fill="#fff0dc" d="M13 3h6v3h-6zM7 10h4v7H7z"/><path fill="#765144" d="M14 18h4v6h-4zM8 24h16v3H8z"/>',
    'Huellita de papel': '<path fill="#edafbc" d="M4 6h5v8H4zM12 1h5v9h-5zM21 2h5v9h-5zM27 9h5v8h-5zM10 16h12v4h5v8h-5v3H8v-3H4v-7h6z"/>',
    'Collar de luna': '<path fill="#8eaec2" d="M5 3h22v4H5zM2 7h4v12H2zM26 7h4v12h-4zM6 18h7v4H6zM20 18h6v4h-6z"/><path fill="#efd28b" d="M14 19h7v4h-4v5h7v3H12v-4H9v-5h5z"/>',
    'Sobre secreto': '<path fill="#f4dfb9" d="M2 7h28v22H2z"/><path fill="#be9475" d="M2 7h5v4h5v4h8v-4h5V7h5v4h-5v4h-5v4h-8v-4H7v-4H2z"/><path fill="#cd829d" d="M13 18h6v6h-6z"/>',
    'Cajita de cartón': '<path fill="#c89565" d="M3 11h26v19H3z"/><path fill="#edc492" d="M2 5h12v6H2zM18 5h12v6H18z"/><path fill="#a27051" d="M3 11h26v4H3z"/><path fill="#f4dca9" d="M14 15h4v15h-4z"/>',
    'Cepillo de Nini': '<path fill="#e1a4bc" d="M6 4h20v15H6zM13 19h6v12h-6z"/><path fill="#fff0dc" d="M9 7h2v9H9zM15 7h2v9h-2zM21 7h2v9h-2z"/>',
    'Hoja del jardín': '<path fill="#97ad7e" d="M20 2h10v12h-4v6h-6v4H8v-4H4V10h6V6h10z"/><path fill="#d8d9a0" d="M22 6h4v4h-4v4h-4v4h-4v4h-4v8H6V20h4v-6h6v-4h6z"/>',
    'Foto de recuerdo': '<path fill="#fff4e0" d="M2 2h28v30H2z"/><path fill="#b5c8bb" d="M5 5h22v19H5z"/><path fill="#795c51" d="M9 9h4v3h6V9h4v12H9z"/><path fill="#e0a16a" d="M10 12h5v7h-5z"/><path fill="#513444" d="M12 16h2v2h-2zM19 16h2v2h-2z"/>',
    'Un pelito': '<path fill="#e3b87c" d="M6 2h4v4H6zM10 6h4v8h-4zM14 14h4v8h-4zM10 22h4v6h-4zM6 28h4v4H6z"/><path fill="#fff0dc" d="M22 5h3v3h-3zM27 10h3v3h-3z"/>',
  };
  function showDiscovery(name, cat, greeting = false) {
    clearTimeout(discoveryTimer);
    discovery.classList.toggle('cat-discovery', Boolean(cat));
    discovery.classList.toggle('manchas-discovery', cat?.name === 'Manchas');
    const catArt = cat ? '<path fill="'+cat.fur+'" d="M3 2h5v4h16V2h5v25h-5v3H8v-3H3z"/><path fill="'+cat.patch+'" d="M5 6h8v12H5zM21 17h6v8h-6z"/><path fill="#573747" d="M8 18h3v3H8zM22 18h3v3h-3z"/><path fill="#e3a2bc" d="M14 23h4v3h-4z"/>' : itemArt[name];
    discoveryIcon.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">'+catArt+'</svg>';
    discoveryTitle.textContent = greeting ? name+' · ¡Miau!' : cat ? '¡Encontraste a '+name+'!' : '¡Encontraste '+name.toLowerCase()+'!';
    discovery.hidden = false;
    discovery.classList.remove('discovery-pop');
    void discovery.offsetWidth;
    discovery.classList.add('discovery-pop');
    discoveryTimer = setTimeout(() => { discovery.hidden = true; }, cat ? 4200 : 2600);
  }

  function search() {
    if(!running || last<introUntil) return;
    if (roomAt(player.x,player.y) === -1) {
      const cat=nearbyGardenCat();
      if (cat) {
        showDiscovery(cat.name,cat,true);
        message.textContent=cat.name+' te saluda. ¡Miau! Aquí solo venimos a pasar un ratito juntos.';
        gardenMeow();
      } else {
        message.textContent='Este jardín es para descansar. Acércate a Tobias o Harfusha para saludarlos.';
      }
      return;
    }
    const place=nearby();
    if(!place){message.textContent='Acércate a un mueble hasta que aparezca un signo de interrogación.';return;}
    place.checked=true;
    const cat=cats[hiding.indexOf(place)];
    if(!cat){
      if (place.treasure) {
        const item = document.createElement('li');
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges">'+itemArt[place.treasure]+'</svg>';
        item.append(icon, document.createTextNode(place.treasure));
        treasures.append(item);
        treasureCount.textContent = treasures.children.length + ' de ' + souvenirs.length + ' encontrados';
        message.textContent = '¡Encontraste un tesoro! ' + place.treasure + '.';
        showDiscovery(place.treasure);
        discoverySound();
      } else {
        const smallFind = smallFinds[smallFindIndex % smallFinds.length];
        smallFindIndex++;
        message.textContent='En '+place.name+' encontraste '+smallFind.toLowerCase()+'. ¡Sigue buscando los tesoros!';
        showDiscovery(smallFind);
        discoverySound();
      }
      return;
    }
    place.cat=cat;
    companions.push(cat);
    showDiscovery(cat.name, cat);
    discoverySound(true);
    const card=document.createElement('figure');
    const photo=document.createElement('img');
    const caption=document.createElement('figcaption');
    photo.src=''+cat.photo;
    photo.alt=caption.textContent=cat.name;
    card.append(photo,caption);
    album.append(card);
    found++;
    count.textContent=found+' de 2 gatitas';
    message.textContent=found===2?'¡Encontraste a Nini y Manchas! Ahora las dos te acompañan ♡':'¡Encontraste a '+cat.name+'! Ahora te sigue. Falta su compañera.';
  }

  function reset() {
    clearTimeout(discoveryTimer);
    discovery.hidden = true;
    smallFindIndex = 0;
    const pairs=places.flatMap(first=>places.filter(second=>first!==second).map(second=>[first,second]))
      .filter(([a,b])=>!(hiding.includes(a)&&hiding.includes(b)));
    hiding=pairs[Math.floor(Math.random()*pairs.length)];
    places.forEach(p=>{p.checked=false;p.cat=null;p.treasure=null;});
    souvenirs.forEach((name,index) => {
      const room = index % rooms.length;
      const choices=places.filter(p=>p.room===room && !hiding.includes(p) && !p.treasure);
      choices[Math.floor(Math.random()*choices.length)].treasure=name;
    });
    const firstPlace = places.find(p => p.room === 0 && p.name === 'mesa de centro');
    if (!hiding.includes(firstPlace) && !firstPlace.treasure) {
      const donor = places.find(p => p.room === 0 && p.treasure);
      firstPlace.treasure = donor.treasure;
      donor.treasure = null;
    }
    treasures.replaceChildren();
    treasureCount.textContent='0 de '+souvenirs.length+' encontrados';
    player.x=78;player.y=165;player.facing=1;
    companions.length=0;
    trail.length=0;
    trail.push({x:player.x,y:player.y});
    gardenPose=-1;
    pressed.clear();found=0;album.replaceChildren();
    count.textContent='0 de 2 gatitas';
    message.textContent='Revisa los muebles. Las puertas conectan las habitaciones.';
  }

  function move(dx,dy) {
    if(!running || last<introUntil) return;
    const x=player.x+dx,y=player.y+dy;
    if(x < -312 || x >= 956 || y < 4 || y >= 444) return;
    // The only garden connection is the living room's left doorway.
    if (x < 0) {
      if (y < 29 || y > 208) return;
      const gardenX=x+320;
      if (gardenObstacles.some(p => gardenX+6>p.x && gardenX-6<p.x+p.w && y>p.y && y-5<p.y+p.h)) return;
    }
    if (x > -12 && x < 12 && (y < 118 || y > 154)) return;
    if (x >= 0) {
      const localX=x%320, localY=y%224;
      if ((localX<12||localX>308) && (localY<118||localY>154)) return;
      if ((localY<13||localY>212) && (localX<146||localX>174)) return;
      if(places.some(p=>x+5>p.x&&x-5<p.x+p.w&&y>p.y&&y-5<p.y+p.h)) return;
    }
    player.x=x;player.y=y;
    if(dx) player.facing=Math.sign(dx);
    steps+=Math.hypot(dx,dy);
    trail.unshift({x,y});
    if (trail.length > 500) trail.pop();
  }

  function frame(time) {
    const elapsed=Math.min(time-last,35);
    last=time;
    const direction=[...pressed.values()].at(-1);
    if(direction) {
      const [dx,dy]=directions[direction];
      move(dx*elapsed*.075,dy*elapsed*.075);
    }
    if(introUntil && time>=introUntil){
      introUntil=0;
      message.textContent='¡Se escondieron! Busca dentro de casa. Por la puerta izquierda de la sala puedes visitar el jardín.';
    }
    if(running && !introUntil && time-lastMeow>5600){
      lastMeow=time;
      const hidden=hiding.filter(p=>!p.checked);
      if(hidden.length){
        const near=hidden.some(p=>p.room===roomAt(player.x,player.y));
        if(near) message.textContent='Parece que hay una gatita cerca…';
      }
    }
    scheduleMusic();
    draw(time);
    requestAnimationFrame(frame);
  }
  document.querySelector('.game').addEventListener('keydown',e=>{
    const direction=keys[e.key]||keys[e.key.toLowerCase()];
    if(direction){e.preventDefault();pressed.set(e.code,direction);}
    if(e.target===canvas&&(e.code==='Space'||e.key==='Enter')){e.preventDefault();if(!e.repeat)search();}
  });
  document.querySelector('.game').addEventListener('pointerdown', () => {
    if (soundOn && audio && audio.state !== 'running') unlockAudio().catch(() => {});
  });
  window.addEventListener('keyup',e=>pressed.delete(e.code));
  window.addEventListener('blur',()=>pressed.clear());
  const touchControls = document.querySelector('.game-pad');
  touchControls.addEventListener('contextmenu', e => e.preventDefault());
  touchControls.addEventListener('selectstart', e => e.preventDefault());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pressed.clear();
  });
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      pressed.set(e.pointerId,button.dataset.move);
      move(...directions[button.dataset.move].map(v=>v*4));
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,e=>pressed.delete(e.pointerId));
    button.addEventListener('click',e=>{if(e.detail===0)move(...directions[button.dataset.move].map(v=>v*8));});
  });
  document.querySelector('#game-search').addEventListener('click',search);
  function startRound() {
    reset();
    running=true;
    introUntil=reduced.matches ? 0 : last+2200;
    lastMeow=last;
    roomIndex=-2;
    if(introUntil) message.textContent='¡Ahí van Nini y Manchas!';
    canvas.focus({preventScroll:true});
  }
  document.querySelector('#game-reset').addEventListener('click',startRound);
  requestAnimationFrame(time => {
    last = time;
    startRound();
    frame(time);
  });
})();






