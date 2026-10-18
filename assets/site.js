(function(){
  /* browsers restore the previous scroll position on refresh — start at the top */
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  addEventListener('load',function(){
    if(!location.hash) scrollTo(0,0);      /* a #link still wins */
  });
})();

(function(){
  var $=function(s,c){return (c||document).querySelector(s)},
      $$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};

  /* sticky header state + scrollspy */
  var hdr=$('header'),
      secs=$$('section[id], div[id="top"]'),
      navlinks=$$('.nav a[href^="#"]');
  function onScroll(){
    var y=window.scrollY;
    hdr.classList.toggle('stuck', y>20);
    var cur='';
    secs.forEach(function(s){ if(s.getBoundingClientRect().top<=140) cur=s.id; });
    navlinks.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href')==='#'+cur); });
  }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  /* mobile sheet */
  var burger=$('#burger'), sheet=$('#sheet');
  function setSheet(open){
    burger.classList.toggle('on',open);
    burger.setAttribute('aria-expanded',open);
    if(open){ sheet.hidden=false; requestAnimationFrame(function(){sheet.classList.add('open')}); }
    else { sheet.classList.remove('open'); setTimeout(function(){sheet.hidden=true},320); }
    document.body.style.overflow=open?'hidden':'';
  }
  burger.addEventListener('click',function(){ setSheet(sheet.hidden); });
  sheet.addEventListener('click',function(e){ if(e.target===sheet||e.target.tagName==='A') setSheet(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!sheet.hidden) setSheet(false); });

  /* service filter */
  var cards=$$('.card');
  $$('.fbtn').forEach(function(b){
    b.addEventListener('click',function(){
      $$('.fbtn').forEach(function(x){x.classList.remove('on')}); b.classList.add('on');
      var f=b.dataset.f;
      cards.forEach(function(c){
        var show = f==='all' || c.dataset.cat===f;
        c.classList.toggle('hide',!show);
        if(show){ c.classList.remove('fadein'); void c.offsetWidth; c.classList.add('fadein'); }
      });
    });
  });

  /* fleet carousel */
  var track=$('#fleetTrack');
  if(track){
    var fdots=$('#fleetDots'), fprev=$('#fleetPrev'), fnext=$('#fleetNext');
    function fcards(){ return $$('article',track); }
    function idx(){
      var l=track.scrollLeft, best=0, bd=1e9;
      fcards().forEach(function(a,i){ var d=Math.abs(a.offsetLeft-track.offsetLeft-l);
        if(d<bd){bd=d;best=i;} });
      return best;
    }
    function atEnd(){ return track.scrollLeft >= track.scrollWidth-track.clientWidth-2; }
    function goTo(i,instant){
      var a=fcards()[i]; if(!a) return;
      track.scrollTo({left:a.offsetLeft-track.offsetLeft,behavior:instant?'auto':'smooth'});
    }
    function sync(){
      var i=idx();
      $$('i',fdots).forEach(function(d,n){ d.classList.toggle('on',n===i); });
      fprev.disabled = track.scrollLeft<=2;
      fnext.classList.toggle('wrap', atEnd());
      fnext.setAttribute('aria-label', atEnd()?'Back to the first aircraft':'Next aircraft');
    }
    function build(){
      fdots.innerHTML='';
      fcards().forEach(function(a,i){
        var d=document.createElement('i');
        d.addEventListener('click',function(){ goTo(i); });
        fdots.appendChild(d);
      });
      sync();
    }
    fprev.addEventListener('click',function(){ if(!fprev.disabled) goTo(Math.max(0,idx()-1)); });
    fnext.addEventListener('click',function(){
      if(atEnd()) goTo(0);                 /* last card -> back to the first */
      else goTo(Math.min(fcards().length-1, idx()+1));
    });
    track.addEventListener('scroll',function(){ clearTimeout(track._t); track._t=setTimeout(sync,80); },{passive:true});
    window.addEventListener('resize',build); build();
    addEventListener('load',sync);
  }

  /* aircraft enquiry buttons — carry the type into the contact form */
  (function(){
    var box=document.getElementById('ms'), sel=document.getElementById('sv');
    function fill(name){
      if(!box) return false;
      box.value='Please send more information on the '+name+'.';
      if(sel) for(var i=0;i<sel.options.length;i++)
        if(/buying|selling/i.test(sel.options[i].text)){ sel.selectedIndex=i; break; }
      var form=box.closest('.form')||box;
      form.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(function(){ box.focus(); },500);
      return true;
    }
    function pick(svcText){
      if(!sel||!svcText) return;
      for(var i=0;i<sel.options.length;i++)
        if(sel.options[i].text.toLowerCase().indexOf(svcText.toLowerCase())>-1){ sel.selectedIndex=i; return; }
    }
    function seed(msg,svc){
      if(!box) return false;
      if(msg) box.value=msg;
      pick(svc);
      (box.closest('.form')||box).scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(function(){ box.focus(); },500);
      return true;
    }
    $$('.req').forEach(function(a){
      a.addEventListener('click',function(e){
        var n=a.dataset.aircraft;
        if(n && fill(n)) e.preventDefault();   /* same page: fill in place */
      });
    });
    var p=new URLSearchParams(location.search);
    var q=p.get('aircraft');
    if(q) fill(q);
    if(p.get('service')||p.get('msg')) seed(p.get('msg'),p.get('service'));
  })();


  /* cards rise into place as they enter; the one behind eases back slightly */
  (function(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var stack=[].slice.call(document.querySelectorAll('.sec, .dual'));
    if(!stack.length) return;
    stack.forEach(function(s){ s.classList.add('stk'); });
    function clamp(v){ return v<0?0:v>1?1:v; }
    var ticking=false;
    function frame(){
      ticking=false;
      var vh=innerHeight;
      stack.forEach(function(el){
        var top=el.getBoundingClientRect().top;
        var enter=clamp((vh-top)/(vh*0.4));
        el.style.transform = enter<1
          ? 'translate3d(0,'+((1-enter)*46).toFixed(1)+'px,0) scale('+(0.975+0.025*enter).toFixed(4)+')'
          : '';
      });
    }
    function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(frame); } }
    addEventListener('scroll',onScroll,{passive:true});
    addEventListener('resize',onScroll);
    addEventListener('load',frame);
    frame();
  })();

  /* photo gallery */
  var gal=$('#galTrack');
  if(gal){
    var gd=$('#galDots'), gp=$('#galPrev'), gn=$('#galNext');
    function figs(){ return $$('figure',gal); }
    function gi(){ return Math.round(gal.scrollLeft/gal.clientWidth); }
    function glast(){ return figs().length-1; }
    function gto(i){ gal.scrollTo({left:i*gal.clientWidth,behavior:'smooth'}); }
    function gsync(){
      var i=gi();
      $$('i',gd).forEach(function(d,n){ d.classList.toggle('on',n===i); });
      gp.disabled = i<=0;
      gn.classList.toggle('wrap', i>=glast());
      gn.setAttribute('aria-label', i>=glast()?'Back to the first photo':'Next photo');
    }
    figs().forEach(function(f,i){
      var d=document.createElement('i');
      d.addEventListener('click',function(){ gto(i); });
      gd.appendChild(d);
    });
    gp.addEventListener('click',function(){ if(!gp.disabled) gto(Math.max(0,gi()-1)); });
    gn.addEventListener('click',function(){ gto(gi()>=glast()?0:gi()+1); });
    gal.addEventListener('scroll',function(){ clearTimeout(gal._t); gal._t=setTimeout(gsync,80); },{passive:true});
    window.addEventListener('resize',gsync);
    gsync();
  }

  /* pre-buy stepper */
  $$('.spill').forEach(function(b){
    b.addEventListener('click',function(){
      $$('.spill').forEach(function(x){x.classList.remove('on')});
      $$('.spanel').forEach(function(x){x.classList.remove('on')});
      b.classList.add('on');
      var t=$('.spanel[data-s="'+b.dataset.s+'"]'); if(t) t.classList.add('on');
    });
  });

  /* reveal on scroll + stat count-up */
  var rv=$$('.sec .wrap > *, .tile, .person');
  rv.forEach(function(el){ el.classList.add('rv'); });
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.12,rootMargin:'0px 0px -40px'});
  rv.forEach(function(el){ io.observe(el); });




  /* services coverflow */
  var st=$('#svcTrack');
  if(st){
    var sdots=$('#svcDots');
    function visible(){ return $$('.card',st).filter(function(c){return !c.classList.contains('hide')}); }
    function mark(){
      var mid=st.getBoundingClientRect().left+st.clientWidth/2, best=null, bd=1e9;
      visible().forEach(function(c){
        var r=c.getBoundingClientRect(), d=Math.abs(r.left+r.width/2-mid);
        if(d<bd){bd=d;best=c;}
      });
      $$('.card',st).forEach(function(c){ c.classList.toggle('is-active',c===best); });
      var vs=visible(), i=vs.indexOf(best);
      $$('i',sdots).forEach(function(d,n){ d.classList.toggle('on',n===i); });
      arrows();
    }
    function centre(c,instant){
      st.scrollTo({left:c.offsetLeft-(st.clientWidth-c.offsetWidth)/2,
                   behavior:instant?'auto':'smooth'});
    }
    function rest(instant){
      var vs=visible(); if(!vs.length) return;
      centre(vs.length>2?vs[1]:vs[0],instant);
      setTimeout(mark,instant?0:220);
    }
    function buildDots(){
      sdots.innerHTML='';
      visible().forEach(function(c){
        var d=document.createElement('i');
        d.addEventListener('click',function(){ centre(c); });
        sdots.appendChild(d);
      });
      mark();
    }
    st.addEventListener('scroll',function(){ clearTimeout(st._t); st._t=setTimeout(mark,60); },{passive:true});
    $$('.card',st).forEach(function(c){
      c.addEventListener('click',function(e){ if(e.target.closest('a')) return; centre(c); });
    });
    var sprev=$('#svcPrev'), snext=$('#svcNext');
    function arrows(){
      var vs=visible(), cur=vs.findIndex(function(c){return c.classList.contains('is-active')});
      sprev.disabled = cur<=0;
      var last = cur>=vs.length-1;
      snext.classList.toggle('wrap', last);
      snext.setAttribute('aria-label', last?'Back to the first service':'Next service');
    }
    function move(dir){
      var vs=visible(), cur=vs.findIndex(function(c){return c.classList.contains('is-active')});
      if(dir>0 && cur>=vs.length-1){ centre(vs[0]); return; }   /* last -> first */
      var nx=vs[Math.min(vs.length-1,Math.max(0,cur+dir))];
      if(nx) centre(nx);
    }
    sprev.addEventListener('click',function(){ if(!sprev.disabled) move(-1); });
    snext.addEventListener('click',function(){ move(1); });
    var count=document.createElement('p');
    count.className='fcount';
    var fbar=document.querySelector('.filters');
    if(fbar) fbar.parentNode.insertBefore(count,fbar.nextSibling);
    function tell(b){
      var n=visible().length, label=b?b.textContent.trim():'All services';
      count.textContent = (b && b.dataset.f!=='all')
        ? 'Showing '+n+' '+label.toLowerCase()+' service'+(n===1?'':'s')
        : 'Showing all '+n+' service lines';
    }
    $$('.fbtn').forEach(function(b){
      b.addEventListener('click',function(){
        setTimeout(function(){
          buildDots();
          var vs=visible();
          if(vs.length) centre(b.dataset.f==='all' && vs.length>2 ? vs[1] : vs[0]);
          setTimeout(mark,220);
          tell(b);
        },30);
      });
    });
    tell(null);
    window.addEventListener('resize',function(){ mark(); arrows(); });
    buildDots();
    /* A #hash must win over the default centring, otherwise arriving from the
       menu at services.html#catering lands on whatever card rest() picks. */
    function svcHashCard(){
      var id=(location.hash||'').slice(1);
      if(!id) return null;
      var c=document.getElementById(id);
      return (c && c.classList.contains('card') && st.contains(c)) ? c : null;
    }
    /* land at the top of the Services section, clear of the sticky header,
       rather than part-way down at the card itself */
    function svcTop(instant){
      var sec=st.closest('section'); if(!sec) return;
      var hdr=document.querySelector('header');
      var off=(hdr?hdr.getBoundingClientRect().height:0)+14;
      var y=sec.getBoundingClientRect().top+(window.pageYOffset||0)-off;
      window.scrollTo({top:y<0?0:y,behavior:instant?'auto':'smooth'});
    }
    function svcOpen(instant){
      var c=svcHashCard();
      if(!c){ rest(instant); setTimeout(mark,60); return; }
      if(c.classList.contains('hide')){          /* target filtered out — show all */
        var allBtn=document.querySelector('.fbtn[data-f="all"]');
        if(allBtn) allBtn.click();
      }
      setTimeout(function(){
        centre(c,instant);
        svcTop(instant);
        setTimeout(mark,instant?0:240);
      },40);
    }
    /* open on a centred, enlarged card rather than a flat row */
    requestAnimationFrame(function(){ svcOpen(true); });
    window.addEventListener('load',function(){ svcOpen(true); });
    window.addEventListener('hashchange',function(){ svcOpen(false); });
  }

  /* station map interaction */
  var out=$('#mapout');
  $$('.netmap .stn').forEach(function(g){
    function showStation(){
      $$('.netmap .stn').forEach(function(x){x.classList.remove('on')});
      g.classList.add('on');
      out.innerHTML='<b>'+g.dataset.n+'</b><span>'+Number(g.dataset.d).toLocaleString('en-US')+
        ' km from the office · '+g.querySelector('.code').textContent+
        ({eu:' · Europe',cis:' · CIS',me:' · Middle East'}[g.dataset.r]||'')+'</span>';
    }
    g.addEventListener('pointerenter',showStation); g.addEventListener('focus',showStation);
    g.addEventListener('click',showStation);
  });
  /* gantt bars grow when the panel scrolls in */
  var g=$('.gantt');
  if(g){ new IntersectionObserver(function(e,o){
    if(e[0].isIntersecting){ g.classList.add('go'); o.disconnect(); }
  },{threshold:.25}).observe(g); }

  /* ---------- 2026 layer ---------- */
  /* scroll progress */
  var prog=$('#progress');
  function tick(){
    var d=document.documentElement, m=d.scrollHeight-innerHeight;
    prog.style.width=(m>0?(scrollY/m)*100:0)+'%';
  }
  addEventListener('scroll',tick,{passive:true}); addEventListener('resize',tick); tick();

  /* kinetic hero headline */
  var h1=$('.hero h1');
  if(h1){
    var words=h1.textContent.trim().split(/\s+/);
    h1.innerHTML=words.map(function(w,i){
      var g=(i>=3)?' grad':'';
      return '<span class="w'+g+'" style="--i:'+i+'">'+w+'</span>';
    }).join(' ');
  }

  /* cursor spotlight on tiles and cards */
  function spot(e){
    var r=this.getBoundingClientRect();
    this.style.setProperty('--mx',(e.clientX-r.left)+'px');
    this.style.setProperty('--my',(e.clientY-r.top)+'px');
  }
  if(matchMedia('(hover:hover)').matches){ $$('.tile, .card').forEach(function(el){ el.addEventListener('pointermove',spot); }); }

  /* parallax on hero artwork + blobs */
  var plane=$('.hero .plane'), blobs=$$('.blob');
  /* parallax writes an inline transform; on a tablet the CSS positions the aircraft
     itself, so the leftover inline value survived rotation until a refresh */
  function parallaxOn(){
    return innerWidth>=900 && matchMedia('(pointer:fine)').matches;
  }
  function clearParallax(){
    if(plane) plane.style.transform='';
    blobs.forEach(function(b){ b.style.translate=''; });
  }
  addEventListener('scroll',function(){
    if(!parallaxOn()) return;
    var y=scrollY;
    if(plane) plane.style.transform='translateY('+(y*0.09)+'px)';
    blobs.forEach(function(b,i){ b.style.translate='0 '+(y*(i?0.05:-0.04))+'px'; });
  },{passive:true});
  function onOrient(){
    clearParallax();                        /* drop stale values first */
    setTimeout(function(){                  /* let the new viewport settle */
      if(!parallaxOn()) clearParallax();
    },120);
  }
  addEventListener('resize',onOrient);
  addEventListener('orientationchange',onOrient);
  if(!parallaxOn()) clearParallax();

  var nums=$$('.stats b, .anums b, .tbig');
  var io2=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      io2.unobserve(e.target);
      var el=e.target, txt=el.textContent, m=txt.match(/[\d,]+/);
      if(!m) return;
      var end=parseInt(m[0].replace(/,/g,''),10), pre=txt.slice(0,m.index), post=txt.slice(m.index+m[0].length);
      var grouped=m[0].indexOf(',')>-1;   /* 2004 is a year, not a quantity — never group it */
      var t0=null, dur=1100;
      function tick(ts){
        if(!t0) t0=ts;
        var k=Math.min(1,(ts-t0)/dur), v=Math.round(end*(1-Math.pow(1-k,3)));
        el.textContent=pre+(grouped?v.toLocaleString('en-US'):String(v))+post;
        if(k<1) requestAnimationFrame(tick);
      }
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick);
    });
  },{threshold:.5});
  nums.forEach(function(n){ io2.observe(n); });
})();
/* safety net: keeps the page usable if the main bundle throws */
(function(){
  function go(){
    try{
      document.querySelectorAll('.rv:not(.in)').forEach(function(el){
        if(el.getBoundingClientRect().top < innerHeight*1.1) el.classList.add('in');
      });
      var g=document.querySelector('.gantt');
      if(g && g.getBoundingClientRect().top < innerHeight) g.classList.add('go');
    }catch(e){}
  }
  addEventListener('scroll',go,{passive:true}); addEventListener('resize',go); go();
  setTimeout(function(){
    if(!document.querySelector('.rv.in'))
      document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')});
    var t=document.getElementById('svcTrack');
    if(t && !t.querySelector('.card.is-active')){
      var vs=[].slice.call(t.querySelectorAll('.card:not(.hide)'));
      /* honour a #hash here too, so the fallback cannot land on the wrong card */
      var hid=(location.hash||'').slice(1);
      var hc=hid?document.getElementById(hid):null;
      var c=(hc && vs.indexOf(hc)>-1) ? hc : (vs[1]||vs[0]);
      if(c){ c.classList.add('is-active'); t.scrollLeft=c.offsetLeft-(t.clientWidth-c.offsetWidth)/2; }
    }
  },1500);
})();
