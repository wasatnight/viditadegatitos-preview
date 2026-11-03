const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled=!motionPreference.matches;
const motionButton=document.querySelector('#motion-toggle');
let queuedScroll=false;
function updateScroll(){const y=window.scrollY;const max=document.documentElement.scrollHeight-innerHeight;document.querySelector('.reading-line span').style.transform=`scaleX(${max>0?Math.min(1,y/max):0})`;document.querySelector('.header').classList.toggle('scrolled',y>140);document.querySelector('.natural-hero').style.setProperty('--hero-shift',motionEnabled&&innerWidth>760?Math.min(70,y*.12)+'px':'0px');queuedScroll=false;}
window.addEventListener('scroll',()=>{if(!queuedScroll){queuedScroll=true;requestAnimationFrame(updateScroll);}},{passive:true});
function syncMotion(){document.body.classList.toggle('motion-paused',!motionEnabled);motionButton.setAttribute('aria-pressed',String(motionEnabled));motionButton.textContent=motionEnabled?'Pausar movimiento':'Activar movimiento';updateScroll();}
motionButton.addEventListener('click',()=>{motionEnabled=!motionEnabled;syncMotion();});motionPreference.addEventListener('change',e=>{motionEnabled=!e.matches;syncMotion();});
if('IntersectionObserver' in window){const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}});},{threshold:.08,rootMargin:'0px 0px -30px 0px'});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.setProperty('--delay',`${el.closest('.door-grid')?(i%3)*90:0}ms`);revealObserver.observe(el);});document.body.classList.add('motion-ready');}
syncMotion();
const heroChoices={manchas:{src:'foto-05.jpg',alt:'Manchas, la gatita tricolor, con un ratoncito rosa sobre la cabeza',label:'01 / MANCHAS · EXPERTA EN MIRADAS'},nini:{src:'foto-16.jpg',alt:'Nini, la gatita carey, mirando a la cámara desde casa',label:'02 / NINI · TODOS LOS TONOS DEL CAFÉ'}};
let heroChange=0;
document.querySelectorAll('[data-pending-cat]').forEach(button=>button.addEventListener('click',()=>toast(`La foto de ${button.dataset.pendingCat} llegará pronto ♡`)));
document.querySelectorAll('[data-hero-cat]').forEach(button=>button.addEventListener('click',()=>{if(button.classList.contains('selected'))return;const data=heroChoices[button.dataset.heroCat];const img=document.querySelector('#hero-photo');const change=++heroChange;document.querySelectorAll('[data-hero-cat]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});img.classList.add('switching');const preload=new Image();preload.onload=()=>{if(change!==heroChange)return;const finish=()=>{img.src=data.src;img.alt=data.alt;img.classList.remove('switching');};if(motionEnabled)setTimeout(finish,190);else finish();};preload.onerror=()=>{if(change===heroChange){img.classList.remove('switching');toast('No pudimos abrir esta foto. Inténtalo de nuevo.');}};preload.src=data.src;}));
function makePolaroid(s,index){const b=document.createElement('button');b.className='polaroid';b.dataset.photo=''+s.photo;b.dataset.caption=s.cat+' · '+s.title;b.setAttribute('aria-label','Ampliar fotografía '+(index+1)+': '+s.cat);b.style.setProperty('--r',`${[-4,3,-2,5,-3][index%5]}deg`);const img=document.createElement('img');img.src=''+s.photo;img.alt=s.alt;img.loading='lazy';img.width=220;img.height=260;const caption=document.createElement('span');caption.className='polaroid-caption';caption.textContent=s.cat+' ♡';b.append(img,caption);return b;}
const film=document.querySelector('#film-strip');[19,15,3,4,7,16,17,1,8,13].forEach(i=>film.append(makePolaroid(slides[i],i)));
document.querySelector('#film-prev').addEventListener('click',()=>film.scrollBy({left:-520,behavior:motionEnabled?'smooth':'instant'}));document.querySelector('#film-next').addEventListener('click',()=>film.scrollBy({left:520,behavior:motionEnabled?'smooth':'instant'}));
document.querySelector('#show-wall').addEventListener('click',event=>{const wall=document.querySelector('#photo-wall');const opening=wall.hidden;if(opening&&!wall.childElementCount)slides.forEach((s,i)=>wall.append(makePolaroid(s,i)));wall.hidden=!opening;event.currentTarget.setAttribute('aria-expanded',String(opening));event.currentTarget.textContent=opening?'Cerrar todas las polaroids':'Ver todas las polaroids';});
// Newly created photo buttons use the same lightbox as the static photographs.
document.addEventListener('click',event=>{const b=event.target.closest('#film-strip [data-photo],#photo-wall [data-photo]');if(!b)return;document.querySelector('#lightbox-image').src=b.dataset.photo;document.querySelector('#lightbox-image').alt=b.querySelector('img').alt;document.querySelector('#lightbox-caption').textContent=b.dataset.caption;openDialog(document.querySelector('#lightbox'));});

const protagonistsPhotos = document.querySelector('.meet-photos');
const pawTrail = protagonistsPhotos?.querySelector('.meet-paw-trail');
if (pawTrail && 'IntersectionObserver' in window) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reducedMotion.matches && !document.body.classList.contains('motion-paused');
  const entrance = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    entrance.disconnect();
    if (!motionAllowed()) return;

    try {
      const {playFootprints} = await import('./motion-protagonistas.js');
      if (!motionAllowed()) return;
      protagonistsPhotos.classList.add('is-arriving');
      const stop = playFootprints(pawTrail);
      const stopIfPaused = () => { if (!motionAllowed()) finish(); };
      const finish = () => {
        clearTimeout(timer);
        protagonistsPhotos.classList.remove('is-arriving');
        stop();
        reducedMotion.removeEventListener('change', stopIfPaused);
        motionButton.removeEventListener('click', stopIfPaused);
      };
      const timer = setTimeout(finish, 6300);
      reducedMotion.addEventListener('change', stopIfPaused);
      motionButton.addEventListener('click', stopIfPaused);
    } catch (error) {
      console.warn('No se pudo iniciar la animación de las protagonistas.', error);
    }
  }, {threshold: .35});
  entrance.observe(protagonistsPhotos);
}
