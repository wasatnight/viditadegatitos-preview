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
  const startButton = document.querySelector('#game-start');
  const treasures = document.querySelector('#game-treasures');
  const treasureCount = document.querySelector('#treasure-count');
  const souvenirs = ['Lazo rosa','Cucharita de madera','Estrella de papel','Calcetín mini','Botón de corazón','Ratón de tela'];
  let running = false;
  let introUntil = 0;
  let roomIndex = -1;
  let audio;
  let soundOn = false;
  let lastMeow = 0;
  let lastStep = 0;
  const roomAt = (x,y) => Math.floor(y/224)*3 + Math.floor(x/320);
  function tone(meow, volume) {
    if (!soundOn || audio?.state !== 'running') return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const length = meow ? .48 : .07;
    oscillator.type = meow ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(meow ? 510 : 105, now);
    oscillator.frequency.exponentialRampToValueAtTime(meow ? 780 : 62, now + length*.33);
    oscillator.frequency.exponentialRampToValueAtTime(meow ? 355 : 48, now + length);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now+.035);
    gain.gain.exponentialRampToValueAtTime(.001, now+length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now+length);
  }
  soundButton.addEventListener('click', async () => {
    try {
      audio ??= new AudioContext();
      if (!soundOn) await audio.resume();
      soundOn = !soundOn;
      soundButton.setAttribute('aria-pressed', String(soundOn));
      soundButton.textContent = soundOn ? 'Silenciar' : 'Activar sonido';
      if (soundOn) tone(true,.055);
    } catch { message.textContent = 'El sonido no está disponible en este navegador.'; }
  });
  const cats = [
    {name:'Nini',photo:'nini-rascador.png', fur:'#51403b', patch:'#b6784e'},
    {name:'Manchas',photo:'manchas-recostada.png', fur:'#fff0dc', patch:'#d18b51'},
  ];
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

  function draw(time) {
    const index = roomAt(player.x,player.y);
    const ox = (index%3)*320, oy=Math.floor(index/3)*224;
    if(index!==roomIndex){
      roomIndex=index;
      if(running) {
        const close = hiding.some(p => p.room === index && !p.checked);
        tone(true, close ? .13 : .04);
        lastMeow=time;
      }
      roomName.textContent=rooms[index][0];
      roomMap.textContent='Habitación '+(index+1)+' de '+rooms.length;
    }
    rect(0,0,320,224,'#674d60');
    rect(8,8,304,208,'#e5bb96');
    rect(8,8,304,27,rooms[index][1]);
    const decorations = decorateRoom(index);
    if(index%3>0)rect(0,114,8,44,'#d6a886');
    if(index%3<2)rect(312,114,8,44,'#d6a886');
    if(index>=3)rect(140,0,40,8,'#d6a886');
    if(index<3)rect(140,216,40,8,'#d6a886');
    ctx.save();
    ctx.translate(-ox,-oy);
    const target=nearby();
    places.filter(p=>p.room===index).forEach(p=>{
      if (p.room !== 4 || p.name !== 'buró') furniture(p,p.kind);
      if(p.cat)kitten(p.cat,p.x+p.w/2,p.y+p.h+10);
      if(p===target) label('?',p.x+p.w/2-3,p.y+p.h+14);
    });
    ctx.restore();
    decorations.forEach(detail => rect(...detail));
    if (index === 0) decorateLivingRoom();
    if (index === 3) decorateLaundry();
    if (index === 4) decorateBedroom();
    ctx.save();
    ctx.translate(-ox,-oy);
    if (running && time < introUntil) {
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

  function search() {
    if(!running || last<introUntil) return;
    const place=nearby();
    if(!place){message.textContent='Acércate a un mueble hasta que aparezca un signo de interrogación.';return;}
    place.checked=true;
    const cat=cats[hiding.indexOf(place)];
    if(!cat){
      if (place.treasure) {
        const item = document.createElement('li');
        item.textContent = '✧ ' + place.treasure;
        treasures.append(item);
        treasureCount.textContent = treasures.children.length + ' de 6 encontrados';
        message.textContent = '¡Encontraste un tesoro! ' + place.treasure + '.';
        tone(false,.09);
      } else {
        message.textContent='En '+place.name+' solo quedó un pelito. ¡Sigue buscando!';
      }
      return;
    }
    place.cat=cat;
    tone(true,.13);
    const card=document.createElement('figure');
    const photo=document.createElement('img');
    const caption=document.createElement('figcaption');
    photo.src=''+cat.photo;
    photo.alt=caption.textContent=cat.name;
    card.append(photo,caption);
    album.append(card);
    found++;
    count.textContent=found+' de 2 gatitas';
    message.textContent=found===2?'¡Encontraste a Nini y Manchas! Tu álbum está completo ♡':'¡Encontraste a '+cat.name+'! Falta su compañera.';
  }

  function reset() {
    const pairs=places.flatMap(first=>places.filter(second=>first!==second).map(second=>[first,second]))
      .filter(([a,b])=>!(hiding.includes(a)&&hiding.includes(b)));
    hiding=pairs[Math.floor(Math.random()*pairs.length)];
    places.forEach(p=>{p.checked=false;p.cat=null;p.treasure=null;});
    souvenirs.forEach((name,room) => {
      const choices=places.filter(p=>p.room===room && !hiding.includes(p));
      choices[Math.floor(Math.random()*choices.length)].treasure=name;
    });
    treasures.replaceChildren();
    treasureCount.textContent='0 de 6 encontrados';
    player.x=78;player.y=165;player.facing=1;
    pressed.clear();found=0;album.replaceChildren();
    count.textContent='0 de 2 gatitas';
    message.textContent='Revisa los muebles. Las puertas conectan las habitaciones.';
  }

  function move(dx,dy) {
    if(!running || last<introUntil) return;
    const x=player.x+dx,y=player.y+dy;
    if(x<4||x>=956||y<4||y>=444) return;
    const localX=x%320, localY=y%224;
    if ((localX<12||localX>308) && (localY<118||localY>154)) return;
    if ((localY<13||localY>212) && (localX<146||localX>174)) return;
    if(places.some(p=>x+5>p.x&&x-5<p.x+p.w&&y>p.y&&y-5<p.y+p.h)) return;
    player.x=x;player.y=y;
    if(dx) player.facing=Math.sign(dx);
    steps+=Math.hypot(dx,dy);
    if(last-lastStep>245){lastStep=last;tone(false,.045);}
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
      message.textContent='¡Se escondieron! Revisa los muebles y guarda los tesoros que encuentres.';
    }
    if(running && !introUntil && time-lastMeow>5600){
      lastMeow=time;
      const hidden=hiding.filter(p=>!p.checked);
      if(hidden.length){
        const near=hidden.some(p=>p.room===roomAt(player.x,player.y));
        tone(true,near?.115:.025);
        if(near) message.textContent=soundOn?'Oíste un miau en esta habitación…':'Parece que hay una gatita cerca…';
      }
    }
    draw(time);
    requestAnimationFrame(frame);
  }
  document.querySelector('.game').addEventListener('keydown',e=>{
    const direction=keys[e.key]||keys[e.key.toLowerCase()];
    if(direction){e.preventDefault();pressed.set(e.code,direction);}
    if(e.target===canvas&&(e.code==='Space'||e.key==='Enter')){e.preventDefault();if(!e.repeat)search();}
  });
  window.addEventListener('keyup',e=>pressed.delete(e.code));
  window.addEventListener('blur',()=>pressed.clear());
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{
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
    roomIndex=-1;
    startButton.hidden=true;
    if(introUntil) message.textContent='¡Ahí van Nini y Manchas!';
    canvas.focus();
  }
  startButton.addEventListener('click',startRound);
  document.querySelector('#game-reset').addEventListener('click',startRound);
  reset();
  message.textContent='Pulsa Empezar partida para ver a las gatitas correr.';

  requestAnimationFrame(frame);
})();






