const $ = (s) => document.querySelector(s);
const els = {name:$('#locationName'),coords:$('#coords'),score:$('#score'),quality:$('#quality'),summary:$('#summary'),status:$('#statusText'),verdict:$('#verdict'),tonightCard:$('#tonightCard'),updated:$('#updatedText'),hourly:$('#hourly'),date:$('#forecastDate'),cloud:$('#cloudMetric'),activity:$('#activityMetric'),dark:$('#darkMetric'),places:$('#places'),sheet:$('#searchSheet'),backdrop:$('#sheetBackdrop'),input:$('#searchInput'),results:$('#searchResults'),hint:$('#searchHint'),toast:$('#toast'),forecastView:$('#forecastView'),mapView:$('#mapView'),placesView:$('#placesView'),mapNote:$('#mapNote'),bestWindow:$('#bestWindow'),viewMode:$('#viewMode'),directionText:$('#directionText'),directionArrow:$('#directionArrow'),kp:$('#kpValue'),bz:$('#bzValue'),confidence:$('#confidenceText'),infoSheet:$('#infoSheet'),detailBackdrop:$('#detailBackdrop'),infoTitle:$('#infoTitle'),infoBody:$('#infoBody'),infoSource:$('#infoSource'),hourDetail:$('#hourDetail'),outlook:$('#outlook'),bzStatus:$('#bzStatus'),kpStatus:$('#kpStatus'),wind:$('#windValue'),windStatus:$('#windStatus'),cloudStatus:$('#cloudStatus'),cloudNext:$('#cloudNext'),darkNext:$('#darkNext'),tzNote:$('#tzNote'),activitySub:$('#activitySub'),darkSub:$('#darkSub')};
const FALLBACK={name:'Szczecin',country:'Polska',lat:53.4285,lon:14.5528,isDefault:true};
// Uszkodzone dane lub zablokowana pamięć przeglądarki nie mogą zatrzymać całej aplikacji.
function loadSaved(){try{const v=JSON.parse(localStorage.getItem('aurora-places')||'[]');return Array.isArray(v)?v.filter(p=>p&&typeof p.name==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)):[]}catch{return []}}
let saved=loadSaved();
const NOAA_TTL=5*60*1000,REFRESH_EVERY=5*60*1000;
let loadSeq=0,mapLoc=null;
let current=null, auroraGrid=null, spaceWeather=null, timer, map, auroraLayer, locationMarker;
// Ostatnio pokazana prognoza. Z niej budujemy panele szczegółów po stuknięciu w kafelek.
let home=null, infoOpener=null;
// Zamienia znaki specjalne HTML, żeby nazwy z zewnętrznych serwisów i localStorage nie były traktowane jak kod.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const fmtCoords=(lat,lon)=>`${Math.abs(lat).toFixed(2)}°${lat>=0?'N':'S'}  •  ${Math.abs(lon).toFixed(2)}°${lon>=0?'E':'W'}`;
function toast(msg){els.toast.textContent=msg;els.toast.classList.add('show');setTimeout(()=>els.toast.classList.remove('show'),2200)}
function store(){try{localStorage.setItem('aurora-places',JSON.stringify(saved))}catch{toast('Nie udało się zapisać miejsca w tej przeglądarce')}}
function openSheet(){els.sheet.hidden=false;els.backdrop.hidden=false;setTimeout(()=>els.input.focus(),80)}
function closeSheet(){els.sheet.hidden=true;els.backdrop.hidden=true;els.input.value='';els.results.innerHTML='';els.hint.textContent='Wpisz co najmniej 2 znaki.'}
function switchView(name){const views={forecast:els.forecastView,map:els.mapView,places:els.placesView};Object.entries(views).forEach(([key,el])=>el.hidden=key!==name);[['homeBtn','forecast'],['mapBtn','map'],['savedBtn','places']].forEach(([id,key])=>$('#'+id).classList.toggle('active',key===name));if(name==='map')showMap();window.scrollTo({top:0,behavior:'smooth'})}
async function fetchJSON(url,timeout=10000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(t)}}
async function getAuroraGrid(){if(auroraGrid&&Date.now()-auroraGrid.fetchedAt<NOAA_TTL)return auroraGrid;try{const d=await fetchJSON('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json');auroraGrid={coords:d.coordinates||[],time:d['Forecast Time']||d['Observation Time'],fetchedAt:Date.now()};return auroraGrid}catch{return auroraGrid||{coords:[],time:null}}}
async function getSpaceWeather(){
	if(spaceWeather&&Date.now()-spaceWeather.fetchedAt<NOAA_TTL)return spaceWeather;
	const old=spaceWeather;
	const [kpResult,magResult,kpfResult,windResult]=await Promise.allSettled([
		fetchJSON('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
		fetchJSON('https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json'),
		fetchJSON('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'),
		fetchJSON('https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json')
	]);
	const kpRows=kpResult.status==='fulfilled'?kpResult.value:[];
	const magRows=magResult.status==='fulfilled'?magResult.value:[];
	const kpRow=kpRows.slice().reverse().find(r=>Number.isFinite(Number(r.Kp)))||kpRows.slice(1).reverse().find(r=>Number.isFinite(Number(r[1])));
	const bzOk=r=>r&&r.bz_gsm!=null&&Number.isFinite(Number(r.bz_gsm));
	const bzRow=magRows.find(r=>r.active===true&&bzOk(r))||magRows.find(bzOk)||magRows.slice(1).reverse().find(r=>Number.isFinite(Number(r[3])));
	// Średni Bz z ostatnich 30 minut aktywnego satelity. Pojedynczy odczyt minutowy jest zbyt zaszumiony.
	const activeMag=magRows.filter(r=>r&&r.active===true&&bzOk(r));
	const newest=activeMag.length?Date.parse(activeMag[0].time_tag+'Z'):NaN;
	const recent=activeMag.filter(r=>newest-Date.parse(r.time_tag+'Z')<30*60000);
	const bzAvg=recent.length?recent.reduce((a,r)=>a+Number(r.bz_gsm),0)/recent.length:null;
	// Przebieg z ostatnich 2 godzin do wykresów, od najstarszego odczytu.
	const lastHours=(rows,key)=>{const t0=rows.length?Date.parse(rows[0].time_tag+'Z'):NaN;return rows.map(r=>({t:Date.parse(r.time_tag+'Z'),v:Number(r[key])})).filter(r=>t0-r.t<=2*3600000).reverse()};
	const bzSeries=lastHours(activeMag,'bz_gsm');
	// Prędkość i gęstość wiatru słonecznego z tego samego, aktywnego satelity.
	const windRows=windResult.status==='fulfilled'&&Array.isArray(windResult.value)?windResult.value:[];
	const activeWind=windRows.filter(r=>r&&r.active===true&&r.proton_speed!=null&&Number.isFinite(Number(r.proton_speed)));
	const windSeries=lastHours(activeWind,'proton_speed');
	const density=activeWind.find(r=>r.proton_density!=null&&Number.isFinite(Number(r.proton_density)))?.proton_density;
	// Prognoza Kp w blokach 3-godzinnych, czas w UTC.
	const kpfRows=kpfResult.status==='fulfilled'&&Array.isArray(kpfResult.value)?kpfResult.value:[];
	const kpForecast=kpfRows.map(r=>Array.isArray(r)?{t:Date.parse(r[0]+'Z'),kp:Number(r[1])}:{t:Date.parse(String(r.time_tag).replace(/Z?$/,'Z')),kp:Number(r.kp)}).filter(r=>Number.isFinite(r.t)&&Number.isFinite(r.kp));
	spaceWeather={
		bzAvg,
		bzSeries,
		windSeries,
		wind:activeWind.length?Number(activeWind[0].proton_speed):null,
		density:density!=null?Number(density):null,
		kpForecast,
		kp:kpRow?Number(kpRow.Kp??kpRow[1]):null,
		bz:bzRow?Number(bzRow.bz_gsm??bzRow[3]):null,
		time:bzRow?.time_tag||bzRow?.[0]||kpRow?.time_tag||kpRow?.[0],
		fetchedAt:Date.now()
	};
	// Gdy NOAA chwilowo nie odpowiada, zostawiamy poprzednie wartości zamiast pustych.
	if(old&&spaceWeather.kp==null)spaceWeather.kp=old.kp;
	if(old&&spaceWeather.bz==null)spaceWeather.bz=old.bz;
	if(old&&spaceWeather.bzAvg==null)spaceWeather.bzAvg=old.bzAvg;
	if(old&&!spaceWeather.kpForecast.length)spaceWeather.kpForecast=old.kpForecast;
	if(old&&spaceWeather.wind==null){spaceWeather.wind=old.wind;spaceWeather.density=old.density;spaceWeather.windSeries=old.windSeries}
	if(old&&!spaceWeather.bzSeries.length)spaceWeather.bzSeries=old.bzSeries;
	return spaceWeather;
}
// Zorza świeci na wysokości 100–300 km, więc widać ją nad horyzontem nawet około 1000 km od owalu. Im dalej, tym niżej i słabiej.
const HORIZON_KM=1000;
const visWeight=km=>clamp(1-km/HORIZON_KM,0,1);
// Najwyższa widoczna aktywność z modelu OVATION w promieniu 1000 km. null, gdy modelu brak.
function auroraAt(lat,lon,grid){if(!grid.coords.length)return null;const targetLon=lon<0?lon+360:lon,cosLat=Math.cos(lat*RAD);let best=0;for(const p of grid.coords){const v=Number(p[2])||0;if(v<=best)continue;const dLat=(p[1]-lat)*111.2;if(Math.abs(dLat)>HORIZON_KM)continue;const dLonDeg=Math.min(Math.abs(p[0]-targetLon),360-Math.abs(p[0]-targetLon));const dLon=dLonDeg*111.2*Math.max(cosLat,Math.cos(p[1]*RAD));const w=visWeight(Math.hypot(dLat,dLon));if(v*w>best)best=v*w}return best}
// To samo dla aktywności liczonej z Kp: sprawdzamy pas ±9° szerokości magnetycznej.
function kpVisible(mlat,kp){let best=0;for(let dm=-9;dm<=9;dm+=.5){const v=kpActivity(Math.abs(mlat)+dm,kp)*visWeight(Math.abs(dm)*111.2);if(v>best)best=v}return best}
// Open-Meteo zwraca czas lokalny miejsca bez strefy. Czytamy go jako UTC, żeby wynik nie zależał od strefy przeglądarki.
const localMs=t=>Date.parse(t+'Z');
const localHM=ms=>new Date(ms).toISOString().slice(11,16);
// Pozycja Słońca i Księżyca. Wzory jak w bibliotece SunCalc (Vladimir Agafonkin, licencja BSD), uproszczone do tego, czego potrzebujemy.
const RAD=Math.PI/180,DAY_MS=864e5,J1970=2440588,J2000=2451545,OBLIQ=RAD*23.4397;
const toDays=ms=>ms/DAY_MS-.5+J1970-J2000;
const rightAsc=(l,b)=>Math.atan2(Math.sin(l)*Math.cos(OBLIQ)-Math.tan(b)*Math.sin(OBLIQ),Math.cos(l));
const declin=(l,b)=>Math.asin(Math.sin(b)*Math.cos(OBLIQ)+Math.cos(b)*Math.sin(OBLIQ)*Math.sin(l));
const altOf=(H,phi,dec)=>Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
const sidereal=(d,lw)=>RAD*(280.16+360.9856235*d)-lw;
function sunCoords(d){const M=RAD*(357.5291+.98560028*d),L=M+RAD*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M))+RAD*102.9372+Math.PI;return {dec:declin(L,0),ra:rightAsc(L,0)}}
function moonCoords(d){const L=RAD*(218.316+13.176396*d),M=RAD*(134.963+13.064993*d),F=RAD*(93.272+13.22935*d),l=L+RAD*6.289*Math.sin(M),b=RAD*5.128*Math.sin(F);return {ra:rightAsc(l,b),dec:declin(l,b),dist:385001-20905*Math.cos(M)}}
// Wysokości w stopniach nad horyzontem, jasność Księżyca jako część tarczy 0–1.
function skyAt(ms,lat,lon){const d=toDays(ms),lw=RAD*-lon,phi=RAD*lat,s=sunCoords(d),m=moonCoords(d),st=sidereal(d,lw);
const sunAlt=altOf(st-s.ra,phi,s.dec)/RAD,moonAlt=altOf(st-m.ra,phi,m.dec)/RAD;
const SUN_DIST=149598000,ph=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra)),inc=Math.atan2(SUN_DIST*Math.sin(ph),m.dist-SUN_DIST*Math.cos(ph));
return {sunAlt,moonAlt,moonIllum:(1+Math.cos(inc))/2}}
// Ciemność 0–1: zmierzch żeglarski przy -12°, astronomiczny przy -18°. Jasny Księżyc wysoko na niebie obniża wynik nawet o połowę.
function darknessOf(sky){const a=sky.sunAlt;const sunF=a>=0?.05:a>=-6?.15:a>=-12?.15+(-6-a)/6*.55:a>=-18?.7+(-12-a)/6*.3:1;
const moonF=sky.moonAlt<=0?1:1-.5*sky.moonIllum*Math.min(1,sky.moonAlt/30);return sunF*moonF}
// Szerokość geomagnetyczna z modelu dipola. Biegun geomagnetyczny około 2025 r.
function magLat(lat,lon){const pl=80.8*RAD,po=-72.6*RAD,la=lat*RAD,lo=lon*RAD;return Math.asin(Math.sin(la)*Math.sin(pl)+Math.cos(la)*Math.cos(pl)*Math.cos(lo-po))/RAD}
// Aktywność z Kp w skali modelu OVATION. Owal zorzy przesuwa się o około 2° na każdy punkt Kp i rośnie razem z Kp.
function kpActivity(mlat,kp){const center=75-2*kp,width=5+.4*kp,peak=8+5*kp;return peak*Math.exp(-(((Math.abs(mlat)-center)/width)**2))}
async function reverseGeocode(lat,lon){try{const d=await fetchJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pl`);return {name:d.city||d.locality||d.principalSubdivision||'Twoja lokalizacja',country:d.countryName||''}}catch{return null}}
async function loadLocation(loc,{quiet=false}={}){const seq=++loadSeq;current=loc;if(!quiet){els.name.textContent=loc.name;els.coords.textContent=fmtCoords(loc.lat,loc.lon);els.status.textContent='Aktualizuję prognozę';els.score.textContent='—';renderPlaces()}const [grid,space]=await Promise.all([getAuroraGrid(),getSpaceWeather()]);if(seq!==loadSeq)return;try{const [weather]=await Promise.all([fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&current=cloud_cover&forecast_days=3&timezone=auto`)]);if(seq!==loadSeq)return;renderForecast(loc,weather,grid,space);if(!els.mapView.hidden)showMap()}catch(e){if(seq!==loadSeq||quiet)return;renderSpaceOnly(loc,grid,space)}}
// Bez prognozy pogody nie policzymy szansy, ale nadal pokazujemy aktywność, Kp i Bz z NOAA.
function renderSpaceOnly(loc,grid,space){const act=auroraAt(loc.lat,loc.lon,grid)??kpVisible(magLat(loc.lat,loc.lon),space.kp??2);home={loc,grid,space,rows:[],act,offset:null,night:null,sel:0};renderSpaceTiles(space,act);els.cloud.textContent='—';els.cloudStatus.textContent='Brak prognozy pogody';els.cloudNext.textContent='';els.dark.textContent='—';els.darkSub.textContent='Brak danych';els.darkNext.textContent='';els.hourly.innerHTML='';els.hourDetail.textContent='Bez prognozy pogody nie pokażemy szansy w kolejnych godzinach.';els.outlook.hidden=true;els.status.textContent='Brak prognozy pogody';els.verdict.textContent='Nie znamy teraz zachmurzenia';els.summary.textContent=`Aktywność zorzowa jest ${activityLabel(act).toLowerCase()}, ale bez danych o chmurach nie policzymy szansy. Spróbuj ponownie za chwilę.`;els.tonightCard.hidden=true}
function intensityColor(v){return v>=70?'#ff6d5a':v>=40?'#ffe45b':v>=18?'#b4ff63':'#52d9ba'}
async function showMap(){if(!window.L){els.mapNote.textContent='Mapa nie mogła się załadować. Sprawdź połączenie.';return}if(!map){map=L.map('auroraMap',{zoomControl:true,worldCopyJump:true}).setView(current?[current.lat,current.lon]:[65,18],3);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:8,attribution:'© OpenStreetMap'}).addTo(map)}setTimeout(()=>map.invalidateSize(),50);if(current){if(locationMarker)locationMarker.remove();locationMarker=L.circleMarker([current.lat,current.lon],{radius:7,color:'#fff',weight:2,fillColor:'#68f7bb',fillOpacity:1}).addTo(map).bindPopup(esc(current.name));if(mapLoc!==current){map.panTo([current.lat,current.lon]);mapLoc=current}}const grid=await getAuroraGrid();if(auroraLayer)auroraLayer.remove();auroraLayer=L.layerGroup().addTo(map);const renderer=L.canvas({padding:.5});let shown=0;for(let i=0;i<grid.coords.length;i+=3){const p=grid.coords[i],v=Number(p[2])||0;if(v<8)continue;let lon=p[0]>180?p[0]-360:p[0];L.circleMarker([p[1],lon],{renderer,radius:3+v/22,stroke:false,fillColor:intensityColor(v),fillOpacity:clamp(.22+v/120,.25,.82)}).addTo(auroraLayer);shown++}els.mapNote.textContent=shown?`Model NOAA OVATION • aktualizacja ${grid.time?new Date(grid.time).toLocaleString('pl-PL'):'bieżąca'}`:'Aktualnie model nie pokazuje wyraźnej aktywności.'}
// Aktywność na daną godzinę. Model OVATION przewiduje około godzinę naprzód, więc przez 3 godziny płynnie przechodzimy na prognozę Kp.
function kpAt(space,ms){const blocks=space.kpForecast||[];const b=blocks.filter(r=>r.t<=ms).pop();return b&&ms-b.t<3*3600000?b.kp:space.kp}
function activityAt(ovation,mlat,space,ms,hoursAhead){let kp=kpAt(space,ms);if(kp==null||!Number.isFinite(kp))return ovation;
// Długo ujemny Bz zapowiada wzrost aktywności w najbliższych godzinach.
if(hoursAhead<3&&space.bzAvg!=null)kp+=space.bzAvg<=-10?1:space.bzAvg<=-5?.5:0;
const w=clamp(1-hoursAhead/3,0,1);return w*ovation+(1-w)*kpVisible(mlat,kp)}
const activityLabel=a=>a<10?'Niska':a<35?'Umiarkowana':'Wysoka';
function moonLabel(sky){if(sky.moonAlt<=0)return 'Księżyc pod horyzontem';return `Księżyc ${Math.round(sky.moonIllum*100)}% • ${sky.moonAlt<15?'nisko':'wysoko'}`}
// Część nieba wolna od chmur. Niskie chmury zasłaniają całkowicie, średnie prawie, a wysokie i cienkie przepuszczają część światła.
function clearSky(h,i){const L=h.cloud_cover_low?.[i],M=h.cloud_cover_mid?.[i],H=h.cloud_cover_high?.[i];const total=Number(h.cloud_cover?.[i])||0;if(![L,M,H].every(Number.isFinite))return 1-total/100;
// Warstwy często się pokrywają, więc zasłonięte niebo nie może przekroczyć całkowitego zachmurzenia.
return Math.max((1-L/100)*(1-.85*M/100)*(1-.4*H/100),1-total/100)}
const fmtNum=(v,d=1)=>v.toFixed(d).replace('-','−').replace('.',',');
const fmtScore=s=>s<1?'<1':String(s);
function renderForecast(loc,w,grid,space){const offset=(w.utc_offset_seconds||0)*1000,now=Date.now(),nowLocal=now+offset,tz=w.timezone_abbreviation||'';const idx=w.hourly.time.findIndex(t=>localMs(t)>=nowLocal-1800000);const mlat=magLat(loc.lat,loc.lon);const ovation=auroraAt(loc.lat,loc.lon,grid)??kpVisible(mlat,space.kp??2);const rows=[];
const layer=(k,i)=>{const v=Number(w.hourly[k]?.[i]);return Number.isFinite(v)?Math.round(v):null};
for(let i=Math.max(0,idx);i<Math.min(w.hourly.time.length,Math.max(0,idx)+12);i++){const t=w.hourly.time[i],ms=localMs(t)-offset;const sky=skyAt(ms,loc.lat,loc.lon),dark=darknessOf(sky),night=sky.sunAlt<-6;const act=activityAt(ovation,mlat,space,ms,Math.max(0,(ms-now)/3600000));const cloud=w.hourly.cloud_cover[i],clear=clearSky(w.hourly,i),cover=Math.round((1-clear)*100);const score=Math.round(clamp(act*dark*clear,0,99));rows.push({t,ms,label:rows.length===0&&idx>=0?'Teraz':localHM(localMs(t)),cloud,cover,low:layer('cloud_cover_low',i),mid:layer('cloud_cover_mid',i),high:layer('cloud_cover_high',i),dark,night,sky,act,score})}
const nowSky=skyAt(now,loc.lat,loc.lon);const first=rows[0]||{score:0,cloud:w.current?.cloud_cover||0,cover:w.current?.cloud_cover||0,dark:darknessOf(nowSky),night:nowSky.sunAlt<-6,sky:nowSky,act:ovation};const best=rows.reduce((a,b)=>b.score>a.score?b:a,rows[0]||first);const maxAct=Math.max(first.act,...rows.map(r=>r.act));
const keepT=home?.loc===loc?home.rows[home.sel]?.t:null,change=cloudChange(rows),night=nightTimeline(loc,now,offset);
home={loc,grid,space,rows,act:first.act,offset,change,night,sel:Math.max(0,rows.findIndex(r=>r.t===keepT))};
els.score.textContent=fmtScore(first.score);renderSpaceTiles(space,first.act);
// Kafelki warunków: zachmurzenie teraz i kiedy się zmieni, światło teraz i kiedy będzie najciemniej.
const cloudNow=Math.round(first.cloud);els.cloud.innerHTML=`${cloudNow}<small>%</small>`;els.cloudStatus.textContent=cloudLabel(cloudNow);els.cloudNext.textContent=change?.short||'Bez większych zmian';
els.dark.textContent=phaseAt(now,loc);els.darkSub.textContent=moonLabel(nowSky);els.darkNext.textContent=night.nextText;
const userOffset=-new Date().getTimezoneOffset()*60000,diffH=(userOffset-offset)/3600000;els.updated.textContent=`Aktualizacja ${new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})} · szacunek`;els.tzNote.hidden=diffH===0;els.tzNote.textContent=diffH===0?'':`Godziny według czasu miejsca (${tz}). U Ciebie jest o ${Math.abs(diffH).toLocaleString('pl-PL',{maximumFractionDigits:1})} h ${diffH>0?'później':'wcześniej'}.`;els.date.textContent=dateRange(rows.length?rows:[{ms:now}],offset);
const max=Math.max(...rows.map(r=>r.score));els.hourly.innerHTML=rows.map((r,i)=>`<button type="button" class="hour ${r.score===max&&max>10?'best':''}" data-i="${i}" aria-pressed="false"><time>${r.label}</time><span class="weather" aria-hidden="true">${r.night?(r.cover>70?'☁':'☾'):'☀'}</span><strong>${fmtScore(r.score)}%</strong><small>${r.cloud}% chmur</small></button>`).join('');selectHour(home.sel);
els.outlook.textContent=outlookText(best,maxAct,change);els.outlook.hidden=!rows.length;
renderGuidance(loc,best,maxAct,space,grid,offset,diffH);renderVerdict(first,best,maxAct)}
// Linia pod godzinami opisuje wybraną godzinę: chmury, porę dnia i Księżyc.
function selectHour(i){if(!home?.rows[i])return;home.sel=i;els.hourly.querySelectorAll('[data-i]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));const r=home.rows[i];els.hourDetail.textContent=[r.label,`${r.cloud}% chmur`,phaseAt(r.ms,home.loc).toLowerCase(),moonLabel(r.sky)].join(' · ')}
const dateRange=(rows,offset)=>{const f=ms=>new Intl.DateTimeFormat('pl-PL',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(ms+offset));const a=f(rows[0].ms),b=f(rows[rows.length-1].ms);return a===b?a:`${a.replace(/\s.*/,'')} → ${b}`};
// Pora dnia ze wschodem i zachodem liczonym dla górnej krawędzi tarczy (-0,833°). Świt i zmierzch rozróżnia kierunek ruchu Słońca.
function phaseAt(ms,loc){const a=skyAt(ms,loc.lat,loc.lon).sunAlt;if(a>-.833)return 'Dzień';if(a<=-18)return 'Noc';return skyAt(ms+600000,loc.lat,loc.lon).sunAlt>a?'Świt':'Zmierzch'}
const cloudLabel=c=>c<20?'Bezchmurnie':c<50?'Częściowe zachmurzenie':c<80?'Dużo chmur':'Pełne zachmurzenie';
// Pierwsza wyraźna zmiana zachmurzenia w prognozie: przejaśnienie, gdy teraz jest pochmurno, albo napływ chmur, gdy jest pogodnie.
function cloudChange(rows){if(!rows.length)return null;const at=r=>localHM(localMs(r.t));if(rows[0].cloud>=50){const r=rows.slice(1).find(r=>r.cloud<30);return r?{short:`Przejaśnienia ok. ${at(r)}`,sentence:`Około ${at(r)} niebo powinno się przejaśnić.`}:{short:'Bez przejaśnień w 12 godz.',sentence:'W najbliższych godzinach nie widać przejaśnień.'}}const r=rows.slice(1).find(r=>r.cloud>=70);return r?{short:`Chmury od ok. ${at(r)}`,sentence:`Około ${at(r)} napłyną chmury.`}:null}
function outlookText(best,maxAct,change){const parts=change?[change.sentence]:[];parts.push(maxAct<8?'Aktywność zorzy pozostanie zbyt niska, żeby ją zobaczyć.':best.score>=10?`Najlepsza szansa około ${localHM(localMs(best.t))}: ${best.score}%.`:'Szansa na zorzę pozostaje mała.');return parts.join(' ')}
const bzLabel=v=>v<=-10?'Silnie na południe':v<=-3?'Na południe · sprzyja':v<3?'Blisko zera':'Na północ';
const kpLabel=kp=>kp<3?'Spokojnie':kp<4?'Niespokojnie':kp<5?'Aktywnie':`Burza G${Math.min(5,Math.floor(kp)-4)}`;
const windLabel=v=>v<350?'Wolny':v<500?'Typowa prędkość':v<700?'Szybki':'Bardzo szybki';
// Kafelki aktywności. Status Bz liczymy ze średniej z 30 minut, a liczba to ostatni odczyt.
function renderSpaceTiles(space,act){els.activity.textContent=activityLabel(act);els.activitySub.textContent=act<1?'Poza zasięgiem wzroku':'Model NOAA OVATION';els.bz.textContent=space.bz==null?'—':fmtNum(space.bz);const bzRef=space.bzAvg??space.bz;els.bzStatus.textContent=bzRef==null?'Brak danych':bzLabel(bzRef);els.kp.textContent=space.kp==null?'—':fmtNum(space.kp);els.kpStatus.textContent=space.kp==null?'Brak danych':kpLabel(space.kp);els.wind.textContent=space.wind==null?'—':Math.round(space.wind);els.windStatus.textContent=space.wind==null?'Brak danych':windLabel(space.wind)}
// Oś nocy od 16:00 do 10:00 czasu miejsca, co 5 minut: Słońce, Księżyc i okna pełnej ciemności.
function nightTimeline(loc,now,offset){const STEP=5*60000,nowLocal=now+offset,day=Math.floor(nowLocal/DAY_MS)*DAY_MS,h=(nowLocal-day)/3600000;const start=day+(h<10?-8:16)*3600000-offset,end=start+18*3600000;const samples=[];
for(let t=start;t<=end;t+=STEP){const sky=skyAt(t,loc.lat,loc.lon);samples.push({t,sky,sun:sky.sunAlt<=-18?'night':sky.sunAlt<=-.833?'twilight':'day',moon:sky.moonAlt>0?'up':'down',dark:darknessOf(sky)>=.95})}
const segs=key=>{const out=[];for(const s of samples){const last=out[out.length-1];if(last&&last.v===s[key])last.to=s.t;else out.push({v:s[key],from:s.t,to:s.t})}out.forEach((g,i)=>{if(out[i+1])g.to=out[i+1].from});return out};
const cross=(fn,lvl)=>{const ev=[];for(let i=1;i<samples.length;i++){const a=fn(samples[i-1].sky)-lvl,b=fn(samples[i].sky)-lvl;if((a>0)!==(b>0))ev.push({t:samples[i-1].t+STEP*a/(a-b),rise:b>0})}return ev};
const dark=segs('dark').filter(g=>g.v),cur=dark.find(g=>g.from<=now&&now<g.to),next=dark.find(g=>g.from>now),hm=ms=>localHM(ms+offset);
const nextText=cur?`Najciemniej teraz, do ${hm(cur.to)}`:next?`Ciemniej po ${hm(next.from)}`:dark.length?'Najciemniejsza pora minęła':'Brak pełnej ciemności';
return {start,end,sun:segs('sun'),moon:segs('moon'),sunEv:cross(s=>s.sunAlt,-.833),moonEv:cross(s=>s.moonAlt,0),dark,cur,next,nextText}}
function renderGuidance(loc,best,activity,space,grid,offset=0,diffH=0){const start=best.t?localMs(best.t):NaN;els.bestWindow.textContent=!best.night||!Number.isFinite(start)?'Po zachodzie słońca':`${localHM(start)}–${localHM(start+3600000)}`;const yourT=ms=>new Date(ms).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});const yours=diffH!==0&&best.night&&Number.isFinite(start)?` • u Ciebie ${yourT(start-offset)}–${yourT(start-offset+3600000)}`:'';els.viewMode.textContent=(best.score>=48?'Możliwa widoczność gołym okiem':best.score>=14?'Najpierw spróbuj aparatem':'Widoczność będzie ograniczona')+yours;const north=loc.lat>=0;els.directionText.textContent=north?'na północ':'na południe';els.directionArrow.textContent=north?'↑':'↓';const gridFresh=grid.coords.length&&Date.now()-Date.parse(grid.time)<60*60000;const confidence=gridFresh&&space.kp!=null&&space.kpForecast?.length?'wysoka':grid.coords.length||space.kp!=null?'średnia':'niska';els.confidence.textContent=`Pewność prognozy: ${confidence} • wynik łączy aktywność, prognozę Kp, ciemność, Księżyc i chmury`}
function renderVerdict(first,best,activity){let status,verdict,reason,showWindow=false;if(activity<8&&best.score<10){status='Brak aktywności';verdict='Dziś zorzy nie zobaczysz';reason='Aktywność zorzowa jest zbyt niska dla Twojej lokalizacji.'}else if(!first.night&&best.score<10){status='Teraz jest jasno';verdict='Dziś w nocy szanse będą niskie';reason='Nawet po zmroku przewidywana aktywność, chmury lub Księżyc nie dają dobrej szansy.'}else if(!first.night&&best.score>=10){status='Możliwa dziś w nocy';verdict='Zorza może być widoczna po zmroku';reason='Teraz jest za jasno. Poniżej pokazujemy najlepszy przewidywany przedział.';showWindow=true}else if(first.cover>=75&&first.act>=8){status='Zorza aktywna';verdict='Zorzę zasłaniają teraz chmury';reason=`Zachmurzenie wynosi ${Math.round(first.cloud)}%. Sprawdź późniejsze godziny.`;showWindow=best.score>=10}else if(first.score>=70){status='Bardzo dobre warunki';verdict='Wyjdź teraz — zorza jest aktywna';reason='Warunki sprzyjają obserwacji gołym okiem.';showWindow=true}else if(first.score>=40){status='Dobre warunki';verdict='Zorza może być widoczna gołym okiem';reason='Patrz w stronę wskazaną poniżej, z dala od świateł miasta.';showWindow=true}else if(first.score>=14){status='Zorza możliwa';verdict='Zorza może być widoczna przez aparat';reason='Gołym okiem może być bardzo słaba. Spróbuj trybu nocnego.';showWindow=true}else{status='Niska widoczność';verdict='Zorza jest aktywna, ale trudno ją teraz zobaczyć';reason=first.cover>=50?'Przeszkodą jest duże zachmurzenie.':'Aktywność jest jeszcze zbyt słaba dla obserwacji gołym okiem.';showWindow=best.score>=10}els.status.textContent=status;els.verdict.textContent=verdict;els.summary.textContent=reason;els.tonightCard.hidden=!showWindow}
function renderPlaces(){const all=[...(current?.isGeo?[current]:[]),...saved];els.places.innerHTML=all.length?all.map((p,i)=>`<div class="place"><div class="place-main" data-i="${i}"><b>${esc(p.name)}</b><small>${esc(p.country||fmtCoords(p.lat,p.lon))}</small></div>${p.isGeo?'<span class="place-current">Bieżąca</span>':`<button class="delete-place" data-delete="${saved.indexOf(p)}" aria-label="Usuń ${esc(p.name)}">×</button>`}</div>`).join(''):'<p class="search-hint">Nie masz jeszcze dodatkowych miejsc.</p>';els.places.querySelectorAll('.place-main').forEach((b,i)=>b.onclick=()=>{loadLocation(all[i]);switchView('forecast')});els.places.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{saved.splice(+b.dataset.delete,1);store();renderPlaces();toast('Usunięto lokalizację')})}
async function search(q){els.hint.textContent='Szukam…';try{const d=await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=pl&format=json`);const list=d.results||[];els.hint.textContent=list.length?'Wybierz miejsce z listy.':'Nie znaleziono takiego miejsca.';els.results.innerHTML=list.map((r,i)=>`<button class="result" data-i="${i}"><div><b>${esc(r.name)}</b><small>${esc([r.admin1,r.country].filter(Boolean).join(', '))}</small></div><span>＋</span></button>`).join('');els.results.querySelectorAll('.result').forEach(b=>b.onclick=()=>{const r=list[+b.dataset.i],p={name:r.name,country:r.country,lat:r.latitude,lon:r.longitude};if(!saved.some(x=>Math.abs(x.lat-p.lat)<.01&&Math.abs(x.lon-p.lon)<.01)){saved.push(p);store()}closeSheet();loadLocation(p);switchView('forecast');toast('Dodano lokalizację')})}catch{els.hint.textContent='Nie udało się wyszukać. Spróbuj ponownie.'}}
function locate(){if(!current)loadLocation(FALLBACK);const startSeq=loadSeq;if(!navigator.geolocation){toast('Lokalizacja jest niedostępna — pokazuję Szczecin');return}navigator.geolocation.getCurrentPosition(async p=>{const lat=p.coords.latitude,lon=p.coords.longitude,n=await reverseGeocode(lat,lon);if(loadSeq!==startSeq)return;loadLocation({name:n?.name||'Twoja lokalizacja',country:n?.country||'',lat,lon,isGeo:true})},()=>{toast('Brak dostępu do lokalizacji — pokazuję Szczecin')},{enableHighAccuracy:false,timeout:9000,maximumAge:900000})}
// Prosty wykres z ostatnich 2 godzin. Przy Bz część poniżej zera ma osobny kolor, bo to ona sprzyja zorzy.
function lineChart(series,{zero=false,label}){if(series.length<2)return '<p class="chart-empty">Brak danych z ostatnich 2 godzin.</p>';const W=330,X0=36,X1=326,Y0=10,Y1=80;let lo=Math.min(...series.map(p=>p.v)),hi=Math.max(...series.map(p=>p.v));if(zero){lo=Math.min(lo,0);hi=Math.max(hi,0)}const pad=(hi-lo||1)*.1;lo-=pad;hi+=pad;const t0=series[0].t,t1=series[series.length-1].t;const x=t=>X0+(t-t0)/(t1-t0||1)*(X1-X0),y=v=>Y1-(v-lo)/(hi-lo)*(Y1-Y0);const d=series.map((p,i)=>`${i?'L':'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');const hm=t=>localHM(t+placeOffset());const ticks=zero?[hi-pad,0,lo+pad]:[hi-pad,lo+pad];
return `<svg class="chart" viewBox="0 0 ${W} 100" role="img" aria-label="${esc(label)}"><defs><clipPath id="belowZero"><rect x="0" y="${y(0).toFixed(1)}" width="${W}" height="100"/></clipPath></defs>${ticks.map(v=>`<path class="gridline" d="M${X0} ${y(v).toFixed(1)}H${X1}"/><text x="${X0-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end">${fmtNum(Math.round(v)||0,0)}</text>`).join('')}<path class="signal" d="${d}"/>${zero?`<path class="signal negative" clip-path="url(#belowZero)" d="${d}"/>`:''}<text x="${X0}" y="98">${hm(t0)}</text><text x="${(X0+X1)/2}" y="98" text-anchor="middle">${hm((t0+t1)/2)}</text><text x="${X1}" y="98" text-anchor="end">${hm(t1)}</text></svg>`}
// Godziny pokazujemy w czasie wybranego miejsca. Bez prognozy pogody nie znamy jego strefy, więc używamy strefy przeglądarki.
const placeOffset=()=>home?.offset??-new Date().getTimezoneOffset()*60000;
const infoRows=list=>`<div class="info-rows">${list.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
const infoGrid=list=>list.length?`<div class="info-grid">${list.map(([k,v])=>`<div>${k}<strong>${v}</strong></div>`).join('')}</div>`:'';
// Oś czasu z kolorowymi odcinkami. Etykieta mieści się tylko w dłuższych odcinkach.
function timeTrack(n,segs,names,label){const pos=ms=>clamp((ms-n.start)/(n.end-n.start)*100,0,100),now=Date.now();return `<div class="time-track" role="img" aria-label="${esc(label)}">${segs.map(g=>{const w=pos(g.to)-pos(g.from);return `<span class="seg ${g.v}" style="width:${w.toFixed(2)}%">${w>18?names[g.v]:''}</span>`}).join('')}${now>n.start&&now<n.end?`<span class="now-line" style="left:${pos(now).toFixed(2)}%"></span>`:''}</div>`}
const DETAILS={
activity(){const {act,grid,loc}=home,age=grid.time?Math.round((Date.now()-Date.parse(grid.time))/60000):null;return {title:'Zasięg zorzy',source:'NOAA SWPC · model OVATION i prognoza Kp',html:`<div class="info-value">${activityLabel(act)}</div>${infoRows([['Widoczna aktywność',`${Math.round(act)} / 100`],['Szerokość geomagnetyczna',`${fmtNum(magLat(loc.lat,loc.lon))}°`],['Model OVATION',age==null?'brak danych':age<1?'przed chwilą':`${age} min temu`]])}<p>OVATION to model NOAA, który pokazuje, gdzie zorza świeci w najbliższej godzinie. Bierzemy najsilniejszą aktywność w promieniu 1000 km, osłabioną z odległością, bo zorzę widać nisko nad horyzontem nawet z daleka. Na dalsze godziny używamy prognozy Kp.</p>`}},
bz(){const s=home.space;return {title:'Pole wiatru słonecznego · Bz',source:'NOAA SWPC · pomiary wiatru słonecznego w czasie rzeczywistym',html:`<div class="info-value">${s.bz==null?'Brak danych':`${fmtNum(s.bz)} <small>nT</small>`}</div>${lineChart(s.bzSeries||[],{zero:true,label:'Bz w ostatnich 2 godzinach'})}${infoRows([['Średnia z 30 min',s.bzAvg==null?'—':`${fmtNum(s.bzAvg)} nT`],['Ocena',(s.bzAvg??s.bz)==null?'—':bzLabel(s.bzAvg??s.bz)]])}<p>Ujemne Bz, czyli pole skierowane na południe, pozwala energii wiatru słonecznego wejść do ziemskiej magnetosfery. Liczy się nie tylko wartość, ale i to, jak długo pozostaje ujemna. Krótki spadek nie gwarantuje widocznej zorzy.</p>`}},
kp(){const s=home.space,now=Date.now(),hm=t=>localHM(t+placeOffset());const blocks=(s.kpForecast||[]).filter(r=>r.t+3*3600000>now).slice(0,6);return {title:'Indeks Kp',source:'NOAA SWPC · indeks Kp i prognoza 3-dniowa',html:`<div class="info-value">${s.kp==null?'Brak danych':`${fmtNum(s.kp)} <small>/ 9 · ${kpLabel(s.kp).toLowerCase()}</small>`}</div>${blocks.length?'<h3 class="info-sub">Prognoza w blokach 3-godzinnych</h3>':''}${infoGrid(blocks.map(r=>[hm(r.t),fmtNum(r.kp)]))}<p>Kp opisuje globalną aktywność geomagnetyczną w skali 0–9. Im wyższy, tym dalej od bieguna sięga owal zorzy, ale sam indeks nie mówi, co zobaczysz w swoim miejscu.</p>`}},
wind(){const s=home.space;return {title:'Wiatr słoneczny',source:'NOAA SWPC · pomiary wiatru słonecznego w czasie rzeczywistym',html:`<div class="info-value">${s.wind==null?'Brak danych':`${Math.round(s.wind)} <small>km/s</small>`}</div>${lineChart(s.windSeries||[],{label:'Prędkość wiatru słonecznego w ostatnich 2 godzinach'})}${infoRows([['Ocena',s.wind==null?'—':windLabel(s.wind)],['Gęstość',s.density==null?'—':`${fmtNum(s.density)} cm⁻³`]])}<p>Szybszy i gęstszy wiatr słoneczny niesie więcej energii. Najsilniejsze zorze pojawiają się, gdy wysoka prędkość idzie w parze z długo ujemnym Bz.</p>`}},
cloud(){const {rows,change}=home;if(!rows.length)return {title:'Zachmurzenie',source:'Open-Meteo',html:'<p>Nie udało się pobrać prognozy pogody. Spróbuj ponownie za chwilę.</p>'};const r=rows[0],pct=v=>v==null?'—':`${v}%`;return {title:'Zachmurzenie',source:'Open-Meteo · prognoza godzinowa',html:`<div class="info-value">${Math.round(r.cloud)}<small>% · ${cloudLabel(r.cloud).toLowerCase()}</small></div>${infoRows([['Chmury niskie',pct(r.low)],['Chmury średnie',pct(r.mid)],['Chmury wysokie',pct(r.high)]])}${infoGrid(rows.slice(1,7).map(h=>[h.label,`${h.cloud}%`]))}<p>${change?change.sentence+' ':''}Niskie chmury zasłaniają niebo całkowicie, średnie prawie całkowicie, a wysokie i cienkie tylko częściowo. Sprawdź też, czy północny horyzont jest odsłonięty.</p>`}},
light(){const n=home.night;if(!n)return {title:'Światło tej nocy',source:'Obliczenia w przeglądarce',html:'<p>Bez prognozy pogody nie znamy strefy czasowej miejsca, więc nie pokazujemy godzin.</p>'};const hm=ms=>localHM(ms+home.offset),near=(a,b)=>Math.abs(a-b)<15*60000;
const title=n.cur?'Najciemniej teraz':n.next?`Ciemniej po ${hm(n.next.from)}`:'Tej nocy bez pełnej ciemności';
const why=n.next?(n.moonEv.some(e=>!e.rise&&near(e.t,n.next.from))?'Wtedy zajdzie Księżyc.':n.sun.some(g=>g.v==='night'&&near(g.from,n.next.from))?'Wtedy zaczyna się noc astronomiczna.':''):n.cur?`Pełna ciemność potrwa do ${hm(n.cur.to)}.`:'Słońce nie schodzi dość nisko albo przeszkadza jasny Księżyc.';
const sky=skyAt(Date.now(),home.loc.lat,home.loc.lon);
const ticks=[];for(let t=Math.ceil((n.start+home.offset)/3600000)*3600000-home.offset;t<n.end;t+=3600000){const h=new Date(t+home.offset).getUTCHours();if(h%6===0&&t>n.start)ticks.push(`<span style="left:${((t-n.start)/(n.end-n.start)*100).toFixed(2)}%">${hm(t)}</span>`)}
const events=(list,up,down)=>`<div class="event-list">${list.length?list.map(e=>`<span>${e.rise?up:down} <b>${hm(e.t)}</b></span>`).join(''):'<span>Bez wschodu i zachodu na tej osi</span>'}</div>`;
return {title:'Światło tej nocy',source:'Położenie Słońca i Księżyca liczone w przeglądarce',html:`<div class="light-title">${title}</div><p>${why} ${sky.moonAlt>0?`Księżyc jest teraz nad horyzontem, tarcza oświetlona w ${Math.round(sky.moonIllum*100)}%.`:`Księżyc jest teraz pod horyzontem, tarcza oświetlona w ${Math.round(sky.moonIllum*100)}%.`}</p>
<div class="time-axis" aria-hidden="true">${ticks.join('')}</div>
<div class="light-label"><span>☀ Słońce</span><small>Teraz: ${phaseAt(Date.now(),home.loc).toLowerCase()}</small></div>${timeTrack(n,n.sun,{day:'',twilight:'',night:'Noc'},'Oś Słońca: dzień, zmierzch i noc astronomiczna')}${events(n.sunEv,'Wschód','Zachód')}
<div class="light-label"><span>☾ Księżyc</span><small>${Math.round(sky.moonIllum*100)}% tarczy</small></div>${timeTrack(n,n.moon,{up:'Nad horyzontem',down:'Pod horyzontem'},'Oś Księżyca: nad i pod horyzontem')}${events(n.moonEv,'Wschód','Zachód')}
<div class="dark-window"><strong>${n.dark.length?n.dark.map(g=>`${hm(g.from)}–${hm(g.to)}`).join(', ')+' · najciemniejsze niebo':'Brak pełnej ciemności'}</strong><p>Noc astronomiczna, a Księżyc pod horyzontem albo bardzo słaby. Ciemniejsze niebo ułatwia obserwację, ale nie oznacza silniejszej zorzy.</p></div>`}}
};
function openInfo(type,opener){if(!home||!DETAILS[type])return;const d=DETAILS[type]();els.infoTitle.textContent=d.title;els.infoBody.innerHTML=d.html;els.infoSource.textContent=d.source;infoOpener=opener||null;els.infoSheet.hidden=false;els.detailBackdrop.hidden=false;$('#closeInfo').focus({preventScroll:true})}
function closeInfo(){els.infoSheet.hidden=true;els.detailBackdrop.hidden=true;infoOpener?.focus({preventScroll:true});infoOpener=null}
$('#addPlaceBtn').onclick=openSheet;$('#closeSearch').onclick=closeSheet;els.backdrop.onclick=closeSheet;$('#closeInfo').onclick=closeInfo;els.detailBackdrop.onclick=closeInfo;document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>openInfo(b.dataset.detail,b));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.infoSheet.hidden)closeInfo()});els.hourly.onclick=e=>{const b=e.target.closest('[data-i]');if(b)selectHour(+b.dataset.i)};$('#locateBtn').onclick=()=>{locate();switchView('forecast')};$('#homeBtn').onclick=()=>switchView('forecast');$('#mapBtn').onclick=()=>switchView('map');$('#savedBtn').onclick=()=>switchView('places');els.input.oninput=e=>{clearTimeout(timer);const q=e.target.value.trim();if(q.length<2){els.results.innerHTML='';els.hint.textContent='Wpisz co najmniej 2 znaki.';return}timer=setTimeout(()=>search(q),350)};locate();renderPlaces();
// Co 5 minut odświeżamy prognozę i dane NOAA, gdy karta jest widoczna.
function refresh(){if(current&&!document.hidden)loadLocation(current,{quiet:true})}
setInterval(refresh,REFRESH_EVERY);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&auroraGrid&&Date.now()-auroraGrid.fetchedAt>=NOAA_TTL)refresh()});
