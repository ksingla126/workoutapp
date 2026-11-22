import re,json,csv,collections
REMOVE={'contrast shower','warm bath soak','hydration break','cold face splash','gratitude cool-down'}
CATS=[('warmup','Warm-up'),('cooldown','Cool-down'),('mobility','Mobility'),('flexibility','Flexibility'),('recovery','Recovery'),('prehab','Prehab / Finisher')]
AREA={'abs':'core','ribs':'lats','full':'full body','tspine':'upper back','lowback':'lower back','hams':'hamstrings'}
def slug(n): return re.sub(r'[^a-z0-9]+','-',n.lower().replace("'","")).strip('-')
def norm(n): return slug(re.sub(r'\s*\((slow|gentle|easy|hold|relaxed|passive|bodyweight)\)','',n.lower()))
UNIT={'s':'sec','r':'reps','br':'breaths'}
EQ={'roller':'foam roller','band':'resistance band','band-anchor':'resistance band'}
moves={}; order=[]
for key,label in CATS:
    rows=[l.rstrip('\n').split('|') for l in open(key+'.txt') if l.strip() and not l.startswith('#')]
    seen=set(); keep=[]
    for r in rows:
        k=norm(r[0])
        if r[0].lower() in REMOVE or k in seen: continue
        seen.add(k); keep.append(r)
    keep=keep[:200]
    gear=[]
    for pre in ('extra-','gear-'):
        try: gear+=[l.rstrip('\n').split('|') for l in open(pre+key+'.txt') if l.strip() and not l.startswith('#')]
        except FileNotFoundError: pass
    for r in gear:
        k=norm(r[0])
        if k in seen: continue
        seen.add(k); keep.append(r)
    for rank,(name,areas,dose,unit,side,equip,lvl,cue) in enumerate(keep,1):
        k=norm(name); m=moves.get(k)
        if not m:
            m={'id':k,'name':name,'areas':[],'equipment':EQ.get(equip,equip),'level':int(lvl),'cue':cue,'categories':{}}; moves[k]=m; order.append(k)
            if equip in EQ: m['gear']=True
            if equip=='band-anchor': m['anchor']=True
        for a in areas.split(','):
            a=AREA.get(a,a)
            if a not in m['areas']: m['areas'].append(a)
        m['level']=min(m['level'],int(lvl))
        m['categories'][key]={'rank':rank,'dose':int(dose),'unit':UNIT[unit],'perSide':side=='1','name':name,'cue':cue}
def flags(m):
    n=m['name'].lower(); f=[]
    if re.search(r'jump|hop|bounds?\b(?! angle)|bound kicks|burpee|skips|skip\b|jacks|pogo|broad',n) and 'bound angle' not in n: f.append('impact')
    if re.search(r'hero|frog|saddle|pistol|deep squat|garland|toe squat|duck walk|reverse nordic|heel sits',n): f.append('deep-knee')
    if re.search(r'plow|shoulder stand|snail',n): f.append('neck-load')
    if re.search(r'wheel|camel|bow pose|seal stretch|king pigeon|back bend|upward dog|wall back bend',n): f.append('deep-backbend')
    if 'jefferson' in n: f.append('loaded-spinal-flexion')
    if re.search(r'nordic|copenhagen|v-ups|hollow rock|stir the pot|body saw|l-sit|fingertip|skin the cat|german hang',n): f.append('advanced')
    if re.search(r'push-up|plank|crawl|bear|crab|down dog|downward dog|knuckle|tabletop|dips|wrist rocks|wrist push',n): f.append('wrist-load')
    return f
def kind(m):
    n=m['name'].lower(); units={c['unit'] for c in m['categories'].values()}
    if re.search(r'breath|sigh|body scan|relaxation|mindful|palming|sitting|corpse|constructive|sleep-ready',n): return 'breathing'
    if re.search(r'massage|ball release|foot rolling|^foam roll ',n): return 'self-massage'
    if re.search(r'plank|hold|wall sit|isometric|bear hold|hollow body|superman|boat|l-sit|squeeze',n): return 'isometric'
    if units=={'sec'} and not re.search(r'walk|jog|jacks|march|crawl|boxing|climbers|kicks|knees|hops|feet|skips|shuffles|carioca|grapevine|run|jump|shaking|sway|weight shifts|stance',n): return 'static'
    return 'dynamic'
from stars import stars as _stars, load_overrides
OV=load_overrides()
out=[]
for k in order:
    m=moves[k]; m['kind']=kind(m); m['cautions']=flags(m); m['stars']=OV.get(m['name'].lower(),_stars(m)); m.pop('level',None); out.append(m)
json.dump({'version':1,'about':'RankUp Bounties move library. Ranks 1-200 in each category are bodyweight (household items only: mat, wall, chair, step, towel); ranks after 200 use a foam roller or resistance band (gear: true; anchor: true means the band is tied to a door or post). Each move lists the categories it belongs to with that category\'s rank (1 = most common), dose, unit and per-side flag. stars (1-5) rate how demanding a move is; a bounty\'s stars equal its highest-starred move. cautions are screening tags for later filtering (impact, deep-knee, neck-load, deep-backbend, loaded-spinal-flexion, advanced, wrist-load).',
  'categories':[{'id':k,'label':l} for k,l in CATS],'moves':out},open('../bounty-moves.json','w'),indent=1,ensure_ascii=False)
with open('../bounty-moves.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['category','rank','move','dose','unit','per_side','areas','equipment','band_anchor','stars','kind','cautions','cue','move_id'])
    for key,label in CATS:
        for m in sorted([m for m in out if key in m['categories']],key=lambda m:m['categories'][key]['rank']):
            c=m['categories'][key]
            w.writerow([label,c['rank'],c['name'],c['dose'],c['unit'],'yes' if c['perSide'] else '','; '.join(m['areas']),m['equipment'],'yes' if m.get('anchor') else '',m['stars'],m['kind'],'; '.join(m['cautions']),c['cue'],m['id']])
print('unique',len(out),{k:sum(1 for m in out if k in m['categories']) for k,_ in CATS})
print(collections.Counter(m['kind'] for m in out)); print(collections.Counter(c for m in out for c in m['cautions']))
print(collections.Counter(a for m in out for a in m['areas']))
print('dup ids',[i for i,c in collections.Counter(m['id'] for m in out).items() if c>1])

print('stars',sorted(collections.Counter(m['stars'] for m in out).items()))
for key,_ in CATS: print(key,sorted(collections.Counter(m['stars'] for m in out if key in m['categories']).items()))
missing=[n for n in OV if n not in {m['name'].lower() for m in out}]; print('override names not found',missing)
print('gear placements',{k:sum(1 for m in out if k in m['categories'] and m.get('gear')) for k,_ in CATS}, 'gear moves',sum(1 for m in out if m.get('gear')))
