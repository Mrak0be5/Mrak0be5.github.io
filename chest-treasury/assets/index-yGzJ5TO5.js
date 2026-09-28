(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(e){if(e===void 0)throw ReferenceError(`this hasn't been initialised - super() hasn't been called`);return e}function t(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,e.__proto__=t}var n={autoSleep:120,force3D:`auto`,nullTargetWarn:1,units:{lineHeight:``}},r={duration:.5,overwrite:!1,delay:0},i,a,o,s=1e8,c=1/s,l=Math.PI*2,u=l/4,d=0,f=Math.sqrt,p=Math.cos,m=Math.sin,h=function(e){return typeof e==`string`},g=function(e){return typeof e==`function`},_=function(e){return typeof e==`number`},v=function(e){return e===void 0},y=function(e){return typeof e==`object`},b=function(e){return e!==!1},x=function(){return typeof window<`u`},S=function(e){return g(e)||h(e)},C=typeof ArrayBuffer==`function`&&ArrayBuffer.isView||function(){},w=Array.isArray,T=/random\([^)]+\)/g,E=/,\s*/g,D=/(?:-?\.?\d|\.)+/gi,O=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,k=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,A=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,j=/[+-]=-?[.\d]+/,M=/[^,'"\[\]\s]+/gi,N=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,P,F,ee,te,ne={},re={},ie,I=function(e){return(re=Ne(e,ne))&&$n},ae=function(e,t){return console.warn(`Invalid property`,e,`set to`,t,`Missing plugin? gsap.registerPlugin()`)},oe=function(e,t){return!t&&console.warn(e)},se=function(e,t){return e&&(ne[e]=t)&&re&&(re[e]=t)||ne},ce=function(){return 0},le={suppressEvents:!0,isStart:!0,kill:!1},ue={suppressEvents:!0,kill:!1},de={suppressEvents:!0},fe={},pe=[],me={},he,ge={},_e={},ve=30,ye=[],be=``,L=function(e){var t=e[0],n,r;if(y(t)||g(t)||(e=[e]),!(n=(t._gsap||{}).harness)){for(r=ye.length;r--&&!ye[r].targetTest(t););n=ye[r]}for(r=e.length;r--;)e[r]&&(e[r]._gsap||(e[r]._gsap=new ln(e[r],n)))||e.splice(r,1);return e},xe=function(e){return e._gsap||L(gt(e))[0]._gsap},Se=function(e,t,n){return(n=e[t])&&g(n)?e[t]():v(n)&&e.getAttribute&&e.getAttribute(t)||n},Ce=function(e,t){return(e=e.split(`,`)).forEach(t)||e},R=function(e){return Math.round(e*1e5)/1e5||0},we=function(e){return Math.round(e*1e7)/1e7||0},z=function(e,t){var n=t.charAt(0),r=parseFloat(t.substr(2));return e=parseFloat(e),n===`+`?e+r:n===`-`?e-r:n===`*`?e*r:e/r},Te=function(e,t){for(var n=t.length,r=0;e.indexOf(t[r])<0&&++r<n;);return r<n},Ee=function(){var e=pe.length,t=pe.slice(0),n,r;for(me={},pe.length=0,n=0;n<e;n++)r=t[n],r&&r._lazy&&(r.render(r._lazy[0],r._lazy[1],!0)._lazy=0)},De=function(e){return!!(e._initted||e._startAt||e.add)},Oe=function(e,t,n,r){pe.length&&!a&&Ee(),e.render(t,n,r||!!(a&&t<0&&De(e))),pe.length&&!a&&Ee()},ke=function(e){var t=parseFloat(e);return(t||t===0)&&(e+``).match(M).length<2?t:h(e)?e.trim():e},Ae=function(e){return e},je=function(e,t){for(var n in t)n in e||(e[n]=t[n]);return e},Me=function(e){return function(t,n){for(var r in n)r in t||r===`duration`&&e||r===`ease`||(t[r]=n[r])}},Ne=function(e,t){for(var n in t)e[n]=t[n];return e},Pe=function e(t,n){for(var r in n)r!==`__proto__`&&r!==`constructor`&&r!==`prototype`&&(t[r]=y(n[r])?e(t[r]||(t[r]={}),n[r]):n[r]);return t},Fe=function(e,t){var n={},r;for(r in e)r in t||(n[r]=e[r]);return n},Ie=function(e){var t=e.parent||P,n=e.keyframes?Me(w(e.keyframes)):je;if(b(e.inherit))for(;t;)n(e,t.vars.defaults),t=t.parent||t._dp;return e},Le=function(e,t){for(var n=e.length,r=n===t.length;r&&n--&&e[n]===t[n];);return n<0},Re=function(e,t,n,r,i){n===void 0&&(n=`_first`),r===void 0&&(r=`_last`);var a=e[r],o;if(i)for(o=t[i];a&&a[i]>o;)a=a._prev;return a?(t._next=a._next,a._next=t):(t._next=e[n],e[n]=t),t._next?t._next._prev=t:e[r]=t,t._prev=a,t.parent=t._dp=e,t},ze=function(e,t,n,r){n===void 0&&(n=`_first`),r===void 0&&(r=`_last`);var i=t._prev,a=t._next;i?i._next=a:e[n]===t&&(e[n]=a),a?a._prev=i:e[r]===t&&(e[r]=i),t._next=t._prev=t.parent=null},Be=function(e,t){e.parent&&(!t||e.parent.autoRemoveChildren)&&e.parent.remove&&e.parent.remove(e),e._act=0},Ve=function(e,t){if(e&&(!t||t._end>e._dur||t._start<0))for(var n=e;n;)n._dirty=1,n=n.parent;return e},He=function(e){for(var t=e.parent;t&&t.parent;)t._dirty=1,t.totalDuration(),t=t.parent;return e},Ue=function(e,t,n,r){return e._startAt&&(a?e._startAt.revert(ue):e.vars.immediateRender&&!e.vars.autoRevert||e._startAt.render(t,!0,r))},We=function e(t){return!t||t._ts&&e(t.parent)},Ge=function(e){return e._repeat?Ke(e._tTime,e=e.duration()+e._rDelay)*e:0},Ke=function(e,t){var n=Math.floor(e=we(e/t));return e&&n===e?n-1:n},qe=function(e,t){return(e-t._start)*t._ts+(t._ts>=0?0:t._dirty?t.totalDuration():t._tDur)},Je=function(e){return e._end=we(e._start+(e._tDur/Math.abs(e._ts||e._rts||c)||0))},Ye=function(e,t){var n=e._dp;return n&&n.smoothChildTiming&&e._ts&&(e._start=we(n._time-(e._ts>0?t/e._ts:((e._dirty?e.totalDuration():e._tDur)-t)/-e._ts)),Je(e),n._dirty||Ve(n,e)),e},Xe=function(e,t){var n;if((t._time||!t._dur&&t._initted||t._start<e._time&&(t._dur||!t.add))&&(n=qe(e.rawTime(),t),(!t._dur||ut(0,t.totalDuration(),n)-t._tTime>c)&&t.render(n,!0)),Ve(e,t)._dp&&e._initted&&e._time>=e._dur&&e._ts){if(e._dur<e.duration())for(n=e;n._dp;)n.rawTime()>=0&&n.totalTime(n._tTime),n=n._dp;e._zTime=-c}},Ze=function(e,t,n,r){return t.parent&&Be(t),t._start=we((_(n)?n:n||e!==P?st(e,n,t):e._time)+t._delay),t._end=we(t._start+(t.totalDuration()/Math.abs(t.timeScale())||0)),Re(e,t,`_first`,`_last`,e._sort?`_start`:0),tt(t)||(e._recent=t),r||Xe(e,t),e._ts<0&&Ye(e,e._tTime),e},Qe=function(e,t){return(ne.ScrollTrigger||ae(`scrollTrigger`,t))&&ne.ScrollTrigger.create(t,e)},$e=function(e,t,n,r,i){if(vn(e,t,i),!e._initted)return 1;if(!n&&e._pt&&!a&&(e._dur&&e.vars.lazy!==!1||!e._dur&&e.vars.lazy)&&he!==Jt.frame)return pe.push(e),e._lazy=[i,r],1},et=function e(t){var n=t.parent;return n&&n._ts&&n._initted&&!n._lock&&(n.rawTime()<0||e(n))},tt=function(e){var t=e.data;return t===`isFromStart`||t===`isStart`},nt=function(e,t,n,r){var i=e.ratio,o=t<0||!t&&(!e._start&&et(e)&&(e._initted||!tt(e))||(e._ts<0||e._dp._ts<0)&&!tt(e))?0:1,s=e._rDelay,l=0,u,d,f;if(s&&e._repeat&&(l=ut(0,e._tDur,t),d=Ke(l,s),e._yoyo&&d&1&&(o=1-o),d!==Ke(e._tTime,s)&&(i=1-o,e.vars.repeatRefresh&&e._initted&&e.invalidate())),o!==i||a||r||e._zTime===c||!t&&e._zTime){if(!e._initted&&$e(e,t,r,n,l))return;for(f=e._zTime,e._zTime=t||(n?c:0),n||=t&&!f,e.ratio=o,e._from&&(o=1-o),e._time=0,e._tTime=l,u=e._pt;u;)u.r(o,u.d),u=u._next;t<0&&Ue(e,t,n,!0),e._onUpdate&&!n&&Nt(e,`onUpdate`),l&&e._repeat&&!n&&e.parent&&Nt(e,`onRepeat`),(t>=e._tDur||t<0)&&e.ratio===o&&(o&&Be(e,1),!n&&!a&&(Nt(e,o?`onComplete`:`onReverseComplete`,!0),e._prom&&e._prom()))}else e._zTime||=t},rt=function(e,t,n){var r;if(n>t)for(r=e._first;r&&r._start<=n;){if(r.data===`isPause`&&r._start>t)return r;r=r._next}else for(r=e._last;r&&r._start>=n;){if(r.data===`isPause`&&r._start<t)return r;r=r._prev}},it=function(e,t,n,r){var i=e._repeat,a=we(t)||0,o=e._tTime/e._tDur;return o&&!r&&(e._time*=a/e._dur),e._dur=a,e._tDur=i?i<0?1e10:we(a*(i+1)+e._rDelay*i):a,o>0&&!r&&Ye(e,e._tTime=e._tDur*o),e.parent&&Je(e),n||Ve(e.parent,e),e},at=function(e){return e instanceof dn?Ve(e):it(e,e._dur)},ot={_start:0,endTime:ce,totalDuration:ce},st=function e(t,n,r){var i=t.labels,a=t._recent||ot,o=t.duration()>=s?a.endTime(!1):t._dur,c,l,u;return h(n)&&(isNaN(n)||n in i)?(l=n.charAt(0),u=n.substr(-1)===`%`,c=n.indexOf(`=`),l===`<`||l===`>`?(c>=0&&(n=n.replace(/=/,``)),(l===`<`?a._start:a.endTime(a._repeat>=0))+(parseFloat(n.substr(1))||0)*(u?(c<0?a:r).totalDuration()/100:1)):c<0?(n in i||(i[n]=o),i[n]):(l=parseFloat(n.charAt(c-1)+n.substr(c+1)),u&&r&&(l=l/100*(w(r)?r[0]:r).totalDuration()),c>1?e(t,n.substr(0,c-1),r)+l:o+l)):n==null?o:+n},ct=function(e,t,n){var r=_(t[1]),i=(r?2:1)+(e<2?0:1),a=t[i],o,s;if(r&&(a.duration=t[1]),a.parent=n,e){for(o=a,s=n;s&&!(`immediateRender`in o);)o=s.vars.defaults||{},s=b(s.vars.inherit)&&s.parent;a.immediateRender=b(o.immediateRender),e<2?a.runBackwards=1:a.startAt=t[i-1]}return new Tn(t[0],a,t[i+1])},lt=function(e,t){return e||e===0?t(e):t},ut=function(e,t,n){return n<e?e:n>t?t:n},dt=function(e,t){return!h(e)||!(t=N.exec(e))?``:t[1]},ft=function(e,t,n){return lt(n,function(n){return ut(e,t,n)})},pt=[].slice,mt=function(e,t){return e&&y(e)&&`length`in e&&(!t&&!e.length||e.length-1 in e&&y(e[0]))&&!e.nodeType&&e!==F},ht=function(e,t,n){return n===void 0&&(n=[]),e.forEach(function(e){var r;return h(e)&&!t||mt(e,1)?(r=n).push.apply(r,gt(e)):n.push(e)})||n},gt=function(e,t,n){return o&&!t&&o.selector?o.selector(e):h(e)&&!n&&(ee||!Yt())?pt.call((t||te).querySelectorAll(e),0):w(e)?ht(e,n):mt(e)?pt.call(e,0):e?[e]:[]},_t=function(e){return e=gt(e)[0]||oe(`Invalid scope`)||{},function(t){var n=e.current||e.nativeElement||e;return gt(t,n.querySelectorAll?n:n===e?oe(`Invalid scope`)||te.createElement(`div`):e)}},vt=function(e){return e.sort(function(){return .5-Math.random()})},yt=function(e){if(g(e))return e;var t=y(e)?e:{each:e},n=rn(t.ease),r=t.from||0,i=parseFloat(t.base)||0,a={},o=r>0&&r<1,c=isNaN(r)||o,l=t.axis,u=r,d=r;return h(r)?u=d={center:.5,edges:.5,end:1}[r]||0:!o&&c&&(u=r[0],d=r[1]),function(e,o,p){var m=(p||t).length,h=a[m],g,_,v,y,b,x,S,C,w;if(!h){if(w=t.grid===`auto`?0:(t.grid||[1,s])[1],!w){for(S=-s;S<(S=p[w++].getBoundingClientRect().left)&&w<m;);w<m&&w--}for(h=a[m]=[],g=c?Math.min(w,m)*u-.5:r%w,_=w===s?0:c?m*d/w-.5:r/w|0,S=0,C=s,x=0;x<m;x++)v=x%w-g,y=_-(x/w|0),h[x]=b=l?Math.abs(l===`y`?y:v):f(v*v+y*y),b>S&&(S=b),b<C&&(C=b);r===`random`&&vt(h),h.max=S-C,h.min=C,h.v=m=(parseFloat(t.amount)||parseFloat(t.each)*(w>m?m-1:l?l===`y`?m/w:w:Math.max(w,m/w))||0)*(r===`edges`?-1:1),h.b=m<0?i-m:i,h.u=dt(t.amount||t.each)||0,n=n&&m<0?nn(n):n}return m=(h[e]-h.min)/h.max||0,we(h.b+(n?n(m):m)*h.v)+h.u}},bt=function(e){var t=10**((e+``).split(`.`)[1]||``).length;return function(n){var r=we(Math.round(parseFloat(n)/e)*e*t);return(r-r%1)/t+(_(n)?0:dt(n))}},xt=function(e,t){var n=w(e),r,i;return!n&&y(e)&&(r=n=e.radius||s,e.values?(e=gt(e.values),(i=!_(e[0]))&&(r*=r)):e=bt(e.increment)),lt(t,n?g(e)?function(t){return i=e(t),Math.abs(i-t)<=r?i:t}:function(t){for(var n=parseFloat(i?t.x:t),a=parseFloat(i?t.y:0),o=s,c=0,l=e.length,u,d;l--;)i?(u=e[l].x-n,d=e[l].y-a,u=u*u+d*d):u=Math.abs(e[l]-n),u<o&&(o=u,c=l);return c=!r||o<=r?e[c]:t,i||c===t||_(t)?c:c+dt(t)}:bt(e))},St=function(e,t,n,r){return lt(w(e)?!t:n===!0?!!(n=0):!r,function(){return w(e)?e[~~(Math.random()*e.length)]:(n||=1e-5)&&(r=n<1?10**((n+``).length-2):1)&&Math.floor(Math.round((e-n/2+Math.random()*(t-e+n*.99))/n)*n*r)/r})},Ct=function(){var e=[...arguments];return function(t){return e.reduce(function(e,t){return t(e)},t)}},wt=function(e,t){return function(n){return e(parseFloat(n))+(t||dt(n))}},Tt=function(e,t,n){return At(e,t,0,1,n)},Et=function(e,t,n){return lt(n,function(n){return e[~~t(n)]})},Dt=function e(t,n,r){var i=n-t;return w(t)?Et(t,e(0,t.length),n):lt(r,function(e){return(i+(e-t)%i)%i+t})},Ot=function e(t,n,r){var i=n-t,a=i*2;return w(t)?Et(t,e(0,t.length-1),n):lt(r,function(e){return e=(a+(e-t)%a)%a||0,t+(e>i?a-e:e)})},kt=function(e){return e.replace(T,function(e){var t=e.indexOf(`[`)+1,n=e.substring(t||7,t?e.indexOf(`]`):e.length-1).split(E);return St(t?n:+n[0],t?0:+n[1],+n[2]||1e-5)})},At=function(e,t,n,r,i){var a=t-e,o=r-n;return lt(i,function(t){return n+((t-e)/a*o||0)})},jt=function e(t,n,r,i){var a=isNaN(t+n)?0:function(e){return(1-e)*t+e*n};if(!a){var o=h(t),s={},c,l,u,d,f;if(r===!0&&(i=1)&&(r=null),o)t={p:t},n={p:n};else if(w(t)&&!w(n)){for(u=[],d=t.length,f=d-2,l=1;l<d;l++)u.push(e(t[l-1],t[l]));d--,a=function(e){e*=d;var t=Math.min(f,~~e);return u[t](e-t)},r=n}else i||(t=Ne(w(t)?[]:{},t));if(!u){for(c in n)pn.call(s,t,c,`get`,n[c]);a=function(e){return Pn(e,s)||(o?t.p:t)}}}return lt(r,a)},Mt=function(e,t,n){var r=e.labels,i=s,a,o,c;for(a in r)o=r[a]-t,o<0==!!n&&o&&i>(o=Math.abs(o))&&(c=a,i=o);return c},Nt=function(e,t,n){var r=e.vars,i=r[t],a=o,s=e._ctx,c,l,u;if(i)return c=r[t+`Params`],l=r.callbackScope||e,n&&pe.length&&Ee(),s&&(o=s),u=c?i.apply(l,c):i.call(l),o=a,u},Pt=function(e){return Be(e),e.scrollTrigger&&e.scrollTrigger.kill(!!a),e.progress()<1&&Nt(e,`onInterrupt`),e},Ft,It=[],Lt=function(e){if(e){if(e=!e.name&&e.default||e,x()||e.headless){var t=e.name,n=g(e),r=t&&!n&&e.init?function(){this._props=[]}:e,i={init:ce,render:Pn,add:pn,kill:In,modifier:Fn,rawVars:0},a={targetTest:0,get:0,getSetter:An,aliases:{},register:0};if(Yt(),e!==r){if(ge[t])return;je(r,je(Fe(e,i),a)),Ne(r.prototype,Ne(i,Fe(e,a))),ge[r.prop=t]=r,e.targetTest&&(ye.push(r),fe[t]=1),t=(t===`css`?`CSS`:t.charAt(0).toUpperCase()+t.substr(1))+`Plugin`}se(t,r),e.register&&e.register($n,r,zn)}else It.push(e)}},Rt=255,zt={aqua:[0,Rt,Rt],lime:[0,Rt,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,Rt],navy:[0,0,128],white:[Rt,Rt,Rt],olive:[128,128,0],yellow:[Rt,Rt,0],orange:[Rt,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[Rt,0,0],pink:[Rt,192,203],cyan:[0,Rt,Rt],transparent:[Rt,Rt,Rt,0]},Bt=function(e,t,n){return e+=e<0?1:e>1?-1:0,(e*6<1?t+(n-t)*e*6:e<.5?n:e*3<2?t+(n-t)*(2/3-e)*6:t)*Rt+.5|0},Vt=function(e,t,n){var r=e?_(e)?[e>>16,e>>8&Rt,e&Rt]:0:zt.black,i,a,o,s,c,l,u,d,f,p;if(!r){if(e.substr(-1)===`,`&&(e=e.substr(0,e.length-1)),zt[e])r=zt[e];else if(e.charAt(0)===`#`){if(e.length<6&&(i=e.charAt(1),a=e.charAt(2),o=e.charAt(3),e=`#`+i+i+a+a+o+o+(e.length===5?e.charAt(4)+e.charAt(4):``)),e.length===9)return r=parseInt(e.substr(1,6),16),[r>>16,r>>8&Rt,r&Rt,parseInt(e.substr(7),16)/255];e=parseInt(e.substr(1),16),r=[e>>16,e>>8&Rt,e&Rt]}else if(e.substr(0,3)===`hsl`){if(r=p=e.match(D),!t)s=r[0]%360/360,c=r[1]/100,l=r[2]/100,a=l<=.5?l*(c+1):l+c-l*c,i=l*2-a,r.length>3&&(r[3]*=1),r[0]=Bt(s+1/3,i,a),r[1]=Bt(s,i,a),r[2]=Bt(s-1/3,i,a);else if(~e.indexOf(`=`))return r=e.match(O),n&&r.length<4&&(r[3]=1),r}else r=e.match(D)||zt.transparent;r=r.map(Number)}return t&&!p&&(i=r[0]/Rt,a=r[1]/Rt,o=r[2]/Rt,u=Math.max(i,a,o),d=Math.min(i,a,o),l=(u+d)/2,u===d?s=c=0:(f=u-d,c=l>.5?f/(2-u-d):f/(u+d),s=u===i?(a-o)/f+(a<o?6:0):u===a?(o-i)/f+2:(i-a)/f+4,s*=60),r[0]=~~(s+.5),r[1]=~~(c*100+.5),r[2]=~~(l*100+.5)),n&&r.length<4&&(r[3]=1),r},Ht=function(e){var t=[],n=[],r=-1;return e.split(Wt).forEach(function(e){var i=e.match(k)||[];t.push.apply(t,i),n.push(r+=i.length+1)}),t.c=n,t},Ut=function(e,t,n){var r=``,i=(e+r).match(Wt),a=t?`hsla(`:`rgba(`,o=0,s,c,l,u;if(!i)return e;if(i=i.map(function(e){return(e=Vt(e,t,1))&&a+(t?e[0]+`,`+e[1]+`%,`+e[2]+`%,`+e[3]:e.join(`,`))+`)`}),n&&(l=Ht(e),s=n.c,s.join(r)!==l.c.join(r)))for(c=e.replace(Wt,`1`).split(k),u=c.length-1;o<u;o++)r+=c[o]+(~s.indexOf(o)?i.shift()||a+`0,0,0,0)`:(l.length?l:i.length?i:n).shift());if(!c)for(c=e.split(Wt),u=c.length-1;o<u;o++)r+=c[o]+i[o];return r+c[u]},Wt=function(){var e=`(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b`,t;for(t in zt)e+=`|`+t+`\\b`;return RegExp(e+`)`,`gi`)}(),Gt=/hsl[a]?\(/,Kt=function(e){var t=e.join(` `),n;if(Wt.lastIndex=0,Wt.test(t))return n=Gt.test(t),e[1]=Ut(e[1],n),e[0]=Ut(e[0],n,Ht(e[1])),!0},qt,Jt=function(){var e=Date.now,t=500,n=33,r=e(),i=r,a=1e3/240,o=a,s=[],c,l,u,d,f,p,m=function u(m){var h=e()-i,g=m===!0,_,v,y,b;if((h>t||h<0)&&(r+=h-n),i+=h,y=i-r,_=y-o,(_>0||g)&&(b=++d.frame,f=y-d.time*1e3,d.time=y/=1e3,o+=_+(_>=a?4:a-_),v=1),g||(c=l(u)),v)for(p=0;p<s.length;p++)s[p](y,f,b,m)};return d={time:0,frame:0,tick:function(){m(!0)},deltaRatio:function(e){return f/(1e3/(e||60))},wake:function(){ie&&(!ee&&x()&&(F=ee=window,te=F.document||{},ne.gsap=$n,(F.gsapVersions||(F.gsapVersions=[])).push($n.version),I(re||F.GreenSockGlobals||!F.gsap&&F||{}),It.forEach(Lt)),u=typeof requestAnimationFrame<`u`&&requestAnimationFrame,c&&d.sleep(),l=u||function(e){return setTimeout(e,o-d.time*1e3+1|0)},qt=1,m(2))},sleep:function(){(u?cancelAnimationFrame:clearTimeout)(c),qt=0,l=ce},lagSmoothing:function(e,r){t=e||1/0,n=Math.min(r||33,t)},fps:function(e){a=1e3/(e||240),o=d.time*1e3+a},add:function(e,t,n){var r=t?function(t,n,i,a){e(t,n,i,a),d.remove(r)}:e;return d.remove(e),s[n?`unshift`:`push`](r),Yt(),r},remove:function(e,t){~(t=s.indexOf(e))&&s.splice(t,1)&&p>=t&&p--},_listeners:s},d}(),Yt=function(){return!qt&&Jt.wake()},Xt={},Zt=/^[\d.\-M][\d.\-,\s]/,Qt=/["']/g,$t=function(e){for(var t={},n=e.substr(1,e.length-3).split(`:`),r=n[0],i=1,a=n.length,o,s,c;i<a;i++)s=n[i],o=i===a-1?s.length:s.lastIndexOf(`,`),c=s.substr(0,o),t[r]=isNaN(c)?c.replace(Qt,``).trim():+c,r=s.substr(o+1).trim();return t},en=function(e){var t=e.indexOf(`(`)+1,n=e.indexOf(`)`),r=e.indexOf(`(`,t);return e.substring(t,~r&&r<n?e.indexOf(`)`,n+1):n)},tn=function(e){var t=(e+``).split(`(`),n=Xt[t[0]];return n&&t.length>1&&n.config?n.config.apply(null,~e.indexOf(`{`)?[$t(t[1])]:en(e).split(`,`).map(ke)):Xt._CE&&Zt.test(e)?Xt._CE(``,e):n},nn=function(e){return function(t){return 1-e(1-t)}},rn=function(e,t){return e&&(g(e)?e:Xt[e]||tn(e))||t},an=function(e,t,n,r){n===void 0&&(n=function(e){return 1-t(1-e)}),r===void 0&&(r=function(e){return e<.5?t(e*2)/2:1-t((1-e)*2)/2});var i={easeIn:t,easeOut:n,easeInOut:r},a;return Ce(e,function(e){for(var t in Xt[e]=ne[e]=i,Xt[a=e.toLowerCase()]=n,i)Xt[a+(t===`easeIn`?`.in`:t===`easeOut`?`.out`:`.inOut`)]=Xt[e+`.`+t]=i[t]}),i},on=function(e){return function(t){return t<.5?(1-e(1-t*2))/2:.5+e((t-.5)*2)/2}},sn=function e(t,n,r){var i=n>=1?n:1,a=(r||(t?.3:.45))/(n<1?n:1),o=a/l*(Math.asin(1/i)||0),s=function(e){return e===1?1:i*2**(-10*e)*m((e-o)*a)+1},c=t===`out`?s:t===`in`?function(e){return 1-s(1-e)}:on(s);return a=l/a,c.config=function(n,r){return e(t,n,r)},c},cn=function e(t,n){n===void 0&&(n=1.70158);var r=function(e){return e?--e*e*((n+1)*e+n)+1:0},i=t===`out`?r:t===`in`?function(e){return 1-r(1-e)}:on(r);return i.config=function(n){return e(t,n)},i};Ce(`Linear,Quad,Cubic,Quart,Quint,Strong`,function(e,t){var n=t<5?t+1:t;an(e+`,Power`+(n-1),t?function(e){return e**+n}:function(e){return e},function(e){return 1-(1-e)**n},function(e){return e<.5?(e*2)**n/2:1-((1-e)*2)**n/2})}),Xt.Linear.easeNone=Xt.none=Xt.Linear.easeIn,an(`Elastic`,sn(`in`),sn(`out`),sn()),(function(e,t){var n=1/t,r=2*n,i=2.5*n,a=function(a){return a<n?e*a*a:a<r?e*(a-1.5/t)**2+.75:a<i?e*(a-=2.25/t)*a+.9375:e*(a-2.625/t)**2+.984375};an(`Bounce`,function(e){return 1-a(1-e)},a)})(7.5625,2.75),an(`Expo`,function(e){return 2**(10*(e-1))*e+e*e*e*e*e*e*(1-e)}),an(`Circ`,function(e){return-(f(1-e*e)-1)}),an(`Sine`,function(e){return e===1?1:-p(e*u)+1}),an(`Back`,cn(`in`),cn(`out`),cn()),Xt.SteppedEase=Xt.steps=ne.SteppedEase={config:function(e,t){e===void 0&&(e=1);var n=1/e,r=e+ +!t,i=+!!t,a=1-c;return function(e){return((r*ut(0,a,e)|0)+i)*n}}},r.ease=Xt[`quad.out`],Ce(`onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt`,function(e){return be+=e+`,`+e+`Params,`});var ln=function(e,t){this.id=d++,e._gsap=this,this.target=e,this.harness=t,this.get=t?t.get:Se,this.set=t?t.getSetter:An},un=function(){function e(e){this.vars=e,this._delay=+e.delay||0,(this._repeat=e.repeat===1/0?-2:e.repeat||0)&&(this._rDelay=e.repeatDelay||0,this._yoyo=!!e.yoyo||!!e.yoyoEase),this._ts=1,it(this,+e.duration,1,1),this.data=e.data,o&&(this._ctx=o,o.data.push(this)),qt||Jt.wake()}var t=e.prototype;return t.delay=function(e){return e||e===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+e-this._delay),this._delay=e,this):this._delay},t.duration=function(e){return arguments.length?this.totalDuration(this._repeat>0?e+(e+this._rDelay)*this._repeat:e):this.totalDuration()&&this._dur},t.totalDuration=function(e){return arguments.length?(this._dirty=0,it(this,this._repeat<0?e:(e-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},t.totalTime=function(e,t){if(Yt(),!arguments.length)return this._tTime;var n=this._dp;if(n&&n.smoothChildTiming&&this._ts){for(Ye(this,e),!n._dp||n.parent||Xe(n,this);n&&n.parent;)n.parent._time!==n._start+(n._ts>=0?n._tTime/n._ts:(n.totalDuration()-n._tTime)/-n._ts)&&n.totalTime(n._tTime,!0),n=n.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&e<this._tDur||this._ts<0&&e>0||!this._tDur&&!e)&&Ze(this._dp,this,this._start-this._delay)}return(this._tTime!==e||!this._dur&&!t||this._initted&&Math.abs(this._zTime)===c||!this._initted&&this._dur&&e||!e&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=e),Oe(this,e,t)),this},t.time=function(e,t){return arguments.length?this.totalTime(Math.min(this.totalDuration(),e+Ge(this))%(this._dur+this._rDelay)||(e?this._dur:0),t):this._time},t.totalProgress=function(e,t){return arguments.length?this.totalTime(this.totalDuration()*e,t):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},t.progress=function(e,t){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-e:e)+Ge(this),t):this.duration()?Math.min(1,this._time/this._dur):+(this.rawTime()>0)},t.iteration=function(e,t){var n=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(e-1)*n,t):this._repeat?Ke(this._tTime,n)+1:1},t.timeScale=function(e,t){if(!arguments.length)return this._rts===-c?0:this._rts;if(this._rts===e)return this;var n=this.parent&&this._ts?qe(this.parent._time,this):this._tTime;return this._rts=+e||0,this._ts=this._ps||e===-c?0:this._rts,this.totalTime(ut(-Math.abs(this._delay),this.totalDuration(),n),t!==!1),Je(this),He(this)},t.paused=function(e){return arguments.length?(this._ps!==e&&(this._ps=e,e?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):(Yt(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==c&&(this._tTime-=c)))),this):this._ps},t.startTime=function(e){if(arguments.length){this._start=we(e);var t=this.parent||this._dp;return t&&(t._sort||!this.parent)&&Ze(t,this,this._start-this._delay),this}return this._start},t.endTime=function(e){return this._start+(b(e)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},t.rawTime=function(e){var t=this.parent||this._dp;return t?e&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?qe(t.rawTime(e),this):this._tTime:this._tTime},t.revert=function(e){e===void 0&&(e=de);var t=a;return a=e,De(this)&&(this.timeline&&this.timeline.revert(e),this.totalTime(-.01,e.suppressEvents)),this.data!==`nested`&&e.kill!==!1&&this.kill(),a=t,this},t.globalTime=function(e){for(var t=this,n=arguments.length?e:t.rawTime();t;)n=t._start+n/(Math.abs(t._ts)||1),t=t._dp;return!this.parent&&this._sat?this._sat.globalTime(e):n},t.repeat=function(e){return arguments.length?(this._repeat=e===1/0?-2:e,at(this)):this._repeat===-2?1/0:this._repeat},t.repeatDelay=function(e){if(arguments.length){var t=this._time;return this._rDelay=e,at(this),t?this.time(t):this}return this._rDelay},t.yoyo=function(e){return arguments.length?(this._yoyo=e,this):this._yoyo},t.seek=function(e,t){return this.totalTime(st(this,e),b(t))},t.restart=function(e,t){return this.play().totalTime(e?-this._delay:0,b(t)),this._dur||(this._zTime=-c),this},t.play=function(e,t){return e!=null&&this.seek(e,t),this.reversed(!1).paused(!1)},t.reverse=function(e,t){return e!=null&&this.seek(e||this.totalDuration(),t),this.reversed(!0).paused(!1)},t.pause=function(e,t){return e!=null&&this.seek(e,t),this.paused(!0)},t.resume=function(){return this.paused(!1)},t.reversed=function(e){return arguments.length?(!!e!==this.reversed()&&this.timeScale(-this._rts||(e?-c:0)),this):this._rts<0},t.invalidate=function(){return this._initted=this._act=0,this._zTime=-c,this},t.isActive=function(){var e=this.parent||this._dp,t=this._start,n;return!!(!e||this._ts&&this._initted&&e.isActive()&&(n=e.rawTime(!0))>=t&&n<this.endTime(!0)-c)},t.eventCallback=function(e,t,n){var r=this.vars;return arguments.length>1?(t?(r[e]=t,n&&(r[e+`Params`]=n),e===`onUpdate`&&(this._onUpdate=t)):delete r[e],this):r[e]},t.then=function(e){var t=this,n=t._prom;return new Promise(function(r){var i=g(e)?e:Ae,a=function(){var e=t.then;t.then=null,n&&n(),g(i)&&(i=i(t))&&(i.then||i===t)&&(t.then=e),r(i),t.then=e};t._initted&&t.totalProgress()===1&&t._ts>=0||!t._tTime&&t._ts<0?a():t._prom=a})},t.kill=function(){Pt(this)},e}();je(un.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-c,_prom:0,_ps:!1,_rts:1});var dn=function(r){t(i,r);function i(t,n){var i;return t===void 0&&(t={}),i=r.call(this,t)||this,i.labels={},i.smoothChildTiming=!!t.smoothChildTiming,i.autoRemoveChildren=!!t.autoRemoveChildren,i._sort=b(t.sortChildren),P&&Ze(t.parent||P,e(i),n),t.reversed&&i.reverse(),t.paused&&i.paused(!0),t.scrollTrigger&&Qe(e(i),t.scrollTrigger),i}var o=i.prototype;return o.to=function(e,t,n){return ct(0,arguments,this),this},o.from=function(e,t,n){return ct(1,arguments,this),this},o.fromTo=function(e,t,n,r){return ct(2,arguments,this),this},o.set=function(e,t,n){return t.duration=0,t.parent=this,Ie(t).repeatDelay||(t.repeat=0),t.immediateRender=!!t.immediateRender,new Tn(e,t,st(this,n),1),this},o.call=function(e,t,n){return Ze(this,Tn.delayedCall(0,e,t),n)},o.staggerTo=function(e,t,n,r,i,a,o){return n.duration=t,n.stagger=n.stagger||r,n.onComplete=a,n.onCompleteParams=o,n.parent=this,new Tn(e,n,st(this,i)),this},o.staggerFrom=function(e,t,n,r,i,a,o){return n.runBackwards=1,Ie(n).immediateRender=b(n.immediateRender),this.staggerTo(e,t,n,r,i,a,o)},o.staggerFromTo=function(e,t,n,r,i,a,o,s){return r.startAt=n,Ie(r).immediateRender=b(r.immediateRender),this.staggerTo(e,t,r,i,a,o,s)},o.render=function(e,t,n){var r=this._time,i=this._dirty?this.totalDuration():this._tDur,o=this._dur,s=e<=0?0:we(e),l=this._zTime<0!=e<0&&(this._initted||!o),u,d,f,p,m,h,g,_,v,y,b,x;if(this!==P&&s>i&&e>=0&&(s=i),s!==this._tTime||n||l){if(r!==this._time&&o&&(s+=this._time-r,e+=this._time-r),u=s,v=this._start,_=this._ts,h=!_,l&&(o||(r=this._zTime),(e||!t)&&(this._zTime=e)),this._repeat){if(b=this._yoyo,m=o+this._rDelay,this._repeat<-1&&e<0)return this.totalTime(m*100+e,t,n);if(u=we(s%m),s===i?(p=this._repeat,u=o):(y=we(s/m),p=~~y,p&&p===y&&(u=o,p--),u>o&&(u=o)),y=Ke(this._tTime,m),!r&&this._tTime&&y!==p&&this._tTime-y*m-this._dur<=0&&(y=p),b&&p&1&&(u=o-u,x=1),p!==y&&!this._lock){var S=b&&y&1,C=S===(b&&p&1);if(p<y&&(S=!S),r=S?0:s%o?o:s,this._lock=1,this.render(r||(x?0:we(p*m)),t,!o)._lock=0,this._tTime=s,!t&&this.parent&&Nt(this,`onRepeat`),this.vars.repeatRefresh&&!x&&(this.invalidate()._lock=1,y=p),r&&r!==this._time||h!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act||(o=this._dur,i=this._tDur,C&&(this._lock=2,r=S?o:-1e-4,this.render(r,!0),this.vars.repeatRefresh&&!x&&this.invalidate()),this._lock=0,!this._ts&&!h))return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(g=rt(this,we(r),we(u)),g&&(s-=u-(u=g._start))),this._tTime=s,this._time=u,this._act=!!_,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=e,r=0),!r&&s&&o&&!t&&!y&&(Nt(this,`onStart`),this._tTime!==s))return this;if(u>=r&&e>=0)for(d=this._first;d;){if(f=d._next,(d._act||u>=d._start)&&d._ts&&g!==d){if(d.parent!==this)return this.render(e,t,n);if(d.render(d._ts>0?(u-d._start)*d._ts:(d._dirty?d.totalDuration():d._tDur)+(u-d._start)*d._ts,t,n),u!==this._time||!this._ts&&!h){g=0,f&&(s+=this._zTime=-c);break}}d=f}else{d=this._last;for(var w=e<0?e:u;d;){if(f=d._prev,(d._act||w<=d._end)&&d._ts&&g!==d){if(d.parent!==this)return this.render(e,t,n);if(d.render(d._ts>0?(w-d._start)*d._ts:(d._dirty?d.totalDuration():d._tDur)+(w-d._start)*d._ts,t,n||a&&De(d)),u!==this._time||!this._ts&&!h){g=0,f&&(s+=this._zTime=w?-c:c);break}}d=f}}if(g&&!t&&(this.pause(),g.render(u>=r?0:-c)._zTime=u>=r?1:-1,this._ts))return this._start=v,Je(this),this.render(e,t,n);this._onUpdate&&!t&&Nt(this,`onUpdate`,!0),(s===i&&this._tTime>=this.totalDuration()||!s&&r)&&(v===this._start||Math.abs(_)!==Math.abs(this._ts))&&(this._lock||((e||!o)&&(s===i&&this._ts>0||!s&&this._ts<0)&&Be(this,1),!t&&!(e<0&&!r)&&(s||r||!i)&&(Nt(this,s===i&&e>=0?`onComplete`:`onReverseComplete`,!0),this._prom&&!(s<i&&this.timeScale()>0)&&this._prom())))}return this},o.add=function(e,t){var n=this;if(_(t)||(t=st(this,t,e)),!(e instanceof un)){if(w(e))return e.forEach(function(e){return n.add(e,t)}),this;if(h(e))return this.addLabel(e,t);if(g(e))e=Tn.delayedCall(0,e);else return this}return this===e?this:Ze(this,e,t)},o.getChildren=function(e,t,n,r){e===void 0&&(e=!0),t===void 0&&(t=!0),n===void 0&&(n=!0),r===void 0&&(r=-s);for(var i=[],a=this._first;a;)a._start>=r&&(a instanceof Tn?t&&i.push(a):(n&&i.push(a),e&&i.push.apply(i,a.getChildren(!0,t,n)))),a=a._next;return i},o.getById=function(e){for(var t=this.getChildren(1,1,1),n=t.length;n--;)if(t[n].vars.id===e)return t[n]},o.remove=function(e){return h(e)?this.removeLabel(e):g(e)?this.killTweensOf(e):(e.parent===this&&ze(this,e),e===this._recent&&(this._recent=this._last),Ve(this))},o.totalTime=function(e,t){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=we(Jt.time-(this._ts>0?e/this._ts:(this.totalDuration()-e)/-this._ts))),r.prototype.totalTime.call(this,e,t),this._forcing=0,this):this._tTime},o.addLabel=function(e,t){return this.labels[e]=st(this,t),this},o.removeLabel=function(e){return delete this.labels[e],this},o.addPause=function(e,t,n){var r=Tn.delayedCall(0,t||ce,n);return r.data=`isPause`,this._hasPause=1,Ze(this,r,st(this,e))},o.removePause=function(e){var t=this._first;for(e=st(this,e);t;)t._start===e&&t.data===`isPause`&&Be(t),t=t._next},o.killTweensOf=function(e,t,n){for(var r=this.getTweensOf(e,n),i=r.length;i--;)gn!==r[i]&&r[i].kill(e,t);return this},o.getTweensOf=function(e,t){for(var n=[],r=gt(e),i=this._first,a=_(t),o;i;)i instanceof Tn?Te(i._targets,r)&&(a?(!gn||i._initted&&i._ts)&&i.globalTime(0)<=t&&i.globalTime(i.totalDuration())>t:!t||i.isActive())&&n.push(i):(o=i.getTweensOf(r,t)).length&&n.push.apply(n,o),i=i._next;return n},o.tweenTo=function(e,t){t||={};var n=this,r=st(n,e),i=t,a=i.startAt,o=i.onStart,s=i.onStartParams,l=i.immediateRender,u,d=Tn.to(n,je({ease:t.ease||`none`,lazy:!1,immediateRender:!1,time:r,overwrite:`auto`,duration:t.duration||Math.abs((r-(a&&`time`in a?a.time:n._time))/n.timeScale())||c,onStart:function(){if(n.pause(),!u){var e=t.duration||Math.abs((r-(a&&`time`in a?a.time:n._time))/n.timeScale());d._dur!==e&&it(d,e,0,1).render(d._time,!0,!0),u=1}o&&o.apply(d,s||[])}},t));return l?d.render(0):d},o.tweenFromTo=function(e,t,n){return this.tweenTo(t,je({startAt:{time:st(this,e)}},n))},o.recent=function(){return this._recent},o.nextLabel=function(e){return e===void 0&&(e=this._time),Mt(this,st(this,e))},o.previousLabel=function(e){return e===void 0&&(e=this._time),Mt(this,st(this,e),1)},o.currentLabel=function(e){return arguments.length?this.seek(e,!0):this.previousLabel(this._time+c)},o.shiftChildren=function(e,t,n){n===void 0&&(n=0);var r=this._first,i=this.labels,a;for(e=we(e);r;)r._start>=n&&(r._start+=e,r._end+=e),r=r._next;if(t)for(a in i)i[a]>=n&&(i[a]+=e);return Ve(this)},o.invalidate=function(e){var t=this._first;for(this._lock=0;t;)t.invalidate(e),t=t._next;return r.prototype.invalidate.call(this,e)},o.clear=function(e){e===void 0&&(e=!0);for(var t=this._first,n;t;)n=t._next,this.remove(t),t=n;return this._dp&&(this._time=this._tTime=this._pTime=0),e&&(this.labels={}),Ve(this)},o.totalDuration=function(e){var t=0,n=this,r=n._last,i=s,a,o,c;if(arguments.length)return n.timeScale((n._repeat<0?n.duration():n.totalDuration())/(n.reversed()?-e:e));if(n._dirty){for(c=n.parent;r;)a=r._prev,r._dirty&&r.totalDuration(),o=r._start,o>i&&n._sort&&r._ts&&!n._lock?(n._lock=1,Ze(n,r,o-r._delay,1)._lock=0):i=o,o<0&&r._ts&&(t-=o,(!c&&!n._dp||c&&c.smoothChildTiming)&&(n._start+=we(o/n._ts),n._time-=o,n._tTime-=o),n.shiftChildren(-o,!1,-1/0),i=0),r._end>t&&r._ts&&(t=r._end),r=a;it(n,n===P&&n._time>t?n._time:t,1,1),n._dirty=0}return n._tDur},i.updateRoot=function(e){if(P._ts&&(Oe(P,qe(e,P)),he=Jt.frame),Jt.frame>=ve){ve+=n.autoSleep||120;var t=P._first;if((!t||!t._ts)&&n.autoSleep&&Jt._listeners.length<2){for(;t&&!t._ts;)t=t._next;t||Jt.sleep()}}},i}(un);je(dn.prototype,{_lock:0,_hasPause:0,_forcing:0});var fn=function(e,t,n,r,i,a,o){var s=new zn(this._pt,e,t,0,1,Nn,null,i),c=0,l=0,u,d,f,p,m,h,g,_;for(s.b=n,s.e=r,n+=``,r+=``,(g=~r.indexOf(`random(`))&&(r=kt(r)),a&&(_=[n,r],a(_,e,t),n=_[0],r=_[1]),d=n.match(A)||[];u=A.exec(r);)p=u[0],m=r.substring(c,u.index),f?f=(f+1)%5:m.substr(-5)===`rgba(`&&(f=1),p!==d[l++]&&(h=parseFloat(d[l-1])||0,s._pt={_next:s._pt,p:m||l===1?m:`,`,s:h,c:p.charAt(1)===`=`?z(h,p)-h:parseFloat(p)-h,m:f&&f<4?Math.round:0},c=A.lastIndex);return s.c=c<r.length?r.substring(c,r.length):``,s.fp=o,(j.test(r)||g)&&(s.e=0),this._pt=s,s},pn=function(e,t,r,i,a,o,s,c,l,u){g(i)&&(i=i(a||0,e,o));var d=e[t],f=r===`get`?g(d)?l?e[t.indexOf(`set`)||!g(e[`get`+t.substr(3)])?t:`get`+t.substr(3)](l):e[t]():d:r,p=g(d)?l?On:Dn:En,m;if(h(i)&&(~i.indexOf(`random(`)&&(i=kt(i)),i.charAt(1)===`=`&&(m=z(f,i)+(dt(f)||0),(m||m===0)&&(i=m))),!u||f!==i||_n)return!isNaN(f*i)&&i!==``?(m=new zn(this._pt,e,t,+f||0,i-(f||0),typeof d==`boolean`?Mn:jn,0,p),l&&(m.fp=l),s&&m.modifier(s,this,e),this._pt=m):(!d&&!(t in e)&&ae(t,i),fn.call(this,e,t,f,i,p,c||n.stringFilter,l))},mn=function(e,t,n,r,i){if(g(e)&&(e=Sn(e,i,t,n,r)),!y(e)||e.style&&e.nodeType||w(e)||C(e))return h(e)?Sn(e,i,t,n,r):e;var a={},o;for(o in e)a[o]=Sn(e[o],i,t,n,r);return a},hn=function(e,t,n,r,i,a){var o,s,c,l;if(ge[e]&&(o=new ge[e]).init(i,o.rawVars?t[e]:mn(t[e],r,i,a,n),n,r,a)!==!1&&(n._pt=s=new zn(n._pt,i,e,0,1,o.render,o,0,o.priority),n!==Ft))for(c=n._ptLookup[n._targets.indexOf(i)],l=o._props.length;l--;)c[o._props[l]]=s;return o},gn,_n,vn=function e(t,n,o){var l=t.vars,u=l.ease,d=l.startAt,f=l.immediateRender,p=l.lazy,m=l.onUpdate,h=l.runBackwards,g=l.yoyoEase,_=l.keyframes,v=l.autoRevert,y=t._dur,x=t._startAt,S=t._targets,C=t.parent,w=C&&C.data===`nested`?C.vars.targets:S,T=t._overwrite===`auto`&&!i,E=t.timeline,D=l.easeReverse||g,O,k,A,j,M,N,F,ee,te,ne,re,ie,I;if(E&&(!_||!u)&&(u=`none`),t._ease=rn(u,r.ease),t._rEase=D&&(rn(D)||t._ease),t._from=!E&&!!l.runBackwards,t._from&&(t.ratio=1),!E||_&&!l.stagger){if(ee=S[0]?xe(S[0]).harness:0,ie=ee&&l[ee.prop],O=Fe(l,fe),x&&(x._zTime<0&&x.progress(1),n<0&&h&&f&&!v?x.render(-1,!0):x.revert(h&&y?ue:le),x._lazy=0),d){if(Be(t._startAt=Tn.set(S,je({data:`isStart`,overwrite:!1,parent:C,immediateRender:!0,lazy:!x&&b(p),startAt:null,delay:0,onUpdate:m&&function(){return Nt(t,`onUpdate`)},stagger:0},d))),t._startAt._dp=0,t._startAt._sat=t,n<0&&(a||!f&&!v)&&t._startAt.revert(ue),f&&y&&n<=0&&o<=0){n&&(t._zTime=n);return}}else if(h&&y&&!x){if(n&&(f=!1),A=je({overwrite:!1,data:`isFromStart`,lazy:f&&!x&&b(p),immediateRender:f,stagger:0,parent:C},O),ie&&(A[ee.prop]=ie),Be(t._startAt=Tn.set(S,A)),t._startAt._dp=0,t._startAt._sat=t,n<0&&(a?t._startAt.revert(ue):t._startAt.render(-1,!0)),t._zTime=n,!f)e(t._startAt,c,c);else if(!n)return}for(t._pt=t._ptCache=0,p=y&&b(p)||p&&!y,k=0;k<S.length;k++){if(M=S[k],F=M._gsap||L(S)[k]._gsap,t._ptLookup[k]=ne={},me[F.id]&&pe.length&&Ee(),re=w===S?k:w.indexOf(M),ee&&(te=new ee).init(M,ie||O,t,re,w)!==!1&&(t._pt=j=new zn(t._pt,M,te.name,0,1,te.render,te,0,te.priority),te._props.forEach(function(e){ne[e]=j}),te.priority&&(N=1)),!ee||ie)for(A in O)ge[A]&&(te=hn(A,O,t,re,M,w))?te.priority&&(N=1):ne[A]=j=pn.call(t,M,A,`get`,O[A],re,w,0,l.stringFilter);t._op&&t._op[k]&&t.kill(M,t._op[k]),T&&t._pt&&(gn=t,P.killTweensOf(M,ne,t.globalTime(n)),I=!t.parent,gn=0),t._pt&&p&&(me[F.id]=1)}N&&Rn(t),t._onInit&&t._onInit(t)}t._onUpdate=m,t._initted=(!t._op||t._pt)&&!I,_&&n<=0&&E.render(s,!0,!0)},yn=function(e,t,n,r,i,a,o,s){var c=(e._pt&&e._ptCache||(e._ptCache={}))[t],l,u,d,f;if(!c)for(c=e._ptCache[t]=[],d=e._ptLookup,f=e._targets.length;f--;){if(l=d[f][t],l&&l.d&&l.d._pt)for(l=l.d._pt;l&&l.p!==t&&l.fp!==t;)l=l._next;if(!l)return _n=1,e.vars[t]=`+=0`,vn(e,o),_n=0,s?oe(t+` not eligible for reset. Try splitting into individual properties`):1;c.push(l)}for(f=c.length;f--;)u=c[f],l=u._pt||u,l.s=(r||r===0)&&!i?r:l.s+(r||0)+a*l.c,l.c=n-l.s,u.e&&(u.e=R(n)+dt(u.e)),u.b&&(u.b=l.s+dt(u.b))},bn=function(e,t){var n=e[0]?xe(e[0]).harness:0,r=n&&n.aliases,i,a,o,s;if(!r)return t;for(a in i=Ne({},t),r)if(a in i)for(s=r[a].split(`,`),o=s.length;o--;)i[s[o]]=i[a];return i},xn=function(e,t,n,r){var i=t.ease||r||`power1.inOut`,a,o;if(w(t))o=n[e]||(n[e]=[]),t.forEach(function(e,n){return o.push({t:n/(t.length-1)*100,v:e,e:i})});else for(a in t)o=n[a]||(n[a]=[]),a===`ease`||o.push({t:parseFloat(e),v:t[a],e:i})},Sn=function(e,t,n,r,i){return g(e)?e.call(t,n,r,i):h(e)&&~e.indexOf(`random(`)?kt(e):e},Cn=be+`repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert`,wn={};Ce(Cn+`,id,stagger,delay,duration,paused,scrollTrigger`,function(e){return wn[e]=1});var Tn=function(r){t(o,r);function o(t,a,o,s){var l;typeof a==`number`&&(o.duration=a,a=o,o=null),l=r.call(this,s?a:Ie(a))||this;var u=l.vars,d=u.duration,f=u.delay,p=u.immediateRender,m=u.stagger,h=u.overwrite,g=u.keyframes,v=u.defaults,x=u.scrollTrigger,T=a.parent||P,E=(w(t)||C(t)?_(t[0]):`length`in a)?[t]:gt(t),D,O,k,A,j,M,N,F;if(l._targets=E.length?L(E):oe(`GSAP target `+t+` not found. https://gsap.com`,!n.nullTargetWarn)||[],l._ptLookup=[],l._overwrite=h,g||m||S(d)||S(f)){a=l.vars;var ee=a.easeReverse||a.yoyoEase;if(D=l.timeline=new dn({data:`nested`,defaults:v||{},targets:T&&T.data===`nested`?T.vars.targets:E}),D.kill(),D.parent=D._dp=e(l),D._start=0,m||S(d)||S(f)){if(A=E.length,N=m&&yt(m),y(m))for(j in m)~Cn.indexOf(j)&&(F||={},F[j]=m[j]);for(O=0;O<A;O++)k=Fe(a,wn),k.stagger=0,ee&&(k.easeReverse=ee),F&&Ne(k,F),M=E[O],k.duration=+Sn(d,e(l),O,M,E),k.delay=(+Sn(f,e(l),O,M,E)||0)-l._delay,!m&&A===1&&k.delay&&(l._delay=f=k.delay,l._start+=f,k.delay=0),D.to(M,k,N?N(O,M,E):0),D._ease=Xt.none;D.duration()?d=f=0:l.timeline=0}else if(g){Ie(je(D.vars.defaults,{ease:`none`})),D._ease=rn(g.ease||a.ease||`none`);var te=0,ne,re,ie;if(w(g))g.forEach(function(e){return D.to(E,e,`>`)}),D.duration();else{for(j in k={},g)j===`ease`||j===`easeEach`||xn(j,g[j],k,g.easeEach);for(j in k)for(ne=k[j].sort(function(e,t){return e.t-t.t}),te=0,O=0;O<ne.length;O++)re=ne[O],ie={ease:re.e,duration:(re.t-(O?ne[O-1].t:0))/100*d},ie[j]=re.v,D.to(E,ie,te),te+=ie.duration;D.duration()<d&&D.to({},{duration:d-D.duration()})}}d||l.duration(d=D.duration())}else l.timeline=0;return h===!0&&!i&&(gn=e(l),P.killTweensOf(E),gn=0),Ze(T,e(l),o),a.reversed&&l.reverse(),a.paused&&l.paused(!0),(p||!d&&!g&&l._start===we(T._time)&&b(p)&&We(e(l))&&T.data!==`nested`)&&(l._tTime=-c,l.render(Math.max(0,-f)||0)),x&&Qe(e(l),x),l}var s=o.prototype;return s.render=function(e,t,n){var r=this._time,i=this._tDur,a=this._dur,o=e<0,s=e>i-c&&!o?i:e<c?0:e,l,u,d,f,p,m,h,g;if(!a)nt(this,e,t,n);else if(s!==this._tTime||!e||n||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==o||this._lazy){if(l=s,g=this.timeline,this._repeat){if(f=a+this._rDelay,this._repeat<-1&&o)return this.totalTime(f*100+e,t,n);if(l=we(s%f),s===i?(d=this._repeat,l=a):(p=we(s/f),d=~~p,d&&d===p?(l=a,d--):l>a&&(l=a)),m=this._yoyo&&d&1,m&&(l=a-l),p=Ke(this._tTime,f),l===r&&!n&&this._initted&&d===p)return this._tTime=s,this;d!==p&&this.vars.repeatRefresh&&!m&&!this._lock&&l!==f&&this._initted&&(this._lock=n=1,this.render(we(f*d),!0).invalidate()._lock=0)}if(!this._initted){if($e(this,o?e:l,n,t,s))return this._tTime=0,this;if(r!==this._time&&!(n&&this.vars.repeatRefresh&&d!==p))return this;if(a!==this._dur)return this.render(e,t,n)}if(this._rEase){var _=l<r;if(_!==this._inv){var v=_?r:a-r;this._inv=_,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=r,this._invRecip=v?(_?-1:1)/v:0,this._invScale=_?-this.ratio:1-this.ratio,this._invEase=_?this._rEase:this._ease}this.ratio=h=this._invRatio+this._invScale*this._invEase((l-this._invTime)*this._invRecip)}else this.ratio=h=this._ease(l/a);if(this._from&&(this.ratio=h=1-h),this._tTime=s,this._time=l,!this._act&&this._ts&&(this._act=1,this._lazy=0),!r&&s&&!t&&!p&&(Nt(this,`onStart`),this._tTime!==s))return this;for(u=this._pt;u;)u.r(h,u.d),u=u._next;g&&g.render(e<0?e:g._dur*g._ease(l/this._dur),t,n)||this._startAt&&(this._zTime=e),this._onUpdate&&!t&&(o&&Ue(this,e,t,n),Nt(this,`onUpdate`)),this._repeat&&d!==p&&this.vars.onRepeat&&!t&&this.parent&&Nt(this,`onRepeat`),(s===this._tDur||!s)&&this._tTime===s&&(o&&!this._onUpdate&&Ue(this,e,!0,!0),(e||!a)&&(s===this._tDur&&this._ts>0||!s&&this._ts<0)&&Be(this,1),!t&&(!o||r)&&(s||r||m)&&(Nt(this,s===i?`onComplete`:`onReverseComplete`,!0),this._prom&&!(s<i&&this.timeScale()>0)&&this._prom()))}return this},s.targets=function(){return this._targets},s.invalidate=function(e){return(!e||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(e),r.prototype.invalidate.call(this,e)},s.resetTo=function(e,t,n,r,i){qt||Jt.wake(),this._ts||this.play();var a=Math.min(this._dur,(this._dp._time-this._start)*this._ts),o;return this._initted||vn(this,a),o=this._ease(a/this._dur),yn(this,e,t,n,r,o,a,i)?this.resetTo(e,t,n,r,1):(Ye(this,0),this.parent||Re(this._dp,this,`_first`,`_last`,this._dp._sort?`_start`:0),this.render(0))},s.kill=function(e,t){if(t===void 0&&(t=`all`),!e&&(!t||t===`all`))return this._lazy=this._pt=0,this.parent?Pt(this):this.scrollTrigger&&this.scrollTrigger.kill(!!a),this;if(this.timeline){var n=this.timeline.totalDuration();return this.timeline.killTweensOf(e,t,gn&&gn.vars.overwrite!==!0)._first||Pt(this),this.parent&&n!==this.timeline.totalDuration()&&it(this,this._dur*this.timeline._tDur/n,0,1),this}var r=this._targets,i=e?gt(e):r,o=this._ptLookup,s=this._pt,c,l,u,d,f,p,m;if((!t||t===`all`)&&Le(r,i))return t===`all`&&(this._pt=0),Pt(this);for(c=this._op=this._op||[],t!==`all`&&(h(t)&&(f={},Ce(t,function(e){return f[e]=1}),t=f),t=bn(r,t)),m=r.length;m--;)if(~i.indexOf(r[m]))for(f in l=o[m],t===`all`?(c[m]=t,d=l,u={}):(u=c[m]=c[m]||{},d=t),d)p=l&&l[f],p&&((!(`kill`in p.d)||p.d.kill(f)===!0)&&ze(this,p,`_pt`),delete l[f]),u!==`all`&&(u[f]=1);return this._initted&&!this._pt&&s&&Pt(this),this},o.to=function(e,t){return new o(e,t,arguments[2])},o.from=function(e,t){return ct(1,arguments)},o.delayedCall=function(e,t,n,r){return new o(t,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:e,onComplete:t,onReverseComplete:t,onCompleteParams:n,onReverseCompleteParams:n,callbackScope:r})},o.fromTo=function(e,t,n){return ct(2,arguments)},o.set=function(e,t){return t.duration=0,t.repeatDelay||(t.repeat=0),new o(e,t)},o.killTweensOf=function(e,t,n){return P.killTweensOf(e,t,n)},o}(un);je(Tn.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0}),Ce(`staggerTo,staggerFrom,staggerFromTo`,function(e){Tn[e]=function(){var t=new dn,n=pt.call(arguments,0);return n.splice(e===`staggerFromTo`?5:4,0,0),t[e].apply(t,n)}});var En=function(e,t,n){return e[t]=n},Dn=function(e,t,n){return e[t](n)},On=function(e,t,n,r){return e[t](r.fp,n)},kn=function(e,t,n){return e.setAttribute(t,n)},An=function(e,t){return g(e[t])?Dn:v(e[t])&&e.setAttribute?kn:En},jn=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e6)/1e6,t)},Mn=function(e,t){return t.set(t.t,t.p,!!(t.s+t.c*e),t)},Nn=function(e,t){var n=t._pt,r=``;if(!e&&t.b)r=t.b;else if(e===1&&t.e)r=t.e;else{for(;n;)r=n.p+(n.m?n.m(n.s+n.c*e):Math.round((n.s+n.c*e)*1e4)/1e4)+r,n=n._next;r+=t.c}t.set(t.t,t.p,r,t)},Pn=function(e,t){for(var n=t._pt;n;)n.r(e,n.d),n=n._next},Fn=function(e,t,n,r){for(var i=this._pt,a;i;)a=i._next,i.p===r&&i.modifier(e,t,n),i=a},In=function(e){for(var t=this._pt,n,r;t;)r=t._next,t.p===e&&!t.op||t.op===e?ze(this,t,`_pt`):t.dep||(n=1),t=r;return!n},Ln=function(e,t,n,r){r.mSet(e,t,r.m.call(r.tween,n,r.mt),r)},Rn=function(e){for(var t=e._pt,n,r,i,a;t;){for(n=t._next,r=i;r&&r.pr>t.pr;)r=r._next;(t._prev=r?r._prev:a)?t._prev._next=t:i=t,(t._next=r)?r._prev=t:a=t,t=n}e._pt=i},zn=function(){function e(e,t,n,r,i,a,o,s,c){this.t=t,this.s=r,this.c=i,this.p=n,this.r=a||jn,this.d=o||this,this.set=s||En,this.pr=c||0,this._next=e,e&&(e._prev=this)}var t=e.prototype;return t.modifier=function(e,t,n){this.mSet=this.mSet||this.set,this.set=Ln,this.m=e,this.mt=n,this.tween=t},e}();Ce(be+`parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse`,function(e){return fe[e]=1}),ne.TweenMax=ne.TweenLite=Tn,ne.TimelineLite=ne.TimelineMax=dn,P=new dn({sortChildren:!1,defaults:r,autoRemoveChildren:!0,id:`root`,smoothChildTiming:!0}),n.stringFilter=Kt;var Bn=[],Vn={},Hn=[],Un=0,Wn=0,Gn=function(e){return(Vn[e]||Hn).map(function(e){return e()})},Kn=function(){var e=Date.now(),t=[];e-Un>2&&(Gn(`matchMediaInit`),Bn.forEach(function(e){var n=e.queries,r=e.conditions,i,a,o,s;for(a in n)i=F.matchMedia(n[a]).matches,i&&(o=1),i!==r[a]&&(r[a]=i,s=1);s&&(e.revert(),o&&t.push(e))}),Gn(`matchMediaRevert`),t.forEach(function(e){return e.onMatch(e,function(t){return e.add(null,t)})}),Un=e,Gn(`matchMedia`))},qn=function(){function e(e,t){this.selector=t&&_t(t),this.data=[],this._r=[],this.isReverted=!1,this.id=Wn++,e&&this.add(e)}var t=e.prototype;return t.add=function(e,t,n){g(e)&&(n=t,t=e,e=g);var r=this,i=function(){var e=o,i=r.selector,a;return e&&e!==r&&e.data.push(r),n&&(r.selector=_t(n)),o=r,a=t.apply(r,arguments),g(a)&&r._r.push(a),o=e,r.selector=i,r.isReverted=!1,a};return r.last=i,e===g?i(r,function(e){return r.add(null,e)}):e?r[e]=i:i},t.ignore=function(e){var t=o;o=null,e(this),o=t},t.getTweens=function(){var t=[];return this.data.forEach(function(n){return n instanceof e?t.push.apply(t,n.getTweens()):n instanceof Tn&&!(n.parent&&n.parent.data===`nested`)&&t.push(n)}),t},t.clear=function(){this._r.length=this.data.length=0},t.kill=function(e,t){var n=this;if(e?(function(){for(var t=n.getTweens(),r=n.data.length,i;r--;)i=n.data[r],i.data===`isFlip`&&(i.revert(),i.getChildren(!0,!0,!1).forEach(function(e){return t.splice(t.indexOf(e),1)}));for(t.map(function(e){return{g:e._dur||e._delay||e._sat&&!e._sat.vars.immediateRender?e.globalTime(0):-1/0,t:e}}).sort(function(e,t){return t.g-e.g||-1/0}).forEach(function(t){return t.t.revert(e)}),r=n.data.length;r--;)i=n.data[r],i instanceof dn?i.data!==`nested`&&(i.scrollTrigger&&i.scrollTrigger.revert(),i.kill()):!(i instanceof Tn)&&i.revert&&i.revert(e);n._r.forEach(function(t){return t(e,n)}),n.isReverted=!0})():this.data.forEach(function(e){return e.kill&&e.kill()}),this.clear(),t)for(var r=Bn.length;r--;)Bn[r].id===this.id&&Bn.splice(r,1)},t.revert=function(e){this.kill(e||{})},e}(),Jn=function(){function e(e){this.contexts=[],this.scope=e,o&&o.data.push(this)}var t=e.prototype;return t.add=function(e,t,n){y(e)||(e={matches:e});var r=new qn(0,n||this.scope),i=r.conditions={},a,s,c;for(s in o&&!r.selector&&(r.selector=o.selector),this.contexts.push(r),t=r.add(`onMatch`,t),r.queries=e,e)s===`all`?c=1:(a=F.matchMedia(e[s]),a&&(Bn.indexOf(r)<0&&Bn.push(r),(i[s]=a.matches)&&(c=1),a.addListener?a.addListener(Kn):a.addEventListener(`change`,Kn)));return c&&t(r,function(e){return r.add(null,e)}),this},t.revert=function(e){this.kill(e||{})},t.kill=function(e){this.contexts.forEach(function(t){return t.kill(e,!0)})},e}(),Yn={registerPlugin:function(){[...arguments].forEach(function(e){return Lt(e)})},timeline:function(e){return new dn(e)},getTweensOf:function(e,t){return P.getTweensOf(e,t)},getProperty:function(e,t,n,r){h(e)&&(e=gt(e)[0]);var i=xe(e||{}).get,a=n?Ae:ke;return n===`native`&&(n=``),e&&(t?a((ge[t]&&ge[t].get||i)(e,t,n,r)):function(t,n,r){return a((ge[t]&&ge[t].get||i)(e,t,n,r))})},quickSetter:function(e,t,n){if(e=gt(e),e.length>1){var r=e.map(function(e){return $n.quickSetter(e,t,n)}),i=r.length;return function(e){for(var t=i;t--;)r[t](e)}}e=e[0]||{};var a=ge[t],o=xe(e),s=o.harness&&(o.harness.aliases||{})[t]||t,c=a?function(t){var r=new a;Ft._pt=0,r.init(e,n?t+n:t,Ft,0,[e]),r.render(1,r),Ft._pt&&Pn(1,Ft)}:o.set(e,s);return a?c:function(t){return c(e,s,n?t+n:t,o,1)}},quickTo:function(e,t,n){var r,i=$n.to(e,je((r={},r[t]=`+=0.1`,r.paused=!0,r.stagger=0,r),n||{})),a=function(e,n,r){return i.resetTo(t,e,n,r)};return a.tween=i,a},isTweening:function(e){return P.getTweensOf(e,!0).length>0},defaults:function(e){return e&&e.ease&&(e.ease=rn(e.ease,r.ease)),Pe(r,e||{})},config:function(e){return Pe(n,e||{})},registerEffect:function(e){var t=e.name,n=e.effect,r=e.plugins,i=e.defaults,a=e.extendTimeline;(r||``).split(`,`).forEach(function(e){return e&&!ge[e]&&!ne[e]&&oe(t+` effect requires `+e+` plugin.`)}),_e[t]=function(e,t,r){return n(gt(e),je(t||{},i),r)},a&&(dn.prototype[t]=function(e,n,r){return this.add(_e[t](e,y(n)?n:(r=n)&&{},this),r)})},registerEase:function(e,t){Xt[e]=rn(t)},parseEase:function(e,t){return arguments.length?rn(e,t):Xt},getById:function(e){return P.getById(e)},exportRoot:function(e,t){e===void 0&&(e={});var n=new dn(e),r,i;for(n.smoothChildTiming=b(e.smoothChildTiming),P.remove(n),n._dp=0,n._time=n._tTime=P._time,r=P._first;r;)i=r._next,(t||!(!r._dur&&r instanceof Tn&&r.vars.onComplete===r._targets[0]))&&Ze(n,r,r._start-r._delay),r=i;return Ze(P,n,0),n},context:function(e,t){return e?new qn(e,t):o},matchMedia:function(e){return new Jn(e)},matchMediaRefresh:function(){return Bn.forEach(function(e){var t=e.conditions,n,r;for(r in t)t[r]&&(t[r]=!1,n=1);n&&e.revert()})||Kn()},addEventListener:function(e,t){var n=Vn[e]||(Vn[e]=[]);~n.indexOf(t)||n.push(t)},removeEventListener:function(e,t){var n=Vn[e],r=n&&n.indexOf(t);r>=0&&n.splice(r,1)},utils:{wrap:Dt,wrapYoyo:Ot,distribute:yt,random:St,snap:xt,normalize:Tt,getUnit:dt,clamp:ft,splitColor:Vt,toArray:gt,selector:_t,mapRange:At,pipe:Ct,unitize:wt,interpolate:jt,shuffle:vt},install:I,effects:_e,ticker:Jt,updateRoot:dn.updateRoot,plugins:ge,globalTimeline:P,core:{PropTween:zn,globals:se,Tween:Tn,Timeline:dn,Animation:un,getCache:xe,_removeLinkedListItem:ze,reverting:function(){return a},context:function(e){return e&&o&&(o.data.push(e),e._ctx=o),o},suppressOverwrites:function(e){return i=e}}};Ce(`to,from,fromTo,delayedCall,set,killTweensOf`,function(e){return Yn[e]=Tn[e]}),Jt.add(dn.updateRoot),Ft=Yn.to({},{duration:0});var Xn=function(e,t){for(var n=e._pt;n&&n.p!==t&&n.op!==t&&n.fp!==t;)n=n._next;return n},Zn=function(e,t){var n=e._targets,r,i,a;for(r in t)for(i=n.length;i--;)a=e._ptLookup[i][r],(a&&=a.d)&&(a._pt&&(a=Xn(a,r)),a&&a.modifier&&a.modifier(t[r],e,n[i],r))},Qn=function(e,t){return{name:e,headless:1,rawVars:1,init:function(e,n,r){r._onInit=function(e){var r,i;if(h(n)&&(r={},Ce(n,function(e){return r[e]=1}),n=r),t){for(i in r={},n)r[i]=t(n[i]);n=r}Zn(e,n)}}}},$n=Yn.registerPlugin({name:`attr`,init:function(e,t,n,r,i){var a,o,s;for(a in this.tween=n,t)s=e.getAttribute(a)||``,o=this.add(e,`setAttribute`,(s||0)+``,t[a],r,i,0,0,a),o.op=a,o.b=s,this._props.push(a)},render:function(e,t){for(var n=t._pt;n;)a?n.set(n.t,n.p,n.b,n):n.r(e,n.d),n=n._next}},{name:`endArray`,headless:1,init:function(e,t){for(var n=t.length;n--;)this.add(e,n,e[n]||0,t[n],0,0,0,0,0,1)}},Qn(`roundProps`,bt),Qn(`modifiers`),Qn(`snap`,xt))||Yn;Tn.version=dn.version=$n.version=`3.15.0`,ie=1,x()&&Yt(),Xt.Power0,Xt.Power1,Xt.Power2,Xt.Power3,Xt.Power4,Xt.Linear,Xt.Quad,Xt.Cubic,Xt.Quart,Xt.Quint,Xt.Strong,Xt.Elastic,Xt.Back,Xt.SteppedEase,Xt.Bounce,Xt.Sine,Xt.Expo,Xt.Circ;var er,tr,nr,rr,ir,ar,or,sr=function(){return typeof window<`u`},cr={},lr=180/Math.PI,ur=Math.PI/180,dr=Math.atan2,fr=1e8,pr=/([A-Z])/g,mr=/(left|right|width|margin|padding|x)/i,hr=/[\s,\(]\S/,gr={autoAlpha:`opacity,visibility`,scale:`scaleX,scaleY`,alpha:`opacity`},_r=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},vr=function(e,t){return t.set(t.t,t.p,e===1?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},yr=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},br=function(e,t){return t.set(t.t,t.p,e===1?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},xr=function(e,t){var n=t.s+t.c*e;t.set(t.t,t.p,~~(n+(n<0?-.5:.5))+t.u,t)},Sr=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},Cr=function(e,t){return t.set(t.t,t.p,e===1?t.e:t.b,t)},wr=function(e,t,n){return e.style[t]=n},Tr=function(e,t,n){return e.style.setProperty(t,n)},Er=function(e,t,n){return e._gsap[t]=n},Dr=function(e,t,n){return e._gsap.scaleX=e._gsap.scaleY=n},Or=function(e,t,n,r,i){var a=e._gsap;a.scaleX=a.scaleY=n,a.renderTransform(i,a)},kr=function(e,t,n,r,i){var a=e._gsap;a[t]=n,a.renderTransform(i,a)},Ar=`transform`,jr=Ar+`Origin`,Mr=function e(t,n){var r=this,i=this.target,a=i.style,o=i._gsap;if(t in cr&&a){if(this.tfm=this.tfm||{},t!==`transform`)t=gr[t]||t,~t.indexOf(`,`)?t.split(`,`).forEach(function(e){return r.tfm[e]=Zr(i,e)}):this.tfm[t]=o.x?o[t]:Zr(i,t),t===jr&&(this.tfm.zOrigin=o.zOrigin);else return gr.transform.split(`,`).forEach(function(t){return e.call(r,t,n)});if(this.props.indexOf(Ar)>=0)return;o.svg&&(this.svgo=i.getAttribute(`data-svg-origin`),this.props.push(jr,n,``)),t=Ar}(a||n)&&this.props.push(t,n,a[t])},Nr=function(e){e.translate&&(e.removeProperty(`translate`),e.removeProperty(`scale`),e.removeProperty(`rotate`))},Pr=function(){for(var e=this.props,t=this.target,n=t.style,r=t._gsap,i=0,a;i<e.length;i+=3)e[i+1]?e[i+1]===2?t[e[i]](e[i+2]):t[e[i]]=e[i+2]:e[i+2]?n[e[i]]=e[i+2]:n.removeProperty(e[i].substr(0,2)===`--`?e[i]:e[i].replace(pr,`-$1`).toLowerCase());if(this.tfm){for(a in this.tfm)r[a]=this.tfm[a];r.svg&&(r.renderTransform(),t.setAttribute(`data-svg-origin`,this.svgo||``)),i=or(),(!i||!i.isStart)&&!n[Ar]&&(Nr(n),r.zOrigin&&n[jr]&&(n[jr]+=` `+r.zOrigin+`px`,r.zOrigin=0,r.renderTransform()),r.uncache=1)}},Fr=function(e,t){var n={target:e,props:[],revert:Pr,save:Mr};return e._gsap||$n.core.getCache(e),t&&e.style&&e.nodeType&&t.split(`,`).forEach(function(e){return n.save(e)}),n},Ir,Lr=function(e,t){var n=tr.createElementNS?tr.createElementNS((t||`http://www.w3.org/1999/xhtml`).replace(/^https/,`http`),e):tr.createElement(e);return n&&n.style?n:tr.createElement(e)},Rr=function e(t,n,r){var i=getComputedStyle(t);return i[n]||i.getPropertyValue(n.replace(pr,`-$1`).toLowerCase())||i.getPropertyValue(n)||!r&&e(t,Br(n)||n,1)||``},zr=`O,Moz,ms,Ms,Webkit`.split(`,`),Br=function(e,t,n){var r=(t||ir).style,i=5;if(e in r&&!n)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);i--&&!(zr[i]+e in r););return i<0?null:(i===3?`ms`:i>=0?zr[i]:``)+e},Vr=function(){sr()&&window.document&&(er=window,tr=er.document,nr=tr.documentElement,ir=Lr(`div`)||{style:{}},Lr(`div`),Ar=Br(Ar),jr=Ar+`Origin`,ir.style.cssText=`border-width:0;line-height:0;position:absolute;padding:0`,Ir=!!Br(`perspective`),or=$n.core.reverting,rr=1)},Hr=function(e){var t=e.ownerSVGElement,n=Lr(`svg`,t&&t.getAttribute(`xmlns`)||`http://www.w3.org/2000/svg`),r=e.cloneNode(!0),i;r.style.display=`block`,n.appendChild(r),nr.appendChild(n);try{i=r.getBBox()}catch{}return n.removeChild(r),nr.removeChild(n),i},Ur=function(e,t){for(var n=t.length;n--;)if(e.hasAttribute(t[n]))return e.getAttribute(t[n])},Wr=function(e){var t,n;try{t=e.getBBox()}catch{t=Hr(e),n=1}return t&&(t.width||t.height)||n||(t=Hr(e)),t&&!t.width&&!t.x&&!t.y?{x:+Ur(e,[`x`,`cx`,`x1`])||0,y:+Ur(e,[`y`,`cy`,`y1`])||0,width:0,height:0}:t},Gr=function(e){return!(!e.getCTM||e.parentNode&&!e.ownerSVGElement||!Wr(e))},Kr=function(e,t){if(t){var n=e.style,r;t in cr&&t!==jr&&(t=Ar),n.removeProperty?(r=t.substr(0,2),(r===`ms`||t.substr(0,6)===`webkit`)&&(t=`-`+t),n.removeProperty(r===`--`?t:t.replace(pr,`-$1`).toLowerCase())):n.removeAttribute(t)}},qr=function(e,t,n,r,i,a){var o=new zn(e._pt,t,n,0,1,a?Cr:Sr);return e._pt=o,o.b=r,o.e=i,e._props.push(n),o},Jr={deg:1,rad:1,turn:1},Yr={grid:1,flex:1},Xr=function e(t,n,r,i){var a=parseFloat(r)||0,o=(r+``).trim().substr((a+``).length)||`px`,s=ir.style,c=mr.test(n),l=t.tagName.toLowerCase()===`svg`,u=(l?`client`:`offset`)+(c?`Width`:`Height`),d=100,f=i===`px`,p=i===`%`,m,h,g,_;if(i===o||!a||Jr[i]||Jr[o])return a;if(o!==`px`&&!f&&(a=e(t,n,r,`px`)),_=t.getCTM&&Gr(t),(p||o===`%`)&&(cr[n]||~n.indexOf(`adius`)))return m=_?t.getBBox()[c?`width`:`height`]:t[u],R(p?a/m*d:a/100*m);if(s[c?`width`:`height`]=d+(f?o:i),h=i!==`rem`&&~n.indexOf(`adius`)||i===`em`&&t.appendChild&&!l?t:t.parentNode,_&&(h=(t.ownerSVGElement||{}).parentNode),(!h||h===tr||!h.appendChild)&&(h=tr.body),g=h._gsap,g&&p&&g.width&&c&&g.time===Jt.time&&!g.uncache)return R(a/g.width*d);if(p&&(n===`height`||n===`width`)){var v=t.style[n];t.style[n]=d+i,m=t[u],v?t.style[n]=v:Kr(t,n)}else(p||o===`%`)&&!Yr[Rr(h,`display`)]&&(s.position=Rr(t,`position`)),h===t&&(s.position=`static`),h.appendChild(ir),m=ir[u],h.removeChild(ir),s.position=`absolute`;return c&&p&&(g=xe(h),g.time=Jt.time,g.width=h[u]),R(f?m*a/d:m&&a?d/m*a:0)},Zr=function(e,t,n,r){var i;return rr||Vr(),t in gr&&t!==`transform`&&(t=gr[t],~t.indexOf(`,`)&&(t=t.split(`,`)[0])),cr[t]&&t!==`transform`?(i=li(e,r),i=t===`transformOrigin`?i.svg?i.origin:ui(Rr(e,jr))+` `+i.zOrigin+`px`:i[t]):(i=e.style[t],(!i||i===`auto`||r||~(i+``).indexOf(`calc(`))&&(i=ni[t]&&ni[t](e,t,n)||Rr(e,t)||Se(e,t)||+(t===`opacity`))),n&&!~(i+``).trim().indexOf(` `)?Xr(e,t,i,n)+n:i},Qr=function(e,t,r,i){if(!r||r===`none`){var a=Br(t,e,1),o=a&&Rr(e,a,1);o&&o!==r?(t=a,r=o):t===`borderColor`&&(r=Rr(e,`borderTopColor`))}var s=new zn(this._pt,e.style,t,0,1,Nn),c=0,l=0,u,d,f,p,m,h,g,_,v,y,b,x;if(s.b=r,s.e=i,r+=``,i+=``,i.substring(0,6)===`var(--`&&(i=Rr(e,i.substring(4,i.indexOf(`)`)))),i===`auto`&&(h=e.style[t],e.style[t]=i,i=Rr(e,t)||i,h?e.style[t]=h:Kr(e,t)),u=[r,i],Kt(u),r=u[0],i=u[1],f=r.match(k)||[],x=i.match(k)||[],x.length){for(;d=k.exec(i);)g=d[0],v=i.substring(c,d.index),m?m=(m+1)%5:(v.substr(-5)===`rgba(`||v.substr(-5)===`hsla(`)&&(m=1),g!==(h=f[l++]||``)&&(p=parseFloat(h)||0,b=h.substr((p+``).length),g.charAt(1)===`=`&&(g=z(p,g)+b),_=parseFloat(g),y=g.substr((_+``).length),c=k.lastIndex-y.length,y||(y=y||n.units[t]||b,c===i.length&&(i+=y,s.e+=y)),b!==y&&(p=Xr(e,t,h,y)||0),s._pt={_next:s._pt,p:v||l===1?v:`,`,s:p,c:_-p,m:m&&m<4||t===`zIndex`?Math.round:0});s.c=c<i.length?i.substring(c,i.length):``}else s.r=t===`display`&&i===`none`?Cr:Sr;return j.test(i)&&(s.e=0),this._pt=s,s},$r={top:`0%`,bottom:`100%`,left:`0%`,right:`100%`,center:`50%`},ei=function(e){var t=e.split(` `),n=t[0],r=t[1]||`50%`;return(n===`top`||n===`bottom`||r===`left`||r===`right`)&&(e=n,n=r,r=e),t[0]=$r[n]||n,t[1]=$r[r]||r,t.join(` `)},ti=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var n=t.t,r=n.style,i=t.u,a=n._gsap,o,s,c;if(i===`all`||i===!0)r.cssText=``,s=1;else for(i=i.split(`,`),c=i.length;--c>-1;)o=i[c],cr[o]&&(s=1,o=o===`transformOrigin`?jr:Ar),Kr(n,o);s&&(Kr(n,Ar),a&&(a.svg&&n.removeAttribute(`transform`),r.scale=r.rotate=r.translate=`none`,li(n,1),a.uncache=1,Nr(r)))}},ni={clearProps:function(e,t,n,r,i){if(i.data!==`isFromStart`){var a=e._pt=new zn(e._pt,t,n,0,0,ti);return a.u=r,a.pr=-10,a.tween=i,e._props.push(n),1}}},ri=[1,0,0,1,0,0],ii={},ai=function(e){return e===`matrix(1, 0, 0, 1, 0, 0)`||e===`none`||!e},oi=function(e){var t=Rr(e,Ar);return ai(t)?ri:t.substr(7).match(O).map(R)},si=function(e,t){var n=e._gsap||xe(e),r=e.style,i=oi(e),a,o,s,c;return n.svg&&e.getAttribute(`transform`)?(s=e.transform.baseVal.consolidate().matrix,i=[s.a,s.b,s.c,s.d,s.e,s.f],i.join(`,`)===`1,0,0,1,0,0`?ri:i):(i===ri&&!e.offsetParent&&e!==nr&&!n.svg&&(s=r.display,r.display=`block`,a=e.parentNode,(!a||!e.offsetParent&&!e.getBoundingClientRect().width)&&(c=1,o=e.nextElementSibling,nr.appendChild(e)),i=oi(e),s?r.display=s:Kr(e,`display`),c&&(o?a.insertBefore(e,o):a?a.appendChild(e):nr.removeChild(e))),t&&i.length>6?[i[0],i[1],i[4],i[5],i[12],i[13]]:i)},ci=function(e,t,n,r,i,a){var o=e._gsap,s=i||si(e,!0),c=o.xOrigin||0,l=o.yOrigin||0,u=o.xOffset||0,d=o.yOffset||0,f=s[0],p=s[1],m=s[2],h=s[3],g=s[4],_=s[5],v=t.split(` `),y=parseFloat(v[0])||0,b=parseFloat(v[1])||0,x,S,C,w;n?s!==ri&&(S=f*h-p*m)&&(C=h/S*y+b*(-m/S)+(m*_-h*g)/S,w=y*(-p/S)+f/S*b-(f*_-p*g)/S,y=C,b=w):(x=Wr(e),y=x.x+(~v[0].indexOf(`%`)?y/100*x.width:y),b=x.y+(~(v[1]||v[0]).indexOf(`%`)?b/100*x.height:b)),r||r!==!1&&o.smooth?(g=y-c,_=b-l,o.xOffset=u+(g*f+_*m)-g,o.yOffset=d+(g*p+_*h)-_):o.xOffset=o.yOffset=0,o.xOrigin=y,o.yOrigin=b,o.smooth=!!r,o.origin=t,o.originIsAbsolute=!!n,e.style[jr]=`0px 0px`,a&&(qr(a,o,`xOrigin`,c,y),qr(a,o,`yOrigin`,l,b),qr(a,o,`xOffset`,u,o.xOffset),qr(a,o,`yOffset`,d,o.yOffset)),e.setAttribute(`data-svg-origin`,y+` `+b)},li=function(e,t){var r=e._gsap||new ln(e);if(`x`in r&&!t&&!r.uncache)return r;var i=e.style,a=r.scaleX<0,o=`px`,s=`deg`,c=getComputedStyle(e),l=Rr(e,jr)||`0`,u=d=f=h=g=_=v=y=b=0,d,f,p=m=1,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,ee,te,ne,re,ie,I;return r.svg=!!(e.getCTM&&Gr(e)),c.translate&&((c.translate!==`none`||c.scale!==`none`||c.rotate!==`none`)&&(i[Ar]=(c.translate===`none`?``:`translate3d(`+(c.translate+` 0 0`).split(` `).slice(0,3).join(`, `)+`) `)+(c.rotate===`none`?``:`rotate(`+c.rotate+`) `)+(c.scale===`none`?``:`scale(`+c.scale.split(` `).join(`,`)+`) `)+(c[Ar]===`none`?``:c[Ar])),i.scale=i.rotate=i.translate=`none`),C=si(e,r.svg),r.svg&&(r.uncache?(P=e.getBBox(),l=r.xOrigin-P.x+`px `+(r.yOrigin-P.y)+`px`,N=``):N=!t&&e.getAttribute(`data-svg-origin`),ci(e,N||l,!!N||r.originIsAbsolute,r.smooth!==!1,C)),x=r.xOrigin||0,S=r.yOrigin||0,C!==ri&&(D=C[0],O=C[1],k=C[2],A=C[3],u=j=C[4],d=M=C[5],C.length===6?(p=Math.sqrt(D*D+O*O),m=Math.sqrt(A*A+k*k),h=D||O?dr(O,D)*lr:0,v=k||A?dr(k,A)*lr+h:0,v&&(m*=Math.abs(Math.cos(v*ur))),r.svg&&(u-=x-(x*D+S*k),d-=S-(x*O+S*A))):(I=C[6],re=C[7],ee=C[8],te=C[9],ne=C[10],ie=C[11],u=C[12],d=C[13],f=C[14],w=dr(I,ne),g=w*lr,w&&(T=Math.cos(-w),E=Math.sin(-w),N=j*T+ee*E,P=M*T+te*E,F=I*T+ne*E,ee=j*-E+ee*T,te=M*-E+te*T,ne=I*-E+ne*T,ie=re*-E+ie*T,j=N,M=P,I=F),w=dr(-k,ne),_=w*lr,w&&(T=Math.cos(-w),E=Math.sin(-w),N=D*T-ee*E,P=O*T-te*E,F=k*T-ne*E,ie=A*E+ie*T,D=N,O=P,k=F),w=dr(O,D),h=w*lr,w&&(T=Math.cos(w),E=Math.sin(w),N=D*T+O*E,P=j*T+M*E,O=O*T-D*E,M=M*T-j*E,D=N,j=P),g&&Math.abs(g)+Math.abs(h)>359.9&&(g=h=0,_=180-_),p=R(Math.sqrt(D*D+O*O+k*k)),m=R(Math.sqrt(M*M+I*I)),w=dr(j,M),v=Math.abs(w)>2e-4?w*lr:0,b=ie?1/(ie<0?-ie:ie):0),r.svg&&(N=e.getAttribute(`transform`),r.forceCSS=e.setAttribute(`transform`,``)||!ai(Rr(e,Ar)),N&&e.setAttribute(`transform`,N))),Math.abs(v)>90&&Math.abs(v)<270&&(a?(p*=-1,v+=h<=0?180:-180,h+=h<=0?180:-180):(m*=-1,v+=v<=0?180:-180)),t||=r.uncache,r.x=u-((r.xPercent=u&&(!t&&r.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-u)?-50:0)))?e.offsetWidth*r.xPercent/100:0)+o,r.y=d-((r.yPercent=d&&(!t&&r.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-d)?-50:0)))?e.offsetHeight*r.yPercent/100:0)+o,r.z=f+o,r.scaleX=R(p),r.scaleY=R(m),r.rotation=R(h)+s,r.rotationX=R(g)+s,r.rotationY=R(_)+s,r.skewX=v+s,r.skewY=y+s,r.transformPerspective=b+o,(r.zOrigin=parseFloat(l.split(` `)[2])||!t&&r.zOrigin||0)&&(i[jr]=ui(l)),r.xOffset=r.yOffset=0,r.force3D=n.force3D,r.renderTransform=r.svg?_i:Ir?gi:fi,r.uncache=0,r},ui=function(e){return(e=e.split(` `))[0]+` `+e[1]},di=function(e,t,n){var r=dt(t);return R(parseFloat(t)+parseFloat(Xr(e,`x`,n+`px`,r)))+r},fi=function(e,t){t.z=`0px`,t.rotationY=t.rotationX=`0deg`,t.force3D=0,gi(e,t)},pi=`0deg`,mi=`0px`,hi=`) `,gi=function(e,t){var n=t||this,r=n.xPercent,i=n.yPercent,a=n.x,o=n.y,s=n.z,c=n.rotation,l=n.rotationY,u=n.rotationX,d=n.skewX,f=n.skewY,p=n.scaleX,m=n.scaleY,h=n.transformPerspective,g=n.force3D,_=n.target,v=n.zOrigin,y=``,b=g===`auto`&&e&&e!==1||g===!0;if(v&&(u!==pi||l!==pi)){var x=parseFloat(l)*ur,S=Math.sin(x),C=Math.cos(x),w;x=parseFloat(u)*ur,w=Math.cos(x),a=di(_,a,S*w*-v),o=di(_,o,-Math.sin(x)*-v),s=di(_,s,C*w*-v+v)}h!==mi&&(y+=`perspective(`+h+hi),(r||i)&&(y+=`translate(`+r+`%, `+i+`%) `),(b||a!==mi||o!==mi||s!==mi)&&(y+=s!==mi||b?`translate3d(`+a+`, `+o+`, `+s+`) `:`translate(`+a+`, `+o+hi),c!==pi&&(y+=`rotate(`+c+hi),l!==pi&&(y+=`rotateY(`+l+hi),u!==pi&&(y+=`rotateX(`+u+hi),(d!==pi||f!==pi)&&(y+=`skew(`+d+`, `+f+hi),(p!==1||m!==1)&&(y+=`scale(`+p+`, `+m+hi),_.style[Ar]=y||`translate(0, 0)`},_i=function(e,t){var n=t||this,r=n.xPercent,i=n.yPercent,a=n.x,o=n.y,s=n.rotation,c=n.skewX,l=n.skewY,u=n.scaleX,d=n.scaleY,f=n.target,p=n.xOrigin,m=n.yOrigin,h=n.xOffset,g=n.yOffset,_=n.forceCSS,v=parseFloat(a),y=parseFloat(o),b,x,S,C,w;s=parseFloat(s),c=parseFloat(c),l=parseFloat(l),l&&(l=parseFloat(l),c+=l,s+=l),s||c?(s*=ur,c*=ur,b=Math.cos(s)*u,x=Math.sin(s)*u,S=Math.sin(s-c)*-d,C=Math.cos(s-c)*d,c&&(l*=ur,w=Math.tan(c-l),w=Math.sqrt(1+w*w),S*=w,C*=w,l&&(w=Math.tan(l),w=Math.sqrt(1+w*w),b*=w,x*=w)),b=R(b),x=R(x),S=R(S),C=R(C)):(b=u,C=d,x=S=0),(v&&!~(a+``).indexOf(`px`)||y&&!~(o+``).indexOf(`px`))&&(v=Xr(f,`x`,a,`px`),y=Xr(f,`y`,o,`px`)),(p||m||h||g)&&(v=R(v+p-(p*b+m*S)+h),y=R(y+m-(p*x+m*C)+g)),(r||i)&&(w=f.getBBox(),v=R(v+r/100*w.width),y=R(y+i/100*w.height)),w=`matrix(`+b+`,`+x+`,`+S+`,`+C+`,`+v+`,`+y+`)`,f.setAttribute(`transform`,w),_&&(f.style[Ar]=w)},vi=function(e,t,n,r,i){var a=360,o=h(i),s=parseFloat(i)*(o&&~i.indexOf(`rad`)?lr:1)-r,c=r+s+`deg`,l,u;return o&&(l=i.split(`_`)[1],l===`short`&&(s%=a,s!==s%(a/2)&&(s+=s<0?a:-a)),l===`cw`&&s<0?s=(s+a*fr)%a-~~(s/a)*a:l===`ccw`&&s>0&&(s=(s-a*fr)%a-~~(s/a)*a)),e._pt=u=new zn(e._pt,t,n,r,s,vr),u.e=c,u.u=`deg`,e._props.push(n),u},yi=function(e,t){for(var n in t)e[n]=t[n];return e},bi=function(e,t,n){var r=yi({},n._gsap),i=`perspective,force3D,transformOrigin,svgOrigin`,a=n.style,o,s,c,l,u,d,f,p;for(s in r.svg?(c=n.getAttribute(`transform`),n.setAttribute(`transform`,``),a[Ar]=t,o=li(n,1),Kr(n,Ar),n.setAttribute(`transform`,c)):(c=getComputedStyle(n)[Ar],a[Ar]=t,o=li(n,1),a[Ar]=c),cr)c=r[s],l=o[s],c!==l&&i.indexOf(s)<0&&(f=dt(c),p=dt(l),u=f===p?parseFloat(c):Xr(n,s,c,p),d=parseFloat(l),e._pt=new zn(e._pt,o,s,u,d-u,_r),e._pt.u=p||0,e._props.push(s));yi(o,r)};Ce(`padding,margin,Width,Radius`,function(e,t){var n=`Top`,r=`Right`,i=`Bottom`,a=`Left`,o=(t<3?[n,r,i,a]:[n+a,n+r,i+r,i+a]).map(function(n){return t<2?e+n:`border`+n+e});ni[t>1?`border`+e:e]=function(e,t,n,r,i){var a,s;if(arguments.length<4)return a=o.map(function(t){return Zr(e,t,n)}),s=a.join(` `),s.split(a[0]).length===5?a[0]:s;a=(r+``).split(` `),s={},o.forEach(function(e,t){return s[e]=a[t]=a[t]||a[(t-1)/2|0]}),e.init(t,s,i)}});var xi={name:`css`,register:Vr,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,r,i,a){var o=this._props,s=e.style,c=r.vars.startAt,l,u,d,f,p,m,g,_,v,y,b,x,S,C,w,T,E;for(g in rr||Vr(),this.styles=this.styles||Fr(e),T=this.styles.props,this.tween=r,t)if(g!==`autoRound`&&(u=t[g],!(ge[g]&&hn(g,t,r,i,e,a)))){if(p=typeof u,m=ni[g],p===`function`&&(u=u.call(r,i,e,a),p=typeof u),p===`string`&&~u.indexOf(`random(`)&&(u=kt(u)),m)m(this,e,g,u,r)&&(w=1);else if(g.substr(0,2)===`--`)l=(getComputedStyle(e).getPropertyValue(g)+``).trim(),u+=``,Wt.lastIndex=0,Wt.test(l)||(_=dt(l),v=dt(u),v?_!==v&&(l=Xr(e,g,l,v)+v):_&&(u+=_)),this.add(s,`setProperty`,l,u,i,a,0,0,g),o.push(g),T.push(g,0,s[g]);else if(p!==`undefined`){if(c&&g in c?(l=typeof c[g]==`function`?c[g].call(r,i,e,a):c[g],h(l)&&~l.indexOf(`random(`)&&(l=kt(l)),dt(l+``)||l===`auto`||(l+=n.units[g]||dt(Zr(e,g))||``),(l+``).charAt(1)===`=`&&(l=Zr(e,g))):l=Zr(e,g),f=parseFloat(l),y=p===`string`&&u.charAt(1)===`=`&&u.substr(0,2),y&&(u=u.substr(2)),d=parseFloat(u),g in gr&&(g===`autoAlpha`&&(f===1&&Zr(e,`visibility`)===`hidden`&&d&&(f=0),T.push(`visibility`,0,s.visibility),qr(this,s,`visibility`,f?`inherit`:`hidden`,d?`inherit`:`hidden`,!d)),g!==`scale`&&g!==`transform`&&(g=gr[g],~g.indexOf(`,`)&&(g=g.split(`,`)[0]))),b=g in cr,b){if(this.styles.save(g),E=u,p===`string`&&u.substring(0,6)===`var(--`){if(u=Rr(e,u.substring(4,u.indexOf(`)`))),u.substring(0,5)===`calc(`){var D=e.style.perspective;e.style.perspective=u,u=Rr(e,`perspective`),D?e.style.perspective=D:Kr(e,`perspective`)}d=parseFloat(u)}if(x||(S=e._gsap,S.renderTransform&&!t.parseTransform||li(e,t.parseTransform),C=t.smoothOrigin!==!1&&S.smooth,x=this._pt=new zn(this._pt,s,Ar,0,1,S.renderTransform,S,0,-1),x.dep=1),g===`scale`)this._pt=new zn(this._pt,S,`scaleY`,S.scaleY,(y?z(S.scaleY,y+d):d)-S.scaleY||0,_r),this._pt.u=0,o.push(`scaleY`,g),g+=`X`;else if(g===`transformOrigin`){T.push(jr,0,s[jr]),u=ei(u),S.svg?ci(e,u,0,C,0,this):(v=parseFloat(u.split(` `)[2])||0,v!==S.zOrigin&&qr(this,S,`zOrigin`,S.zOrigin,v),qr(this,s,g,ui(l),ui(u)));continue}else if(g===`svgOrigin`){ci(e,u,1,C,0,this);continue}else if(g in ii){vi(this,S,g,f,y?z(f,y+u):u);continue}else if(g===`smoothOrigin`){qr(this,S,`smooth`,S.smooth,u);continue}else if(g===`force3D`){S[g]=u;continue}else if(g===`transform`){bi(this,u,e);continue}}else g in s||(g=Br(g)||g);if(b||(d||d===0)&&(f||f===0)&&!hr.test(u)&&g in s)_=(l+``).substr((f+``).length),d||=0,v=dt(u)||(g in n.units?n.units[g]:_),_!==v&&(f=Xr(e,g,l,v)),this._pt=new zn(this._pt,b?S:s,g,f,(y?z(f,y+d):d)-f,!b&&(v===`px`||g===`zIndex`)&&t.autoRound!==!1?xr:_r),this._pt.u=v||0,b&&E!==u?(this._pt.b=l,this._pt.e=E,this._pt.r=br):_!==v&&v!==`%`&&(this._pt.b=l,this._pt.r=yr);else if(g in s)Qr.call(this,e,g,l,y?y+u:u);else if(g in e)this.add(e,g,l||e[g],y?y+u:u,i,a);else if(g!==`parseTransform`){ae(g,u);continue}b||(g in s?T.push(g,0,s[g]):typeof e[g]==`function`?T.push(g,2,e[g]()):T.push(g,1,l||e[g])),o.push(g)}}w&&Rn(this)},render:function(e,t){if(t.tween._time||!or())for(var n=t._pt;n;)n.r(e,n.d),n=n._next;else t.styles.revert()},get:Zr,aliases:gr,getSetter:function(e,t,n){var r=gr[t];return r&&r.indexOf(`,`)<0&&(t=r),t in cr&&t!==jr&&(e._gsap.x||Zr(e,`x`))?n&&ar===n?t===`scale`?Dr:Er:(ar=n||{})&&(t===`scale`?Or:kr):e.style&&!v(e.style[t])?wr:~t.indexOf(`-`)?Tr:An(e,t)},core:{_removeProperty:Kr,_getMatrix:si}};$n.utils.checkPrefix=Br,$n.core.getStyleSaver=Fr,(function(e,t,r,i){var a=Ce(e+`,`+t+`,`+r,function(e){cr[e]=1});Ce(t,function(e){n.units[e]=`deg`,ii[e]=1}),gr[a[13]]=e+`,`+t,Ce(i,function(e){var t=e.split(`:`);gr[t[1]]=a[t[0]]})})(`x,y,z,scale,scaleX,scaleY,xPercent,yPercent`,`rotation,rotationX,rotationY,skewX,skewY`,`transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective`,`0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY`),Ce(`x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective`,function(e){n.units[e]=`px`}),$n.registerPlugin(xi);var Si=$n.registerPlugin(xi)||$n;Si.core.Tween;var Ci=1e3,wi=1001,Ti=1002,Ei=1003,Di=1004,Oi=1005,ki=1006,Ai=1007,ji=1008,Mi=1009,Ni=1010,Pi=1011,Fi=1012,Ii=1013,Li=1014,Ri=1015,zi=1016,Bi=1017,Vi=1018,Hi=1020,Ui=35902,Wi=35899,Gi=1021,Ki=1022,qi=1023,Ji=1026,Yi=1027,Xi=1028,Zi=1029,Qi=1030,$i=1031,ea=1033,ta=33776,na=33777,ra=33778,ia=33779,aa=35840,oa=35841,sa=35842,ca=35843,la=36196,ua=37492,da=37496,fa=37488,pa=37489,ma=37490,ha=37491,ga=37808,_a=37809,va=37810,ya=37811,ba=37812,xa=37813,Sa=37814,Ca=37815,wa=37816,Ta=37817,Ea=37818,Da=37819,Oa=37820,ka=37821,Aa=36492,ja=36494,Ma=36495,Na=36283,Pa=36284,Fa=36285,Ia=36286,La=2300,Ra=2301,za=2302,Ba=2303,Va=2400,Ha=2401,Ua=2402,Wa=3200,Ga=`srgb`,Ka=`srgb-linear`,qa=`linear`,Ja=`srgb`,Ya=7680,Xa=35044,Za=35048,Qa=2e3;function $a(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function eo(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function to(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function no(){let e=to(`canvas`);return e.style.display=`block`,e}var ro={};function io(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function ao(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function B(...e){e=ao(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function V(...e){e=ao(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function oo(...e){let t=e.join(` `);t in ro||(ro[t]=!0,B(...e))}function so(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var co={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},lo=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},uo=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),fo=1234567,po=Math.PI/180,mo=180/Math.PI;function ho(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(uo[e&255]+uo[e>>8&255]+uo[e>>16&255]+uo[e>>24&255]+`-`+uo[t&255]+uo[t>>8&255]+`-`+uo[t>>16&15|64]+uo[t>>24&255]+`-`+uo[n&63|128]+uo[n>>8&255]+`-`+uo[n>>16&255]+uo[n>>24&255]+uo[r&255]+uo[r>>8&255]+uo[r>>16&255]+uo[r>>24&255]).toLowerCase()}function go(e,t,n){return Math.max(t,Math.min(n,e))}function _o(e,t){return(e%t+t)%t}function vo(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function yo(e,t,n){return e===t?0:(n-e)/(t-e)}function bo(e,t,n){return(1-n)*e+n*t}function xo(e,t,n,r){return bo(e,t,1-Math.exp(-n*r))}function So(e,t=1){return t-Math.abs(_o(e,t*2)-t)}function Co(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function wo(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function To(e,t){return e+Math.floor(Math.random()*(t-e+1))}function Eo(e,t){return e+Math.random()*(t-e)}function Do(e){return e*(.5-Math.random())}function Oo(e){e!==void 0&&(fo=e);let t=fo+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function ko(e){return e*po}function Ao(e){return e*mo}function jo(e){return e>0&&Number.isInteger(e)&&2**Math.round(Math.log2(e))===e}function Mo(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function No(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Po(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:B(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Fo(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:case Uint8ClampedArray:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function Io(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var Lo={DEG2RAD:po,RAD2DEG:mo,generateUUID:ho,clamp:go,euclideanModulo:_o,mapLinear:vo,inverseLerp:yo,lerp:bo,damp:xo,pingpong:So,smoothstep:Co,smootherstep:wo,randInt:To,randFloat:Eo,randFloatSpread:Do,seededRandom:Oo,degToRad:ko,radToDeg:Ao,isPowerOfTwo:jo,ceilPowerOfTwo:Mo,floorPowerOfTwo:No,setQuaternionFromProperEuler:Po,normalize:Io,denormalize:Fo},H=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=go(this.x,e.x,t.x),this.y=go(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=go(this.x,e,t),this.y=go(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(go(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(go(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ro=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:B(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(go(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},U=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Bo.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Bo.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=go(this.x,e.x,t.x),this.y=go(this.y,e.y,t.y),this.z=go(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=go(this.x,e,t),this.y=go(this.y,e,t),this.z=go(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(go(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return zo.copy(this).projectOnVector(e),this.sub(zo)}reflect(e){return this.sub(zo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(go(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},zo=new U,Bo=new Ro,Vo=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return oo(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(Ho.makeScale(e,t)),this}rotate(e){return oo(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(Ho.makeRotation(-e)),this}translate(e,t){return oo(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(Ho.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Ho=new Vo,Uo=new Vo().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Wo=new Vo().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Go(){let e={enabled:!0,workingColorSpace:Ka,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=qo(e.r),e.g=qo(e.g),e.b=qo(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Jo(e.r),e.g=Jo(e.g),e.b=Jo(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?qa:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return oo(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return oo(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Ka]:{primaries:t,whitePoint:r,transfer:qa,toXYZ:Uo,fromXYZ:Wo,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ga},outputColorSpaceConfig:{drawingBufferColorSpace:Ga}},[Ga]:{primaries:t,whitePoint:r,transfer:Ja,toXYZ:Uo,fromXYZ:Wo,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ga}}}),e}var Ko=Go();function qo(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Jo(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Yo,Xo=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Yo===void 0&&(Yo=to(`canvas`)),Yo.width=e.width,Yo.height=e.height;let t=Yo.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Yo}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=to(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=qo(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(qo(t[e]/255)*255):t[e]=qo(t[e]);return{data:t,width:e.width,height:e.height}}return B(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Zo=0,Qo=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Zo++}),this.uuid=ho(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push($o(r[t].image)):e.push($o(r[t]))}else e=$o(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function $o(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?Xo.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(B(`Texture: Unable to serialize Texture.`),{})}var es=0,ts=new U,ns=class e extends lo{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=wi,i=wi,a=ki,o=ji,s=qi,c=Mi,l=e.DEFAULT_ANISOTROPY,u=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:es++}),this.uuid=ho(),this.name=``,this.source=new Qo(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new H(0,0),this.repeat=new H(1,1),this.center=new H(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Vo,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(ts).x}get height(){return this.source.getSize(ts).y}get depth(){return this.source.getSize(ts).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){B(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ci:e.x-=Math.floor(e.x);break;case wi:e.x=e.x<0?0:1;break;case Ti:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case Ci:e.y-=Math.floor(e.y);break;case wi:e.y=e.y<0?0:1;break;case Ti:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};ns.DEFAULT_IMAGE=null,ns.DEFAULT_MAPPING=300,ns.DEFAULT_ANISOTROPY=1;var rs=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=go(this.x,e.x,t.x),this.y=go(this.y,e.y,t.y),this.z=go(this.z,e.z,t.z),this.w=go(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=go(this.x,e,t),this.y=go(this.y,e,t),this.z=go(this.z,e,t),this.w=go(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(go(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},is=class extends lo{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ki,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new rs(0,0,e,t),this.scissorTest=!1,this.viewport=new rs(0,0,e,t),this.textures=[];let r=new ns({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:ki,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Qo(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null){if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture}return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},as=class extends is{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},os=class extends ns{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Ei,this.minFilter=Ei,this.wrapR=wi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},ss=class extends ns{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Ei,this.minFilter=Ei,this.wrapR=wi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}},cs=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/ls.setFromMatrixColumn(e,0).length(),i=1/ls.setFromMatrixColumn(e,1).length(),a=1/ls.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ds,e,fs)}lookAt(e,t,n){let r=this.elements;return hs.subVectors(e,t),hs.lengthSq()===0&&(hs.z=1),hs.normalize(),ps.crossVectors(n,hs),ps.lengthSq()===0&&(Math.abs(n.z)===1?hs.x+=1e-4:hs.z+=1e-4,hs.normalize(),ps.crossVectors(n,hs)),ps.normalize(),ms.crossVectors(hs,ps),r[0]=ps.x,r[4]=ms.x,r[8]=hs.x,r[1]=ps.y,r[5]=ms.y,r[9]=hs.y,r[2]=ps.z,r[6]=ms.z,r[10]=hs.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],P=r[7],F=r[11],ee=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*P,i[8]=a*C+o*D+s*j+c*F,i[12]=a*w+o*O+s*M+c*ee,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*P,i[9]=l*C+u*D+d*j+f*F,i[13]=l*w+u*O+d*M+f*ee,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*P,i[10]=p*C+m*D+h*j+g*F,i[14]=p*w+m*O+h*M+g*ee,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*P,i[11]=_*C+v*D+y*j+b*F,i[15]=_*w+v*O+y*M+b*ee,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=ls.set(r[0],r[1],r[2]).length(),o=ls.set(r[4],r[5],r[6]).length(),s=ls.set(r[8],r[9],r[10]).length();i<0&&(a=-a),us.copy(this);let c=1/a,l=1/o,u=1/s;return us.elements[0]*=c,us.elements[1]*=c,us.elements[2]*=c,us.elements[4]*=l,us.elements[5]*=l,us.elements[6]*=l,us.elements[8]*=u,us.elements[9]*=u,us.elements[10]*=u,t.setFromRotationMatrix(us),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Qa,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Qa,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},ls=new U,us=new cs,ds=new U(0,0,0),fs=new U(1,1,1),ps=new U,ms=new U,hs=new U,gs=new cs,_s=new Ro,vs=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(go(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-go(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(go(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-go(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(go(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-go(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:B(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return gs.makeRotationFromQuaternion(e),this.setFromRotationMatrix(gs,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return _s.setFromEuler(this),this.setFromQuaternion(_s,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};vs.DEFAULT_ORDER=`XYZ`;var ys=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},bs=0,xs=new U,Ss=new Ro,Cs=new cs,ws=new U,Ts=new U,Es=new U,Ds=new Ro,Os=new U(1,0,0),ks=new U(0,1,0),As=new U(0,0,1),js={type:`added`},Ms={type:`removed`},Ns={type:`childadded`,child:null},Ps={type:`childremoved`,child:null},Fs=class e extends lo{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:bs++}),this.uuid=ho(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new U,n=new vs,r=new Ro,i=new U(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new cs},normalMatrix:{value:new Vo}}),this.matrix=new cs,this.matrixWorld=new cs,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ys,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ss.setFromAxisAngle(e,t),this.quaternion.multiply(Ss),this}rotateOnWorldAxis(e,t){return Ss.setFromAxisAngle(e,t),this.quaternion.premultiply(Ss),this}rotateX(e){return this.rotateOnAxis(Os,e)}rotateY(e){return this.rotateOnAxis(ks,e)}rotateZ(e){return this.rotateOnAxis(As,e)}translateOnAxis(e,t){return xs.copy(e).applyQuaternion(this.quaternion),this.position.add(xs.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Os,e)}translateY(e){return this.translateOnAxis(ks,e)}translateZ(e){return this.translateOnAxis(As,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Cs.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ws.copy(e):ws.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),Ts.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Cs.lookAt(Ts,ws,this.up):Cs.lookAt(ws,Ts,this.up),this.quaternion.setFromRotationMatrix(Cs),r&&(Cs.extractRotation(r.matrixWorld),Ss.setFromRotationMatrix(Cs),this.quaternion.premultiply(Ss.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(V(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(js),Ns.child=e,this.dispatchEvent(Ns),Ns.child=null):V(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Ms),Ps.child=e,this.dispatchEvent(Ps),Ps.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Cs.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Cs.multiply(e.parent.matrixWorld)),e.applyMatrix4(Cs),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(js),Ns.child=e,this.dispatchEvent(Ns),Ns.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ts,e,Es),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ts,Ds,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:`dispose`})}};Fs.DEFAULT_UP=new U(0,1,0),Fs.DEFAULT_MATRIX_AUTO_UPDATE=!0,Fs.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Is=class extends Fs{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Ls={type:`move`},Rs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Is,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Is,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Is,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Ls)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Is;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},zs={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Bs={h:0,s:0,l:0},Vs={h:0,s:0,l:0};function Hs(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var W=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ga){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ko.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ko.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ko.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ko.workingColorSpace){if(e=_o(e,1),t=go(t,0,1),n=go(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Hs(i,r,e+1/3),this.g=Hs(i,r,e),this.b=Hs(i,r,e-1/3)}return Ko.colorSpaceToWorking(this,r),this}setStyle(e,t=Ga){function n(t){t!==void 0&&parseFloat(t)<1&&B(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:B(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);B(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ga){let n=zs[e.toLowerCase()];return n===void 0?B(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=qo(e.r),this.g=qo(e.g),this.b=qo(e.b),this}copyLinearToSRGB(e){return this.r=Jo(e.r),this.g=Jo(e.g),this.b=Jo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ga){return Ko.workingToColorSpace(Us.copy(this),e),Math.round(go(Us.r*255,0,255))*65536+Math.round(go(Us.g*255,0,255))*256+Math.round(go(Us.b*255,0,255))}getHexString(e=Ga){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ko.workingColorSpace){Ko.workingToColorSpace(Us.copy(this),t);let n=Us.r,r=Us.g,i=Us.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Ko.workingColorSpace){return Ko.workingToColorSpace(Us.copy(this),t),e.r=Us.r,e.g=Us.g,e.b=Us.b,e}getStyle(e=Ga){Ko.workingToColorSpace(Us.copy(this),e);let t=Us.r,n=Us.g,r=Us.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Bs),this.setHSL(Bs.h+e,Bs.s+t,Bs.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Bs),e.getHSL(Vs);let n=bo(Bs.h,Vs.h,t),r=bo(Bs.s,Vs.s,t),i=bo(Bs.l,Vs.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Us=new W;W.NAMES=zs;var Ws=class e{constructor(e,t=1,n=1e3){this.isFog=!0,this.name=``,this.color=new W(e),this.near=t,this.far=n}clone(){return new e(this.color,this.near,this.far)}toJSON(){return{type:`Fog`,name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Gs=class extends Fs{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new vs,this.environmentIntensity=1,this.environmentRotation=new vs,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Ks=new U,qs=new U,Js=new U,Ys=new U,Xs=new U,Zs=new U,Qs=new U,$s=new U,ec=new U,tc=new U,nc=new rs,rc=new rs,ic=new rs,ac=class e{constructor(e=new U,t=new U,n=new U){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Ks.subVectors(e,t),r.cross(Ks);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Ks.subVectors(r,t),qs.subVectors(n,t),Js.subVectors(e,t);let a=Ks.dot(Ks),o=Ks.dot(qs),s=Ks.dot(Js),c=qs.dot(qs),l=qs.dot(Js),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Ys)!==null&&Ys.x>=0&&Ys.y>=0&&Ys.x+Ys.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Ys)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Ys.x),s.addScaledVector(a,Ys.y),s.addScaledVector(o,Ys.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return nc.setScalar(0),rc.setScalar(0),ic.setScalar(0),nc.fromBufferAttribute(e,t),rc.fromBufferAttribute(e,n),ic.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(nc,i.x),a.addScaledVector(rc,i.y),a.addScaledVector(ic,i.z),a}static isFrontFacing(e,t,n,r){return Ks.subVectors(n,t),qs.subVectors(e,t),Ks.cross(qs).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Ks.subVectors(this.c,this.b),qs.subVectors(this.a,this.b),Ks.cross(qs).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Xs.subVectors(r,n),Zs.subVectors(i,n),$s.subVectors(e,n);let s=Xs.dot($s),c=Zs.dot($s);if(s<=0&&c<=0)return t.copy(n);ec.subVectors(e,r);let l=Xs.dot(ec),u=Zs.dot(ec);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Xs,a);tc.subVectors(e,i);let f=Xs.dot(tc),p=Zs.dot(tc);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Zs,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Qs.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Qs,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Xs,a).addScaledVector(Zs,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},oc=class{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(cc.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(cc.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=cc.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,cc):cc.fromBufferAttribute(r,t),cc.applyMatrix4(e.matrixWorld),this.expandByPoint(cc);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),lc.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),lc.copy(e.boundingBox)),lc.applyMatrix4(e.matrixWorld),this.union(lc)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,cc),cc.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(gc),_c.subVectors(this.max,gc),uc.subVectors(e.a,gc),dc.subVectors(e.b,gc),fc.subVectors(e.c,gc),pc.subVectors(dc,uc),mc.subVectors(fc,dc),hc.subVectors(uc,fc);let t=[0,-pc.z,pc.y,0,-mc.z,mc.y,0,-hc.z,hc.y,pc.z,0,-pc.x,mc.z,0,-mc.x,hc.z,0,-hc.x,-pc.y,pc.x,0,-mc.y,mc.x,0,-hc.y,hc.x,0];return!bc(t,uc,dc,fc,_c)||(t=[1,0,0,0,1,0,0,0,1],!bc(t,uc,dc,fc,_c))?!1:(vc.crossVectors(pc,mc),t=[vc.x,vc.y,vc.z],bc(t,uc,dc,fc,_c))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,cc).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(cc).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(sc[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),sc[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),sc[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),sc[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),sc[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),sc[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),sc[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),sc[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(sc),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},sc=[new U,new U,new U,new U,new U,new U,new U,new U],cc=new U,lc=new oc,uc=new U,dc=new U,fc=new U,pc=new U,mc=new U,hc=new U,gc=new U,_c=new U,vc=new U,yc=new U;function bc(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){yc.fromArray(e,a);let o=i.x*Math.abs(yc.x)+i.y*Math.abs(yc.y)+i.z*Math.abs(yc.z),s=t.dot(yc),c=n.dot(yc),l=r.dot(yc);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var xc=new U,Sc=new H,Cc=0,wc=class extends lo{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Cc++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Xa,this.updateRanges=[],this.gpuType=Ri,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Sc.fromBufferAttribute(this,t),Sc.applyMatrix3(e),this.setXY(t,Sc.x,Sc.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)xc.fromBufferAttribute(this,t),xc.applyMatrix3(e),this.setXYZ(t,xc.x,xc.y,xc.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)xc.fromBufferAttribute(this,t),xc.applyMatrix4(e),this.setXYZ(t,xc.x,xc.y,xc.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)xc.fromBufferAttribute(this,t),xc.applyNormalMatrix(e),this.setXYZ(t,xc.x,xc.y,xc.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)xc.fromBufferAttribute(this,t),xc.transformDirection(e),this.setXYZ(t,xc.x,xc.y,xc.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Fo(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Io(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Fo(t,this.array)),t}setX(e,t){return this.normalized&&(t=Io(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Fo(t,this.array)),t}setY(e,t){return this.normalized&&(t=Io(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Fo(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Io(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Fo(t,this.array)),t}setW(e,t){return this.normalized&&(t=Io(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Io(t,this.array),n=Io(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Io(t,this.array),n=Io(n,this.array),r=Io(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Io(t,this.array),n=Io(n,this.array),r=Io(r,this.array),i=Io(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:`dispose`})}},Tc=class extends wc{constructor(e,t,n){super(new Uint16Array(e),t,n)}},Ec=class extends wc{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Dc=class extends wc{constructor(e,t,n){super(new Float32Array(e),t,n)}},Oc=new oc,kc=new U,Ac=new U,jc=class{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?Oc.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;kc.subVectors(e,this.center);let t=kc.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(kc,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ac.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(kc.copy(e.center).add(Ac)),this.expandByPoint(kc.copy(e.center).sub(Ac))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Mc=0,Nc=new cs,Pc=new Fs,Fc=new U,Ic=new oc,Lc=new oc,Rc=new U,zc=class e extends lo{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Mc++}),this.uuid=ho(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new($a(e)?Ec:Tc)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new Vo().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Nc.makeRotationFromQuaternion(e),this.applyMatrix4(Nc),this}rotateX(e){return Nc.makeRotationX(e),this.applyMatrix4(Nc),this}rotateY(e){return Nc.makeRotationY(e),this.applyMatrix4(Nc),this}rotateZ(e){return Nc.makeRotationZ(e),this.applyMatrix4(Nc),this}translate(e,t,n){return Nc.makeTranslation(e,t,n),this.applyMatrix4(Nc),this}scale(e,t,n){return Nc.makeScale(e,t,n),this.applyMatrix4(Nc),this}lookAt(e){return Pc.lookAt(e),Pc.updateMatrix(),this.applyMatrix4(Pc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Fc).negate(),this.translate(Fc.x,Fc.y,Fc.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new Dc(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&B(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new oc);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Ic.setFromBufferAttribute(n),this.morphTargetsRelative?(Rc.addVectors(this.boundingBox.min,Ic.min),this.boundingBox.expandByPoint(Rc),Rc.addVectors(this.boundingBox.max,Ic.max),this.boundingBox.expandByPoint(Rc)):(this.boundingBox.expandByPoint(Ic.min),this.boundingBox.expandByPoint(Ic.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&V(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new jc);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new U,1/0);return}if(e){let n=this.boundingSphere.center;if(Ic.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Lc.setFromBufferAttribute(n),this.morphTargetsRelative?(Rc.addVectors(Ic.min,Lc.min),Ic.expandByPoint(Rc),Rc.addVectors(Ic.max,Lc.max),Ic.expandByPoint(Rc)):(Ic.expandByPoint(Lc.min),Ic.expandByPoint(Lc.max))}Ic.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Rc.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Rc));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Rc.fromBufferAttribute(a,t),o&&(Fc.fromBufferAttribute(e,t),Rc.add(Fc)),r=Math.max(r,n.distanceToSquared(Rc))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&V(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){V(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new wc(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new U,s[e]=new U;let c=new U,l=new U,u=new U,d=new H,f=new H,p=new H,m=new U,h=new U;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new U,y=new U,b=new U,x=new U;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new wc(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new U,i=new U,a=new U,o=new U,s=new U,c=new U,l=new U,u=new U;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Rc.fromBufferAttribute(e,t),Rc.normalize(),e.setXYZ(t,Rc.x,Rc.y,Rc.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new wc(a,r,i)}if(this.index===null)return B(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Bc=new U,Vc=new U,Hc=new Vo,Uc=class{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Bc.subVectors(n,t).cross(Vc.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(Bc),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Hc.getNormalMatrix(e),r=this.coplanarPoint(Bc).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},Wc=0,Gc=class extends lo{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Wc++}),this.uuid=ho(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new W(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ya,this.stencilZFail=Ya,this.stencilZPass=Ya,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){B(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(e=>e.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new W().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(e=>new Uc().fromJSON(e))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new H().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new H().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Kc=new U,qc=new U,Jc=new U,Yc=new U,Xc=class{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Kc)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Kc.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Kc.copy(this.origin).addScaledVector(this.direction,t),Kc.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){qc.copy(e).add(t).multiplyScalar(.5),Jc.copy(t).sub(e).normalize(),Yc.copy(this.origin).sub(qc);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Jc),o=Yc.dot(this.direction),s=-Yc.dot(Jc),c=Yc.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(qc).addScaledVector(Jc,d),f}intersectSphere(e,t){if(e.radius<0)return null;Kc.subVectors(e.center,this.origin);let n=Kc.dot(this.direction),r=Kc.dot(Kc)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Kc)!==null}intersectTriangle(e,t,n,r,i){let a=this.origin,o=this.direction,s=o.x,c=o.y,l=o.z,u=e.x-a.x,d=e.y-a.y,f=e.z-a.z,p=t.x-a.x,m=t.y-a.y,h=t.z-a.z,g=n.x-a.x,_=n.y-a.y,v=n.z-a.z,y=Math.abs(s),b=Math.abs(c),x=Math.abs(l),S,C,w,T,E,D,O,k,A,j,M,N;if(y>=b&&y>=x?(w=s,D=u,A=p,N=g,s>=0?(S=c,C=l,T=d,E=f,O=m,k=h,j=_,M=v):(S=l,C=c,T=f,E=d,O=h,k=m,j=v,M=_)):b>=x?(w=c,D=d,A=m,N=_,c>=0?(S=l,C=s,T=f,E=u,O=h,k=p,j=v,M=g):(S=s,C=l,T=u,E=f,O=p,k=h,j=g,M=v)):(w=l,D=f,A=h,N=v,l>=0?(S=s,C=c,T=u,E=d,O=p,k=m,j=g,M=_):(S=c,C=s,T=d,E=u,O=m,k=p,j=_,M=g)),w===0)return null;let P=S/w,F=C/w,ee=1/w,te=T-P*D,ne=E-F*D,re=O-P*A,ie=k-F*A,I=j-P*N,ae=M-F*N,oe=I*ie-ae*re,se=te*ae-ne*I,ce=re*ne-ie*te;if(r){if(oe<0||se<0||ce<0)return null}else if((oe<0||se<0||ce<0)&&(oe>0||se>0||ce>0))return null;let le=oe+se+ce;if(le===0)return null;let ue=ee*(oe*D+se*A+ce*N);return(le>0?ue<0:ue>0)?null:this.at(ue/le,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Zc=class extends Gc{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new W(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new vs,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Qc=new cs,$c=new Xc,el=new jc,tl=new U,nl=new U,rl=new U,il=new U,al=new U,ol=new U,sl=new U,cl=new U,ll=class extends Fs{constructor(e=new zc,t=new Zc){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){ol.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(al.fromBufferAttribute(s,e),a?ol.addScaledVector(al,r):ol.addScaledVector(al.sub(t),r))}t.add(ol)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),el.copy(n.boundingSphere),el.applyMatrix4(i),$c.copy(e.ray).recast(e.near),!(el.containsPoint($c.origin)===!1&&($c.intersectSphere(el,tl)===null||$c.origin.distanceToSquared(tl)>(e.far-e.near)**2))&&(Qc.copy(i).invert(),$c.copy(e.ray).applyMatrix4(Qc),(n.boundingBox===null||$c.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,$c)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=dl(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=dl(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=dl(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=dl(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function ul(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;cl.copy(s),cl.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(cl);return l<n.near||l>n.far?null:{distance:l,point:cl.clone(),object:e}}function dl(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,nl),e.getVertexPosition(c,rl),e.getVertexPosition(l,il);let u=ul(e,t,n,r,nl,rl,il,sl);if(u){let e=new U;ac.getBarycoord(sl,nl,rl,il,e),i&&(u.uv=ac.getInterpolatedAttribute(i,s,c,l,e,new H)),a&&(u.uv1=ac.getInterpolatedAttribute(a,s,c,l,e,new H)),o&&(u.normal=ac.getInterpolatedAttribute(o,s,c,l,e,new U),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new U,materialIndex:0};ac.getNormal(nl,rl,il,t.normal),u.face=t,u.barycoord=e}return u}var fl=class extends ns{constructor(e=null,t=1,n=1,r,i,a,o,s,c=Ei,l=Ei,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},pl=class extends wc{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},ml=new jc,hl=new H(.5,.5),gl=new U,_l=class{constructor(e=new Uc,t=new Uc,n=new Uc,r=new Uc,i=new Uc,a=new Uc){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Qa,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ml.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ml.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ml)}intersectsSprite(e){return ml.center.set(0,0,0),ml.radius=.7071067811865476+hl.distanceTo(e.center),ml.applyMatrix4(e.matrixWorld),this.intersectsSphere(ml)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(gl.x=r.normal.x>0?e.max.x:e.min.x,gl.y=r.normal.y>0?e.max.y:e.min.y,gl.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(gl)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},vl=class extends ns{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},yl=class extends ns{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},bl=class extends ns{constructor(e,t,n=Li,r,i,a,o=Ei,s=Ei,c,l=Ji,u=1){if(l!==1026&&l!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:u},r,i,a,o,s,l,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Qo(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},xl=class extends bl{constructor(e,t=Li,n=301,r,i,a=Ei,o=Ei,s,c=Ji){let l={width:e,height:e,depth:1},u=[l,l,l,l,l,l];super(e,e,t,n,r,i,a,o,s,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Sl=class extends ns{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Cl=class e extends zc{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new Dc(c,3)),this.setAttribute(`normal`,new Dc(l,3)),this.setAttribute(`uv`,new Dc(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new U;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},wl=class e extends zc{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new Dc(u,3)),this.setAttribute(`normal`,new Dc(d,3)),this.setAttribute(`uv`,new Dc(f,2));function _(){let a=new U,_=new U,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new H,m=new U,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Tl=class e extends wl{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},El=class e extends zc{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new Dc(i,3)),this.setAttribute(`normal`,new Dc(i.slice(),3)),this.setAttribute(`uv`,new Dc(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new U,r=new U,i=new U;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new U;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new U;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new U,t=new U,n=new U,r=new U,o=new H,s=new H,c=new H;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},Dl=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){B(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new H:new U);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new U,r=[],i=[],a=[],o=new U,s=new cs;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new U)}i[0]=new U,a[0]=new U;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(go(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(go(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Ol=class extends Dl{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new H){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},kl=class extends Ol{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function Al(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var jl=new U,Ml=new U,Nl=new Al,Pl=new Al,Fl=new Al,Il=class extends Dl{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new U){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(Ml.subVectors(r[0],r[1]).add(r[0]),c=Ml);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(jl.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=jl),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),Nl.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),Pl.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),Fl.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(Nl.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),Pl.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),Fl.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(Nl.calc(s),Pl.calc(s),Fl.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new U().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Ll(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function Rl(e,t){let n=1-e;return n*n*t}function zl(e,t){return 2*(1-e)*e*t}function Bl(e,t){return e*e*t}function Vl(e,t,n,r){return Rl(e,t)+zl(e,n)+Bl(e,r)}function Hl(e,t){let n=1-e;return n*n*n*t}function Ul(e,t){let n=1-e;return 3*n*n*e*t}function Wl(e,t){return 3*(1-e)*e*e*t}function Gl(e,t){return e*e*e*t}function Kl(e,t,n,r,i){return Hl(e,t)+Ul(e,n)+Wl(e,r)+Gl(e,i)}var ql=class extends Dl{constructor(e=new H,t=new H,n=new H,r=new H){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new H){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Kl(e,r.x,i.x,a.x,o.x),Kl(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Jl=class extends Dl{constructor(e=new U,t=new U,n=new U,r=new U){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Kl(e,r.x,i.x,a.x,o.x),Kl(e,r.y,i.y,a.y,o.y),Kl(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Yl=class extends Dl{constructor(e=new H,t=new H){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new H){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new H){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Xl=class extends Dl{constructor(e=new U,t=new U){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new U){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new U){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Zl=class extends Dl{constructor(e=new H,t=new H,n=new H){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new H){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Vl(e,r.x,i.x,a.x),Vl(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ql=class extends Dl{constructor(e=new U,t=new U,n=new U){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Vl(e,r.x,i.x,a.x),Vl(e,r.y,i.y,a.y),Vl(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},$l=class extends Dl{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new H){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(Ll(o,s.x,c.x,l.x,u.x),Ll(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new H().fromArray(n))}return this}},eu=Object.freeze({__proto__:null,ArcCurve:kl,CatmullRomCurve3:Il,CubicBezierCurve:ql,CubicBezierCurve3:Jl,EllipseCurve:Ol,LineCurve:Yl,LineCurve3:Xl,QuadraticBezierCurve:Zl,QuadraticBezierCurve3:Ql,SplineCurve:$l}),tu=class extends Dl{constructor(){super(),this.type=`CurvePath`,this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?`LineCurve`:`LineCurve3`;this.curves.push(new eu[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),r=this.getCurveLengths(),i=0;for(;i<r.length;){if(r[i]>=n){let e=r[i]-n,a=this.curves[i],o=a.getLength(),s=o===0?0:1-e/o;return a.getPointAt(s,t)}i++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let r=0,i=this.curves;r<i.length;r++){let a=i[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,s=a.getPoints(o);for(let e=0;e<s.length;e++){let r=s[e];n&&n.equals(r)||(t.push(r),n=r)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(n.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let n=this.curves[t];e.curves.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(new eu[n.type]().fromJSON(n))}return this}},nu=class extends tu{constructor(e){super(),this.type=`Path`,this.currentPoint=new H,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Yl(this.currentPoint.clone(),new H(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){let i=new Zl(this.currentPoint.clone(),new H(e,t),new H(n,r));return this.curves.push(i),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,i,a){let o=new ql(this.currentPoint.clone(),new H(e,t),new H(n,r),new H(i,a));return this.curves.push(o),this.currentPoint.set(i,a),this}splineThru(e){let t=new $l([this.currentPoint.clone()].concat(e));return this.curves.push(t),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,i,a){let o=this.currentPoint.x,s=this.currentPoint.y;return this.absarc(e+o,t+s,n,r,i,a),this}absarc(e,t,n,r,i,a){return this.absellipse(e,t,n,n,r,i,a),this}ellipse(e,t,n,r,i,a,o,s){let c=this.currentPoint.x,l=this.currentPoint.y;return this.absellipse(e+c,t+l,n,r,i,a,o,s),this}absellipse(e,t,n,r,i,a,o,s){let c=new Ol(e,t,n,r,i,a,o,s);if(this.curves.length>0){let e=c.getPoint(0);e.equals(this.currentPoint)||this.lineTo(e.x,e.y)}this.curves.push(c);let l=c.getPoint(1);return this.currentPoint.copy(l),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},ru=class extends nu{constructor(e){super(e),this.uuid=ho(),this.type=`Shape`,this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let n=this.holes[t];e.holes.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(new nu().fromJSON(n))}return this}};function iu(e,t,n=2){let r=t&&t.length,i=r?t[0]*n:e.length,a=au(e,0,i,n,!0),o=[];if(!a||a.next===a.prev)return o;let s,c,l;if(r&&(a=fu(e,t,a,n)),e.length>80*n){s=e[0],c=e[1];let t=s,r=c;for(let a=n;a<i;a+=n){let n=e[a],i=e[a+1];n<s&&(s=n),i<c&&(c=i),n>t&&(t=n),i>r&&(r=i)}l=Math.max(t-s,r-c),l=l===0?0:32767/l}return su(a,o,n,s,c,l,0),o}function au(e,t,n,r,i){let a;if(i===Iu(e,t,n,r)>0)for(let i=t;i<n;i+=r)a=Nu(i/r|0,e[i],e[i+1],a);else for(let i=n-r;i>=t;i-=r)a=Nu(i/r|0,e[i],e[i+1],a);return a&&Tu(a,a.next)&&(Pu(a),a=a.next),a}function ou(e,t){if(!e)return e;t||=e;let n=e,r;do if(r=!1,!n.steiner&&(Tu(n,n.next)||wu(n.prev,n,n.next)===0)){if(Pu(n),n=t=n.prev,n===n.next)break;r=!0}else n=n.next;while(r||n!==t);return t}function su(e,t,n,r,i,a,o){if(!e)return;!o&&a&&_u(e,r,i,a);let s=e;for(;e.prev!==e.next;){let c=e.prev,l=e.next;if(a?lu(e,r,i,a):cu(e)){t.push(c.i,e.i,l.i),Pu(e),e=l.next,s=l.next;continue}if(e=l,e===s){o?o===1?(e=uu(ou(e),t),su(e,t,n,r,i,a,2)):o===2&&du(e,t,n,r,i,a):su(ou(e),t,n,r,i,a,1);break}}}function cu(e){let t=e.prev,n=e,r=e.next;if(wu(t,n,r)>=0)return!1;let i=t.x,a=n.x,o=r.x,s=t.y,c=n.y,l=r.y,u=Math.min(i,a,o),d=Math.min(s,c,l),f=Math.max(i,a,o),p=Math.max(s,c,l),m=r.next;for(;m!==t;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=p&&Su(i,s,a,c,o,l,m.x,m.y)&&wu(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function lu(e,t,n,r){let i=e.prev,a=e,o=e.next;if(wu(i,a,o)>=0)return!1;let s=i.x,c=a.x,l=o.x,u=i.y,d=a.y,f=o.y,p=Math.min(s,c,l),m=Math.min(u,d,f),h=Math.max(s,c,l),g=Math.max(u,d,f),_=yu(p,m,t,n,r),v=yu(h,g,t,n,r),y=e.prevZ,b=e.nextZ;for(;y&&y.z>=_&&b&&b.z<=v;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&Su(s,u,c,d,l,f,y.x,y.y)&&wu(y.prev,y,y.next)>=0||(y=y.prevZ,b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&Su(s,u,c,d,l,f,b.x,b.y)&&wu(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;y&&y.z>=_;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&Su(s,u,c,d,l,f,y.x,y.y)&&wu(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;b&&b.z<=v;){if(b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&Su(s,u,c,d,l,f,b.x,b.y)&&wu(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function uu(e,t){let n=e;do{let r=n.prev,i=n.next.next;!Tu(r,i)&&Eu(r,n,n.next,i)&&Au(r,i)&&Au(i,r)&&(t.push(r.i,n.i,i.i),Pu(n),Pu(n.next),n=e=i),n=n.next}while(n!==e);return ou(n)}function du(e,t,n,r,i,a){let o=e;do{let e=o.next.next;for(;e!==o.prev;){if(o.i!==e.i&&Cu(o,e)){let s=Mu(o,e);o=ou(o,o.next),s=ou(s,s.next),su(o,t,n,r,i,a,0),su(s,t,n,r,i,a,0);return}e=e.next}o=o.next}while(o!==e)}function fu(e,t,n,r){let i=[];for(let n=0,a=t.length;n<a;n++){let o=au(e,t[n]*r,n<a-1?t[n+1]*r:e.length,r,!1);o===o.next&&(o.steiner=!0),i.push(bu(o))}i.sort(pu);for(let e=0;e<i.length;e++)n=mu(i[e],n);return n}function pu(e,t){let n=e.x-t.x;return n===0&&(n=e.y-t.y,n===0&&(n=(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x))),n}function mu(e,t){let n=hu(e,t);if(!n)return t;let r=Mu(n,e);return ou(r,r.next),ou(n,n.next)}function hu(e,t){let n=t,r=e.x,i=e.y,a=-1/0,o;if(Tu(e,n))return n;do{if(Tu(e,n.next))return n.next;if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){let e=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(e<=r&&e>a&&(a=e,o=n.x<n.next.x?n:n.next,e===r))return o}n=n.next}while(n!==t);if(!o)return null;let s=o,c=o.x,l=o.y,u=1/0;n=o;do{if(r>=n.x&&n.x>=c&&r!==n.x&&xu(i<l?r:a,i,c,l,i<l?a:r,i,n.x,n.y)){let t=Math.abs(i-n.y)/(r-n.x);Au(n,e)&&(t<u||t===u&&(n.x>o.x||n.x===o.x&&gu(o,n)))&&(o=n,u=t)}n=n.next}while(n!==s);return o}function gu(e,t){return wu(e.prev,e,t.prev)<0&&wu(t.next,e,e.next)<0}function _u(e,t,n,r){let i=e;do i.z===0&&(i.z=yu(i.x,i.y,t,n,r)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==e);i.prevZ.nextZ=null,i.prevZ=null,vu(i)}function vu(e){let t,n=1;do{let r=e,i;e=null;let a=null;for(t=0;r;){t++;let o=r,s=0;for(let e=0;e<n&&(s++,o=o.nextZ,o);e++);let c=n;for(;s>0||c>0&&o;)s!==0&&(c===0||!o||r.z<=o.z)?(i=r,r=r.nextZ,s--):(i=o,o=o.nextZ,c--),a?a.nextZ=i:e=i,i.prevZ=a,a=i;r=o}a.nextZ=null,n*=2}while(t>1);return e}function yu(e,t,n,r,i){return e=(e-n)*i|0,t=(t-r)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function bu(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function xu(e,t,n,r,i,a,o,s){return(i-o)*(t-s)>=(e-o)*(a-s)&&(e-o)*(r-s)>=(n-o)*(t-s)&&(n-o)*(a-s)>=(i-o)*(r-s)}function Su(e,t,n,r,i,a,o,s){return(e!==o||t!==s)&&xu(e,t,n,r,i,a,o,s)}function Cu(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!ku(e,t)&&(Au(e,t)&&Au(t,e)&&ju(e,t)&&(wu(e.prev,e,t.prev)||wu(e,t.prev,t))||Tu(e,t)&&wu(e.prev,e,e.next)>0&&wu(t.prev,t,t.next)>0)}function wu(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Tu(e,t){return e.x===t.x&&e.y===t.y}function Eu(e,t,n,r){let i=Ou(wu(e,t,n)),a=Ou(wu(e,t,r)),o=Ou(wu(n,r,e)),s=Ou(wu(n,r,t));return!!(i!==a&&o!==s||i===0&&Du(e,n,t)||a===0&&Du(e,r,t)||o===0&&Du(n,e,r)||s===0&&Du(n,t,r))}function Du(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Ou(e){return e>0?1:e<0?-1:0}function ku(e,t){let n=e;do{if(n.i!==e.i&&n.next.i!==e.i&&n.i!==t.i&&n.next.i!==t.i&&Eu(n,n.next,e,t))return!0;n=n.next}while(n!==e);return!1}function Au(e,t){return wu(e.prev,e,e.next)<0?wu(e,t,e.next)>=0&&wu(e,e.prev,t)>=0:wu(e,t,e.prev)<0||wu(e,e.next,t)<0}function ju(e,t){let n=e,r=!1,i=(e.x+t.x)/2,a=(e.y+t.y)/2;do n.y>a!=n.next.y>a&&n.next.y!==n.y&&i<(n.next.x-n.x)*(a-n.y)/(n.next.y-n.y)+n.x&&(r=!r),n=n.next;while(n!==e);return r}function Mu(e,t){let n=Fu(e.i,e.x,e.y),r=Fu(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,r.next=n,n.prev=r,a.next=r,r.prev=a,r}function Nu(e,t,n,r){let i=Fu(e,t,n);return r?(i.next=r.next,i.prev=r,r.next.prev=i,r.next=i):(i.prev=i,i.next=i),i}function Pu(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function Fu(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Iu(e,t,n,r){let i=0;for(let a=t,o=n-r;a<n;a+=r)i+=(e[o]-e[a])*(e[a+1]+e[o+1]),o=a;return i}var Lu=class{static triangulate(e,t,n=2){return iu(e,t,n)}},Ru=class e{static area(e){let t=e.length,n=0;for(let r=t-1,i=0;i<t;r=i++)n+=e[r].x*e[i].y-e[i].x*e[r].y;return n*.5}static isClockWise(t){return e.area(t)<0}static triangulateShape(e,t){let n=[],r=[],i=[];zu(e),Bu(n,e);let a=e.length;t.forEach(zu);for(let e=0;e<t.length;e++)r.push(a),a+=t[e].length,Bu(n,t[e]);let o=Lu.triangulate(n,r);for(let e=0;e<o.length;e+=3)i.push(o.slice(e,e+3));return i}};function zu(e){let t=e.length;t>2&&e[t-1].equals(e[0])&&e.pop()}function Bu(e,t){for(let n=0;n<t.length;n++)e.push(t[n].x),e.push(t[n].y)}var Vu=class e extends zc{constructor(e=new ru([new H(.5,.5),new H(-.5,.5),new H(-.5,-.5),new H(.5,-.5)]),t={}){super(),this.type=`ExtrudeGeometry`,this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,r=[],i=[];for(let t=0,n=e.length;t<n;t++){let n=e[t];a(n)}this.setAttribute(`position`,new Dc(r,3)),this.setAttribute(`uv`,new Dc(i,2)),this.computeVertexNormals();function a(e){let a=[],o=t.curveSegments===void 0?12:t.curveSegments,s=t.steps===void 0?1:t.steps,c=t.depth===void 0?1:t.depth,l=t.bevelEnabled===void 0||t.bevelEnabled,u=t.bevelThickness===void 0?.2:t.bevelThickness,d=t.bevelSize===void 0?u-.1:t.bevelSize,f=t.bevelOffset===void 0?0:t.bevelOffset,p=t.bevelSegments===void 0?3:t.bevelSegments,m=t.extrudePath,h=t.UVGenerator===void 0?Hu:t.UVGenerator,g,_=!1,v,y,b,x;if(m){g=m.getSpacedPoints(s),_=!0,l=!1;let e=m.isCatmullRomCurve3?m.closed:!1;v=m.computeFrenetFrames(s,e),y=new U,b=new U,x=new U}l||(p=0,u=0,d=0,f=0);let S=e.extractPoints(o),C=S.shape,w=S.holes;if(!Ru.isClockWise(C)){C=C.reverse();for(let e=0,t=w.length;e<t;e++){let t=w[e];Ru.isClockWise(t)&&(w[e]=t.reverse())}}function T(e){let t=e[0];for(let n=1;n<=e.length;n++){let r=n%e.length,i=e[r],a=i.x-t.x,o=i.y-t.y,s=a*a+o*o,c=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(t.x),Math.abs(t.y));if(s<=10000000000000001e-36*c*c){e.splice(r,1),n--;continue}t=i}}T(C),w.forEach(T);let E=w.length,D=C;for(let e=0;e<E;e++){let t=w[e];C=C.concat(t)}function O(e,t,n){return t||V(`ExtrudeGeometry: vec does not exist`),e.clone().addScaledVector(t,n)}let k=C.length;function A(e,t,n){let r,i,a,o=e.x-t.x,s=e.y-t.y,c=n.x-e.x,l=n.y-e.y,u=o*o+s*s,d=o*l-s*c;if(Math.abs(d)>2**-52){let d=Math.sqrt(u),f=Math.sqrt(c*c+l*l),p=t.x-s/d,m=t.y+o/d,h=n.x-l/f,g=n.y+c/f,_=((h-p)*l-(g-m)*c)/(o*l-s*c);r=p+o*_-e.x,i=m+s*_-e.y;let v=r*r+i*i;if(v<=2)return new H(r,i);a=Math.sqrt(v/2)}else{let e=!1;o>2**-52?c>2**-52&&(e=!0):o<-(2**-52)?c<-(2**-52)&&(e=!0):Math.sign(s)===Math.sign(l)&&(e=!0),e?(r=-s,i=o,a=Math.sqrt(u)):(r=o,i=s,a=Math.sqrt(u/2))}return new H(r/a,i/a)}let j=[];for(let e=0,t=D.length,n=t-1,r=e+1;e<t;e++,n++,r++)n===t&&(n=0),r===t&&(r=0),j[e]=A(D[e],D[n],D[r]);let M=[],N,P=j.concat();for(let e=0,t=E;e<t;e++){let t=w[e];N=[];for(let e=0,n=t.length,r=n-1,i=e+1;e<n;e++,r++,i++)r===n&&(r=0),i===n&&(i=0),N[e]=A(t[e],t[r],t[i]);M.push(N),P=P.concat(N)}let F;if(p===0)F=Ru.triangulateShape(D,w);else{let e=[],t=[];for(let n=0;n<p;n++){let r=n/p,i=u*Math.cos(r*Math.PI/2),a=d*Math.sin(r*Math.PI/2)+f;for(let t=0,n=D.length;t<n;t++){let n=O(D[t],j[t],a);I(n.x,n.y,-i),r===0&&e.push(n)}for(let e=0,n=E;e<n;e++){let n=w[e];N=M[e];let o=[];for(let e=0,t=n.length;e<t;e++){let t=O(n[e],N[e],a);I(t.x,t.y,-i),r===0&&o.push(t)}r===0&&t.push(o)}}F=Ru.triangulateShape(e,t)}let ee=F.length,te=d+f;for(let e=0;e<k;e++){let t=l?O(C[e],P[e],te):C[e];_?(b.copy(v.normals[0]).multiplyScalar(t.x),y.copy(v.binormals[0]).multiplyScalar(t.y),x.copy(g[0]).add(b).add(y),I(x.x,x.y,x.z)):I(t.x,t.y,0)}for(let e=1;e<=s;e++)for(let t=0;t<k;t++){let n=l?O(C[t],P[t],te):C[t];_?(b.copy(v.normals[e]).multiplyScalar(n.x),y.copy(v.binormals[e]).multiplyScalar(n.y),x.copy(g[e]).add(b).add(y),I(x.x,x.y,x.z)):I(n.x,n.y,c/s*e)}for(let e=p-1;e>=0;e--){let t=e/p,n=u*Math.cos(t*Math.PI/2),r=d*Math.sin(t*Math.PI/2)+f;for(let e=0,t=D.length;e<t;e++){let t=O(D[e],j[e],r);I(t.x,t.y,c+n)}for(let e=0,t=w.length;e<t;e++){let t=w[e];N=M[e];for(let e=0,i=t.length;e<i;e++){let i=O(t[e],N[e],r);_?I(i.x,i.y+g[s-1].y,g[s-1].x+n):I(i.x,i.y,c+n)}}}ne(),re();function ne(){let e=r.length/3;if(l){let e=0,t=k*e;for(let e=0;e<ee;e++){let n=F[e];ae(n[2]+t,n[1]+t,n[0]+t)}e=s+p*2,t=k*e;for(let e=0;e<ee;e++){let n=F[e];ae(n[0]+t,n[1]+t,n[2]+t)}}else{for(let e=0;e<ee;e++){let t=F[e];ae(t[2],t[1],t[0])}for(let e=0;e<ee;e++){let t=F[e];ae(t[0]+k*s,t[1]+k*s,t[2]+k*s)}}n.addGroup(e,r.length/3-e,0)}function re(){let e=r.length/3,t=0;ie(D,t),t+=D.length;for(let e=0,n=w.length;e<n;e++){let n=w[e];ie(n,t),t+=n.length}n.addGroup(e,r.length/3-e,1)}function ie(e,t){let n=e.length;for(;--n>=0;){let r=n,i=n-1;i<0&&(i=e.length-1);for(let e=0,n=s+p*2;e<n;e++){let n=k*e,a=k*(e+1);oe(t+r+n,t+i+n,t+i+a,t+r+a)}}}function I(e,t,n){a.push(e),a.push(t),a.push(n)}function ae(e,t,i){se(e),se(t),se(i);let a=r.length/3,o=h.generateTopUV(n,r,a-3,a-2,a-1);ce(o[0]),ce(o[1]),ce(o[2])}function oe(e,t,i,a){se(e),se(t),se(a),se(t),se(i),se(a);let o=r.length/3,s=h.generateSideWallUV(n,r,o-6,o-3,o-2,o-1);ce(s[0]),ce(s[1]),ce(s[3]),ce(s[1]),ce(s[2]),ce(s[3])}function se(e){r.push(a[e*3+0]),r.push(a[e*3+1]),r.push(a[e*3+2])}function ce(e){i.push(e.x),i.push(e.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Uu(t,n,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}let i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new eu[i.type]().fromJSON(i)),new e(r,t.options)}},Hu={generateTopUV:function(e,t,n,r,i){let a=t[n*3],o=t[n*3+1],s=t[r*3],c=t[r*3+1],l=t[i*3],u=t[i*3+1];return[new H(a,o),new H(s,c),new H(l,u)]},generateSideWallUV:function(e,t,n,r,i,a){let o=t[n*3],s=t[n*3+1],c=t[n*3+2],l=t[r*3],u=t[r*3+1],d=t[r*3+2],f=t[i*3],p=t[i*3+1],m=t[i*3+2],h=t[a*3],g=t[a*3+1],_=t[a*3+2];return Math.abs(s-u)<Math.abs(o-l)?[new H(o,1-c),new H(l,1-d),new H(f,1-m),new H(h,1-_)]:[new H(s,1-c),new H(u,1-d),new H(p,1-m),new H(g,1-_)]}};function Uu(e,t,n){if(n.shapes=[],Array.isArray(e))for(let t=0,r=e.length;t<r;t++){let r=e[t];n.shapes.push(r.uuid)}else n.shapes.push(e.uuid);return n.options=Object.assign({},t),t.extrudePath!==void 0&&(n.options.extrudePath=t.extrudePath.toJSON()),n}var Wu=class e extends zc{constructor(e=[new H(0,-.5),new H(.5,0),new H(0,.5)],t=12,n=0,r=Math.PI*2){super(),this.type=`LatheGeometry`,this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=go(r,0,Math.PI*2);let i=[],a=[],o=[],s=[],c=[],l=1/t,u=new U,d=new H,f=new U,p=new U,m=new U,h=0,g=0;for(let t=0;t<=e.length-1;t++)switch(t){case 0:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,m.copy(f),f.normalize(),s.push(f.x,f.y,f.z);break;case e.length-1:s.push(m.x,m.y,m.z);break;default:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,p.copy(f),f.x+=m.x,f.y+=m.y,f.z+=m.z,f.normalize(),s.push(f.x,f.y,f.z),m.copy(p)}for(let i=0;i<=t;i++){let f=n+i*l*r,p=Math.sin(f),m=Math.cos(f);for(let n=0;n<=e.length-1;n++){u.x=e[n].x*p,u.y=e[n].y,u.z=e[n].x*m,a.push(u.x,u.y,u.z),d.x=i/t,d.y=n/(e.length-1),o.push(d.x,d.y);let r=s[3*n+0]*p,l=s[3*n+1],f=s[3*n+0]*m;c.push(r,l,f)}}for(let n=0;n<t;n++)for(let t=0;t<e.length-1;t++){let r=t+n*e.length,a=r,o=r+e.length,s=r+e.length+1,c=r+1;i.push(a,o,c),i.push(s,c,o)}this.setIndex(i),this.setAttribute(`position`,new Dc(a,3)),this.setAttribute(`uv`,new Dc(o,2)),this.setAttribute(`normal`,new Dc(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.points,t.segments,t.phiStart,t.phiLength)}},Gu=class e extends El{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type=`OctahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ku=class e extends zc{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new Dc(p,3)),this.setAttribute(`normal`,new Dc(m,3)),this.setAttribute(`uv`,new Dc(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},qu=class e extends zc{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new U,d=new U,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new Dc(p,3)),this.setAttribute(`normal`,new Dc(m,3)),this.setAttribute(`uv`,new Dc(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Ju=class e extends zc{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new U,f=new U,p=new U;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new Dc(c,3)),this.setAttribute(`normal`,new Dc(l,3)),this.setAttribute(`uv`,new Dc(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};function Yu(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Zu(i))i.isRenderTargetTexture?(B(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(Zu(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function Xu(e){let t={};for(let n=0;n<e.length;n++){let r=Yu(e[n]);for(let e in r)t[e]=r[e]}return t}function Zu(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Qu(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function $u(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ko.workingColorSpace}var ed={clone:Yu,merge:Xu},td=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,nd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,rd=class extends Gc{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=td,this.fragmentShader=nd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Yu(e.uniforms),this.uniformsGroups=Qu(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new W().setHex(r.value);break;case`v2`:this.uniforms[n].value=new H().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new U().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new rs().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new Vo().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new cs().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},id=class extends rd{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},ad=class extends Gc{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new W(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new W(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new H(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new vs,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},od=class extends ad{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new H(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return go(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new W(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new W(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new W(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},sd=class extends Gc{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Wa,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},cd=class extends Gc{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function ld(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function ud(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}var dd=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},fd=class extends dd{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Va,endingEnd:Va}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Ha:i=e,o=2*t-n;break;case Ua:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Ha:a=e,s=2*n-t;break;case Ua:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},pd=class extends dd{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},md=class extends dd{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},hd=class extends dd{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=vd(n,t,g,y,r);i[p]=gd(x,o,_,b,m)}return i}};function gd(e,t,n,r,i){let a=1-e;return a*a*a*t+3*a*a*e*n+3*a*e*e*r+e*e*e*i}function _d(e,t,n,r,i){let a=1-e;return 3*a*a*(n-t)+6*a*e*(r-n)+3*e*e*(i-r)}function vd(e,t,n,r,i){let a=(e-t)/(i-t);for(let o=0;o<8;o++){let o=gd(a,t,n,r,i)-e;if(Math.abs(o)<1e-10)break;let s=_d(a,t,n,r,i);if(Math.abs(s)<1e-10)break;a=Math.max(0,Math.min(1,a-o/s))}return a}var yd=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=ld(t,this.TimeBufferType),this.values=ld(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ld(e.times,Array),values:ld(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t),ud(e.settings)&&(n.settings={inTangents:ld(e.settings.inTangents,Array),outTangents:ld(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new md(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new pd(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new fd(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new hd(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case La:t=this.InterpolantFactoryMethodDiscrete;break;case Ra:t=this.InterpolantFactoryMethodLinear;break;case za:t=this.InterpolantFactoryMethodSmooth;break;case Ba:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return B(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return La;case this.InterpolantFactoryMethodLinear:return Ra;case this.InterpolantFactoryMethodSmooth:return za;case this.InterpolantFactoryMethodBezier:return Ba}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;ud(this.settings)&&(bd(this.settings.inTangents,e),bd(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(V(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(V(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){V(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){V(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&eo(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){V(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===za,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,ud(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function bd(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]*=t}yd.prototype.ValueTypeName=``,yd.prototype.TimeBufferType=Float32Array,yd.prototype.ValueBufferType=Float32Array,yd.prototype.DefaultInterpolation=Ra;var xd=class extends yd{constructor(e,t,n){super(e,t,n)}};xd.prototype.ValueTypeName=`bool`,xd.prototype.ValueBufferType=Array,xd.prototype.DefaultInterpolation=La,xd.prototype.InterpolantFactoryMethodLinear=void 0,xd.prototype.InterpolantFactoryMethodSmooth=void 0;var Sd=class extends yd{constructor(e,t,n,r){super(e,t,n,r)}};Sd.prototype.ValueTypeName=`color`;var Cd=class extends yd{constructor(e,t,n,r){super(e,t,n,r)}};Cd.prototype.ValueTypeName=`number`;var wd=class extends dd{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Ro.slerpFlat(i,0,a,c-o,a,c,s);return i}},Td=class extends yd{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new wd(this.times,this.values,this.getValueSize(),e)}};Td.prototype.ValueTypeName=`quaternion`,Td.prototype.InterpolantFactoryMethodSmooth=void 0;var Ed=class extends yd{constructor(e,t,n){super(e,t,n)}};Ed.prototype.ValueTypeName=`string`,Ed.prototype.ValueBufferType=Array,Ed.prototype.DefaultInterpolation=La,Ed.prototype.InterpolantFactoryMethodLinear=void 0,Ed.prototype.InterpolantFactoryMethodSmooth=void 0;var Dd=class extends yd{constructor(e,t,n,r){super(e,t,n,r)}};Dd.prototype.ValueTypeName=`vector`;var Od=class extends Fs{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new W(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},kd=class extends Od{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(Fs.DEFAULT_UP),this.updateMatrix(),this.groundColor=new W(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},Ad=new cs,jd=new U,Md=new U,Nd=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new H(512,512),this.mapType=Mi,this.map=null,this.mapPass=null,this.matrix=new cs,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new _l,this._frameExtents=new H(1,1),this._viewportCount=1,this._viewports=[new rs(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;jd.setFromMatrixPosition(e.matrixWorld),t.position.copy(jd),Md.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Md),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,r){Ad.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(Ad,e.coordinateSystem,e.reversedDepth);let i=this._frameExtents,a=r?r.z/i.x:1,o=r?r.w/i.y:1,s=r?r.x/i.x:0,c=r?r.y/i.y:0;e.coordinateSystem===2001||e.reversedDepth?t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),t.multiply(Ad)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Pd=new U,Fd=new Ro,Id=new U,Ld=class extends Fs{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new cs,this.projectionMatrix=new cs,this.projectionMatrixInverse=new cs,this.coordinateSystem=Qa,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Pd,Fd,Id),Id.x===1&&Id.y===1&&Id.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Pd,Fd,Id.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Pd,Fd,Id),Id.x===1&&Id.y===1&&Id.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Pd,Fd,Id.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Rd=new U,zd=new H,Bd=new H,Vd=class extends Ld{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=mo*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(po*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return mo*2*Math.atan(Math.tan(po*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Rd.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Rd.x,Rd.y).multiplyScalar(-e/Rd.z),Rd.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Rd.x,Rd.y).multiplyScalar(-e/Rd.z)}getViewSize(e,t){return this.getViewBounds(e,zd,Bd),t.subVectors(Bd,zd)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(po*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Hd=class extends Nd{constructor(){super(new Vd(90,1,.5,500)),this.isPointLightShadow=!0}},Ud=class extends Od{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Hd}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},Wd=class extends Ld{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Gd=class extends Nd{constructor(){super(new Wd(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Kd=class extends Od{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(Fs.DEFAULT_UP),this.updateMatrix(),this.target=new Fs,this.shadow=new Gd}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},qd=class extends zc{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type=`InstancedBufferGeometry`,this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}},Jd=-90,Yd=1,Xd=class extends Fs{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Vd(Jd,Yd,e,t);r.layers=this.layers,this.add(r);let i=new Vd(Jd,Yd,e,t);i.layers=this.layers,this.add(i);let a=new Vd(Jd,Yd,e,t);a.layers=this.layers,this.add(a);let o=new Vd(Jd,Yd,e,t);o.layers=this.layers,this.add(o);let s=new Vd(Jd,Yd,e,t);s.layers=this.layers,this.add(s);let c=new Vd(Jd,Yd,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Zd=class extends Vd{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Qd=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=$d.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function $d(){this._document.hidden===!1&&this.reset()}var ef=`\\[\\]\\.:\\/`,tf=RegExp(`[\\[\\]\\.:\\/]`,`g`),nf=`[^\\[\\]\\.:\\/]`,rf=`[^`+ef.replace(`\\.`,``)+`]`,af=`((?:WC+[\\/:])*)`.replace(`WC`,nf),of=`(WCOD+)?`.replace(`WCOD`,rf),sf=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,nf),cf=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,nf),lf=RegExp(`^`+af+of+sf+cf+`$`),uf=[`material`,`materials`,`bones`,`map`],df=class{constructor(e,t,n){let r=n||ff.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ff=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(tf,``)}static parseTrackName(e){let t=lf.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);uf.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){B(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){V(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){V(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){V(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){V(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){V(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;V(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ff.Composite=df,ff.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},ff.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},ff.prototype.GetterByBindingType=[ff.prototype._getValue_direct,ff.prototype._getValue_array,ff.prototype._getValue_arrayElement,ff.prototype._getValue_toArray],ff.prototype.SetterByBindingTypeAndVersioning=[[ff.prototype._setValue_direct,ff.prototype._setValue_direct_setNeedsUpdate,ff.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ff.prototype._setValue_array,ff.prototype._setValue_array_setNeedsUpdate,ff.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ff.prototype._setValue_arrayElement,ff.prototype._setValue_arrayElement_setNeedsUpdate,ff.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ff.prototype._setValue_fromArray,ff.prototype._setValue_fromArray_setNeedsUpdate,ff.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}};function pf(e,t,n,r){let i=mf(r);switch(n){case Gi:return e*t;case Xi:return e*t/i.components*i.byteLength;case Zi:return e*t/i.components*i.byteLength;case Qi:return e*t*2/i.components*i.byteLength;case $i:return e*t*2/i.components*i.byteLength;case Ki:return e*t*3/i.components*i.byteLength;case qi:return e*t*4/i.components*i.byteLength;case ea:return e*t*4/i.components*i.byteLength;case ta:case na:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ra:case ia:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case oa:case ca:return Math.max(e,16)*Math.max(t,8)/4;case aa:case sa:return Math.max(e,8)*Math.max(t,8)/2;case la:case ua:case fa:case pa:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case da:case ma:case ha:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ga:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case _a:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case va:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case ya:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case ba:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case xa:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case Sa:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Ca:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case wa:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case Ta:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Ea:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Da:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case Oa:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case ka:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Aa:case ja:case Ma:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Na:case Pa:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Fa:case Ia:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function mf(e){switch(e){case Mi:case Ni:return{byteLength:1,components:1};case Fi:case Pi:case zi:return{byteLength:2,components:1};case Bi:case Vi:return{byteLength:2,components:4};case Li:case Ii:case Ri:return{byteLength:4,components:1};case Ui:case Wi:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`186`}})),typeof window<`u`&&(window.__THREE__?B(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`186`);function hf(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function gf(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var _f={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},G={common:{diffuse:{value:new W(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Vo},alphaMap:{value:null},alphaMapTransform:{value:new Vo},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Vo}},envmap:{envMap:{value:null},envMapRotation:{value:new Vo},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Vo}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Vo}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Vo},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Vo},normalScale:{value:new H(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Vo},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Vo}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Vo}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Vo}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new W(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new U},probesMax:{value:new U},probesResolution:{value:new U}},points:{diffuse:{value:new W(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Vo},alphaTest:{value:0},uvTransform:{value:new Vo}},sprite:{diffuse:{value:new W(16777215)},opacity:{value:1},center:{value:new H(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Vo},alphaMap:{value:null},alphaMapTransform:{value:new Vo},alphaTest:{value:0}}},vf={basic:{uniforms:Xu([G.common,G.specularmap,G.envmap,G.aomap,G.lightmap,G.fog]),vertexShader:_f.meshbasic_vert,fragmentShader:_f.meshbasic_frag},lambert:{uniforms:Xu([G.common,G.specularmap,G.envmap,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.fog,G.lights,{emissive:{value:new W(0)},envMapIntensity:{value:1}}]),vertexShader:_f.meshlambert_vert,fragmentShader:_f.meshlambert_frag},phong:{uniforms:Xu([G.common,G.specularmap,G.envmap,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.fog,G.lights,{emissive:{value:new W(0)},specular:{value:new W(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_f.meshphong_vert,fragmentShader:_f.meshphong_frag},standard:{uniforms:Xu([G.common,G.envmap,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.roughnessmap,G.metalnessmap,G.fog,G.lights,{emissive:{value:new W(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_f.meshphysical_vert,fragmentShader:_f.meshphysical_frag},toon:{uniforms:Xu([G.common,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.gradientmap,G.fog,G.lights,{emissive:{value:new W(0)}}]),vertexShader:_f.meshtoon_vert,fragmentShader:_f.meshtoon_frag},matcap:{uniforms:Xu([G.common,G.bumpmap,G.normalmap,G.displacementmap,G.fog,{matcap:{value:null}}]),vertexShader:_f.meshmatcap_vert,fragmentShader:_f.meshmatcap_frag},points:{uniforms:Xu([G.points,G.fog]),vertexShader:_f.points_vert,fragmentShader:_f.points_frag},dashed:{uniforms:Xu([G.common,G.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_f.linedashed_vert,fragmentShader:_f.linedashed_frag},depth:{uniforms:Xu([G.common,G.displacementmap]),vertexShader:_f.depth_vert,fragmentShader:_f.depth_frag},normal:{uniforms:Xu([G.common,G.bumpmap,G.normalmap,G.displacementmap,{opacity:{value:1}}]),vertexShader:_f.meshnormal_vert,fragmentShader:_f.meshnormal_frag},sprite:{uniforms:Xu([G.sprite,G.fog]),vertexShader:_f.sprite_vert,fragmentShader:_f.sprite_frag},background:{uniforms:{uvTransform:{value:new Vo},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_f.background_vert,fragmentShader:_f.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Vo}},vertexShader:_f.backgroundCube_vert,fragmentShader:_f.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_f.cube_vert,fragmentShader:_f.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_f.equirect_vert,fragmentShader:_f.equirect_frag},distance:{uniforms:Xu([G.common,G.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_f.distance_vert,fragmentShader:_f.distance_frag},shadow:{uniforms:Xu([G.lights,G.fog,{color:{value:new W(0)},opacity:{value:1}}]),vertexShader:_f.shadow_vert,fragmentShader:_f.shadow_frag}};vf.physical={uniforms:Xu([vf.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Vo},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Vo},clearcoatNormalScale:{value:new H(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Vo},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Vo},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Vo},sheen:{value:0},sheenColor:{value:new W(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Vo},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Vo},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Vo},transmissionSamplerSize:{value:new H},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Vo},attenuationDistance:{value:0},attenuationColor:{value:new W(0)},specularColor:{value:new W(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Vo},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Vo},anisotropyVector:{value:new H},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Vo}}]),vertexShader:_f.meshphysical_vert,fragmentShader:_f.meshphysical_frag};var yf={r:0,b:0,g:0},bf=new cs,xf=new Vo;xf.set(-1,0,0,0,1,0,0,0,1);function Sf(e,t,n,r,i,a){let o=new W(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new ll(new Cl(1,1,1),new rd({name:`BackgroundCubeMaterial`,uniforms:Yu(vf.backgroundCube.uniforms),vertexShader:vf.backgroundCube.vertexShader,fragmentShader:vf.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(bf.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(xf),l.material.toneMapped=Ko.getTransfer(i.colorSpace)!==Ja,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new ll(new Ku(2,2),new rd({name:`BackgroundMaterial`,uniforms:Yu(vf.background.uniforms),vertexShader:vf.background.vertexShader,fragmentShader:vf.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Ko.getTransfer(i.colorSpace)!==Ja,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(yf,$u(e)),n.buffers.color.setClear(yf.r,yf.g,yf.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function Cf(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function wf(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function Tf(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(B(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&B(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function Ef(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Uc,s=new Vo,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Df=4,Of=6,kf=20,Af=256,jf=new Wd,Mf=new W,Nf=null,Pf=0,Ff=0,If=!1,Lf=new U,Rf=new U,zf=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Lf}=i;Nf=this._renderer.getRenderTarget(),Pf=this._renderer.getActiveCubeFace(),Ff=this._renderer.getActiveMipmapLevel(),If=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Kf(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Gf(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Nf,Pf,Ff),this._renderer.xr.enabled=If,e.scissorTest=!1,Hf(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Nf=this._renderer.getRenderTarget(),Pf=this._renderer.getActiveCubeFace(),Ff=this._renderer.getActiveMipmapLevel(),If=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:ki,minFilter:ki,generateMipmaps:!1,type:zi,format:qi,colorSpace:Ka,depthBuffer:!1},r=Vf(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Vf(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Bf(r)),this._blurMaterial=Wf(r,e,t),this._ggxMaterial=Uf(r,e,t)}return r}_compileMaterial(e){let t=new ll(new zc,e);this._renderer.compile(t,jf)}_sceneToCubeUV(e,t,n,r,i){let a=new Vd(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(Mf),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ll(new Cl,new Zc({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(Mf),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Hf(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Kf()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Gf());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Hf(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,jf)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-Df?n-d+Df:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Hf(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,jf),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Hf(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,jf)}_blur(e,t,n,r){let i=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(e,i,t,n,a),this._blurPass(i,e,n,n,a)}_blurPass(e,t,n,r,i){let a=this._renderer,o=this._blurMaterial,s=this._lodMeshes[r];s.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=i,c.mipInt.value=this._lodMax-n;let l=this._sizeLods[r];Hf(t,3*l*(r>this._lodMax-Df?r-this._lodMax+Df:0),4*(this._cubeSize-l),3*l,2*l),a.setRenderTarget(t),a.render(s,jf)}};function Bf(e){let t=[],n=[],r=e,i=e-Df+1+Of;for(let e=0;e<i;e++){let e=2**r;t.push(e);let i=1/(e-2),a=-i,o=1+i,s=[a,a,o,a,o,o,a,a,o,o,a,o],c=new Float32Array(108),l=new Float32Array(108);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];c.set(r,18*e);for(let t=0;t<6;t++){let n=s[t*2]*2-1,r=s[t*2+1]*2-1;e===0?Rf.set(1,r,n):e===1?Rf.set(-n,1,-r):e===2?Rf.set(-n,r,1):e===3?Rf.set(-1,r,-n):e===4?Rf.set(-n,-1,r):Rf.set(n,r,-1),Rf.toArray(l,(e*6+t)*3)}}let u=new zc;u.setAttribute(`position`,new wc(c,3)),u.setAttribute(`outputDirection`,new wc(l,3)),n.push(new ll(u,null)),r>Df&&r--}return{lodMeshes:n,sizeLods:t}}function Vf(e,t,n){let r=new as(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Hf(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Uf(e,t,n){return new rd({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:Af,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:qf(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Wf(e,t,n){return new rd({name:`SphericalGaussianBlur`,defines:{SAMPLES:kf,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:qf(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Gf(){return new rd({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:qf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Kf(){return new rd({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:qf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function qf(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Jf=class extends as{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new vl(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Cl(5,5,5),i=new rd({name:`CubemapFromEquirect`,uniforms:Yu(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new ll(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=ki),new Xd(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Yf(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Jf(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new zf(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new zf(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Xf(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&oo(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Zf(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?Ec:Tc)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Qf(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function $f(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:V(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function ep(e,t,n){let r=new WeakMap,i=new rs;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new os(h,p,m,u);g.type=Ri,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new H(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function tp(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var np={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function rp(e,t,n,r,i,a){let o=new as(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=new zc;l.setAttribute(`position`,new Dc([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute(`uv`,new Dc([0,2,0,0,2,0],2));let u=new id({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new ll(l,u),f=new Wd(-1,1,1,-1,0,1),p=null,m=null,h=!1,g,_=null,v=[],y=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<v.length;n++){let r=v[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){v=e,y=v.length>0&&v[0].isRenderPass===!0;let t=o.width,n=o.height;v.length>0&&s===null&&(s=new as(t,n,{type:zi,depthBuffer:!1,stencilBuffer:!1}),c=new as(t,n,{type:zi,depthBuffer:!1,stencilBuffer:!1}));for(let e=0;e<v.length;e++){let r=v[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(h||e.toneMapping===0&&v.length===0)return!1;if(_=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return y===!1&&e.setRenderTarget(o),g=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return y},this.end=function(e,t){e.toneMapping=g,h=!0;let n=o,r=s;for(let i=0;i<v.length;i++){let a=v[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(p!==e.outputColorSpace||m!==e.toneMapping){p=e.outputColorSpace,m=e.toneMapping,u.defines={},Ko.getTransfer(p)===`srgb`&&(u.defines.SRGB_TRANSFER=``);let t=np[m];t&&(u.defines[t]=``),u.needsUpdate=!0}u.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(_),e.render(d,f),_=null,h=!1},this.isCompositing=function(){return h},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),l.dispose(),u.dispose()}}var ip=new ns,ap=new bl(1,1),op=new os,sp=new ss,cp=new vl,lp=[],up=[],dp=new Float32Array(16),fp=new Float32Array(9),pp=new Float32Array(4);function mp(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=lp[i];if(a===void 0&&(a=new Float32Array(i),lp[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function hp(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function gp(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function _p(e,t){let n=up[t];n===void 0&&(n=new Int32Array(t),up[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function vp(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function yp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(hp(n,t))return;e.uniform2fv(this.addr,t),gp(n,t)}}function bp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(hp(n,t))return;e.uniform3fv(this.addr,t),gp(n,t)}}function xp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(hp(n,t))return;e.uniform4fv(this.addr,t),gp(n,t)}}function Sp(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(hp(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),gp(n,t)}else{if(hp(n,r))return;pp.set(r),e.uniformMatrix2fv(this.addr,!1,pp),gp(n,r)}}function Cp(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(hp(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),gp(n,t)}else{if(hp(n,r))return;fp.set(r),e.uniformMatrix3fv(this.addr,!1,fp),gp(n,r)}}function wp(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(hp(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),gp(n,t)}else{if(hp(n,r))return;dp.set(r),e.uniformMatrix4fv(this.addr,!1,dp),gp(n,r)}}function Tp(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Ep(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(hp(n,t))return;e.uniform2iv(this.addr,t),gp(n,t)}}function Dp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(hp(n,t))return;e.uniform3iv(this.addr,t),gp(n,t)}}function Op(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(hp(n,t))return;e.uniform4iv(this.addr,t),gp(n,t)}}function kp(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Ap(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(hp(n,t))return;e.uniform2uiv(this.addr,t),gp(n,t)}}function jp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(hp(n,t))return;e.uniform3uiv(this.addr,t),gp(n,t)}}function Mp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(hp(n,t))return;e.uniform4uiv(this.addr,t),gp(n,t)}}function Np(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(ap.compareFunction=n.isReversedDepthBuffer()?518:515,a=ap):a=ip,n.setTexture2D(t||a,i)}function Pp(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||sp,i)}function Fp(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||cp,i)}function Ip(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||op,i)}function Lp(e){switch(e){case 5126:return vp;case 35664:return yp;case 35665:return bp;case 35666:return xp;case 35674:return Sp;case 35675:return Cp;case 35676:return wp;case 5124:case 35670:return Tp;case 35667:case 35671:return Ep;case 35668:case 35672:return Dp;case 35669:case 35673:return Op;case 5125:return kp;case 36294:return Ap;case 36295:return jp;case 36296:return Mp;case 35678:case 36198:case 36298:case 36306:case 35682:return Np;case 35679:case 36299:case 36307:return Pp;case 35680:case 36300:case 36308:case 36293:return Fp;case 36289:case 36303:case 36311:case 36292:return Ip}}function Rp(e,t){e.uniform1fv(this.addr,t)}function zp(e,t){let n=mp(t,this.size,2);e.uniform2fv(this.addr,n)}function Bp(e,t){let n=mp(t,this.size,3);e.uniform3fv(this.addr,n)}function Vp(e,t){let n=mp(t,this.size,4);e.uniform4fv(this.addr,n)}function Hp(e,t){let n=mp(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Up(e,t){let n=mp(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Wp(e,t){let n=mp(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Gp(e,t){e.uniform1iv(this.addr,t)}function Kp(e,t){e.uniform2iv(this.addr,t)}function qp(e,t){e.uniform3iv(this.addr,t)}function Jp(e,t){e.uniform4iv(this.addr,t)}function Yp(e,t){e.uniform1uiv(this.addr,t)}function Xp(e,t){e.uniform2uiv(this.addr,t)}function Zp(e,t){e.uniform3uiv(this.addr,t)}function Qp(e,t){e.uniform4uiv(this.addr,t)}function $p(e,t,n){let r=this.cache,i=t.length,a=_p(n,i);hp(r,a)||(e.uniform1iv(this.addr,a),gp(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?ap:ip;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function em(e,t,n){let r=this.cache,i=t.length,a=_p(n,i);hp(r,a)||(e.uniform1iv(this.addr,a),gp(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||sp,a[e])}function tm(e,t,n){let r=this.cache,i=t.length,a=_p(n,i);hp(r,a)||(e.uniform1iv(this.addr,a),gp(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||cp,a[e])}function nm(e,t,n){let r=this.cache,i=t.length,a=_p(n,i);hp(r,a)||(e.uniform1iv(this.addr,a),gp(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||op,a[e])}function rm(e){switch(e){case 5126:return Rp;case 35664:return zp;case 35665:return Bp;case 35666:return Vp;case 35674:return Hp;case 35675:return Up;case 35676:return Wp;case 5124:case 35670:return Gp;case 35667:case 35671:return Kp;case 35668:case 35672:return qp;case 35669:case 35673:return Jp;case 5125:return Yp;case 36294:return Xp;case 36295:return Zp;case 36296:return Qp;case 35678:case 36198:case 36298:case 36306:case 35682:return $p;case 35679:case 36299:case 36307:return em;case 35680:case 36300:case 36308:case 36293:return tm;case 36289:case 36303:case 36311:case 36292:return nm}}var im=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Lp(t.type)}},am=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=rm(t.type)}},om=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},sm=/(\w+)(\])?(\[|\.)?/g;function cm(e,t){e.seq.push(t),e.map[t.id]=t}function lm(e,t,n){let r=e.name,i=r.length;for(sm.lastIndex=0;;){let a=sm.exec(r),o=sm.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){cm(n,l===void 0?new im(s,e,t):new am(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new om(s),cm(n,e)),n=e}}}var um=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);lm(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function dm(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var fm=37297,pm=0;function mm(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var hm=new Vo;function gm(e){Ko._getMatrix(hm,Ko.workingColorSpace,e);let t=`mat3( ${hm.elements.map(e=>e.toFixed(4))} )`;switch(Ko.getTransfer(e)){case qa:return[t,`LinearTransferOETF`];case Ja:return[t,`sRGBTransferOETF`];default:return B(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function _m(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+mm(e.getShaderSource(t),r)}return i}function vm(e,t){let n=gm(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ym={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function bm(e,t){let n=ym[t];return n===void 0?(B(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var xm=new U;function Sm(){return Ko.getLuminanceCoefficients(xm),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${xm.x.toFixed(4)}, ${xm.y.toFixed(4)}, ${xm.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Cm(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(Em).join(`
`)}function wm(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function Tm(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function Em(e){return e!==``}function Dm(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Om(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var km=/^[ \t]*#include +<([\w\d./]+)>/gm;function Am(e){return e.replace(km,Mm)}var jm=new Map;function Mm(e,t){let n=_f[t];if(n===void 0){let e=jm.get(t);if(e!==void 0)n=_f[e],B(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return Am(n)}var Nm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Pm(e){return e.replace(Nm,Fm)}function Fm(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Im(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Lm={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Rm(e){return Lm[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var zm={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function Bm(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:zm[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Vm={302:`ENVMAP_MODE_REFRACTION`};function Hm(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Vm[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Um={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Wm(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Um[e.combine]||`ENVMAP_BLENDING_NONE`}function Gm(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Km(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Rm(n),l=Bm(n),u=Hm(n),d=Wm(n),f=Gm(n),p=Cm(n),m=wm(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(Em).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(Em).join(`
`),_.length>0&&(_+=`
`)):(g=[Im(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(Em).join(`
`),_=[Im(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:_f.tonemapping_pars_fragment,n.toneMapping===0?``:bm(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,_f.colorspace_pars_fragment,vm(`linearToOutputTexel`,n.outputColorSpace),Sm(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(Em).join(`
`)),o=Am(o),o=Dm(o,n),o=Om(o,n),s=Am(s),s=Dm(s,n),s=Om(s,n),o=Pm(o),s=Pm(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=dm(i,i.VERTEX_SHADER,y),S=dm(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=_m(i,x,`vertex`),n=_m(i,S,`fragment`);V(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):B(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new um(i,h),T=Tm(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,fm)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=pm++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var qm=0,Jm=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Ym(e),t.set(e,n)),n}},Ym=class{constructor(e){this.id=qm++,this.code=e,this.usedTimes=0}};function Xm(e){return e===1030||e===37490||e===36285}function Zm(e,t,n,r,i,a){let o=new ys,s=new Jm,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&B(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=vf[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),M=e.state.buffers.depth.getReversed(),N=h.isInstancedMesh===!0,P=h.isBatchedMesh===!0,F=!!i.map,ee=!!i.matcap,te=!!x,ne=!!i.aoMap,re=!!i.lightMap,ie=!!i.bumpMap&&i.wireframe===!1,I=!!i.normalMap,ae=!!i.displacementMap,oe=!!i.emissiveMap,se=!!i.metalnessMap,ce=!!i.roughnessMap,le=i.anisotropy>0,ue=i.clearcoat>0,de=i.dispersion>0,fe=i.retroreflectivity>0,pe=i.iridescence>0,me=i.sheen>0,he=i.transmission>0,ge=le&&!!i.anisotropyMap,_e=ue&&!!i.clearcoatMap,ve=ue&&!!i.clearcoatNormalMap,ye=ue&&!!i.clearcoatRoughnessMap,be=pe&&!!i.iridescenceMap,L=pe&&!!i.iridescenceThicknessMap,xe=me&&!!i.sheenColorMap,Se=me&&!!i.sheenRoughnessMap,Ce=!!i.specularMap,R=!!i.specularColorMap,we=!!i.specularIntensityMap,z=he&&!!i.transmissionMap,Te=he&&!!i.thicknessMap,Ee=!!i.gradientMap,De=!!i.alphaMap,Oe=i.alphaTest>0,ke=!!i.alphaHash,Ae=!!i.extensions,je=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(je=e.toneMapping);let Me={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:P,batchingColor:P&&h._colorsTexture!==null,instancing:N,instancingColor:N&&h.instanceColor!==null,instancingMorph:N&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Ko.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:F,matcap:ee,envMap:te,envMapMode:te&&x.mapping,envMapCubeUVHeight:S,aoMap:ne,lightMap:re,bumpMap:ie,normalMap:I,displacementMap:ae,emissiveMap:oe,normalMapObjectSpace:I&&i.normalMapType===1,normalMapTangentSpace:I&&i.normalMapType===0,packedNormalMap:I&&i.normalMapType===0&&Xm(i.normalMap.format),metalnessMap:se,roughnessMap:ce,anisotropy:le,anisotropyMap:ge,clearcoat:ue,clearcoatMap:_e,clearcoatNormalMap:ve,clearcoatRoughnessMap:ye,dispersion:de,retroreflection:fe,iridescence:pe,iridescenceMap:be,iridescenceThicknessMap:L,sheen:me,sheenColorMap:xe,sheenRoughnessMap:Se,specularMap:Ce,specularColorMap:R,specularIntensityMap:we,transmission:he,transmissionMap:z,thicknessMap:Te,gradientMap:Ee,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:De,alphaTest:Oe,alphaHash:ke,combine:i.combine,mapUv:F&&m(i.map.channel),aoMapUv:ne&&m(i.aoMap.channel),lightMapUv:re&&m(i.lightMap.channel),bumpMapUv:ie&&m(i.bumpMap.channel),normalMapUv:I&&m(i.normalMap.channel),displacementMapUv:ae&&m(i.displacementMap.channel),emissiveMapUv:oe&&m(i.emissiveMap.channel),metalnessMapUv:se&&m(i.metalnessMap.channel),roughnessMapUv:ce&&m(i.roughnessMap.channel),anisotropyMapUv:ge&&m(i.anisotropyMap.channel),clearcoatMapUv:_e&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:ve&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ye&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:L&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:xe&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:Se&&m(i.sheenRoughnessMap.channel),specularMapUv:Ce&&m(i.specularMap.channel),specularColorMapUv:R&&m(i.specularColorMap.channel),specularIntensityMapUv:we&&m(i.specularIntensityMap.channel),transmissionMapUv:z&&m(i.transmissionMap.channel),thicknessMapUv:Te&&m(i.thicknessMap.channel),alphaMapUv:De&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(I||le),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(F||De),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&I===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:M,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:je,decodeVideoTexture:F&&i.map.isVideoTexture===!0&&Ko.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:oe&&i.emissiveMap.isVideoTexture===!0&&Ko.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:Ae&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Ae&&i.extensions.multiDraw===!0||P)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Me.vertexUv1s=c.has(1),Me.vertexUv2s=c.has(2),Me.vertexUv3s=c.has(3),c.clear(),Me}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=vf[t];n=ed.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Km(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Qm(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function $m(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function eh(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function th(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||$m),r.length>1&&r.sort(t||eh),i.length>1&&i.sort(t||eh)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function nh(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new th,e.set(t,[i])):n>=r.length?(i=new th,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function rh(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new U,color:new W};break;case`SpotLight`:n={position:new U,direction:new U,color:new W,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new U,color:new W,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new U,skyColor:new W,groundColor:new W};break;case`RectAreaLight`:n={color:new W,position:new U,halfWidth:new U,halfHeight:new U}}return e[t.id]=n,n}}}function ih(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var ah=0;function oh(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function sh(e){let t=new rh,n=ih(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new U);let i=new U,a=new cs,o=new cs;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(oh);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=G.LTC_FLOAT_1,r.rectAreaLTC2=G.LTC_FLOAT_2):(r.rectAreaLTC1=G.LTC_HALF_1,r.rectAreaLTC2=G.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=ah++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function ch(e){let t=new sh(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function lh(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new ch(e),t.set(n,[a])):r>=i.length?(a=new ch(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var uh=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,dh=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,fh=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],ph=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],mh=new cs,hh=new U,gh=new U;function _h(e,t,n){let r=new _l,i=new H,a=new H,o=new rs,s=new sd,c=new cd,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new rd({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new H},radius:{value:4}},vertexShader:uh,fragmentShader:dh}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new zc;m.setAttribute(`position`,new wc(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new ll(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(B(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){B(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){B(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new as(i.x,i.y,{format:Qi,type:zi,minFilter:ki,magFilter:ki,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new bl(i.x,i.y,Ri),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=Ji,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Ei,d.map.depthTexture.magFilter=Ei}else l.isPointLight?(d.map=new Jf(i.x),d.map.depthTexture=new xl(i.x,Li)):(d.map=new as(i.x,i.y),d.map.depthTexture=new bl(i.x,i.y,Li)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=Ji,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=ki,d.map.depthTexture.magFilter=ki):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Ei,d.map.depthTexture.magFilter=Ei);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let g=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();l.isPointLight!==!0&&d.updateMatrices(l,s);for(let t=0;t<g;t++){let i=d.getCamera(t);if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),hh.setFromMatrixPosition(l.matrixWorld),e.position.copy(hh),gh.copy(e.position),gh.add(fh[t]),e.up.copy(ph[t]),e.lookAt(gh),e.updateMatrixWorld(),n.makeTranslation(-hh.x,-hh.y,-hh.z),mh.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(mh,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}r=d.getFrustum(t),b(n,s,i,l,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null?n.mapPass=new as(i.x,i.y,{format:Qi,type:zi}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value.set(n.map.width,n.map.height),f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=y(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)b(c[e],i,a,o,s)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function vh(e,t){function n(){let t=!1,n=new rs,r=null,i=new rs(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?se(e.DEPTH_TEST):ce(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=co[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?se(e.STENCIL_TEST):ce(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new W(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,P=0,F=e.getParameter(e.VERSION);F.indexOf(`WebGL`)===-1?F.indexOf(`OpenGL ES`)!==-1&&(P=parseFloat(/^OpenGL ES (\d)/.exec(F)[1]),N=P>=2):(P=parseFloat(/^WebGL (\d)/.exec(F)[1]),N=P>=1);let ee=null,te={},ne=e.getParameter(e.SCISSOR_BOX),re=e.getParameter(e.VIEWPORT),ie=new rs().fromArray(ne),I=new rs().fromArray(re);function ae(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let oe={};oe[e.TEXTURE_2D]=ae(e.TEXTURE_2D,e.TEXTURE_2D,1),oe[e.TEXTURE_CUBE_MAP]=ae(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),oe[e.TEXTURE_2D_ARRAY]=ae(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),oe[e.TEXTURE_3D]=ae(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),se(e.DEPTH_TEST),o.setFunc(3),ge(!1),_e(1),se(e.CULL_FACE),me(0);function se(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function ce(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function le(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function ue(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function de(t){return h!==t&&(e.useProgram(t),h=t,!0)}let fe={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};fe[103]=e.MIN,fe[104]=e.MAX;let pe={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function me(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(ce(e.BLEND),g=!1);return}if(g===!1&&(se(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:V(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:V(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:V(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:V(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(fe[n],fe[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(pe[r],pe[i],pe[o],pe[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function he(t,n){t.side===2?ce(e.CULL_FACE):se(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ge(r),t.blending===1&&t.transparent===!1?me(0):me(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ye(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?se(e.SAMPLE_ALPHA_TO_COVERAGE):ce(e.SAMPLE_ALPHA_TO_COVERAGE)}function ge(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function _e(t){t===0?ce(e.CULL_FACE):(se(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ve(t){t!==k&&(N&&e.lineWidth(t),k=t)}function ye(t,n,r){t?(se(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):ce(e.POLYGON_OFFSET_FILL)}function be(t){t?se(e.SCISSOR_TEST):ce(e.SCISSOR_TEST)}function L(t){t===void 0&&(t=e.TEXTURE0+M-1),ee!==t&&(e.activeTexture(t),ee=t)}function xe(t,n,r){r===void 0&&(r=ee===null?e.TEXTURE0+M-1:ee);let i=te[r];i===void 0&&(i={type:void 0,texture:void 0},te[r]=i),(i.type!==t||i.texture!==n)&&(ee!==r&&(e.activeTexture(r),ee=r),e.bindTexture(t,n||oe[t]),i.type=t,i.texture=n)}function Se(){let t=te[ee];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Ce(){try{e.compressedTexImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function R(){try{e.compressedTexImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function we(){try{e.texSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function z(){try{e.texSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Te(){try{e.compressedTexSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ee(){try{e.compressedTexSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function De(){try{e.texStorage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Oe(){try{e.texStorage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function ke(){try{e.texImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ae(){try{e.texImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function je(t){return d[t]===void 0?e.getParameter(t):d[t]}function Me(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function Ne(t){ie.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ie.copy(t))}function Pe(t){I.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),I.copy(t))}function Fe(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Ie(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Le(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},ee=null,te={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new W(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ie.set(0,0,e.canvas.width,e.canvas.height),I.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:se,disable:ce,bindFramebuffer:le,drawBuffers:ue,useProgram:de,setBlending:me,setMaterial:he,setFlipSided:ge,setCullFace:_e,setLineWidth:ve,setPolygonOffset:ye,setScissorTest:be,activeTexture:L,bindTexture:xe,unbindTexture:Se,compressedTexImage2D:Ce,compressedTexImage3D:R,texImage2D:ke,texImage3D:Ae,pixelStorei:Me,getParameter:je,updateUBOMapping:Fe,uniformBlockBinding:Ie,texStorage2D:De,texStorage3D:Oe,texSubImage2D:we,texSubImage3D:z,compressedTexSubImage2D:Te,compressedTexSubImage3D:Ee,scissor:Ne,viewport:Pe,reset:Le}}function yh(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new H,u=new WeakMap,d=new Set,f,p=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function h(e,t){return m?new OffscreenCanvas(e,t):to(`canvas`)}function g(e,t,n){let r=1,i=Ce(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=h(n,a));let o=t?h(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),B(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&B(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function _(e){return e.generateMipmaps}function v(t){e.generateMipmap(t)}function y(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function b(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];B(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||B(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?qa:Ko.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function x(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,B(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function S(e,t){return _(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function C(e){let t=e.target;t.removeEventListener(`dispose`,C),T(t),t.isVideoTexture&&u.delete(t),t.isHTMLTexture&&d.delete(t)}function w(e){let t=e.target;t.removeEventListener(`dispose`,w),D(t)}function T(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&E(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function E(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function D(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(i[t])}r.remove(t)}let O=0;function k(){O=0}function A(){return O}function j(e){O=e}function M(){let e=O;return e>=i.maxTextures&&B(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),O+=1,e}function N(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function P(t,i){let a=r.get(t);if(t.isVideoTexture&&xe(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)B(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)B(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ce(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function F(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){ce(a,t,i);return}t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function ee(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){ce(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function te(t,i){let a=r.get(t);if(t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version){le(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let ne={[Ci]:e.REPEAT,[wi]:e.CLAMP_TO_EDGE,[Ti]:e.MIRRORED_REPEAT},re={[Ei]:e.NEAREST,[Di]:e.NEAREST_MIPMAP_NEAREST,[Oi]:e.NEAREST_MIPMAP_LINEAR,[ki]:e.LINEAR,[Ai]:e.LINEAR_MIPMAP_NEAREST,[ji]:e.LINEAR_MIPMAP_LINEAR},ie={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function I(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&B(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,ne[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,ne[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,ne[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,re[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,re[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,ie[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function ae(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,C));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=N(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&E(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function oe(e,t,n){return Math.floor(Math.floor(e/n)/t)}function se(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=oe(n.start,r.width,4),c=oe(t.start,r.width,4);n.start<=i+1&&a===c&&oe(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function ce(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=ae(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=Ko.getPrimaries(Ko.workingColorSpace),r=o.colorSpace===``?null:Ko.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=g(o.image,!1,i.maxTextureSize);t=Se(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=b(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);I(c,o);let h,y=o.mipmaps,C=o.isVideoTexture!==!0,w=f.__version===void 0||l===!0,T=u.dataReady,E=S(o,t);if(o.isDepthTexture)m=x(o.format===Yi,o.type),w&&(C?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(y.length>0){C&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,y[0].width,y[0].height);for(let t=0,i=y.length;t<i;t++)h=y[t],C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else C?(w&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&se(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){C&&w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,y[0].width,y[0].height,t.depth);for(let i=0,a=y.length;i<a;i++)if(h=y[i],o.format!==1023){if(r!==null){if(C){if(T){if(o.layerUpdates.size>0){let t=pf(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0)}else B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else C?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{C&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,y[0].width,y[0].height);for(let t=0,i=y.length;t<i;t++)h=y[t],o.format===1023?C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):C?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(o.isDataArrayTexture){if(C){if(w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T){if(o.layerUpdates.size>0){let i=pf(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)C?(w&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(w){if(C)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(y.length>0){if(C&&w){let t=Ce(y[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=y.length;t<i;t++)h=y[t],C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(C){if(w){let r=Ce(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);_(o)&&v(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function le(t,o,s){if(o.image.length!==6)return;let c=ae(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=Ko.getPrimaries(Ko.workingColorSpace),r=o.colorSpace===``?null:Ko.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=g(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=Se(o,m[e]);let h=m[0],y=a.convert(o.format,o.colorSpace),x=a.convert(o.type),C=b(o.internalFormat,y,x,o.normalized,o.colorSpace),w=o.isVideoTexture!==!0,T=u.__version===void 0||c===!0,E=l.dataReady,D=S(o,h);I(e.TEXTURE_CUBE_MAP,o);let O;if(f){w&&T&&n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,h.width,h.height);for(let t=0;t<6;t++){O=m[t].mipmaps;for(let r=0;r<O.length;r++){let i=O[r];o.format===1023?w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,y,x,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,y,x,i.data):y===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):w?E&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,y,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,i.data)}}}else{if(O=o.mipmaps,w&&T){O.length>0&&D++;let t=Ce(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,t.width,t.height)}for(let t=0;t<6;t++)if(p){w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,y,x,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,m[t].width,m[t].height,0,y,x,m[t].data);for(let r=0;r<O.length;r++){let i=O[r].image[t].image;w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,y,x,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,i.width,i.height,0,y,x,i.data)}}else{w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,y,x,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,y,x,m[t]);for(let r=0;r<O.length;r++){let i=O[r];w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,y,x,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,y,x,i.image[t])}}}_(o)&&v(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function ue(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=b(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),L(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,be(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function de(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=x(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;L(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,be(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,be(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=b(o.internalFormat,c,l,o.normalized,o.colorSpace);L(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,be(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,be(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function fe(t,i,o){let c=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let l=r.get(i.depthTexture);if(l.__renderTarget=i,(!l.__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),c){if(l.__webglInit===void 0&&(l.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,C)),l.__webglTexture===void 0){l.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,l.__webglTexture),I(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=a.convert(i.depthTexture.format),r=a.convert(i.depthTexture.type),o;i.depthTexture.format===1026?o=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(o=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,o,i.width,i.height,0,t,r,null)}}else P(i.depthTexture,0);let u=l.__webglTexture,d=be(i),f=c?e.TEXTURE_CUBE_MAP_POSITIVE_X+o:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)L(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)L(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function pe(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)fe(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?fe(i.__webglFramebuffer[0],t,0):fe(i.__webglFramebuffer,t,0)}}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),de(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),de(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function me(t,n,i){let a=r.get(t);n!==void 0&&ue(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&pe(t)}function he(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,w);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&L(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=b(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=be(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),de(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),I(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)ue(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else ue(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);_(i)&&v(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),I(c,a),ue(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),_(a)&&v(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),I(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)ue(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else ue(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);_(i)&&v(r),n.unbindTexture()}t.depthBuffer&&pe(t)}function ge(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(_(a)){let t=y(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),v(t),n.unbindTexture()}}}let _e=[],ve=[];function ye(t){if(t.samples>0){if(L(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer);let f=t.texture.mipmaps;f&&f.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(_e.length=0,ve.length=0,_e.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&(_e.push(l),ve.push(l),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,ve)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,_e))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function be(e){return Math.min(i.maxSamples,e.samples)}function L(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function xe(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function Se(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Ko.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&B(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):V(`WebGLTextures: Unsupported texture color space:`,n)),t}function Ce(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=M,this.resetTextureUnits=k,this.getTextureUnits=A,this.setTextureUnits=j,this.setTexture2D=P,this.setTexture2DArray=F,this.setTexture3D=ee,this.setTextureCube=te,this.rebindTextures=me,this.setupRenderTarget=he,this.updateRenderTargetMipmap=ge,this.updateMultisampleRenderTarget=ye,this.setupDepthRenderbuffer=pe,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=L,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function bh(e,t){function n(n,r=``){let i,a=Ko.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var xh=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Sh=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Ch=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Sl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new rd({vertexShader:xh,fragmentShader:Sh,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new ll(new Ku(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},wh=class extends lo{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new Ch,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new H,C=null,w=null,T=new Vd;T.viewport=new rs;let E=new Vd;E.viewport=new rs;let D=[T,E],O=new Zd,k=null,A=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new Rs,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new Rs,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new Rs,b[e]=t),t.getHandSpace()};function j(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function M(){r.removeEventListener(`select`,j),r.removeEventListener(`selectstart`,j),r.removeEventListener(`selectend`,j),r.removeEventListener(`squeeze`,j),r.removeEventListener(`squeezestart`,j),r.removeEventListener(`squeezeend`,j),r.removeEventListener(`end`,M),r.removeEventListener(`inputsourceschange`,N);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}k=null,A=null,h.reset();for(let e in g)delete g[e];if(e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,I.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),w!==null){let e=w.camera;e.fov=w.fov,e.zoom=w.zoom,e.updateProjectionMatrix(),w=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,j),r.addEventListener(`selectstart`,j),r.addEventListener(`selectend`,j),r.addEventListener(`squeeze`,j),r.addEventListener(`squeezestart`,j),r.addEventListener(`squeezeend`,j),r.addEventListener(`end`,M),r.addEventListener(`inputsourceschange`,N),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?Yi:Ji,a=_.stencil?Hi:Li);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new as(d.textureWidth,d.textureHeight,{format:qi,type:Mi,depthTexture:new bl(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new as(f.framebufferWidth,f.framebufferHeight,{format:qi,type:Mi,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),I.setContext(r),I.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function N(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}let P=new U,F=new U;function ee(e,t,n){P.setFromMatrixPosition(t.matrixWorld),F.setFromMatrixPosition(n.matrixWorld);let r=P.distanceTo(F),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function te(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),O.near=E.near=T.near=t,O.far=E.far=T.far=n,(k!==O.near||A!==O.far)&&(r.updateRenderState({depthNear:O.near,depthFar:O.far}),k=O.near,A=O.far),O.layers.mask=e.layers.mask|6,T.layers.mask=O.layers.mask&-5,E.layers.mask=O.layers.mask&-3;let i=e.parent,a=O.cameras;te(O,i);for(let e=0;e<a.length;e++)te(a[e],i);a.length===2?ee(O,T,E):O.projectionMatrix.copy(T.projectionMatrix),w===null&&e.isPerspectiveCamera&&(w={camera:e,fov:e.fov,zoom:e.zoom}),ne(e,O,i)};function ne(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=mo*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(O)},this.getCameraTexture=function(e){return g[e]};let re=null;function ie(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==O.cameras.length&&(O.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=D[n];o===void 0&&(o=new Vd,o.layers.enable(n),o.viewport=new rs,D[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(O.matrix.copy(o.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),i===!0&&O.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new Sl,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}re&&re(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let I=new hf;I.setAnimationLoop(ie),this.setAnimationLoop=function(e){re=e},this.dispose=function(){}}},Th=new cs,Eh=new Vo;Eh.set(-1,0,0,0,1,0,0,0,1);function Dh(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,$u(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(Th.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Eh),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Oh(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return V(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?B(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):B(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var kh=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Ah=null;function jh(){return Ah===null&&(Ah=new fl(kh,16,16,Qi,zi),Ah.name=`DFG_LUT`,Ah.minFilter=ki,Ah.magFilter=ki,Ah.wrapS=wi,Ah.wrapT=wi,Ah.generateMipmaps=!1,Ah.needsUpdate=!0),Ah}var Mh=class{constructor(e={}){let{canvas:t=no(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Mi}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([ea,$i,Zi]),g=new Set([Mi,Li,Fi,Hi,Bi,Vi]),_=new Uint32Array(4),v=new Int32Array(4),y=new U,b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,E=!1,D=null,O=null,k=null,A=null;this._outputColorSpace=Ga;let j=0,M=0,N=null,P=-1,F=null,ee=new rs,te=new rs,ne=null,re=new W(0),ie=0,I=t.width,ae=t.height,oe=1,se=null,ce=null,le=new rs(0,0,I,ae),ue=new rs(0,0,I,ae),de=!1,fe=new _l,pe=!1,me=!1,he=new cs,ge=new U,_e=new rs,ve={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ye=!1;function be(){return N===null?oe:1}let L=n;function xe(e,n){return t.getContext(e,n)}let Se,Ce,R,we,z,Te,Ee,De,Oe,ke,Ae,je,Me,Ne,Pe,Fe,Ie,Le,Re,ze,Be,Ve,He;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r186`),t.addEventListener(`webglcontextlost`,Ge,!1),t.addEventListener(`webglcontextrestored`,Ke,!1),t.addEventListener(`webglcontextcreationerror`,qe,!1),L===null){let t=`webgl2`;if(L=xe(t,e),L===null)throw xe(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}Ue()}catch(e){throw t.removeEventListener(`webglcontextlost`,Ge,!1),t.removeEventListener(`webglcontextrestored`,Ke,!1),t.removeEventListener(`webglcontextcreationerror`,qe,!1),V(`WebGLRenderer: `+e.message),e}function Ue(){Se=new Xf(L),Se.init(),Be=new bh(L,Se),Ce=new Tf(L,Se,e,Be),R=new vh(L,Se),Ce.reversedDepthBuffer&&d&&R.buffers.depth.setReversed(!0),O=L.createFramebuffer(),k=L.createFramebuffer(),A=L.createFramebuffer(),we=new $f(L),z=new Qm,Te=new yh(L,Se,R,z,Ce,Be,we),Ee=new Yf(T),De=new gf(L),Ve=new Cf(L,De),Oe=new Zf(L,De,we,Ve),ke=new tp(L,Oe,De,Ve,we),Le=new ep(L,Ce,Te),Pe=new Ef(z),Ae=new Zm(T,Ee,Se,Ce,Ve,Pe),je=new Dh(T,z),Me=new nh,Ne=new lh(Se),Ie=new Sf(T,Ee,R,ke,p,s),Fe=new _h(T,ke,Ce),He=new Oh(L,we,Ce,R),Re=new wf(L,Se,we),ze=new Qf(L,Se,we),we.programs=Ae.programs,T.capabilities=Ce,T.extensions=Se,T.properties=z,T.renderLists=Me,T.shadowMap=Fe,T.state=R,T.info=we}m!==1009&&(w=new rp(m,t.width,t.height,o,r,i));let We=new wh(T,L);this.xr=We,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){let e=Se.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Se.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return oe},this.setPixelRatio=function(e){e!==void 0&&(oe=e,this.setSize(I,ae,!1))},this.getSize=function(e){return e.set(I,ae)},this.setSize=function(e,n,r=!0){if(We.isPresenting){B(`WebGLRenderer: Can't change size while VR device is presenting.`);return}I=e,ae=n,t.width=Math.floor(e*oe),t.height=Math.floor(n*oe),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(I*oe,ae*oe).floor()},this.setDrawingBufferSize=function(e,n,r){I=e,ae=n,oe=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009){V(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){B(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(ee)},this.getViewport=function(e){return e.copy(le)},this.setViewport=function(e,t,n,r){e.isVector4?le.set(e.x,e.y,e.z,e.w):le.set(e,t,n,r),R.viewport(ee.copy(le).multiplyScalar(oe).round())},this.getScissor=function(e){return e.copy(ue)},this.setScissor=function(e,t,n,r){e.isVector4?ue.set(e.x,e.y,e.z,e.w):ue.set(e,t,n,r),R.scissor(te.copy(ue).multiplyScalar(oe).round())},this.getScissorTest=function(){return de},this.setScissorTest=function(e){R.setScissorTest(de=e)},this.setOpaqueSort=function(e){se=e},this.setTransparentSort=function(e){ce=e},this.getClearColor=function(e){return e.copy(Ie.getClearColor())},this.setClearColor=function(){Ie.setClearColor(...arguments)},this.getClearAlpha=function(){return Ie.getClearAlpha()},this.setClearAlpha=function(){Ie.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(N!==null){let t=N.texture.format;e=h.has(t)}if(e){let e=N.texture.type,t=g.has(e),n=Ie.getClearColor(),r=Ie.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,L.clearBufferuiv(L.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,L.clearBufferiv(L.COLOR,0,v))}else r|=L.COLOR_BUFFER_BIT}t&&(r|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&L.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),D=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,Ge,!1),t.removeEventListener(`webglcontextrestored`,Ke,!1),t.removeEventListener(`webglcontextcreationerror`,qe,!1),Ie.dispose(),Me.dispose(),Ne.dispose(),z.dispose(),Ee.dispose(),ke.dispose(),Ve.dispose(),He.dispose(),Ae.dispose(),We.dispose(),We.removeEventListener(`sessionstart`,et),We.removeEventListener(`sessionend`,tt),nt.stop()};function Ge(e){e.preventDefault(),io(`WebGLRenderer: Context Lost.`),E=!0}function Ke(){io(`WebGLRenderer: Context Restored.`),E=!1;let e=we.autoReset,t=Fe.enabled,n=Fe.autoUpdate,r=Fe.needsUpdate,i=Fe.type;Ue(),we.autoReset=e,Fe.enabled=t,Fe.autoUpdate=n,Fe.needsUpdate=r,Fe.type=i}function qe(e){V(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function Je(e){let t=e.target;t.removeEventListener(`dispose`,Je),Ye(t)}function Ye(e){Xe(e),z.remove(e)}function Xe(e){let t=z.get(e).programs;t!==void 0&&(t.forEach(function(e){Ae.releaseProgram(e)}),e.isShaderMaterial&&Ae.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=ve);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=ft(e,t,n,r,i);R.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Oe.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Ve.setup(i,r,s,n,c);let h,g=Re;if(c!==null&&(h=De.get(c),g=ze,g.setIndex(h)),i.isMesh)r.wireframe===!0?(R.setLineWidth(r.wireframeLinewidth*be()),g.setMode(L.LINES)):g.setMode(L.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),R.setLineWidth(e*be()),i.isLineSegments?g.setMode(L.LINES):i.isLineLoop?g.setMode(L.LINE_LOOP):g.setMode(L.LINE_STRIP)}else i.isPoints?g.setMode(L.POINTS):i.isSprite&&g.setMode(L.TRIANGLES);if(i.isBatchedMesh){if(Se.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?De.get(c).bytesPerElement:1,o=z.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(L,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function Ze(e,t,n,r){D!==null&&e.isNodeMaterial&&D.setObject(r,e),pe===!0&&Pe.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,ct(e,t,r),e.side=0,e.needsUpdate=!0,ct(e,t,r),e.side=2):ct(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),D!==null&&D.renderStart(e,t,n),x=Ne.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),D!==null&&D.updateLights(x.state.lightsArray),me=this.localClippingEnabled,pe=Pe.init(this.clippingPlanes,me),pe===!0&&Pe.setGlobalState(this.clippingPlanes,t),D!==null&&Fe.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];Ze(o,n,t,e),r.add(o)}else Ze(i,n,t,e),r.add(i)}}),x=C.pop(),D!==null&&D.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){let t=z.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Se.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let Qe=null;function $e(e){Qe&&Qe(e)}function et(){nt.stop()}function tt(){nt.start()}let nt=new hf;nt.setAnimationLoop($e),typeof self<`u`&&nt.setContext(self),this.setAnimationLoop=function(e){Qe=e,We.setAnimationLoop(e),e===null?nt.stop():nt.start()},We.addEventListener(`sessionstart`,et),We.addEventListener(`sessionend`,tt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){V(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(E===!0)return;D!==null&&D.renderStart(e,t);let n=We.enabled===!0&&We.isPresenting===!0,r=w!==null&&(N===null||n)&&w.begin(T,N);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),We.enabled===!0&&We.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(We.cameraAutoUpdate===!0&&We.updateCamera(t),t=We.getCamera()),e.isScene===!0&&e.onBeforeRender(T,e,t,N),x=Ne.get(e,C.length),x.init(t),x.state.textureUnits=Te.getTextureUnits(),C.push(x),he.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),fe.setFromProjectionMatrix(he,Qa,t.reversedDepth),me=this.localClippingEnabled,pe=Pe.init(this.clippingPlanes,me),b=Me.get(e,S.length),b.init(),S.push(b),We.enabled===!0&&We.isPresenting===!0){let e=T.xr.getDepthSensingMesh();e!==null&&rt(e,t,-1/0,T.sortObjects)}rt(e,t,0,T.sortObjects),b.finish(),D!==null&&D.updateLights(x.state.lightsArray),T.sortObjects===!0&&b.sort(se,ce),ye=We.enabled===!1||We.isPresenting===!1||We.hasDepthSensing()===!1,ye&&Ie.addToRenderList(b,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),pe===!0&&Pe.beginShadows();let i=x.state.shadowsArray;if(Fe.render(i,e,t),pe===!0&&Pe.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];at(n,r,e,a)}ye&&Ie.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];it(b,e,n,n.viewport)}}else r.length>0&&at(n,r,e,t),ye&&Ie.render(e),it(b,e,t)}N!==null&&M===0&&(Te.updateMultisampleRenderTarget(N),Te.updateRenderTargetMipmap(N)),r&&w.end(T),e.isScene===!0&&e.onAfterRender(T,e,t),Ve.resetDefaultState(),P=-1,F=null,C.pop(),C.length>0?(x=C[C.length-1],Te.setTextureUnits(x.state.textureUnits),pe===!0&&Pe.setGlobalState(T.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,D!==null&&D.renderEnd()};function rt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)x.pushLightProbeGrid(e);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||e.intersectsFrustum(fe)){r&&_e.setFromMatrixPosition(e.matrixWorld).applyMatrix4(he);let i=ke.update(e),a=e.material;a.visible&&b.push(e,i,a,n,_e.z,null,t)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||e.intersectsFrustum(fe))){let i=ke.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),_e.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),_e.copy(e.boundingSphere.center)),_e.applyMatrix4(e.matrixWorld).applyMatrix4(he)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,_e.z,s,t)}}else a.visible&&b.push(e,i,a,n,_e.z,null,t)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)rt(i[e],t,n,r)}function it(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),pe===!0&&Pe.setGlobalState(T.clippingPlanes,n),r&&R.viewport(ee.copy(r)),i.length>0&&ot(i,t,n),a.length>0&&ot(a,t,n),o.length>0&&ot(o,t,n),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function at(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=Se.has(`EXT_color_buffer_half_float`)||Se.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new as(1,1,{generateMipmaps:!0,type:e?zi:Mi,minFilter:ji,samples:Math.max(4,Ce.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Ko.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||ee;a.setSize(o.z*T.transmissionResolutionScale,o.w*T.transmissionResolutionScale);let s=T.getRenderTarget(),c=T.getActiveCubeFace(),l=T.getActiveMipmapLevel();T.setRenderTarget(a),T.getClearColor(re),ie=T.getClearAlpha(),ie<1&&T.setClearColor(16777215,.5),T.clear(),ye&&Ie.render(n);let u=T.toneMapping;T.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),pe===!0&&Pe.setGlobalState(T.clippingPlanes,r),ot(e,n,r),Te.updateMultisampleRenderTarget(a),Te.updateRenderTargetMipmap(a),Se.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,st(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(Te.updateMultisampleRenderTarget(a),Te.updateRenderTargetMipmap(a))}T.setRenderTarget(s,c,l),T.setClearColor(re,ie),d!==void 0&&(r.viewport=d),T.toneMapping=u}function ot(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&st(o,t,n,s,l,c)}}function st(e,t,n,r,i,a){D!==null&&i.isNodeMaterial&&D.setObject(e,i),e.onBeforeRender(T,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(T,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=2):T.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(T,t,n,r,i,a)}function ct(e,t,n){t.isScene!==!0&&(t=ve);let r=z.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=Ae.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=Ae.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Ee.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,Je),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return ut(e,s),d}else s.uniforms=Ae.getUniforms(e),D!==null&&e.isNodeMaterial&&D.build(e,n,s),e.onBeforeCompile(s,T),d=Ae.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Pe.uniform),ut(e,s),r.needsLights=mt(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=x.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function lt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=um.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function ut(e,t){let n=z.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function dt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];y.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(y))return n}return null}function ft(e,t,n,r,i){t.isScene!==!0&&(t=ve),Te.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=N===null?T.outputColorSpace:N.isXRRenderTarget===!0?N.texture.colorSpace:Ko.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Ee.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(N===null||N.isXRRenderTarget===!0)&&(h=T.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=z.get(r),y=x.state.lights;if(pe===!0&&(me===!0||e!==F)){let t=e===F&&r.id===P;Pe.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Pe.numPlanes||v.numIntersection!==Pe.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=x.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let S=v.currentProgram;b===!0&&(S=ct(r,t,i),D&&r.isNodeMaterial&&D.onUpdateProgram(r,S,v));let C=!1,w=!1,E=!1,O=S.getUniforms(),k=v.uniforms;if(R.useProgram(S.program)&&(C=!0,w=!0,E=!0),r.id!==P&&(P=r.id,w=!0),v.needsLights){let e=dt(x.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,w=!0)}if(C||F!==e){R.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),O.setValue(L,`projectionMatrix`,e.projectionMatrix),O.setValue(L,`viewMatrix`,e.matrixWorldInverse);let t=O.map.cameraPosition;t!==void 0&&t.setValue(L,ge.setFromMatrixPosition(e.matrixWorld)),Ce.logarithmicDepthBuffer&&O.setValue(L,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&O.setValue(L,`isOrthographic`,e.isOrthographicCamera===!0),F!==e&&(F=e,w=!0,E=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&O.setValue(L,`sunShadowMap`,y.state.sunShadowMap,Te),y.state.directionalShadowMap.length>0&&O.setValue(L,`directionalShadowMap`,y.state.directionalShadowMap,Te),y.state.spotShadowMap.length>0&&O.setValue(L,`spotShadowMap`,y.state.spotShadowMap,Te),y.state.pointShadowMap.length>0&&O.setValue(L,`pointShadowMap`,y.state.pointShadowMap,Te)),i.isSkinnedMesh){O.setOptional(L,i,`bindMatrix`),O.setOptional(L,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),O.setValue(L,`boneTexture`,e.boneTexture,Te))}i.isBatchedMesh&&(O.setOptional(L,i,`batchingTexture`),O.setValue(L,`batchingTexture`,i._matricesTexture,Te),O.setOptional(L,i,`batchingIdTexture`),O.setValue(L,`batchingIdTexture`,i._indirectTexture,Te),O.setOptional(L,i,`batchingColorTexture`),i._colorsTexture!==null&&O.setValue(L,`batchingColorTexture`,i._colorsTexture,Te));let A=n.morphAttributes;if((A.position!==void 0||A.normal!==void 0||A.color!==void 0)&&Le.update(i,n,S),(w||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,O.setValue(L,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(k.envMapIntensity.value=t.environmentIntensity),k.dfgLUT!==void 0&&(k.dfgLUT.value=jh()),w){if(O.setValue(L,`toneMappingExposure`,T.toneMappingExposure),v.needsLights&&pt(k,E),a&&r.fog===!0&&je.refreshFogUniforms(k,a),je.refreshMaterialUniforms(k,r,oe,ae,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;k.probesSH.value=e.texture,k.probesMin.value.copy(e.boundingBox.min),k.probesMax.value.copy(e.boundingBox.max),k.probesResolution.value.copy(e.resolution)}um.upload(L,lt(v),k,Te)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(um.upload(L,lt(v),k,Te),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&O.setValue(L,`center`,i.center),O.setValue(L,`modelViewMatrix`,i.modelViewMatrix),O.setValue(L,`normalMatrix`,i.normalMatrix),O.setValue(L,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];He.update(n,S),He.bind(n,S)}}return S}function pt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function mt(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return j},this.getActiveMipmapLevel=function(){return M},this.getRenderTarget=function(){return N},this.setRenderTargetTextures=function(e,t,n){let r=z.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),z.get(e.texture).__webglTexture=t,z.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=z.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){N=e,j=t,M=n;let r=null,i=!1,a=!1;if(e){let o=z.get(e);if(o.__useDefaultFramebuffer!==void 0){R.bindFramebuffer(L.FRAMEBUFFER,o.__webglFramebuffer),ee.copy(e.viewport),te.copy(e.scissor),ne=e.scissorTest,R.viewport(ee),R.scissor(te),R.setScissorTest(ne),P=-1;return}if(o.__webglFramebuffer===void 0)Te.setupRenderTarget(e);else if(o.__hasExternalTextures)Te.rebindTextures(e,z.get(e.texture).__webglTexture,z.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&z.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);Te.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=z.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&Te.useMultisampledRTT(e)===!1?z.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ee.copy(e.viewport),te.copy(e.scissor),ne=e.scissorTest}else ee.copy(le).multiplyScalar(oe).floor(),te.copy(ue).multiplyScalar(oe).floor(),ne=de;if(n!==0&&(r=O),R.bindFramebuffer(L.FRAMEBUFFER,r)&&R.drawBuffers(e,r),R.viewport(ee),R.scissor(te),R.setScissorTest(ne),i){let r=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=z.get(e.textures[t]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,t.__webglTexture,n)}P=-1};function ht(e){let t=z.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Ce.textureFormatReadable(e.format),t.__typeReadable=Ce.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){R.bindFramebuffer(L.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let u=ht(o);if(u.__formatReadable===!1){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&L.readPixels(t,n,r,i,Be.convert(c),Be.convert(l),a)}finally{let e=N===null?null:z.get(N).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){R.bindFramebuffer(L.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let d=ht(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.bufferData(L.PIXEL_PACK_BUFFER,a.byteLength,L.STREAM_READ),L.readPixels(t,n,r,i,Be.convert(l),Be.convert(u),0),L.bindBuffer(L.PIXEL_PACK_BUFFER,null);let p=N===null?null:z.get(N).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,p);let m=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await so(L,m,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,a),L.bindBuffer(L.PIXEL_PACK_BUFFER,null),L.deleteBuffer(f),L.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;Te.setTexture2D(e,0),L.copyTexSubImage2D(L.TEXTURE_2D,n,0,0,o,s,i,a),R.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Be.convert(t.format),_=Be.convert(t.type),v;t.isData3DTexture?(Te.setTexture3D(t,0),v=L.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(Te.setTexture2DArray(t,0),v=L.TEXTURE_2D_ARRAY):(Te.setTexture2D(t,0),v=L.TEXTURE_2D),R.activeTexture(L.TEXTURE0),R.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,t.flipY),R.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),R.pixelStorei(L.UNPACK_ALIGNMENT,t.unpackAlignment);let y=R.getParameter(L.UNPACK_ROW_LENGTH),b=R.getParameter(L.UNPACK_IMAGE_HEIGHT),x=R.getParameter(L.UNPACK_SKIP_PIXELS),S=R.getParameter(L.UNPACK_SKIP_ROWS),C=R.getParameter(L.UNPACK_SKIP_IMAGES);R.pixelStorei(L.UNPACK_ROW_LENGTH,h.width),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,h.height),R.pixelStorei(L.UNPACK_SKIP_PIXELS,l),R.pixelStorei(L.UNPACK_SKIP_ROWS,u),R.pixelStorei(L.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=z.get(e),r=z.get(t),h=z.get(n.__renderTarget),g=z.get(r.__renderTarget);R.bindFramebuffer(L.READ_FRAMEBUFFER,h.__webglFramebuffer),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(e).__webglTexture,i,d+n),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(t).__webglTexture,a,m+n)),L.blitFramebuffer(l,u,o,s,f,p,o,s,L.DEPTH_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||z.has(e)){let n=z.get(e),r=z.get(t);R.bindFramebuffer(L.READ_FRAMEBUFFER,k),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,A);for(let e=0;e<c;e++)w?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,n.__webglTexture,i),T?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,r.__webglTexture,a),i===0?T?L.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):L.copyTexSubImage2D(v,a,f,p,l,u,o,s):L.blitFramebuffer(l,u,o,s,f,p,o,s,L.COLOR_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?L.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h);R.pixelStorei(L.UNPACK_ROW_LENGTH,y),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,b),R.pixelStorei(L.UNPACK_SKIP_PIXELS,x),R.pixelStorei(L.UNPACK_SKIP_ROWS,S),R.pixelStorei(L.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&L.generateMipmap(v),R.unbindTexture()},this.initRenderTarget=function(e){z.get(e).__webglFramebuffer===void 0&&Te.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?Te.setTextureCube(e,0):e.isData3DTexture?Te.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?Te.setTexture2DArray(e,0):Te.setTexture2D(e,0),R.unbindTexture()},this.resetState=function(){j=0,M=0,N=null,R.reset(),Ve.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Qa}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ko._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ko._getUnpackColorSpace()}},K=Math.PI*2,Nh=Math.PI/180,Ph=2,Fh=-.5547,Ih=-.8321,Lh=1;function Rh(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}function zh(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}var q=(e,t,n)=>t+(n-t)*e(),Bh=new Map;function Vh(e){let t=Bh.get(e);if(!t){let n=parseInt(e.slice(1,7),16);t=[n>>16&255,n>>8&255,n&255],Bh.set(e,t)}return t}function Hh(e,t){let n=Vh(e);return`rgba(${n[0]},${n[1]},${n[2]},${Math.max(0,Math.min(1,t)).toFixed(3)})`}function Uh(e,t,n){let r=Vh(e),i=Vh(t),a=`#`;for(let e=0;e<3;e++)a+=Math.round(r[e]+(i[e]-r[e])*n).toString(16).padStart(2,`0`);return a}var Wh=(e,t)=>Uh(e,`#ffffff`,t),Gh=(e,t)=>Uh(e,`#000000`,t);function Kh(e,t){for(let[n,r]of t)e.addColorStop(n,r);return e}function qh(e,t,n,r,i,a){return Kh(e.createLinearGradient(t,n,r,i),a)}function Jh(e,t,n,r,i,a=0){return Kh(e.createRadialGradient(t,n,a,t,n,r),i)}function Yh(e){let t=1/0,n=1/0,r=-1/0,i=-1/0;for(let a of e)a[0]<t&&(t=a[0]),a[0]>r&&(r=a[0]),a[1]<n&&(n=a[1]),a[1]>i&&(i=a[1]);return[t,n,r,i]}function J(e,t=!0,n=.5,r=new Path2D){let i=e.length;if(i<2)return r;let a=[],o=[];for(let r=0;r<i;r++){let s=e[r],c=!t&&(r===0||r===i-1);if(s.length===3&&s[2]===1||c){a.push(0),o.push(0);continue}let l=e[(r-1+i)%i],u=e[(r+1)%i];a.push((u[0]-l[0])*n),o.push((u[1]-l[1])*n)}r.moveTo(e[0][0],e[0][1]);let s=t?i:i-1;for(let t=0;t<s;t++){let n=(t+1)%i,s=e[t],c=e[n];r.bezierCurveTo(s[0]+a[t]/3,s[1]+o[t]/3,c[0]-a[n]/3,c[1]-o[n]/3,c[0],c[1])}return t&&r.closePath(),r}function Y(e,t=.5){return{p:J(e,!0,t),b:Yh(e)}}function X(e){let t=new Path2D,n=[];for(let r=0;r<e.length;r+=2)r===0?t.moveTo(e[r],e[r+1]):t.lineTo(e[r],e[r+1]),n.push([e[r],e[r+1]]);return t.closePath(),{p:t,b:Yh(n)}}function Xh(e,t,n){let r=new Path2D;return r.moveTo(e+n,t),r.arc(e,t,n,0,K),r.closePath(),{p:r,b:[e-n,t-n,e+n,t+n]}}function Zh(e,t,n,r,i=0){let a=new Path2D;a.moveTo(e+n*Math.cos(i),t+n*Math.sin(i)),a.ellipse(e,t,n,r,i,0,K),a.closePath();let o=Math.cos(i),s=Math.sin(i),c=Math.sqrt(n*n*o*o+r*r*s*s),l=Math.sqrt(n*n*s*s+r*r*o*o);return{p:a,b:[e-c,t-l,e+c,t+l]}}function Qh(e,t,n,r,i){let a=new Path2D,o=Math.max(0,Math.min(i,n/2,r/2));return a.moveTo(e+o,t),a.arcTo(e+n,t,e+n,t+r,o),a.arcTo(e+n,t+r,e,t+r,o),a.arcTo(e,t+r,e,t,o),a.arcTo(e,t,e+n,t,o),a.closePath(),{p:a,b:[e,t,e+n,t+r]}}function $h(e,t,n,r){let i=new Path2D;return i.moveTo(e+r,t),i.arc(e,t,r,0,K),i.closePath(),i.moveTo(e+n,t),i.arc(e,t,n,K,0,!0),i.closePath(),{p:i,b:[e-r,t-r,e+r,t+r]}}function eg(e,t,n,r,i,a,o=24){let s=Math.hypot(r,i),c=(n*n-a*a+s*s)/(2*s),l=Math.sqrt(Math.max(0,n*n-c*c)),u=r/s,d=i/s,f=e+u*c,p=t+d*c,m=[f-d*l,p+u*l],h=[f+d*l,p-u*l],g=e=>(e%K+K)%K,_=Math.atan2(-d,-u),v=[[m[0],m[1],1]],y=(e,t,n,r,i)=>{let a=Math.atan2(r[1]-t,r[0]-e),s=Math.atan2(i[1]-t,i[0]-e),c=g(s-a),l=g(_-a)<c,u=l?c:K-c,d=l?1:-1;for(let r=1;r<o;r++){let i=a+d*u*(r/o);v.push([e+Math.cos(i)*n,t+Math.sin(i)*n])}};return y(e,t,n,m,h),v.push([h[0],h[1],1]),y(e+r,t+i,a,h,m),Y(v)}function tg(e,t,n,r,i,a=-Math.PI/2){let o=[];for(let s=0;s<i*2;s++){let c=a+s*Math.PI/i,l=s%2?r:n;o.push([e+Math.cos(c)*l,t+Math.sin(c)*l])}return o}function ng(e,t,n,r,i,a=-Math.PI/2){return X(tg(e,t,n,r,i,a).flat())}function rg(e,t,n,r,i=10){let a=[];for(let r=0;r<=i;r++){let o=e+(t-e)*r/i;a.push(r===0||r===i?[o,n(o),1]:[o,n(o)])}for(let o=i;o>=0;o--){let s=e+(t-e)*o/i;a.push(o===0||o===i?[s,n(s)+r,1]:[s,n(s)+r])}return Y(a)}function ig(e,t,n){return r=>{let i=1-r;return[i*i*e[0]+2*i*r*t[0]+r*r*n[0],i*i*e[1]+2*i*r*t[1]+r*r*n[1]]}}function ag(e,t,n,r){return i=>{let a=1-i,o=a*a*a,s=3*a*a*i,c=3*a*i*i,l=i*i*i;return[o*e[0]+s*t[0]+c*n[0]+l*r[0],o*e[1]+s*t[1]+c*n[1]+l*r[1]]}}function og(e,t,n,r=0,i=1,a=14){let o=[];for(let s=0;s<=a;s++){let c=r+(i-r)*s/a,[l,u]=e(c),[d,f]=e(Math.max(0,c-.01)),[p,m]=e(Math.min(1,c+.01)),h=p-d,g=m-f,_=Math.hypot(h,g)||1;h/=_,g/=_;let v=t(c)*n;o.push([l+g*v,u-h*v])}return o}function sg(e,t,n=14){let r=og(e,t,1,0,1,n),i=og(e,t,-1,0,1,n),a=[],o=t(0)>.05,s=t(1)>.05,c=e(0),l=e(1);a.push(o?[r[0][0],r[0][1],1]:[c[0],c[1],1]);for(let e=1;e<n;e++)a.push(r[e]);s?(a.push([r[n][0],r[n][1],1]),a.push([i[n][0],i[n][1],1])):a.push([l[0],l[1],1]);for(let e=n-1;e>=1;e--)a.push(i[e]);return o&&a.push([i[0][0],i[0][1],1]),Y(a)}function cg(e,t,n,r,i,a){e.stroke(J(og(t,n,r,i,a,10),!1))}var lg=e=>t=>e*Math.sin(Math.PI*(.18+.82*t)),ug=(e,t=1)=>n=>e*(1-n)**t;function dg(e,t,n,r,i=0){return e.map(e=>e.length===3?[t+(e[0]-t)*r,n+(e[1]-n)*r+i,1]:[t+(e[0]-t)*r,n+(e[1]-n)*r+i])}var fg=(e,t)=>({a:1,b:0,c:0,d:1,e,f:t});function pg(e,t,n){let r=new Path2D;return r.addPath(e,fg(t,n)),r}function mg(e,t=0,n=0){let r=new Path2D;return r.rect(-5e3,-5e3,1e4,1e4),r.addPath(e,fg(t,n)),r}function hg(e,t){e.beginPath(),e.moveTo(t[0][0],t[0][1]);for(let n=1;n<t.length;n++)e.lineTo(t[n][0],t[n][1]);e.stroke()}function Z(e,t,n,r,i){e.beginPath(),e.moveTo(t,n),e.lineTo(r,i),e.stroke()}function gg(e,t,n,r,i){let a=[t,n],o=i;for(let t=0;t<r;t++){let t=[a[0]];for(let n=1;n<a.length;n++){let r=a[n-1],i=a[n],s=i[0]-r[0],c=i[1]-r[1],l=Math.hypot(s,c)||1,u=(e()*2-1)*o;t.push([(r[0]+i[0])/2-c/l*u,(r[1]+i[1])/2+s/l*u],i)}a=t,o*=.55}return a}function _g(e){let t=Math.cos(-e),n=Math.sin(-e);return[Fh*t-Ih*n,Fh*n+Ih*t]}function vg(e,t,n,r=Ph){e.lineWidth=r,e.strokeStyle=n,e.stroke(t)}function Q(e,t,n,r){let{p:i,b:a}=t,o=a[2]-a[0],s=a[3]-a[1],c=Math.min(o,s),[l,u]=_g(n.rot??0),d=(a[0]+a[2])/2,f=(a[1]+a[3])/2;if(n.fill)e.fillStyle=n.fill;else{let t;if(n.radial){let n=d+l*o*.3,r=f+u*s*.3;t=e.createRadialGradient(n,r,0,n,r,Math.hypot(o,s)*.72)}else{let n=.5*(Math.abs(o*l)+Math.abs(s*u));t=e.createLinearGradient(d+l*n,f+u*n,d-l*n,f-u*n)}t.addColorStop(0,n.light??Wh(n.base,.38)),t.addColorStop(.5,n.base),t.addColorStop(1,n.dark??Gh(n.base,.32)),e.fillStyle=t}e.fill(i);let p=(n.sh??.16)*c,m=(n.hl??.07)*c;if(r||p>0||m>0){if(e.save(),e.clip(i),r&&r(),p>0&&(e.fillStyle=n.shade??Hh(Gh(n.base,.55),.42),e.fill(mg(i,l*p,u*p),`evenodd`)),m>0){let t=(n.he??.03)*c;e.clip(pg(i,-l*t,-u*t)),e.fillStyle=n.hi??`rgba(255,255,255,0.4)`,e.fill(mg(i,-l*(t+m),-u*(t+m)),`evenodd`)}e.restore()}let h=n.lw??Ph;h>0&&vg(e,i,n.line??Gh(n.base,.74),h)}function $(e,t,n,r,i,a=1){e.save(),e.globalCompositeOperation=`lighter`,e.fillStyle=Jh(e,t,n,r,[[0,Hh(i,a)],[.22,Hh(i,a*.6)],[.55,Hh(i,a*.18)],[1,Hh(i,0)]]),e.fillRect(t-r,n-r,r*2,r*2),e.restore()}function yg(e,t,n,r,i,a=1,o=1){e.save(),e.translate(t,n),e.scale(1,o),e.fillStyle=Jh(e,0,0,r,[[0,Hh(i,a)],[.5,Hh(i,a*.5)],[1,Hh(i,0)]]),e.fillRect(-r,-r,r*2,r*2),e.restore()}function bg(e,t,n,r,i,a=.5){yg(e,t,n,r,`#05060c`,a,i/r)}function xg(e,t,n,r,i=`#ffffff`,a=1){$(e,t,n,r*2.4,i,.4*a);let o=r*.14;e.fillStyle=`rgba(255,255,255,${a})`,e.beginPath(),e.moveTo(t,n-r),e.quadraticCurveTo(t+o,n-o,t+r,n),e.quadraticCurveTo(t+o,n+o,t,n+r),e.quadraticCurveTo(t-o,n+o,t-r,n),e.quadraticCurveTo(t-o,n-o,t,n-r),e.fill()}function Sg(e,t,n,r,i=.95){e.fillStyle=`rgba(255,255,255,${i})`,e.beginPath(),e.ellipse(t,n,r,r*.62,-Math.PI/4,0,K),e.fill()}function Cg(e,t,n,r,i){e.fillStyle=i,e.beginPath(),e.arc(t,n,r,0,K),e.fill()}function wg(e,t,n,r,i,a){e.fillStyle=Jh(e,t-r*.35,n-r*.4,r*1.4,[[0,Wh(i,.75)],[.45,i],[1,Gh(i,.5)]]),e.beginPath(),e.arc(t,n,r,0,K),e.fill(),e.lineWidth=Math.max(.45,r*.38),e.strokeStyle=a,e.stroke(),Cg(e,t-r*.32,n-r*.36,r*.3,`rgba(255,255,255,0.9)`)}function Tg(e,t,n){e.shadowBlur=t*Lh,e.shadowColor=n}function Eg(e){e.shadowBlur=0,e.shadowColor=`rgba(0,0,0,0)`}function Dg(e,t,n,r,i,a,o,s,c,l,u=Ph){let d=tg(t,n,r,i,a,o),f=d.length;for(let r=0;r<f;r++){let i=d[r],a=d[(r+1)%f],o=(i[0]+a[0])/2-t,l=(i[1]+a[1])/2-n,u=a[1]-i[1],p=i[0]-a[0];u*o+p*l<0&&(u=-u,p=-p);let m=Math.hypot(u,p)||1,h=Uh(c,s,.5+.5*(u/m*Fh+p/m*Ih));e.fillStyle=h,e.strokeStyle=h,e.lineWidth=.35,e.beginPath(),e.moveTo(t,n),e.lineTo(i[0],i[1]),e.lineTo(a[0],a[1]),e.closePath(),e.fill(),e.stroke()}vg(e,X(d.flat()).p,l,u)}function Og(e,t,n,r,i,a){let o=r.length;for(let s=0;s<o;s++){let c=r[s],l=r[(s+1)%o],u=(c[0]+l[0])/2-t,d=(c[1]+l[1])/2-n,f=Math.hypot(u,d)||1,p=Uh(a,i,.5+.5*(u/f*Fh+d/f*Ih));e.fillStyle=p,e.strokeStyle=p,e.lineWidth=.35,e.beginPath(),e.moveTo(t,n),e.lineTo(c[0],c[1]),e.lineTo(l[0],l[1]),e.closePath(),e.fill(),e.stroke()}}function kg(e,t,n,r,i,a){let o=ng(t,n,r,r*.45,5);e.fillStyle=i,e.fill(o.p),a&&vg(e,o.p,a,Math.max(.4,r*.18))}function Ag(e,t,n,r=1){e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=Hh(n,.28),e.lineWidth=r*5,hg(e,t),e.strokeStyle=Hh(n,.6),e.lineWidth=r*2.4,hg(e,t),e.restore(),e.strokeStyle=`#ffffff`,e.lineWidth=r,hg(e,t)}function jg(e,t,n,r,i,a,o,s=Mg){let c=!0;for(let l=0;l<s.length;l+=2){let u=s[l][0],d=J(c?t:dg(t,n,r,u));e.fillStyle=qh(e,i[0],i[1],a[0],a[1],[[0,s[l][1]],[1,s[l+1][1]]]),e.fill(d),c&&vg(e,d,o,1.8),c=!1}}var Mg=[[1,`#d8261a`],[1,`#ff8d26`],[.74,`#ff7a1f`],[.74,`#ffc93f`],[.5,`#ffc43a`],[.5,`#fff1a6`],[.27,`#fff6c8`],[.27,`#ffffff`]];function Ng(e,t,n,r,i,a,o=0,s=.22){let c=[],l=Math.cos(o),u=Math.sin(o);for(let o=0;o<i*2;o++){let d=o/(i*2)*K,f=o%2?1-s*q(a,.5,.9):1+s*q(a,.1,.5),p=Math.cos(d)*n*f,m=Math.sin(d)*r*f,h=e+p*l-m*u,g=t+p*u+m*l;c.push(o%2?[h,g,1]:[h,g])}return Y(c)}function Pg(e,t,n,r,i,a,o,s,c){e.fillStyle=Jh(e,t,n,r,[[0,Hh(a,o)],[.6,Hh(a,o*.4)],[1,Hh(a,0)]]),e.beginPath();for(let a=0;a<i;a++){let o=s+a/i*K,l=o+K/i*c;e.moveTo(t,n),e.lineTo(t+Math.cos(o)*r,n+Math.sin(o)*r),e.lineTo(t+Math.cos(l)*r,n+Math.sin(l)*r),e.closePath()}e.fill()}function Fg(e,t,n,r,i,a){e.save(),e.globalCompositeOperation=`lighter`;for(let o=0;o<r;o++){let r=q(n,-t.W,t.W),o=q(n,-t.H,t.H),s=q(n,1.2,5.2),c=a*q(n,.35,1);e.fillStyle=Jh(e,r,o,s,[[0,Hh(i,c)],[.7,Hh(i,c*.55)],[1,Hh(i,0)]]),e.beginPath(),e.arc(r,o,s,0,K),e.fill()}e.restore()}function Ig(e,t,n,r){let{W:i,H:a}=t,o=r.cx??0,s=r.cy??-4,c=Math.hypot(i+Math.abs(o),a+Math.abs(s));e.fillStyle=Jh(e,o,s,c,[[0,r.c0],[.48,r.c1],[1,r.c2]]),e.fillRect(-i-1,-a-1,2*i+2,2*a+2);let l=r.patC??`#ffffff`,u=r.patA??.07;switch(r.pat??`none`){case`lattice`:e.strokeStyle=Jh(e,o,s,c,[[0,Hh(l,u)],[1,Hh(l,u*.3)]]),e.lineWidth=.55,e.beginPath();for(let t=-i-a-9;t<=i+a+9;t+=9)e.moveTo(t-a,-a),e.lineTo(t+a,a),e.moveTo(t+a,-a),e.lineTo(t-a,a);e.stroke();break;case`rings`:{e.lineWidth=.7;let t=0;for(let n=12;n<c;n+=6.5,t++)e.strokeStyle=Hh(l,u*(t%2?.5:1)*(1-n/c)),e.beginPath(),e.arc(o,s,n,0,K),e.stroke();break}case`swirl`:e.lineWidth=1.3;for(let t=0;t<7;t++){let r=15+t*8,i=n()*K;e.strokeStyle=Hh(l,u*(1-t/8)),e.beginPath(),e.arc(o,s,r,i,i+Math.PI*q(n,.5,1.2)),e.stroke()}break;case`stars`:for(let t=0;t<80;t++)Cg(e,q(n,-i,i),q(n,-a,a),q(n,.2,.75),Hh(l,u*q(n,.25,1)))}r.rays&&Pg(e,o,s,c*1.15,r.rays,r.rayC??`#ffffff`,r.rayA??.1,r.rayRot??0,r.rayW??.5),r.glowC&&yg(e,r.glowX??o,r.glowY??s,r.glowR??40,r.glowC,r.glowA??.4),r.dots&&Fg(e,t,n,r.dots,r.dotC??`#ffffff`,r.dotA??.3);let d=r.vig??.4;d>0&&(e.fillStyle=Jh(e,o,s,c,[[0,`rgba(0,0,0,0)`],[.62,`rgba(0,0,0,0)`],[1,`rgba(0,0,0,${d})`]]),e.fillRect(-i-1,-a-1,2*i+2,2*a+2))}function Lg(e,t,n,r,i,a){e.save(),e.strokeStyle=Hh(i,a),e.lineWidth=1,e.beginPath(),e.arc(t,n,r,0,K),e.stroke(),e.lineWidth=.5,e.beginPath(),e.arc(t,n,r-2.6,0,K),e.stroke(),e.fillStyle=Hh(i,Math.min(1,a*1.3));for(let i=0;i<32;i++){let a=i/32*K,o=Math.cos(a),s=Math.sin(a);if(i%4==0){let i=2.2;e.beginPath(),e.moveTo(t+o*(r+i),n+s*(r+i)),e.lineTo(t+o*r-s*i*.7,n+s*r+o*i*.7),e.lineTo(t+o*(r-i),n+s*(r-i)),e.lineTo(t+o*r+s*i*.7,n+s*r-o*i*.7),e.closePath(),e.fill()}else e.lineWidth=.6,Z(e,t+o*(r-1.8),n+s*(r-1.8),t+o*(r-.6),n+s*(r-.6))}e.restore()}var Rg={c0:`#aac5df`,c1:`#56769c`,c2:`#16213a`,rays:12,rayC:`#e8f4ff`,rayA:.1,pat:`lattice`,patA:.08,vig:.42},zg={c0:`#ffe49e`,c1:`#e3922e`,c2:`#5c250a`,rays:14,rayC:`#fff7d8`,rayA:.15,dots:12,dotC:`#fff0b0`,dotA:.35,pat:`rings`,patC:`#fff4d0`,patA:.1,vig:.42},Bg={c0:`#e2a0ff`,c1:`#8a38c4`,c2:`#210838`,rays:12,rayC:`#ffe2ff`,rayA:.11,dots:16,dotC:`#ffc8ff`,dotA:.32,pat:`swirl`,patC:`#ffd8ff`,patA:.16,vig:.46};function Vg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#a8dcff`,glowA:.28,glowR:44}),bg(e,0,43,30,5,.55);let r=`#141d29`,i=Math.atan2(78,76);e.save(),e.translate(-36,-40),e.rotate(i),Q(e,X([21,-5,101,-5,108,0,101,5,21,5]),{base:`#c2cedb`,light:`#f5f9fc`,dark:`#76859a`,line:r,rot:i,sh:.34,hl:.24}),e.strokeStyle=`rgba(40,56,78,0.5)`,e.lineWidth=1.2,Z(e,23,0,99,0),Q(e,Qh(3,-2.9,14,5.8,1.6),{base:`#2d4f8f`,line:`#0b1730`,rot:i,sh:.3,hl:.2},()=>{e.strokeStyle=`rgba(8,16,36,0.75)`,e.lineWidth=.8;for(let t=4;t<17;t+=2.7)Z(e,t,-3,t+1.8,3)}),Q(e,X([16,-12,17.5,-15.5,21,-16,21,16,17.5,15.5,16,12]),{base:`#8394aa`,light:`#e3ebf3`,dark:`#4a586b`,line:r,rot:i,sh:.28,hl:.2}),Q(e,Xh(18.5,0,3.4),{base:`#3f86ec`,light:`#a8d4ff`,dark:`#173f8a`,line:r,lw:1.3,radial:!0,sh:.2,hl:0}),Q(e,Xh(0,0,4.6),{base:`#8a9bb0`,light:`#eef3f8`,dark:`#4a586b`,line:r,radial:!0,rot:i,sh:.2,hl:.12}),Q(e,Xh(0,0,2.2),{base:`#3f86ec`,light:`#b8dcff`,dark:`#173f8a`,lw:.9,line:r,radial:!0,sh:0,hl:0}),Sg(e,-1,-1,.9),e.restore();for(let[t,n,r,i,a]of[[[-1,-28],[8,-54],[41,-25],7.6,`#1c4aa6`],[[-1,-28],[-5,-53],[31,-45],7.2,`#2767d4`],[[-1,-28],[-13,-47],[11,-52],6.2,`#3a86fb`]]){let o=ig(t,n,r),s=lg(i);Q(e,sg(o,s,16),{base:a,light:Wh(a,.45),dark:Gh(a,.35),line:`#0a1c46`,sh:.28,hl:.16},()=>{e.lineWidth=.75,e.strokeStyle=Hh(`#081a40`,.5),cg(e,o,s,-.35,.15,.92),cg(e,o,s,.2,.1,.95),e.strokeStyle=Hh(`#d6ecff`,.55),cg(e,o,s,.62,.12,.8)})}let a=Y([[-23,36,1],[-25.6,12],[-25.6,-5],[-21.6,-17],[-11,-24.6],[1,-26.6],[13,-24.6],[22.6,-17],[26,-5],[26,12],[24,36,1],[12,39.3],[0,40],[-12,39.3]]),o=e=>-16.5+2.6*(1-((e+1)/27)**2),s=e=>31+4*(1-(e/25)**2);Q(e,a,{base:`#a6b5c6`,light:`#eef4fa`,dark:`#566579`,sh:.12,hl:.05,lw:0},()=>{e.fillStyle=qh(e,-23,0,-9,0,[[0,`rgba(255,255,255,0)`],[.5,`rgba(255,255,255,0.55)`],[1,`rgba(255,255,255,0)`]]),e.fill(J([[-20,-20],[-13,-22.5],[-11,8],[-12.5,40],[-20,38],[-21,8]])),e.fillStyle=`rgba(24,34,52,0.16)`,e.fill(J([[6,-26],[12.5,-24.5],[14.5,8],[13,41],[6.5,41],[8,8]])),e.strokeStyle=`rgba(130,195,255,0.4)`,e.lineWidth=2.2,e.stroke(J([[24.2,-9],[24.4,12],[22.4,34]],!1)),e.lineWidth=1.2,e.strokeStyle=`rgba(255,255,255,0.75)`,Z(e,-2.4,-26,-3.2,-2),e.strokeStyle=`rgba(20,30,46,0.45)`,Z(e,-.8,-26,-1.6,-2),Q(e,rg(-28,28,o,6.2),{base:`#8697ad`,light:`#d5dfea`,dark:`#4d5b6e`,line:r,lw:1.3,sh:.3,hl:.14});for(let t of[-21,-12,-2.8,6.5,15.5,23])wg(e,t,o(t)+3.1,1.35,`#c9d4e0`,r);Q(e,rg(-28,28,s,10),{base:`#8193a9`,light:`#d0dbe6`,dark:`#46546a`,line:r,lw:1.3,sh:.2,hl:.12});for(let t of[-18,-9,0,9,18])wg(e,t,s(t)+3,1.3,`#c9d4e0`,r);for(let t of[13,17.4])for(let n of[10,14.4,18.8])Cg(e,t,n,1.25,`#0b121d`),e.strokeStyle=`rgba(255,255,255,0.55)`,e.lineWidth=.55,e.beginPath(),e.arc(t,n+.3,1.55,.15*Math.PI,.85*Math.PI),e.stroke()});let c=Y([[-20,-3.2,1],[-9,-.5],[3,-.5],[19.6,-3.2,1],[19.6,2.3,1],[7,4.5],[.7,5,1],[.3,20.5],[-2.6,24],[-5.5,20.5],[-5.9,5,1],[-12,4.5],[-20,2.3,1]]);$(e,-2,3,26,`#3d8fff`,.2),e.fillStyle=qh(e,0,-3,0,24,[[0,`#040a14`],[1,`#0c1a30`]]),e.fill(c.p),e.save(),e.clip(c.p),$(e,-10.5,1.2,9,`#48a6ff`,1),$(e,6.5,1.2,9,`#48a6ff`,1),$(e,-2.6,14,9,`#2f7fe6`,.45),e.fillStyle=`rgba(214,240,255,0.95)`,e.beginPath(),e.ellipse(-10.5,1.2,2.8,1.1,0,0,K),e.fill(),e.beginPath(),e.ellipse(6.5,1.2,2.8,1.1,0,0,K),e.fill(),e.strokeStyle=`rgba(150,200,255,0.45)`,e.lineWidth=1,e.stroke(pg(c.p,-1,-1.1)),e.restore(),vg(e,c.p,`#0a111c`,1.4),e.strokeStyle=`rgba(255,255,255,0.7)`,e.lineWidth=.9,e.stroke(J([[-19,4],[-12,6.1],[-7,6.5]],!1)),e.stroke(J([[1.8,6.5],[7,6.1],[19,4]],!1)),vg(e,a.p,r),Q(e,Qh(-3.8,-32,7.6,7,1.5),{base:`#8a9aae`,light:`#e2eaf2`,dark:`#4a586b`,line:r,lw:1.4,sh:.25,hl:.16}),Q(e,Zh(0,-32,4.6,1.7),{base:`#c9d4e0`,line:r,lw:1.2,sh:0,hl:0}),Sg(e,-15,-14,2.3),Sg(e,-16.5,20,1.4,.7)}function Hg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#c4ffae`,glowA:.2,glowR:40,glowY:-8});let r=`#0b2311`,i={base:`#7a4a28`,light:`#b67c4c`,dark:`#3e2310`,line:`#22130a`,sh:.22,hl:.14};e.save(),e.translate(-3,5),e.scale(.93,.93);let a=(t.H-5)/.93+3;Q(e,Y([[-52,a,1],[-46,40],[-34,28],[-16,21],[6,20],[26,23],[38,31],[47,42],[52,a,1]]),{base:`#255f31`,line:r,sh:.1,hl:.04}),Q(e,Y([[-14,a,1],[-12,36],[4,33],[20,36],[24,a,1]]),{base:`#6d4a2b`,light:`#a37448`,dark:`#3f2814`,line:`#24160a`,sh:.12,hl:.06}),Q(e,X([-16,37,-8,35,19,a,10,a]),{...i,lw:1.4}),Q(e,Qh(-1.5,45,7,5.5,1.2),{base:`#d9b25a`,light:`#fff0b0`,dark:`#8a6414`,line:`#3a2606`,lw:1.2,rot:.6,sh:.2,hl:.15});let o=Y([[-13,-48,1],[-2,-43],[9,-35],[17,-23],[21,-9],[21,5],[26,15],[34,24],[40,32,1],[32,34.5],[26,38.5,1],[18,36.5],[11,42,1],[3,38],[-5,42.5,1],[-12,38],[-21,41,1],[-28,36.5],[-37,38.5,1],[-40,33],[-44,33,1],[-38,22],[-31,10],[-28.5,-4],[-27,-19],[-22,-34]]);Q(e,o,{base:`#2f7d3b`,light:`#78cc68`,dark:`#15421d`,line:r,sh:.12,hl:.05},()=>{e.strokeStyle=Hh(`#0b2a12`,.55),e.lineWidth=1.1,e.stroke(J([[-12,-44],[-18,-30],[-21,-12],[-22,6]],!1)),e.stroke(J([[-7,-42],[-9,-32]],!1)),e.stroke(J([[-31,22],[-23,30],[-15,35]],!1)),e.stroke(J([[29,21],[23,29],[17,34]],!1)),e.strokeStyle=Hh(`#c2f7aa`,.45),e.lineWidth=1,e.stroke(J([[-15,-42],[-22,-28],[-24.5,-10]],!1)),e.strokeStyle=Hh(`#9ad884`,.5),e.lineWidth=1.6,e.stroke(pg(o.p,0,-2.2))});let s=Y([[4,-29,1],[12.5,-20],[16,-8],[15,4],[9.5,13],[1,16],[-7.5,12.5],[-12.5,3],[-13,-10],[-7.5,-22]]);vg(e,s.p,`#5caa52`,3.6),e.fillStyle=qh(e,0,-29,0,16,[[0,`#020704`],[.6,`#081a0e`],[1,`#133220`]]),e.fill(s.p),e.save(),e.clip(s.p),yg(e,2,11,10,`#3f7a4a`,.35),e.restore(),vg(e,s.p,r,1.6);for(let[t,n,r,i]of[[6.4,-5.6,3.4,-.28],[-4.4,-5.9,2.9,.28]])$(e,t,n,11,`#6dff48`,.75),e.fillStyle=`#ecffcc`,e.beginPath(),e.ellipse(t,n,r,r*.42,i,0,K),e.fill();Q(e,Y([[-5,21,1],[-1,17.5],[4.5,18.5,1],[.5,22.5]]),{base:`#e0b64e`,light:`#fff2b8`,dark:`#8a6414`,line:`#3a2606`,lw:1.2,sh:.25,hl:.2});let c=-30*Nh,l=[Math.cos(c),Math.sin(c)],u=[-l[1],l[0]],d=[13.5,3.5],f=[d[0]+l[0]*22,d[1]+l[1]*22],p=(e,t,n)=>[e[0]+u[0]*t+l[0]*n,e[1]+u[1]*t+l[1]*n],m=p(f,-31,-8),h=p(f,31,-8),g=ig(m,p(f,-15,0),f),_=ig(f,p(f,15,0),h),v=e=>e<.5?g(e*2):_(e*2-1),y=ig([22,27],[33,12],p(f,4.5,-1.5));Q(e,sg(y,e=>4.2-e*1.2,8),{base:`#2a6d35`,line:r,sh:.25,hl:.12}),Q(e,sg(ig(y(.62),y(.78),y(.95)),()=>3.4,6),{...i,lw:1.3}),Q(e,sg(v,e=>1.15+1.75*Math.sin(Math.PI*e),22),{base:`#8c5a2a`,light:`#dca060`,dark:`#4a2c10`,line:`#24140a`,lw:1.5,sh:.3,hl:.25});for(let t of[m,h])Q(e,Xh(t[0],t[1],1.5),{base:`#efe2c0`,line:`#24140a`,lw:1,sh:0,hl:0});Q(e,Zh(f[0]+.4,f[1]+.4,3.5,4.4,c),{...i,lw:1.4}),e.strokeStyle=`rgba(40,20,8,0.7)`,e.lineWidth=.6;for(let t=-1;t<=1;t++){let n=p(f,t*2.2,0);Z(e,n[0]-l[0]*1.2+.4,n[1]-l[1]*1.2+.4,n[0]+l[0]*2+.4,n[1]+l[1]*2+.4)}e.strokeStyle=`#2a1c0c`,e.lineWidth=1.5,hg(e,[m,d,h]),e.strokeStyle=`#f1e7cf`,e.lineWidth=.65,hg(e,[m,d,h]),e.save(),e.translate(d[0],d[1]),e.rotate(c),Q(e,Qh(-6,-.85,34,1.7,.85),{base:`#d7ae72`,light:`#f6dcaa`,dark:`#8a6232`,line:`#2e1d0c`,lw:1,rot:c,sh:.3,hl:.3}),Q(e,X([27,-3,35.5,0,27,3,28.8,0]),{base:`#c6d2de`,light:`#ffffff`,dark:`#6a7a8e`,line:`#141c26`,lw:1.2,rot:c,sh:.3,hl:.2}),Q(e,Y([[-1,-.7,1],[-4,-3.6],[-9.5,-4,1],[-7.5,-.7,1]]),{base:`#56b84e`,line:r,lw:1,rot:c,sh:.3,hl:.2}),Q(e,Y([[-1,.7,1],[-4,3.6],[-9.5,4,1],[-7.5,.7,1]]),{base:`#efe6c8`,line:`#3a3220`,lw:1,rot:c,sh:.3,hl:.2}),Sg(e,29.5,-1,.9),e.restore(),Q(e,Zh(d[0]+.3,d[1]+.4,3.5,3.2,c),{...i,lw:1.4}),e.strokeStyle=`rgba(40,20,8,0.7)`,e.lineWidth=.6,Z(e,d[0]-1.4,d[1]+1.6,d[0]+1.2,d[1]+.2),e.restore()}function Ug(e,t,n){let r=n*.72;return Y([[0,-t*.82],[e-n*1.1,-t],[e-n*.35,-r-n*.75],[e+n*.55,-r-n*.55],[e+n*.95,-r+n*.1],[e+n*.45,0,1],[e+n*.95,r-n*.1],[e+n*.55,r+n*.55],[e-n*.35,r+n*.75],[e-n*1.1,t],[0,t*.82],[-e+n*1.1,t],[-e+n*.35,r+n*.75],[-e-n*.55,r+n*.55],[-e-n*.95,r-n*.1],[-e-n*.45,0,1],[-e-n*.95,-r+n*.1],[-e-n*.55,-r-n*.55],[-e+n*.35,-r-n*.75],[-e+n*1.1,-t]])}function Wg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#7ff6ff`,glowA:.22,glowR:42}),bg(e,0,46,30,4.5,.5);let r=`#33281b`,i={base:`#ebdfc2`,light:`#fffaf0`,dark:`#b09c76`,line:r,sh:.24,hl:.12};for(let t of[-36*Nh,36*Nh])e.save(),e.translate(0,10),e.rotate(t),Q(e,Ug(42,4.3,6.4),{...i,rot:t}),e.restore();let a=-6*Nh;e.save(),e.translate(0,1),e.rotate(a),Q(e,Y([[-14,20],[-15.5,29],[-11,36],[-4,39.5],[4,39.5],[11,36],[15.5,29],[14,20]]),{...i,rot:a,sh:.2}),e.fillStyle=`#2b2117`,e.fill(Qh(-12.5,18.5,25,11.5,3.5).p),Q(e,Y([[0,-38.5],[16,-35.5],[26.5,-25],[30,-10],[27.5,3],[22.5,10.5],[17,14.5],[13,19.5],[6,21.5],[0,22],[-6,21.5],[-13,19.5],[-17,14.5],[-22.5,10.5],[-27.5,3],[-30,-10],[-26.5,-25],[-16,-35.5]]),{...i,rot:a,sh:.13,hl:.06},()=>{yg(e,27,0,9,`#6b5a3c`,.35),yg(e,-27,0,9,`#6b5a3c`,.22),e.strokeStyle=`rgba(255,255,255,0.7)`,e.lineWidth=1.1,e.stroke(J([[-22,11],[-17,12.5],[-12,10.5]],!1)),e.stroke(J([[12,10.5],[17,12.5],[21,11]],!1))});for(let t=0;t<5;t++){let n=-10+t*5,r=19+1.3*(1-(n/12)**2);Q(e,Qh(n-2.3,r,4.6,7.8,1.9),{...i,lw:1.2,sh:.25,hl:.12})}for(let t of[-1,1]){let n=Y([[t*4,-4],[t*5.5,-12],[t*12,-15.5],[t*19,-12.5],[t*20.5,-4.5],[t*17,2.5],[t*11,4],[t*6,2]]);vg(e,n.p,`rgba(110,86,50,0.35)`,3.4),e.fillStyle=Jh(e,t*12,-6,12,[[0,`#0b4a52`],[1,`#031417`]]),e.fill(n.p),e.save(),e.clip(n.p),$(e,t*12,-5,14,`#40f0ff`,.9),e.restore(),vg(e,n.p,r,1.6),$(e,t*12,-5,9,`#40f0ff`,.35),Cg(e,t*12,-5,3.1,`#e6feff`),Cg(e,t*12-1,-6.1,1,`#ffffff`)}let o=Y([[0,4.5,1],[3.9,10.8],[2.5,13.2],[0,12,1],[-2.5,13.2],[-3.9,10.8]]);e.fillStyle=`#2b2117`,e.fill(o.p),vg(e,o.p,r,1.2),e.strokeStyle=r,e.lineWidth=1.1,hg(e,[[10.5,-37],[8,-31],[11.5,-26.5],[8.5,-21]]),e.strokeStyle=`rgba(255,255,255,0.6)`,e.lineWidth=.6,hg(e,[[9.6,-37],[7.1,-31],[10.6,-26.5],[7.6,-21]]),Sg(e,-13,-27,2.4),Cg(e,-19.5,-21,1,`rgba(255,255,255,0.85)`),e.restore()}function Gg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#ffbe70`,glowA:.3,glowR:34,glowX:20,glowY:-38}),bg(e,-2,40,31,5,.6);let r=`#0c1016`,i=18*Nh,a=Xh(-3,9,27);Q(e,a,{base:`#3d4757`,light:`#8795a8`,dark:`#161b24`,radial:!0,sh:.13,hl:.05,lw:0},()=>{e.save(),e.translate(-3,9),e.rotate(i);let t=new Path2D;t.moveTo(28,0),t.ellipse(0,0,28,8,0,0,Math.PI),t.lineTo(-28,6.5),t.ellipse(0,6.5,28,8.5,0,Math.PI,0,!0),t.closePath(),Q(e,{p:t,b:[-27,0,27,15]},{base:`#2c3440`,light:`#6b7889`,dark:`#11151b`,line:r,lw:1.3,rot:i,sh:.25,hl:.14});for(let t=1;t<8;t++){let n=t/8*Math.PI;wg(e,Math.cos(n)*26.5,3.4+Math.sin(n)*8.2,1.6*(.55+.45*Math.sin(n)),`#d4ad55`,`#3a2708`)}e.restore(),e.fillStyle=`rgba(255,255,255,0.22)`,e.fill(J([[-23,3],[-17,-8],[-8,-13.5],[-11,-8],[-17,-1],[-21,8]])),e.fillStyle=`rgba(160,200,255,0.2)`,e.fill(J([[11,29],[19,19],[21.5,11],[20,21],[14,30]]))}),vg(e,a.p,r),Sg(e,-16,-5,3.2),Cg(e,-20.5,2,1.1,`rgba(255,255,255,0.8)`),e.save(),e.translate(-3,9),e.rotate(i),Q(e,Qh(-7.5,-33.5,15,8.5,2),{base:`#c4953a`,light:`#f3d488`,dark:`#7a5418`,line:`#3a2508`,lw:1.6,rot:i,sh:.22,hl:.16}),Q(e,Zh(0,-33.5,7.5,2.6),{base:`#e0b45a`,light:`#fbe6a8`,dark:`#9a6c22`,line:`#3a2508`,lw:1.3,sh:0,hl:0}),e.fillStyle=`#1a0f05`,e.beginPath(),e.ellipse(0,-33.5,3,1.1,0,0,K),e.fill(),e.restore();let o=[-3+33.5*Math.sin(i),9-33.5*Math.cos(i)],s=[24,-41],c=ag(o,[o[0]+1,o[1]-10],[s[0]-11,s[1]+8],s);Q(e,sg(c,()=>1.9,16),{base:`#c9a26a`,light:`#f0d6a4`,dark:`#7a5a30`,line:`#2e1e0c`,lw:1.3,sh:.3,hl:.2},()=>{e.strokeStyle=`rgba(70,42,14,0.65)`,e.lineWidth=.7;for(let t=1;t<13;t++){let n=t/13,[r,i]=c(n),[a,o]=c(Math.min(1,n+.01)),s=Math.hypot(a-r,o-i)||1,l=(a-r)/s,u=(o-i)/s;Z(e,r-u*2.2-l*1,i+l*2.2-u*1,r+u*2.2+l*1,i-l*2.2+u*1)}}),e.strokeStyle=`#2a1a10`,e.lineWidth=3.6,e.stroke(J(og(c,()=>0,0,.86,1,5),!1));let[l,u]=s;$(e,l,u,26,`#ff7a1a`,.6),$(e,l,u,11,`#ffd66a`,.9),e.save(),e.globalCompositeOperation=`lighter`;for(let t=0;t<14;t++){let r=t/14*K+q(n,-.15,.15),i=q(n,7,15)*(t%2?.6:1);e.strokeStyle=t%3==0?`rgba(255,255,255,0.95)`:`rgba(255,214,110,0.9)`,e.lineWidth=t%2?.8:1.3,Z(e,l+Math.cos(r)*2,u+Math.sin(r)*2,l+Math.cos(r)*i,u+Math.sin(r)*i)}e.restore(),xg(e,l,u,6.5,`#ffe28a`),Cg(e,l,u,2.3,`#ffffff`);for(let t=0;t<16;t++){let t=q(n,-Math.PI*.95,Math.PI*.2),r=q(n,9,27),i=l+Math.cos(t)*r,a=u+Math.sin(t)*r*.9,o=q(n,.5,1.5);$(e,i,a,o*4,`#ff8a2a`,.5),Cg(e,i,a,o,n()>.5?`#ffe7a0`:`#ffb04a`)}}function Kg(e,t,n,r,i,a,o){for(let o=0;o<8;o++){let s=i+o/8*K;e.save(),e.translate(t,n),e.rotate(s),Q(e,X([r*.18,-1.7,r*.76,-1.1,r*.76,1.1,r*.18,1.7]),{...a,rot:s,lw:1.2,sh:.3,hl:.2}),e.restore()}Q(e,$h(t,n,r*.68,r*.88),{...a,sh:.1,hl:.05}),Q(e,$h(t,n,r*.86,r),{...o,sh:.09,hl:.04});for(let a=0;a<10;a++){let o=i+a/10*K;wg(e,t+Math.cos(o)*r*.93,n+Math.sin(o)*r*.93,.9,`#aab3c0`,`#101318`)}Q(e,Xh(t,n,r*.26),{...a,radial:!0,sh:.2,hl:.1}),Q(e,Xh(t,n,r*.13),{...o,radial:!0,lw:1.2,sh:.2,hl:0})}function qg(e,t,n,r,i,a){let o=(n-r)/i,s=t*.55;for(let r=0;r<i;r++){let i=n-r*o,c=i-o*1.35;Q(e,X([-t-.2,c,t+.2,c-s,t+.2,i-s,-t-.2,i]),{base:`#5b3a22`,light:`#9c6c42`,dark:`#2e1c0e`,line:`#1e1208`,lw:.9,rot:a,sh:.3,hl:.25})}}function Jg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#ffe2b0`,glowA:.2,glowX:18,glowY:-18}),bg(e,-10,45,36,5.5,.55);let r={base:`#8f5b2b`,light:`#cf9858`,dark:`#4c2d12`,line:`#27160a`,sh:.2,hl:.1},i={base:`#4a5260`,light:`#9aa4b2`,dark:`#1d2128`,line:`#101318`,sh:.2,hl:.1},a={base:`#c98a38`,light:`#ffe08e`,dark:`#74440f`,line:`#38200a`,sh:.2,hl:.08};Q(e,X([-46,43,-42,35,-13,6,2,4,5,16,-37,46]),r,()=>{e.strokeStyle=`rgba(60,32,10,0.45)`,e.lineWidth=.8,Z(e,-42,40,-2,9),Z(e,-38,43,1,13)});for(let[t,n]of[[-34,38],[-22,27]])wg(e,t,n,1.3,`#9aa4b2`,`#101318`);let o=-40*Nh;e.save(),e.translate(-10,12),e.rotate(o),Q(e,Qh(-33,-2.2,5,4.4,1),{...a,rot:o,lw:1.3}),Q(e,Xh(-34,0,3.8),{...a,radial:!0,rot:o}),Q(e,Y([[-24,-10.6,1],[22,-7.4,1],[22,-9.6,1],[31,-9.6,1],[31,9.6,1],[22,9.6,1],[22,7.4,1],[-24,10.6,1],[-28.6,8],[-30.2,0],[-28.6,-8]]),{...a,rot:o,sh:.18,hl:.08},()=>{e.fillStyle=`rgba(255,248,215,0.55)`,e.fill(X([-27,-7.8,22,-5.2,22,-3.6,-27,-5.6]).p),e.fillStyle=`rgba(80,40,8,0.25)`,e.fill(X([-27,5,22,3.6,22,5.6,-27,7.6]).p)});for(let[t,n,r]of[[-20,11.9,4.2],[1,10.2,3.6],[17.5,9,3]])Q(e,Qh(t,-n,r,n*2,1.2),{...a,rot:o,lw:1.5,sh:.2,hl:.12});Q(e,Zh(31,0,2.8,9.6),{base:`#e6b05a`,light:`#ffe6a8`,dark:`#a0681c`,line:`#38200a`,lw:1.4,sh:0,hl:0}),e.fillStyle=`#1a0e05`,e.beginPath(),e.ellipse(31.3,0,1.6,6.2,0,0,K),e.fill(),Q(e,Xh(0,1.5,3.8),{...a,radial:!0,lw:1.5}),Cg(e,-23,-10,.9,`#2a1606`),e.restore(),Kg(e,-12,30,15,.2,r,i);let s=Math.cos(o),c=Math.sin(o),l=(e,t)=>[-10+s*e-c*t,12+c*e+s*t],[u,d]=l(33,0);$(e,u+3,d-3,28,`#ffb040`,.6);let[f,p]=l(38,0),m=ng(f,p,13.5,5.5,10,o);e.fillStyle=Jh(e,f,p,13.5,[[0,`#ffffff`],[.35,`#ffe27a`],[1,`#ff8a1f`]]),e.fill(m.p),vg(e,m.p,`#8a3a08`,1.2);let h={base:`#e4e9ef`,light:`#ffffff`,dark:`#9eaab8`,line:`#56626f`,lw:1.3,radial:!0,sh:.26,hl:.1,shade:`rgba(70,84,104,0.3)`};for(let[t,n,r]of[[35,8.5,5.2],[42,-9,5.6],[48,7.5,5.2],[31,-2,4.8],[38,1,7.4],[46,-2.5,7],[52,3,5.4],[33,-6,4.8],[42,6.5,5.8],[51,-6.5,4.4]]){let[i,a]=l(t,n);Q(e,Xh(i,a,r),h)}let[g,_]=l(58,-1);e.strokeStyle=`rgba(255,255,255,0.75)`,e.lineWidth=1.2;for(let t of[-3.2,0,3.2]){let[n,r]=l(51,-1+t),[i,a]=l(45,-1+t);Z(e,n,r,i,a)}$(e,g,_,12,`#ffc070`,.35),Q(e,Xh(g,_,6.2),{...i,radial:!0,sh:.2,hl:.08}),Sg(e,g-2.3,_-2.5,1.5);for(let t=0;t<5;t++){let[t,r]=l(q(n,36,56),q(n,-12,12));$(e,t,r,3,`#ffb040`,.6),Cg(e,t,r,.7,`#fff0b0`)}}function Yg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#86faea`,glowA:.22,glowR:44,glowY:10});let r=`#064550`;bg(e,0,41,42,6.5,.55);let i=Zh(0,39,41,6.2);e.fillStyle=qh(e,0,33,0,45,[[0,`rgba(70,225,212,0.9)`],[1,`rgba(10,118,128,0.95)`]]),e.fill(i.p),vg(e,i.p,r,1.4),e.strokeStyle=`rgba(220,255,250,0.6)`,e.lineWidth=.9,e.beginPath(),e.ellipse(-4,37.8,30,3.8,0,Math.PI*1.05,Math.PI*1.55),e.stroke();let a=Y([[-37,36,1],[-39,27],[-37,15],[-31.5,4],[-23,-5],[-13,-10.5],[-5,-12],[1,-10.4],[7,-12.6],[15,-11],[24,-5.5],[31.5,3],[37,14],[39.5,26],[37.5,36,1],[31,38.2],[28.5,43.4],[25,38.6],[14,37.6],[6,38.6],[0,37.4],[-10,38.6],[-14.5,44],[-18.5,38.8],[-29,38]]);Q(e,a,{base:`#1ec6bd`,light:`#a4f7ec`,dark:`#0a7a84`,line:r,radial:!0,sh:.13,hl:.05},()=>{yg(e,6,26,26,`#05646f`,.42);for(let t=0;t<8;t++){let t=q(n,-26,28),r=q(n,22,34),i=q(n,.8,2.6);e.fillStyle=`rgba(200,255,248,0.22)`,e.strokeStyle=`rgba(225,255,250,0.65)`,e.lineWidth=.6,e.beginPath(),e.arc(t,r,i,0,K),e.fill(),e.stroke(),Cg(e,t-i*.35,r-i*.35,i*.28,`rgba(255,255,255,0.9)`)}e.fillStyle=`rgba(150,250,238,0.55)`,e.fill(Y([[-35,14],[-32.5,15],[-32,24],[-33.6,27.5],[-35.4,24]]).p),e.fill(Y([[33.5,10],[36,11.5],[36,19],[34.4,22],[33,18]]).p)}),e.save(),e.clip(a.p),e.strokeStyle=`rgba(160,255,240,0.6)`,e.lineWidth=1.8,e.stroke(pg(a.p,-2.6,-2.2)),e.restore(),e.fillStyle=`rgba(255,255,255,0.8)`,e.fill(J([[-31,14],[-26,2],[-17,-5.5],[-9,-8.6],[-10.5,-5.6],[-19,-1.5],[-25.5,9],[-28,17]])),Sg(e,-1.5,-7.2,2.1),Cg(e,-31,21.5,1.2,`rgba(255,255,255,0.8)`),e.strokeStyle=`rgba(215,255,250,0.75)`,e.lineWidth=1.3;for(let[t,n]of[[-.8,-.7],[-.3,-.2]])e.beginPath(),e.arc(0,14,43,Math.PI*(t-.02),Math.PI*n),e.stroke();for(let t of[-12,12]){Q(e,Zh(t,9,7.6,9.2),{base:`#ffffff`,light:`#ffffff`,dark:`#cfe8ee`,line:r,lw:1.6,sh:.16,hl:0,shade:`rgba(40,110,130,0.28)`});let n=t+1.3;e.fillStyle=Jh(e,n-1.5,9,7,[[0,`#2f7fa0`],[.6,`#113a55`],[1,`#081a28`]]),e.beginPath(),e.ellipse(n,11,4.8,5.9,0,0,K),e.fill(),Cg(e,n-1.7,8.5,1.9,`#ffffff`),Cg(e,n+1.7,13.1,.85,`rgba(255,255,255,0.9)`)}let o=Y([[-3.6,20.2,1],[3.6,20.2,1],[2.6,23],[0,24.4],[-2.6,23]]);e.fillStyle=`#0a3a44`,e.fill(o.p),e.save(),e.clip(o.p),Cg(e,0,24,2.3,`#ff7aa0`),e.restore(),vg(e,o.p,r,1.3);for(let t of[-21,21])e.fillStyle=`rgba(255,120,170,0.35)`,e.beginPath(),e.ellipse(t,17,3.8,2.1,0,0,K),e.fill();Q(e,Y([[31,-20,1],[34.5,-14.5],[32.5,-11],[29,-11.5],[28.5,-15]]),{base:`#23cbc1`,light:`#b4fff4`,line:r,lw:1.3,sh:.2,hl:.15}),Q(e,Xh(37,-23,1.6),{base:`#23cbc1`,light:`#b4fff4`,line:r,lw:1,sh:0,hl:0}),Q(e,Xh(-40,31,2.1),{base:`#23cbc1`,light:`#b4fff4`,line:r,lw:1.1,sh:0,hl:0})}function Xg(e,t,n){Ig(e,t,n,{...Rg,glowC:`#ffb455`,glowA:.5,glowR:48,glowY:-16}),bg(e,5,50,16,3,.4);let r=12*Nh;e.save(),e.translate(0,10),e.rotate(r),Q(e,Y([[-4.2,0,1],[4.2,0,1],[3.4,43,1],[2.4,46.5],[-2.4,46.5],[-3.4,43,1]]),{base:`#8a5a2e`,light:`#c99458`,dark:`#4a2c12`,line:`#28170a`,rot:r,sh:.3,hl:.22},()=>{e.strokeStyle=`rgba(60,32,10,0.45)`,e.lineWidth=.6,Z(e,-1.5,2,-1,42),Z(e,1.4,4,1.2,40)}),qg(e,4.4,38,16,7,r),Q(e,Y([[-12,-6,1],[12,-6,1],[9.5,2],[6,10,1],[-6,10,1],[-9.5,2]]),{base:`#565d69`,light:`#a8b1bd`,dark:`#22262d`,line:`#111317`,rot:r,sh:.22,hl:.12},()=>{e.fillStyle=`rgba(20,22,26,0.45)`,e.fill(X([-12,.5,12,.5,12,3.5,-12,3.5]).p),e.strokeStyle=`rgba(210,220,232,0.5)`,e.lineWidth=.7,Z(e,-12,.3,12,.3),e.strokeStyle=`rgba(15,17,20,0.7)`,e.lineWidth=.9;for(let t of[-6,0,6])Z(e,t,-6,t*.55,10);yg(e,0,-6,12,`#ff8a2a`,.5,.6)});for(let t of[-8.5,0,8.5])wg(e,t,2,1.1,`#aab3c0`,`#111317`);Q(e,Zh(0,-6,12,3.2),{base:`#6d7480`,light:`#c9d0da`,dark:`#2a2e35`,line:`#111317`,lw:1.4,sh:0,hl:0}),e.fillStyle=Jh(e,0,-6,10,[[0,`#ffe08a`],[.5,`#ff7a1a`],[1,`#4a1406`]]),e.beginPath(),e.ellipse(0,-5.6,9.6,2.2,0,0,K),e.fill(),e.restore();let i=0+6*Math.sin(r),a=10-6*Math.cos(r)+1;$(e,i,a-20,44,`#ff8a2a`,.5),jg(e,dg([[-11,0],[-14,-8],[-18,-19,1],[-12,-15],[-11,-25],[-14.5,-35,1],[-6,-30],[-3,-41],[.5,-55,1],[5,-43],[9,-37],[13.5,-45,1],[13,-30],[16,-22],[21.5,-25,1],[16.5,-12],[13,-3],[11,0],[7,5],[0,6.5],[-7,5]],0,0,1).map(e=>e.length===3?[e[0]+i,e[1]+a,1]:[e[0]+i,e[1]+a]),i,a+2,[i,a-55],[i,a+6],`#6a1406`),$(e,i,a-10,18,`#ffe08a`,.35);for(let t=0;t<12;t++){let t=i+q(n,-20,24),r=a+q(n,-60,-20),o=q(n,.5,1.5);$(e,t,r,o*4,`#ff9a3a`,.55),Cg(e,t,r,o,n()>.5?`#fff0b0`:`#ffb04a`)}}function Zg(e,t,n){Ig(e,t,n,{...zg,glowC:`#fff4c8`,glowA:.3}),bg(e,0,41,36,5.5,.45);let r=`#120b38`,i={base:`#f2c04a`,light:`#fff2b0`,dark:`#a8700f`,line:`#4a2c05`,sh:.25,hl:.14},a=ig([28,56],[0,15],[-24.5,-22]);Q(e,sg(a,()=>2.3,10),{base:`#7c4a22`,light:`#bf8048`,dark:`#3e2210`,line:`#22120a`,sh:.3,hl:.2});for(let t of[.9,.97]){let[n,r]=a(t);Q(e,Zh(n,r,3.4,1.8,-.98+Math.PI/2),{...i,lw:1.2})}let o=-29.5;$(e,-28,o,36,`#6ff0ff`,.5);let s=Xh(-28,o,8.5);e.fillStyle=Jh(e,-30.5,-32.5,11,[[0,`#ffffff`],[.3,`#c8fbff`],[.7,`#4fd0f5`],[1,`#1f6fc8`]]),e.fill(s.p),e.save(),e.clip(s.p),e.strokeStyle=`rgba(255,255,255,0.6)`,e.lineWidth=.8,e.beginPath(),e.arc(-27,-28.5,5,.2*Math.PI,1.3*Math.PI),e.stroke(),e.restore(),vg(e,s.p,`#0f3a6a`,1.6);for(let t of[-1,1]){let n=Math.atan2(7.5,3.5);Q(e,sg(ig([-24.8,-22.5],[-28+Math.cos(n+t*1.1)*10.5,o+Math.sin(n+t*1.1)*10.5],[-28+Math.cos(n+t*1.75)*8.2,o+Math.sin(n+t*1.75)*8.2]),ug(1.6,.8),8),{...i,lw:1.2})}Sg(e,-31.2,-33.1,2.2),$(e,-28,o,12,`#bff8ff`,.45),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(190,250,255,0.55)`,e.lineWidth=.7,e.beginPath(),e.ellipse(-28,o,14,4.5,-.5,0,K),e.stroke(),e.restore(),xg(e,-39,-38.5,2.4,`#bff8ff`),xg(e,-16,-35.5,1.8,`#bff8ff`),Q(e,Zh(0,25,40,11,-5*Nh),{base:`#3f309c`,light:`#7e6ee8`,dark:`#1d1458`,line:r,sh:.18,hl:.06},()=>{yg(e,0,21,22,`#0c0630`,.5,.4),kg(e,-31,26,2.1,`#f7d36a`),kg(e,29,23,1.8,`#f7d36a`),Cg(e,-22,31,.8,`#f7d36a`),Cg(e,21,30.5,.8,`#f7d36a`)}),Q(e,Y([[-21,22,1],[-18,8],[-14,-6],[-9,-20],[-3,-33],[5,-42],[15,-46],[24,-43],[29.5,-35,1],[23,-37],[15,-38],[9,-33],[6,-24],[8,-10],[12,4],[18,19,1],[10,23],[-2,24.5],[-13,24]]),{base:`#5040c0`,light:`#9d90ff`,dark:`#241a6e`,line:r,sh:.16,hl:.06},()=>{e.fillStyle=`rgba(20,10,60,0.35)`,e.fill(J([[-4,-31],[6,-33],[15,-38],[23,-37],[29.5,-35],[20,-41],[10,-41],[0,-36]])),e.strokeStyle=`rgba(18,10,56,0.6)`,e.lineWidth=1,e.stroke(J([[-6,-29],[1,-31],[7,-31.5]],!1)),kg(e,-9,-2,3.3,`#f7d36a`,`#8a5a0a`),kg(e,3,-17,2.4,`#f7d36a`,`#8a5a0a`),kg(e,18,-42,1.9,`#f7d36a`,`#8a5a0a`),kg(e,4,8,2,`#f7d36a`,`#8a5a0a`);let t=eg(-6,-21,3.6,1.6,-1.2,3.1);e.fillStyle=`#f7d36a`,e.fill(t.p);for(let[t,n]of[[-12,10],[9,-6],[-2,-8],[-5,3],[10,-28]])Cg(e,t,n,.7,`#fbe6a0`)}),Q(e,Y([[-21,22,1],[-19.6,13.5,1],[-4,16.5],[15.5,12,1],[18,19,1],[10,23],[-2,24.5],[-13,24]]),{...i,lw:1.5},()=>{e.strokeStyle=`rgba(120,70,5,0.5)`,e.lineWidth=.6,e.stroke(J([[-20,18.5],[-4,21],[16.5,16]],!1))}),Q(e,eg(-3,19.5,5.2,2.4,-1.6,4.4),{...i,lw:1.3}),Q(e,Xh(-1.2,18.4,1.6),{base:`#4fc8ff`,light:`#d8f8ff`,dark:`#1a5fa8`,line:`#0f2a4a`,lw:.8,radial:!0,sh:0,hl:0}),xg(e,30,-44,2.6,`#fff4c0`),xg(e,-18,-36,1.8,`#fff4c0`),xg(e,36,-24,1.5,`#fff4c0`)}function Qg(e,t,n,r,i,a,o=10){let s=[];for(let a=0;a<=o;a++){let c=r+(i-r)*a/o;s.push(a===0||a===o?[e+Math.cos(c)*n,t+Math.sin(c)*n,1]:[e+Math.cos(c)*n,t+Math.sin(c)*n])}for(let c=o-1;c>=1;c--){let l=r+(i-r)*c/o,u=n-a*Math.sin(Math.PI*c/o);s.push([e+Math.cos(l)*u,t+Math.sin(l)*u])}return Y(s)}function $g(e,t,n){Ig(e,t,n,{...zg,glowC:`#ff6a7a`,glowA:.32,glowR:38,glowY:14}),bg(e,0,43,27,4.5,.5),yg(e,5,42,19,`#ff2a40`,.4,.25);let r=`#3a0f18`,i=Y([[-7.5,-28,1],[-7.5,-11],[-10,-7.2],[-20,-1],[-25,12],[-22.5,28],[-12.5,37.5],[0,39.5],[12.5,37.5],[22.5,28],[25,12],[20,-1],[10,-7.2],[7.5,-11],[7.5,-28,1]]);e.fillStyle=`rgba(215,235,255,0.2)`,e.fill(i.p),e.save(),e.clip(i.p);let a=new Path2D;a.moveTo(-27,6),a.bezierCurveTo(-14,2.6,-6,8.6,2,5.4),a.bezierCurveTo(10,2.4,18,7.6,27,5),a.lineTo(27,45),a.lineTo(-27,45),a.closePath(),e.fillStyle=qh(e,0,4,0,40,[[0,`#ff6a7c`],[.35,`#e3122e`],[1,`#7d0418`]]),e.fill(a),e.save(),e.clip(a),$(e,0,22,22,`#ff4a5e`,.6);for(let t=0;t<12;t++){let t=q(n,-17,17),r=q(n,9,34),i=q(n,.7,2.5);e.fillStyle=`rgba(255,200,205,0.3)`,e.strokeStyle=`rgba(255,232,232,0.75)`,e.lineWidth=.55,e.beginPath(),e.arc(t,r,i,0,K),e.fill(),e.stroke(),Cg(e,t-i*.35,r-i*.4,i*.3,`rgba(255,255,255,0.9)`)}e.restore(),e.strokeStyle=`rgba(255,205,210,0.85)`,e.lineWidth=1.2;let o=new Path2D;o.moveTo(-27,6),o.bezierCurveTo(-14,2.6,-6,8.6,2,5.4),o.bezierCurveTo(10,2.4,18,7.6,27,5),e.stroke(o),e.strokeStyle=`rgba(90,0,20,0.35)`,e.lineWidth=4,e.stroke(i.p),e.restore(),e.fillStyle=`rgba(255,255,255,0.75)`,e.fill(Qg(0,14,21.5,188*Nh,252*Nh,3.6).p),e.fillStyle=`rgba(255,230,232,0.55)`,e.fill(Qg(0,14,23,-25*Nh,50*Nh,1.8).p),e.fillStyle=`rgba(255,170,180,0.65)`,e.fill(Qg(0,14,21,65*Nh,118*Nh,2.2).p),e.fillStyle=`rgba(255,255,255,0.6)`,e.fill(Qh(-5.3,-26,1.9,14.5,.95).p),Sg(e,-12.5,-1.5,2.2),Cg(e,-17,5.5,.9,`rgba(255,255,255,0.9)`),vg(e,i.p,r,2),Q(e,Qh(-10,-31.5,20,4.8,2),{base:`#b9cbe0`,light:`#ffffff`,dark:`#6c7f98`,line:r,lw:1.6,sh:.25,hl:.2}),Q(e,Y([[-7,-31,1],[7,-31,1],[8.3,-38],[7.4,-42.5],[0,-44.2],[-7.4,-42.5],[-8.3,-38]]),{base:`#c8995c`,light:`#f0d2a0`,dark:`#8a5e30`,line:`#4a3016`,lw:1.6,sh:.25,hl:.14},()=>{for(let t=0;t<9;t++)Cg(e,q(n,-6,6),q(n,-42,-32),q(n,.3,.6),`rgba(90,56,24,0.55)`)}),e.strokeStyle=`#4a3016`,e.lineWidth=2.4,e.stroke(J([[-8,-15],[0,-13.2],[8,-15]],!1)),e.strokeStyle=`#dcc28c`,e.lineWidth=1.2,e.stroke(J([[-8,-15],[0,-13.2],[8,-15]],!1)),e.strokeStyle=`#4a3016`,e.lineWidth=2.2,e.stroke(J([[7.5,-14.5],[11,-10],[13.5,-4]],!1)),e.strokeStyle=`#dcc28c`,e.lineWidth=1,e.stroke(J([[7.5,-14.5],[11,-10],[13.5,-4]],!1)),e.save(),e.translate(15.5,1),e.rotate(.35),Q(e,Y([[-4,-4.5,1],[4,-4.5,1],[4,5,1],[-4,5,1]]),{base:`#efdcae`,light:`#fff8e2`,dark:`#b59a62`,line:`#4a3016`,lw:1.3,rot:.35,sh:.2,hl:.12});let s=Y([[0,3.2,1],[-2.6,.4],[-2.4,-1.6],[-1,-2.2],[0,-1.2,1],[1,-2.2],[2.4,-1.6],[2.6,.4]]);e.fillStyle=`#d61f3a`,e.fill(s.p),e.restore()}function e_(e,t,n){Ig(e,t,n,{...zg,pat:`none`,glowC:`#fff6d8`,glowA:.3});let r=t.H+2,i=`#2e281f`;for(let[t,r,i]of[[-31,-22,1],[33,-4,.85],[-37,14,.7]])Q(e,Ng(t,r,11*i,4.6*i,6,n,0,.16),{base:`#fff0d4`,light:`#ffffff`,dark:`#f3c890`,line:`rgba(170,96,34,0.6)`,lw:1.1,sh:.24,hl:0,shade:`rgba(214,130,60,0.35)`});let a={base:`#b5aa96`,light:`#ece3d0`,dark:`#6c6354`,line:i,sh:.1,hl:.05},o=e=>16+3*(e- -11)/52,s=e=>2.4*(1-(e- -11)/52)+.3,c=(e,t)=>e-s(e)*(1-(t/o(e))**2);Q(e,Qh(-1,-52,2.2,26,1),{base:`#6a4a2a`,line:`#24160a`,lw:1.2,sh:.3,hl:.2}),Q(e,Y([[1,-50.5,1],[10,-52],[20,-47.5],[32,-48.5,1],[25,-44.2,1],[30.5,-39.5,1],[18,-40],[9,-38.5],[1,-40,1]]),{base:`#d8323c`,light:`#ff8080`,dark:`#8a1420`,line:`#4a0a10`,lw:1.6,sh:.25,hl:.12},()=>{e.fillStyle=`#f2c04a`,e.fill(X([1,-52,5,-52,5,-38,1,-38]).p),e.strokeStyle=`rgba(100,10,20,0.4)`,e.lineWidth=.8,e.stroke(J([[8,-49],[16,-45.5],[24,-45]],!1))}),Q(e,Xh(.1,-53,2),{base:`#f2c04a`,light:`#fff2b0`,dark:`#a8700f`,line:`#4a2c05`,lw:1.1,radial:!0,sh:0,hl:0}),Q(e,X([-16,-11,16,-11,19,41,-19,41]),a,()=>{e.fillStyle=qh(e,-19,0,19,0,[[0,`rgba(255,255,255,0.22)`],[.35,`rgba(255,255,255,0)`],[.7,`rgba(0,0,0,0.1)`],[1,`rgba(0,0,0,0.32)`]]),e.fillRect(-19,-15,38,60);let t=6.5,r=-13,i=0;for(let a=-6.5;a<47.5;a+=t,i++){let s=o(a),l=[];for(let e=0;e<=8;e++){let t=-s-1+(2*s+2)*e/8;l.push([t,c(a,t)])}let u=i%2?.5:0;for(let i=-4;i<=4;i++){let s=(i+u)*Math.PI/7;if(Math.abs(s)>1.4)continue;let l=Math.sin(s)*o(a-t/2),d=n();if(d<.3||d>.8){let n=(i+u+1)*Math.PI/7,s=Math.sin(Math.min(n,1.5))*o(a-t/2);e.fillStyle=d<.3?`rgba(255,255,255,0.1)`:`rgba(40,30,20,0.1)`,e.fill(X([l,c(r,l),s,c(r,s),s,c(a,s),l,c(a,l)]).p)}e.strokeStyle=`rgba(70,60,48,0.55)`,e.lineWidth=.8,Z(e,l,c(r,l)+.4,l,c(a,l)-.2)}e.strokeStyle=`rgba(70,60,48,0.6)`,e.lineWidth=.9,e.stroke(J(l,!1)),e.strokeStyle=`rgba(255,250,235,0.3)`,e.lineWidth=.6,e.stroke(J(l.map(([e,t])=>[e,t+.9]),!1)),r=a}});let l=(t,n,r,o)=>{let s=o?3.4:1.6;o&&Q(e,Y([[t-s-1.6,n+r/2+1.2,1],[t-s-1.6,n-r/2+s],[t,n-r/2-1.8],[t+s+1.6,n-r/2+s],[t+s+1.6,n+r/2+1.2,1]]),{...a,base:`#cfc5b0`,lw:1.2,sh:.2,hl:.1});let c=Y([[t-s,n+r/2,1],[t-s,n-r/2+s],[t,n-r/2],[t+s,n-r/2+s],[t+s,n+r/2,1]]);$(e,t,n,r*1.3,`#ffb040`,.55),e.fillStyle=qh(e,t,n-r/2,t,n+r/2,[[0,`#fff0a8`],[1,`#ff9a2e`]]),e.fill(c.p),o&&(e.strokeStyle=i,e.lineWidth=1,Z(e,t,n-r/2+1,t,n+r/2)),vg(e,c.p,i,1.3)};l(-3,4,11,!0),l(8,22,10,!1),l(-10,21,8,!1),Q(e,Y([[-6.2,41.5,1],[-6.2,34],[-4,30.6],[0,29.6],[4,30.6],[6.2,34],[6.2,41.5,1]]),{base:`#7a4a24`,light:`#a8703e`,dark:`#3e220e`,line:i,lw:1.5,sh:.2,hl:.1},()=>{e.strokeStyle=`rgba(40,20,6,0.6)`,e.lineWidth=.6;for(let t of[-3,0,3])Z(e,t,29,t,42);e.strokeStyle=`#3a3f48`,e.lineWidth=1.1,Z(e,-6,34,6,34),Z(e,-6,38.5,6,38.5)});let u=23.5,d=(e,t)=>e-2.6*(1-(t/u)**2);for(let t=-3;t<=3;t++){let n=Math.sin(t*Math.PI/8)*17.5;Q(e,Y([[n-2.2,d(-13,n)-1,1],[n+2.2,d(-13,n)-1,1],[n+1.4,d(-13,n)+4.5],[n,d(-13,n)+5.6],[n-1.4,d(-13,n)+4.5]]),{...a,lw:1.3,sh:.25,hl:.1})}for(let t of[-.7,0,.7]){let n=Math.sin(t-.15)*u*.92,r=Math.sin(t+.15)*u*.92;Q(e,X([n,d(-27,n)-4.6,r,d(-27,r)-4.6,r,d(-27,r)+2,n,d(-27,n)+2]),{base:`#8a8070`,line:i,lw:1.2,sh:.2,hl:.08})}let f=[];for(let e=0;e<=10;e++){let t=-23.5+2*u*e/10;f.push(e===0||e===10?[t,d(-13,t),1]:[t,d(-13,t)])}for(let e=10;e>=0;e--){let t=-23.5+2*u*e/10;f.push(e===0||e===10?[t,d(-27,t),1]:[t,d(-27,t)])}Q(e,Y(f),{...a,sh:.18,hl:.08},()=>{e.fillStyle=qh(e,-23.5,0,u,0,[[0,`rgba(255,255,255,0.2)`],[.4,`rgba(255,255,255,0)`],[1,`rgba(0,0,0,0.3)`]]),e.fillRect(-23.5,-33,u*2,24),e.strokeStyle=`rgba(70,60,48,0.55)`,e.lineWidth=.8;let t=[];for(let e=0;e<=8;e++){let n=-23.5+2*u*e/8;t.push([n,d(-20,n)])}e.stroke(J(t,!1));for(let t=-3;t<=3;t++){let n=Math.sin((t+(t%2?0:.5))*.36)*u;Z(e,n,d(-27,n)+.5,n,d(-20,n))}});for(let t of[-1.08,-.36,.36,1.08]){let n=Math.sin(t-.2)*u,r=Math.sin(Math.min(1.5,t+.2))*u;Q(e,X([n,d(-27,n)-7.5,r,d(-27,r)-7.5,r,d(-27,r)+.5,n,d(-27,n)+.5]),{...a,lw:1.5,sh:.2,hl:.12})}Q(e,Y([[-50,r,1],[-46,44],[-35,37.5],[-22,38.5],[-8,40.5],[8,39.5],[22,37],[35,39],[46,44],[50,r,1]]),{base:`#5e9a3c`,light:`#a6d86a`,dark:`#2f5a1c`,line:`#1a300e`,sh:.1,hl:.04},()=>{for(let[t,r,a]of[[-26,44,5],[22,43,6],[-4,48,4]])Q(e,Ng(t,r,a,a*.7,3,n,0,.15),{base:`#9a9486`,line:i,lw:1.2,sh:.25,hl:.12})});for(let[t,n]of[[-36,39],[-14,40],[12,39.5],[33,39.5]]){e.strokeStyle=`#2f5a1c`,e.lineWidth=1;for(let r of[-1.6,0,1.6])Z(e,t+r,n+1,t+r*1.8,n-3)}}function t_(e,t,n){Ig(e,t,n,{...zg,glowC:`#fff2c4`,glowA:.28}),bg(e,0,50,26,4,.4);let r=-5*Nh;e.save(),e.rotate(r);let i=Y([[-33,-35,1],[-16,-38.5],[0,-40],[16,-38.5],[33,-35,1],[33.5,-14],[29.5,8],[20,27],[0,46,1],[-20,27],[-29.5,8],[-33.5,-14]]);e.save(),e.translate(2.6,2.4),e.fillStyle=`#6a3f0a`,e.fill(i.p),vg(e,i.p,`#3a2204`),e.restore(),Q(e,i,{base:`#f0b93a`,light:`#fff2ac`,dark:`#a0660f`,line:`#4a2a06`,rot:r,sh:.08,hl:.035}),Q(e,Y([[-27.5,-30.5,1],[-14,-33.5],[0,-34.8],[14,-33.5],[27.5,-30.5,1],[28,-13],[24.5,6.5],[16,23],[0,38.5,1],[-16,23],[-24.5,6.5],[-28,-13]]),{base:`#2458c9`,light:`#6aa6ff`,dark:`#10286a`,line:`#4a2a06`,lw:1.6,rot:r,sh:.1,hl:.04},()=>{e.fillStyle=`rgba(255,255,255,0.1)`,e.fill(X([-30,-12,-10,-36,2,-36,-30,4]).p),e.fillStyle=`rgba(8,20,60,0.22)`,e.fillRect(0,-40,32,82),yg(e,0,2,26,`#bfe0ff`,.4),e.strokeStyle=`rgba(255,230,160,0.55)`,e.lineWidth=.8,e.stroke(J(dg([[-27.5,-30.5,1],[-14,-33.5],[0,-34.8],[14,-33.5],[27.5,-30.5,1],[28,-13],[24.5,6.5],[16,23],[0,38.5,1],[-16,23],[-24.5,6.5],[-28,-13]],0,2,.88))),e.strokeStyle=`rgba(220,240,255,0.35)`,e.lineWidth=.6,Z(e,12,18,18,11),Z(e,-20,-6,-15,-12),Z(e,14,-24,17,-20)}),$(e,0,2,22,`#fff4c0`,.25),Dg(e,0,1.5,20.5,8.6,5,-Math.PI/2,`#fff6c0`,`#c07814`,`#4a2a06`,1.8),Sg(e,-4,-9,1.6);for(let[t,n]of[[-30.4,-32.8],[0,-37.4],[30.4,-32.8],[-15,-36],[15,-36],[30.8,-12],[27,8],[18,25.5],[0,42.2],[-18,25.5],[-27,8],[-30.8,-12]])wg(e,t,n,1.45,`#dfe6ee`,`#3a2204`);Sg(e,-24,-28,1.8,.85),e.restore()}function n_(e,t,n){Ig(e,t,n,{...zg,c0:`#ffd27a`,c1:`#b85a1e`,c2:`#3a1406`,pat:`none`,glowC:`#ffe0a0`,glowA:.3,glowX:-10,glowY:12});let r=-45*Nh;for(let t=0;t<22;t++){let t=q(n,10,72),i=q(n,-24,24)*(.4+t/90),a=-12+Math.cos(r)*t-Math.sin(r)*i,o=14+Math.sin(r)*t+Math.cos(r)*i,s=q(n,.4,1.4);$(e,a,o,s*4,`#ff8a2a`,.5),Cg(e,a,o,s,n()>.5?`#fff0b0`:`#ffb04a`)}$(e,-12,14,40,`#ff7a1a`,.55),e.save(),e.translate(-12,14),e.rotate(r),jg(e,[[-20,0],[-16,-12],[-5,-19.5],[8,-20],[18,-26,1],[20.5,-17],[34,-22,1],[34.5,-12],[50,-14.5,1],[47,-6],[70,-1,1],[48,5],[55,13,1],[38,11],[41,21,1],[26,16],[22,24.5,1],[10,20],[-5,19.5],[-16,12]],-8,0,[70,0],[-20,0],`#5c1206`,[[1,`#c01f16`],[1,`#ff8a22`],[.74,`#ff6a1c`],[.74,`#ffc43a`],[.5,`#ffb42e`],[.5,`#fff0a0`],[.3,`#fff3c0`],[.3,`#ffffff`]]);let i=[];for(let e=0;e<11;e++){let t=e/11*K,r=13*q(n,.88,1.06);i.push([Math.cos(t)*r,Math.sin(t)*r])}Q(e,Y(i),{base:`#5a2a18`,light:`#9a4a24`,dark:`#1e0c06`,line:`#1a0804`,rot:r,radial:!0,sh:.16,hl:0},()=>{e.fillStyle=Jh(e,-12,0,16,[[0,`rgba(255,240,170,0.95)`],[.4,`rgba(255,150,40,0.7)`],[1,`rgba(255,80,20,0)`]]),e.fillRect(-16,-16,32,32),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(255,170,60,0.95)`,e.lineWidth=1.1;for(let t=0;t<4;t++){let t=q(n,0,K);hg(e,gg(n,[Math.cos(t)*3,Math.sin(t)*3],[Math.cos(t)*14,Math.sin(t)*14],2,3))}e.restore()}),e.restore(),$(e,-17,19,16,`#fff0b0`,.5);for(let t=0;t<6;t++)xg(e,-12+q(n,-30,40),14+q(n,-60,20),q(n,1.2,2.4),`#ffe08a`,.8)}var r_=[[[0,-1,.65,0,0,1,-.65,0,0,-1],[0,-.02,0,.02]],[[.8,0,.4,.69,-.4,.69,-.8,0,-.4,-.69,.4,-.69,.8,0],[.34,0,.17,.29,-.17,.29,-.34,0,-.17,-.29,.17,-.29,.34,0]],[[.55,0,.28,.48,-.28,.48,-.55,0,-.28,-.48,.28,-.48,.55,0],[0,-.75,0,-1.2],[.65,.38,1.04,.6],[-.65,.38,-1.04,.6]],[[0,-.95,.85,.6,-.85,.6,0,-.95],[0,.12,0,.16]],[[.7,0,.35,.6,-.35,.6,-.7,0,-.35,-.6,.35,-.6,.7,0],[0,-.02,0,.02]]];function i_(e,t,n,r,i,a){let o=r_[t%r_.length],s=()=>{e.beginPath();for(let t of o){e.moveTo(n+t[0]*i,r+t[1]*i);for(let a=2;a<t.length;a+=2)e.lineTo(n+t[a]*i,r+t[a+1]*i)}e.stroke()};e.strokeStyle=`rgba(10,20,30,0.55)`,e.lineWidth=1.5,s(),e.save(),e.globalCompositeOperation=`lighter`,Tg(e,2.2,a),e.strokeStyle=Hh(a,.9),e.lineWidth=1.1,s(),Eg(e),e.strokeStyle=`rgba(235,255,255,0.95)`,e.lineWidth=.45,s(),e.restore()}function a_(e,t,n){Ig(e,t,n,{...zg,glowC:`#d8fbff`,glowA:.22,glowY:-14}),bg(e,0,47,24,3.5,.4);let r=20*Nh,i=`#161c25`,a={base:`#a3b1c0`,light:`#edf3f8`,dark:`#4f5c6e`,line:i,rot:r,sh:.14,hl:.06};e.save(),e.translate(-3,6),e.rotate(r),Q(e,Qh(-3.4,-34,6.8,74,3),{base:`#6e4424`,light:`#a86e3e`,dark:`#35200e`,line:`#1e1208`,rot:r,sh:.3,hl:.2}),qg(e,3.7,36,9,8,r),Q(e,Y([[-4.6,39,1],[4.6,39,1],[3.6,43.5],[0,47,1],[-3.6,43.5]]),{...a,lw:1.5}),Q(e,Qh(-4.8,-9,9.6,4.6,1.2),{...a,lw:1.4});for(let t of[-1,1])Q(e,Y([[t*6,-31,1],[t*16,-34],[t*27,-40,1],[t*32.5,-30],[t*34.5,-18],[t*32.5,-6],[t*26,4,1],[t*16,-3],[t*6,-12,1]]),a,()=>{let n=Y([[t*27,-40,1],[t*32.5,-30],[t*34.5,-18],[t*32.5,-6],[t*26,4,1],[t*24.5,-3.5],[t*28.5,-12],[t*29,-24],[t*25,-33.5]]);e.fillStyle=qh(e,t*24,-30,t*34,-10,[[0,`#ffffff`],[1,`#b8c6d4`]]),e.fill(n.p),e.strokeStyle=`rgba(40,52,68,0.6)`,e.lineWidth=.8,e.stroke(J([[t*26,3],[t*24.5,-3.5],[t*28.5,-12],[t*29,-24],[t*25,-33.5],[t*26.5,-39]],!1))}),i_(e,t<0?0:2,t*15,-24,2.6,`#5ff2ff`),i_(e,t<0?1:3,t*18,-12,2.3,`#5ff2ff`);Q(e,X([-4.2,-34,4.2,-34,0,-45]),{...a,lw:1.5}),Q(e,Qh(-6.5,-35,13,27,2.6),{base:`#6b7788`,light:`#c3ccd8`,dark:`#343d4a`,line:i,rot:r,sh:.22,hl:.12});for(let t of[-30,-13])wg(e,0,t,1.5,`#d8e0ea`,i);i_(e,4,0,-21.5,2.4,`#5ff2ff`),e.restore(),Sg(e,-20,-30,1.8),xg(e,33,-18,2.6,`#e8feff`)}function o_(e,t,n){Ig(e,t,n,{...Bg,glowC:`#ffb8f2`,glowA:.22,glowR:44});let r=t.H+2,i=`#062c19`,a={base:`#1fa25c`,light:`#7ff0a6`,dark:`#0a5a33`,line:i,sh:.14,hl:.06},o={base:`#eadcb6`,light:`#fffaf0`,dark:`#8c7650`,line:`#2e2414`,sh:.3,hl:.22},s={base:`#8a3fd0`,light:`#c790ff`,dark:`#43157a`,line:`#1e0838`,lw:1.6,sh:.18,hl:.08},c=(t,n,r,i)=>{e.strokeStyle=`rgba(6,50,26,0.35)`,e.lineWidth=.8;let a=0;for(let o=r;o<i;o+=4.6,a++)for(let r=t+(a%2?2.5:0);r<n;r+=5)e.beginPath(),e.arc(r,o,2.1,.15*Math.PI,.85*Math.PI),e.stroke()};Q(e,Y([[14,-18,1],[36,-22,1],[29,-6],[41,-2,1],[32.5,9],[43,14,1],[35.5,22],[44,31,1],[35,34,1],[28,14],[22,0]]),s,()=>{e.strokeStyle=`#0c4a2a`,e.lineWidth=1.6;for(let[t,n]of[[[18,-12],[36,-22]],[[24,0],[41,-2]],[[29,12],[43,14]],[[33,24],[44,31]]])Z(e,t[0],t[1],n[0],n[1])}),Q(e,Y([[2,2],[16,-2],[26,8],[32,24],[37,r,1],[4,r,1],[1,40],[-4,26],[-7,17]]),a,()=>{let t=Y([[-9,15],[-3,13],[2,26],[7,40],[9,r,1],[-2,r,1],[-3,40],[-7,26]]);e.fillStyle=qh(e,-6,10,6,r,[[0,`#e6f7a0`],[1,`#98b84a`]]),e.fill(t.p),e.strokeStyle=`rgba(60,80,20,0.6)`,e.lineWidth=.9;for(let t=19;t<r;t+=6)Z(e,-8,t-1.5,9,t+1.5);vg(e,t.p,i,1.2),c(10,36,6,r)}),Q(e,sg(ig([8,-24],[18,-39],[38,-40]),ug(4.4,.9),12),{...o,base:`#bba97f`,light:`#e6d9b8`}),Q(e,Y([[10,-12,1],[24,-17],[35,-14,1],[28,-9],[33,-3,1],[24,-1],[14,2,1]]),s,()=>{e.strokeStyle=`#0c4a2a`,e.lineWidth=1.3,Z(e,12,-8,35,-14),Z(e,13,-3,33,-3)}),e.fillStyle=Jh(e,-26,6,26,[[0,`#fff0a0`],[.3,`#ff9a26`],[.7,`#c41e12`],[1,`#4a0808`]]),e.fill(X([2,5,-38,-2.5,-35,15,8,9]).p),$(e,-26,6,18,`#ffb040`,.75),Q(e,Y([[8,8,1],[-4,10],[-16,12],[-28,14],[-34,14.5,1],[-35.5,18.5],[-30,21.8],[-18,22.2],[-6,20],[6,16]]),a,()=>{e.fillStyle=qh(e,0,15,0,23,[[0,`rgba(230,247,160,0)`],[1,`rgba(230,247,160,0.9)`]]),e.fill(X([-38,16,10,13,10,24,-38,24]).p),e.strokeStyle=`rgba(60,80,20,0.5)`,e.lineWidth=.7;for(let t of[-26,-18,-10,-2])Z(e,t,18,t+1,23)});let l=e=>-2.5+(e+38)*7.5/39,u=e=>14.3-(e+33)*5.1/37,d=(t,n,r,i)=>Q(e,X([t-i,n,t+i,n,t+i*.15,n+r]),{base:`#fff8e8`,light:`#ffffff`,dark:`#d8ccb0`,line:`#2e2414`,lw:.9,sh:.3,hl:0});for(let[e,t]of[[-30,-5],[-24,-2.8],[-19,-2.6],[-12,-4],[-6,-2.4]])d(e,u(e)+.4,t,e===-30||e===-12?1.5:1.1);for(let[e,t]of[[-34,6.5],[-28,3],[-23,2.8],[-17,4.6],[-11,2.6],[-6,2.4]])d(e,l(e)-.4,t,e===-34||e===-17?1.6:1.1);Q(e,Y([[-41,-4,1],[-39.5,-9],[-35,-11.5],[-28,-13],[-20,-16],[-13,-20],[-4,-25],[7,-27],[16,-24],[22,-15],[23,-4],[18,5],[9,9],[1,5],[-10,2],[-22,0],[-32,-1.5],[-38,-2.5]]),{...a,sh:.12},()=>{c(-6,24,-22,6);for(let[t,n,r]of[[-32,-11,2.8],[-25.5,-13.2,3.1],[-19,-16.2,3.1]])Q(e,Zh(t,n,r,r*.7,-.4),{base:`#2dbf6e`,light:`#9ff7bf`,line:i,lw:.9,sh:.3,hl:.2});e.strokeStyle=`rgba(190,255,210,0.55)`,e.lineWidth=1.1,e.stroke(J([[-16,-5],[-6,-3],[6,-2],[16,-6]],!1)),e.fillStyle=`rgba(230,247,160,0.5)`,e.fill(X([-42,-2,2,3,2,10,-42,4]).p)}),Q(e,sg(ig([-35.5,-10.5],[-36,-16],[-31,-20.5]),ug(2.5,.9),8),{...o,lw:1.3});for(let[t,n,r,i]of[[[16,2],[24,1],[32,4],2.8],[[14,7],[21,10],[27,15],2.4],[[9,13],[13,18],[15,24],2],[[-25,21],[-26,25],[-23,28.5],1.8],[[-16,21.5],[-16,25.5],[-13,28.5],1.6]])Q(e,sg(ig(t,n,r),ug(i),8),{...o,lw:1.2});let f=ig([-4,-21],[5,-42],[29,-47]),p=ug(6,.85);Q(e,sg(f,p,14),o,()=>{e.strokeStyle=`rgba(90,70,40,0.55)`,e.lineWidth=.8;for(let t of[.14,.28,.42,.56,.7]){let n=og(f,p,1,t,t,1)[0],r=og(f,p,-1,t,t,1)[0];Z(e,n[0],n[1],r[0],r[1])}});let m=Y([[-15,-12,1],[-10,-15.4],[-4,-14.5],[-1.5,-11.5,1],[-6.5,-10],[-11.5,-10.5]]);$(e,-8,-12.5,14,`#ffb020`,.6),e.fillStyle=Jh(e,-8.5,-13,7,[[0,`#fff3a0`],[.5,`#ffb31a`],[1,`#c05a08`]]),e.fill(m.p),e.fillStyle=`#2a1200`,e.beginPath(),e.ellipse(-8.2,-12.6,.95,2.6,.12,0,K),e.fill(),vg(e,m.p,i,1.3),Cg(e,-10.4,-13.5,.9,`#ffffff`),Q(e,Y([[-20,-12.8,1],[-12,-19.8],[-2,-21.5],[4,-17,1],[-3,-16.6],[-11,-15.2]]),{base:`#27b068`,light:`#9ff7bf`,dark:`#0c5a33`,line:i,lw:1.4,sh:.25,hl:.2}),e.fillStyle=`#052014`,e.beginPath(),e.ellipse(-37.2,-7,1.9,.85,-.6,0,K),e.fill(),jg(e,[[-33,-.5],[-38,-3,1],[-44,-6.5,1],[-42,.5],[-49,2.5,1],[-43,6],[-49.5,10,1],[-42,11.5],[-45,16.5,1],[-38,13.5],[-33,13]],-34,6.5,[-49,6],[-33,6],`#6a1406`),$(e,-40,6,12,`#ffd060`,.55);for(let t=0;t<6;t++){let t=q(n,-48,-34),r=q(n,-12,22);$(e,t,r,3,`#ffb040`,.6),Cg(e,t,r,q(n,.5,1),`#fff0b0`)}Sg(e,-20,-20,1.6)}function s_(e,t,n){Ig(e,t,n,{...Bg,glowC:`#8ff4ff`,glowA:.18,glowR:40});let r=t.H+2,i=`#23211d`,a={base:`#9b958b`,light:`#d6cfc2`,dark:`#5f5a52`,line:i,sh:.08,hl:.03},o={base:`#5e9e3c`,light:`#a6dc70`,dark:`#2f5e1f`,line:`#15300c`,lw:1.3,sh:.2,hl:.12};for(let t of[-1,1]){let a=e=>e*t;Q(e,X([a(52),r,a(52),33,a(45),25,a(34),22.5,a(24),26,a(17),35,a(15),r]),{base:t<0?`#7c776e`:`#716c64`,light:`#b8b1a4`,dark:`#3e3a35`,line:i,sh:.1,hl:.04},()=>{e.fillStyle=`rgba(255,250,235,0.16)`,e.fill(X([a(52),33,a(45),25,a(34),22.5,a(24),26,a(17),35,a(26),32,a(38),30.5,a(48),34]).p),e.strokeStyle=`rgba(30,26,22,0.55)`,e.lineWidth=.9,e.stroke(J([[a(17),35],[a(26),32],[a(38),30.5],[a(48),34],[a(52),36]],!1));let t=gg(n,[a(30),31],[a(26),r],3,2.6);e.strokeStyle=`#1a1814`,e.lineWidth=1.2,hg(e,t),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(80,235,255,0.7)`,e.lineWidth=.55,hg(e,t),e.restore()}),Q(e,Y([[a(47),28.5],[a(43),24.6],[a(35),22.2],[a(28),23.8],[a(29.5),26.5],[a(33),25.6],[a(35),28.8],[a(38.5),26.4],[a(42),29.6]]),o)}for(let[t,r,a]of[[-36,-32,4],[35,-40,3.2],[39,-8,2.6]])$(e,t,r,a*3,`#46eaff`,.35),Q(e,Ng(t,r,a,a*.8,3,n,.5,.25),{base:`#8a847a`,line:i,lw:1.2,sh:.25,hl:.12});let s=[-24,-30],c=[-6,-32.5],l=[12,-32],u=[15,-6],d=[15.5,22],f=[-3,25],p=[-21,25],m=[-24.5,0],h=[-11,-38.5],g=[25,-40],_=[27.5,-14],v=[28.5,13];Q(e,X([...s,...c,...l,...g,...h]),{base:`#c9c1b3`,light:`#f0ebe0`,dark:`#8e877b`,line:i,sh:.2,hl:.08}),Q(e,X([...l,...g,..._,...v,...d,...u]),{base:`#6c665e`,light:`#8f887e`,dark:`#403c36`,line:i,sh:.12,hl:.03},()=>{e.strokeStyle=`#1a1814`,e.lineWidth=1.3;let t=gg(n,[21,-32],[23,6],3,3);hg(e,t),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(80,235,255,0.8)`,e.lineWidth=.6,hg(e,t),e.restore()}),Q(e,X([...s,...c,...l,...u,...d,...f,...p,...m]),a,()=>{e.fillStyle=`rgba(20,18,15,0.35)`,e.fill(X([-26,-9,16,-11,16,-3,-26,-1]).p);for(let t=0;t<14;t++)Cg(e,q(n,-22,13),q(n,-28,22),q(n,.3,.8),n()>.5?`rgba(255,255,255,0.18)`:`rgba(30,26,20,0.2)`);let t=gg(n,[-17,15.5],[10,13.5],2,1.2);e.strokeStyle=`#161410`,e.lineWidth=2.2,hg(e,t),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(80,235,255,0.7)`,e.lineWidth=.8,hg(e,t),e.restore();for(let[t,r]of[[[-14,-2],[-20,18]],[[-6,-30],[-2,-20]],[[6,4],[12,18]]]){let i=gg(n,t,r,3,2.6);e.strokeStyle=`#1a1814`,e.lineWidth=1.2,hg(e,i),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(80,235,255,0.75)`,e.lineWidth=.55,hg(e,i),e.restore()}}),Q(e,X([-27,-18,14,-20,18,-22.5,-23,-20.5]),{base:`#d2cbbd`,line:i,lw:1.4,sh:.2,hl:.1}),Q(e,X([14,-20,18,-22.5,19,-14.5,15,-12]),{base:`#5f5a52`,line:i,lw:1.4,sh:0,hl:0}),Q(e,X([-27,-18,14,-20,15,-12,-26,-10]),{...a,base:`#a8a296`,lw:1.6,sh:.2,hl:.1}),e.save(),Tg(e,2,`#46eaff`),e.strokeStyle=`#8ff6ff`,e.lineWidth=1,e.beginPath(),e.arc(-6,-25.5,3.2,0,K),e.moveTo(-6,-30),e.lineTo(-6,-21),e.moveTo(-9.5,-25.5),e.lineTo(-2.5,-25.5),e.stroke(),Eg(e),e.restore();for(let[t,n,r]of[[-19,-7.5,10],[-1.5,-8.5,9]]){let a=Qh(t,n,r,4.2,1.2);e.fillStyle=`#0a2a33`,e.fill(a.p),$(e,t+r/2,n+2,13,`#46eaff`,.85),e.fillStyle=`#e6fdff`,e.fill(Qh(t+1.6,n+1.2,r-3.2,1.8,.8).p),vg(e,a.p,i,1.2)}Q(e,X([-7.5,-9,-3.5,-9.5,-.5,6,-9.5,7]),{base:`#a39d91`,line:i,lw:1.4,sh:.3,hl:.14}),Q(e,Y([[-25,-29],[-20,-35],[-10,-38.5],[2,-37.5],[7,-33],[2,-30.5],[-3,-29.8],[-7,-25.5],[-10.5,-29],[-15,-24],[-18.5,-28.5],[-22,-25]]),o,()=>{for(let t=0;t<8;t++)Cg(e,q(n,-22,4),q(n,-36,-29),q(n,.4,.9),`rgba(210,255,160,0.6)`)}),Q(e,Y([[15.2,12],[19,8.4],[24,7.2],[28.4,8.6],[28.6,12.2],[26.4,11.6],[25,15.6],[23,12.4],[20.5,17.4],[18.4,13.6],[16,16]]),o),Sg(e,-19,-33,1.4,.6)}function c_(e,t,n){Ig(e,t,n,{c0:`#a870e4`,c1:`#4a2182`,c2:`#12051f`,rays:0,dots:10,dotC:`#c9a8ff`,dotA:.3,pat:`none`,glowC:`#86dcff`,glowA:.32,glowY:22,vig:.5});let r=t.H+2;e.strokeStyle=`rgba(190,210,255,0.14)`,e.lineWidth=.6;for(let r=0;r<40;r++){let r=q(n,-t.W,t.W),i=q(n,-20,t.H);Z(e,r,i,r-2.5,i+7)}Q(e,Y([[-50,r,1],[-50,44],[-34,41],[-18,43.5],[-8,42],[4,44],[20,41.5],[36,43],[50,41],[50,r,1]]),{base:`#2a1c44`,light:`#4a3a70`,line:`#0e0818`,sh:.1,hl:.05}),$(e,-8,44,26,`#8fe6ff`,.7),$(e,0,14,44,`#6fd6ff`,.55);for(let[t,r]of[[[11,6],[28,20]],[[-11,12],[-28,30]],[[6,24],[20,38]],[[-4,-6],[-22,2]]])Ag(e,gg(n,t,r,3,4),`#6fe0ff`,.9);let i=X([-7,-8,8,-8,2,6,11,6,-1,24,6,24,-8,46,-3,28,-10,28,-1,12,-11,12]);e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(120,220,255,0.4)`,e.lineWidth=6,e.stroke(i.p),e.restore(),e.fillStyle=qh(e,0,-8,0,46,[[0,`#ffffff`],[.6,`#e6fbff`],[1,`#b8f0ff`]]),e.fill(i.p),vg(e,i.p,`#2a7fe0`,1.5),e.save(),e.clip(i.p),e.strokeStyle=`rgba(120,200,255,0.5)`,e.lineWidth=2,e.stroke(pg(i.p,1.6,1.2)),e.restore(),e.save(),e.globalCompositeOperation=`lighter`;for(let t=0;t<12;t++){let r=-Math.PI+t/11*Math.PI,i=q(n,5,12);e.strokeStyle=`rgba(200,245,255,0.85)`,e.lineWidth=.8,Z(e,-8+Math.cos(r)*3,45+Math.sin(r)*2,-8+Math.cos(r)*i,45+Math.sin(r)*i*.8)}e.restore(),xg(e,-8,44.5,5,`#bff4ff`),Q(e,Y([[-50,-26],[-47,-38],[-36,-43,1],[-29,-51],[-15,-54],[-4,-49,1],[6,-56],[21,-56],[29,-48,1],[40,-51],[50,-44],[53,-32],[44,-24],[24,-26],[0,-24],[-24,-24]]),{base:`#2f2760`,light:`#5a4e94`,dark:`#18123a`,line:`#130e2a`,sh:.12,hl:.05}),Q(e,Y([[-44,-8],[-41,-18],[-33,-23],[-29,-33,1],[-18,-40],[-8,-37,1],[-2,-46],[10,-48],[20,-42,1],[27,-37],[35,-36],[42,-28],[44,-18],[40,-8],[31,-3.5],[22,-6,1],[12,-2],[0,-4.5,1],[-10,-1],[-22,-5,1],[-33,-2]]),{base:`#4b4080`,light:`#9a8cd6`,dark:`#211a45`,line:`#130e2a`,sh:.2,hl:.08},()=>{$(e,2,-4,22,`#9fe8ff`,.6),e.strokeStyle=`rgba(20,14,44,0.45)`,e.lineWidth=1,e.stroke(J([[-30,-22],[-24,-18],[-16,-20]],!1)),e.stroke(J([[-6,-34],[2,-30],[12,-32]],!1)),e.stroke(J([[22,-30],[30,-26],[38,-28]],!1))});for(let[t,r]of[[-30,-2],[28,-3],[16,12]])Ag(e,gg(n,[t,r],[t+q(n,-6,6),r+q(n,4,8)],2,2),`#6fe0ff`,.6)}function l_(e,t,n){Ig(e,t,n,{...Bg,glowC:`#86e4ff`,glowA:.28,glowX:-22,glowY:22,glowR:36});let r=`#26306e`;for(let t=0;t<7;t++)yg(e,q(n,-40,40),q(n,-46,44),q(n,2,4),`#e8f8ff`,.5);let i=Y([[-4,-40],[11,-36],[19.5,-25],[21,-11],[18,2],[18.5,12],[23,21],[31,28],[38,29],[42,24,1],[40.5,34],[32,40],[20,40.5],[8,36],[-4,29],[-13,19],[-20.5,7],[-25,-6],[-24.5,-21],[-16.5,-34]]);e.save(),e.globalAlpha*=.94,Q(e,i,{base:`#cdeefa`,light:`#ffffff`,dark:`#7fb2da`,line:r,radial:!0,sh:.12,hl:.05},()=>{$(e,-31,24,34,`#5fd0ff`,.5),yg(e,30,34,14,`#9ab8f0`,.35)}),e.restore(),Q(e,Y([[-15,-5],[-23,-3.5],[-30,2.5],[-32.8,7.6],[-30.4,10.4],[-26,7.2],[-18.5,4.6]]),{base:`#d6f2fc`,light:`#ffffff`,dark:`#8fc0e2`,line:r,lw:1.6,sh:.2,hl:.1});for(let[t,n]of[[-11,.08],[3.5,-.08]])e.fillStyle=Jh(e,t,-15,6,[[0,`#2c3478`],[1,`#10143a`]]),e.beginPath(),e.ellipse(t,-15,3.6,5.4,n,0,K),e.fill(),Cg(e,t-1.2,-17.2,1.35,`#ffffff`),Cg(e,t+1,-12.8,.6,`rgba(255,255,255,0.85)`);e.fillStyle=`#1a2058`,e.beginPath(),e.ellipse(-3.6,-4.5,2.3,3,0,0,K),e.fill();for(let t of[-17,9])e.fillStyle=`rgba(120,170,255,0.35)`,e.beginPath(),e.ellipse(t,-7.5,3,1.6,0,0,K),e.fill();Sg(e,-12,-31,2.4),e.strokeStyle=`#1e2140`,e.lineWidth=1.1,e.beginPath(),e.arc(-31,12.5,3.2,Math.PI,K),e.stroke(),$(e,-31,24,36,`#5fd0ff`,.7);let a={base:`#3a3e62`,light:`#7a80aa`,dark:`#191b30`,line:`#0c0d1a`,lw:1.3,sh:.25,hl:.15};Q(e,Y([[-37.5,17.5,1],[-24.5,17.5,1],[-27,13.5],[-31,12],[-35,13.5]]),a);let o=X([-36.8,17.5,-25.2,17.5,-26,31,-36,31]);e.fillStyle=qh(e,-31,17,-31,31,[[0,`#b8f4ff`],[1,`#3fb0ff`]]),e.fill(o.p),jg(e,[[-33.6,28],[-33.4,24],[-31,19.5,1],[-28.6,24],[-28.4,28],[-31,29.5]],-31,28,[-31,19.5],[-31,29.5],`#1a6ab0`,[[1,`#7fe0ff`],[1,`#e8fcff`],[.55,`#ffffff`],[.55,`#ffffff`]]),e.strokeStyle=`#191b30`,e.lineWidth=1.3,Z(e,-31,17.5,-31,31),vg(e,o.p,`#0c0d1a`,1.4),Q(e,Qh(-38,30.5,14,3.6,1.2),a),$(e,-31,24,12,`#d8f8ff`,.6),xg(e,-41,18,1.8,`#bff4ff`),xg(e,-22,34,1.4,`#bff4ff`)}function u_(e,t,n,r,i,a,o,s){e.save(),e.translate(t,n),e.rotate(r);let c=-(i-a*1.7),l=-a*.3,u=a*.42,d=[a*.06,-i],f=[[[-a,4,l,5,l,c-a*.35,-a,c],.42],[[l,5,u,5,u,c-a*.3,l,c-a*.35],0],[[u,5,a,4,a,c,u,c-a*.3],-.35],[[-a,c,l,c-a*.35,d[0],d[1]],.6],[[l,c-a*.35,u,c-a*.3,d[0],d[1]],.25],[[u,c-a*.3,a,c,d[0],d[1]],-.15]];for(let[t,n]of f){let r=X(t);e.fillStyle=n>=0?Wh(o,n):Gh(o,-n),e.fill(r.p),e.strokeStyle=e.fillStyle,e.lineWidth=.3,e.stroke(r.p)}e.fillStyle=`rgba(255,255,255,0.45)`,e.fill(X([l+a*.25,2,l+a*.45,2,l+a*.4,c-a*.2,l+a*.22,c-a*.2]).p),e.strokeStyle=`rgba(255,255,255,0.55)`,e.lineWidth=.6,hg(e,[[l,5],[l,c-a*.35],d]),e.strokeStyle=Hh(Gh(o,.6),.5),hg(e,[[u,5],[u,c-a*.3],d]),vg(e,X([-a,4,-a,c,d[0],d[1],a,c,a,4]).p,s,1.7),e.restore()}function d_(e,t,n){Ig(e,t,n,{...Bg,c0:`#f08cd8`,c1:`#7a2ab0`,c2:`#1a0632`,glowC:`#ffd0ff`,glowA:.3,glowY:0}),bg(e,0,44,36,5,.55);let r=`#2a0d4d`;$(e,0,0,40,`#e070ff`,.45);for(let[t,n,i,a,o,s]of[[-22,36,-48,26,6,`#9a5cff`],[24,36,50,24,6,`#ff66d0`],[-12,33,-26,46,8.5,`#ff66d0`],[13,33,24,52,9,`#7a6cff`],[0,31,-4,72,11,`#a066ff`]])u_(e,t,n,i*Nh,a,o,s,r);Q(e,Y([[-36,44],[-34,36],[-24,31],[-12,32],[0,29.5],[12,31.5],[24,30.5],[34,35],[37,43],[24,47],[0,48],[-22,47]]),{base:`#4a3a5e`,light:`#7a6a90`,dark:`#231a30`,line:`#140c1e`,sh:.2,hl:.08},()=>{e.strokeStyle=`rgba(20,12,30,0.5)`,e.lineWidth=.8,Z(e,-20,38,-12,44),Z(e,10,36,18,42)}),u_(e,5,41,14*Nh,17,5,`#ff8ae0`,r),u_(e,-26,42,-30*Nh,13,4,`#b48aff`,r);for(let[t,n,r]of[[-3,-40,3.2],[-20,-8,2.4],[22,-10,2.6],[30,20,1.8],[-32,18,1.6],[10,-24,1.6]])xg(e,t,n,r,`#ffd6ff`)}function f_(e,t,n){Ig(e,t,n,{c0:`#ffd27a`,c1:`#b8262c`,c2:`#26050e`,rays:18,rayC:`#ffe7a0`,rayA:.2,dots:20,dotC:`#ffb050`,dotA:.45,vig:.5,glowC:`#fff0b0`,glowA:.35,glowR:32,glowY:-6});let r=`#560a0c`;e.save(),e.translate(0,2),$(e,0,-10,56,`#ff7a1a`,.42);let i=(t,n,i,a)=>{let o=ig(t,n,i);Q(e,sg(o,lg(a),14),{base:`#ff7a1c`,fill:qh(e,t[0],t[1],i[0],i[1],[[0,`#ffe27a`],[.45,`#ff8a22`],[1,`#c41e20`]]),line:r,lw:1.5,sh:.22,hl:.12,shade:`rgba(120,10,10,0.35)`},()=>{e.strokeStyle=`rgba(255,240,170,0.65)`,e.lineWidth=a*.3,e.stroke(J(og(o,()=>0,0,.08,.7,8),!1))})};for(let[e,t,n]of[[[-12,32],[-27,42],5],[[12,32],[27,42],5],[[-8,36],[-15,51],6],[[8,36],[15,51],6],[[0,36],[0,53],7]])i([0,12],e,t,n);let a=[[-5,-14],[-12,-27],[-22,-39],[-32,-45],[-40,-47,1],[-35,-38],[-47,-35,1],[-37,-27],[-50,-21,1],[-38,-15],[-47,-5,1],[-34,-4],[-39,8,1],[-25,3],[-27,15,1],[-15,5],[-6,3]],o=[[-40,-47],[-47,-35],[-50,-21],[-47,-5],[-39,8],[-27,15]],s=[[-5,-15],[-11,-24],[-19,-30,1],[-18,-23],[-27,-22,1],[-21,-15],[-28,-10,1],[-20,-6],[-23,1,1],[-13,-1],[-6,1]];for(let t of[-1,1]){let n=-t*.86,i=e=>e.map(e=>e.length===3?[e[0]*n,e[1],1]:[e[0]*n,e[1]]),c=-6*n;Q(e,Y(i(a)),{base:`#ff7a1c`,fill:Jh(e,c,-8,48,[[0,`#fff4b0`],[.22,`#ffc93a`],[.5,`#ff7a1c`],[.8,`#e0301e`],[1,`#9a1020`]]),line:r,sh:.1,hl:.04,shade:`rgba(110,8,12,0.35)`},()=>{e.strokeStyle=`rgba(255,236,160,0.6)`,e.lineWidth=1.1;for(let t of o){let r=t[0]*n;e.stroke(J([[c,-8],[(c+r)/2,(t[1]-8)/2-3],[c+(r-c)*.82,-8+(t[1]+8)*.82]],!1))}}),Q(e,Y(i(s)),{base:`#ffb02e`,fill:Jh(e,c,-8,26,[[0,`#fff8c8`],[.5,`#ffd04a`],[1,`#ff8a22`]]),line:r,lw:1.4,sh:.18,hl:.08,shade:`rgba(150,40,10,0.3)`})}Q(e,Y([[0,-22],[8.5,-14],[10.5,-2],[7,10],[0,20,1],[-7,10],[-10.5,-2],[-8.5,-14]]),{base:`#ff9a26`,fill:Jh(e,-2,-6,26,[[0,`#fff4b0`],[.45,`#ffb02e`],[1,`#e0501e`]]),line:r,sh:.18,hl:.08},()=>{e.strokeStyle=`rgba(255,236,150,0.75)`,e.lineWidth=.8;for(let t=-12;t<16;t+=4.5)for(let n=-6+(t%9?2:0);n<8;n+=4)e.beginPath(),e.arc(n,t,2,.1*Math.PI,.9*Math.PI),e.stroke()});for(let[e,t,n]of[[[6,-40],[15,-46],3.2],[[9,-35],[20,-38],2.8],[[1,-40],[3,-50],2.8]])i([1,-29],e,t,n);Q(e,Xh(0,-25,7.5),{base:`#ff9a26`,light:`#ffe890`,dark:`#c2461a`,line:r,radial:!0,sh:.2,hl:.08}),Q(e,Y([[-6,-27.5,1],[-13,-26],[-16,-22,1],[-11.5,-22.8],[-6,-22]]),{base:`#ffd34a`,light:`#fff4b0`,dark:`#b8740e`,line:r,lw:1.3,sh:.25,hl:.15});let c=Y([[-5.5,-26.8,1],[-2.5,-28.4],[.8,-27.2,1],[-2.5,-25.4]]);$(e,-2.3,-26.8,5,`#fff2a0`,.6),e.fillStyle=`#fff8d8`,e.fill(c.p),vg(e,c.p,r,.9),Cg(e,-2.6,-26.8,.95,`#4a0a0e`),e.strokeStyle=r,e.lineWidth=1.1,Z(e,-6.2,-29.4,.6,-28.8),$(e,0,-3,24,`#ffe890`,.9);let l=Y([[0,3.2,1],[-4,-1.2],[-3.8,-4.4],[-1.6,-5.4],[0,-3.8,1],[1.6,-5.4],[3.8,-4.4],[4,-1.2]]);e.fillStyle=Jh(e,-.5,-2.5,5,[[0,`#ffffff`],[.6,`#fff3a8`],[1,`#ffb02e`]]),e.fill(l.p),vg(e,l.p,`#c2461a`,.9),xg(e,0,-3,4.2,`#fff6c8`),e.restore();for(let t=0;t<16;t++){let t=q(n,-42,42),r=q(n,-50,48),i=q(n,.5,1.4);$(e,t,r,i*4,`#ff9a3a`,.45),Cg(e,t,r,i,`#ffe7a0`)}}function p_(e,t,n){Ig(e,t,n,{c0:`#c4f3ff`,c1:`#2c7cc2`,c2:`#071a3a`,rays:14,rayC:`#e8fbff`,rayA:.14,vig:.5,glowC:`#ffffff`,glowA:.3,glowR:30,glowY:4}),e.save(),e.globalCompositeOperation=`lighter`;for(let[t,n,r]of[[-44,`#5ff5c0`,.17],[-36,`#8a7cff`,.13]]){let i=new Path2D;i.moveTo(-60,t),i.bezierCurveTo(-20,t-12,10,t+10,60,t-6),i.lineTo(60,t+4),i.bezierCurveTo(10,t+18,-20,t-2,-60,t+8),i.closePath(),e.fillStyle=qh(e,0,t-10,0,t+14,[[0,Hh(n,0)],[.5,Hh(n,r)],[1,Hh(n,0)]]),e.fill(i)}e.restore();let r=`#0f3a66`,i={base:`#a8e8ff`,light:`#f4feff`,dark:`#3f8fd0`,line:r,sh:.2,hl:.1},a=e=>6+6*(1-(e/32)**2),o=e=>6-5*(1-(e/32)**2);e.save(),e.translate(0,5),e.scale(1.12,1.12);let s=[];for(let e=0;e<=10;e++){let t=-32+6.4*e;s.push(e===0||e===10?[t,o(t),1]:[t,o(t)])}for(let e=10;e>=0;e--){let t=-32+6.4*e;s.push([t,a(t)+2])}Q(e,Y(s),{base:`#2f78b8`,light:`#6fb6ea`,dark:`#123e6e`,line:r,sh:.1,hl:0});for(let[t,n]of[[-19,17],[-6.5,23],[6.5,23],[19,17]]){let i=o(t)+1;Q(e,X([t-3.6,i,t+3.6,i,t+.4,i-n]),{base:`#5fa8e0`,light:`#bfe6ff`,dark:`#2a5e9a`,line:r,lw:1.3,sh:.25,hl:.12})}let c=(t,n,r,o)=>{let s=a(t)+1.5,c=[t+o,s-n],l=[t-r*.55+o*.4,s-n*.45];Q(e,X([t-r,s,l[0],l[1],c[0],c[1],t+r*.9+o*.3,s-n*.38,t+r,s]),i,()=>{e.fillStyle=`rgba(30,90,170,0.3)`,e.fill(X([t+o*.2,s,c[0],c[1],t+r*.9+o*.3,s-n*.38,t+r,s]).p),e.strokeStyle=`rgba(255,255,255,0.7)`,e.lineWidth=.7,Z(e,t+o*.2,s,c[0],c[1])})};c(-25,22,5,-4),c(25,22,5,4),c(-13.5,34,6,-2.5),c(13.5,34,6,2.5),c(0,50,7,0),Q(e,rg(-32,32,a,12,12),{...i,sh:.25,hl:.12},()=>{for(let t=0;t<20;t++)Cg(e,q(n,-30,30),q(n,8,26),q(n,.3,.7),`rgba(255,255,255,0.7)`);e.strokeStyle=`rgba(255,255,255,0.6)`,e.lineWidth=.8,e.stroke(J([-30,-20,-10,0,10,20,30].map(e=>[e,a(e)+2]),!1))});for(let t of[-26,-14,14,26])Q(e,Xh(t,a(t)+6.5,2.4),{base:`#5fd8ff`,light:`#e8fcff`,dark:`#1a6ab0`,line:r,lw:1,radial:!0,sh:.2,hl:0}),Cg(e,t-.8,a(t)+5.6,.6,`#ffffff`);for(let t of[-28,-21,-9,-3,5,17,23,29]){let n=a(t)+12,r=2.5+(t*7%5+5)%5;Q(e,X([t-1.3,n-.5,t+1.3,n-.5,t,n+r]),{...i,lw:1,sh:0,hl:0})}let l=a(0)+6;$(e,0,l,22,`#7fe4ff`,.7),Q(e,Xh(0,l,10.8),{base:`#e8f2fa`,light:`#ffffff`,dark:`#8aa6c0`,line:r,lw:1.6,radial:!0,sh:.15,hl:.08});let u=tg(0,l,9,9,3,-Math.PI/2);Og(e,0,l,u,`#c8f6ff`,`#1f7fd0`),vg(e,X(u.flat()).p,r,1.2),e.save(),Tg(e,1.5,`#bff4ff`),e.strokeStyle=`#ffffff`,e.lineWidth=.9;for(let t=0;t<6;t++){let n=t/6*K-Math.PI/2,r=Math.cos(n),i=Math.sin(n);Z(e,0,l,r*6.6,l+i*6.6);for(let t of[3,4.8]){let a=r*t,o=l+i*t,s=1.6;Z(e,a,o,a+Math.cos(n+.8)*s,o+Math.sin(n+.8)*s),Z(e,a,o,a+Math.cos(n-.8)*s,o+Math.sin(n-.8)*s)}}Eg(e),e.restore(),e.restore();for(let t=0;t<9;t++)yg(e,q(n,-40,40),q(n,30,46),q(n,8,14),`#ffffff`,.28,.5);for(let r=0;r<22;r++)Cg(e,q(n,-t.W,t.W),q(n,-t.H,t.H),q(n,.3,.9),`rgba(255,255,255,0.8)`);xg(e,0,-38,3,`#e8fbff`),xg(e,-26,-14,2,`#e8fbff`),xg(e,27,-12,2,`#e8fbff`)}function m_(e,t,n){Ig(e,t,n,{c0:`#b36cff`,c1:`#3c1270`,c2:`#07020e`,rays:12,rayC:`#e6c4ff`,rayA:.12,vig:.55,glowC:`#d9a6ff`,glowA:.35,glowR:34}),e.strokeStyle=`rgba(225,180,255,0.3)`,e.lineWidth=.8;for(let t of[27,31])e.beginPath(),e.arc(0,2,t,0,K),e.stroke();for(let t=0;t<36;t++){let n=t/36*K,r=t%3==0?24.5:27;Z(e,Math.cos(n)*r,2+Math.sin(n)*r,Math.cos(n)*31,2+Math.sin(n)*31)}for(let t=0;t<7;t++)yg(e,q(n,-38,38),q(n,40,56),q(n,12,18),`#05010a`,.75,.55);let r=(t,n,r,i,a,o,s)=>{let c=ag(t,n,r,i),l=e=>a*Math.sin(Math.PI*e)**.8*(1-.35*e),u=sg(c,l,18);e.fillStyle=qh(e,t[0],t[1],i[0],i[1],[[0,`rgba(6,1,12,${o})`],[.6,`rgba(22,6,40,${o*.85})`],[1,`rgba(60,20,100,${o*.4})`]]),e.fill(u.p),e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(180,110,255,${.8*o})`,e.lineWidth=.9,cg(e,c,l,s*.75,.4,.92),e.strokeStyle=`rgba(120,60,220,${.3*o})`,e.lineWidth=2.4,cg(e,c,l,s*.55,.45,.85),e.restore()};r([-30,56],[-36,26],[2,30],[24,2],6.5,.85,1),r([28,56],[36,24],[-4,16],[-22,-12],5,.8,-1);let i=10*Nh;e.save(),e.translate(0,-18),e.rotate(i),$(e,0,28,34,`#b066ff`,.4);let a=[[-7,3,1],[7,3,1],[7.4,22],[7.6,40],[5.2,54],[0,64,1],[-5.2,54],[-7.6,40],[-7.4,22]],o=Y(a);Q(e,o,{base:`#2a1840`,light:`#6d4b96`,dark:`#0c0616`,line:`#06020b`,rot:i,sh:.2,hl:.12},()=>{e.strokeStyle=`rgba(150,95,225,0.55)`,e.lineWidth=4.4,e.stroke(o.p),e.fillStyle=`rgba(255,255,255,0.1)`,e.fill(X([-9,26,9,14,9,19,-9,31]).p),e.fillStyle=`#07030d`,e.fill(Qh(-1.4,6,2.8,37,1.4).p)}),e.save(),e.globalCompositeOperation=`lighter`,Tg(e,2.2,`#c77dff`),e.strokeStyle=`rgba(214,160,255,0.95)`,e.lineWidth=.9,e.stroke(J(dg(a,0,3,1).map(e=>e.length===3?[e[0]*.8,e[1]-(e[1]>60?3:0),1]:[e[0]*.8,e[1]]))),Z(e,0,8,0,41),Eg(e),e.restore();let s={base:`#3a2a52`,light:`#9a7ac6`,dark:`#140c20`,line:`#06020b`,rot:i,sh:.25,hl:.15};Q(e,Y([[-4,-3],[-10,-4.5],[-17,-8],[-22,-14],[-23.5,-19.5,1],[-20.5,-13.5],[-15,-4.5],[-9,1.5],[-4,4.2],[4,4.2],[9,1.5],[15,-4.5],[20.5,-13.5],[23.5,-19.5,1],[22,-14],[17,-8],[10,-4.5],[4,-3]]),s,()=>{e.strokeStyle=`rgba(200,140,255,0.65)`,e.lineWidth=.7,e.stroke(J([[-21,-14],[-14,-4],[-6,.8],[6,.8],[14,-4],[21,-14]],!1))}),$(e,0,.5,9,`#c77dff`,.7),Q(e,X([0,-3.4,3.6,.6,0,4.6,-3.6,.6]),{base:`#b066ff`,light:`#f4e0ff`,dark:`#5a1a9a`,line:`#06020b`,lw:1.1,sh:.2,hl:0}),Q(e,Qh(-2.9,-23,5.8,20,2.2),{base:`#2a1a2e`,light:`#5e3e66`,dark:`#0e0710`,line:`#06020b`,rot:i,sh:.25,hl:.15},()=>{e.strokeStyle=`rgba(190,120,255,0.8)`,e.lineWidth=.7;for(let t=-22;t<-3;t+=3.3)Z(e,-2.9,t,2.9,t+2.4),Z(e,2.9,t,-2.9,t+2.4)}),Q(e,X([-1.6,-31,0,-35,1.6,-31]),{...s,lw:1.1}),$(e,0,-27,11,`#c77dff`,.75),Q(e,Xh(0,-27,4.8),s);let c=tg(0,-27,3.2,3.2,4,-Math.PI/8);Og(e,0,-27,c,`#f4e0ff`,`#5a1aa0`),vg(e,X(c.flat()).p,`#06020b`,.9),Cg(e,-1,-28.2,.8,`#ffffff`),e.restore(),r([-8,58],[-24,42],[4,40],[20,20],4.4,.8,1);for(let t=0;t<14;t++){let t=q(n,-40,40),r=q(n,-48,46),i=q(n,.4,1.2);$(e,t,r,i*4,`#c77dff`,.5),Cg(e,t,r,i,`#f0d6ff`)}xg(e,5,-46,2.6,`#ecd0ff`),xg(e,-24,-30,1.8,`#ecd0ff`)}function h_(e,t,n){Ig(e,t,n,{c0:`#e2f6ff`,c1:`#5aa6e0`,c2:`#123262`,rays:16,rayC:`#ffe89a`,rayA:.22,vig:.45,glowC:`#fff4c8`,glowA:.32,cx:6});let r=`#3a3126`,i=`#4a2a05`;for(let[t,r,i]of[[-36,44,1],[34,48,1.1]])Q(e,Ng(t,r,15*i,6.5*i,6,n,0,.18),{base:`#f2f8ff`,light:`#ffffff`,dark:`#a8c2de`,line:`#5a7aa0`,lw:1.3,sh:.2,hl:.08});for(let[t,n,i]of[[[26,-22],[36,-42],6.5],[[30,-12],[44,-28],6.5],[[31,-2],[46,-13],6],[[29,8],[44,3],5.5]]){let a=[16,10],o=ig(a,t,n);Q(e,sg(o,lg(i),12),{base:`#efe6d2`,fill:qh(e,a[0],a[1],n[0],n[1],[[0,`#ffffff`],[.55,`#f1e6cc`],[1,`#d9a23a`]]),line:r,lw:1.5,sh:.25,hl:.12,shade:`rgba(90,70,40,0.3)`},()=>{e.strokeStyle=`rgba(120,100,70,0.5)`,e.lineWidth=.7,e.stroke(J(og(o,()=>0,0,.15,.9,8),!1))})}let a=(t,n,r,a)=>{let o=ig([6+Math.cos(t)*6,-2+Math.sin(t)*6],[6+Math.cos(t+.1)*n*.58,-2+Math.sin(t+.1)*n*.58],[6+Math.cos(t+.3)*n,-2+Math.sin(t+.3)*n]);Q(e,sg(o,lg(r),12),{base:a,light:Wh(a,.5),dark:Gh(a,.3),line:i,lw:1.5,sh:.26,hl:.14},()=>{e.strokeStyle=Hh(Gh(a,.45),.45),e.lineWidth=.7,cg(e,o,lg(r),-.25,.25,.85)})};for(let e=0;e<12;e++){let t=-118*Nh+(e+.5)/12*238*Nh,r=Math.max(0,Math.sin(t));a(t,q(n,30,34)+r*16,8,`#d0801a`)}for(let e=0;e<12;e++){let t=-112*Nh+e/11*226*Nh,r=Math.max(0,Math.sin(t));a(t,q(n,23,26)+r*14,7,`#f6c23a`)}for(let[t,n,i]of[[[14,-22],[22,-27],[29,-26]],[[19,-12],[27,-13],[33,-9]],[[19,1],[26,3],[31,8]],[[14,11],[19,16],[21,22]]])Q(e,sg(ig(t,n,i),ug(3.4),8),{base:`#f2eee6`,light:`#ffffff`,dark:`#b8b0a2`,line:r,lw:1.4,sh:.25,hl:.12});Q(e,Y([[-18,-12,1],[-12,-20],[-4,-26],[6,-28],[16,-24],[22,-14],[23,-2],[19,10],[10,18],[-2,20],[-12,14],[-16,6,1],[-17,-4]]),{base:`#f2eee6`,light:`#ffffff`,dark:`#b8b0a2`,line:r,sh:.14,hl:.06},()=>{e.strokeStyle=`rgba(120,110,95,0.45)`,e.lineWidth=.8;for(let[t,n]of[[4,4],[10,8],[2,12],[14,-2],[8,14],[16,5],[-4,14]])e.beginPath(),e.moveTo(t-2.4,n-1.8),e.lineTo(t,n),e.lineTo(t+2.4,n-1.8),e.stroke();e.fillStyle=`rgba(90,80,70,0.25)`,e.fill(Y([[-3,-9],[6,-9],[15,-5],[8,-4.5],[0,-6]]).p)});let o={base:`#ffc23a`,light:`#fff0a0`,dark:`#b8740e`,line:i,sh:.2,hl:.1};Q(e,Y([[-17,3,1],[-24,2],[-30,2.5],[-32,5.5,1],[-26,8.5],[-18,8.5,1]]),{...o,base:`#e8a42a`}),Q(e,Y([[-17,-13,1],[-24,-14],[-32,-11],[-37,-5],[-38.5,2],[-36,8.5,1],[-34,3],[-30,.5],[-24,1.5],[-17,3,1]]),o,()=>{e.fillStyle=qh(e,-30,0,-38,8,[[0,`rgba(90,50,10,0)`],[1,`rgba(90,50,10,0.7)`]]),e.fillRect(-40,-6,12,16),e.fillStyle=`#4a2a05`,e.beginPath(),e.ellipse(-22,-9,1.6,.8,-.3,0,K),e.fill(),e.strokeStyle=`rgba(255,250,210,0.7)`,e.lineWidth=.9,e.stroke(J([[-20,-11.5],[-27,-11.5],[-33,-7.5]],!1))});let s=Y([[-11,-10,1],[-7,-13],[-2,-12.5],[1,-10,1],[-3,-7.8],[-8,-8.2]]);$(e,-5,-10.5,8,`#ffb020`,.35),e.fillStyle=Jh(e,-5,-10.5,6,[[0,`#ffe07a`],[.6,`#ffae1a`],[1,`#d0600c`]]),e.fill(s.p),Cg(e,-4.8,-10.4,1.8,`#1a0e04`),Cg(e,-5.7,-11.4,.65,`#ffffff`),vg(e,s.p,r,1.3),Q(e,Y([[-15,-11.5,1],[-6,-18],[4,-17.5],[6.5,-13.5,1],[0,-13.4],[-7,-12.6]]),{base:`#e6e0d4`,light:`#ffffff`,dark:`#8f8676`,line:r,lw:1.5,sh:.3,hl:.15}),Sg(e,-2,-23,1.8),xg(e,-32,-32,2.4,`#fff4c8`),xg(e,-36,22,1.8,`#fff4c8`)}function g_(e,t,n){Ig(e,t,n,{c0:`#fff3c0`,c1:`#ffa23a`,c2:`#6e2406`,rays:24,rayC:`#fff6d0`,rayA:.2,dots:16,dotC:`#fff0b0`,dotA:.4,vig:.45});let r=t.H+2,i=`#4a2604`,a={base:`#f0b43a`,light:`#fff0a8`,dark:`#a45e0e`,line:i,sh:.14,hl:.06};Lg(e,0,-6,39,`#fff0b0`,.55);let o=(t,n,r)=>{let i=Math.cos(t),a=Math.sin(t),o=[i*n,-6+a*n],s=[i*14,-6+a*14],c=[s[0]-a*r,s[1]+i*r],l=[s[0]+a*r,s[1]-i*r],u=.5+.5*(-a*Fh+i*Ih);e.fillStyle=Uh(`#d4801a`,`#fff4b8`,u),e.fill(X([...c,...o,...s]).p),e.fillStyle=Uh(`#d4801a`,`#fff4b8`,1-u),e.fill(X([...s,...o,...l]).p),vg(e,X([...c,...o,...l]).p,`#6a3606`,1.5)},s=Math.PI*.94,c=Math.PI*2.06;for(let e=1;e<16;e+=2)o(s+(c-s)*e/16,33,4.2);for(let e=0;e<=16;e+=2)o(s+(c-s)*e/16,e===8?44:41,5.4);Q(e,Xh(0,-6,22),{base:`#ffc848`,light:`#fff6c8`,dark:`#d97a14`,line:`#6a3606`,radial:!0,sh:.08,hl:.04});for(let t of[-1,1])Q(e,Y([[t*12,r,1],[t*14,36],[t*22,29.5],[t*34,28.5],[t*43,34],[t*46,44],[t*46,r,1]]),a,()=>{e.strokeStyle=`rgba(120,60,5,0.55)`,e.lineWidth=1,e.stroke(J([[t*15,44],[t*26,36.5],[t*38,37],[t*46,44]],!1)),e.stroke(J([[t*15,51],[t*27,43.5],[t*39,44],[t*47,51]],!1)),e.strokeStyle=`rgba(255,245,200,0.6)`,e.lineWidth=.8,e.stroke(J([[t*15,45.2],[t*26,37.7],[t*38,38.2],[t*46,45.2]],!1))}),wg(e,t*30,32.8,1.4,`#ffe08a`,i),wg(e,t*40,36.5,1.2,`#ffe08a`,i);Q(e,Y([[-16,r,1],[-17,36],[-10,30.5],[0,29.5],[10,30.5],[17,36],[16,r,1]]),{...a,base:`#e2a232`},()=>{e.strokeStyle=`rgba(120,60,5,0.6)`,e.lineWidth=.9;for(let t of[39,45,51])e.stroke(J([[-17,t+2],[0,t-1.5],[17,t+2]],!1))});let l=Y([[0,-34],[14,-31],[23,-21],[26,-6],[25,8],[22,20],[16,30],[8,36,1],[0,34],[-8,36,1],[-16,30],[-22,20],[-25,8],[-26,-6],[-23,-21],[-14,-31]]);Q(e,l,a,()=>{e.fillStyle=qh(e,-24,0,-12,0,[[0,`rgba(255,255,255,0)`],[.5,`rgba(255,252,225,0.45)`],[1,`rgba(255,255,255,0)`]]),e.fill(J([[-19,-24],[-13,-28],[-11,6],[-14,26],[-20,18],[-21,-4]])),e.strokeStyle=`rgba(255,255,255,0.75)`,e.lineWidth=1.2,Z(e,-1,-33.5,-1,-20),e.strokeStyle=`rgba(110,55,5,0.5)`,Z(e,1,-33.5,1,-20);for(let t of[-1,1]){let n=t*15.5;e.strokeStyle=`rgba(110,55,5,0.6)`,e.lineWidth=.8,e.beginPath(),e.arc(n,18,3.2,0,K),e.stroke();for(let t=0;t<8;t++){let r=t/8*K;Z(e,n+Math.cos(r)*4.4,18+Math.sin(r)*4.4,n+Math.cos(r)*6.2,18+Math.sin(r)*6.2)}e.strokeStyle=`rgba(255,245,200,0.6)`,e.beginPath(),e.arc(n-.5,17.5,3.2,Math.PI,1.5*Math.PI),e.stroke()}});let u=e=>-15+2.4*(1-(e/26)**2);e.save(),e.clip(l.p),Q(e,rg(-27,27,u,6),{...a,base:`#e0a02e`,lw:1.3,sh:.3,hl:.14},()=>{for(let t=-24;t<=24;t+=6){if(Math.abs(t)<4)continue;let n=u(t)+3,r=X([t,n-1.8,t+1.5,n,t,n+1.8,t-1.5,n]);e.fillStyle=`#fff0b0`,e.fill(r.p),vg(e,r.p,`rgba(110,55,5,0.75)`,.5)}}),e.restore();let d=Y([[-19,-5,1],[-8,-2.5],[-3.5,-2.6,1],[-4.6,26,1],[0,29],[4.6,26,1],[3.5,-2.6,1],[8,-2.5],[19,-5,1],[18,.5,1],[8,3],[4.2,3.4,1],[-4.2,3.4,1],[-8,3],[-18,.5,1]]);vg(e,d.p,`#ffe08a`,3.2),e.fillStyle=qh(e,0,-5,0,29,[[0,`#0b0502`],[1,`#241006`]]),e.fill(d.p),e.save(),e.clip(d.p),$(e,0,0,16,`#ff9a2a`,.22),e.strokeStyle=`rgba(255,190,90,0.35)`,e.lineWidth=.8,e.stroke(pg(d.p,-1,-1)),e.restore(),vg(e,d.p,i,1.4),vg(e,l.p,i);for(let[t,n]of[[-22,10],[22,10],[-18,24],[18,24],[-20,-20],[20,-20]])wg(e,t,n,1.3,`#ffe08a`,i);$(e,0,-17,16,`#ff3a50`,.55),Q(e,Zh(0,-17.5,6.6,7.6),{...a,lw:1.5,sh:.2,hl:.1});let f=tg(0,-17.5,5,5,3,-Math.PI/2);Og(e,0,-17.5,f,`#ff8a9a`,`#7a0718`),vg(e,X(f.flat()).p,`#3a0208`,1.1),Sg(e,-1.8,-19.5,1.3),Sg(e,-15,-26,2);for(let[t,n,r]of[[-36,-38,2.6],[36,-34,2.2],[-30,22,1.8],[32,20,2]])xg(e,t,n,r,`#fff6d0`)}function __(e,t,n){Ig(e,t,n,{c0:`#a9e8ff`,c1:`#2d5f9e`,c2:`#081228`,rays:16,rayC:`#c8f6ff`,rayA:.15,vig:.5,glowC:`#dff8ff`,glowA:.3});let r=t.H+2,i=`#152238`;for(let[t,n,r]of[[-40,-46,18],[40,-48,20],[-44,30,16],[44,34,18]])yg(e,t,n,r,`#0a1530`,.7);Lg(e,0,-4,37,`#bff4ff`,.5);for(let[t,r]of[[[-44,-40],[-14,-28]],[[44,-36],[16,-26]],[[-42,6],[-20,-2]]])Ag(e,gg(n,t,r,4,5),`#5ff4ff`,.9);let a={base:`#e3ecf6`,light:`#ffffff`,dark:`#8aa2bf`,line:i,lw:1.5,sh:.25,hl:.12};for(let t of[-1,1]){let n=e=>[e[0]*t,e[1]];for(let[t,r,i]of[[[-26,-42],[-40,-46],5.5],[[-30,-30],[-45,-32],5.5],[[-32,-18],[-46,-18],5],[[-30,-6],[-42,-5],4.6]])Q(e,sg(ig(n([-17,-10]),n(t),n(r)),lg(i),12),{...a,base:`#b9cde3`});for(let[t,r,i]of[[[-22,-26],[-32,-30],4.6],[[-24,-16],[-34,-18],4.4],[[-22,-8],[-31,-7],4]])Q(e,sg(ig(n([-16,-10]),n(t),n(r)),lg(i),10),a)}Q(e,Y([[-34,r,1],[-32,42],[-22,34],[-8,31],[8,31],[22,34],[32,42],[34,r,1]]),{base:`#8fa8c6`,light:`#e8f2fc`,dark:`#3e5878`,line:i,sh:.12,hl:.05},()=>{e.strokeStyle=`#3fc8f0`,e.lineWidth=1.4,e.stroke(J([[-32,46],[-18,38.5],[0,36],[18,38.5],[32,46]],!1))}),Q(e,Y([[0,-32],[13,-29],[21,-19],[23,-5],[21,10],[16,22],[8,30],[0,33,1],[-8,30],[-16,22],[-21,10],[-23,-5],[-21,-19],[-13,-29]]),{base:`#a9bfd6`,light:`#f1f8ff`,dark:`#4d6888`,line:i,sh:.13,hl:.06},()=>{e.strokeStyle=`rgba(255,255,255,0.8)`,e.lineWidth=1.2,Z(e,-1,-31.5,-1,-18),e.strokeStyle=`rgba(30,50,80,0.45)`,Z(e,1,-31.5,1,-18),e.strokeStyle=`rgba(30,60,100,0.55)`,e.lineWidth=.9;for(let t of[-1,1])hg(e,[[t*17,6],[t*13,12],[t*16,13],[t*11,21]]);e.fillStyle=qh(e,-23,0,-12,0,[[0,`rgba(255,255,255,0)`],[.5,`rgba(255,255,255,0.4)`],[1,`rgba(255,255,255,0)`]]),e.fill(J([[-18,-22],[-12,-26],[-11,10],[-14,24],[-19,16]]));for(let t of[-1,1])e.strokeStyle=`rgba(21,34,56,0.7)`,e.lineWidth=1,e.stroke(J([[t*19,-4],[t*15.5,11],[t*7,27.5]],!1)),e.strokeStyle=`rgba(255,255,255,0.55)`,e.lineWidth=.7,e.stroke(J([[t*18,-4],[t*14.5,11],[t*6,27.5]],!1))}),Q(e,Y([[-2.2,-32.4,1],[2.2,-32.4,1],[1.6,-21],[0,-19.4,1],[-1.6,-21]]),{base:`#d8e6f4`,light:`#ffffff`,dark:`#7890ae`,line:i,lw:1.1,sh:.3,hl:.2});for(let[t,n]of[[-20,4],[20,4],[-15,19],[15,19],[-18.5,-15],[18.5,-15]])wg(e,t,n,1.2,`#e6eef6`,i);let o=Y([[-18,-7,1],[-4,-2.5],[0,1.5,1],[4,-2.5],[18,-7,1],[17,-1.5,1],[5,3.5],[0,8.5,1],[-5,3.5],[-17,-1.5,1]]);e.fillStyle=`#060c18`,e.fill(o.p),e.save(),e.clip(o.p),$(e,-9,-1.5,10,`#5ff4ff`,1),$(e,9,-1.5,10,`#5ff4ff`,1),e.restore(),vg(e,o.p,i,1.4);for(let t of[-1,1])e.fillStyle=`#e8feff`,e.beginPath(),e.ellipse(t*9,-1.6,3,1,t*-.3,0,K),e.fill();$(e,0,-15,14,`#5ff4ff`,.7),Q(e,X([0,-21,4,-15,0,-9,-4,-15]),{base:`#3fd0ff`,light:`#e8fdff`,dark:`#1a5fa8`,line:i,lw:1.3,sh:.2,hl:0}),Sg(e,-1.3,-16.5,1);for(let[t,r]of[[[-38,-10],[-22,8]],[[40,-14],[22,6]],[[0,-32],[6,-50]]])Ag(e,gg(n,t,r,3,4),`#5ff4ff`,1);for(let t=0;t<8;t++)xg(e,q(n,-40,40),q(n,-48,40),q(n,1,2.2),`#bff8ff`,.9)}function v_(e,t,n){Ig(e,t,n,{c0:`#4062b4`,c1:`#182a60`,c2:`#050a1e`,pat:`stars`,patC:`#ffffff`,patA:.95,vig:.4});let r=`#1a2345`;yg(e,-26,-30,26,`#8a5ad8`,.22),yg(e,30,20,24,`#3ab0c8`,.16);for(let r=0;r<6;r++)xg(e,q(n,-t.W,t.W),q(n,-t.H,t.H),q(n,.8,1.8),`#dfe8ff`,.9);Lg(e,0,-2,38,`#dfe8ff`,.45),$(e,0,-6,44,`#bcd4ff`,.35),Q(e,Xh(0,-6,31),{base:`#dfe8f8`,light:`#ffffff`,dark:`#9aaed0`,line:`#2a3a6a`,radial:!0,sh:.06,hl:.03,lw:1.4},()=>{for(let[t,n,r]of[[-18,-20,5],[16,-24,3.5],[22,6,4.5],[-22,10,3.2],[8,-30,2.2]])e.fillStyle=`rgba(120,140,190,0.25)`,e.beginPath(),e.arc(t,n,r,0,K),e.fill()});for(let t of[-1,1])for(let[n,r,i]of[[6,3.6,.7],[0,6.8,.95]]){let a=ag([t*(14+n*.3),-14],[t*(30+n),0],[t*(20+n),24],[t*(31+n),50]),o=e=>r*(1-e*.6),s=sg(a,o,14);e.fillStyle=qh(e,0,-14,0,50,[[0,`rgba(228,236,255,${i})`],[1,`rgba(150,170,235,${i*.2})`]]),e.fill(s.p),vg(e,s.p,Hh(`#1a2345`,.65*i),1.2),e.strokeStyle=`rgba(255,255,255,${.65*i})`,e.lineWidth=.7,cg(e,a,o,.3,.05,.9)}let i=Y([[0,-26],[13,-23],[20,-12],[21,2],[18,16],[11,27],[0,32],[-11,27],[-18,16],[-21,2],[-20,-12],[-13,-23]]);Q(e,i,{base:`#cdd7ea`,light:`#ffffff`,dark:`#6f7fa3`,line:r,sh:.12,hl:.05},()=>{for(let t of[-1,1]){yg(e,t*9,-3,7,`#6f7fa3`,.35,.6),e.strokeStyle=`#2a3458`,e.lineWidth=1.3,e.beginPath(),e.moveTo(t*4,-2),e.quadraticCurveTo(t*9,2.2,t*14,-2),e.stroke(),e.lineWidth=.6;for(let n of[.3,.55,.8]){let r=t*(4+10*n),i=-2+4.2*n*(1-n)*2;Z(e,r,i,r+t*.6,i+1.6)}e.strokeStyle=`rgba(40,52,88,0.55)`,e.lineWidth=.8,e.beginPath(),e.moveTo(t*4,-8),e.quadraticCurveTo(t*10,-12,t*15,-8.5),e.stroke(),e.strokeStyle=`rgba(60,72,120,0.45)`,e.lineWidth=.6,e.beginPath(),e.moveTo(t*15,6),e.bezierCurveTo(t*18,12,t*12,16,t*15,20),e.stroke(),e.strokeStyle=`rgba(255,255,255,0.6)`,e.beginPath(),e.moveTo(t*14.4,6.3),e.bezierCurveTo(t*17.4,12.3,t*11.4,16.3,t*14.4,20.3),e.stroke()}e.strokeStyle=`rgba(255,255,255,0.8)`,e.lineWidth=.9,Z(e,-1,-6,-1.5,9),e.strokeStyle=`rgba(70,82,130,0.5)`,Z(e,1,-6,1.2,9),e.lineWidth=.8,e.beginPath(),e.moveTo(-2.6,11),e.quadraticCurveTo(0,12.6,2.6,11),e.stroke(),e.fillStyle=`#a4a0c8`,e.fill(Y([[-4.6,18,1],[-1.5,16.8],[0,17.4],[1.5,16.8],[4.6,18,1],[2,20.2],[-2,20.2]]).p),e.strokeStyle=`#3a3a68`,e.lineWidth=.6,Z(e,-4.4,18,4.4,18)});let a=e=>-19+3*(1-(e/20)**2);e.save(),e.clip(i.p),Q(e,rg(-22,22,a,3.4),{base:`#e8eef8`,light:`#ffffff`,dark:`#8a9ac0`,line:r,lw:1.1,sh:.3,hl:.15}),e.restore();for(let t of[-12,12])Cg(e,t,a(t)+1.7,1.1,`#9fe6ff`);$(e,0,-26,16,`#bfe8ff`,.55),Q(e,eg(0,-27.5,12,0,-5.5,10.2),{base:`#e8eef8`,light:`#ffffff`,dark:`#8a9ac0`,line:r,lw:1.5,sh:.2,hl:.12}),$(e,0,-22.5,7,`#9fe6ff`,.8),Q(e,X([0,-26,2.4,-22.5,0,-19,-2.4,-22.5]),{base:`#9fe6ff`,light:`#ffffff`,dark:`#3a8ac8`,line:r,lw:1,sh:.2,hl:0}),xg(e,-14,-38,1.8,`#dfe8ff`),xg(e,15,-36,1.4,`#dfe8ff`),Sg(e,-9,-16,1.6)}var y_={base:`#f5c542`,light:`#fff3a0`,dark:`#b27810`,line:`#5a3a06`,lw:1.2,sh:.2,hl:.1};function b_(e,t,n,r,i,a){let o=r*i,s=r*.24;e.save(),e.translate(t,n),e.rotate(a);let c=new Path2D;c.moveTo(-r,0),c.lineTo(-r,s),c.ellipse(0,s,r,o,0,Math.PI,0,!0),c.lineTo(r,0),c.closePath(),e.fillStyle=qh(e,-r,0,r,0,[[0,`#d99a22`],[.5,`#a86c0c`],[1,`#7a4a06`]]),e.fill(c),vg(e,c,`#5a3a06`,1.1),Q(e,Zh(0,0,r,o),{...y_,rot:a,lw:1.1},()=>{e.strokeStyle=`rgba(140,90,10,0.65)`,e.lineWidth=.6,e.beginPath(),e.ellipse(0,0,r*.74,o*.74,0,0,K),e.stroke(),e.save(),e.scale(1,i),kg(e,0,.3,r*.34,`rgba(160,100,10,0.55)`),e.restore()}),e.restore()}function x_(e,t,n,r,i){e.save(),e.translate(t,n),e.rotate(i);let a=Zh(1.8,0,r*.86,r);e.fillStyle=`#9a620a`,e.fill(a.p),vg(e,a.p,`#5a3a06`,1.3),Q(e,Zh(0,0,r*.86,r),{...y_,rot:i,lw:1.4,radial:!0},()=>{e.strokeStyle=`rgba(140,90,10,0.7)`,e.lineWidth=.8,e.beginPath(),e.ellipse(0,0,r*.64,r*.76,0,0,K),e.stroke(),Dg(e,0,.3,r*.42,r*.18,5,-Math.PI/2,`#fff3a0`,`#c08416`,`rgba(120,70,5,0.8)`,.6)}),Sg(e,-r*.4,-r*.5,r*.18),e.restore()}function S_(e,t,n){Ig(e,t,n,{c0:`#7086e6`,c1:`#303a8a`,c2:`#10123a`,rays:16,rayC:`#ffe89a`,rayA:.14,dots:14,dotC:`#ffe08a`,dotA:.35,vig:.45,glowC:`#ffe8a0`,glowA:.28,glowY:10}),bg(e,0,42,40,6,.6),Q(e,Y([[-40,40,1],[-30,26],[-16,12],[0,6],[16,12],[30,26],[40,40,1],[0,44]]),{base:`#c48a1c`,light:`#f5c542`,dark:`#6a4006`,line:`#5a3a06`,lw:1.4,sh:.1,hl:.04});let r=[];for(let t=0;t<8;t++){let i=8+t*4.4,a=8+t*4.2,o=Math.max(1,Math.round(a*2/12));for(let t=0;t<o;t++){let s=-a+(t+.5)/o*a*2+q(n,-2.5,2.5),c=i+q(n,-1.2,1.2),l=q(n,7.2,8.6),u=q(n,.34,.46),d=q(n,-.18,.18);r.push({y:c,draw:()=>b_(e,s,c,l,u,d)})}}r.push({y:13,draw:()=>x_(e,-15,6,10.5,-.28)}),r.push({y:19,draw:()=>x_(e,16,11,9.5,.22)}),r.push({y:6,draw:()=>x_(e,0,-5,11.5,.05)}),r.sort((e,t)=>e.y-t.y);for(let e of r)e.draw();for(let[t,n,r]of[[-6,-14,3.4],[22,2,2.6],[-24,22,2.2],[10,30,2],[30,-18,1.8],[-30,-10,1.6]])xg(e,t,n,r,`#fff4c0`)}function C_(e,t,n,r,i,a,o){e.save(),e.translate(t,n),e.rotate(i);let s=r*.82,c=[-r*.55,-s*.62],l=[r*.55,-s*.62],u=[-r,-s*.2],d=[r,-s*.2],f=[-r*.36,-s*.2],p=[r*.36,-s*.2],m=[0,s*.95],h=Wh(a,.55),g=[[[u,c,f],Wh(a,.35)],[[c,l,p,f],h],[[l,d,p],a],[[u,f,m],Wh(a,.12)],[[f,p,m],Gh(a,.12)],[[p,d,m],Gh(a,.35)]];for(let[t,n]of g){let r=X(t.flat());e.fillStyle=n,e.fill(r.p),e.strokeStyle=Hh(Gh(a,.5),.5),e.lineWidth=.5,e.stroke(r.p)}e.fillStyle=`rgba(255,255,255,0.75)`,e.fill(X([c[0]+r*.12,c[1]+s*.08,c[0]+r*.4,c[1]+s*.08,f[0]+r*.1,f[1]-s*.06]).p),vg(e,X([...c,...l,...d,...m,...u]).p,o,1.5),e.restore()}function w_(e,t,n){Ig(e,t,n,{c0:`#a67ae8`,c1:`#43207a`,c2:`#140726`,rays:14,rayC:`#e8d8ff`,rayA:.12,dots:14,dotC:`#c8ffd8`,dotA:.3,vig:.45,glowC:`#d8ffe8`,glowA:.24,glowY:10}),bg(e,0,44,42,6,.6);let r=`#27c96a`,i=`#04351a`;$(e,0,14,38,`#60ff9a`,.28),Q(e,Y([[-35,44,1],[-28,33],[-16,26],[0,23],[16,26],[28,33],[35,44,1],[0,47.5]]),{base:`#148c46`,light:`#3fd07a`,dark:`#054020`,line:i,lw:1.6,sh:.12,hl:.05},()=>{for(let t=0;t<44;t++){let t=q(n,-34,34),i=q(n,24,48),a=q(n,2.4,4.2),o=q(n,-.5,.5),s=Math.cos(o),c=Math.sin(o),l=(e,n)=>[t+e*s-n*c,i+e*c+n*s],u=l(0,-a*.8),d=l(a,0),f=l(0,a*.8),p=l(-a,0),m=n()<.08?`#ff5fae`:r;e.fillStyle=Wh(m,.35),e.fill(X([...p,...u,...d]).p),e.fillStyle=Gh(m,.3),e.fill(X([...p,...d,...f]).p),e.strokeStyle=Hh(Gh(m,.6),.6),e.lineWidth=.4,e.stroke(X([...p,...u,...d,...f]).p),n()<.25&&Cg(e,u[0]-a*.15,u[1]+a*.35,a*.18,`rgba(255,255,255,0.85)`)}}),C_(e,-16,11,13.5,-.3,r,i),C_(e,16,10,13,.32,r,i),C_(e,0,-5,17,.02,r,i),C_(e,-26,30,8.5,-.7,r,i),C_(e,27,31,8,.75,r,i),C_(e,2,27,12.5,.08,`#ff5fae`,`#4a0a2c`),C_(e,-12,39,5.6,-.45,r,i),C_(e,16,40.5,5.2,.55,r,i);for(let[t,n,r]of[[-5,-19,3.4],[14,1,2.4],[-22,17,2],[8,22,2.2],[30,-14,1.8],[-30,-6,1.6]])xg(e,t,n,r,`#e8fff0`)}function T_(e,t,n){Ig(e,t,n,{c0:`#8a9ab8`,c1:`#3d4a66`,c2:`#121826`,rays:10,rayC:`#dff4ff`,rayA:.1,vig:.45,glowC:`#7ff0ff`,glowA:.2}),bg(e,0,36,28,4.5,.5),Q(e,Xh(0,0,27),{base:`#6b7385`,light:`#b7bfcc`,dark:`#343a46`,line:`#15181e`,radial:!0,sh:.12,hl:.05},()=>{e.strokeStyle=`rgba(20,24,30,0.4)`,e.lineWidth=1,e.beginPath(),e.arc(0,0,21,0,K),e.stroke()}),$(e,0,0,30,`#46eaff`,.4),e.save(),Tg(e,2.5,`#46eaff`),e.strokeStyle=`#bff8ff`,e.lineWidth=2,e.beginPath(),e.moveTo(0,-15),e.lineTo(15,0),e.lineTo(0,15),e.lineTo(-15,0),e.closePath(),e.moveTo(4.5,0),e.arc(0,0,4.5,0,K);for(let t=0;t<4;t++){let n=Math.PI/4+t*Math.PI/2;e.moveTo(Math.cos(n)*12,Math.sin(n)*12),e.lineTo(Math.cos(n)*17,Math.sin(n)*17)}e.stroke(),e.fillStyle=`#e8fdff`;for(let[t,n]of[[0,-19],[19,0],[0,19],[-19,0]])e.beginPath(),e.arc(t,n,1.6,0,K),e.fill();Eg(e),e.restore();for(let t=0;t<6;t++)xg(e,q(n,-34,34),q(n,-40,30),q(n,1,2),`#bff8ff`,.8)}var E_={common:{bg:{c0:`#c2d8ee`,c1:`#5c7ea6`,c2:`#16223a`,rays:12,rayC:`#ffffff`,rayA:.14,pat:`lattice`,patA:.08,vig:.42},frame:[`#eef4fa`,`#9fb4cc`,`#5a6e88`],panel:[`#6f8fb4`,`#2e4666`],ink:`#141d2b`},rare:{bg:{c0:`#ffe9a8`,c1:`#e3952e`,c2:`#5a260a`,rays:14,rayC:`#fff8e0`,rayA:.18,pat:`rings`,patC:`#fff4d0`,patA:.1,vig:.42},frame:[`#fff0a8`,`#f0b43a`,`#a0600e`],panel:[`#e89a3a`,`#8a3e0e`],ink:`#4a2604`},epic:{bg:{c0:`#eab0ff`,c1:`#8a36c2`,c2:`#22073d`,rays:12,rayC:`#ffe8ff`,rayA:.16,pat:`swirl`,patC:`#ffd8ff`,patA:.16,vig:.46},frame:[`#f4d4ff`,`#b666ea`,`#5a1a8a`],panel:[`#9a4ad0`,`#3a0e62`],ink:`#200838`},legendary:{bg:{c0:`#fff4ff`,c1:`#7a5ad8`,c2:`#141038`,rays:18,rayC:`#fff0ff`,rayA:.2,dots:18,dotC:`#ffffff`,dotA:.4,vig:.46},frame:[`#ffffff`,`#c8b8ff`,`#6a4ab8`],panel:[`#5a4aa8`,`#1e1650`],ink:`#141030`},champion:{bg:{c0:`#fff3c0`,c1:`#f0a030`,c2:`#5a1a06`,rays:22,rayC:`#fff6d0`,rayA:.2,dots:14,dotC:`#fff0b0`,dotA:.4,vig:.45},frame:[`#fff2b0`,`#f0b43a`,`#9a560a`],panel:[`#c8661a`,`#5a1a06`],ink:`#4a2604`}};function D_(e,t,n,r,i,a=1){let o=[`#ff5a7a`,`#ffb84a`,`#fff06a`,`#6aff9a`,`#5ad8ff`,`#8a7aff`,`#ff6ae0`];return qh(e,t,n,r,i,o.map((e,t)=>[t/(o.length-1),Hh(e,a)]))}function O_(e,t,n,r){let i=Qh(-17,-24,34,48,4.5);e.fillStyle=r?D_(e,-17,-24,17,24):qh(e,-17,-24,17,24,[[0,t.frame[0]],[.5,t.frame[1]],[1,t.frame[2]]]),e.fill(i.p),r&&(e.fillStyle=`rgba(255,255,255,0.35)`,e.fill(i.p));let a=Qh(-13.5,-20.5,27,41,2.8);e.fillStyle=qh(e,0,-20,0,20,[[0,t.panel[0]],[1,t.panel[1]]]),e.fill(a.p),e.save(),e.clip(a.p),e.strokeStyle=`rgba(255,255,255,0.1)`,e.lineWidth=.6;for(let t=-60;t<=60;t+=5)Z(e,t-30,-30,t+30,30),Z(e,t+30,-30,t-30,30);yg(e,0,-4,16,`#ffffff`,.18),e.restore(),n>0&&(e.fillStyle=`rgba(0,0,0,${n})`,e.fill(i.p)),vg(e,a.p,t.ink,1),e.strokeStyle=`rgba(255,255,255,0.55)`,e.lineWidth=.8,e.stroke(Qh(-15.6,-22.6,31.2,45.2,3.6).p),vg(e,i.p,t.ink,1.8)}function k_(e,t,n){switch(t){case`common`:$(e,0,-3,24,`#cfe6ff`,.45),Q(e,Xh(0,-3,14),{base:`#b8cce2`,light:`#ffffff`,dark:`#5a6e88`,line:n.ink,radial:!0,sh:.12,hl:.05}),Q(e,$h(0,-3,10,11.6),{base:`#8ea6c2`,light:`#e8f0f8`,line:n.ink,lw:.9,sh:.2,hl:.1}),Dg(e,0,-3,8.6,3,4,-Math.PI/2,`#ffffff`,`#5a7aa0`,n.ink,1.3);break;case`rare`:{$(e,0,-3,26,`#ffe08a`,.5);let t=[[0,-20],[13,-3],[0,14],[-13,-3]];Og(e,0,-3,t,`#fff6c0`,`#b86a0a`);let r=t.map(e=>[e[0]*.5,-3+(e[1]- -3)*.5]);e.fillStyle=`#ffd860`,e.fill(X(r.flat()).p),e.strokeStyle=`rgba(120,60,5,0.6)`,e.lineWidth=.6;for(let n=0;n<4;n++)Z(e,r[n][0],r[n][1],t[n][0],t[n][1]);vg(e,X(t.flat()).p,n.ink,1.8),Sg(e,-3,-10,1.5);break}case`epic`:$(e,0,-3,26,`#f0a0ff`,.55),Dg(e,0,-3,17,9,6,-Math.PI/2,`#f8dcff`,`#6a1aa8`,n.ink,1.8),Q(e,Xh(0,-3,4.6),{base:`#c070ff`,light:`#ffffff`,dark:`#5a1a9a`,line:n.ink,lw:1.1,radial:!0,sh:0,hl:0});break;case`legendary`:{$(e,0,-3,30,`#ffffff`,.5);let t=tg(0,-3,16,16,3,-Math.PI/2),r=[`#ff6a8a`,`#ffc24a`,`#fff27a`,`#7aff9a`,`#6ad8ff`,`#b07aff`];for(let n=0;n<6;n++){let i=t[n],a=t[(n+1)%6];e.fillStyle=qh(e,i[0],i[1],a[0],a[1],[[0,r[n]],[1,r[(n+1)%6]]]),e.beginPath(),e.moveTo(0,-3),e.lineTo(i[0],i[1]),e.lineTo(a[0],a[1]),e.closePath(),e.fill()}let i=t.map(e=>[e[0]*.5,-3+(e[1]- -3)*.5]);e.fillStyle=`rgba(255,255,255,0.55)`,e.fill(X(i.flat()).p),e.strokeStyle=`rgba(255,255,255,0.7)`,e.lineWidth=.6;for(let n=0;n<6;n++)Z(e,i[n][0],i[n][1],t[n][0],t[n][1]);vg(e,X(t.flat()).p,n.ink,1.8),Sg(e,-3.5,-8,1.8);break}case`champion`:$(e,0,-1,28,`#fff0a0`,.55),Q(e,Xh(0,0,13),{base:`#f0b43a`,light:`#fff2b0`,dark:`#9a560a`,line:n.ink,radial:!0,sh:.12,hl:.05}),Dg(e,0,0,9.5,5,8,-Math.PI/2,`#fff6c0`,`#c07814`,n.ink,1),Q(e,Xh(0,0,3.2),{base:`#e0203a`,light:`#ff9aa8`,dark:`#7a0718`,line:n.ink,lw:1,radial:!0,sh:0,hl:0}),Q(e,X([-11,-11,-12.5,-23,-6,-16.5,0,-26,6,-16.5,12.5,-23,11,-11]),{base:`#f5c542`,light:`#fff4b0`,dark:`#a8680e`,line:n.ink,lw:1.6,sh:.18,hl:.1});for(let[t,r]of[[-12.5,-23],[0,-26],[12.5,-23]])Q(e,Xh(t,r,1.8),{base:`#ffe890`,light:`#ffffff`,line:n.ink,lw:.9,radial:!0,sh:0,hl:0});Q(e,Xh(0,-15,1.9),{base:`#3fb8ff`,light:`#e0f6ff`,dark:`#1a5aa8`,line:n.ink,lw:.8,radial:!0,sh:0,hl:0})}}function A_(e,t,n,r){let i=E_[r];if(Ig(e,t,n,i.bg),r===`legendary`){e.save(),e.globalCompositeOperation=`lighter`;for(let t=0;t<12;t++){let n=[`#ff5a7a`,`#ffb84a`,`#fff06a`,`#6aff9a`,`#5ad8ff`,`#8a7aff`];Pg(e,0,-4,80,1,n[t%n.length],.22,t/12*K,.5/12)}e.restore()}bg(e,0,40,30,4.5,.5);let a=r===`legendary`;for(let[t,n]of[[-22,.3],[22,.3],[0,0]])e.save(),e.translate(0,34),e.rotate(t*Nh),e.translate(0,-34),O_(e,i,n,a),e.restore();e.save(),e.clip(Qh(-17,-24,34,48,4.5).p),e.globalCompositeOperation=`lighter`;for(let[t,n,r]of[[-10,5,.22],[2,1.4,.3],[12,2.4,.16]])e.fillStyle=`rgba(255,255,255,${r})`,e.beginPath(),e.moveTo(t-30,30),e.lineTo(t-30+n,30),e.lineTo(t+30+n,-30),e.lineTo(t+30,-30),e.closePath(),e.fill();e.restore(),k_(e,r,i);let o=r===`common`?`#e8f4ff`:r===`rare`?`#fff4c0`:r===`epic`?`#ffe0ff`:`#ffffff`;for(let[t,n,r]of[[-26,-30,2.6],[27,-26,2.2],[-30,14,1.8],[30,16,2],[14,-36,1.6]])xg(e,t,n,r,o)}var j_={guard:Vg,archer:Hg,skeleton:Wg,bomb:Gg,cannon:Jg,slime:Yg,torch:Xg,mage:Zg,potion:$g,tower:e_,shield:t_,fireball:n_,axe:a_,dragon:o_,golem:s_,lightning:c_,ghost:l_,crystal:d_,phoenix:f_,iceCrown:p_,shadowBlade:m_,griffin:h_,sunKing:g_,stormLord:__,moonWarden:v_,gold:S_,gems:w_};Object.freeze(Object.keys(j_));function M_(e,t,n){let r=Math.min(t,n);e.beginPath(),e.rect(0,0,t,n),e.clip(),e.translate(t/2,n/2),e.scale(r/100,r/100);let i=e.getTransform();return Lh=Math.hypot(i.a,i.b)||r/100,e.globalCompositeOperation=`source-over`,e.shadowBlur=0,e.shadowColor=`rgba(0,0,0,0)`,e.shadowOffsetX=0,e.shadowOffsetY=0,e.lineJoin=`round`,e.lineCap=`round`,e.miterLimit=4,e.setLineDash([]),e.filter=`none`,{W:50*t/r,H:50*n/r}}function N_(e,t,n,r){if(n>0&&r>0){e.save();try{let i=M_(e,n,r);(j_[t]??T_)(e,i,zh(Rh(t)))}finally{e.restore()}}}function P_(e,t,n,r){if(n>0&&r>0){e.save();try{A_(e,M_(e,n,r),zh(Rh(`wildcard:${t}`)),E_[t]?t:`common`)}finally{e.restore()}}}var F_={common:{stops:[`#f6fbff`,`#bcd0e6`,`#8aa3c2`,`#5d7596`],rim:`#1c2c46`,edge:`rgba(255,255,255,0.95)`,shadow:`#2a3b58`},rare:{stops:[`#fff6c8`,`#ffd35a`,`#f0a21e`,`#b8680c`],rim:`#4a2806`,edge:`rgba(255,255,230,0.95)`,shadow:`#7a420a`},epic:{stops:[`#fbe0ff`,`#dc8cff`,`#a646f2`,`#5e1a9e`],rim:`#240a40`,edge:`rgba(255,240,255,0.95)`,shadow:`#3f0f6e`},legendary:{stops:[`#ffffff`,`#dff0ff`,`#f6dcff`,`#cfe0ff`],rim:`#1a1446`,edge:`rgba(255,255,255,1)`,shadow:`#6a6aa8`},champion:{stops:[`#fff8d0`,`#ffd862`,`#f3a51c`,`#b0620a`],rim:`#10244e`,edge:`rgba(255,255,235,1)`,shadow:`#6e3a06`},resource:{stops:[`#f4f8ff`,`#c9d8ea`,`#8ea6c4`,`#617a9c`],rim:`#1a2a44`,edge:`rgba(255,255,255,0.9)`,shadow:`#2a3b58`}};function I_(e){return e.kind===`gold`||e.kind===`gems`?`resource`:e.rarity??`common`}function L_(e,t,n,r){let i=r;if(e===`epic`){let e=t*.13;return[[i+e,i],[t-i-e,i],[t-i,i+e],[t-i,n-i-e],[t-i-e,n-i],[i+e,n-i],[i,n-i-e],[i,i+e]]}if(e===`legendary`){let e=n*.13,r=i*1.15;return[[t/2,i*1.4],[t-i,e+r*.5],[t-i,n-e-r*.5],[t/2,n-i*1.4],[i,n-e-r*.5],[i,e+r*.5]]}return null}function R_(e,t,n,r,i){e.beginPath();let a=L_(t,n,r,i);if(a){e.moveTo(a[0][0],a[0][1]);for(let t=1;t<a.length;t++)e.lineTo(a[t][0],a[t][1]);e.closePath();return}let o=t===`champion`?r*.085:0,s=Math.max(4,n*.085-i*.5);e.roundRect(i,o+i,n-i*2,r-o-i*2,s)}function z_(e,t,n,r){let i=F_[t],a=e.createLinearGradient(0,0,n*.35,r);return i.stops.forEach((e,t)=>a.addColorStop(t/(i.stops.length-1),e)),a}function B_(e,t,n){let r=t/2,i=n*.12,a=t*.34;e.save(),e.beginPath(),e.moveTo(r-a/2,i),e.lineTo(r-a/2-6,i-n*.055),e.lineTo(r-a*.22,i-n*.03),e.lineTo(r,i-n*.095),e.lineTo(r+a*.22,i-n*.03),e.lineTo(r+a/2+6,i-n*.055),e.lineTo(r+a/2,i),e.closePath();let o=e.createLinearGradient(0,i-n*.1,0,i);o.addColorStop(0,`#fff7cf`),o.addColorStop(.5,`#ffcf45`),o.addColorStop(1,`#c47a0a`),e.fillStyle=o,e.fill(),e.lineWidth=4,e.strokeStyle=`#5a3104`,e.stroke();for(let[t,o,s]of[[r,i-n*.078,`#4ddfff`],[r-a*.34,i-n*.035,`#ff5a7a`],[r+a*.34,i-n*.035,`#ff5a7a`]])e.beginPath(),e.arc(t,o,7,0,Math.PI*2),e.fillStyle=s,e.fill(),e.lineWidth=2.5,e.strokeStyle=`#3a1d02`,e.stroke(),e.beginPath(),e.arc(t-2,o-2,2.2,0,Math.PI*2),e.fillStyle=`rgba(255,255,255,0.9)`,e.fill();e.restore()}function V_(e,t,n,r,i){e.save(),e.translate(t,n),e.rotate(Math.PI/4),e.fillStyle=i,e.fillRect(-r,-r,r*2,r*2),e.lineWidth=3,e.strokeStyle=`rgba(20,10,40,0.85)`,e.strokeRect(-r,-r,r*2,r*2),e.fillStyle=`rgba(255,255,255,0.75)`,e.fillRect(-r*.6,-r*.6,r*.6,r*.6),e.restore()}function H_(e,t,n,r=400,i=500){let a=I_(n),o=F_[a],s=Math.round(r*.058);e.clearRect(0,0,r,i),e.save(),e.shadowColor=`rgba(0,0,0,0.45)`,e.shadowBlur=r*.02,e.shadowOffsetY=r*.008,R_(e,a,r,i,2),e.fillStyle=z_(e,a,r,i),e.fill(),e.restore(),R_(e,a,r,i,2),e.lineWidth=4,e.strokeStyle=o.shadow,e.stroke(),e.save(),R_(e,a,r,i,5),e.clip();let c=e.createLinearGradient(0,0,0,i*.5);c.addColorStop(0,o.edge),c.addColorStop(.25,`rgba(255,255,255,0)`),R_(e,a,r,i,5),e.lineWidth=5,e.strokeStyle=c,e.stroke();let l=e.createLinearGradient(0,i*.6,0,i);l.addColorStop(0,`rgba(0,0,0,0)`),l.addColorStop(1,`rgba(0,0,0,0.35)`),e.fillStyle=l,e.fillRect(0,0,r,i),e.restore(),R_(e,a,r,i,s),e.lineWidth=7,e.strokeStyle=o.rim,e.stroke(),e.save(),R_(e,a,r,i,s+2),e.clip();let u=a===`champion`?i*.085:0,d=s,f=u+s,p=r-s*2,m=i-u-s*2;e.translate(d,f);try{e.save(),n.kind===`wildcard`?P_(e,n.rarity??`common`,p,m):n.kind===`gold`?N_(e,`gold`,p,m):n.kind===`gems`?N_(e,`gems`,p,m):N_(e,n.cardId??`unknown`,p,m),e.restore()}catch(t){console.warn(`card art failed`,n,t),e.restore(),U_(e,p,m,a)}e.setTransform(1,0,0,1,0,0);let h=e.createRadialGradient(r/2,i*.45,Math.min(p,m)*.35,r/2,i*.5,Math.max(p,m)*.75);h.addColorStop(0,`rgba(0,0,0,0)`),h.addColorStop(1,`rgba(0,0,20,0.45)`),e.fillStyle=h,e.fillRect(0,0,r,i);let g=e.createLinearGradient(0,0,r,i*.6);if(g.addColorStop(0,`rgba(255,255,255,0.16)`),g.addColorStop(.35,`rgba(255,255,255,0.04)`),g.addColorStop(.36,`rgba(255,255,255,0)`),e.fillStyle=g,e.fillRect(0,0,r,i),e.restore(),R_(e,a,r,i,s+2),e.lineWidth=2.5,e.strokeStyle=`rgba(255,255,255,0.35)`,e.stroke(),a===`rare`)V_(e,r/2,s*.52,s*.36,`#fff1b0`);else if(a===`epic`)for(let t of[r/2-s*.9,r/2,r/2+s*.9])V_(e,t,s*.52,s*.3,`#f7c6ff`);else a===`legendary`?(V_(e,r/2,s*1.2,s*.42,`#ffffff`),V_(e,r/2,i-s*1.2,s*.42,`#ffffff`)):a===`champion`&&B_(e,r,i);t&&(t.clearRect(0,0,r,i),t.fillStyle=`#000`,t.fillRect(0,0,r,i),t.fillStyle=`#fff`,R_(t,a,r,i,2),t.fill(),t.fillStyle=`rgb(38,38,38)`,R_(t,a,r,i,s+2),t.fill(),a===`champion`&&(t.fillStyle=`#fff`,t.fillRect(r*.3,0,r*.4,i*.13)))}function U_(e,t,n,r){let i=e.createRadialGradient(t/2,n*.45,4,t/2,n/2,Math.max(t,n)*.7);i.addColorStop(0,`#3a6fd0`),i.addColorStop(1,`#0b1f48`),e.fillStyle=i,e.fillRect(0,0,t,n),e.save(),e.translate(t/2,n/2),e.fillStyle=F_[r].stops[1],e.strokeStyle=F_[r].rim,e.lineWidth=t*.03,e.beginPath();for(let n=0;n<8;n++){let r=n/8*Math.PI*2,i=n%2==0?t*.28:t*.12;e.lineTo(Math.cos(r)*i,Math.sin(r)*i)}e.closePath(),e.fill(),e.stroke(),e.restore()}function W_(e){return`${e.kind}:${e.rarity??``}:${e.cardId??``}`}var G_=new Map,K_=new Map;function q_(e){let t=W_(e),n=G_.get(t);if(n)return n;let r=document.createElement(`canvas`);r.width=400,r.height=500;let i=document.createElement(`canvas`);i.width=400,i.height=500,H_(r.getContext(`2d`),i.getContext(`2d`),e);let a=new yl(r);a.colorSpace=Ga,a.anisotropy=4;let o={map:a,mask:new yl(i),canvas:r};return G_.set(t,o),o}function J_(e){let t=W_(e),n=K_.get(t);if(n)return n;let r=q_(e),i=document.createElement(`canvas`);i.width=200,i.height=250;let a=i.getContext(`2d`);a.imageSmoothingQuality=`high`,a.drawImage(r.canvas,0,0,200,250);let o=i.toDataURL(`image/png`);return K_.set(t,o),o}var Y_=new Map;function X_(e){let t=Y_.get(e);if(t)return t;let n=document.createElement(`canvas`);n.width=400,n.height=500;let r=n.getContext(`2d`),i=e===`champion`;r.beginPath(),r.roundRect(2,2,396,496,34);let a=r.createLinearGradient(0,0,160,500);a.addColorStop(0,i?`#fff6c8`:`#ffe9a0`),a.addColorStop(.5,i?`#ffc93a`:`#e3a53a`),a.addColorStop(1,i?`#b8680c`:`#8a5a18`),r.fillStyle=a,r.fill(),r.lineWidth=4,r.strokeStyle=`#3a2206`,r.stroke(),r.beginPath(),r.roundRect(24,24,352,452,20);let o=r.createRadialGradient(200,225,10,200,250,310);i?(o.addColorStop(0,`#ffe690`),o.addColorStop(.6,`#f2a81e`),o.addColorStop(1,`#9a5406`)):(o.addColorStop(0,`#3f86ff`),o.addColorStop(.6,`#1c4fb8`),o.addColorStop(1,`#0b245a`)),r.fillStyle=o,r.fill(),r.save(),r.clip(),r.strokeStyle=i?`rgba(255,255,255,0.16)`:`rgba(160,210,255,0.14)`,r.lineWidth=3;for(let e=-500;e<900;e+=34)r.beginPath(),r.moveTo(e,0),r.lineTo(e-500,500),r.stroke(),r.beginPath(),r.moveTo(e-500,0),r.lineTo(e,500),r.stroke();r.restore(),r.lineWidth=6,r.strokeStyle=i?`#6e3a06`:`#0a1f4a`,r.stroke(),r.beginPath(),r.arc(200,250,120,0,Math.PI*2),r.fillStyle=i?`rgba(255,250,220,0.35)`:`rgba(10,30,80,0.55)`,r.fill(),r.lineWidth=8,r.strokeStyle=i?`#fff3c0`:`#ffd35a`,r.stroke();for(let e=0;e<8;e++){let t=e/8*Math.PI*2;V_(r,200+Math.cos(t)*400*.3,250+Math.sin(t)*400*.3,7,i?`#4ddfff`:`#ffd35a`)}r.font=`900 144px "Rubik Variable", "Rubik", system-ui, sans-serif`,r.textAlign=`center`,r.textBaseline=`middle`,r.lineJoin=`round`,r.lineWidth=14,r.strokeStyle=i?`#7a3f02`:`#081a44`,r.strokeText(`?`,200,258);let s=r.createLinearGradient(0,175,0,325);s.addColorStop(0,`#ffffff`),s.addColorStop(1,i?`#fff0b0`:`#bcefff`),r.fillStyle=s,r.fillText(`?`,200,258);let c=new yl(n);return c.colorSpace=Ga,c.anisotropy=4,Y_.set(e,c),c}function Z_(e){for(let t of e)q_(t)}var Q_={champion:3,legendary:3,epic:2,lightning:2,rare:2,land:2,latch:2},$_=class{ctx=null;master=null;bus=null;reverbSend=null;noiseBuf=null;buffers=new Map;active=0;enabled=!0;volume=.8;suppressed=0;hidden=!1;maxVoices=14;get context(){return this.ctx}unlock(){try{if(!this.ctx){let e=window.AudioContext??window.webkitAudioContext;if(!e)return;this.ctx=new e({latencyHint:`interactive`}),this.build()}this.ctx.state===`suspended`&&!this.hidden&&this.ctx.resume()}catch{this.ctx=null}}build(){let e=this.ctx;this.master=e.createGain(),this.master.gain.value=this.enabled?this.volume:0;let t=e.createDynamicsCompressor();t.threshold.value=-14,t.knee.value=12,t.ratio.value=4,t.attack.value=.004,t.release.value=.2,this.bus=e.createGain(),this.bus.gain.value=.9,this.bus.connect(t).connect(this.master).connect(e.destination);let n=e.createConvolver();n.buffer=this.impulse(1.8),this.reverbSend=e.createGain(),this.reverbSend.gain.value=.35,this.reverbSend.connect(n).connect(t);let r=e.sampleRate;this.noiseBuf=e.createBuffer(1,r,e.sampleRate);let i=this.noiseBuf.getChannelData(0),a=1234567;for(let e=0;e<r;e++)a=a*16807%2147483647,i[e]=a/2147483647*2-1}impulse(e){let t=this.ctx,n=Math.floor(t.sampleRate*e),r=t.createBuffer(2,n,t.sampleRate),i=42;for(let e=0;e<2;e++){let t=r.getChannelData(e);for(let e=0;e<n;e++)i=i*16807%2147483647,t[e]=(i/2147483647*2-1)*(1-e/n)**3.2}return r}setEnabled(e){this.enabled=e,this.applyGain()}setVolume(e){this.volume=Math.max(0,Math.min(1,e)),this.applyGain()}applyGain(){if(!this.ctx||!this.master)return;let e=this.enabled&&!this.hidden?this.volume:0;this.master.gain.setTargetAtTime(e,this.ctx.currentTime,.03)}setHidden(e){this.hidden=e,this.ctx&&(e?this.ctx.suspend():this.enabled&&this.ctx.resume(),this.applyGain())}suppress(e){this.suppressed=Math.max(0,this.suppressed+(e?1:-1))}register(e,t){this.buffers.set(e,t)}play(e,t={}){let n=this.ctx;if(!n||!this.bus||!this.enabled||this.hidden||this.suppressed>0||n.state!==`running`)return;let r=Q_[e]??1;if(this.active>=this.maxVoices&&r<2||this.active>=this.maxVoices+4)return;let i=n.currentTime+.005,a=t.pitch??1,o=t.gain??1,s=this.buffers.get(e);if(s){let e=n.createBufferSource();e.buffer=s,e.playbackRate.value=a;let t=n.createGain();t.gain.value=o,e.connect(t).connect(this.bus),this.track(e,s.duration/a),e.start(i);return}switch(e){case`click`:this.tone(`sine`,1500*a,950*a,i,.05,.12*o);break;case`select`:this.tone(`triangle`,880*a,880*a,i,.06,.1*o),this.tone(`triangle`,1320*a,1320*a,i+.05,.08,.09*o);break;case`land`:this.tone(`sine`,120*a,42*a,i,.22,.75*o),this.noise(i,.09,.32*o,`lowpass`,900*a,400*a),this.noise(i+.01,.05,.12*o,`bandpass`,2400*a,1800*a),t.metal&&this.tone(`triangle`,1900*a,1850*a,i+.01,.28,.06*o,!0);break;case`thud`:this.tone(`sine`,90*a,40*a,i,.18,.5*o),this.noise(i,.06,.18*o,`lowpass`,600,300);break;case`charge`:this.noise(i,.55,.12*o,`bandpass`,300*a,2600*a,.2),this.tone(`sine`,220*a,660*a,i,.55,.06*o),this.tone(`sine`,330*a,990*a,i+.08,.47,.03*o);break;case`rise`:this.noise(i,.9,.1*o,`bandpass`,250*a,3200*a,.25),this.tone(`sawtooth`,110*a,440*a,i,.9,.035*o,!1,900),this.tone(`sine`,440*a,1320*a,i+.2,.7,.04*o);break;case`latch`:this.noise(i,.025,.4*o,`highpass`,3200*a,3200*a),this.tone(`square`,2300*a,1800*a,i,.035,.05*o),this.noise(i+.07,.03,.3*o,`highpass`,2400*a,2400*a),this.tone(`triangle`,1250*a,1100*a,i+.07,.12,.08*o,!0);break;case`lid`:this.noise(i,.36,.22*o,`bandpass`,500*a,1900*a,.12),this.tone(`sawtooth`,150*a,110*a,i,.22,.03*o,!1,700);break;case`whoosh`:this.noise(i,.28,.17*o,`bandpass`,450*a,2600*a,.2);break;case`flip`:this.noise(i,.04,.14*o,`bandpass`,1800*a,1500*a);break;case`common`:this.bell([1320,2640],i,.35,.09*o,a,.15);break;case`rare`:this.bell([1047,1319,1568],i,.7,.08*o,a,.35,.03);break;case`epic`:this.bell([784,988,1175,1568],i,1.1,.075*o,a,.55,.035),this.tone(`triangle`,392*a,392*a,i,.9,.05*o,!0);break;case`legendary`:[523,659,784,1047,1319].forEach((e,t)=>this.bell([e],i+t*.055,.5,.06*o,a,.4)),this.bell([523,659,784,988,1319],i+.3,1.5,.05*o,a,.7,.01),this.noise(i+.28,.5,.05*o,`highpass`,6e3,9e3,.3);break;case`champion`:for(let e of[261.6,329.6,392,523.3])this.tone(`sawtooth`,e*a,e*a,i,1.1,.04*o,!0,1600,.09);this.tone(`sine`,72*a,38*a,i,.6,.6*o),this.noise(i,.2,.25*o,`lowpass`,500,200),this.bell([1047,1319,1568,2093],i+.12,1.4,.05*o,a,.6,.02);break;case`lightning`:for(let e=0;e<5;e++)this.noise(i+e*.022,.03+e*.01,(.35-e*.05)*o,`highpass`,1400+e*300,900);this.tone(`sine`,70*a,34*a,i,.55,.55*o),this.noise(i+.04,.45,.14*o,`lowpass`,900,200,.2);break;case`arc`:for(let e=0;e<3;e++)this.noise(i+e*.018,.02,.08*o,`highpass`,2600,2200);break;case`coin`:this.bell([2100*(.9+i*997%1*.25)],i,.16,.05*o,a,.05);break;case`lucky`:[1319,1568,2093,2637].forEach((e,t)=>this.bell([e],i+t*.06,.4,.06*o,a,.4));break;case`choice`:this.bell([784,1175],i,.5,.07*o,a,.3);break;case`deny`:this.tone(`square`,220*a,180*a,i,.09,.05*o,!1,900)}}track(e,t){this.active++;let n=!1,r=()=>{n||(n=!0,this.active=Math.max(0,this.active-1))};e.onended=r,window.setTimeout(r,(t+.3)*1e3)}env(e,t,n,r=.005){let i=this.ctx.createGain();return i.gain.setValueAtTime(1e-4,e),i.gain.exponentialRampToValueAtTime(Math.max(2e-4,n),e+r),i.gain.exponentialRampToValueAtTime(1e-4,e+t),i}tone(e,t,n,r,i,a,o=!1,s=0,c=.005){let l=this.ctx,u=l.createOscillator();u.type=e,u.frequency.setValueAtTime(t,r),n!==t&&u.frequency.exponentialRampToValueAtTime(Math.max(20,n),r+i);let d=this.env(r,i,a,c),f=u;if(s>0){let e=l.createBiquadFilter();e.type=`lowpass`,e.frequency.value=s,f=f.connect(e)}f.connect(d).connect(this.bus),o&&d.connect(this.reverbSend),this.track(u,i),u.start(r),u.stop(r+i+.05)}noise(e,t,n,r,i,a,o=.004){let s=this.ctx,c=s.createBufferSource();c.buffer=this.noiseBuf,c.loop=!0;let l=s.createBiquadFilter();l.type=r,l.Q.value=r===`bandpass`?1.4:.7,l.frequency.setValueAtTime(i,e),a!==i&&l.frequency.exponentialRampToValueAtTime(Math.max(40,a),e+t);let u=this.env(e,t,n,o);c.connect(l).connect(u).connect(this.bus),this.track(c,t),c.start(e,Math.random()*.5),c.stop(e+t+.05)}bell(e,t,n,r,i,a,o=0){let s=this.ctx;e.forEach((e,c)=>{let l=t+c*o;for(let[t,o]of[[1,1],[2.01,.28],[3.02,.1]]){let c=s.createOscillator();c.type=`sine`,c.frequency.value=e*i*t;let u=this.env(l,n*(t===1?1:.6),r*o,.003);if(c.connect(u).connect(this.bus),a>0){let e=s.createGain();e.gain.value=a,u.connect(e).connect(this.reverbSend)}this.track(c,n),c.start(l),c.stop(l+n+.05)}})}},ev=[{id:`guard`,name:`Страж`,rarity:`common`,role:`Стальной шлем с синим плюмажем`},{id:`archer`,name:`Лесной лучник`,rarity:`common`,role:`Капюшон, лук и зелёные огни глаз`},{id:`skeleton`,name:`Скелет`,rarity:`common`,role:`Череп со скрещёнными костями`},{id:`bomb`,name:`Бомба`,rarity:`common`,role:`Чугунный шар с искрящим фитилём`},{id:`cannon`,name:`Пушка`,rarity:`common`,role:`Бронзовый ствол на колесе`},{id:`slime`,name:`Слизень`,rarity:`common`,role:`Прыгучий бирюзовый слизень`},{id:`torch`,name:`Факел`,rarity:`common`,role:`Пылающий факел в железной оправе`},{id:`mage`,name:`Маг`,rarity:`rare`,role:`Звёздная шляпа и посох с сферой`},{id:`potion`,name:`Зелье жизни`,rarity:`rare`,role:`Колба с алым светящимся эликсиром`},{id:`tower`,name:`Башня`,rarity:`rare`,role:`Каменная башня с вымпелом`},{id:`shield`,name:`Щит`,rarity:`rare`,role:`Геральдический щит со звездой`},{id:`fireball`,name:`Огненный шар`,rarity:`rare`,role:`Пылающий метеор`},{id:`axe`,name:`Боевой топор`,rarity:`rare`,role:`Двуручный топор с рунами`},{id:`dragon`,name:`Дракон`,rarity:`epic`,role:`Голова дракона в изумрудной чешуе`},{id:`golem`,name:`Голем`,rarity:`epic`,role:`Каменная голова с сияющими рунами`},{id:`lightning`,name:`Молния`,rarity:`epic`,role:`Грозовое облако и разряд`},{id:`ghost`,name:`Призрак`,rarity:`epic`,role:`Дух с голубым фонарём`},{id:`crystal`,name:`Кристалл`,rarity:`epic`,role:`Друза магических кристаллов`},{id:`phoenix`,name:`Феникс`,rarity:`legendary`,role:`Огненная птица с раскрытыми крыльями`},{id:`iceCrown`,name:`Ледяная корона`,rarity:`legendary`,role:`Корона из льда со снежинкой`},{id:`shadowBlade`,name:`Теневой клинок`,rarity:`legendary`,role:`Фиолетовый меч в клубах тени`},{id:`griffin`,name:`Грифон`,rarity:`legendary`,role:`Орлиная голова с золотой гривой`},{id:`sunKing`,name:`Солнечный король`,rarity:`champion`,role:`Золотой шлем с короной лучей`},{id:`stormLord`,name:`Повелитель бури`,rarity:`champion`,role:`Крылатый шлем в молниях`},{id:`moonWarden`,name:`Лунный страж`,rarity:`champion`,role:`Серебряная маска с полумесяцем`}],tv=new Map(ev.map(e=>[e.id,e]));function nv(e){return ev.filter(t=>t.rarity===e)}var rv={common:`Обычная карта`,rare:`Редкая карта`,epic:`Эпическая карта`,legendary:`Легендарная карта`,champion:`Чемпион`},iv={common:`Обычная`,rare:`Редкая`,epic:`Эпическая`,legendary:`Легендарная`,champion:`Чемпион`};function av(e,t,n={}){return{id:e,name:t,modelId:e,visualPresetId:e,openingPresetId:e,rewardTableId:e,strikeBudget:0,supportsChoices:!1,...n}}var ov=[av(`silver`,`Серебряный сундук`),av(`golden`,`Золотой сундук`),av(`giant`,`Гигантский сундук`),av(`magical`,`Магический сундук`),av(`epic`,`Эпический сундук`),av(`legendary`,`Легендарный сундук`),av(`lightning`,`Сундук молний`,{strikeBudget:3}),av(`megaLightning`,`Сундук бури`,{strikeBudget:6}),av(`war`,`Боевой сундук`),av(`tournament`,`Турнирный сундук`),av(`fortune`,`Сундук удачи`),av(`crystalRoyal`,`Кристальный королевский сундук`,{supportsChoices:!0}),av(`royal`,`Королевский сундук`),av(`crown`,`Коронный сундук`)],sv=new Map(ov.map(e=>[e.id,e])),cv={silver:`Быстрый и лёгкий, холодный свет`,golden:`Пружинистая посадка и золотые искры`,giant:`Тяжёлая крышка и много карт`,magical:`Пульсирующая магия и эпические карты`,epic:`Только эпические награды`,legendary:`Гарантированная легендарная карта`,lightning:`После наград — 3 удара молнии`,megaLightning:`После наград — 6 ударов молнии`,war:`Золотая броня и боевой герб`,tournament:`Торжественный и щедрый`,fortune:`Удачная награда в финале`,crystalRoyal:`Выбор наград и шанс чемпиона`,royal:`Кульминация с чемпионом`,crown:`Золотые лучи и самоцветы`};function lv(e){return sv.has(e)}var uv=[`common`,`rare`,`epic`,`legendary`,`champion`],dv={glow:`#bcefff`,glow2:`#4ddfff`,sparks:[`#ffffff`,`#bcefff`,`#4ddfff`],rays:`#bcefff`,mood:`#4ddfff`},fv={glow:`#ffd98a`,glow2:`#ffb52e`,sparks:[`#fff1b0`,`#ffcf58`,`#ffa51a`],rays:`#ffe2a0`,mood:`#ffcf58`},pv={glow:`#f6a0ff`,glow2:`#ba4fff`,sparks:[`#ffe0ff`,`#f283ff`,`#ba4fff`],rays:`#f7b8ff`,mood:`#ba4fff`},mv={glow:`#f4f6ff`,glow2:`#b9c8ff`,sparks:[`#ffffff`,`#bff4ff`,`#ffc4f0`],rays:`#e8f0ff`,mood:`#9fb4ff`},hv={silver:{...dv,tempo:.8,weight:`light`,anticipation:0,burst:`small`,pitch:1.2,overshoot:7},golden:{...fv,tempo:.95,weight:`normal`,anticipation:.05,burst:`medium`,pitch:1.05,overshoot:8},giant:{...fv,glow:`#ffcf70`,tempo:1.25,weight:`heavy`,anticipation:.12,burst:`medium`,pitch:.75,overshoot:4},magical:{...pv,tempo:1.1,weight:`normal`,anticipation:.18,burst:`large`,magic:!0,pitch:1,overshoot:7},epic:{...pv,glow:`#e98bff`,tempo:1.15,weight:`normal`,anticipation:.25,burst:`large`,magic:!0,pitch:.95,overshoot:6},legendary:{...mv,tempo:1.35,weight:`normal`,anticipation:.4,burst:`prism`,magic:!0,pitch:1,overshoot:7},lightning:{...dv,glow:`#a8e6ff`,tempo:.9,weight:`light`,anticipation:.08,burst:`small`,arcs:!0,pitch:1.15,overshoot:8},megaLightning:{...dv,glow:`#9fe0ff`,tempo:1.3,weight:`heavy`,anticipation:.22,burst:`large`,arcs:!0,pitch:.72,overshoot:4},war:{...fv,tempo:1.05,weight:`normal`,anticipation:.1,burst:`medium`,pitch:.95,overshoot:5},tournament:{...pv,tempo:1.15,weight:`normal`,anticipation:.2,burst:`large`,magic:!0,pitch:.95,overshoot:6},fortune:{...pv,glow:`#ff9ef2`,glow2:`#ff5fd8`,tempo:1.1,weight:`normal`,anticipation:.2,burst:`prism`,magic:!0,pitch:1.05,overshoot:7},crystalRoyal:{...mv,glow:`#f3e6ff`,tempo:1.35,weight:`heavy`,anticipation:.35,burst:`prism`,magic:!0,pitch:.85,overshoot:5},royal:{...fv,tempo:1.25,weight:`heavy`,anticipation:.25,burst:`large`,pitch:.85,overshoot:5},crown:{...fv,glow:`#fff0a8`,tempo:1.05,weight:`normal`,anticipation:.12,burst:`medium`,pitch:1.1,overshoot:7}},gv={common:{color:`#cfe9ff`,color2:`#7fc6ff`,sparks:[`#ffffff`,`#bcefff`,`#8fd3ff`],reveal:.65},rare:{color:`#ffd46b`,color2:`#ff9a1f`,sparks:[`#fff1b0`,`#ffcf58`,`#ff9f2a`],reveal:.82},epic:{color:`#f283ff`,color2:`#a23cff`,sparks:[`#ffe0ff`,`#f283ff`,`#b24cff`],reveal:1.1},legendary:{color:`#e8f4ff`,color2:`#ffb8ec`,sparks:[`#ffffff`,`#bff4ff`,`#ffc4f0`,`#e0c8ff`],reveal:1.9},champion:{color:`#ffe08a`,color2:`#4ddfff`,sparks:[`#fff1b0`,`#ffcf58`,`#8fe9ff`],reveal:2.6}},_v={gold:{color:`#ffd46b`,color2:`#ffae2a`,sparks:[`#fff1b0`,`#ffcf58`,`#ffa51a`]},gems:{color:`#8dffb0`,color2:`#28d980`,sparks:[`#e0ffe9`,`#8dffb0`,`#3fe58f`]}};function vv(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}var yv=class{seed;gen;constructor(e){this.seed=e,this.gen=vv(e)}next(){return this.gen()}range(e,t){return e+(t-e)*this.gen()}int(e,t){return Math.floor(this.range(e,t+1-1e-9))}chance(e){return this.gen()<e}pick(e){return e[Math.floor(this.gen()*e.length)%e.length]}sign(){return this.gen()<.5?-1:1}};function bv(...e){let t=2166136261,n=e.join(`|`);for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}function xv(){return typeof crypto<`u`&&`getRandomValues`in crypto?crypto.getRandomValues(new Uint32Array(1))[0]%1e9:Math.floor(Math.random()*1e9)}var Sv=null,Cv=null,wv=null;function Tv(e){let t=document.createElement(`canvas`);t.width=t.height=e;let n=t.getContext(`2d`);if(!n)throw Error(`2D canvas unavailable`);return[t,n]}function Ev(){if(Sv)return Sv;let[e,t]=Tv(512),n=vv(77);t.fillStyle=`#e9d9c6`,t.fillRect(0,0,512,512);for(let e=0;e<5;e++){let r=e*512/5,i=512/5,a=.86+n()*.14;t.fillStyle=`rgba(${Math.round(236*a)},${Math.round(214*a)},${Math.round(190*a)},1)`,t.fillRect(0,r,512,i);for(let e=0;e<26;e++){let e=r+n()*i;t.strokeStyle=`rgba(120,70,40,${.05+n()*.12})`,t.lineWidth=1+n()*2.5,t.beginPath(),t.moveTo(0,e);for(let r=0;r<=512;r+=32)t.lineTo(r,e+Math.sin(r*.02+n()*6)*2.5);t.stroke()}for(let e=0;e<2;e++){let e=n()*512,a=r+i*(.3+n()*.4),o=t.createRadialGradient(e,a,1,e,a,14);o.addColorStop(0,`rgba(90,50,25,0.45)`),o.addColorStop(1,`rgba(90,50,25,0)`),t.fillStyle=o,t.beginPath(),t.ellipse(e,a,18,7,0,0,Math.PI*2),t.fill()}t.fillStyle=`rgba(60,30,15,0.55)`,t.fillRect(0,r,512,3),t.fillStyle=`rgba(255,240,220,0.25)`,t.fillRect(0,r+3,512,2)}return Sv=new yl(e),Sv.colorSpace=Ga,Sv.wrapS=Sv.wrapT=Ci,Sv.repeat.set(.9,.9),Sv.anisotropy=4,Sv}function Dv(){if(Cv)return Cv;let[e,t]=Tv(256),n=vv(19);t.fillStyle=`#f4f4f4`,t.fillRect(0,0,256,256);for(let e=0;e<180;e++){let e=n()*256,r=n()*256,i=6+n()*26,a=t.createRadialGradient(e,r,0,e,r,i),o=n()<.5?`255,255,255`:`200,200,210`;a.addColorStop(0,`rgba(${o},${.05+n()*.08})`),a.addColorStop(1,`rgba(${o},0)`),t.fillStyle=a,t.fillRect(e-i,r-i,i*2,i*2)}return Cv=new yl(e),Cv.colorSpace=Ga,Cv.wrapS=Cv.wrapT=Ci,Cv}function Ov(){if(wv)return wv;let[e,t]=Tv(128),n=vv(5);t.fillStyle=`rgb(128,128,128)`,t.fillRect(0,0,128,128);for(let e=0;e<400;e++){let e=100+Math.floor(n()*70);t.fillStyle=`rgba(${e},${e},${e},0.35)`,t.fillRect(n()*128,n()*128,18+n()*40,1)}return wv=new yl(e),wv.wrapS=wv.wrapT=Ci,wv}function kv(e){e.onBeforeCompile=e=>{e.fragmentShader=e.fragmentShader.replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
#ifdef USE_COLOR
 totalEmissiveRadiance *= vColor.rgb;
#endif`)},e.customProgramCacheKey=()=>`emissive-vcolor`}function Av(e){let t=e=>new ad(e),n=new W(e.glow),r=t({color:e.panel,roughness:.52,metalness:e.panelMetal??.05,map:Dv(),envMapIntensity:e.panelMetal?.9:.55}),i=t({color:e.panel2??e.panel,roughness:.48,metalness:e.panelMetal??.05,map:Dv(),envMapIntensity:e.panelMetal?.9:.55}),a=t({color:e.wood??`#8a5a34`,roughness:.72,metalness:0,map:Ev(),envMapIntensity:.45}),o=t({color:e.metal,roughness:e.metalRough??.3,metalness:.92,roughnessMap:Ov(),envMapIntensity:1}),s=t({color:e.metal2,roughness:e.metal2Rough??.34,metalness:.9,roughnessMap:Ov(),envMapIntensity:.95}),c=t({color:e.dark,roughness:.55,metalness:.35}),l=t({color:e.interior??`#140c22`,roughness:.9,metalness:0,emissive:n,emissiveIntensity:0}),u=t({color:e.interior??`#1a1030`,roughness:.85,metalness:0,emissive:n,emissiveIntensity:0}),d=t({color:e.cushion??`#2b54c9`,roughness:.82,metalness:0}),f=t({color:`#ffcf4a`,roughness:.35,metalness:.85}),p=t({color:`#ffffff`,roughness:.18,metalness:.15,vertexColors:!0,flatShading:!0,emissive:`#ffffff`,emissiveIntensity:.35});kv(p);let m=new od({color:e.gem,emissive:e.gemGlow,emissiveIntensity:.55,roughness:.12,metalness:.05,clearcoat:1,clearcoatRoughness:.06,flatShading:!0,envMapIntensity:1.6}),h=new od({color:e.gem,emissive:e.gemGlow,emissiveIntensity:.45,roughness:.08,metalness:.1,clearcoat:1,clearcoatRoughness:.03,iridescence:1,iridescenceIOR:1.6,iridescenceThicknessRange:[180,700],envMapIntensity:1.8}),g=t({color:e.emblem??`#e8f7ff`,roughness:.25,metalness:.3,emissive:e.emblem??n,emissiveIntensity:.35}),_=t({color:`#0b0a14`,roughness:.6,metalness:.2,emissive:n,emissiveIntensity:0}),v=t({color:`#ffffff`,roughness:.15,metalness:.1,vertexColors:!0,flatShading:!0,emissive:`#ffffff`,emissiveIntensity:.6});kv(v);let y={panel:r,panel2:i,wood:a,metal:o,metal2:s,dark:c,interior:l,lidInner:u,cushion:d,tassel:f,crystal:p};return{byKey:y,gem:m,gemIri:h,emblem:g,keyhole:_,crystalGlow:v,all:[...Object.values(y),m,h,g,_,v]}}var jv=null;function Mv(){if(jv)return jv;let[e,t]=Tv(128),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.25,`rgba(255,255,255,0.65)`),n.addColorStop(.6,`rgba(255,255,255,0.18)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),jv=new yl(e),jv.colorSpace=Ga,jv}var Nv=null;function Pv(){if(Nv)return Nv;let[e,t]=Tv(256),n=t.createRadialGradient(128,128,0,128,128,128);return n.addColorStop(0,`rgba(0,0,0,0.92)`),n.addColorStop(.35,`rgba(0,0,0,0.7)`),n.addColorStop(.7,`rgba(0,0,0,0.22)`),n.addColorStop(1,`rgba(0,0,0,0)`),t.fillStyle=n,t.fillRect(0,0,256,256),Nv=new yl(e),Nv}var Fv=`
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
void main() {
  vUv = uv;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,Iv=`
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
  float edge = pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0), 2.4);
  float fall = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.5) * smoothstep(0.0, 0.1, vUv.y);
  float flick = 0.72 + 0.28 * sin(uTime * 3.1 + vSeed * 17.0 + vUv.y * 5.0);
  float a = edge * fall * flick * uIntensity;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,Lv=`
uniform vec3 uColor;
uniform float uRadius;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float w = 0.05 + 0.05 * uRadius;
  float ring = smoothstep(uRadius - w, uRadius, r) * (1.0 - smoothstep(uRadius, uRadius + w * 0.5, r));
  gl_FragColor = vec4(uColor, ring * uAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,Rv=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,zv=class{group=new Is;state={rays:0,spread:1,core:0,flash:0,ring:0,ringRadius:.1,rayLength:1};rayGroup=new Is;rays=[];rayMat;core;flash;ring;coreMat;flashMat;ringMat;baseAngles=[];baseHeights=[];baseWidths=[];visibleRays=7;scaleUnit=1;constructor(e=8){this.group.name=`CavityFx`,this.rayMat=new rd({vertexShader:Fv,fragmentShader:Iv,uniforms:{uColor:{value:new W(`#ffffff`)},uIntensity:{value:0},uTime:{value:0}},transparent:!0,depthWrite:!1,blending:2,side:2});for(let t=0;t<e;t++){let n=new Ku(1,1);n.translate(0,.5,0),n.setAttribute(`aSeed`,new Dc(new Float32Array(4).fill(t*.137+.21),1));let r=new ll(n,this.rayMat);r.renderOrder=6,this.rays.push(r),this.rayGroup.add(r);let i=e===1?.5:t/(e-1);this.baseAngles.push((i-.5)*1.5+(t%2==0?.05:-.04)),this.baseHeights.push(2.6+t*7%5*.35),this.baseWidths.push(.32+t*3%4*.08)}this.group.add(this.rayGroup),this.coreMat=new Zc({map:Mv(),color:`#ffffff`,transparent:!0,depthWrite:!1,blending:2,opacity:0}),this.core=new ll(new Ku(1,1),this.coreMat),this.core.renderOrder=7,this.flashMat=new Zc({map:Mv(),color:`#ffffff`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,opacity:0}),this.flash=new ll(new Ku(1,1),this.flashMat),this.flash.renderOrder=30,this.ringMat=new rd({vertexShader:Rv,fragmentShader:Lv,uniforms:{uColor:{value:new W(`#bcefff`)},uRadius:{value:.1},uAlpha:{value:0}},transparent:!0,depthWrite:!1,depthTest:!1,blending:2}),this.ring=new ll(new Ku(1,1),this.ringMat),this.ring.renderOrder=29,this.group.add(this.core,this.flash,this.ring)}setQuality(e){this.visibleRays=Math.max(0,Math.min(e,this.rays.length))}setColors(e,t,n){this.rayMat.uniforms.uColor.value.set(e).multiplyScalar(2.2),this.coreMat.color.set(t).multiplyScalar(2.6),this.flashMat.color.set(t).multiplyScalar(1.6),this.ringMat.uniforms.uColor.value.set(n??e).multiplyScalar(2.5)}setScale(e){this.scaleUnit=e}reset(){Object.assign(this.state,{rays:0,spread:1,core:0,flash:0,ring:0,ringRadius:.1,rayLength:1})}update(e,t,n,r){let i=this.state,a=this.scaleUnit;this.group.position.copy(n),this.rayGroup.quaternion.copy(t.quaternion),this.rayMat.uniforms.uTime.value=e,this.rayMat.uniforms.uIntensity.value=i.rays,this.rayGroup.visible=i.rays>.002,this.rays.forEach((t,n)=>{t.visible=n<this.visibleRays;let r=Math.sin(e*.7+n*1.9)*.05;t.rotation.z=(this.baseAngles[n]+r)*i.spread,t.scale.set(this.baseWidths[n]*a,this.baseHeights[n]*a*i.rayLength,1)}),this.core.quaternion.copy(t.quaternion),this.core.visible=i.core>.002,this.coreMat.opacity=Math.min(1,i.core),this.core.scale.setScalar(a*(1.1+i.core*1.2)),this.core.position.set(0,.25*a,0).applyQuaternion(new Ro),this.flash.quaternion.copy(t.quaternion),this.flash.visible=i.flash>.002,this.flashMat.opacity=Math.min(1,i.flash),this.flash.scale.setScalar(a*(2.2+i.flash*3.4)),r?this.flash.position.copy(r).sub(n):this.flash.position.set(0,.35*a,0),this.ring.quaternion.copy(t.quaternion),this.ring.visible=i.ring>.002,this.ringMat.uniforms.uAlpha.value=i.ring,this.ringMat.uniforms.uRadius.value=i.ringRadius,this.ring.scale.setScalar(a*7),this.ring.position.copy(this.flash.position)}dispose(){for(let e of this.rays)e.geometry.dispose();this.rayMat.dispose(),this.core.geometry.dispose(),this.flash.geometry.dispose(),this.ring.geometry.dispose(),this.coreMat.dispose(),this.flashMat.dispose(),this.ringMat.dispose()}},Bv=class{canvas;ctx;dpr=1;bolts=[];impacts=[];coins=[];glints=[];rng=new yv(7);reduced=!1;constructor(e){this.canvas=e;let t=e.getContext(`2d`);if(!t)throw Error(`2D canvas unavailable`);this.ctx=t}resize(e,t,n){this.dpr=Math.min(n,2),this.canvas.width=Math.round(e*this.dpr),this.canvas.height=Math.round(t*this.dpr)}reseed(e){this.rng=new yv(e)}get busy(){return this.bolts.length+this.impacts.length+this.coins.length+this.glints.length>0}clear(){this.bolts=[],this.impacts=[],this.coins=[],this.glints=[],this.ctx.setTransform(1,0,0,1,0,0),this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)}path(e,t,n,r){let i=[e,t],a=Math.hypot(t.x-e.x,t.y-e.y)*r;for(let e=0;e<n;e++){let e=[i[0]];for(let t=0;t<i.length-1;t++){let n=i[t],r=i[t+1],o=(n.x+r.x)/2,s=(n.y+r.y)/2,c=-(r.y-n.y),l=r.x-n.x,u=Math.hypot(c,l)||1,d=(this.rng.next()-.5)*a;e.push({x:o+c/u*d,y:s+l/u*d},r)}i=e,a*=.52}return i}bolt(e,t,n={}){let r=this.path(e,t,6,.28),i=[],a=this.rng.int(2,4);for(let n=0;n<a;n++){let n=r[Math.floor(r.length*(.25+this.rng.next()*.6))],a=Math.hypot(t.x-e.x,t.y-e.y)*(.12+this.rng.next()*.16),o=Math.atan2(t.y-e.y,t.x-e.x)+(this.rng.next()-.5)*1.8;i.push(this.path(n,{x:n.x+Math.cos(o)*a,y:n.y+Math.sin(o)*a},4,.35))}this.bolts.push({pts:r,branches:i,age:0,active:n.active??.12,life:n.life??.36,width:n.width??1,color:n.color??`77,223,255`})}impact(e,t,n=46){let r=Array.from({length:9},()=>({a:this.rng.next()*Math.PI*2,l:.5+this.rng.next()*.8}));this.impacts.push({x:e,y:t,age:0,life:.42,r:n,sparks:r})}glint(e,t,n=26){this.glints.push({x:e,y:t,age:0,life:.55,size:n})}coinsTo(e,t,n,r,i){let a=0;for(let o=0;o<n;o++){let n=o*.045+this.rng.next()*.03,s=.5+this.rng.next()*.18;a=Math.max(a,n+s);let c={x:e.x+(this.rng.next()-.5)*r,y:e.y+(this.rng.next()-.5)*r*.6};this.coins.push({from:c,to:t,ctrl:{x:(c.x+t.x)/2+(this.rng.next()-.5)*160,y:Math.min(c.y,t.y)-60-this.rng.next()*110},age:0,delay:n,dur:s,size:11+this.rng.next()*6,spin:this.rng.next()*6,arrived:!1,onArrive:i})}return a}update(e){for(let t of this.bolts)t.age+=e;for(let t of this.impacts)t.age+=e;for(let t of this.glints)t.age+=e;for(let t of this.coins)t.age+=e,!t.arrived&&t.age>=t.delay+t.dur&&(t.arrived=!0,t.onArrive?.());this.bolts=this.bolts.filter(e=>e.age<e.life),this.impacts=this.impacts.filter(e=>e.age<e.life),this.glints=this.glints.filter(e=>e.age<e.life),this.coins=this.coins.filter(e=>!e.arrived),this.draw()}stroke(e,t,n){let r=this.ctx;r.lineWidth=t,r.strokeStyle=n,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke()}draw(){let e=this.ctx;if(e.setTransform(1,0,0,1,0,0),e.clearRect(0,0,this.canvas.width,this.canvas.height),this.busy){e.setTransform(this.dpr,0,0,this.dpr,0,0),e.lineJoin=`round`,e.lineCap=`round`,e.globalCompositeOperation=`lighter`;for(let t of this.bolts){let n=t.age<t.active,r=n?1:Math.max(0,1-(t.age-t.active)/(t.life-t.active)),i=t.width;e.shadowColor=`rgba(${t.color},0.9)`,e.shadowBlur=22*i,this.stroke(t.pts,14*i,`rgba(${t.color},${.22*r})`),e.shadowBlur=0,this.stroke(t.pts,6*i,`rgba(160,230,255,${(n?.75:.35)*r})`),n&&this.stroke(t.pts,2.4*i,`rgba(255,255,255,1)`);for(let e of t.branches)this.stroke(e,5*i,`rgba(${t.color},${.3*r})`),n&&this.stroke(e,1.6*i,`rgba(235,250,255,${.9*r})`)}for(let t of this.impacts){let n=t.age/t.life,r=1-n,i=e.createRadialGradient(t.x,t.y,0,t.x,t.y,t.r*(.6+n));i.addColorStop(0,`rgba(255,255,255,${r})`),i.addColorStop(.3,`rgba(150,230,255,${.7*r})`),i.addColorStop(1,`rgba(77,223,255,0)`),e.fillStyle=i,e.beginPath(),e.arc(t.x,t.y,t.r*(.6+n),0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(200,245,255,${r})`,e.lineWidth=2;for(let r of t.sparks){let i=t.r*(.3+n*.9),a=i+t.r*.35*r.l*(1-n);e.beginPath(),e.moveTo(t.x+Math.cos(r.a)*i,t.y+Math.sin(r.a)*i),e.lineTo(t.x+Math.cos(r.a)*a,t.y+Math.sin(r.a)*a),e.stroke()}}for(let t of this.glints){let n=t.age/t.life,r=Math.sin(Math.PI*n),i=t.size*(.6+n*.6);e.save(),e.translate(t.x,t.y),e.rotate(n*1.2);let a=e.createRadialGradient(0,0,0,0,0,i*.4);a.addColorStop(0,`rgba(255,255,255,${r})`),a.addColorStop(1,`rgba(255,255,255,0)`),e.fillStyle=a,e.fillRect(-i,-i,i*2,i*2),e.fillStyle=`rgba(255,250,230,${r})`;for(let t of[0,Math.PI/2])e.save(),e.rotate(t),e.beginPath(),e.moveTo(-i,0),e.quadraticCurveTo(0,-i*.08,i,0),e.quadraticCurveTo(0,i*.08,-i,0),e.fill(),e.restore();e.restore()}e.globalCompositeOperation=`source-over`;for(let t of this.coins){let n=Math.max(0,Math.min(1,(t.age-t.delay)/t.dur));if(t.age<t.delay)continue;let r=n<.5?2*n*n:1-(-2*n+2)**2/2,i=(1-r)*(1-r)*t.from.x+2*(1-r)*r*t.ctrl.x+r*r*t.to.x,a=(1-r)*(1-r)*t.from.y+2*(1-r)*r*t.ctrl.y+r*r*t.to.y,o=t.size*(1.15-r*.45),s=Math.abs(Math.cos(t.spin+t.age*9));e.save(),e.translate(i,a),e.scale(.35+s*.65,1);let c=e.createLinearGradient(-o,-o,o,o);c.addColorStop(0,`#fff5c2`),c.addColorStop(.45,`#ffc933`),c.addColorStop(1,`#b86b08`),e.fillStyle=c,e.beginPath(),e.arc(0,0,o,0,Math.PI*2),e.fill(),e.lineWidth=2,e.strokeStyle=`#6e3c04`,e.stroke(),e.strokeStyle=`rgba(255,248,210,0.9)`,e.lineWidth=1.5,e.beginPath(),e.arc(0,0,o*.62,0,Math.PI*2),e.stroke(),e.restore()}}}},Vv=null;function Hv(){if(Vv)return Vv;let e=document.createElement(`canvas`);e.width=256,e.height=64;let t=e.getContext(`2d`),n=t.createRadialGradient(32,32,0,32,32,32);n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.3,`rgba(255,255,255,0.6)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(0,0,64,64),t.save(),t.translate(96,32),n=t.createRadialGradient(0,0,0,0,0,14),n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(-32,-32,64,64);for(let e of[0,Math.PI/2]){t.save(),t.rotate(e);let n=t.createLinearGradient(-31,0,31,0);n.addColorStop(0,`rgba(255,255,255,0)`),n.addColorStop(.5,`rgba(255,255,255,1)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.beginPath(),t.moveTo(-31,0),t.quadraticCurveTo(0,-2.6,31,0),t.quadraticCurveTo(0,2.6,-31,0),t.fill(),t.restore()}t.restore(),t.save(),t.translate(160,32);let r=t.createLinearGradient(0,-32,0,32);r.addColorStop(0,`rgba(255,255,255,0)`),r.addColorStop(.35,`rgba(255,255,255,0.9)`),r.addColorStop(.5,`rgba(255,255,255,1)`),r.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=r,t.beginPath(),t.moveTo(0,-32),t.quadraticCurveTo(5,0,0,32),t.quadraticCurveTo(-5,0,0,-32),t.fill(),t.restore(),t.save(),t.translate(224,32),t.beginPath(),t.moveTo(0,-28),t.lineTo(10,6),t.lineTo(0,28),t.lineTo(-8,2),t.closePath();let i=t.createLinearGradient(-10,-28,10,28);return i.addColorStop(0,`rgba(255,255,255,1)`),i.addColorStop(.5,`rgba(255,255,255,0.55)`),i.addColorStop(1,`rgba(255,255,255,0.9)`),t.fillStyle=i,t.fill(),t.strokeStyle=`rgba(255,255,255,1)`,t.lineWidth=1.5,t.stroke(),t.restore(),Vv=new yl(e),Vv.colorSpace=Ga,Vv}var Uv={dot:0,star:1,streak:2,shard:3},Wv={landingDust:{count:[12,18],life:[.35,.65],speed:[.8,1.7],size:[.06,.12],spread:1.45,gravity:-1.5,drag:3.5,tile:Uv.dot,colors:[`#b8d4f0`,`#6f8fb3`],alpha:`fade`,sizeCurve:`grow`,intensity:.45},lockSparks:{count:[10,16],life:[.2,.45],speed:[1.2,2.8],size:[.03,.055],spread:1.3,dir:[0,.4,1],gravity:-3,drag:2,stretch:.08,tile:Uv.streak,colors:[`#ffffff`,`#ffe9a0`],alpha:`fade`,intensity:2.6},openSmall:{count:[30,42],life:[.35,.8],speed:[2,4.2],size:[.035,.065],spread:.85,gravity:-4,drag:1.6,stretch:.06,tile:Uv.streak,colors:[`#ffffff`,`#bcefff`],colorMode:`pick`,alpha:`fade`,intensity:2.4},openMedium:{count:[50,70],life:[.4,.9],speed:[2.2,4.8],size:[.035,.07],spread:.9,gravity:-4,drag:1.5,stretch:.06,tile:Uv.streak,colors:[`#ffffff`],colorMode:`pick`,alpha:`fade`,intensity:2.6},openLarge:{count:[70,90],life:[.45,1],speed:[2.4,5.4],size:[.04,.075],spread:.95,gravity:-4,drag:1.4,stretch:.06,tile:Uv.streak,colors:[`#ffffff`],colorMode:`pick`,alpha:`fade`,intensity:2.8},openPrism:{count:[70,90],life:[.45,1],speed:[2.4,5.4],size:[.04,.075],spread:.95,gravity:-4,drag:1.4,stretch:.06,tile:Uv.streak,colors:[`#ffffff`],colorMode:`rainbow`,alpha:`fade`,intensity:2.6},stars:{count:[4,9],life:[.6,1.15],speed:[.3,1.1],size:[.16,.34],shape:`sphere`,radius:.5,tile:Uv.star,spin:1.2,colors:[`#ffffff`],alpha:`inout`,sizeCurve:`pop`,intensity:2.2,drag:1.5},cardSparks:{count:[24,38],life:[.3,.7],speed:[1.2,3.2],size:[.03,.06],shape:`sphere`,radius:.25,tile:Uv.streak,stretch:.05,drag:2.6,colors:[`#ffffff`],colorMode:`pick`,alpha:`fade`,intensity:2.4},radial:{count:[18,36],life:[.2,.55],speed:[6,12],size:[.05,.085],shape:`radial`,radius:.35,stretch:.12,tile:Uv.streak,drag:1.4,colors:[`#ffffff`],colorMode:`pick`,alpha:`fade`,intensity:3.2},shards:{count:[8,14],life:[1,1.6],speed:[1.1,2.6],size:[.12,.22],shape:`sphere`,radius:.3,tile:Uv.shard,spin:5,colors:[`#ffffff`],colorMode:`rainbow`,drag:1.3,gravity:-.9,alpha:`late`,sizeCurve:`flat`,intensity:1.8},motes:{count:[6,10],life:[1.6,2.6],speed:[.08,.3],size:[.04,.08],shape:`sphere`,radius:.9,tile:Uv.dot,colors:[`#ffffff`],colorMode:`pick`,alpha:`inout`,sizeCurve:`flat`,drag:.5,gravity:.18,intensity:1.6},magicIdle:{count:[1,2],life:[.8,1.4],speed:[.15,.45],size:[.07,.13],shape:`box`,box:[2.2,1.2,1.4],tile:Uv.star,spin:1,colors:[`#ffffff`],colorMode:`pick`,alpha:`inout`,sizeCurve:`pop`,gravity:.3,drag:.8,intensity:1.8},rising:{count:[18,28],life:[.6,1.1],speed:[.6,1.8],size:[.04,.08],shape:`sphere`,radius:.35,dir:[0,1,0],spread:.5,tile:Uv.dot,colors:[`#ffffff`],colorMode:`pick`,alpha:`inout`,gravity:.6,drag:.6,intensity:2.2},arcSparks:{count:[8,14],life:[.15,.35],speed:[1.5,3.5],size:[.025,.045],spread:Math.PI,tile:Uv.streak,stretch:.1,drag:2.5,colors:[`#ffffff`,`#8fe6ff`],colorMode:`pick`,alpha:`fade`,intensity:3}},Gv=`
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec4 iCol;
attribute vec4 iMisc; // size, stretch, rotation, tile
varying vec2 vUv;
varying vec4 vCol;
varying float vTile;
void main() {
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  vec3 vel = (modelViewMatrix * vec4(iVel, 0.0)).xyz;
  vec2 corner = position.xy;
  float speed = length(vel.xy);
  vec2 ax;
  vec2 ay;
  if (iMisc.y > 0.0 && speed > 1e-4) {
    ay = vel.xy / speed;
    ax = vec2(ay.y, -ay.x);
    corner.y *= 1.0 + iMisc.y * speed;
  } else {
    float c = cos(iMisc.z);
    float s = sin(iMisc.z);
    ax = vec2(c, s);
    ay = vec2(-s, c);
  }
  mv.xy += (ax * corner.x + ay * corner.y) * iMisc.x;
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vCol = iCol;
  vTile = iMisc.w;
}
`,Kv=`
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vCol;
varying float vTile;
void main() {
  vec4 t = texture2D(uAtlas, vec2((vUv.x + vTile) * 0.25, vUv.y));
  float a = t.a * vCol.a;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vCol.rgb * t.rgb, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,qv=new W,Jv=class e{mesh;capacity;quality=1;count=0;rng=new yv(1);geo;aPos;aVel;aCol;aMisc;pos;vel;f;c0;c1;modes;static F=11;ambientTarget=0;ambientAlive=0;ambientTimer=0;ambientBox=new oc(new U(-4,.2,-2.5),new U(4,4.2,2.5));camRight=new U(1,0,0);camUp=new U(0,1,0);camFwd=new U(0,0,-1);constructor(t=2400){this.capacity=t;let n=new Ku(1,1);this.geo=new qd,this.geo.index=n.index,this.geo.setAttribute(`position`,n.getAttribute(`position`)),this.geo.setAttribute(`uv`,n.getAttribute(`uv`));let r=e=>{let n=new pl(new Float32Array(t*e),e);return n.setUsage(Za),n};this.aPos=r(3),this.aVel=r(3),this.aCol=r(4),this.aMisc=r(4),this.geo.setAttribute(`iPos`,this.aPos),this.geo.setAttribute(`iVel`,this.aVel),this.geo.setAttribute(`iCol`,this.aCol),this.geo.setAttribute(`iMisc`,this.aMisc),this.geo.instanceCount=0;let i=new rd({vertexShader:Gv,fragmentShader:Kv,uniforms:{uAtlas:{value:Hv()}},transparent:!0,depthWrite:!1,depthTest:!0,blending:2});this.mesh=new ll(this.geo,i),this.mesh.frustumCulled=!1,this.mesh.renderOrder=20,this.mesh.name=`Particles`,this.pos=new Float32Array(t*3),this.vel=new Float32Array(t*3),this.f=new Float32Array(t*e.F),this.c0=new Float32Array(t*3),this.c1=new Float32Array(t*3),this.modes=new Uint8Array(t*4)}get alive(){return this.count}reseed(e){this.rng=new yv(e)}setCamera(e){this.camRight.setFromMatrixColumn(e.matrixWorld,0).normalize(),this.camUp.setFromMatrixColumn(e.matrixWorld,1).normalize(),this.camFwd.setFromMatrixColumn(e.matrixWorld,2).normalize().negate()}setAmbient(e,t){this.ambientTarget=e,t&&this.ambientBox.copy(t)}clear(e=!0){if(!e){this.count=0,this.ambientAlive=0;return}let t=0;for(;t<this.count;)this.modes[t*4+3]===1?t++:this.kill(t)}burst(t,n,r={}){let i=this.rng,a=Math.round((r.count??i.int(t.count[0],t.count[1]))*(r.countScale??1)*this.quality),o=r.dir?r.dir.clone().normalize():new U(...t.dir??[0,1,0]).normalize(),s=r.colors??t.colors;for(let c=0;c<a;c++){if(this.count>=this.capacity)return;let a=this.count++,c=a*3,l=n.x,u=n.y,d=n.z,f=t.shape??`point`;if(f===`sphere`){let e=Yv(i),n=(t.radius??.3)*Math.cbrt(i.next());l+=e.x*n,u+=e.y*n,d+=e.z*n}else if(f===`box`){let e=t.box??[1,1,1];l+=(i.next()-.5)*e[0],u+=(i.next()-.5)*e[1],d+=(i.next()-.5)*e[2]}let p,m,h,g=i.range(t.speed[0],t.speed[1])*(r.speedScale??1);if(f===`radial`){let e=i.next()*Math.PI*2,n=Math.cos(e),r=Math.sin(e),a=(i.next()-.5)*.3;p=(this.camRight.x*n+this.camUp.x*r+this.camFwd.x*a)*g,m=(this.camRight.y*n+this.camUp.y*r+this.camFwd.y*a)*g,h=(this.camRight.z*n+this.camUp.z*r+this.camFwd.z*a)*g;let o=t.radius??0;l+=p/Math.max(g,1e-5)*o,u+=m/Math.max(g,1e-5)*o,d+=h/Math.max(g,1e-5)*o}else{let e=Qv(i,o,t.spread??Math.PI);p=e.x*g,m=e.y*g,h=e.z*g}this.pos[c]=l,this.pos[c+1]=u,this.pos[c+2]=d,this.vel[c]=p,this.vel[c+1]=m,this.vel[c+2]=h;let _=a*e.F;this.f[_]=0,this.f[_+1]=i.range(t.life[0],t.life[1]),this.f[_+2]=i.range(t.size[0],t.size[1])*(r.sizeScale??1),this.f[_+3]=i.next()*Math.PI*2,this.f[_+4]=(t.spin??0)*(i.next()-.5)*2,this.f[_+5]=t.drag??0,this.f[_+6]=t.gravity??0,this.f[_+7]=t.stretch??0,this.f[_+8]=t.tile,this.f[_+9]=(r.intensity??1)*(t.intensity??1),this.f[_+10]=i.next();let v=t.colorMode??`life`,y=s[v===`pick`?i.int(0,s.length-1):0],b=s[v===`pick`?i.int(0,s.length-1):Math.min(1,s.length-1)];qv.set(y),this.c0[c]=qv.r,this.c0[c+1]=qv.g,this.c0[c+2]=qv.b,qv.set(v===`pick`?y:b),this.c1[c]=qv.r,this.c1[c+1]=qv.g,this.c1[c+2]=qv.b;let x=a*4;this.modes[x]=[`fade`,`inout`,`flash`,`late`].indexOf(t.alpha??`fade`),this.modes[x+1]=[`shrink`,`grow`,`pop`,`flat`].indexOf(t.sizeCurve??`shrink`),this.modes[x+2]=+(v===`rainbow`),this.modes[x+3]=0}}trail(e,t,n,r=1.6){this.burst({count:[1,1],life:[.28,.45],speed:[.05,.25],size:[n*.7,n],tile:0,colors:[t,t],alpha:`fade`,sizeCurve:`shrink`,drag:2},e,{count:1,intensity:r})}spawnAmbient(){if(this.count>=this.capacity)return;let e=this.rng,t=this.ambientBox,n=new U(e.range(t.min.x,t.max.x),e.range(t.min.y,t.max.y),e.range(t.min.z,t.max.z));this.burst({count:[1,1],life:[4,7.5],speed:[.03,.12],size:[.025,.06],tile:0,colors:[`#9fdcff`,`#d6f3ff`],colorMode:`pick`,alpha:`inout`,sizeCurve:`flat`,dir:[0,1,0],spread:1.2,intensity:.55},n,{count:1}),this.modes[(this.count-1)*4+3]=1,this.ambientAlive++}kill(t){let n=--this.count;this.modes[t*4+3]===1&&this.ambientAlive--,t!==n&&(this.pos.copyWithin(t*3,n*3,n*3+3),this.vel.copyWithin(t*3,n*3,n*3+3),this.c0.copyWithin(t*3,n*3,n*3+3),this.c1.copyWithin(t*3,n*3,n*3+3),this.f.copyWithin(t*e.F,n*e.F,(n+1)*e.F),this.modes.copyWithin(t*4,n*4,n*4+4))}update(t){if(t>0&&this.ambientTarget>0){this.ambientTimer-=t;let e=Math.round(this.ambientTarget*Math.max(.5,this.quality));this.ambientAlive<e&&this.ambientTimer<=0&&(this.spawnAmbient(),this.ambientTimer=.18)}let n=e.F,r=0;for(;r<this.count;){let e=r*n,i=this.f[e]+t;if(i>=this.f[e+1]){this.kill(r);continue}this.f[e]=i;let a=r*3,o=Math.exp(-this.f[e+5]*t);this.vel[a]=this.vel[a]*o,this.vel[a+1]=(this.vel[a+1]+this.f[e+6]*t)*o,this.vel[a+2]=this.vel[a+2]*o,this.pos[a]=this.pos[a]+this.vel[a]*t,this.pos[a+1]=this.pos[a+1]+this.vel[a+1]*t,this.pos[a+2]=this.pos[a+2]+this.vel[a+2]*t,this.f[e+3]=this.f[e+3]+this.f[e+4]*t,r++}this.writeAttributes()}writeAttributes(){let t=e.F,n=this.aPos.array,r=this.aVel.array,i=this.aCol.array,a=this.aMisc.array;for(let e=0;e<this.count;e++){let o=e*3,s=e*4,c=e*t,l=this.f[c]/this.f[c+1];n[o]=this.pos[o],n[o+1]=this.pos[o+1],n[o+2]=this.pos[o+2],r[o]=this.vel[o],r[o+1]=this.vel[o+1],r[o+2]=this.vel[o+2];let u=this.modes[s],d=u===0?1-l*l:u===1?Math.sin(Math.PI*l):u===2?l<.08?l/.08:(1-(l-.08)/.92)**2:l<.5?1:1-(l-.5)*2,f=this.modes[s+1],p=f===0?1-l*.85:f===1?.35+l*.9:f===2?l<.2?.4+l*3.2:1.04-(l-.2)*.9:1,m=this.f[c+9];this.modes[s+2]===1?(qv.setHSL((this.f[c+10]+l*.55)%1,.75,.72),i[s]=qv.r*m,i[s+1]=qv.g*m,i[s+2]=qv.b*m):(i[s]=(this.c0[o]+(this.c1[o]-this.c0[o])*l)*m,i[s+1]=(this.c0[o+1]+(this.c1[o+1]-this.c0[o+1])*l)*m,i[s+2]=(this.c0[o+2]+(this.c1[o+2]-this.c0[o+2])*l)*m),i[s+3]=Math.max(0,d),a[s]=this.f[c+2]*p,a[s+1]=this.f[c+7],a[s+2]=this.f[c+3],a[s+3]=this.f[c+8]}for(let e of[this.aPos,this.aVel,this.aCol,this.aMisc])e.clearUpdateRanges(),e.addUpdateRange(0,Math.max(1,this.count)*e.itemSize),e.needsUpdate=!0;this.geo.instanceCount=this.count}dispose(){this.geo.dispose(),this.mesh.material.dispose()}};function Yv(e){let t=e.next()*2-1,n=e.next()*Math.PI*2,r=Math.sqrt(1-t*t);return new U(r*Math.cos(n),t,r*Math.sin(n))}var Xv=new U(0,1,0),Zv=new Ro;function Qv(e,t,n){let r=Math.cos(Math.min(Math.PI,n)),i=r+(1-r)*e.next(),a=e.next()*Math.PI*2,o=Math.sqrt(Math.max(0,1-i*i)),s=new U(o*Math.cos(a),i,o*Math.sin(a));return Zv.setFromUnitVectors(Xv,t),s.applyQuaternion(Zv)}var $v={silver:{gold:[60,140],cards:[{rarity:`common`,slots:[2,2],amount:[8,20]},{rarity:`rare`,slots:[1,1],amount:[1,4],chance:.6}]},golden:{gold:[180,420],gems:{chance:.3,amount:[2,6]},cards:[{rarity:`common`,slots:[2,2],amount:[18,40]},{rarity:`rare`,slots:[1,1],amount:[4,9]},{rarity:`epic`,slots:[1,1],amount:[1,2],chance:.2}],wild:[{rarity:`common`,amount:[5,12],chance:.3}]},giant:{gold:[600,1200],cards:[{rarity:`common`,slots:[2,2],amount:[60,120]},{rarity:`rare`,slots:[1,2],amount:[16,36]},{rarity:`epic`,slots:[1,1],amount:[1,3],chance:.25}]},magical:{gold:[400,800],cards:[{rarity:`common`,slots:[1,1],amount:[30,60]},{rarity:`rare`,slots:[1,1],amount:[10,20]},{rarity:`epic`,slots:[1,2],amount:[2,5]},{rarity:`legendary`,slots:[1,1],amount:[1,1],chance:.08}],wild:[{rarity:`epic`,amount:[1,3],chance:.35}]},epic:{gold:[150,300],cards:[{rarity:`epic`,slots:[3,3],amount:[2,8]}],wild:[{rarity:`epic`,amount:[2,4],chance:.4}]},legendary:{gold:[200,400],cards:[{rarity:`legendary`,slots:[1,1],amount:[1,1]}],wild:[{rarity:`legendary`,amount:[1,1],chance:.15}]},lightning:{gold:[200,400],cards:[{rarity:`common`,slots:[2,2],amount:[20,40]},{rarity:`rare`,slots:[2,2],amount:[5,12]},{rarity:`epic`,slots:[1,1],amount:[1,3]}]},megaLightning:{gold:[800,1600],cards:[{rarity:`common`,slots:[2,2],amount:[50,90]},{rarity:`rare`,slots:[2,2],amount:[15,30]},{rarity:`epic`,slots:[2,2],amount:[3,6]},{rarity:`legendary`,slots:[1,1],amount:[1,1],chance:.3}]},war:{gold:[700,1400],cards:[{rarity:`common`,slots:[1,1],amount:[40,80]},{rarity:`rare`,slots:[1,1],amount:[12,25]},{rarity:`epic`,slots:[1,1],amount:[3,6]},{rarity:`legendary`,slots:[1,1],amount:[1,1],chance:.3}],wild:[{rarity:`rare`,amount:[5,10],chance:.5}]},tournament:{gold:[1500,3e3],gems:{chance:1,amount:[10,30]},cards:[{rarity:`common`,slots:[2,2],amount:[80,160]},{rarity:`rare`,slots:[2,2],amount:[20,45]},{rarity:`epic`,slots:[2,2],amount:[4,10]},{rarity:`legendary`,slots:[1,1],amount:[1,1],chance:.35}],wild:[{rarity:`common`,amount:[20,40],chance:.6},{rarity:`rare`,amount:[6,12],chance:.5}]},fortune:{gold:[300,600],cards:[{rarity:`common`,slots:[1,1],amount:[30,60]},{rarity:`rare`,slots:[1,1],amount:[8,16]},{rarity:`epic`,slots:[1,1],amount:[2,4]}],lucky:!0},crystalRoyal:{gold:[1e3,2e3],gems:{chance:1,amount:[20,60]},cards:[{rarity:`common`,slots:[1,1],amount:[60,120]},{rarity:`rare`,slots:[1,1],amount:[18,40]},{rarity:`epic`,slots:[1,1],amount:[4,8]}],choices:[{rarity:`epic`,amount:[4,8]},{rarity:`legendary`,amount:[1,1]}],champion:{chance:.4,choice:!0}},royal:{gold:[800,1500],cards:[{rarity:`common`,slots:[1,1],amount:[50,100]},{rarity:`rare`,slots:[1,1],amount:[15,30]},{rarity:`epic`,slots:[1,1],amount:[3,6]},{rarity:`legendary`,slots:[1,1],amount:[1,1],chance:.3}],champion:{chance:.25,choice:!1}},crown:{gold:[300,700],gems:{chance:1,amount:[5,15]},cards:[{rarity:`common`,slots:[1,1],amount:[30,60]},{rarity:`rare`,slots:[1,1],amount:[8,15]},{rarity:`epic`,slots:[1,1],amount:[1,3],chance:.5},{rarity:`legendary`,slots:[1,1],amount:[1,1],chance:.12}]}},ey={common:0,rare:1,epic:2,legendary:3,champion:4};function ty(e,t,n={},r=Date.now()){let i=$v[e],a=sv.get(e);if(!a)throw Error(`Unknown chest ${e}`);let o=new yv(t),s=`${e}-${t.toString(36)}-${r.toString(36)}`,c=0,l=()=>`${s}:${c++}`,u=new Set,d=(e,t)=>{let n=nv(e).filter(e=>e.id!==t),r=n.filter(e=>!u.has(e.id)),i=o.pick(r.length?r:n);return u.add(i.id),i.id},f=(e,t,n)=>({id:l(),kind:`card`,rarity:e,cardId:d(e,n),amount:e===`legendary`||e===`champion`?1:Math.max(1,t)}),p=e=>({kind:`single`,reward:e}),m=(e,t)=>{let n=f(e,o.int(t[0],t[1]));return{kind:`choice`,options:[n,f(e,o.int(t[0],t[1]),n.cardId)]}},h=[];h.push(p({id:l(),kind:`gold`,amount:o.int(i.gold[0],i.gold[1])})),i.gems&&o.chance(i.gems.chance)&&h.push(p({id:l(),kind:`gems`,amount:o.int(i.gems.amount[0],i.gems.amount[1])}));let g=[];for(let e of i.cards){if(e.chance!==void 0&&!o.chance(e.chance))continue;let t=o.int(e.slots[0],e.slots[1]);for(let n=0;n<t;n++)g.push({rank:ey[e.rarity],order:1,slot:p(f(e.rarity,o.int(e.amount[0],e.amount[1])))})}for(let e of i.wild??[])o.chance(e.chance)&&g.push({rank:ey[e.rarity],order:0,slot:p({id:l(),kind:`wildcard`,rarity:e.rarity,amount:o.int(e.amount[0],e.amount[1])})});for(let e of i.choices??[])g.push({rank:ey[e.rarity],order:2,slot:m(e.rarity,e.amount)});let _=i.champion?o.chance(i.champion.chance):!1,v=n.forceRarity??null;if((_||v===`champion`)&&g.push({rank:ey.champion,order:3,slot:i.champion?.choice?m(`champion`,[1,1]):p(f(`champion`,1))}),v&&v!==`champion`&&!g.some(e=>ny(e,v))){let e={common:[20,60],rare:[6,18],epic:[2,6],legendary:[1,1],champion:[1,1]};g.push({rank:ey[v],order:4,slot:p(f(v,o.int(e[v][0],e[v][1])))})}if(g.sort((e,t)=>e.rank-t.rank||e.order-t.order),i.lucky)for(let e=g.length-1;e>=0;e--){let t=g[e].slot;if(t.kind===`single`&&t.reward.kind===`card`&&t.reward.rarity!==`champion`){t.reward.lucky=!0,t.reward.rarity!==`legendary`&&(t.reward.amount=t.reward.amount*2+1);break}}return h.push(...g.map(e=>e.slot)),{id:s,chestId:e,seed:t,slots:h,cursor:0,strikesLeft:a.strikeBudget,collected:!1}}function ny(e,t){let n=e.slot;return n.kind===`single`?n.reward.rarity===t:n.options[0].rarity===t}function ry(e){return e.kind===`single`?e.reward:e.chosen===void 0?void 0:e.options[e.chosen]}function iy(e){return e.kind===`single`?e.reward.rarity:e.options[0].rarity}function ay(e,t,n){let r=e.slots[t];return!r||r.kind!==`choice`||r.chosen!==void 0||e.collected?!1:(r.chosen=n,!0)}function oy(e){return Math.max(0,e.slots.length-e.cursor)}function sy(e){let t=[];for(let n of e.slots){let e=ry(n);e&&t.push(e)}return t}function cy(e){let t=[];return e.slots.forEach((e,n)=>{let r=ry(e);r&&r.kind===`card`&&r.rarity&&r.rarity!==`champion`&&(nv(r.rarity).length<2||t.push(n))}),t}function ly(e,t){if(e.strikesLeft<=0||e.collected||!cy(e).includes(t))return null;let n=e.slots[t],r=ry(n),i=r.rarity,a=new yv(bv(e.seed,`strike`,e.strikesLeft,t,r.cardId??``)),o=new Set(sy(e).map(e=>e.cardId)),s=nv(i).filter(e=>e.id!==r.cardId),c=s.filter(e=>!o.has(e.id)),l=a.pick(c.length?c:s),u={...r,id:`${r.id}~${e.strikesLeft}`,cardId:l.id};return n.kind===`single`?n.reward=u:n.chosen!==void 0&&(n.options[n.chosen]=u),--e.strikesLeft,{index:t,previous:r,next:u}}var uy=new U;function dy(e,t,n,r,i,a){let o=2*Math.PI*i/4,s=Math.max(a-2*i,0),c=Math.PI/4;uy.copy(t),uy[r]=0,uy.normalize();let l=.5*o/(o+s),u=1-uy.angleTo(e)/c;return Math.sign(uy[n])===1?u*l:s/(o+s)+l+l*(1-u)}var fy=class e extends Cl{constructor(e=1,t=1,n=1,r=2,i=.1){let a=r*2+1;if(i=Math.min(e/2,t/2,n/2,i),super(1,1,1,a,a,a),this.type=`RoundedBoxGeometry`,this.parameters={width:e,height:t,depth:n,segments:r,radius:i},a===1)return;let o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;let s=new U,c=new U,l=new U(e,t,n).divideScalar(2).subScalar(i),u=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,p=u.length/6,m=new U,h=.5/a;for(let r=0,a=0;r<u.length;r+=3,a+=2)switch(s.fromArray(u,r),c.copy(s),c.x-=Math.sign(c.x)*h,c.y-=Math.sign(c.y)*h,c.z-=Math.sign(c.z)*h,c.normalize(),u[r+0]=l.x*Math.sign(s.x)+c.x*i,u[r+1]=l.y*Math.sign(s.y)+c.y*i,u[r+2]=l.z*Math.sign(s.z)+c.z*i,d[r+0]=c.x,d[r+1]=c.y,d[r+2]=c.z,Math.floor(r/p)){case 0:m.set(1,0,0),f[a+0]=dy(m,c,`z`,`y`,i,n),f[a+1]=1-dy(m,c,`y`,`z`,i,t);break;case 1:m.set(-1,0,0),f[a+0]=1-dy(m,c,`z`,`y`,i,n),f[a+1]=1-dy(m,c,`y`,`z`,i,t);break;case 2:m.set(0,1,0),f[a+0]=1-dy(m,c,`x`,`z`,i,e),f[a+1]=dy(m,c,`z`,`x`,i,n);break;case 3:m.set(0,-1,0),f[a+0]=1-dy(m,c,`x`,`z`,i,e),f[a+1]=1-dy(m,c,`z`,`x`,i,n);break;case 4:m.set(0,0,1),f[a+0]=1-dy(m,c,`x`,`y`,i,e),f[a+1]=1-dy(m,c,`y`,`x`,i,t);break;case 5:m.set(0,0,-1),f[a+0]=dy(m,c,`x`,`y`,i,e),f[a+1]=1-dy(m,c,`y`,`x`,i,t)}}static fromJSON(t){return new e(t.width,t.height,t.depth,t.segments,t.radius)}};function py(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new zc,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=my(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=my(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function my(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new wc(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}function hy(e,t=Math.PI/3){let n=e.index?e.toNonIndexed():e,r=n.attributes.position,i=r.count,a;if(r.isBufferAttribute===!0&&r.itemSize===3&&r.normalized===!1)a=r.array;else{a=new Float64Array(i*3);for(let e=0;e<i;e++)a[3*e+0]=r.getX(e),a[3*e+1]=r.getY(e),a[3*e+2]=r.getZ(e)}let o=Math.cos(t),s=(1+1e-10)*100,c=i/3,l=new Float64Array(c*3);for(let e=0;e<c;e++){let t=9*e,n=a[t+0],r=a[t+1],i=a[t+2],o=a[t+3],s=a[t+4],c=a[t+5],u=a[t+6],d=a[t+7],f=a[t+8],p=u-o,m=d-s,h=f-c,g=n-o,_=r-s,v=i-c,y=m*v-h*_,b=h*g-p*v,x=p*_-m*g,S=1/(Math.sqrt(y*y+b*b+x*x)||1);l[3*e+0]=y*S,l[3*e+1]=b*S,l[3*e+2]=x*S}let u=new Int32Array(i),d=new Float64Array(i*3),f=1;for(;f<i*2;)f<<=1;let p=f-1,m=new Int32Array(f),h=0;for(let e=0;e<i;e++){let t=3*e,n=Math.trunc(a[t+0]*s),r=Math.trunc(a[t+1]*s),i=Math.trunc(a[t+2]*s),o=(Math.imul(n,73856093)^Math.imul(r,19349663)^Math.imul(i,83492791))&p;for(;;){let t=m[o];if(t===0){let t=3*h;d[t+0]=n,d[t+1]=r,d[t+2]=i,m[o]=h+1,u[e]=h++;break}let a=3*(t-1);if(d[a+0]===n&&d[a+1]===r&&d[a+2]===i){u[e]=t-1;break}o=o+1&p}}let g=new Int32Array(h+1);for(let e=0;e<i;e++)g[u[e]+1]++;for(let e=0;e<h;e++)g[e+1]+=g[e];let _=new Int32Array(i),v=g.slice(0,h);for(let e=0;e<c;e++){let t=3*e;_[v[u[t+0]]++]=e,_[v[u[t+1]]++]=e,_[v[u[t+2]]++]=e}let y=new Float32Array(i*3);for(let e=0;e<c;e++){let t=3*e,n=l[t+0],r=l[t+1],i=l[t+2];for(let e=0;e<3;e++){let a=t+e,s=u[a],c=0,d=0,f=0;for(let e=g[s],t=g[s+1];e<t;e++){let t=3*_[e],a=l[t+0],s=l[t+1],u=l[t+2];n*a+r*s+i*u>o&&(c+=a,d+=s,f+=u)}let p=1/(Math.sqrt(c*c+d*d+f*f)||1);y[3*a+0]=c*p,y[3*a+1]=d*p,y[3*a+2]=f*p}}return n.setAttribute(`normal`,new wc(y,3,!1)),n}function gy(e,t,n,r,i,a){let o=i-t/2,s=a-n/2,c=Math.max(5e-4,Math.min(r,t/2-5e-4,n/2-5e-4));e.moveTo(o+c,s),e.lineTo(o+t-c,s),e.absarc(o+t-c,s+c,c,-Math.PI/2,0,!1),e.lineTo(o+t,s+n-c),e.absarc(o+t-c,s+n-c,c,0,Math.PI/2,!1),e.lineTo(o+c,s+n),e.absarc(o+c,s+n-c,c,Math.PI/2,Math.PI,!1),e.lineTo(o,s+c),e.absarc(o+c,s+c,c,Math.PI,Math.PI*1.5,!1)}function _y(e,t,n,r=0,i=0){let a=new ru;return gy(a,e,t,n,r,i),a}function vy(e,t,n,r=0,i=0){let a=new nu;return gy(a,e,t,n,r,i),a}function yy(e,t,n){let r=e/2,i=t/2;return[[-r+n,-i],[r-n,-i],[r,-i+n],[r,i-n],[r-n,i],[-r+n,i],[-r,i-n],[-r,-i+n]]}function by(e,t,n){return Sy(yy(e,t,n))}function xy(e,t,n){let r=new nu,i=yy(e,t,n);r.moveTo(i[0][0],i[0][1]);for(let e=1;e<i.length;e++)r.lineTo(i[e][0],i[e][1]);return r.closePath(),r}function Sy(e){let t=new ru;t.moveTo(e[0][0],e[0][1]);for(let n=1;n<e.length;n++)t.lineTo(e[n][0],e[n][1]);return t.closePath(),t}function Cy(e){return Sy(e.map(([e,t])=>[-e,t]))}function wy(e){let t=new nu;t.moveTo(-e[0][0],e[0][1]);for(let n=1;n<e.length;n++)t.lineTo(-e[n][0],e[n][1]);return t.closePath(),t}function Ty(e,t){if(t.flat)return e;let n=hy(e,t.crease??.72);return n!==e&&e.dispose(),n}function Ey(e,t,n,r){let i=Math.max(0,Math.min(n,t/2-5e-4)),a=new Vu(e,{depth:Math.max(5e-4,t-2*i),bevelEnabled:i>0,bevelThickness:i,bevelSize:i,bevelSegments:r.segments??3,curveSegments:r.curve??12,steps:1});return a.translate(0,0,i),a}function Dy(e,t,n=.03,r={}){let i=Ey(e,t,n,r);return i.rotateX(-Math.PI/2),Ty(i,r)}function Oy(e,t,n=.02,r={}){return Ty(Ey(e,t,n,r),r)}function ky(e,t,n=.03,r={}){let i=Ey(e,t,n,{curve:24,...r});return i.translate(0,0,-t/2),i.rotateY(Math.PI/2),Ty(i,r)}function Ay(e,t,n,r,i=3){return new fy(e,t,n,i,Math.max(.001,Math.min(r,e/2-.001,t/2-.001,n/2-.001)))}function jy(e){let t=new qu(e,12,6,0,Math.PI*2,0,Math.PI/2);return t.rotateX(Math.PI/2),t.scale(1,1,.75),t}var My=new cs,Ny=new Ro,Py=new vs,Fy=new U,Iy=new U;function Ly(e){Py.set(e.rx??0,e.ry??0,e.rz??0,`XYZ`),Ny.setFromEuler(Py),Fy.set(e.x??0,e.y??0,e.z??0);let t=e.s??1;return Iy.set((e.sx??1)*t,(e.sy??1)*t,(e.sz??1)*t),My.compose(Fy,Ny,Iy).clone()}function Ry(e,t){return e.applyMatrix4(Ly(t)),e}function zy(e,t,n,r,i){let a=e.getAttribute(`position`);for(let e=0;e<a.count;e++){let o=Lo.clamp((a.getY(e)-t)/(n-t),0,1),s=1+r*(o-.5)*2+i*Math.sin(Math.PI*o);a.setX(e,a.getX(e)*s),a.setZ(e,a.getZ(e)*s)}a.needsUpdate=!0,e.computeBoundingBox()}function By(e){let t=e.index?e.toNonIndexed():e;t!==e&&e.dispose(),t.getAttribute(`normal`)||t.computeVertexNormals(),t.getAttribute(`uv`)||t.setAttribute(`uv`,new Dc(new Float32Array(t.getAttribute(`position`).count*2),2));for(let e of Object.keys(t.attributes))e!==`position`&&e!==`normal`&&e!==`uv`&&e!==`color`&&t.deleteAttribute(e);return t}var Vy=class{parts=new Map;add(e,t,n){n&&Ry(t,n);let r=this.parts.get(e)??[];r.push(By(t)),this.parts.set(e,r)}keys(){return[...this.parts.keys()]}merged(e){let t=this.parts.get(e);if(!t||t.length===0)return null;if(t.some(e=>e.getAttribute(`color`))){for(let e of t)if(!e.getAttribute(`color`)){let t=e.getAttribute(`position`).count;e.setAttribute(`color`,new Dc(new Float32Array(t*3).fill(1),3))}}let n=t.length===1?t[0]:py(t,!1);if(!n)throw Error(`merge failed for ${e}`);if(t.length>1)for(let e of t)e.dispose();return n.computeBoundingSphere(),n}};function Hy(e,t){let n=new W(t),r=e.getAttribute(`position`).count,i=new Float32Array(r*3);for(let e=0;e<r;e++)i[e*3]=n.r,i[e*3+1]=n.g,i[e*3+2]=n.b;return e.setAttribute(`color`,new Dc(i,3)),e}function Uy(e,t,n=8){let r=new Wu([new H(1e-4,-t*.55),new H(e,-t*.05),new H(e*.98,t*.08),new H(e*.62,t*.38),new H(1e-4,t*.4)],n),i=r.toNonIndexed();return r.dispose(),i.computeVertexNormals(),i}function Wy(e,t,n){let r=new Vu(_y(e*.7,t*.7,Math.min(e,t)*.06),{depth:n*.35,bevelEnabled:!0,bevelThickness:n*.35,bevelSize:Math.min(e,t)*.15,bevelSegments:1,curveSegments:2});return r.translate(0,0,n*.35),r.computeVertexNormals(),r}var Gy=.04,Ky=.16,qy=.15,Jy=.13,Yy=class{s;m;body=new Vy;lid=new Vy;lock=new Vy;specials=[];d;constructor(e,t){this.s=e,this.m=t,this.d=e.D/2}add(e,t,n,r){(e===`body`?this.body:e===`lid`?this.lid:this.lock).add(t,n,r)}special(e,t,n,r,i){i&&Ry(n,i),this.specials.push({part:e,geo:n,mat:r,role:t})}rivet(e,t,n,r,i,a=0,o=.034){this.add(e,t,jy(o),{x:n,y:r,z:i,ry:a})}lidSurface(e){let{lid:t,lidH:n,H:r}=this.s,i=this.s.lip??.1;if(t===`barrel`||t===`ogee`)return{z:this.d*Math.cos(e),y:r+i+(n-i)*Math.sin(e),tilt:Math.atan2(Math.sin(e)/(n-i),Math.cos(e)/this.d)};if(t===`dome`){let t=Math.min(this.s.W,this.s.D)*.2;return{z:this.d-t+t*Math.cos(e),y:r+n*Math.sin(Math.min(e,Math.PI/2)),tilt:e}}return{z:this.d*.86,y:r+n*.55,tilt:.75}}};function Xy(e,t,n,r,i){let a=t/2,o=[];if(e===`barrel`){o.push([a,0],[a,r]);for(let e=1;e<24;e++){let t=Math.PI*e/24;o.push([a*Math.cos(t),r+(n-r)*Math.sin(t)])}o.push([-a,r],[-a,0])}else if(e===`ogee`){o.push([a,0],[a,r]);for(let e=1;e<26;e++){let t=e/26,i=1-Math.abs(2*t-1),s=.58*Math.sin(i*Math.PI/2)+.42*i;o.push([a*(1-2*t),r+(n-r)*s])}o.push([-a,r],[-a,0])}else if(e===`flat`)o.push([a,0],[a,n*.5],[a-n*.62,n],[-a+n*.62,n],[-a,n*.5],[-a,0]);else if(e===`peaked`)o.push([a,0],[a,n*.34],[a*.14,n],[-a*.14,n],[-a,n*.34],[-a,0]);else if(e===`crystal`)o.push([a,0],[a+.05,n*.26],[a*.46,n*.84],[a*.08,n],[-a*.36,n*.92],[-a+.03,n*.4],[-a,0]);else{let e=Math.min(i,t)*.2;for(let t=0;t<=10;t++){let r=Math.PI/2*(t/10);o.push([a-e+e*Math.cos(r),n*Math.sin(r)])}for(let t=10;t>=0;t--){let r=Math.PI/2*(t/10);o.push([-(a-e+e*Math.cos(r)),n*Math.sin(r)])}}return o}function Zy(e,t,n,r=0){return e.map(([e,i])=>[e*t,r+i*n])}function Qy(e,t){let n=new ru,r=e*.2;return n.moveTo(-e/2,t/2-r),n.quadraticCurveTo(-e/2,t/2,-e/2+r,t/2),n.lineTo(e/2-r,t/2),n.quadraticCurveTo(e/2,t/2,e/2,t/2-r),n.lineTo(e/2,-t*.04),n.quadraticCurveTo(e/2,-t*.34,0,-t/2),n.quadraticCurveTo(-e/2,-t*.34,-e/2,-t*.04),n.closePath(),n}function $y(e){let t=new ru;return t.moveTo(-e*.45,-e*2.1),t.lineTo(e*.45,-e*2.1),t.lineTo(e*.3,-e*.55),t.absarc(0,0,e,-Math.PI*.32,Math.PI*1.32,!1),t.lineTo(-e*.3,-e*.55),t.closePath(),t}function eb(e){return Sy([[.1*e,.5*e],[-.22*e,.02*e],[-.02*e,.02*e],[-.12*e,-.5*e],[.24*e,.06*e],[.03*e,.06*e],[.16*e,.5*e]])}function tb(e,t=.45,n=5){let r=[];for(let i=0;i<n*2;i++){let a=Math.PI/2+i*Math.PI/n,o=i%2==0?e:e*t;r.push([Math.cos(a)*o,Math.sin(a)*o])}return Sy(r)}function nb(e){let t=new ru;return t.moveTo(0,.12*e),t.quadraticCurveTo(.35*e,.4*e,.62*e,.26*e),t.lineTo(.5*e,.14*e),t.lineTo(.6*e,.06*e),t.lineTo(.45*e,-.02*e),t.lineTo(.52*e,-.12*e),t.lineTo(.34*e,-.14*e),t.quadraticCurveTo(.12*e,-.12*e,0,-.1*e),t.closePath(),t}function rb(e,t){let n=new ru;return n.moveTo(0,0),n.quadraticCurveTo(t,e*.5,0,e),n.quadraticCurveTo(-t,e*.5,0,0),n}function ib(e,t,n=40){let r=new wl(e,e*.97,t,n,1);return r.rotateX(Math.PI/2),r.translate(0,0,t/2),r}function ab(e,t){return new Ju(e,t,10,40)}function ob(e,t,n,r){let i=new Tl(e,t,n,1),a=new Tl(e,t*.22,n,1);a.rotateX(Math.PI),a.translate(0,-t*.61,0);let o=new zc,s=i.toNonIndexed(),c=a.toNonIndexed(),l=new Float32Array(s.getAttribute(`position`).array.length+c.getAttribute(`position`).array.length);return l.set(s.getAttribute(`position`).array,0),l.set(c.getAttribute(`position`).array,s.getAttribute(`position`).array.length),o.setAttribute(`position`,new wc(l,3)),o.translate(0,t/2+t*.11,0),o.computeVertexNormals(),i.dispose(),a.dispose(),s.dispose(),c.dispose(),Hy(o,r)}function sb(e){let t=e.s,{W:n,D:r,H:i}=t,a=r/2,o=t.wall??.12,s=t.corner,c=t.footprint===`chamfer`,l=(e,t,n)=>c?by(e,t,n):_y(e,t,n),u=(e,t,n)=>c?xy(e,t,n):vy(e,t,n);if(t.plinthMat!==null){let i=l(n+.1,r+.1,s+.04);e.add(`body`,t.plinthMat??`dark`,Dy(i,Ky,.045))}let d=l(n,r,s);d.holes.push(u(n-2*o,r-2*o,Math.max(.03,s-o))),e.add(`body`,t.bodyMat,Dy(d,i-.05-Ky*.5,.03),{y:Ky*.5});let f=n-2*o-.02,p=r-2*o-.02,m=Math.max(.3,i*.36),h=l(f+.02,p+.02,Math.max(.03,s-o));h.holes.push(u(f-.04,p-.04,Math.max(.02,s-o-.02))),e.add(`body`,`interior`,Dy(h,i-.04-m,.005),{y:m}),e.add(`body`,`interior`,Dy(l(f,p,Math.max(.03,s-o)),.03,.005),{y:m-.02});let g=l(n+.07,r+.07,s+.035);if(g.holes.push(u(n-2*o+.03,r-2*o+.03,Math.max(.03,s-o))),e.add(`body`,t.rimMat??`metal`,Dy(g,qy,.03),{y:i-qy}),t.midBand){let a=l(n+.05,r+.05,s+.025);a.holes.push(u(n-.1,r-.1,Math.max(.03,s-.05))),e.add(`body`,t.rimMat??`metal`,Dy(a,.12,.025),{y:i*.46})}let _=t.strapMat??`metal`,v=t.strapW??.16,y=i-Ky-qy+.06,b=Ky+y/2-.03;for(let r of t.strapXs??[])for(let t of[1,-1]){let o=n/2*r*t;e.add(`body`,_,Ay(v,y,.08,.028),{x:o,y:b,z:a+.004}),e.add(`body`,_,Ay(v,y,.08,.028),{x:o,y:b,z:-a-.004}),e.rivet(`body`,`metal2`,o,.28,a+.045),e.rivet(`body`,`metal2`,o,i-qy-.07,a+.045)}if(t.sideStraps)for(let t of[1,-1])e.add(`body`,_,Ay(.08,y,v,.028),{x:t*(n/2+.004),y:b,z:0}),e.rivet(`body`,`metal2`,t*(n/2+.045),.28,0,t*Math.PI/2),e.rivet(`body`,`metal2`,t*(n/2+.045),i-qy-.07,0,t*Math.PI/2);let x=t.cornerMat??`metal`,S=n/2-(c?s*.35:.035),C=a-(c?s*.35:.035);if(t.corners===`post`||t.corners===`heavy`){let n=t.corners===`heavy`?.27:.2;for(let r of[1,-1])for(let a of[1,-1])e.add(`body`,x,Ay(n,i-.06,n,.05),{x:r*S,y:(i-.06)/2+.03,z:a*C,ry:c?Math.PI/4:0}),a>0&&(e.rivet(`body`,`metal2`,r*S,i*.34,a*C+n/2+.005),e.rivet(`body`,`metal2`,r*S,i*.66,a*C+n/2+.005)),t.corners===`heavy`&&(e.add(`body`,x,Ay(n+.08,.2,n+.08,.06),{x:r*S,y:.1,z:a*C}),e.add(`body`,x,Ay(n+.08,.2,n+.08,.06),{x:r*S,y:i-.1,z:a*C}))}else if(t.corners===`cap`)for(let t of[1,-1])for(let n of[1,-1])e.add(`body`,x,Ay(.25,.26,.25,.07),{x:t*S,y:.14,z:n*C}),e.add(`body`,x,Ay(.25,.26,.25,.07),{x:t*S,y:i-.13,z:n*C}),n>0&&e.rivet(`body`,`metal2`,t*S,i-.13,n*C+.13);cb(e),ub(e)}function cb(e){let t=e.s,{W:n,D:r,H:i,lidH:a}=t,o=r/2,s=t.lip??.1,c=t.lidMat??t.bodyMat,l=n+.06,u=r+.06,d=t.footprint===`chamfer`;if(t.lid===`dome`){let o=Math.min(n,r)*.2,s=new Vu(_y(l-2*o,u-2*o,Math.max(.02,t.corner+.03-o*.5)),{depth:.02,bevelEnabled:!0,bevelThickness:a-.02,bevelSize:o,bevelSegments:7,curveSegments:16});s.rotateX(-Math.PI/2);let d=s.getAttribute(`position`);for(let e=0;e<d.count;e++)d.getY(e)<0&&d.setY(e,0);d.needsUpdate=!0;let f=Ry(s,{y:i});e.add(`lid`,c,f)}else{let n=Xy(t.lid,u,a,s,l),r=t.lid===`crystal`,d=r?.02:.03;if(e.add(`lid`,c,ky(Cy(n),l,d,{flat:r,segments:r?1:3}),{y:i+d}),t.endTrims!==!1){let s=Zy(n,1.035,1.035),c=Zy(n,(o-.1)/o,(a-.11)/a,.06),u=Cy(s);u.holes.push(wy(c));for(let n of[1,-1])e.add(`lid`,t.strapMat??`metal`,ky(u,.07,.02,{flat:r,segments:r?1:2}),{x:n*(l/2-.02),y:i-.005})}}let f=d?by(n+.09,r+.09,t.corner+.04):_y(n+.09,r+.09,t.corner+.045);f.holes.push(d?xy(n-.14,r-.14,Math.max(.03,t.corner-.05)):vy(n-.14,r-.14,Math.max(.03,t.corner-.05))),e.add(`lid`,t.lidRimMat??t.rimMat??`metal`,Dy(f,Jy,.03),{y:i-.006});let p=Xy(t.lid===`dome`?`dome`:t.lid,u,a,s,l),m=Cy(Zy(p,1.045,1.05));m.holes.push(wy(Zy(p,.985,.975,.02)));for(let r of t.strapXs??[])for(let a of[1,-1]){e.add(`lid`,t.strapMat??`metal`,ky(m,t.strapW??.16,.02,{flat:t.lid===`crystal`,segments:2}),{x:n/2*r*a,y:i+.01});let o=e.lidSurface(Math.PI*.5);e.rivet(`lid`,`metal2`,n/2*r*a,o.y+.035,0,0,.032),e.add(`lid`,`metal2`,jy(.032),{x:n/2*r*a,y:o.y+.03,z:0,rx:-Math.PI/2})}if(t.lidCorners)for(let r of[1,-1])for(let a of[1,-1])e.add(`lid`,t.cornerMat??`metal`,Ay(.24,.2,.24,.06),{x:r*(n/2+.01),y:i+.1,z:a*(o+.01)});let h=new Ku(n-.2,r-.2);h.rotateX(Math.PI/2),e.add(`lid`,`lidInner`,h,{y:i-.012});let g=Qy(.16,.2);e.add(`lid`,`metal2`,Oy(g,.05,.015),{y:i+.02,z:o+.035})}function lb(e){return e.d+.035}function ub(e){let t=e.s,n=lb(e),r=t.H-.24,i=e.m.keyhole;switch(t.lock){case`plate`:case`smallPlate`:{let a=t.lock===`plate`?.36:.3;e.add(`lock`,`metal2`,Oy(Qy(a,a*1.22),.07,.025),{y:r,z:n}),e.special(`lock`,`keyhole`,Oy($y(.045),.02,.006),i,{y:r+.03,z:n+.085}),e.rivet(`lock`,`metal`,-a*.32,r+a*.42,n+.09,0,.026),e.rivet(`lock`,`metal`,a*.32,r+a*.42,n+.09,0,.026);break}case`round`:e.add(`lock`,`metal2`,ib(.23,.07),{y:r+.02,z:n}),e.add(`lock`,`metal`,ab(.225,.03),{y:r+.02,z:n+.07}),e.special(`lock`,`keyhole`,Oy($y(.05),.02,.006),i,{y:r+.05,z:n+.075});break;case`double`:e.add(`lock`,`metal2`,Oy(_y(.66,.4,.09),.08,.03),{y:r+.02,z:n});for(let t of[-.16,.16])e.special(`lock`,`keyhole`,Oy($y(.045),.02,.006),i,{x:t,y:r+.05,z:n+.1});for(let t of[-.27,.27])e.rivet(`lock`,`metal`,t,r+.14,n+.1,0,.028),e.rivet(`lock`,`metal`,t,r-.1,n+.1,0,.028);break;case`gemShield`:e.add(`lock`,`metal2`,Oy(Qy(.44,.54),.07,.025),{y:r-.02,z:n}),e.add(`lock`,`metal`,ab(.13,.028),{y:r+.02,z:n+.09}),e.special(`lock`,`gem`,Uy(.12,.14,8),e.m.gem,{y:r+.02,z:n+.1,rx:Math.PI/2});break;case`rectGem`:{let t=_y(.62,.44,.07);t.holes.push(vy(.44,.28,.04)),e.add(`lock`,`metal2`,Oy(t,.08,.025),{y:r+.02,z:n}),e.add(`lock`,`dark`,Oy(_y(.48,.32,.05),.03,.01),{y:r+.02,z:n}),e.special(`lock`,`gem`,Wy(.5,.34,.12),e.m.gem,{y:r+.02,z:n+.02});break}case`bolt`:e.add(`lock`,`metal2`,ib(.22,.07),{y:r+.02,z:n}),e.add(`lock`,`metal`,ab(.215,.025),{y:r+.02,z:n+.07}),e.special(`lock`,`emblem`,Oy(eb(.34),.05,.012),e.m.emblem,{y:r+.02,z:n+.06});break;case`crest`:e.add(`lock`,`metal2`,Oy(Qy(.42,.5),.08,.028),{y:r,z:n}),e.special(`lock`,`gem`,Uy(.1,.12,8),e.m.gem,{y:r+.03,z:n+.1,rx:Math.PI/2});for(let t of[1,-1])e.add(`lock`,`metal`,Oy(nb(.62),.05,.015),{x:t*.17,y:r+.05,z:n+.01,sx:t});break;case`orb`:e.add(`lock`,`metal`,ab(.25,.05),{y:r+.03,z:n+.06}),e.add(`lock`,`metal2`,ib(.24,.05),{y:r+.03,z:n}),e.special(`lock`,`gem`,new qu(.22,40,24),e.m.gemIri,{y:r+.03,z:n+.12,sz:.62});for(let t of[1,-1])e.add(`lock`,`metal`,Oy(rb(.2,.08),.04,.012),{x:t*.26,y:r-.05,z:n+.02,rz:t*1.9});break;case`crystal`:e.add(`lock`,`dark`,Oy(by(.36,.44,.1),.07,.02,{flat:!0,segments:1}),{y:r,z:n}),e.special(`lock`,`crystal`,Hy(new Gu(.15,0),`#e4f3ff`),e.m.crystalGlow,{y:r+.02,z:n+.12,sy:1.35,sz:.55})}}function db(e,t,n){let{W:r,H:i,lidH:a}=e.s,o=(e.s.D+.06)/2,s=a,c=[o+.05,.26*s,.46*o,.84*s],l=[.46*o,.84*s,.08*o,s],u=[[c,.42,.3],[l,.36,.2]],d=n?e.m.crystalGlow:e.m.byKey.crystal;u.forEach(([n,a,o],s)=>{let[c,l,u,f]=n,p=Math.atan2(f-l,c-u),m=(c+u)/2,h=(l+f)/2,g=Math.sin(p),_=Math.cos(p),v=s===0?3:2;for(let n=0;n<v;n++){let c=v===3?(n-1)*r*.3:(n-.5)*r*.34,l=Hy(Oy(by(a,o,.07),.04,.015,{flat:!0,segments:1}),t[(n+s*2)%t.length]);e.special(`lid`,`crystal`,l,d,{x:c,y:i+h+_*.012,z:m+g*.012,rx:-(Math.PI/2-p)})}})}function fb(e,t,n,r,i,a,o,s){for(let c of[1,-1])for(let l=0;l<6;l++){let u=-Math.PI/2+c*(.5+l*.36),d=Math.cos(u)*a,f=Math.sin(u)*a,p=c>0?[-Math.sin(u),Math.cos(u)]:[Math.sin(u),-Math.cos(u)],m=Math.atan2(-p[0],p[1])+c*.38;e.add(t,s,Oy(rb(.16,.058),.035,.01),{x:n+d,y:r+f*Math.cos(o),z:i+f*Math.sin(o),rx:o,rz:m})}}function pb(e,t,n,r,i){let a=new Wu([new H(i*.92,0),new H(i,.16),new H(i-.035,.16),new H(i*.92-.035,0),new H(i*.92,0)],40);e.add(`lid`,`metal`,a,{x:t,y:n,z:r}),e.add(`lid`,`metal`,ab(i*.98,.03),{x:t,y:n+.16,z:r,rx:Math.PI/2}),e.add(`lid`,`metal`,ab(i*.92,.035),{x:t,y:n+.01,z:r,rx:Math.PI/2});for(let a=0;a<5;a++){let o=a/5*Math.PI*2+Math.PI/2,s=t+Math.cos(o)*i*.95,c=r+Math.sin(o)*i*.95;e.add(`lid`,`metal`,new Tl(.075,.24,4),{x:s,y:n+.27,z:c,ry:-o}),e.add(`lid`,`metal2`,new qu(.045,12,8),{x:s,y:n+.41,z:c});let l=o+Math.PI/5;e.special(`lid`,`gem`,Uy(.05,.06,6),e.m.gem,{x:t+Math.cos(l)*i*.99,y:n+.08,z:r+Math.sin(l)*i*.99,rz:-Math.PI/2,ry:-l})}e.add(`lid`,`panel2`,new qu(i*.82,24,12,0,Math.PI*2,0,Math.PI/2),{x:t,y:n+.1,z:r,sy:.55}),e.add(`lid`,`metal2`,new qu(.06,14,10),{x:t,y:n+.3,z:r})}function mb(e,t,n,r,i,a){let o=.92,s=new U(0,1,0).applyEuler(new vs(0,a,i));e.add(`lid`,`wood`,new wl(.024,.024,o,8),{x:t,y:n,z:r,rz:i,ry:a});let c=new U(t,n,r).addScaledVector(s,o/2-.13);for(let t=0;t<3;t++){let n=Oy(Sy([[.02,-.1],[.11,-.05],[.11,.1],[.02,.15]]),.012,.004);n.translate(0,0,-.006),n.rotateY(t*Math.PI*2/3),e.add(`lid`,`panel2`,n,{x:c.x,y:c.y,z:c.z,rz:i,ry:a})}let l=new U(t,n,r).addScaledVector(s,o/2);e.add(`lid`,`metal2`,new qu(.03,8,6),{x:l.x,y:l.y,z:l.z})}var hb={silver:{panel:`#2f7fe0`,metal:`#e6eef8`,metalRough:.24,metal2:`#b7c7db`,dark:`#1b2d4d`,gem:`#9fe8ff`,gemGlow:`#5fd6ff`,glow:`#bcefff`,interior:`#0d1a36`},golden:{panel:`#19b6c9`,metal:`#ffc233`,metalRough:.26,metal2:`#ffa21a`,dark:`#6b3a0e`,gem:`#6ff3ff`,gemGlow:`#29d3ff`,glow:`#ffd27a`,interior:`#2a1406`},giant:{panel:`#7b4a2a`,wood:`#9b6139`,metal:`#9aa6b8`,metalRough:.38,metal2:`#6e7b8e`,dark:`#3a2718`,gem:`#ffd36a`,gemGlow:`#ffae2a`,glow:`#ffcb66`,interior:`#26140a`},magical:{panel:`#8f3cff`,panel2:`#c77dff`,metal:`#3d3456`,metalRough:.34,metal2:`#d7bcff`,dark:`#231937`,gem:`#ff8af5`,gemGlow:`#ff4fe6`,glow:`#f283ff`,interior:`#1d0c33`},epic:{panel:`#7a2fd6`,panel2:`#9d55ff`,metal:`#a3adbf`,metalRough:.3,metal2:`#d6dde9`,dark:`#2b2f3c`,gem:`#e55cff`,gemGlow:`#c52cff`,glow:`#e070ff`,interior:`#1a0b30`},legendary:{panel:`#2c3246`,panel2:`#3a4260`,metal:`#4d5470`,metalRough:.3,metal2:`#d5e4ff`,dark:`#1f2333`,gem:`#e9f4ff`,gemGlow:`#bfe6ff`,glow:`#f4f8ff`,interior:`#101427`},lightning:{panel:`#8b5a33`,wood:`#a06c3f`,metal:`#8594a9`,metalRough:.36,metal2:`#cbd8e8`,dark:`#2e2a2a`,gem:`#c9f1ff`,gemGlow:`#8fdcff`,glow:`#9fe3ff`,interior:`#0e1a2c`,emblem:`#e8f8ff`},megaLightning:{panel:`#56b0ff`,panel2:`#9dd6ff`,metal:`#35445e`,metalRough:.34,metal2:`#aac8e8`,dark:`#1a2436`,gem:`#c9f1ff`,gemGlow:`#8fdcff`,glow:`#8fdcff`,interior:`#0b1628`,emblem:`#eaf9ff`},war:{panel:`#2b56bd`,panel2:`#e0353f`,metal:`#ffc53d`,metalRough:.27,metal2:`#ffe08a`,dark:`#5a3410`,gem:`#ff4f5e`,gemGlow:`#ff2a3c`,glow:`#ffd27a`,interior:`#1d1030`},tournament:{panel:`#27213b`,panel2:`#7b3fe6`,metal:`#ffca45`,metalRough:.27,metal2:`#ffe38f`,dark:`#1a1528`,gem:`#ff7bf2`,gemGlow:`#f24ce4`,glow:`#f283ff`,interior:`#1a0b2e`},fortune:{panel:`#c64cff`,panel2:`#ff7ce0`,metal:`#ffd35a`,metalRough:.25,metal2:`#ffe9a3`,dark:`#4b1d62`,gem:`#2ff0e0`,gemGlow:`#12c9d8`,glow:`#ff8bf0`,interior:`#2a0b36`,cushion:`#2f5bd6`},crystalRoyal:{panel:`#3e2c5c`,panel2:`#6a4b98`,metal:`#dccbff`,metalRough:.25,metal2:`#fff1c4`,dark:`#221736`,gem:`#f3e6ff`,gemGlow:`#d3a8ff`,glow:`#efe0ff`,interior:`#150c26`,cushion:`#2f5bd6`},royal:{panel:`#7a4a2a`,wood:`#8a5430`,metal:`#ffc545`,metalRough:.26,metal2:`#ffe18f`,dark:`#4a2a12`,gem:`#3c7dff`,gemGlow:`#2a5cff`,glow:`#ffd27a`,interior:`#20100a`,cushion:`#2f5bd6`},crown:{panel:`#ffcc4d`,panel2:`#22d0cc`,metal:`#ffc233`,metalRough:.24,metal2:`#fff0b0`,dark:`#7a4a0e`,gem:`#47f0e6`,gemGlow:`#12c9d8`,glow:`#fff0a0`,interior:`#0c3b3d`,panelMetal:.55}},gb={silver:{W:1.9,D:1.34,H:.92,lidH:.62,lip:.12,footprint:`rrect`,corner:.1,lid:`barrel`,bodyMat:`panel`,plinthMat:`metal`,strapXs:[.56],strapW:.17,corners:`post`,lock:`plate`,palette:hb.silver},golden:{W:1.95,D:1.4,H:.86,lidH:.56,footprint:`rrect`,corner:.16,lid:`dome`,bodyMat:`panel`,plinthMat:`metal`,strapXs:[.55],strapW:.21,corners:`cap`,lock:`round`,palette:hb.golden,lidOpen:104},giant:{W:2.25,D:1.55,H:1.24,lidH:.72,lip:.14,footprint:`rrect`,corner:.08,lid:`barrel`,bodyMat:`wood`,plinthMat:`metal`,strapXs:[.62],strapW:.25,midBand:!0,corners:`heavy`,lock:`double`,palette:hb.giant,sideStraps:!0,lidOpen:100},magical:{W:1.86,D:1.32,H:.94,lidH:.76,lip:.1,footprint:`rrect`,corner:.1,taper:.07,lid:`ogee`,bodyMat:`panel`,plinthMat:`dark`,rimMat:`metal`,strapXs:[.6],strapW:.15,strapMat:`metal`,corners:`post`,lock:`gemShield`,palette:hb.magical,extras:e=>{let{W:t,H:n}=e.s;for(let r of[1,-1])e.special(`lid`,`crystal`,ob(.08,.26,5,`#ff9cf7`),e.m.crystalGlow,{x:r*(t/2-.02),y:n+.13,z:e.d+.02,rx:.3});let r=e.lidSurface(Math.PI/2);e.special(`lid`,`gem`,Uy(.08,.1,6),e.m.gem,{y:r.y+.06,z:0,rx:0})}},epic:{W:2.1,D:1.44,H:.78,lidH:.44,footprint:`rrect`,corner:.07,lid:`flat`,bodyMat:`panel`,lidMat:`panel2`,plinthMat:`metal`,rimMat:`metal`,strapXs:[.72],strapW:.2,corners:`heavy`,lock:`rectGem`,palette:hb.epic,lidCorners:!0,lidOpen:108,extras:e=>{let{H:t,lidH:n}=e.s;e.add(`lid`,`metal`,Oy(_y(.9,.12,.05),.04,.015),{y:t+n*.55,z:e.d*.8,rx:-.75})}},legendary:{W:1.96,D:1.44,H:.9,lidH:.72,footprint:`chamfer`,corner:.26,lid:`crystal`,bodyMat:`panel`,lidMat:`panel2`,plinthMat:`metal`,rimMat:`metal2`,lidRimMat:`metal2`,strapXs:[],strapMat:`metal2`,corners:`post`,cornerMat:`metal`,lock:`crystal`,palette:hb.legendary,lidOpen:106,extras:e=>{let{W:t,H:n,lidH:r}=e.s,i=[`#bfe3ff`,`#ffc2ec`,`#d8c8ff`,`#b8fff0`];for(let r=0;r<2;r++){let a=(r===0?-1:1)*t*.24,o=Hy(Oy(by(.46,.4,.1),.05,.02,{flat:!0,segments:1}),i[r]);e.special(`body`,`crystal`,o,e.m.byKey.crystal,{x:a,y:n*.5,z:e.d+.005})}for(let r of[1,-1]){let a=Hy(Oy(by(.5,.38,.1),.05,.02,{flat:!0,segments:1}),i[2]);e.special(`body`,`crystal`,a,e.m.byKey.crystal,{x:r*(t/2+.005),y:n*.5,z:0,ry:Math.PI/2*r})}for(let[t,i,a,o,s]of[[0,.34,0,0,`#e2f2ff`],[-.36,.22,.05,.25,`#ffd0f0`],[.36,.22,.05,-.25,`#c9e6ff`]])e.special(`lid`,`crystal`,ob(.14,i*1.5,5,s),e.m.crystalGlow,{x:t,y:n+r*.9,z:a-.08,rz:o});db(e,i,!1)}},lightning:{W:1.7,D:1.2,H:.8,lidH:.4,footprint:`rrect`,corner:.07,lid:`flat`,bodyMat:`wood`,lidMat:`wood`,plinthMat:`metal`,strapXs:[.62],strapW:.14,corners:`post`,lock:`bolt`,palette:hb.lightning,lidOpen:110},megaLightning:{W:2.3,D:1.6,H:1.18,lidH:.74,footprint:`rrect`,corner:.08,lid:`peaked`,bodyMat:`panel`,lidMat:`panel`,plinthMat:`metal`,rimMat:`metal`,strapXs:[.7],strapW:.26,strapMat:`metal`,corners:`heavy`,lock:`double`,palette:hb.megaLightning,sideStraps:!0,lidCorners:!0,lidOpen:100,extras:e=>{let{W:t,H:n,lidH:r}=e.s;for(let r of[1,-1])e.add(`body`,`metal`,Oy(_y(.52,.5,.08),.05,.02),{x:r*t*.22,y:n*.46,z:e.d+.01}),e.rivet(`body`,`metal2`,r*t*.22-.18,n*.46+.17,e.d+.07),e.rivet(`body`,`metal2`,r*t*.22+.18,n*.46+.17,e.d+.07);e.add(`lid`,`metal2`,Oy(by(.86,.62,.18),.05,.02,{flat:!0,segments:1}),{y:n+r*.55,z:e.d*.6,rx:-.95}),e.add(`lid`,`dark`,Oy(by(.7,.48,.14),.03,.01,{flat:!0,segments:1}),{y:n+r*.555,z:e.d*.63,rx:-.95}),e.special(`lid`,`emblem`,Oy(eb(.78),.07,.015),e.m.emblem,{y:n+r*.57,z:e.d*.66,rx:-.95});for(let r of[1,-1])e.add(`lid`,`metal`,new Tl(.07,.24,6),{x:r*(t/2+.01),y:n+.3,z:e.d+.01})}},war:{W:2,D:1.42,H:.95,lidH:.66,lip:.12,footprint:`rrect`,corner:.1,lid:`barrel`,bodyMat:`panel`,plinthMat:`metal`,strapXs:[.6],strapW:.22,corners:`heavy`,cornerMat:`metal`,lock:`smallPlate`,palette:hb.war,lidCorners:!0,lidOpen:104,extras:e=>{let{H:t}=e.s,n=e.lidSurface(.62);e.add(`lid`,`metal`,Oy(Qy(.62,.72),.07,.025),{y:n.y+.02,z:n.z+.02,rx:-(Math.PI/2-n.tilt)*.55}),e.add(`lid`,`panel2`,Oy(Qy(.46,.55),.05,.02),{y:n.y+.03,z:n.z+.07,rx:-(Math.PI/2-n.tilt)*.55}),e.special(`lid`,`gem`,Uy(.09,.11,8),e.m.gem,{y:n.y+.06,z:n.z+.14,rx:Math.PI/2-(Math.PI/2-n.tilt)*.55});let r=e.lidSurface(Math.PI/2);mb(e,-.18,r.y-.02,.05,-.85,.2),mb(e,.18,r.y-.02,.05,.85,-.2);for(let n of[1,-1])e.add(`body`,`metal`,new Tl(.07,.22,6),{x:n*(e.s.W/2+.03),y:t*.5,z:e.d+.03,rz:-n*Math.PI/2})}},tournament:{W:2,D:1.42,H:.95,lidH:.66,lip:.12,footprint:`rrect`,corner:.1,lid:`barrel`,bodyMat:`panel`,plinthMat:`metal`,strapXs:[.66],strapW:.16,corners:`post`,lock:`smallPlate`,palette:hb.tournament,lidOpen:104,extras:e=>{let{W:t,H:n}=e.s;for(let r of[1,-1])e.add(`body`,`panel2`,Oy(_y(.5,.42,.06),.03,.012),{x:r*t*.23,y:n*.47,z:e.d+.005});let r=e.lidSurface(.55),i=-(Math.PI/2-r.tilt)*.6;e.add(`lid`,`metal`,ib(.3,.07),{y:r.y+.03,z:r.z+.02,rx:i}),e.add(`lid`,`metal2`,ab(.3,.035),{y:r.y+.03,z:r.z+.09,rx:i}),e.special(`lid`,`emblem`,Oy(tb(.18),.05,.015),e.m.emblem,{y:r.y+.04,z:r.z+.1,rx:i}),fb(e,`lid`,0,r.y+.03,r.z+.07,.4,i,`metal`)}},fortune:{W:1.84,D:1.38,H:.9,lidH:.62,footprint:`rrect`,corner:.34,bulge:.07,lid:`dome`,bodyMat:`panel`,plinthMat:`metal`,strapXs:[.62],strapW:.16,corners:`none`,lock:`orb`,palette:hb.fortune,cushion:!0,lidOpen:104,extras:e=>{let{W:t,H:n}=e.s;for(let r of[1,-1])e.special(`body`,`gem`,Uy(.06,.07,6),e.m.gem,{x:r*t*.34,y:n*.46,z:e.d+.07,rx:Math.PI/2}),e.add(`body`,`metal`,ab(.065,.018),{x:r*t*.34,y:n*.46,z:e.d+.07});let r=e.lidSurface(Math.PI/2);e.special(`lid`,`gem`,new qu(.1,24,16),e.m.gemIri,{y:r.y+.05,z:0}),e.add(`lid`,`metal`,ab(.1,.022),{y:r.y+.02,z:0,rx:Math.PI/2})}},crystalRoyal:{W:2.08,D:1.5,H:.94,lidH:.78,footprint:`chamfer`,corner:.28,lid:`crystal`,bodyMat:`panel`,lidMat:`panel`,plinthMat:`metal`,rimMat:`metal`,strapXs:[],strapMat:`metal`,corners:`post`,cornerMat:`metal`,lock:`crystal`,palette:hb.crystalRoyal,cushion:!0,lidOpen:104,extras:e=>{let{W:t,H:n,lidH:r}=e.s,i=[`#9fd8ff`,`#ff9fe0`,`#c6a0ff`,`#8fffe0`,`#ffe39f`];for(let r=0;r<3;r++){let a=(r-1)*t*.26,o=Hy(Oy(by(.32,.46,.1),.06,.02,{flat:!0,segments:1}),i[r]);e.special(`body`,`crystal`,o,e.m.crystalGlow,{x:a,y:n*.5,z:e.d+.005})}for(let r of[1,-1]){let a=Hy(Oy(by(.52,.42,.12),.06,.02,{flat:!0,segments:1}),i[3]);e.special(`body`,`crystal`,a,e.m.crystalGlow,{x:r*(t/2+.005),y:n*.5,z:0,ry:Math.PI/2*r})}for(let a of[1,-1])e.special(`lid`,`crystal`,ob(.17,.66,5,i[a>0?0:1]),e.m.crystalGlow,{x:a*(t/2-.12),y:n+r*.38,z:e.d*.55,rz:-a*.55,rx:.2}),e.special(`lid`,`crystal`,ob(.13,.46,5,i[4]),e.m.crystalGlow,{x:a*(t/2-.1),y:n+r*.5,z:-e.d*.35,rz:-a*.5,rx:-.2});e.special(`lid`,`crystal`,ob(.2,.7,6,`#f1e4ff`),e.m.crystalGlow,{y:n+r*.9,z:-.05}),db(e,i,!0)}},royal:{W:2.04,D:1.48,H:1,lidH:.68,lip:.14,footprint:`rrect`,corner:.12,lid:`barrel`,bodyMat:`wood`,lidMat:`wood`,plinthMat:`metal`,strapXs:[.52],strapW:.2,corners:`heavy`,cornerMat:`metal`,lock:`crest`,palette:hb.royal,cushion:!0,lidCorners:!0,lidOpen:104,extras:e=>{let t=e.lidSurface(.7),n=-(Math.PI/2-t.tilt)*.6;e.add(`lid`,`metal`,Oy(by(.42,.34,.1),.06,.02),{y:t.y+.02,z:t.z+.02,rx:n}),e.special(`lid`,`gem`,Uy(.12,.13,8),e.m.gem,{y:t.y+.03,z:t.z+.09,rx:Math.PI/2+n});for(let r of[1,-1])e.add(`lid`,`metal2`,Oy(rb(.26,.09),.04,.012),{x:r*.28,y:t.y+0,z:t.z+.03,rx:n,rz:r*1.35})}},crown:{W:1.9,D:1.38,H:.86,lidH:.5,footprint:`rrect`,corner:.14,lid:`dome`,bodyMat:`panel`,lidMat:`panel`,plinthMat:`metal`,rimMat:`metal`,strapXs:[.58],strapW:.16,strapMat:`metal2`,corners:`cap`,lock:`gemShield`,palette:hb.crown,lidOpen:104,extras:e=>{let{W:t,H:n}=e.s;for(let r of[1,-1])e.add(`body`,`panel2`,Oy(_y(.46,.34,.08),.03,.012),{x:r*t*.25,y:n*.46,z:e.d+.005});pb(e,0,e.lidSurface(Math.PI/2).y-.02,-.02,.34)}}};function _b(e,t){let n=new Is,r=e.W+.62,i=e.D+.6,a=.3,o=[],s=Ay(r,a,i,.14,5),c=s.getAttribute(`position`);for(let e=0;e<c.count;e++){let t=c.getX(e)/(r/2),n=c.getZ(e)/(i/2),a=c.getY(e),o=(1-Math.min(1,t*t))*(1-Math.min(1,n*n));a>0?c.setY(e,a+o*.06):c.setY(e,a-o*.02)}s.computeVertexNormals(),s.translate(0,a/2,0),o.push(s),n.add(new ll(s,t.byKey.cushion));let l=new Ju(1,.03,8,64);l.rotateX(Math.PI/2),l.scale(r/2-.03,1,i/2-.03),l.translate(0,a*.52,0),o.push(l),n.add(new ll(l,t.byKey.tassel));for(let e of[1,-1])for(let s of[1,-1]){let c=new qu(.06,12,10);c.translate(e*(r/2-.02),a*.55,s*(i/2-.02));let l=new Tl(.07,.2,10);l.translate(e*(r/2+.02),a*.4,s*(i/2+.02)),o.push(c,l),n.add(new ll(c,t.byKey.tassel),new ll(l,t.byKey.tassel))}return{group:n,height:.33999999999999997,geos:o}}function vb(e){let t=gb[e],n=Av(t.palette),r=new Yy(t,n);sb(r),t.extras?.(r);let{W:i,D:a,H:o,lidH:s}=t,c=t.taper??0,l=t.bulge??0,u=c!==0||l!==0,d=e=>{let t=Lo.clamp(e/o,0,1);return 1+c*(t-.5)*2+l*Math.sin(Math.PI*t)},f=d(o),p=[],m=new Is;m.name=`ChestPlacement`;let h=new Is;h.name=`ChestMotion`;let g=new Is;g.name=`ChestImpulse`,m.add(h),h.add(g);let _=null,v=0;if(t.cushion){let e=_b(t,n);_=e.group,_.name=`Cushion`,m.add(_),v=e.height,p.push(...e.geos)}h.position.y=v;let y=new Is;y.name=`Body`,g.add(y);for(let e of r.body.keys()){let t=r.body.merged(e);u&&zy(t,0,o,c,l),p.push(t),y.add(new ll(t,n.byKey[e]))}let b=-(a/2)*f-Gy,x=new Is;x.name=`LidPivot`,x.position.set(0,o,b),g.add(x);let S=e=>{f!==1&&e.scale(f,1,f),e.translate(0,-o,-b)};for(let e of r.lid.keys()){let t=r.lid.merged(e);S(t),p.push(t),x.add(new ll(t,n.byKey[e]))}let C=o-.02,w=a/2*d(o-.24)+.035,T=new Is;T.name=`LockPivot`,T.position.set(0,C,w-(a/2+.035)),g.add(T);let E=new Is;E.position.set(0,-C,0),T.add(E);for(let e of r.lock.keys()){let t=r.lock.merged(e);p.push(t),E.add(new ll(t,n.byKey[e]))}let D=[],O=[],k=[],A=[];for(let e of r.specials){let t=e.geo;e.part===`body`&&u&&zy(t,0,o,c,l),e.part===`lid`&&S(t),p.push(t);let n=new ll(t,e.mat);(e.part===`body`?y:e.part===`lid`?x:E).add(n),(e.role===`gem`?D:e.role===`emblem`?O:e.role===`keyhole`?k:A).push(n)}let j=Ay(i*f+.1,.022,a*f+.1,.01,2);j.translate(0,o+.005,0),p.push(j);let M=new Zc({color:new W(t.palette.glow).multiplyScalar(1.6),transparent:!0,opacity:0,depthWrite:!1,blending:2,toneMapped:!1});n.all.push(M);let N=new ll(j,M);N.name=`Seam`,N.renderOrder=2,g.add(N);let P=t.wall??.12,F=(i-2*P)*f,ee=(a-2*P)*f,te=Math.max(.3,o*.36),ne=new Ku(F*.98,ee*.98);ne.rotateX(-Math.PI/2),p.push(ne);let re=new Zc({color:new W(t.palette.glow).multiplyScalar(1.3),map:bb(),transparent:!0,opacity:0,depthWrite:!1,blending:2,toneMapped:!1});n.all.push(re);let ie=new ll(ne,re);ie.position.y=o-.07,ie.renderOrder=3,ie.name=`InnerGlow`,g.add(ie);let I=new Ud(t.palette.glow,0,3.6,1.7);I.position.set(0,o-.2,.05),I.name=`InnerLight`,g.add(I);let ae=new U(0,o-.18,0),oe=new U(i/2*f+.12,o+s*.72,a/2*.55),se=new U(0,o-.2,w+.12),ce=new U(0,o+s,0);return{id:e,spec:t,root:m,motion:h,impulse:g,bodyGroup:y,lidPivot:x,lockPivot:T,cushion:_,materials:n,gems:D,emblems:O,keyholes:k,crystals:A,seam:N,glowPlane:ie,innerLight:I,dims:{W:i,D:a,H:o,lidH:s,baseY:v,innerW:F,innerD:ee,floorY:te,topScale:f},lidOpenAngle:t.lidOpen??106,anchors:{cavity:ae,counter:oe,emblem:se,top:ce,lockFront:new U(0,o-.24,w+.1)},geometries:p}}var yb=null;function bb(){if(yb)return yb;let e=document.createElement(`canvas`);e.width=e.height=128;let t=e.getContext(`2d`),n=t.createRadialGradient(64,64,4,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.45,`rgba(255,255,255,0.75)`),n.addColorStop(.85,`rgba(255,255,255,0.25)`),n.addColorStop(1,`rgba(255,255,255,0.08)`),t.fillStyle=n,t.fillRect(0,0,128,128),yb=new yl(e),yb.colorSpace=Ga,yb}function xb(e){for(let t of e.geometries)t.dispose();for(let t of e.materials.all)t.dispose();e.root.removeFromParent()}function Sb(){return{enterX:0,enterY:0,enterZ:0,enterTilt:0,scale:1,opacity:1,idle:1,hover:0,squash:0,tiltX:0,tiltZ:0,shake:0,lid:0,lock:0,glow:0,seam:0,charge:0,gemPulse:0}}var Cb=e=>Math.sin(e)*.6+Math.sin(e*2.31+1.3)*.28+Math.sin(e*5.13+.7)*.12,wb=class{id;model;state=Sb();shadow;baseYaw;reducedMotion=!1;phase;lastOpacity=1;shadowMat;tmp=new U;constructor(e){this.id=e,this.model=vb(e),this.baseYaw=-.3,this.phase=e.length*1.37%6.28;let{W:t,D:n,baseY:r}=this.model.dims;this.shadowMat=new Zc({map:Pv(),color:0,transparent:!0,opacity:.75,depthWrite:!1});let i=new Ku((r>0?t+.9:t+.5)*1.12,(r>0?n+.9:n+.45)*1.2);i.rotateX(-Math.PI/2),this.shadow=new ll(i,this.shadowMat),this.shadow.position.y=.003,this.shadow.renderOrder=-1,this.shadow.rotation.y=this.baseYaw,this.shadow.name=`GroundShadow`}get root(){return this.model.root}addTo(e){e.add(this.model.root,this.shadow)}apply(e){let t=this.state,n=this.model,r=this.reducedMotion;n.root.position.set(t.enterX,t.enterY,t.enterZ),n.root.rotation.set(0,this.baseYaw,t.enterTilt),n.root.scale.setScalar(t.scale);let i=r?t.idle*.35:t.idle,a=Math.sin(e*Math.PI*2/3.2+this.phase)*.012*i,o=Math.sin(e*Math.PI*2/4.1+this.phase*1.7)*.018*i;n.motion.position.y=n.dims.baseY+a+t.hover*.028,n.motion.rotation.set(-t.hover*.035,o+t.hover*.05,0);let s=r?0:t.shake,c=s*Cb(e*38+this.phase),l=s*Cb(e*33+2.1);n.impulse.rotation.set(t.tiltX+c,0,t.tiltZ+l);let u=t.squash;n.impulse.scale.set(1+u*.5,1-u,1+u*.5),n.lidPivot.rotation.x=-Lo.degToRad(t.lid),n.lockPivot.rotation.x=-t.lock*.45,n.lockPivot.position.z=(n.lockPivot.userData.z0??=n.lockPivot.position.z)+t.lock*.03;let d=Math.max(0,t.glow);n.innerLight.intensity=d*3.4,n.materials.byKey.interior.emissiveIntensity=d*.22,n.materials.byKey.lidInner.emissiveIntensity=d*.1,n.glowPlane.material.opacity=Math.min(1,d*.75)*t.opacity,n.glowPlane.visible=d>.001,n.seam.material.opacity=Math.min(1,t.seam)*t.opacity,n.seam.visible=t.seam>.001;let f=.5+.5*Math.sin(e*2.1+this.phase),p=t.charge*1.7+t.gemPulse*2.2;if(n.materials.gem.emissiveIntensity=.45+f*.3*t.idle+p+t.hover*.4,n.materials.gemIri.emissiveIntensity=.35+f*.25*t.idle+p*.8+t.hover*.3,n.materials.emblem.emissiveIntensity=.35+f*.3*t.idle+p*1.2+t.hover*.4,n.materials.keyhole.emissiveIntensity=t.charge*2.2+t.lock*2,n.materials.crystalGlow.emissiveIntensity=.55+f*.35+p+d*.4,n.materials.byKey.crystal.emissiveIntensity=.3+f*.2+p*.6,t.opacity!==this.lastOpacity){this.lastOpacity=t.opacity;let e=t.opacity<.999;for(let r of n.materials.all)r!==n.glowPlane.material&&r!==n.seam.material&&(r.transparent=e,r.opacity=t.opacity,r.needsUpdate=!0)}let m=Math.max(0,t.enterY)+Math.max(0,a)*2;this.shadow.position.set(t.enterX,.003,t.enterZ);let h=1+m*.45+t.squash*.25;this.shadow.scale.set(h*t.scale,1,h*t.scale),this.shadowMat.opacity=Math.max(0,(.78-m*.5+t.squash*.4)*t.opacity)}anchor(e,t=new U){return this.model.impulse.updateWorldMatrix(!0,!1),t.copy(this.model.anchors[e]).applyMatrix4(this.model.impulse.matrixWorld)}counterAnchor(e=new U){return this.model.root.updateWorldMatrix(!0,!1),this.tmp.copy(this.model.anchors.counter),this.tmp.y+=this.model.dims.baseY,e.copy(this.tmp).applyMatrix4(this.model.root.matrixWorld)}resetPose(){Object.assign(this.state,Sb())}dispose(){xb(this.model),this.shadow.removeFromParent(),this.shadow.geometry.dispose(),this.shadowMat.dispose()}},Tb={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},Eb=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},Db=new Wd(-1,1,1,-1,0,1),Ob=new class extends zc{constructor(){super(),this.setAttribute(`position`,new Dc([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new Dc([0,2,0,0,2,0],2))}},kb=class{constructor(e){this._mesh=new ll(Ob,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Db)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},Ab=class extends Eb{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof rd?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ed.clone(e.uniforms),this.material=new rd({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new kb(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},jb=class extends Eb{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},Mb=class extends Eb{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},Nb=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new H);this._width=n.width,this._height=n.height,t=new as(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:zi}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Ab(Tb),this.copyPass.material.blending=0,this.timer=new Qd}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}jb!==void 0&&(r instanceof jb?n=!0:r instanceof Mb&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new H);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},Pb={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},Fb=class extends Eb{constructor(){super(),this.isOutputPass=!0,this.uniforms=ed.clone(Pb.uniforms),this.material=new id({name:Pb.name,uniforms:this.uniforms,vertexShader:Pb.vertexShader,fragmentShader:Pb.fragmentShader}),this._fsQuad=new kb(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ko.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},Ib=class extends Eb{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new W}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},Lb={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new W(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},Rb=class e extends Eb{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e===void 0?new H(256,256):new H(e.x,e.y),this.clearColor=new W(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new as(i,a,{type:zi,depthBuffer:!1}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new as(i,a,{type:zi,depthBuffer:!1});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new as(i,a,{type:zi,depthBuffer:!1});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),i=Math.round(i/2),a=Math.round(a/2)}let o=Lb;this.highPassUniforms=ed.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new rd({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let s=[6,10,14,18,22];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new H(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ed.clone(Tb.uniforms),this.blendMaterial=new rd({uniforms:this.copyUniforms,vertexShader:Tb.vertexShader,fragmentShader:Tb.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new W,this._oldClearAlpha=1,this._basic=new Zc,this._fsQuad=new kb(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new H(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);let r=[],i=[];for(let n=1;n<e;n+=2){let a=t[n],o=n+1<e?t[n+1]:0,s=a+o;r.push((n*a+(n+1)*o)/s),i.push(s)}return new rd({defines:{KERNEL_PAIRS:r.length},uniforms:{colorTexture:{value:null},invSize:{value:new H(.5,.5)},direction:{value:new H(.5,.5)},centerWeight:{value:t[0]},gaussianOffsets:{value:r},gaussianWeights:{value:i}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new rd({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Rb.BlurDirectionX=new H(1,0),Rb.BlurDirectionY=new H(0,1);var zb=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`,Bb=`
uniform vec2 uRes;
uniform float uTile;
uniform vec2 uOffset;
uniform float uOpacity;
uniform float uDim;
uniform float uFlash;
uniform vec3 uDeep;
uniform vec3 uDeep2;
uniform vec3 uLight;
uniform vec3 uLight2;
uniform vec3 uMood;
uniform float uMoodAmt;
uniform vec2 uCenter;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 frag = vUv * uRes;
  vec2 p = (frag - 0.5 * uRes + uOffset) / uTile;
  vec2 q = vec2(p.x + p.y, p.y - p.x) * 0.70710678;
  vec2 cell = floor(q);
  vec2 f = fract(q) - 0.5;
  float h = hash(cell);
  float h2 = hash(cell + 17.0);

  float edge = 0.5 - max(abs(f.x), abs(f.y));
  float px = 0.7071 / uTile;
  float seam = smoothstep(0.35 * px, 2.4 * px, edge);

  float bw = 0.085;
  float ur = smoothstep(0.5 - bw, 0.5 - px, f.x);
  float ul = smoothstep(0.5 - bw, 0.5 - px, f.y);
  float dl = smoothstep(0.5 - bw, 0.5 - px, -f.x);
  float dr = smoothstep(0.5 - bw, 0.5 - px, -f.y);
  float bevel = ul * 0.55 + ur * 0.28 - dl * 0.22 - dr * 0.38;
  float pillow = 1.0 - dot(f, f) * 1.25;

  vec2 c = (frag - uCenter * uRes) / uRes.y;
  float lit = exp(-dot(c, c) * 2.6);
  float wide = exp(-dot(c, c) * 0.9);

  vec3 deep = mix(uDeep, uDeep2, h * 0.85);
  vec3 light = mix(uLight, uLight2, h2);
  vec3 col = mix(deep, light, clamp(lit * 0.9 + wide * 0.18, 0.0, 1.0));
  col *= 0.86 + 0.14 * pillow;
  col *= 1.0 + bevel * (0.55 + 0.45 * lit);
  col *= 0.93 + 0.1 * vnoise(q * 2.7 + h * 13.0);
  col *= mix(0.42, 1.0, seam);
  col += uMood * lit * 0.1 * uMoodAmt;

  vec2 vq = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float vig = smoothstep(1.2, 0.18, length(vq));
  col *= mix(0.38, 1.0, vig);
  col *= 1.0 + (hash(floor(frag)) - 0.5) * 0.035;
  col *= 1.0 - 0.5 * uDim;
  col += uFlash * vec3(0.55, 0.75, 1.0) * lit;

  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,Vb=class{mesh;material;constructor(){this.material=new rd({vertexShader:zb,fragmentShader:Bb,depthTest:!1,depthWrite:!1,transparent:!0,uniforms:{uRes:{value:new H(1,1)},uTile:{value:100},uOffset:{value:new H},uOpacity:{value:1},uDim:{value:0},uFlash:{value:0},uDeep:{value:new W(`#06172e`)},uDeep2:{value:new W(`#0a2948`)},uLight:{value:new W(`#15456a`)},uLight2:{value:new W(`#1a557c`)},uMood:{value:new W(`#4ddfff`)},uMoodAmt:{value:.6},uCenter:{value:new H(.5,.52)}}}),this.mesh=new ll(new Ku(2,2),this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=1e3,this.mesh.name=`TileBackground`}resize(e,t,n){let r=this.material.uniforms;r.uRes.value.set(e,t),r.uTile.value=Lo.clamp(t/8.2,56,190),r.uCenter.value.set(.5,1-(n-.12))}get uniforms(){return this.material.uniforms}};function Hb(){let e=document.createElement(`canvas`);e.width=e.height=512;let t=e.getContext(`2d`),n=vv(3);for(let e=0;e<8;e++)for(let r=0;r<8;r++){t.fillStyle=(r+e)%2==0?`#8fb6e6`:`#3f6aa8`,t.fillRect(r*64,e*64,64,64);for(let i=0;i<5;i++)t.strokeStyle=`rgba(255,255,255,${.05+n()*.08})`,t.lineWidth=1+n()*2,t.beginPath(),t.moveTo(r*64+n()*64,e*64),t.quadraticCurveTo(r*64+n()*64,e*64+32,r*64+n()*64,e*64+64),t.stroke();t.strokeStyle=`rgba(10,30,70,0.6)`,t.lineWidth=3,t.strokeRect(r*64+1.5,e*64+1.5,61,61)}let r=new yl(e);return r.colorSpace=Ga,r.wrapS=r.wrapT=Ci,r.repeat.set(6,8),r.anisotropy=8,r}function Ub(){let e=document.createElement(`canvas`);e.width=64,e.height=256;let t=e.getContext(`2d`),n=t.createLinearGradient(0,0,0,256);n.addColorStop(0,`rgba(255,255,255,0.9)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(0,0,64,256);let r=t.createLinearGradient(0,0,64,0);r.addColorStop(0,`rgba(0,0,0,1)`),r.addColorStop(.5,`rgba(0,0,0,0)`),r.addColorStop(1,`rgba(0,0,0,1)`),t.globalCompositeOperation=`destination-out`,t.fillStyle=r,t.fillRect(0,0,64,256);let i=new yl(e);return i.colorSpace=Ga,i}var Wb=class{group=new Is;shafts=[];glowMats=[];disposables=[];time=0;constructor(){this.group.name=`ThroneRoom`,this.group.visible=!1;let e=Hb(),t=new ad({color:`#5a80c0`,roughness:.45,metalness:.08}),n=new ad({color:`#16305e`,roughness:.55,metalness:.1}),r=new ad({color:`#7d9fd8`,map:e,roughness:.3,metalness:.15}),i=new ad({color:`#ffc845`,roughness:.28,metalness:.9}),a=new ad({color:`#2448b8`,roughness:.8,metalness:0}),o=new ad({color:`#0a2a4a`,emissive:`#5ee8ff`,emissiveIntensity:2.4,roughness:.4}),s=new ad({color:`#0a2a4a`,emissive:`#7fdcff`,emissiveIntensity:1.2,roughness:.4});this.glowMats.push(o,s),this.disposables.push(e,t,n,r,i,a,o,s);let c=(e,t,n,r,i,a=0)=>{let o=new ll(e,t);return o.position.set(n,r,i),o.rotation.y=a,this.group.add(o),this.disposables.push(e),o};c(new Ku(40,64).rotateX(-Math.PI/2),r,0,0,-18);for(let e=0;e<6;e++){let n=7.4-e*.35;c(new Cl(n,.24,.62),t,0,.12+e*.24,-3.6-e*.6),c(new Cl(n,.035,.05),s,0,.245+e*.24,-3.29-e*.6)}let l=1.44;c(new Cl(6.6,l,5),t,0,l/2,-9.4);let u=-9.6;c(new Cl(1.7,.55,1.2),i,0,1.72,u),c(new Cl(1.45,.2,1),a,0,2.06,-9.549999999999999),c(new Cl(1.9,2.7,.35),i,0,2.99,-10.15),c(new Cl(1.45,2.2,.1),a,0,2.8899999999999997,-9.94),c(new wl(.95,.95,.35,32,1,!1,0,Math.PI),i,0,4.34,-10.15).rotation.set(Math.PI/2,0,Math.PI/2);for(let e of[1,-1])c(new Cl(.28,.8,1.2),i,e*.95,2.1399999999999997,u),c(new qu(.2,16,12),i,e*.95,4.49,-10.15);let d=-12.2;for(let e of[1,-1])c(new Cl(1.1,6.4,1.1),t,e*3.4,3.488,d),c(new Cl(.12,6,.12),o,e*2.82,3.2,-11.7);let f=c(new Ju(3.4,.55,12,48,Math.PI),t,0,6.6,d);f.rotation.z=0;let p=c(new Ju(2.86,.07,8,48,Math.PI),o,0,6.6,-11.7);p.rotation.z=0;let m=new Zc({color:new W(`#9ff0ff`).multiplyScalar(1.25),map:Mv(),transparent:!0,depthWrite:!1,toneMapped:!1});this.disposables.push(m),c(new Ku(9,12),m,0,5,-13),c(new Cl(24,16,.5),n,0,8,-13.6);for(let e of[-1.6,-5.2,-8.8])for(let n of[1,-1])for(let r of[3.9,6.4]){let i=n*(r+(e<-6?.2:0));c(new Cl(1,.4,1),t,i,.2,e),c(new wl(.34,.38,6.2,20),t,i,3.5,e),c(new Cl(1.05,.34,1.05),t,i,6.75,e);let a=c(new Ju(.45,.05,8,28),o,i,.46,e);a.rotation.x=Math.PI/2}for(let e of[1,-1])c(new Cl(.6,12,30),n,e*8.2,6,-10),c(new Cl(.18,.18,26),s,e*7.8,.3,-8),c(new Cl(.5,1,11),t,e*2.95,1.1,-6.2),c(new Cl(.1,.06,11),o,e*2.7,1.63,-6.2);let h=Ub();this.disposables.push(h);for(let e=0;e<5;e++){let t=new Zc({map:h,color:new W(`#9fe6ff`).multiplyScalar(.35),transparent:!0,blending:2,depthWrite:!1,side:2,toneMapped:!1});this.disposables.push(t);let n=c(new Ku(1.6,14),t,(e-2)*2.6,7,-7-Math.abs(e-2));n.rotation.z=(e-2)*-.12,n.rotation.x=.25,this.shafts.push(n)}let g=new kd(`#aee6ff`,`#0c1a3a`,.55),_=new Kd(`#dff4ff`,.85);_.position.set(-3,9,6);let v=new Ud(`#6fe9ff`,32,18,1.4);v.position.set(0,4,-10.7);let y=new Ud(`#5fd0ff`,10,12,1.5);y.position.set(-4.5,2.5,-4);let b=y.clone();b.position.x=4.5,this.group.add(g,_,v,y,b)}update(e){if(!this.group.visible)return;this.time+=e,this.shafts.forEach((e,t)=>{e.material.opacity=.45+.25*Math.sin(this.time*.9+t*1.7)});let t=1+.12*Math.sin(this.time*2.2);this.glowMats[0].emissiveIntensity=2.4*t}dispose(){for(let e of this.disposables)e.dispose();this.group.removeFromParent()}},Gb=.8,Kb={name:`SanitizeShader`,uniforms:{tDiffuse:{value:null}},vertexShader:`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  bool bad = any(isnan(c)) || any(isinf(c)) || c.r != c.r || c.g != c.g || c.b != c.b;
  gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, 0.0, 32.0);
}`},qb={low:{dpr:1,bloom:!1,samples:0,particles:.4,rays:3,iridescence:!1},medium:{dpr:1.5,bloom:!0,samples:0,particles:.7,rays:5,iridescence:!0},high:{dpr:2,bloom:!0,samples:4,particles:1,rays:7,iridescence:!0}},Jb=new U(0,.8,0),Yb=Lo.degToRad(21),Xb=class{renderer;scene=new Gs;bgScene=new Gs;camera=new Vd(30,1,.1,220);uiCamera=new Vd(30,1,.1,220);background=new Vb;throne=new Wb;accent={push:0,shake:0,bloomBoost:0};layout;quality=`high`;bloomEnabled=!0;pointer=new H;composer=null;bloom=null;rim;key;rimBase=1;tmpA=new U;tmpB=new U;time=0;constructor(e,t={}){this.renderer=new Mh({canvas:e,antialias:!0,powerPreference:`high-performance`,alpha:!1,stencil:!1,preserveDrawingBuffer:!!t.preserveDrawingBuffer}),this.renderer.outputColorSpace=Ga,this.renderer.toneMapping=7,this.renderer.toneMappingExposure=.95,this.renderer.setClearColor(`#06172e`,1),this.bgScene.add(this.background.mesh,this.throne.group),this.bgScene.fog=new Ws(`#071c44`,10,38);let n=new kd(`#d6ebff`,`#28324f`,.8);this.key=new Kd(`#fff3e2`,2.2),this.key.position.set(-4,7.5,6);let r=new Kd(`#8cb6ff`,.7);r.position.set(5.5,2.5,3.5),this.rim=new Kd(`#9fe8ff`,this.rimBase),this.rim.position.set(1.5,4.2,-6.5),this.scene.add(n,this.key,r,this.rim),this.buildEnvironment(),this.layout=this.computeLayout(window.innerWidth,window.innerHeight)}buildEnvironment(){let e=new zf(this.renderer),t=new Gs,n=new rd({side:1,vertexShader:`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.62,0.74,0.95); vec3 mid = vec3(0.2,0.26,0.38); vec3 bot = vec3(0.06,0.07,0.11); vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }`}),r=new ll(new qu(10,32,16),n);t.add(r);let i=[r.geometry,n],a=(e,n,r,a,o,s,c)=>{let l=new Ku(e,n),u=new Zc({color:new W(r).multiplyScalar(a),side:2}),d=new ll(l,u);d.position.set(o,s,c),d.lookAt(0,0,0),t.add(d),i.push(l,u)};a(6,4,`#fff1dc`,2.4,-5,6,5),a(4,6,`#bfe0ff`,1.6,6.5,2,2),a(9,2.2,`#ffffff`,1.6,0,5,-6.5),a(12,12,`#ffffff`,.55,0,9,0),a(3,3,`#ffd9a0`,1.3,-7,1,-2);let o=e.fromScene(t,.035);this.scene.environment=o.texture,this.bgScene.environment=o.texture,this.scene.environmentIntensity=.75;for(let e of i)e.dispose();e.dispose()}computeLayout(e,t){let n=Math.max(1,e),r=Math.max(1,t),i=n/r,a=i<.9,o=Math.tan(Lo.degToRad(this.camera.fov/2)),s=a||i<1.3?.6:.585,c=a?.3:.29,l=a?.31:.5,u=2.45/((a?.52:.48)*2*o*i),d=1.8/((a?.22:.265)*2*o),f=Math.max(u,d,6.5),p=f*.66,m=r/(2*p*o),h=r*(a?.22:.28);return h=Math.min(h,n*(a?.36:.28)/Gb),{width:n,height:r,dpr:Math.min(window.devicePixelRatio||1,qb[this.quality].dpr),portrait:a,chestY:s,cardX:l,cardY:c,distance:f,cardDepth:p,cardWorldH:h/m,cardPxH:h}}resize(e,t){this.layout=this.computeLayout(e,t);let{dpr:n}=this.layout;this.renderer.setPixelRatio(n),this.renderer.setSize(e,t,!1),this.camera.aspect=this.uiCamera.aspect=e/t,this.composer?.setPixelRatio(n),this.composer?.setSize(e,t),this.background.resize(e*n,t*n,this.layout.chestY),this.updateCamera(0)}setQuality(e){this.quality=e;let t=qb[e];if(this.composer?.dispose(),this.composer=null,this.bloom=null,t.bloom){let{width:e,height:n}=this.layout,r=new as(1,1,{type:zi,samples:t.samples}),i=new Nb(this.renderer,r),a=new Ib(this.bgScene,this.camera),o=new Ib(this.scene,this.camera);o.clear=!1,o.clearDepth=!0,this.bloom=new Rb(new H(e,n),.5,.35,1.3),i.addPass(a),i.addPass(o),i.addPass(new Ab(Kb)),i.addPass(this.bloom),i.addPass(new Fb),this.composer=i}this.resize(this.layout.width,this.layout.height)}placeCamera(e,t){let n=this.layout,r=n.distance*(1-t*.05);e.position.set(this.pointer.x*.12,Math.sin(Yb)*r,Math.cos(Yb)*r).add(Jb),e.lookAt(Jb),e.setViewOffset(n.width,n.height,0,-(n.chestY-.5)*n.height,n.width,n.height),e.updateProjectionMatrix()}updateCamera(e){this.time=e,this.placeCamera(this.uiCamera,0),this.placeCamera(this.camera,this.accent.push);let t=this.accent.shake;if(t>1e-4){let n=2*this.layout.cardDepth*Math.tan(Lo.degToRad(this.camera.fov/2))/this.layout.height,r=Math.sin(e*71)*.6+Math.sin(e*133+1.7)*.4,i=Math.sin(e*83+.4)*.6+Math.sin(e*121+2.2)*.4;this.tmpA.setFromMatrixColumn(this.camera.matrixWorld,0).multiplyScalar(r*t*n*5),this.tmpB.setFromMatrixColumn(this.camera.matrixWorld,1).multiplyScalar(i*t*n*5),this.camera.position.add(this.tmpA).add(this.tmpB),this.camera.updateMatrixWorld()}this.bloom&&(this.bloom.strength=.5+this.accent.bloomBoost)}setRimBoost(e){this.rim.intensity=this.rimBase*(1+e*.6),this.key.intensity=2.2*(1+e*.12)}set throneVisible(e){this.throne.group.visible=e}render(e){if(this.throne.update(e),this.composer&&this.bloomEnabled){this.composer.render(e);return}let t=this.renderer;t.setRenderTarget(null),t.autoClear=!1,t.clear(),t.render(this.bgScene,this.camera),t.clearDepth(),t.render(this.scene,this.camera),t.autoClear=!0}toScreen(e,t={x:0,y:0,visible:!0}){return this.tmpA.copy(e).project(this.uiCamera),t.x=(this.tmpA.x*.5+.5)*this.layout.width,t.y=(-this.tmpA.y*.5+.5)*this.layout.height,t.visible=this.tmpA.z<1,t}screenToWorld(e,t,n,r=new U){let i=this.uiCamera;this.tmpA.set(e*2-1,1-t*2,.5).unproject(i).sub(i.position).normalize(),i.getWorldDirection(this.tmpB);let a=n/this.tmpA.dot(this.tmpB);return r.copy(i.position).addScaledVector(this.tmpA,a)}worldPerPixel(e=this.layout.cardDepth){return 2*e*Math.tan(Lo.degToRad(this.camera.fov/2))/this.layout.height}compile(){this.renderer.compile(this.bgScene,this.camera),this.renderer.compile(this.scene,this.camera)}get elapsed(){return this.time}dispose(){this.composer?.dispose(),this.throne.dispose(),this.renderer.dispose()}},Zb=`
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`,Qb=`
uniform sampler2D map;
uniform sampler2D maskMap;
uniform float uIri;
uniform float uSweep;
uniform float uGlow;
uniform vec3 uGlowColor;
uniform float uBright;
uniform float uOpacity;
uniform float uTime;
uniform float uDim;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vec4 base = texture2D(map, vUv);
  if (base.a < 0.04) discard;
  float frame = texture2D(maskMap, vUv).r;
  vec3 n = normalize(vNormalV);
  vec3 v = normalize(-vViewPos);
  float facing = abs(dot(n, v));
  // clamp before squaring: D3D evaluates pow() of a tiny negative base as NaN
  float fres = clamp(1.0 - facing, 0.0, 1.0);
  fres *= fres;
  float phase = vUv.x * 1.1 + vUv.y * 0.8 + n.x * 1.8 + n.y * 1.2 + uTime * 0.12;
  vec3 iri = 0.5 + 0.5 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));
  vec3 col = base.rgb;
  float iriAmt = uIri * frame * (0.45 + 0.55 * fres + 0.25);
  col = mix(col, col * 0.55 + iri * 0.62, clamp(iriAmt, 0.0, 1.0));
  float d = (vUv.x + (1.0 - vUv.y)) * 0.5 - uSweep;
  float band = exp(-d * d * 220.0);
  col += band * (0.25 + 0.75 * frame) * vec3(1.0, 0.97, 0.9) * 0.9;
  col = mix(col, vec3(1.0), clamp(uBright, 0.0, 1.0));
  col += uGlowColor * uGlow * (0.35 + 0.65 * frame);
  col *= 1.0 - uDim;
  gl_FragColor = vec4(col, base.a * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,$b=`
uniform sampler2D map;
uniform float uGlow;
uniform vec3 uGlowColor;
uniform float uBright;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vec4 base = texture2D(map, vUv);
  if (base.a < 0.04) discard;
  vec2 c = vUv - 0.5;
  float rim = smoothstep(0.28, 0.5, max(abs(c.x) / 0.8 * 0.8 + 0.0, abs(c.y)));
  vec3 col = base.rgb + uGlowColor * uGlow * (0.3 + 0.9 * rim) * (0.85 + 0.15 * sin(uTime * 7.0));
  col = mix(col, vec3(1.0), clamp(uBright, 0.0, 1.0));
  gl_FragColor = vec4(col, base.a * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function ex(){return{x:0,y:0,z:0,scale:1,flip:180,tilt:0,roll:0,opacity:0,glow:0,iri:0,sweep:-1,bright:0,halo:0,haloScale:1,hover:0,trail:0,dim:0}}var tx=new Ro,nx=new vs,rx=class{group=new Is;state=ex();reward=null;iridescenceAllowed=!0;front;back;halo;frontMat;backMat;haloMat;geo;unit=1;constructor(){this.geo=new Ku(Gb,1);let e={uGlow:{value:0},uGlowColor:{value:new W(`#ffffff`)},uBright:{value:0},uOpacity:{value:1},uTime:{value:0}};this.frontMat=new rd({vertexShader:Zb,fragmentShader:Qb,uniforms:{...ed.clone(e),map:{value:null},maskMap:{value:null},uIri:{value:0},uSweep:{value:-1},uDim:{value:0}},transparent:!0,depthWrite:!0}),this.backMat=new rd({vertexShader:Zb,fragmentShader:$b,uniforms:{...ed.clone(e),map:{value:X_(`normal`)}},transparent:!0,depthWrite:!0}),this.front=new ll(this.geo,this.frontMat),this.back=new ll(this.geo,this.backMat),this.back.rotation.y=Math.PI,this.front.renderOrder=this.back.renderOrder=12,this.haloMat=new Zc({map:Mv(),color:`#ffffff`,transparent:!0,depthWrite:!1,blending:2,opacity:0}),this.halo=new ll(new Ku(1,1),this.haloMat),this.halo.renderOrder=11,this.halo.position.z=-.05;let t=new Is;t.name=`CardFlip`,t.add(this.front,this.back),this.group.add(this.halo,t),this.group.visible=!1,this.group.name=`Card`}get flipper(){return this.group.children[1]}setReward(e,t=`normal`){this.reward=e;let n=q_(e);this.frontMat.uniforms.map.value=n.map,this.frontMat.uniforms.maskMap.value=n.mask,this.backMat.uniforms.map.value=X_(t)}showFace(e){let t=q_(e);this.frontMat.uniforms.map.value=t.map,this.frontMat.uniforms.maskMap.value=t.mask}setGlowColor(e,t=e){this.frontMat.uniforms.uGlowColor.value.set(e),this.backMat.uniforms.uGlowColor.value.set(e),this.haloMat.color.set(t).multiplyScalar(1.8)}lease=0;reset(){Object.assign(this.state,ex()),this.group.visible=!1}acquire(){this.lease++,Si.killTweensOf(this.state),this.reset()}worldPosition(e=new U){return e.set(this.state.x,this.state.y,this.state.z)}update(e,t){let n=this.state;if(this.group.visible=n.opacity>.001,!this.group.visible)return;this.group.position.set(n.x,n.y,n.z);let r=this.unit*n.scale*(1+n.hover*.06);this.group.scale.setScalar(r),this.group.quaternion.copy(e.quaternion),nx.set(Lo.degToRad(n.tilt),Lo.degToRad(n.flip),Lo.degToRad(n.roll),`ZYX`),tx.setFromEuler(nx),this.flipper.quaternion.copy(tx),this.flipper.position.y=n.hover*.06;let i=this.frontMat.uniforms;i.uIri.value=this.iridescenceAllowed?n.iri:0,i.uSweep.value=n.sweep,i.uGlow.value=n.glow,i.uBright.value=n.bright,i.uOpacity.value=n.opacity,i.uTime.value=t,i.uDim.value=n.dim;let a=this.backMat.uniforms;a.uGlow.value=n.glow,a.uBright.value=n.bright,a.uOpacity.value=n.opacity,a.uTime.value=t,this.halo.visible=n.halo>.002,this.haloMat.opacity=Math.min(1,n.halo)*n.opacity,this.halo.scale.set(2.3*n.haloScale,2.3*n.haloScale,1)}dispose(){this.geo.dispose(),this.halo.geometry.dispose(),this.frontMat.dispose(),this.backMat.dispose(),this.haloMat.dispose()}},ix=class{sm;particles;main=new rx;alt=new rx;left=new rx;right=new rx;trailColor=new Map;tmp=new U;trailAcc=0;constructor(e,t){this.sm=e,this.particles=t;for(let t of this.cards)e.scene.add(t.group)}get cards(){return[this.main,this.alt,this.left,this.right]}nextMain(e){return e===this.main?this.alt:this.main}isChoiceCard(e){return e===this.left||e===this.right}setTrailColor(e,t){this.trailColor.set(e,t)}anchor(e,t=new U){let n=this.sm.layout,r=n.portrait?.25:Math.min(.2,n.cardPxH*.8*1.25/n.width),i=e===`high`?n.cardY-.035:n.cardY+(e===`center`?0:.02),a=e===`left`?.5-r:e===`right`?.5+r:n.cardX;return this.sm.screenToWorld(a,i,n.cardDepth,t)}syncUnits(){let e=this.sm.layout.cardWorldH;for(let t of this.cards)t.unit=e}choiceUnit(){return this.sm.layout.portrait?.82:.9}update(e,t){let n=this.sm.camera;for(let t of this.cards)t.update(n,e);if(this.trailAcc+=t,!(this.trailAcc<1/70)){this.trailAcc=0;for(let e of this.cards)e.state.trail<=.01||!e.group.visible||(e.worldPosition(this.tmp),this.tmp.y-=this.sm.layout.cardWorldH*.3*e.state.scale,this.particles.trail(this.tmp,this.trailColor.get(e)??`#bcefff`,.09*e.state.trail*(this.sm.layout.cardWorldH/1.4),2))}}hideAll(){for(let e of this.cards)e.reset()}dispose(){for(let e of this.cards)e.dispose()}},ax={common:[2,4,10,20,50,100,200,400,800,1e3,2e3,5e3],rare:[2,4,10,20,50,100,200,400,800,1e3],epic:[2,4,10,20,40,50,100,200],legendary:[2,4,6,10,20],champion:[2,4,6,10]},ox={common:1,rare:3,epic:6,legendary:9,champion:11};function sx(e,t,n){let r=ax[e],i=Math.max(0,Math.min(Math.floor(n),r.length)),a=i>=r.length,o=a?r[r.length-1]:r[i],s=Math.max(0,Math.floor(t));return{level:ox[e]+i,have:s,need:o,canUpgrade:!a&&s>=o,maxed:a}}var cx=`treasury.save`,lx=200;function ux(){return{sound:!0,volume:.8,quality:`auto`,speed:1,reducedMotion:!1,auto:!1}}function dx(){return{version:1,gold:0,gems:0,cards:{},upgrades:{},wild:{common:0,rare:0,epic:0,legendary:0,champion:0},openings:0,claimed:[],lastChest:`silver`,settings:ux()}}var fx=(e,t=0)=>typeof e==`number`&&Number.isFinite(e)&&e>=0?Math.floor(e):t;function px(e){let t=ux();if(!e||typeof e!=`object`)return t;let n=e;return{sound:typeof n.sound==`boolean`?n.sound:t.sound,volume:typeof n.volume==`number`&&n.volume>=0&&n.volume<=1?n.volume:t.volume,quality:n.quality===`low`||n.quality===`medium`||n.quality===`high`||n.quality===`auto`?n.quality:t.quality,speed:n.speed===.5||n.speed===1||n.speed===1.5?n.speed:t.speed,reducedMotion:typeof n.reducedMotion==`boolean`?n.reducedMotion:t.reducedMotion,auto:typeof n.auto==`boolean`?n.auto:t.auto}}function mx(e){let t={};if(!e||typeof e!=`object`)return t;for(let[n,r]of Object.entries(e))if(tv.has(n)){let e=fx(r);e>0&&(t[n]=e)}return t}function hx(e){if(!e||typeof e!=`object`)return null;let t=e;if(t.version!==1)return null;let n=dx(),r=t.wild&&typeof t.wild==`object`?t.wild:{},i={...n.wild};for(let e of uv)i[e]=fx(r[e]);return{version:1,gold:fx(t.gold),gems:fx(t.gems),cards:mx(t.cards),upgrades:mx(t.upgrades),wild:i,openings:fx(t.openings),claimed:Array.isArray(t.claimed)?t.claimed.filter(e=>typeof e==`string`).slice(-200):[],lastChest:typeof t.lastChest==`string`&&lv(t.lastChest)?t.lastChest:n.lastChest,settings:px(t.settings)}}function gx(){let e=new Map;return{getItem:t=>e.get(t)??null,setItem:(t,n)=>void e.set(t,n),removeItem:t=>void e.delete(t)}}function _x(){try{let e=`__treasury_probe__`;return window.localStorage.setItem(e,`1`),window.localStorage.removeItem(e),window.localStorage}catch{return gx()}}var vx=class{storage;data;recovered;constructor(e=_x()){this.storage=e;let t=e.getItem(cx),n=null,r=!1;if(t){try{n=hx(JSON.parse(t))}catch{n=null}if(!n){r=!0;try{e.setItem(`${cx}.corrupt`,t.slice(0,2e4))}catch{}}}this.data=n??dx(),this.recovered=r,r&&this.persist()}persist(){try{this.storage.setItem(cx,JSON.stringify(this.data))}catch{}}isClaimed(e){return this.data.claimed.includes(e)}award(e){if(e.collected||this.isClaimed(e.id))return{awarded:!1,gold:0,gems:0};let t=0,n=0;for(let r of sy(e))r.kind===`gold`?t+=r.amount:r.kind===`gems`?n+=r.amount:r.kind===`wildcard`&&r.rarity?this.data.wild[r.rarity]+=r.amount:r.kind===`card`&&r.cardId&&tv.has(r.cardId)&&(this.data.cards[r.cardId]=(this.data.cards[r.cardId]??0)+r.amount);return this.data.gold+=t,this.data.gems+=n,this.data.openings+=1,this.data.claimed.push(e.id),this.data.claimed.length>lx&&this.data.claimed.splice(0,this.data.claimed.length-lx),e.collected=!0,this.persist(),{awarded:!0,gold:t,gems:n}}upgrade(e){let t=tv.get(e);if(!t)return!1;let n=this.data.cards[e]??0,r=this.data.upgrades[e]??0,i=sx(t.rarity,n,r);return i.canUpgrade?(this.data.cards[e]=n-i.need,this.data.upgrades[e]=r+1,this.persist(),!0):!1}resetProgress(){let e=this.data.settings;this.data={...dx(),settings:e},this.persist()}},yx=class{hooks;el;infoEl;frames=0;acc=0;fps=0;scrubbing=!1;constructor(e,t){this.hooks=t,this.el=document.createElement(`div`),this.el.className=`debug`,this.el.innerHTML=`
      <b>debug</b> <button data-a="hide">×</button>
      <pre class="info" style="margin:4px 0;white-space:pre-wrap"></pre>
      <div class="grid"><select data-a="chest">${ov.map(e=>`<option value="${e.id}">${e.id}</option>`).join(``)}</select>
      <input data-a="seed" placeholder="seed" size="8"></div>
      <div class="grid"><select data-a="force"><option value="">force: —</option>${[`common`,`rare`,`epic`,`legendary`,`champion`].map(e=>`<option>${e}</option>`).join(``)}</select></div>
      <div class="grid"><button data-s="choice">choice</button><button data-s="lightning">lightning</button><button data-s="legendary">legendary</button><button data-s="champion">champion</button></div>
      <div class="grid"><button data-sp="0.5">0.5×</button><button data-sp="1">1×</button><button data-sp="1.5">1.5×</button><button data-a="pause">pause</button><button data-a="step">step</button></div>
      <input type="range" min="0" max="1000" value="0" data-a="scrub" title="scrub active timeline (paused)">
      <div class="grid"><label><input type="checkbox" data-a="bloom" checked> bloom</label><label><input type="checkbox" data-a="particles" checked> particles</label><button data-a="reset">reset</button></div>`,e.append(this.el),this.infoEl=this.el.querySelector(`.info`);let n=e=>this.el.querySelector(e);n(`[data-a="hide"]`).addEventListener(`click`,()=>this.el.remove()),n(`[data-a="chest"]`).addEventListener(`change`,e=>t.selectChest(e.target.value)),n(`[data-a="seed"]`).addEventListener(`change`,e=>{let n=Number(e.target.value);t.setSeed(Number.isFinite(n)&&e.target.value!==``?n:null)}),n(`[data-a="force"]`).addEventListener(`change`,e=>t.force(e.target.value||null));for(let e of this.el.querySelectorAll(`[data-s]`))e.addEventListener(`click`,()=>t.scenario(e.dataset.s));for(let e of this.el.querySelectorAll(`[data-sp]`))e.addEventListener(`click`,()=>t.speed(Number(e.dataset.sp)));let r=n(`[data-a="pause"]`);r.addEventListener(`click`,()=>{let e=t.pause(r.textContent===`pause`);r.textContent=e?`resume`:`pause`}),n(`[data-a="step"]`).addEventListener(`click`,()=>t.step());let i=n(`[data-a="scrub"]`);i.addEventListener(`input`,()=>{let e=t.timelines()[0];e&&(this.scrubbing||(this.scrubbing=!0,t.pause(!0),r.textContent=`resume`,t.suppressAudio(!0)),e.seek(Number(i.value)/1e3*e.duration(),!0))}),i.addEventListener(`change`,()=>{this.scrubbing&&t.suppressAudio(!1),this.scrubbing=!1}),n(`[data-a="bloom"]`).addEventListener(`change`,e=>t.bloom(e.target.checked)),n(`[data-a="particles"]`).addEventListener(`change`,e=>t.particles(e.target.checked)),n(`[data-a="reset"]`).addEventListener(`click`,()=>t.reset())}update(e){if(this.frames++,this.acc+=e,this.acc>=.5){this.fps=this.frames/this.acc,this.frames=0,this.acc=0;let e={fps:this.fps.toFixed(0),...this.hooks.info()};this.infoEl.textContent=Object.entries(e).map(([e,t])=>`${e}: ${t}`).join(`
`)}}},bx=new Intl.NumberFormat(`ru-RU`),xx={common:`Обычный джокер`,rare:`Редкий джокер`,epic:`Эпический джокер`,legendary:`Легендарный джокер`,champion:`Джокер чемпиона`};function Sx(e){return bx.format(Math.round(e))}function Cx(e){return e.kind===`gold`?`Золото`:e.kind===`gems`?`Самоцветы`:e.kind===`wildcard`?`Джокер`:tv.get(e.cardId??``)?.name??`Карта`}function wx(e){return e.kind===`gold`||e.kind===`gems`?`Ресурс`:e.kind===`wildcard`?xx[e.rarity??`common`]:rv[e.rarity??`common`]}function Tx(e){return e.kind===`gold`||e.kind===`gems`?`r-resource`:`r-${e.rarity??`common`}`}function Ex(e){return e.kind===`gold`||e.kind===`gems`?`+${Sx(e.amount)}`:`×${Sx(e.amount)}`}function Dx(e){return`${Cx(e)}, ${wx(e).toLowerCase()}, ${Ex(e)}`}var Ox={coin:`<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4b8"/><stop offset=".5" stop-color="#ffc933"/><stop offset="1" stop-color="#b86b08"/></linearGradient></defs><circle cx="16" cy="16" r="13" fill="url(#gc)" stroke="#6e3c04" stroke-width="2"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff3c4" stroke-width="1.8" opacity=".85"/><path d="M12.5 12.5h7M16 10v12" stroke="#8a4c06" stroke-width="2.2" stroke-linecap="round"/></svg>`,gem:`<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ffd8"/><stop offset=".5" stop-color="#3fe58f"/><stop offset="1" stop-color="#14864a"/></linearGradient></defs><path d="M9 6h14l6 8-13 14L3 14z" fill="url(#gg)" stroke="#0a4a28" stroke-width="2" stroke-linejoin="round"/><path d="M3 14h26M11 6l-2 8 7 14 7-14-2-8" fill="none" stroke="#e9fff0" stroke-width="1.3" opacity=".7"/></svg>`,cards:`<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="4" width="16" height="21" rx="3" fill="#6fb0ff" stroke="#0b2a52" stroke-width="2" transform="rotate(12 17 14)"/><rect x="6" y="7" width="16" height="21" rx="3" fill="#ffd35a" stroke="#4a2806" stroke-width="2"/><path d="M14 12l2 4 4 .5-3 2.8.8 4.2-3.8-2-3.8 2 .8-4.2-3-2.8 4-.5z" fill="#fff" stroke="#8a4c06" stroke-width="1"/></svg>`,gear:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l2.2 3.2 3.8-.9.9 3.8L26 12.3l-1.6 3.7 1.6 3.7-3.1 2.2-.9 3.8-3.8-.9L16 28l-2.2-3.2-3.8.9-.9-3.8L6 19.7 7.6 16 6 12.3l3.1-2.2.9-3.8 3.8.9z" fill="#cfe6ff" stroke="#0b2a52" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.5" fill="#1b4a82" stroke="#0b2a52" stroke-width="2"/></svg>`,bolt:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 2L6 18h8l-3 12 15-18h-9z" fill="#eaf9ff" stroke="#0b4486" stroke-width="2" stroke-linejoin="round"/></svg>`,close:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 9l14 14M23 9L9 23" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>`},kx=e=>{let t=document.createElement(`template`);return t.innerHTML=e.trim(),t.content.firstElementChild},Ax=[[``,`Случайно`],[`common`,`Обычная`],[`rare`,`Редкая`],[`epic`,`Эпическая`],[`legendary`,`Легендарная`],[`champion`,`Чемпион`]],jx=class{root;actions;q=e=>this.root.querySelector(e);phase=`loading`;chestButtons=new Map;resetArmed=!1;toastTimer=0;displayed={gold:0,gems:0};autoOn=!1;forced=null;primaryMode=`open`;revealToken=0;constructor(e,t){this.root=e,this.actions=t,e.innerHTML=this.template(),this.bind()}template(){let e=ov.map(e=>`<button class="chest-item" type="button" data-chest="${e.id}" aria-pressed="false" title="${e.name}: ${cv[e.id]}"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /><span>${e.name}</span></button>`).join(``);return`
      <div class="edge-glow"></div>
      <div class="screen-flash"></div>
      <header class="topbar">
        <div class="resources">
          <div class="res gold" title="Золото">${Ox.coin}<span class="val" data-res="gold">0</span></div>
          <div class="res gems" title="Самоцветы">${Ox.gem}<span class="val" data-res="gems">0</span></div>
        </div>
        <div class="title-block">
          <div class="app-title">Сокровищница</div>
          <h1 class="chest-name" id="chest-name">Сокровищница</h1>
        </div>
        <div class="top-actions">
          <button class="icon-btn" type="button" id="btn-collection" aria-label="Коллекция">${Ox.cards}<span class="txt">Коллекция</span></button>
          <button class="icon-btn" type="button" id="btn-settings" aria-label="Настройки">${Ox.gear}</button>
        </div>
      </header>
      <div class="badge" aria-hidden="true"><div class="stack"></div><div class="face">0</div></div>
      <div class="reveal-info" aria-hidden="true">
        <div class="ri-head"><div class="ri-name"></div><div class="ri-rarity"></div></div>
        <div class="ri-meta"></div>
        <div class="ri-amount"></div>
        <div class="lucky">Удача!</div>
      </div>
      <div class="choice-layer">
        <div class="choice-title">Выберите награду</div>
        <button class="choice-hit" type="button" data-choice="0"><span class="lbl"></span></button>
        <button class="choice-hit" type="button" data-choice="1"><span class="lbl"></span></button>
      </div>
      <section class="panel strike-panel" aria-label="Замена карт молнией">
        <div class="strike-head">
          <div class="strike-count">${Ox.bolt}<span id="strikes-left">Ударов осталось: 0</span></div>
          <button class="btn blue small" type="button" id="btn-strike-done">Готово</button>
        </div>
        <p class="strike-hint">Нажмите на карту, чтобы ударить её молнией и заменить другой картой той же редкости.</p>
        <div class="card-grid" id="strike-grid"></div>
      </section>
      <section class="panel summary" aria-label="Итоги открытия">
        <h2>Вы получили</h2>
        <div class="card-grid" id="summary-grid"></div>
        <div class="panel-actions">
          <button class="btn green big" type="button" id="btn-claim">Забрать</button>
        </div>
      </section>
      <div class="bottom">
        <div class="actions">
          <button class="btn big" type="button" id="btn-open">Открыть</button>
          <button class="btn big blue" type="button" id="btn-next" hidden>Далее</button>
          <button class="btn small purple" type="button" id="btn-revealall" hidden>Показать всё</button>
          <button class="btn small toggle" type="button" id="btn-auto" aria-pressed="false" hidden>Авто</button>
        </div>
        <div class="remaining" id="remaining"></div>
        <nav class="selector" aria-label="Выберите сундук">
          <div class="selector-label">Выберите сундук</div>
          <div class="chest-list interactive" role="list">${e}</div>
        </nav>
      </div>
      <div class="toast" role="status"></div>
      <div class="sr-only" aria-live="polite" id="live"></div>
      <div class="modal-backdrop" id="modal-collection" role="dialog" aria-modal="true" aria-labelledby="coll-title">
        <div class="modal"><button class="icon-btn close" type="button" data-close aria-label="Закрыть">${Ox.close}</button>
          <h2 id="coll-title">Коллекция</h2><div id="coll-body"></div></div>
      </div>
      <div class="modal-backdrop" id="modal-settings" role="dialog" aria-modal="true" aria-labelledby="set-title">
        <div class="modal"><button class="icon-btn close" type="button" data-close aria-label="Закрыть">${Ox.close}</button>
          <h2 id="set-title">Настройки</h2><div id="set-body"></div></div>
      </div>
      <div class="screen" id="loading"><div class="box"><h1>Сокровищница</h1><p id="loading-text">Готовим сундуки…</p><div class="loader"><div id="loading-bar"></div></div></div></div>
      <div class="screen hidden" id="error" role="alert"><div class="box"><h1>Упс!</h1><p id="error-text"></p><button class="btn blue" type="button" id="btn-retry">Повторить</button></div></div>
    `}bind(){let e=this.actions;this.q(`#btn-open`).addEventListener(`click`,()=>this.primaryMode===`again`?e.openAgain():e.open()),this.q(`#btn-next`).addEventListener(`click`,()=>e.next()),this.q(`#btn-revealall`).addEventListener(`click`,()=>e.revealAll()),this.q(`#btn-auto`).addEventListener(`click`,()=>this.setAuto(!this.autoOn,!0)),this.q(`#btn-claim`).addEventListener(`click`,()=>e.claim()),this.q(`#btn-strike-done`).addEventListener(`click`,()=>e.finishStrikes()),this.q(`#btn-retry`).addEventListener(`click`,()=>e.retry()),this.q(`#btn-collection`).addEventListener(`click`,()=>this.openModal(`collection`)),this.q(`#btn-settings`).addEventListener(`click`,()=>this.openModal(`settings`));for(let t of this.root.querySelectorAll(`.chest-item`)){let n=t.dataset.chest;this.chestButtons.set(n,t),t.addEventListener(`click`,()=>e.selectChest(n))}for(let t of this.root.querySelectorAll(`.choice-hit`)){let n=Number(t.dataset.choice);t.addEventListener(`click`,()=>e.choose(n)),t.addEventListener(`pointerenter`,()=>e.hoverChoice(n)),t.addEventListener(`pointerleave`,()=>e.hoverChoice(null)),t.addEventListener(`focus`,()=>e.hoverChoice(n)),t.addEventListener(`blur`,()=>e.hoverChoice(null))}for(let e of this.root.querySelectorAll(`.modal-backdrop`))e.addEventListener(`click`,t=>{(t.target===e||t.target.closest(`[data-close]`))&&this.closeModals()});this.root.addEventListener(`pointerdown`,()=>e.unlockAudio(),{capture:!0})}setPhase(e){this.phase=e;let t=(e,t)=>{let n=this.q(e);n.hidden=!t},n=e===`selecting`||e===`ready`||e===`entering`;this.q(`.selector`).classList.toggle(`hidden`,!n),t(`#btn-open`,e===`ready`);let r=e===`revealing`||e===`awaitingNext`;t(`#btn-next`,r),t(`#btn-revealall`,r||e===`awaitingChoice`),t(`#btn-auto`,r||e===`awaitingChoice`),this.q(`#btn-next`).disabled=e!==`awaitingNext`&&e!==`revealing`,this.q(`.strike-panel`).classList.toggle(`show`,e===`awaitingStrikeChoice`||e===`striking`),this.q(`.summary`).classList.toggle(`show`,e===`summary`||e===`collecting`),this.q(`#btn-claim`).disabled=e!==`summary`,!r&&e!==`awaitingChoice`&&(this.q(`#remaining`).textContent=``),this.q(`.badge`).classList.toggle(`show`,r||e===`awaitingChoice`||e===`opening`||e===`charging`),e!==`awaitingChoice`&&this.hideChoice()}get currentPhase(){return this.phase}setPrimary(e){this.primaryMode=e,this.q(`#btn-open`).textContent=e===`again`?`Открыть ещё`:`Открыть`}setChest(e,t){this.q(`#chest-name`).textContent=t;for(let[t,n]of this.chestButtons)n.setAttribute(`aria-pressed`,String(t===e));this.chestButtons.get(e)?.scrollIntoView({block:`nearest`,inline:`center`,behavior:`smooth`})}setChestThumbs(e){for(let[t,n]of e){let e=this.chestButtons.get(t)?.querySelector(`img`);e&&(e.src=n)}}setResources(e,t){this.displayed={gold:e,gems:t},this.q(`[data-res="gold"]`).textContent=Sx(e),this.q(`[data-res="gems"]`).textContent=Sx(t)}countResources(e,t,n,r){let i={...this.displayed},a=performance.now(),o=()=>{let s=Math.min(1,(performance.now()-a)/(n*1e3)),c=1-(1-s)**3;this.q(`[data-res="gold"]`).textContent=Sx(i.gold+(e-i.gold)*c),this.q(`[data-res="gems"]`).textContent=Sx(i.gems+(t-i.gems)*c),s<1?requestAnimationFrame(o):(this.setResources(e,t),r?.())};requestAnimationFrame(o)}bumpResource(e){let t=this.q(`.res.${e}`);t.classList.remove(`bump`),t.offsetWidth,t.classList.add(`bump`)}resourceAnchor(e){let t=this.q(`.res.${e} svg`).getBoundingClientRect();return{x:t.left+t.width/2,y:t.top+t.height/2}}collectionAnchor(){let e=this.q(`#btn-collection`).getBoundingClientRect();return{x:e.left+e.width/2,y:e.top+e.height/2}}setRemaining(e){this.q(`.badge .face`).textContent=String(e),this.q(`#remaining`).textContent=`Осталось наград: ${e}`}tickBadge(){let e=this.q(`.badge`);e.classList.remove(`tick`),e.offsetWidth,e.classList.add(`tick`)}positionBadge(e,t){let n=this.q(`.badge`);n.style.left=`${e}px`,n.style.top=`${t}px`}setAuto(e,t=!1){this.autoOn=e,this.q(`#btn-auto`).setAttribute(`aria-pressed`,String(e)),t&&this.actions.setAuto(e)}showReveal(e,t,n,r,i){let a=this.q(`.reveal-info`),o=this.q(`.ri-head`),s=this.q(`.ri-meta`),c=this.q(`.ri-amount`);this.q(`.ri-name`).textContent=Cx(e);let l=this.q(`.ri-rarity`);l.textContent=wx(e),l.className=`ri-rarity ${Tx(e)}`,c.textContent=Ex(e),s.innerHTML=``;let u=++this.revealToken;if(r){let e=kx(`<div class="progress"><div class="fill"></div><div class="txt"></div></div>`),t=kx(`<div>Уровень ${r.level}</div>`);s.append(t,e);let n=e.querySelector(`.fill`),i=e.querySelector(`.txt`),a=Math.min(1,r.before/r.need),o=Math.min(1,r.have/r.need);n.style.width=`${a*100}%`,i.textContent=`${Sx(r.before)} / ${Sx(r.need)}`;let c=performance.now(),l=()=>{if(u!==this.revealToken)return;let t=Math.min(1,(performance.now()-c)/600),d=1-(1-t)**3;n.style.width=`${(a+(o-a)*d)*100}%`,i.textContent=`${Sx(r.before+(r.have-r.before)*d)} / ${Sx(r.need)}`,t<1?requestAnimationFrame(l):r.canUpgrade&&(e.classList.add(`full`),s.append(kx(`<div class="upgrade">Можно улучшить</div>`)))};requestAnimationFrame(l)}i&&s.append(kx(`<div>${i}</div>`));let d=n?14:26,f=t.left+t.width+d,p=t.top+t.height*(n?.02:.08),m=Math.min(window.innerWidth-f-10,420);o.style.cssText=`left:${f}px;top:${p}px;text-align:left;width:${m}px`,s.style.cssText=`left:${f}px;top:${p+o.offsetHeight+(n?10:14)}px;align-items:flex-start;width:${m}px`,s.classList.toggle(`narrow`,m<220),c.style.left=`${t.left+t.width*.1}px`,c.style.top=`${t.top+t.height*.92}px`,a.classList.remove(`show`),a.offsetWidth,a.classList.add(`show`),this.announce(Dx(e))}hideReveal(){this.revealToken++,this.q(`.reveal-info`).classList.remove(`show`),this.q(`.lucky`).classList.remove(`show`)}showLucky(e){let t=this.q(`.lucky`);t.style.top=`${e.top+e.height*.45}px`,t.style.left=`${e.left+e.width/2}px`,t.classList.remove(`show`),t.offsetWidth,t.classList.add(`show`),window.setTimeout(()=>t.classList.remove(`show`),1400),this.announce(`Удача! Награда увеличена.`)}showChoice(e,t){let n=this.q(`.choice-layer`),r=this.root.querySelectorAll(`.choice-hit`);r.forEach((n,r)=>{let i=t[r],a=e[r];n.style.cssText=`left:${i.left}px;top:${i.top}px;width:${i.width}px;height:${i.height}px`;let o=n.querySelector(`.lbl`);o.innerHTML=`${Cx(a)}<small class="${Tx(a)}">${wx(a)} · ${Ex(a)}</small>`,n.setAttribute(`aria-label`,`Выбрать: ${Dx(a)}`)});let i=this.q(`.choice-title`),a=this.q(`.topbar`).getBoundingClientRect().bottom,o=i.offsetHeight||34;i.style.top=`${Math.max(a+8+o,Math.min(t[0].top,t[1].top)-14)}px`,n.classList.add(`show`),r[0].focus({preventScroll:!0}),this.announce(`Выберите награду: `+e.map(Dx).join(` или `))}hideChoice(){this.q(`.choice-layer`).classList.remove(`show`)}focusChoice(e){this.root.querySelectorAll(`.choice-hit`)[e]?.focus({preventScroll:!0})}showStrikes(e,t){let n=this.q(`#strike-grid`);n.innerHTML=``,n.classList.remove(`targeting`);for(let t of e){let e=kx(`<button class="tile" type="button" data-slot="${t.index}"></button>`);this.fillTile(e,t.reward),e.addEventListener(`click`,()=>this.actions.strike(t.index)),n.append(e)}this.setStrikes(t),this.announce(`Ударов осталось: ${t}. Выберите карту для замены.`)}fillTile(e,t){e.innerHTML=`<img alt="" src="${J_(t)}" /><span class="amt">${Ex(t)}</span><span class="rar ${Tx(t)}">${t.kind===`card`||t.kind===`wildcard`?iv[t.rarity??`common`]:`Ресурс`}</span>`,e.setAttribute(`aria-label`,Dx(t)),e.title=Cx(t)}setStrikes(e){this.q(`#strikes-left`).textContent=`Ударов осталось: ${e}`;let t=e<=0;for(let e of this.root.querySelectorAll(`#strike-grid .tile`))e.disabled=t}strikeTileRect(e){return this.root.querySelector(`#strike-grid [data-slot="${e}"]`)?.getBoundingClientRect()??null}targetStrike(e){let t=this.q(`#strike-grid`);t.classList.toggle(`targeting`,e!==null);for(let n of t.querySelectorAll(`.tile`))n.classList.toggle(`target`,Number(n.dataset.slot)===e)}hitStrike(e){let t=this.root.querySelector(`#strike-grid [data-slot="${e}"]`);t&&(t.classList.remove(`hit`,`flip-in`),t.offsetWidth,t.classList.add(`hit`,`flip-out`))}replaceStrike(e,t){let n=this.root.querySelector(`#strike-grid [data-slot="${e}"]`);n&&(this.fillTile(n,t),n.classList.remove(`flip-out`),n.offsetWidth,n.classList.add(`flip-in`),this.announce(`Замена: ${Dx(t)}`))}showSummary(e){let t=this.q(`#summary-grid`);t.innerHTML=``,e.forEach((e,n)=>{let r=kx(`<div class="tile" style="--i:${n}"></div>`);this.fillTile(r,e),r.dataset.kind=e.kind,r.dataset.rarity=e.rarity??``,t.append(r)}),this.announce(`Вы получили: ${e.map(Dx).join(`; `)}`),window.setTimeout(()=>this.q(`#btn-claim`).focus({preventScroll:!0}),300)}positionPanels(e){for(let t of this.root.querySelectorAll(`.panel`))t.style.top=`${e}px`}summaryTiles(){return[...this.root.querySelectorAll(`#summary-grid .tile`)]}setScreenFx(e,t,n){this.q(`.edge-glow`).style.opacity=e.toFixed(3),this.q(`.screen-flash`).style.opacity=t.toFixed(3);let r=(1-n*.8).toFixed(3);this.q(`.topbar`).style.opacity=r}toast(e,t=2400){let n=this.q(`.toast`);n.textContent=e,n.classList.add(`show`),window.clearTimeout(this.toastTimer),this.toastTimer=window.setTimeout(()=>n.classList.remove(`show`),t)}announce(e){let t=this.q(`#live`);t.textContent=``,window.setTimeout(()=>t.textContent=e,30)}loading(e,t){this.q(`#loading-bar`).style.width=`${Math.round(e*100)}%`,t&&(this.q(`#loading-text`).textContent=t)}hideLoading(){this.q(`#loading`).classList.add(`hidden`)}showError(e,t=!0){this.q(`#loading`).classList.add(`hidden`),this.q(`#error-text`).textContent=e,this.q(`#btn-retry`).hidden=!t,this.q(`#error`).classList.remove(`hidden`)}hideError(){this.q(`#error`).classList.add(`hidden`)}get modalOpen(){return!!this.root.querySelector(`.modal-backdrop.show`)}openModal(e){this.closeModals(),this.onModal?.(e);let t=this.q(`#modal-${e}`);t.classList.add(`show`),window.setTimeout(()=>t.querySelector(`[data-close]`)?.focus({preventScroll:!0}),50)}onModal=null;closeModals(){this.resetArmed=!1;for(let e of this.root.querySelectorAll(`.modal-backdrop.show`))e.classList.remove(`show`)}renderCollection(e){let t=this.q(`#coll-body`),n=ev.filter(t=>(e.cards[t.id]??0)>0||(e.upgrades[t.id]??0)>0).length,r=[`common`,`rare`,`epic`,`legendary`].filter(t=>e.wild[t]>0).map(t=>`<div class="res">${Ox.cards}<span>Джокер (${iv[t].toLowerCase()}): ${Sx(e.wild[t])}</span></div>`).join(``);t.innerHTML=`
      <div class="stats">
        <div class="res">${Ox.coin}<span>${Sx(e.gold)}</span></div>
        <div class="res">${Ox.gem}<span>${Sx(e.gems)}</span></div>
        <div class="res">${Ox.cards}<span>Карт: ${n} из ${ev.length}</span></div>
        <div class="res"><span style="padding-left:10px">Открыто сундуков: ${Sx(e.openings)}</span></div>
        ${r}
      </div>
      <div class="coll-grid"></div>`;let i=t.querySelector(`.coll-grid`);for(let t of ev){let n=e.cards[t.id]??0,r=e.upgrades[t.id]??0,a=sx(t.rarity,n,r),o=n===0&&r===0,s={id:t.id,kind:`card`,rarity:t.rarity,cardId:t.id,amount:n},c=kx(`<div class="coll-card ${o?`locked`:``}">
          <div class="tile"><img alt="" src="${J_(s)}" />${o?``:`<span class="amt">×${Sx(n)}</span>`}</div>
          <div class="name">${t.name}<br><small class="r-${t.rarity}">${iv[t.rarity]} · ур. ${a.level}</small></div>
          <div class="progress ${a.canUpgrade?`full`:``}"><div class="fill" style="width:${Math.min(100,a.have/a.need*100)}%"></div><div class="txt">${a.maxed?`Макс.`:`${Sx(a.have)} / ${Sx(a.need)}`}</div></div>
        </div>`);if(a.canUpgrade){let e=kx(`<button class="btn green small" type="button" title="Можно улучшить">Улучшить</button>`);e.addEventListener(`click`,()=>this.actions.upgrade(t.id)),c.append(e)}c.title=t.role,i.append(c)}}renderSettings(e){let t=this.q(`#set-body`),n=(e,t,n)=>`<div class="seg" role="radiogroup" aria-label="${e}">${n.map(([n,r])=>`<button type="button" role="radio" data-seg="${e}" data-val="${n}" aria-checked="${n===t}">${r}</button>`).join(``)}</div>`;t.innerHTML=`
      <div class="row"><span class="lbl" id="lbl-sound">Звук</span><button class="switch" type="button" role="switch" aria-labelledby="lbl-sound" data-switch="sound" aria-checked="${e.sound}"></button></div>
      <div class="row"><label for="vol">Громкость</label><input id="vol" type="range" min="0" max="1" step="0.05" value="${e.volume}"></div>
      <div class="row"><span class="lbl">Качество</span>${n(`Качество`,e.quality,[[`auto`,`Авто`],[`low`,`Низкое`],[`medium`,`Среднее`],[`high`,`Высокое`]])}</div>
      <div class="row"><span class="lbl">Скорость показа</span>${n(`Скорость показа`,String(e.speed),[[`0.5`,`0.5×`],[`1`,`1×`],[`1.5`,`1.5×`]])}</div>
      <div class="row"><span class="lbl" id="lbl-rm">Меньше движения</span><button class="switch" type="button" role="switch" aria-labelledby="lbl-rm" data-switch="reducedMotion" aria-checked="${e.reducedMotion}"></button></div>
      <div class="row"><span class="lbl" id="lbl-auto">Автопоказ наград</span><button class="switch" type="button" role="switch" aria-labelledby="lbl-auto" data-switch="auto" aria-checked="${e.auto}"></button></div>
      <h3>Демонстрация</h3>
      <div class="row"><label for="force">Гарантированная редкость в следующем сундуке</label>
        <select id="force">${Ax.map(([e,t])=>`<option value="${e}" ${e===(this.forced??``)?`selected`:``}>${t}</option>`).join(``)}</select></div>
      <div class="row" style="flex-wrap:wrap"><span class="lbl">Сценарии</span><div class="demo-buttons">
        <button class="btn small blue" type="button" data-scenario="choice">Выбор из двух</button>
        <button class="btn small blue" type="button" data-scenario="lightning">Удар молнии</button>
        <button class="btn small blue" type="button" data-scenario="legendary">Легендарная</button>
        <button class="btn small blue" type="button" data-scenario="champion">Чемпион</button>
      </div></div>
      <div class="danger-zone"><button class="btn small danger" type="button" id="btn-reset">Сбросить прогресс</button></div>`;for(let e of t.querySelectorAll(`[data-switch]`))e.addEventListener(`click`,()=>{let t=e.dataset.switch,n=e.getAttribute(`aria-checked`)!==`true`;e.setAttribute(`aria-checked`,String(n)),this.actions.changeSettings({[t]:n}),t===`auto`&&this.setAuto(n)});t.querySelector(`#vol`).addEventListener(`input`,e=>this.actions.changeSettings({volume:Number(e.target.value)}));for(let e of t.querySelectorAll(`[data-seg]`))e.addEventListener(`click`,()=>{for(let n of t.querySelectorAll(`[data-seg="${e.dataset.seg}"]`))n.setAttribute(`aria-checked`,String(n===e));e.dataset.seg===`Качество`?this.actions.changeSettings({quality:e.dataset.val}):this.actions.changeSettings({speed:Number(e.dataset.val)})});t.querySelector(`#force`).addEventListener(`change`,e=>{let t=e.target.value;this.forced=t||null,this.actions.setForcedRarity(this.forced)});for(let e of t.querySelectorAll(`[data-scenario]`))e.addEventListener(`click`,()=>{this.closeModals(),this.actions.scenario(e.dataset.scenario)});let r=t.querySelector(`#btn-reset`);r.addEventListener(`click`,()=>{if(!this.resetArmed){this.resetArmed=!0,r.textContent=`Точно сбросить? Нажмите ещё раз`;return}this.resetArmed=!1,this.actions.resetProgress(),this.closeModals()})}setForced(e){this.forced=e}},Mx=class{time;speed=1;paused=!1;maxDelta=1/20;constructor(){Si.ticker.remove(Si.updateRoot),this.time=Si.globalTimeline.time()}advance(e){let t=this.paused?0:Math.min(Math.max(e,0),this.maxDelta)*this.speed;return this.time+=t,Si.updateRoot(this.time),t}};function Nx(e,t,n){let{rig:r,preset:i,audio:a,particles:o,sm:s}=e,c=r.state,l=e.reduced,u=i.weight===`heavy`,d=i.weight===`light`,f=Si.timeline(),p=0;if(t){let e=t.state;f.to(e,{enterZ:-.9,enterY:.12,scale:.9,opacity:0,glow:0,duration:.19,ease:`power2.in`},0),f.call(n,[],.2),p=.12}let m=d?.28:u?.38:.33;c.enterY=u?1.05:.85,c.enterTilt=l?0:.055,c.opacity=0,c.scale=1,f.to(c,{opacity:1,duration:.12,ease:`power1.out`},p),f.to(c,{enterY:0,duration:m,ease:`power2.in`},p),f.to(c,{enterTilt:0,duration:m*.95,ease:`power1.out`},p);let h=p+m;f.call(()=>{a.play(`land`,{pitch:i.pitch,metal:i.weight!==`heavy`,gain:u?1.1:.9});let e=r.root.position.clone();e.y=.08,o.burst(Wv.landingDust,e,{countScale:u?1.4:1,speedScale:u?1.25:1})},[],h);let g=d?.035:u?.05:.042;return f.to(c,{squash:g,duration:.06,ease:`power2.out`},h),f.to(c,{squash:0,duration:d?.22:.17,ease:d?`back.out(3)`:`power2.out`},h+.06),d&&!l&&(f.to(c,{enterY:.07,duration:.1,ease:`power2.out`},h+.05),f.to(c,{enterY:0,duration:.12,ease:`power2.in`},h+.15)),u&&!l&&(f.to(s.accent,{shake:.5,duration:.03},h),f.to(s.accent,{shake:0,duration:.25,ease:`power2.out`},h+.03)),f}function Px(e){let{rig:t,fx:n,preset:r,audio:i,sm:a,particles:o}=e,s=t.state,c=r.tempo,l=e.reduced,u=r.weight===`heavy`,d=r.anticipation,f=Si.timeline();n.reset(),n.setColors(r.rays,r.glow,r.glow2),f.addLabel(`press`,0),f.to(s,{squash:.04,hover:0,duration:.08,ease:`power2.out`},0),f.to(s,{charge:.6,glow:.05,seam:.15,idle:0,duration:.25*c},0),(r.magic||r.arcs||d>.15)&&f.call(()=>i.play(`charge`,{pitch:r.pitch}),[],.02);let p=l?0:.045*(u?.65:1);f.to(s,{squash:-.018,tiltZ:p,duration:.07*c,ease:`power2.out`},.08),f.to(s,{tiltZ:-p*.7,duration:.07*c,ease:`sine.inOut`},.08+.07*c),f.to(s,{tiltZ:p*.4,duration:.07*c,ease:`sine.inOut`},.08+.14*c),f.to(s,{tiltZ:0,squash:0,duration:.08*c,ease:`power2.out`},.08+.21*c),d>0&&(f.to(s,{charge:1,glow:.16,seam:.55,duration:d,ease:`sine.inOut`},.3*c),l||(f.to(s,{shake:.012,duration:d*.6,ease:`power1.in`},.3*c),f.to(s,{shake:0,duration:.08},.3*c+d)));let m=.28*c+d;f.addLabel(`unlock`,m),f.to(s,{lock:1,duration:.14*c,ease:`back.out(3)`},m),f.to(s,{lock:.35,duration:.2*c,ease:`power2.inOut`},m+.16*c),f.call(()=>{i.play(`latch`,{pitch:r.pitch}),o.burst(Wv.lockSparks,t.anchor(`lockFront`),{colors:r.sparks})},[],m);let h=.4*c+d;f.addLabel(`lidCrack`,h),f.to(s,{lid:l?5:8,duration:.2*c,ease:`power2.out`},h),f.to(s,{seam:.8,glow:.36,duration:.18*c},h),f.call(()=>i.play(`lid`,{pitch:r.pitch}),[],h+.04*c);let g=.62*c+d,_=t.model.lidOpenAngle;f.addLabel(`lidBurst`,g),f.to(s,{lid:_+(l?2:r.overshoot),duration:.32*c,ease:`power3.out`},g),f.to(s,{glow:1.25,seam:0,charge:.15,duration:.2*c,ease:`power2.out`},g),f.to(n.state,{rays:1,core:1.1,duration:.22*c,ease:`power2.out`},g),f.to(n.state,{flash:l?.15:r.burst===`small`?.32:r.burst===`medium`?.45:.6,duration:.06,ease:`power1.out`},g+.04*c),f.to(n.state,{flash:0,duration:.42,ease:`power2.out`},g+.1*c),f.call(()=>{let e=t.anchor(`cavity`);e.y+=.15;let n={small:Wv.openSmall,medium:Wv.openMedium,large:Wv.openLarge,prism:Wv.openPrism}[r.burst];o.burst(n,e,{colors:r.sparks,countScale:l?.4:1}),(r.burst===`large`||r.burst===`prism`)&&o.burst(Wv.stars,e,{colors:r.sparks}),r.arcs&&(i.play(`arc`),o.burst(Wv.arcSparks,e,{}))},[],g+.05*c),l||(f.to(s,{squash:u?.035:.022,duration:.06},g),f.to(s,{squash:0,duration:.3,ease:`power3.out`},g+.06),f.to(a.accent,{push:u?1:.7,duration:.24*c,ease:`power2.out`},g),f.to(a.accent,{push:0,duration:.7*c,ease:`power2.inOut`},g+.3*c),u&&(f.to(a.accent,{shake:.45,duration:.03},g+.02),f.to(a.accent,{shake:0,duration:.28,ease:`power2.out`},g+.05)));let v=.94*c+d;return f.addLabel(`settle`,v),f.to(s,{lid:_,duration:.3*c,ease:`power2.inOut`},v),f.to(s,{glow:.85,duration:.4*c},v),f.to(n.state,{rays:.5,core:.28,duration:.45*c},v),f.addLabel(`end`,1.24*c+d),{timeline:f,launchAt:1*c+d}}function Fx(e){let t=Si.timeline();return t.to(e.rig.state,{glow:.28,duration:1.1,ease:`power2.out`},0),t.to(e.fx.state,{rays:0,core:.12,duration:.9,ease:`power2.out`},0),t}function Ix(e,t,n,r,i){let a=1-r;i.x=a*a*e.x+2*a*r*t.x+r*r*n.x,i.y=a*a*e.y+2*a*r*t.y+r*r*n.y,i.z=a*a*e.z+2*a*r*t.z+r*r*n.z}function Lx(e){let t=e.sm.background.uniforms,n=Si.timeline();return n.call(()=>{e.sm.throneVisible=!0},[],0),n.to(t.uFlash,{value:.35,duration:.12},0),n.to(t.uOpacity,{value:0,duration:.4,ease:`power2.inOut`},.05),n.to(t.uFlash,{value:0,duration:.2},.2),n.to(e.screen,{edge:1,duration:.4,ease:`power2.out`},.05),n}function Rx(e){let t=e.sm.background.uniforms,n=Si.timeline();return n.to(t.uOpacity,{value:1,duration:.4,ease:`power2.inOut`},0),n.to(e.screen,{edge:0,duration:.35},0),n.call(()=>{e.sm.throneVisible=!1},[],.42),n}function zx(e){return e.kind===`gold`||e.kind===`gems`?{..._v[e.kind],reveal:.62}:gv[e.rarity??`common`]}function Bx(e){return e.kind===`card`||e.kind===`wildcard`?e.rarity??`common`:`common`}function Vx(e){let t=e.rig.anchor(`cavity`);return t.y-=.05,t}function Hx(e,t,n,r){let i=e.clone().lerp(t,.45);return i.y+=r,i.x+=n*.35,i}function Ux(e,t){if(t.kind===`gold`||t.kind===`gems`){e.audio.play(`coin`),e.audio.play(`common`,{pitch:1.2,gain:.8});return}let n=Bx(t);e.audio.play(n===`champion`?`champion`:n===`legendary`?`legendary`:n===`epic`?`epic`:n===`rare`?`rare`:`common`)}function Wx(e,t,n,r=`center`){let i=Bx(n),a=n.kind===`gold`||n.kind===`gems`,o=zx(n),s=!a&&i===`epic`,c=!a&&i===`rare`,l=n.kind===`wildcard`,u=e.reduced,d=a||i===`common`?1:c?1.18:1.3;t.acquire(),t.setReward(n,`normal`),t.setGlowColor(o.color,o.color2),e.presenter.setTrailColor(t,o.color);let f=Vx(e),p=e.presenter.anchor(r),m=n.id.length%2==0?1:-1,h=Hx(f,p,m,.6),g=t.state;Object.assign(g,{x:f.x,y:f.y,z:f.z,scale:.26,flip:180,tilt:u?0:50,roll:u?0:-8*m,opacity:1,trail:1,glow:.35});let _=Si.timeline(),v=.42*d,y={p:0};_.addLabel(`cardLaunch`,0),_.call(()=>e.audio.play(`whoosh`,{pitch:.95+(m>0?.05:0)}),[],0),_.to(e.rig.state,{glow:1.15,duration:.1,ease:`power2.out`},0),_.to(e.rig.state,{glow:.85,duration:.3,ease:`power2.inOut`},.1),_.to(e.fx.state,{core:.9,duration:.08},0),_.to(e.fx.state,{core:.28,duration:.3},.08),_.to(y,{p:1,duration:v,ease:`power2.out`,onUpdate:()=>Ix(f,h,p,y.p,g)},0),_.to(g,{scale:1.12,tilt:0,roll:0,duration:v,ease:`power2.out`},0),_.to(g,{trail:0,duration:.15},v*.8);let b=v*.36;s&&!u&&(_.to(g,{glow:1.1,halo:.7,duration:.25},v*.55),_.to(g,{roll:3,duration:.05,yoyo:!0,repeat:3,ease:`sine.inOut`},v),b=v+.18);let x=u?.001:s?.32:.28;_.to(g,{flip:0,duration:x,ease:`power2.inOut`},b);let S=b+x*.5;_.addLabel(`cardReveal`,S),_.call(()=>{e.hooks.onReveal(n),Ux(e,n);let r=t.worldPosition(new U);e.particles.burst(Wv.cardSparks,r,{colors:o.sparks,countScale:c?1.3:s?1.5:1}),(s||l)&&e.particles.burst(Wv.stars,r,{colors:o.sparks,countScale:s?1:.6}),l&&e.particles.burst(Wv.shards,r,{countScale:.6})},[],S),_.fromTo(g,{bright:.6},{bright:0,duration:.32,ease:`power2.out`,immediateRender:!1},S),_.to(g,{glow:c?.95:s?1.05:.45,duration:.08},S),_.to(g,{glow:c||s?.2:0,duration:.55,ease:`power2.out`},S+.08),c&&(_.to(g,{halo:.45,duration:.15},S),_.to(g,{halo:.18,duration:.6},S+.15)),s&&_.to(g,{halo:.55,haloScale:1.15,duration:.4},S);let C=Math.max(v,b+x);return _.to(g,{scale:1,duration:.2*d,ease:`back.out(2.2)`},C),_.addLabel(`settle`,C+.2*d),_.call(()=>e.hooks.onSettle(n),[],C+.1*d),n.lucky&&(_.call(()=>{e.hooks.onLucky(),e.audio.play(`lucky`);let n=t.worldPosition(new U);e.particles.burst(Wv.stars,n,{colors:[`#ffffff`,`#ff9ef2`,`#ffd6fa`],countScale:1.4}),e.particles.burst(Wv.radial,n,{colors:[`#ff9ef2`,`#ffffff`],countScale:u?0:.6})},[],C+.25),_.to(g,{glow:.9,duration:.1},C+.25),_.to(g,{glow:.25,duration:.5},C+.35)),_}function Gx(e,t,n){let r=e.reduced,i=gv.legendary;t.acquire(),t.setReward(n,`normal`),t.setGlowColor(`#dff4ff`,`#ffc4f0`),e.presenter.setTrailColor(t,`#e8f4ff`);let a=Vx(e),o=e.presenter.anchor(`center`),s=a.clone().lerp(o,.55),c=t.state;Object.assign(c,{x:a.x,y:a.y,z:a.z,scale:.3,flip:180,tilt:r?0:30,roll:0,opacity:1,trail:.6,glow:1.2,halo:.4});let l=e.sm.background.uniforms,u=Si.timeline();u.addLabel(`calm`,0),u.to(l.uDim,{value:.45,duration:.35,ease:`power2.out`},0),u.to(e.screen,{dim:.35,duration:.35},0),u.call(()=>e.particles.setAmbient(8),[],0),u.to(e.fx.state,{rays:.3,duration:.3},0),u.to(e.rig.state,{glow:1.3,charge:.8,duration:.45,ease:`power2.in`},0),u.to(e.fx.state,{core:1.2,duration:.45,ease:`power2.in`},0),u.call(()=>e.audio.play(`rise`),[],0),u.addLabel(`cardLaunch`,.25);let d={p:0};u.to(d,{p:1,duration:.5,ease:`power2.out`,onUpdate:()=>Ix(a,a.clone().lerp(s,.5).add(new U(0,.2,0)),s,d.p,c)},.25),u.to(c,{scale:.92,tilt:0,halo:.95,duration:.5,ease:`power2.out`},.25),u.to(c,{trail:0,duration:.2},.6),r||u.to(c,{roll:4,duration:.12,yoyo:!0,repeat:3,ease:`sine.inOut`},.5),u.addLabel(`burst`,.78),u.call(()=>{let n=t.worldPosition(new U);e.audio.play(`legendary`),e.particles.burst(Wv.shards,n,{countScale:1}),r||e.particles.burst(Wv.radial,n,{colors:i.sparks}),e.particles.burst(Wv.stars,n,{colors:i.sparks,countScale:1.2})},[],.78),u.to(e.fx.state,{flash:r?.25:.85,duration:.06},.78),u.to(e.fx.state,{flash:0,duration:.5,ease:`power2.out`},.84),r||(u.fromTo(e.fx.state,{ring:.9,ringRadius:.08},{ring:0,ringRadius:1,duration:.42,ease:`power2.out`,immediateRender:!1},.78),u.to(e.sm.accent,{push:1,shake:.7,duration:.05},.78),u.to(e.sm.accent,{shake:0,duration:.3,ease:`power2.out`},.83),u.to(e.sm.accent,{push:0,duration:.8,ease:`power2.inOut`},1),u.to(e.sm.accent,{bloomBoost:.5,duration:.05},.78),u.to(e.sm.accent,{bloomBoost:0,duration:.5},.83)),u.to(l.uFlash,{value:.5,duration:.05},.78),u.to(l.uFlash,{value:0,duration:.45},.83);let f={p:0};return u.to(f,{p:1,duration:.55,ease:`power2.inOut`,onUpdate:()=>{c.x=s.x+(o.x-s.x)*f.p,c.y=s.y+(o.y-s.y)*f.p,c.z=s.z+(o.z-s.z)*f.p}},.8),u.to(c,{scale:1.1,duration:.55,ease:`power2.inOut`},.8),u.to(c,{flip:0,duration:r?.001:.5,ease:`power2.inOut`},.82),u.addLabel(`cardReveal`,1.05),u.call(()=>e.hooks.onReveal(n),[],1.05),u.to(c,{iri:1,glow:.35,duration:.4},1),u.fromTo(c,{bright:.5},{bright:0,duration:.35,immediateRender:!1},1.05),u.fromTo(c,{sweep:-.4},{sweep:1.4,duration:.65,ease:`power1.inOut`,immediateRender:!1},1.3),u.to(c,{halo:.55,haloScale:1.25,duration:.5},1.3),u.call(()=>e.particles.burst(Wv.motes,t.worldPosition(new U),{colors:i.sparks}),[],1.35),u.to(c,{scale:1,duration:.3,ease:`back.out(1.8)`},1.55),u.to(e.rig.state,{glow:.9,charge:0,duration:.6},1.2),u.to(e.fx.state,{core:.3,rays:.5,duration:.6},1.2),u.to(l.uDim,{value:.15,duration:.6},1.4),u.to(e.screen,{dim:0,duration:.6},1.4),u.call(()=>e.particles.setAmbient(24),[],1.6),u.addLabel(`settle`,1.9),u.call(()=>e.hooks.onSettle(n),[],1.85),u}function Kx(e){let t=ev.filter(t=>t.id!==e.cardId&&(t.rarity===`champion`||t.rarity===`legendary`));return[0,1,2].map(n=>({...e,id:`${e.id}-alt${n}`,cardId:t[(n*2+e.id.length)%t.length].id,rarity:t[(n*2+e.id.length)%t.length].rarity}))}function qx(e,t,n,r){let i=e.reduced;t.acquire(),t.setReward(n,`champion`),t.setGlowColor(`#ffe08a`,`#8fe9ff`),e.presenter.setTrailColor(t,`#ffe08a`);let a=Si.timeline();r&&a.add(Lx(e),0);let o=Vx(e),s=e.presenter.anchor(`high`),c=t.state;Object.assign(c,{x:o.x,y:o.y,z:o.z,scale:.3,flip:180,tilt:i?0:35,roll:0,opacity:0,trail:0,glow:1,halo:0}),a.to(e.rig.state,{glow:1.15,charge:.9,duration:.5,ease:`power2.in`},.3),a.to(e.fx.state,{core:1,rays:.8,duration:.5},.3),a.call(()=>e.audio.play(`rise`,{pitch:.85}),[],.3),a.call(()=>e.particles.burst(Wv.rising,e.rig.anchor(`cavity`),{colors:[`#fff1b0`,`#ffcf58`,`#ffffff`]}),[],.35),a.addLabel(`cardLaunch`,.55),a.set(c,{opacity:1,trail:.8},.55);let l={p:0},u=Hx(o,s,1,.9);a.to(l,{p:1,duration:.62,ease:`power2.out`,onUpdate:()=>Ix(o,u,s,l.p,c)},.55),a.to(c,{scale:1.15,tilt:0,halo:.8,duration:.62,ease:`power2.out`},.55),a.to(c,{trail:0,duration:.2},1),i||(a.to(c,{roll:5,duration:.3,ease:`sine.inOut`},.7),a.to(c,{roll:-4,duration:.3,ease:`sine.inOut`},1),a.to(c,{roll:0,duration:.2,ease:`sine.inOut`},1.3));let d=Kx(n),f=-1,p=e=>e<3?d[e]:n;i?a.to(c,{flip:0,duration:.001},1.4):a.to(c,{flip:-1080,duration:.85,ease:`power3.out`,onUpdate:()=>{let n=(180-c.flip)/360,r=Math.min(3,Math.max(0,Math.floor(n)));r!==f&&(f=r,t.showFace(p(r)),r>0&&e.audio.play(`flip`,{pitch:1+r*.08}))},onComplete:()=>t.showFace(n)},1.15);let m=i?1.4:1.95;return a.addLabel(`cardReveal`,m),a.call(()=>{t.showFace(n),e.hooks.onReveal(n),e.audio.play(`champion`);let r=t.worldPosition(new U);i||e.particles.burst(Wv.radial,r,{colors:[`#8fe9ff`,`#4ddfff`,`#ffffff`],countScale:1.2}),e.particles.burst(Wv.stars,r,{colors:[`#fff1b0`,`#ffcf58`],countScale:1.4}),e.particles.burst(Wv.cardSparks,r,{colors:[`#fff1b0`,`#ffcf58`,`#8fe9ff`],countScale:1.6})},[],m),a.to(e.fx.state,{flash:i?.2:.7,duration:.05},m),a.to(e.fx.state,{flash:0,duration:.45,ease:`power2.out`},m+.05),i||(a.fromTo(e.fx.state,{ring:1,ringRadius:.1},{ring:0,ringRadius:1,duration:.45,ease:`power2.out`,immediateRender:!1},m),a.to(e.sm.accent,{shake:.8,push:.8,bloomBoost:.6,duration:.05},m),a.to(e.sm.accent,{shake:0,bloomBoost:0,duration:.4,ease:`power2.out`},m+.05),a.to(e.sm.accent,{push:0,duration:.9,ease:`power2.inOut`},m+.2)),a.to(e.screen,{flash:i?.1:.35,duration:.05},m),a.to(e.screen,{flash:0,duration:.4},m+.05),a.fromTo(c,{bright:.7,glow:1.4},{bright:0,glow:.35,duration:.5,ease:`power2.out`,immediateRender:!1},m),a.fromTo(c,{sweep:-.4},{sweep:1.4,duration:.6,ease:`power1.inOut`,immediateRender:!1},m+.15),a.to(c,{iri:.35,halo:.6,haloScale:1.3,duration:.4},m),a.to(c,{scale:1.05,duration:.35,ease:`back.out(2)`},m+.2),a.to(e.rig.state,{glow:.9,charge:0,duration:.6},m+.2),a.to(e.fx.state,{core:.3,rays:.5,duration:.6},m+.2),a.addLabel(`settle`,m+.55),a.call(()=>e.hooks.onSettle(n),[],m+.5),a}function Jx(e,t){let n=t.state,r=Si.timeline();if(n.opacity<=.001)return r;let i=e.sm.layout.cardWorldH*.8,a=t.lease;return r.to(n,{scale:n.scale*.5,y:n.y-i,opacity:0,halo:0,glow:0,iri:0,duration:.2,ease:`power2.in`},0),r.to(e.sm.background.uniforms.uDim,{value:0,duration:.3},0),r.call(()=>{t.lease===a&&t.reset()},[],.21),r}function Yx(e,t,n){let r=e.reduced,i=[e.presenter.left,e.presenter.right],a=[`left`,`right`],o=e.presenter.choiceUnit(),s=Si.timeline(),c=Vx(e);return s.to(e.rig.state,{glow:1.25,duration:.15},0),s.to(e.rig.state,{glow:.9,duration:.4},.15),s.call(()=>e.audio.play(`whoosh`,{pitch:.9}),[],0),i.forEach((i,l)=>{let u=t[l],d=zx(u);i.acquire(),i.setReward(u,n?`champion`:`normal`),i.setGlowColor(d.color,d.color2),e.presenter.setTrailColor(i,d.color);let f=e.presenter.anchor(a[l]),p=Hx(c,f,l===0?-1:1,.5),m=i.state;Object.assign(m,{x:c.x,y:c.y,z:c.z,scale:.25,flip:180,tilt:r?0:45,roll:r?0:l===0?10:-10,opacity:1,trail:1,glow:.5,halo:n?.5:.2});let h={p:0};s.to(h,{p:1,duration:.5,ease:`power2.out`,onUpdate:()=>Ix(c,p,f,h.p,m)},.02),s.to(m,{scale:o*1.08,tilt:0,roll:0,duration:.5,ease:`power2.out`},.02),s.to(m,{trail:0,duration:.15},.42);let g=.46+l*.1;s.to(m,{flip:0,duration:r?.001:.3,ease:`power2.inOut`},g),s.call(()=>{Ux(e,u),e.particles.burst(Wv.cardSparks,i.worldPosition(new U),{colors:d.sparks,countScale:.8})},[],g+.15),s.fromTo(m,{bright:.5},{bright:0,duration:.3,immediateRender:!1},g+.15),s.to(m,{scale:o,glow:.12,duration:.25,ease:`back.out(2)`},g+.3),(u.rarity===`legendary`||u.rarity===`champion`)&&s.to(m,{iri:u.rarity===`legendary`?1:.35,halo:.5,duration:.4},g+.15)}),s.addLabel(`settle`,.95),s}function Xx(e,t){let n=[e.presenter.left,e.presenter.right],r=n[t],i=n[+(t===0)],a=r.state,o=i.state,s=Si.timeline();s.call(()=>{e.audio.play(`choice`);let t=zx(r.reward);e.particles.burst(Wv.cardSparks,r.worldPosition(new U),{colors:t.sparks,countScale:1.2}),e.particles.burst(Wv.stars,r.worldPosition(new U),{colors:t.sparks,countScale:.8})},[],0),s.to(a,{glow:1,hover:0,scale:a.scale*1.12,duration:.12,ease:`power2.out`},0),s.to(o,{opacity:0,scale:o.scale*.8,glow:0,halo:0,hover:0,duration:.32,ease:`power2.in`},0),s.to(o,{z:o.z-.8,duration:.32,ease:`power2.in`},0);let c=e.presenter.anchor(`center`);s.to(a,{x:c.x,y:c.y,z:c.z,scale:1,glow:.2,duration:.42,ease:`power3.inOut`},.14);let l=i.lease;return s.call(()=>{i.lease===l&&i.reset()},[],.34),s.addLabel(`settle`,.58),s}var Zx={loading:[`selecting`],selecting:[`entering`],entering:[`ready`,`entering`],ready:[`charging`,`entering`],charging:[`opening`],opening:[`revealing`],revealing:[`awaitingNext`,`awaitingChoice`,`revealing`,`awaitingStrikeChoice`,`summary`],awaitingNext:[`revealing`,`awaitingStrikeChoice`,`summary`],awaitingChoice:[`revealing`,`awaitingNext`],awaitingStrikeChoice:[`striking`,`summary`],striking:[`awaitingStrikeChoice`,`summary`],summary:[`collecting`],collecting:[`resetting`],resetting:[`entering`,`ready`],error:[`loading`,`selecting`]},Qx=class{current=`loading`;listeners=new Set;get phase(){return this.current}is(...e){return e.includes(this.current)}can(e){return e===`error`||e===`resetting`?this.current!==`loading`||e===`error`:Zx[this.current].includes(e)}go(e){if(!this.can(e))return!1;let t=this.current;this.current=e;for(let n of this.listeners)n(e,t);return!0}onChange(e){return this.listeners.add(e),()=>this.listeners.delete(e)}},$x=class{d;phase=new Qx;session=null;chestId=`silver`;rig=null;screen={edge:0,flash:0,dim:0};autoMode=!1;forced=null;nextSeed=null;epoch=0;running=new Map;retiring=new Set;pendingNext=!1;revealAllOn=!1;autoCall=null;currentCard=null;throneActive=!1;championChoice=!1;constructor(e){this.d=e,this.phase.onChange(t=>e.ui.setPhase(t))}get token(){return this.epoch}get activeTimelines(){return[...this.running.keys()]}get retiringRigs(){return[...this.retiring]}relayout(){let e=this.d;if(this.phase.is(`awaitingNext`)&&this.currentCard&&this.currentCard.reward){let t=this.currentCard.reward.rarity===`champion`&&!e.presenter.isChoiceCard(this.currentCard),n=e.presenter.anchor(t?`high`:`center`);Object.assign(this.currentCard.state,{x:n.x,y:n.y,z:n.z}),this.onSettle(this.currentCard.reward)}if(this.phase.is(`awaitingChoice`)&&this.session){let t=this.session.slots[this.session.cursor];if(t?.kind===`choice`){let n=e.presenter.choiceUnit(),r=e.presenter.anchor(`left`),i=e.presenter.anchor(`right`);Object.assign(e.presenter.left.state,{x:r.x,y:r.y,z:r.z}),Object.assign(e.presenter.right.state,{x:i.x,y:i.y,z:i.z}),e.ui.showChoice(t.options,[this.cardRect(`left`,n),this.cardRect(`right`,n)])}}}ctx(){let e=this.d;return{sm:e.sm,rig:this.rig,fx:e.fx,particles:e.particles,presenter:e.presenter,audio:e.audio,overlay:e.overlay,preset:hv[this.chestId],reduced:e.reduced(),screen:this.screen,hooks:{onReveal:()=>this.onReveal(),onSettle:e=>this.onSettle(e),onLucky:()=>e.ui.showLucky(this.cardRect(`center`))}}}run(e,t){return new Promise(n=>{this.running.set(e,n),e.eventCallback(`onComplete`,()=>{this.running.delete(e),n(t===this.epoch)})})}reach(e,t,n){return new Promise(r=>{e.call(()=>r(n===this.epoch),[],t);let i=this.running.get(e);this.running.set(e,e=>{i?.(e),r(e)})})}track(e){this.running.has(e)||(this.running.set(e,()=>void 0),e.eventCallback(`onComplete`,()=>this.running.delete(e)))}bump(){this.epoch++;for(let[e,t]of this.running)e.kill(),t(!1);this.running.clear(),this.cancelAuto(),this.pendingNext=!1,this.revealAllOn=!1;for(let e of this.retiring)e.dispose();return this.retiring.clear(),this.epoch}cancelAuto(){this.autoCall?.kill(),this.autoCall=null}cardRect(e,t=1){let n=this.d,r=n.sm.layout,i=n.sm.toScreen(n.presenter.anchor(e)),a=r.cardPxH*t,o=a*Gb;return{left:i.x-o/2,top:i.y-a/2,width:o,height:a}}selectChest(e){if(this.phase.is(`ready`,`selecting`,`entering`)){if(e===this.chestId&&this.phase.is(`ready`)){this.rig&&Si.fromTo(this.rig.state,{squash:.03},{squash:0,duration:.25,ease:`back.out(3)`});return}this.d.audio.play(`select`),this.d.ui.setPrimary(`open`),this.enterChest(e)}}async enterChest(e){let t=this.d,n=this.bump();this.softReset(),this.chestId=e,t.save.data.lastChest=e,t.save.persist();let r=sv.get(e);t.ui.setChest(e,r.name);let i=this.rig;i&&this.retiring.add(i);let a=new wb(e);a.reducedMotion=t.reduced(),a.addTo(t.sm.scene),a.apply(t.time()),this.rig=a;let o=hv[e];t.fx.setColors(o.rays,o.glow,o.glow2),t.fx.setScale(Math.max(a.model.dims.W,1.8)/2),t.sm.background.uniforms.uMood.value.set(o.mood),this.phase.phase===`loading`?this.phase.go(`selecting`):this.phase.can(`entering`)||this.phase.go(`resetting`),this.phase.go(`entering`);let s=Nx(this.ctx(),i,()=>{i&&this.retiring.delete(i)&&i.dispose()});return await this.run(s,n)?(this.phase.go(`ready`),!0):!1}softReset(){let e=this.d;e.presenter.hideAll(),e.fx.reset(),e.particles.clear(!0),e.overlay.clear(),e.ui.hideReveal(),e.ui.hideChoice(),e.ui.targetStrike(null),this.currentCard=null,(this.throneActive||e.sm.throne.group.visible)&&(e.sm.throneVisible=!1,this.throneActive=!1),e.sm.background.uniforms.uOpacity.value=1,e.sm.background.uniforms.uDim.value=0,e.sm.background.uniforms.uFlash.value=0,Object.assign(e.sm.accent,{push:0,shake:0,bloomBoost:0}),Object.assign(this.screen,{edge:0,flash:0,dim:0}),e.particles.setAmbient(24),this.session=null}hoverChest(e){this.rig&&(e&&!this.phase.is(`ready`)&&(e=!1),Si.to(this.rig.state,{hover:+!!e,duration:.28,ease:`power2.out`,overwrite:`auto`}))}async open(){if(!this.phase.is(`ready`)||!this.rig)return;let e=this.d;e.audio.unlock();let t=this.epoch;this.phase.go(`charging`);let n=this.nextSeed??xv();this.nextSeed=null;let r=ty(this.chestId,n,{forceRarity:this.forced});this.forced&&(this.forced=null,e.ui.setForced(null)),this.session=r;let i=[];for(let e of r.slots)e.kind===`single`?i.push(e.reward):i.push(...e.options);Z_(i),e.particles.reseed(n),e.overlay.reseed(n),this.pendingNext=!1,this.revealAllOn=!1,e.ui.setRemaining(oy(r));let{timeline:a,launchAt:o}=Px(this.ctx());a.call(()=>{t===this.epoch&&this.phase.is(`charging`)&&this.phase.go(`opening`)},[],`unlock`),this.track(a),await this.reach(a,o,t)&&(this.phase.is(`charging`)&&this.phase.go(`opening`),this.phase.go(`revealing`),this.revealNext(t))}onReveal(){let e=this.session;e&&(e.cursor=Math.min(e.slots.length,e.cursor+1),this.d.ui.setRemaining(oy(e)),this.d.ui.tickBadge())}onSettle(e){let t=this.d,n=t.sm.layout,r=null,i;if(e.kind===`card`&&e.cardId&&e.rarity){let n=t.save.data.cards[e.cardId]??0,i=0,a=this.session;if(a)for(let t=0;t<a.cursor;t++){let n=ry(a.slots[t]);n&&n!==e&&n.cardId===e.cardId&&(i+=n.amount)}let o=n+i;r={...sx(e.rarity,o+e.amount,t.save.data.upgrades[e.cardId]??0),before:o},tv.has(e.cardId)||(r=null)}else e.kind===`gold`?i=`Ваше золото: ${Sx(t.save.data.gold)}`:e.kind===`gems`?i=`Ваши самоцветы: ${Sx(t.save.data.gems)}`:e.kind===`wildcard`&&(i=`Подходит к любой карте этой редкости`);let a=e.rarity===`champion`&&!t.presenter.isChoiceCard(this.currentCard);t.ui.showReveal(e,this.cardRect(a?`high`:`center`,a?1.05:1),n.portrait,r,i)}async revealNext(e){let t=this.session;if(!t||e!==this.epoch)return;if(this.revealAllOn){let e=!1;for(;t.cursor<t.slots.length&&t.slots[t.cursor].kind===`single`;)t.cursor++,e=!0;e&&this.d.ui.setRemaining(oy(t))}if(t.cursor>=t.slots.length){this.finishReveals(e);return}let n=t.slots[t.cursor];if(n.kind===`choice`){this.presentChoice(e);return}this.phase.is(`revealing`)||this.phase.go(`revealing`);let r=n.reward,i=this.ctx(),a=this.d.presenter.nextMain(this.currentCard);this.currentCard=a;let o;r.kind===`card`&&r.rarity===`champion`?(o=qx(i,a,r,!this.throneActive),this.throneActive=!0):o=r.kind===`card`&&r.rarity===`legendary`?Gx(i,a,r):Wx(i,a,r),await this.run(o,e)&&this.afterSettle(e)}afterSettle(e){if(e===this.epoch){if(this.phase.go(`awaitingNext`),this.revealAllOn){this.next();return}if(this.pendingNext){this.pendingNext=!1;let t=Si.delayedCall(.25,()=>{e===this.epoch&&this.next()});this.track(Si.timeline().add(t));return}this.autoMode&&this.scheduleAuto(e)}}scheduleAuto(e){this.cancelAuto(),this.autoCall=Si.delayedCall(1.2,()=>{e===this.epoch&&this.phase.is(`awaitingNext`)&&this.next()})}setAuto(e){this.autoMode=e,e&&this.phase.is(`awaitingNext`)&&this.scheduleAuto(this.epoch),e||this.cancelAuto()}next(){if(this.phase.is(`revealing`)){this.pendingNext=!0;return}if(!this.phase.is(`awaitingNext`)||!this.session)return;this.cancelAuto();let e=this.epoch,t=this.d;t.audio.play(`click`,{gain:.6}),t.ui.hideReveal(),this.phase.go(`revealing`);let n=this.session,r=Si.timeline();this.currentCard&&r.add(Jx(this.ctx(),this.currentCard),0);let i=n.slots[n.cursor],a=!!i&&iy(i)===`champion`&&!this.revealAllOn;this.throneActive&&!a&&(r.add(Rx(this.ctx()),0),this.throneActive=!1),this.track(r),this.reach(r,.09,e).then(t=>{t&&this.revealNext(e)})}revealAll(){if(this.session&&!this.phase.is(`ready`,`entering`,`summary`,`collecting`,`resetting`,`awaitingStrikeChoice`,`striking`)){if(this.revealAllOn=!0,this.cancelAuto(),this.phase.is(`revealing`,`charging`,`opening`))for(let e of this.running.keys())e.timeScale(3);else this.phase.is(`awaitingNext`)&&this.next()}}async presentChoice(e){let t=this.session,n=t.slots[t.cursor];if(n.kind!==`choice`)return;this.phase.is(`revealing`)||this.phase.go(`revealing`);let r=iy(n)===`champion`;this.championChoice=r;let i=this.ctx(),a=Si.timeline(),o=0;if(r&&!this.throneActive&&(a.add(eS(i),0),this.throneActive=!0,o=.35),a.add(Yx(i,n.options,r),o),!await this.run(a,e))return;this.phase.go(`awaitingChoice`);let s=this.d.presenter.choiceUnit();this.d.ui.showChoice(n.options,[this.cardRect(`left`,s),this.cardRect(`right`,s)])}hoverChoice(e){this.phase.is(`awaitingChoice`)||(e=null),[this.d.presenter.left,this.d.presenter.right].forEach((t,n)=>Si.to(t.state,{hover:+(e===n),glow:e===n?.45:.12,duration:.18,overwrite:`auto`}))}choose(e){if(!this.phase.is(`awaitingChoice`)||!this.session)return;let t=this.session;if(!ay(t,t.cursor,e))return;let n=this.epoch,r=this.d;r.ui.hideChoice(),this.phase.go(`revealing`);let i=ry(t.slots[t.cursor]);t.cursor++,r.ui.setRemaining(oy(t)),r.ui.tickBadge();let a=this.ctx(),o=Xx(a,e);this.championChoice&&(o.call(()=>{r.audio.play(`champion`);let t=e===0?r.presenter.left:r.presenter.right;a.reduced||r.particles.burst(Wv.radial,t.worldPosition(),{colors:[`#8fe9ff`,`#ffffff`,`#ffe08a`]})},[],.3),o.to(r.fx.state,{flash:a.reduced?.2:.7,duration:.05},.3),o.to(r.fx.state,{flash:0,duration:.4},.35)),this.currentCard=e===0?r.presenter.left:r.presenter.right,this.run(o,n).then(e=>{e&&(this.onSettle(i),this.afterSettle(n))})}async finishReveals(e){let t=this.session;if(!t||e!==this.epoch)return;this.revealAllOn=!1;let n=this.d;n.ui.hideReveal();let r=Si.timeline();this.currentCard&&r.add(Jx(this.ctx(),this.currentCard),0),this.currentCard=null,this.throneActive&&=(r.add(Rx(this.ctx()),0),!1),r.to({},{duration:.22},0);let i=cy(t);if(t.strikesLeft>0&&i.length>0){if(!await this.run(r,e))return;this.phase.go(`awaitingStrikeChoice`),n.ui.showStrikes(i.map(e=>({index:e,reward:ry(t.slots[e])})),t.strikesLeft);return}this.toSummary(e,r)}strike(e){if(!this.phase.is(`awaitingStrikeChoice`)||!this.session||!this.rig)return;let t=this.session,n=this.d.ui.strikeTileRect(e);if(!n||t.strikesLeft<=0){this.d.audio.play(`deny`);return}let r=ly(t,e);if(!r){this.d.audio.play(`deny`);return}let i=this.d,a=this.epoch;this.phase.go(`striking`),Z_([r.next]),i.ui.targetStrike(e),i.ui.setStrikes(t.strikesLeft);let o=i.sm.toScreen(this.rig.anchor(`emblem`)),s={x:n.left+n.width/2,y:n.top+n.height/2},c=this.rig.state,l=Si.timeline();l.to(c,{charge:1,gemPulse:1,duration:.06},0),l.to(c,{charge:0,gemPulse:0,duration:.45},.12),l.call(()=>{i.overlay.bolt(o,s,{active:.11,life:.36,width:1.1}),i.audio.play(`lightning`)},[],.05),l.call(()=>{i.overlay.bolt(o,s,{active:.08,life:.3,width:.9}),i.overlay.impact(s.x,s.y,Math.max(40,n.width*.6)),i.ui.hitStrike(e)},[],.15),l.call(()=>i.ui.replaceStrike(e,r.next),[],.34),l.to({},{duration:.4},.34),this.run(l,a).then(e=>{if(e){if(i.ui.targetStrike(null),t.strikesLeft<=0){let e=Si.timeline();e.to({},{duration:.55}),this.run(e,a).then(e=>{e&&this.toSummary(a)})}else this.phase.go(`awaitingStrikeChoice`)}})}finishStrikes(){this.phase.is(`awaitingStrikeChoice`)&&this.toSummary(this.epoch)}toSummary(e,t){if(e!==this.epoch||!this.session)return;let n=this.d;this.phase.go(`summary`);let r=t??Si.timeline();r.add(Fx(this.ctx()),0),this.track(r),n.ui.showSummary(sy(this.session))}async claim(){if(!this.phase.is(`summary`)||!this.session)return;let e=this.d,t=this.epoch,n=this.session;this.phase.go(`collecting`);let r=e.save.award(n),i=e.ui.summaryTiles(),a=Si.timeline(),o=i.find(e=>e.dataset.kind===`gold`),s=i.find(e=>e.dataset.kind===`gems`);r.awarded&&r.gold>0&&o&&a.call(()=>{let t=o.getBoundingClientRect(),n=Math.min(18,8+Math.floor(Math.log10(r.gold+1)*2.5));e.overlay.coinsTo({x:t.left+t.width/2,y:t.top+t.height/2},e.ui.resourceAnchor(`gold`),n,t.width,()=>{e.audio.play(`coin`,{gain:.7}),e.ui.bumpResource(`gold`)})},[],0),r.awarded&&r.gems>0&&s&&a.call(()=>{e.audio.play(`coin`,{pitch:1.3}),e.ui.bumpResource(`gems`)},[],.45),a.call(()=>e.ui.countResources(e.save.data.gold,e.save.data.gems,.7),[],.35);let c=e.ui.collectionAnchor(),l=0;for(let t of i){if(t.dataset.kind===`gold`||t.dataset.kind===`gems`)continue;let n=.15+l*.045,r=[`epic`,`legendary`,`champion`,`rare`].includes(t.dataset.rarity??``);a.call(()=>{let n=t.getBoundingClientRect();r&&e.overlay.glint(n.left+n.width*.7,n.top+n.height*.25,n.width*.45),t.classList.add(`fly`),t.style.transform=`translate(${c.x-(n.left+n.width/2)}px, ${c.y-(n.top+n.height/2)}px) scale(0.15)`,t.style.opacity=`0`},[],n+(r?.12:0)),l++}a.call(()=>e.audio.play(`choice`,{pitch:1.2,gain:.6}),[],.2),a.to({},{duration:Math.max(1.25,.9+l*.045)},0),await this.run(a,t)&&(this.phase.go(`resetting`),e.ui.setPrimary(`again`),await this.enterChest(this.chestId))}openAgain(){this.open()}async scenario(e){let t={choice:`crystalRoyal`,lightning:`lightning`,champion:`royal`,legendary:`legendary`};this.forced=e===`champion`||e===`choice`?`champion`:e===`legendary`?`legendary`:null,this.d.ui.setForced(this.forced),await this.enterChest(t[e])&&await this.open()}async reset(){await this.enterChest(this.chestId)}setReduced(e){this.rig&&(this.rig.reducedMotion=e)}dispose(){this.bump(),this.rig?.dispose()}};function eS(e){let t=Si.timeline();return t.call(()=>{e.sm.throneVisible=!0},[],0),t.to(e.sm.background.uniforms.uOpacity,{value:0,duration:.4,ease:`power2.inOut`},0),t.to(e.screen,{edge:1,duration:.4},0),t.to(e.rig.state,{glow:1.4,duration:.3},0),t.call(()=>e.audio.play(`rise`,{pitch:.8}),[],0),t}var tS=()=>new Promise(e=>setTimeout(e,0)),nS=class{ceiling;acc=0;frames=0;low=0;high=0;cooldown=4;upgrades=0;constructor(e){this.ceiling=e}tick(e,t,n){if(this.acc+=e,this.frames++,this.acc<2)return;let r=this.frames/this.acc;if(this.cooldown-=this.acc,this.acc=0,this.frames=0,this.low=r<42?this.low+1:0,this.high=r>57?this.high+1:0,this.cooldown>0)return;let i=[`low`,`medium`,`high`],a=i.indexOf(t);this.low>=2&&a>0?(n(i[a-1]),this.low=0,this.cooldown=6):this.high>=5&&a<i.indexOf(this.ceiling)&&this.upgrades<2&&(n(i[a+1]),this.high=0,this.upgrades++,this.cooldown=10)}},rS=class{root;sm;particles;fx;presenter;overlay;controller;audio=new $_;save=new vx;clock=new Mx;ui;canvas;fxCanvas;params=new URLSearchParams(location.search);manual;reducedMedia=window.matchMedia(`(prefers-reduced-motion: reduce)`);raf=0;last=0;looping=!1;booted=!1;auto=null;debug=null;sheen;sheenState={x:-3,k:0};idle={magic:.6,arc:1.5,sheen:3.5};hoverChest=!1;particlesOn=!0;tmp=new U;constructor(e){this.root=e,this.canvas=e.querySelector(`#scene`),this.fxCanvas=e.querySelector(`#fx`),this.manual=this.params.has(`shot`)||this.params.has(`manual`),this.ui=new jx(e.querySelector(`#ui`),{open:()=>void this.controller?.open(),next:()=>this.controller?.next(),revealAll:()=>this.controller?.revealAll(),setAuto:e=>this.changeSettings({auto:e}),selectChest:e=>this.controller?.selectChest(e),choose:e=>this.controller?.choose(e),hoverChoice:e=>this.controller?.hoverChoice(e),strike:e=>this.controller?.strike(e),finishStrikes:()=>this.controller?.finishStrikes(),claim:()=>void this.controller?.claim(),openAgain:()=>this.controller?.openAgain(),changeSettings:e=>this.changeSettings(e),resetProgress:()=>{this.save.resetProgress(),this.ui.setResources(0,0),this.ui.toast(`Прогресс сброшен`)},upgrade:e=>{this.save.upgrade(e)&&(this.audio.play(`rare`),this.ui.renderCollection(this.save.data))},setForcedRarity:e=>{this.controller&&(this.controller.forced=e)},scenario:e=>void this.controller?.scenario(e),retry:()=>location.reload(),unlockAudio:()=>this.audio.unlock()}),this.ui.onModal=e=>{e===`collection`?this.ui.renderCollection(this.save.data):this.ui.renderSettings(this.save.data.settings)}}get reduced(){return this.save.data.settings.reducedMotion||this.reducedMedia.matches}async boot(){try{if(this.ui.loading(.05,`Загружаем шрифты…`),await this.loadFonts(),this.ui.loading(.18,`Готовим сцену…`),!this.webgl2Available()){this.ui.showError(`Не удалось запустить 3D-графику: браузер не поддерживает WebGL 2 или он отключён. Попробуйте обновить браузер или включить аппаратное ускорение.`,!0);return}this.sm=new Xb(this.canvas,{preserveDrawingBuffer:this.manual}),this.canvas.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),this.stopLoop(),this.ui.showError(`Графический контекст был потерян (например, из-за нехватки видеопамяти). Нажмите «Повторить», чтобы перезапустить сцену.`,!0)}),this.particles=new Jv(2400),this.fx=new zv(8),this.overlay=new Bv(this.fxCanvas),this.sm.scene.add(this.particles.mesh,this.fx.group),this.sheen=new Ud(`#ffffff`,0,6,1.5),this.sm.scene.add(this.sheen),this.presenter=new ix(this.sm,this.particles),this.controller=new $x({sm:this.sm,particles:this.particles,fx:this.fx,presenter:this.presenter,audio:this.audio,overlay:this.overlay,ui:this.ui,save:this.save,reduced:()=>this.reduced,time:()=>this.clock.time});let e=this.save.data.settings,t=this.guessQuality();this.auto=e.quality===`auto`?new nS(t):null;let n=this.params.get(`quality`),r=n===`low`||n===`medium`||n===`high`?n:e.quality===`auto`?t:e.quality;this.applyQuality(r),this.onResize(),this.applySettings(e),this.ui.setResources(this.save.data.gold,this.save.data.gems),this.bindInput(),this.ui.loading(.3,`Рисуем карты…`),await this.prepareCards(e=>this.ui.loading(.3+e*.3)),this.ui.loading(.6,`Собираем сундуки…`);let i=await this.renderThumbnails(e=>this.ui.loading(.6+e*.3));this.ui.setChestThumbs(i),this.ui.loading(.94,`Разогреваем эффекты…`),await this.warmUp(),this.ui.loading(1),this.booted=!0,this.params.has(`debug`)&&this.createDebug();let a=this.params.get(`chest`),o=a&&lv(a)?a:this.save.data.lastChest,s=Number(this.params.get(`seed`));this.params.has(`seed`)&&Number.isFinite(s)&&(this.controller.nextSeed=s);let c=this.params.get(`force`);if(c&&uv.includes(c)&&(this.controller.forced=c),window.__treasury=this.testApi(),this.manual){this.ui.hideLoading(),this.controller.enterChest(o),this.params.has(`shot`)&&this.runShot();return}window.setTimeout(()=>this.ui.hideLoading(),150),this.startLoop(),this.controller.enterChest(o),this.save.recovered&&this.ui.toast(`Сохранение было повреждено — начат новый прогресс`,4e3)}catch(e){console.error(e),this.ui.showError(`Не удалось загрузить сцену. ${e instanceof Error?e.message:``}`,!0)}}webgl2Available(){try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}async loadFonts(){if(!document.fonts)return;let e=[`500`,`700`,`800`,`900`].map(e=>document.fonts.load(`${e} 32px "Rubik Variable"`,`Сокровищница ?×+0`));await Promise.race([Promise.all(e),new Promise(e=>setTimeout(e,2500))])}guessQuality(){let e=window.matchMedia(`(pointer: coarse)`).matches,t=navigator.hardwareConcurrency||4;return e||t<=4?`medium`:`high`}applyQuality(e){this.sm.setQuality(e);let t=qb[e];this.particles.quality=this.particlesOn?t.particles:0,this.fx.setQuality(t.rays);for(let e of this.presenter.cards)e.iridescenceAllowed=t.iridescence;this.onResize()}applySettings(e){this.audio.setEnabled(e.sound),this.audio.setVolume(e.volume),this.clock.speed=e.speed;let t=this.reduced;this.controller.setReduced(t),this.overlay.reduced=t,this.root.classList.toggle(`reduced-motion`,t),this.controller.setAuto(e.auto),this.ui.setAuto(e.auto)}changeSettings(e){let t=this.save.data.settings,n=e.quality!==void 0&&e.quality!==t.quality;Object.assign(t,e),this.save.persist(),this.applySettings(t),n&&(t.quality===`auto`?(this.auto=new nS(this.guessQuality()),this.applyQuality(this.guessQuality())):(this.auto=null,this.applyQuality(t.quality))),e.sound===!0&&(this.audio.unlock(),this.audio.play(`click`))}allRewards(){let e=ev.map(e=>({id:e.id,kind:`card`,rarity:e.rarity,cardId:e.id,amount:1}));e.push({id:`gold`,kind:`gold`,amount:1},{id:`gems`,kind:`gems`,amount:1});for(let t of uv)t!==`champion`&&e.push({id:`wild-${t}`,kind:`wildcard`,rarity:t,amount:1});return e}async prepareCards(e){let t=this.allRewards(),n=this.sm.renderer;n.initTexture(X_(`normal`)),n.initTexture(X_(`champion`));for(let r=0;r<t.length;r++){let i=q_(t[r]);n.initTexture(i.map),n.initTexture(i.mask),r%3==2&&(e(r/t.length),await tS())}e(1)}async renderThumbnails(e){let t=this.sm.renderer,n=new Map,r=new Gs;r.environment=this.sm.scene.environment,r.environmentIntensity=.95;let i=new kd(`#d6ebff`,`#28324f`,1.2),a=new Kd(`#fff3e2`,2.8);a.position.set(-4,7.5,6);let o=new Kd(`#8cb6ff`,1);o.position.set(5.5,2.5,3.5);let s=new Kd(`#9fe8ff`,2.2);s.position.set(1.5,4.2,-6.5),r.add(i,a,o,s);let c=new Vd(24,1,.1,60),l=document.createElement(`canvas`);l.width=l.height=192;let u=l.getContext(`2d`,{willReadFrequently:!0}),d=t.getClearColor(new W),f=t.getClearAlpha(),p=192/t.getPixelRatio(),m=new oc,h=new jc,g=0;for(let i of ov){let a=new wb(i.id);a.state.idle=0,a.apply(0),r.add(a.root),a.root.updateMatrixWorld(!0),m.setFromObject(a.root),m.getBoundingSphere(h);let o=h.radius/Math.sin(Lo.degToRad(c.fov/2))*.98;c.position.set(h.center.x+o*.18,h.center.y+o*.36,h.center.z+o*.92),c.lookAt(h.center),t.setRenderTarget(null),t.setScissorTest(!0),t.setViewport(0,0,p,p),t.setScissor(0,0,p,p);let s=e=>(t.setClearColor(e,1),t.clear(),t.render(r,c),u.clearRect(0,0,192,192),u.drawImage(t.domElement,0,t.domElement.height-192,192,192,0,0,192,192),u.getImageData(0,0,192,192)),d=s(0),f=s(16777215),_=u.createImageData(192,192);for(let e=0;e<_.data.length;e+=4){let t=(f.data[e]-d.data[e]+f.data[e+1]-d.data[e+1]+f.data[e+2]-d.data[e+2])/3,n=Math.max(0,Math.min(255,255-t)),r=n>0?255/n:0;_.data[e]=Math.min(255,d.data[e]*r),_.data[e+1]=Math.min(255,d.data[e+1]*r),_.data[e+2]=Math.min(255,d.data[e+2]*r),_.data[e+3]=n}u.putImageData(_,0,0),n.set(i.id,l.toDataURL(`image/png`)),r.remove(a.root),a.dispose(),e(++g/ov.length),await tS()}return t.setScissorTest(!1),t.setClearColor(d,f),this.onResize(),n}async warmUp(){let e=new wb(`legendary`);e.addTo(this.sm.scene),e.state.glow=1,e.state.seam=1,e.apply(0);let t=this.presenter.main;t.setReward({id:`warm`,kind:`card`,rarity:`legendary`,cardId:`phoenix`,amount:1}),Object.assign(t.state,{opacity:1,halo:1,iri:1}),this.fx.state.rays=1,this.fx.state.core=1,this.fx.state.flash=.5,this.fx.state.ring=.5,this.sm.throneVisible=!0,this.particles.burst(Wv.cardSparks,new U(0,1,0),{count:4}),this.fx.update(0,this.sm.camera,new U(0,1,0)),this.presenter.update(0,0),this.particles.update(.016),this.sm.updateCamera(0),this.sm.compile(),this.sm.render(0),await tS(),this.sm.throneVisible=!1,t.reset(),this.fx.reset(),this.particles.clear(!1),e.dispose(),this.fx.update(0,this.sm.camera,new U)}startLoop(){this.looping||this.manual||(this.looping=!0,this.last=performance.now(),this.raf=requestAnimationFrame(this.frame))}stopLoop(){this.looping=!1,cancelAnimationFrame(this.raf)}frame=e=>{if(!this.looping)return;this.raf=requestAnimationFrame(this.frame);let t=Math.max(0,(e-this.last)/1e3);this.last=e,this.tick(t,!0),this.auto&&document.visibilityState===`visible`&&this.booted&&this.auto.tick(t,this.sm.quality,e=>this.applyQuality(e)),this.debug?.update(t)};tick(e,t){let n=this.clock.advance(e),r=this.clock.time,i=this.controller;this.sm.updateCamera(r),this.particles.setCamera(this.sm.camera);for(let e of i.retiringRigs)e.apply(r);let a=i.rig;if(a?(a.apply(r),this.sm.setRimBoost(a.state.hover),a.anchor(`cavity`,this.tmp)):this.tmp.set(0,1,0),this.fx.update(r,this.sm.camera,this.tmp),this.presenter.update(r,n),this.particles.update(n),this.overlay.update(n),this.updateIdle(n),a){let e=this.sm.toScreen(a.counterAnchor(this.tmp));this.ui.positionBadge(e.x,e.y)}this.ui.setScreenFx(i.screen.edge,i.screen.flash,i.screen.dim),t&&this.sm.render(n)}updateIdle(e){let t=this.controller,n=t.rig;if(!n||e<=0)return;let r=hv[t.chestId],i=t.phase.is(`ready`);if(this.idle.magic-=e,this.idle.arc-=e,this.idle.sheen-=e,i&&r.magic&&this.idle.magic<=0){this.idle.magic=.45+Math.random()*.5;let e=n.root.position.clone();e.y+=n.model.dims.baseY+n.model.dims.H*.9,this.particles.burst(Wv.magicIdle,e,{colors:r.sparks})}if(i&&r.arcs&&this.idle.arc<=0){this.idle.arc=1.6+Math.random()*1.6;let e=this.sm.toScreen(n.anchor(`top`)),t=this.sm.layout.height*.09,r={x:e.x-t*(.6+Math.random()*.5),y:e.y+t*(.2+Math.random()*.9)},i={x:e.x+t*(.4+Math.random()*.6),y:e.y+Math.random()*.6*t};this.overlay.bolt(r,i,{width:.45,active:.07,life:.22}),this.audio.play(`arc`,{gain:.35})}i&&this.idle.sheen<=0&&!this.reduced&&(this.idle.sheen=5.5+Math.random()*2,this.sheenState.x=-3,this.sheenState.k=0,Si.to(this.sheenState,{x:3,duration:.95,ease:`sine.inOut`}),Si.to(this.sheenState,{k:1,duration:.47,yoyo:!0,repeat:1,ease:`sine.inOut`}));let a=n.model.dims;this.sheen.position.set(this.sheenState.x,a.baseY+a.H+.4,a.D/2+1.1),this.sheen.intensity=this.sheenState.k*14}bindInput(){window.addEventListener(`resize`,()=>this.onResize()),window.visualViewport?.addEventListener(`resize`,()=>this.onResize()),document.addEventListener(`visibilitychange`,()=>{document.hidden?(this.stopLoop(),this.audio.setHidden(!0)):(this.audio.setHidden(!1),this.booted&&this.startLoop())}),this.reducedMedia.addEventListener(`change`,()=>this.applySettings(this.save.data.settings)),this.canvas.addEventListener(`pointermove`,e=>this.onPointerMove(e)),this.canvas.addEventListener(`pointerleave`,()=>this.setHover(!1)),this.canvas.addEventListener(`click`,e=>this.onCanvasClick(e)),window.addEventListener(`keydown`,e=>this.onKey(e)),window.addEventListener(`pointerdown`,()=>this.audio.unlock(),{capture:!0})}onResize(){if(!this.sm)return;let e=window.innerWidth,t=window.innerHeight;this.sm.resize(e,t),this.overlay?.resize(e,t,window.devicePixelRatio||1),this.presenter?.syncUnits();let n=this.root.querySelector(`.topbar`)?.getBoundingClientRect();this.ui.positionPanels(Math.max(n?n.bottom+8:70,t*.08)),this.controller?.relayout()}chestHit(e){let t=this.controller?.rig;if(!t)return!1;let n=t.model.dims,r=t.root.position.clone();r.y+=n.baseY+(n.H+n.lidH)*.5;let i=this.sm.toScreen(r),a=Math.max(n.W,n.H+n.lidH)*.62/this.sm.worldPerPixel(this.sm.layout.distance);return Math.hypot(e.clientX-i.x,(e.clientY-i.y)*1.15)<a}setHover(e){e!==this.hoverChest&&(this.hoverChest=e,this.canvas.classList.toggle(`pointer`,e),this.controller?.hoverChest(e))}onPointerMove(e){if(!this.booted)return;let t=this.sm.layout;e.pointerType===`mouse`&&(this.sm.pointer.set((e.clientX/t.width-.5)*2,(e.clientY/t.height-.5)*2),this.sm.background.uniforms.uOffset.value.set(-this.sm.pointer.x*8*t.dpr,this.sm.pointer.y*8*t.dpr)),this.setHover(this.controller.phase.is(`ready`)&&this.chestHit(e))}onCanvasClick(e){if(!this.booted||this.ui.modalOpen)return;this.audio.unlock();let t=this.controller;t.phase.is(`ready`)?this.chestHit(e)&&t.open():t.phase.is(`awaitingNext`,`revealing`)&&t.next()}onKey(e){if(!this.booted)return;if(e.key===`Escape`){this.ui.closeModals();return}if(this.ui.modalOpen)return;let t=document.activeElement,n=!!t&&t!==document.body&&t.matches(`button, input, select, textarea`),r=this.controller;if((e.key===`ArrowLeft`||e.key===`ArrowRight`)&&r.phase.is(`awaitingChoice`)){let t=e.key===`ArrowLeft`?0:1;this.ui.focusChoice(t),r.hoverChoice(t),e.preventDefault();return}(e.key===` `||e.key===`Enter`)&&!n&&(e.preventDefault(),this.audio.unlock(),r.phase.is(`ready`)?r.open():r.phase.is(`awaitingNext`,`revealing`)?r.next():r.phase.is(`summary`)&&r.claim())}createDebug(){this.debug=new yx(this.root,{info:()=>({phase:this.controller.phase.phase,chest:this.controller.chestId,seed:this.controller.session?.seed??`-`,remaining:this.controller.session?this.controller.session.slots.length-this.controller.session.cursor:`-`,quality:this.sm.quality,calls:this.sm.renderer.info.render.calls,tris:this.sm.renderer.info.render.triangles,particles:this.particles.alive,geometries:this.sm.renderer.info.memory.geometries,textures:this.sm.renderer.info.memory.textures,timelines:this.controller.activeTimelines.length}),selectChest:e=>void this.controller.enterChest(e),setSeed:e=>this.controller.nextSeed=e,force:e=>this.controller.forced=e,scenario:e=>void this.controller.scenario(e),speed:e=>this.clock.speed=e,pause:e=>this.clock.paused=e,step:()=>{let e=this.clock.paused;this.clock.paused=!1,this.tick(1/60,!0),this.clock.paused=e},timelines:()=>this.controller.activeTimelines,bloom:e=>this.sm.bloomEnabled=e,particles:e=>{this.particlesOn=e,this.particles.quality=e?qb[this.sm.quality].particles:0,e||this.particles.clear(!1),this.particles.setAmbient(e?24:0)},reset:()=>void this.controller.reset(),suppressAudio:e=>this.audio.suppress(e)})}testApi(){return{step:async(e,t=60,n=!0)=>{let r=Math.max(1,Math.round(e/1e3*t));for(let e=0;e<r;e++)this.tick(1/t,n&&e===r-1),await tS()},render:()=>this.sm.render(0),bench:(e=60)=>{let t=this.sm.renderer.getContext(),n=performance.now();for(let n=0;n<e;n++)this.tick(1/60,!0),t.finish();return{msPerFrame:(performance.now()-n)/e,quality:this.sm.quality,dpr:this.sm.layout.dpr,size:[this.sm.layout.width,this.sm.layout.height]}},state:()=>({phase:this.controller.phase.phase,chest:this.controller.chestId,cursor:this.controller.session?.cursor??null,slots:this.controller.session?.slots.length??null,strikes:this.controller.session?.strikesLeft??null,collected:this.controller.session?.collected??null,gold:this.save.data.gold,openings:this.save.data.openings,particles:this.particles.alive,geometries:this.sm.renderer.info.memory.geometries,textures:this.sm.renderer.info.memory.textures,calls:this.sm.renderer.info.render.calls}),controller:this.controller,ui:this.ui,save:this.save}}async runShot(){let e=(this.params.get(`script`)??``).split(`,`).filter(Boolean).map(e=>{let[t,n]=e.split(`@`);return{act:t,at:Number(n??0)}}).sort((e,t)=>e.at-t.at),t=Number(this.params.get(`t`)??1.5),n=1/60,r=0,i=0,a=this.controller;for(;r<t;){for(;i<e.length&&e[i].at<=r;){let{act:t}=e[i++];if(t===`open`)a.open();else if(t===`next`)a.next();else if(t===`all`)a.revealAll();else if(t===`choose0`)a.choose(0);else if(t===`choose1`)a.choose(1);else if(t===`hover1`)a.hoverChoice(1);else if(t===`claim`)a.claim();else if(t===`done`)a.finishStrikes();else if(t.startsWith(`strike`)){let e=a.session,n=e?cy(e)[Number(t.slice(6)||0)]:void 0;n!==void 0&&a.strike(n)}else t===`collection`?this.ui.openModal(`collection`):t===`settings`&&this.ui.openModal(`settings`)}this.tick(n,!1),r+=n,await tS()}this.tick(0,!0),document.title=`SHOT_READY ${a.phase.phase}`}},iS=document.getElementById(`app`);iS&&new rS(iS).boot();