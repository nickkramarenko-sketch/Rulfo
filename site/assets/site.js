(function(){
  var hd=document.querySelector('header');
  window.addEventListener('scroll',function(){hd.classList.toggle('sc',scrollY>8)},{passive:true});
  var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if('IntersectionObserver' in window&&!rm){
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px'});
    [].forEach.call(document.querySelectorAll('.rv'),function(el){io.observe(el)});
  } else {[].forEach.call(document.querySelectorAll('.rv'),function(el){el.classList.add('in')})}
  // ?loc= and ?svc= pre-fill the quote forms
  var q=new URLSearchParams(location.search),lv=q.get('loc'),sv=q.get('svc');
  [].forEach.call(document.querySelectorAll('form select'),function(s){
    var v=s.name==='Location'?lv:s.name==='Service'?sv:null;
    if(v&&[].some.call(s.options,function(o){return o.text===v})){s.value=v}
  });
  // On the live site Netlify receives the form. Anywhere else (a preview), open an email instead.
  var live=/(^|\.)24hrcrossdock\.com$|netlify\.app$/.test(location.hostname);
  [].forEach.call(document.querySelectorAll('form[data-netlify]'),function(fm){
    if(live)return;
    fm.addEventListener('submit',function(e){
      e.preventDefault();if(!fm.reportValidity())return;
      var f=new FormData(fm),b='';f.forEach(function(v,k){if(v&&k!=='form-name'&&k!=='bot-field')b+=k+': '+v+'\n'});
      location.href='mailto:24hrcrossdock@gmail.com?subject='+encodeURIComponent('Quote request: '+(f.get('Company')||''))+'&body='+encodeURIComponent(b);
    });
  });
})();
