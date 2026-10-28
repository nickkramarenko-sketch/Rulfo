(function(){
  window.siteJS=1;   // the head script shows .rv content anyway if this file never runs
  var hd=document.querySelector('header');
  var nav=document.getElementById('nav'),last=0;
  function toph(){hd.style.setProperty('--toph',(nav?nav.offsetTop:0)+'px')}
  toph();window.addEventListener('resize',toph);
  window.addEventListener('scroll',function(){
    var y=scrollY;hd.classList.toggle('sc',y>8);
    // scrolling down past the top: hide the logo row (phones/tablets only, see CSS); scrolling up: show it again
    if(y>140&&y>last+4)hd.classList.add('compact');else if(y<last-4||y<140)hd.classList.remove('compact');
    last=y;
  },{passive:true});
  var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if('IntersectionObserver' in window&&!rm){
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px'});
    [].forEach.call(document.querySelectorAll('.rv'),function(el){io.observe(el)});
  } else {[].forEach.call(document.querySelectorAll('.rv'),function(el){el.classList.add('in')})}
  // Hero video: only after the page has loaded, with motion allowed, on screens 700px and wider, and without Data Saver.
  // Everyone else keeps the poster still. Paused while the tab is hidden or the hero is scrolled away.
  var vids=document.querySelectorAll('video.hv[data-src]');
  if(vids.length){
    var cn=navigator.connection||{};
    var ok=function(){return !rm&&window.innerWidth>=700&&!cn.saveData};
    window.addEventListener('load',function(){
      if(!ok())return;
      [].forEach.call(vids,function(v){
        v.src=v.getAttribute('data-src');v.muted=true;
        var p=v.play();if(p&&p.catch)p.catch(function(){});
        if('IntersectionObserver' in window)new IntersectionObserver(function(es){es.forEach(function(en){
          if(document.hidden)return;if(en.isIntersecting){var q=v.play();if(q&&q.catch)q.catch(function(){})}else v.pause();
        })}).observe(v);
      });
      document.addEventListener('visibilitychange',function(){
        [].forEach.call(vids,function(v){if(!v.src)return;if(document.hidden)v.pause();else{var q=v.play();if(q&&q.catch)q.catch(function(){})}});
      });
    });
  }
  // ?loc= and ?svc= pre-fill the quote forms. Old values from links outside the site map to today's option names.
  var AL=/*ALIAS*/{};
  var q=new URLSearchParams(location.search),lv=q.get('loc'),sv=q.get('svc');
  [].forEach.call(document.querySelectorAll('form select'),function(s){
    var v=s.name==='Location'?lv:s.name==='Service'?sv:null;if(!v)return;
    var map=s.name==='Location'?AL.loc:AL.svc;v=(map&&map[v.trim().toLowerCase()])||v;
    [].some.call(s.options,function(o){if(o.text.toLowerCase()===v.toLowerCase()){s.value=o.value||o.text;return true}});
  });
  // Visit tracking (only when GA_ID is filled in build.py, which defines gtag): calls, texts, portal clicks and quote requests
  var ga=typeof window.gtag==='function'?window.gtag:null;
  if(ga){
    document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a)return;
      var h=a.getAttribute('href')||'';
      if(h.indexOf('tel:')===0)ga('event','call_click',{link_url:h});
      else if(h.indexOf('sms:')===0)ga('event','text_click',{link_url:h});
      else if(h.indexOf('https://claude.ai/')===0)ga('event','portal_click',{link_url:h});
    });
  }
  // On the live site Netlify receives the form. Anywhere else (a preview), open an email instead, and say so.
  var live=/(^|\.)24hrcrossdock\.com$|netlify\.app$/.test(location.hostname);
  [].forEach.call(document.querySelectorAll('form[data-netlify]'),function(fm){
    if(ga)fm.addEventListener('submit',function(){ga('event','generate_lead',{form_name:fm.getAttribute('name')||''})});
    if(live)return;
    var btn=fm.querySelector('button[type=submit]');
    if(btn){var n=document.createElement('p');n.className='fnote pv';n.textContent='Preview copy of the site: sending opens your email app instead.';btn.parentNode.insertBefore(n,btn.nextSibling)}
    fm.addEventListener('submit',function(e){
      e.preventDefault();if(!fm.reportValidity())return;
      var f=new FormData(fm),b='';f.forEach(function(v,k){if(v&&k!=='form-name'&&k!=='bot-field')b+=k+': '+v+'\n'});
      location.href='mailto:{EMAIL}?subject='+encodeURIComponent('Quote request: '+(f.get('Company')||f.get('Name')||''))+'&body='+encodeURIComponent(b);
    });
  });
  // Driver page: show one language at a time (from the link #es, the last choice, or the phone's language)
  var secs=document.querySelectorAll('.dl[data-l]'),picks=document.querySelectorAll('.langpick a[data-l]');
  if(secs.length&&picks.length){
    var has=function(l){return [].some.call(secs,function(s){return s.getAttribute('data-l')===l})};
    var show=function(l){
      [].forEach.call(secs,function(s){s.hidden=s.getAttribute('data-l')!==l});
      [].forEach.call(picks,function(a){a.setAttribute('aria-current',a.getAttribute('data-l')===l?'true':'false')});
    };
    var hash=(location.hash||'').slice(1).toLowerCase(),saved=null;
    try{saved=localStorage.getItem('drvLang')}catch(e){}
    var phone=(navigator.language||'').slice(0,2).toLowerCase();
    var first=has(hash)?hash:has(saved)?saved:has(phone)?phone:'en';
    show(first);
    if(has(hash)){var el=document.getElementById(hash);if(el&&el.scrollIntoView)el.scrollIntoView()}
    [].forEach.call(picks,function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();var l=a.getAttribute('data-l');show(l);
        try{localStorage.setItem('drvLang',l)}catch(err){}
        try{history.replaceState(null,'','#'+l)}catch(err){}
      });
    });
    window.addEventListener('hashchange',function(){var l=(location.hash||'').slice(1).toLowerCase();if(has(l))show(l)});
  }
})();
