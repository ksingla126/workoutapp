"""Builds ../bounties.json and ../bounties.csv from bounties.txt + ../bounty-moves.json, and checks the rules."""
import json,re,csv,math,collections
def slug(n): return re.sub(r'[^a-z0-9]+','-',n.lower().replace("'","")).strip('-')
def norm(n): return slug(re.sub(r'\s*\((slow|gentle|easy|hold|relaxed|passive|bodyweight)\)','',n.lower()))   # same as build.py
L=json.load(open('../bounty-moves.json')); M={m['id']:m for m in L['moves']}
BY={norm(m['name']):m for m in L['moves']}
for m in L['moves']:
    for c in m['categories'].values(): BY.setdefault(norm(c['name']),m)
TIER=[5,10,15,20,25,30]
def secs(dose,unit,per,sets,rest,quick):
    t=dose if unit=='sec' else dose*10 if unit=='breaths' else dose*(1.5 if quick else 2.5)
    if per: t*=2
    return t*sets+rest*(sets-1)*(2 if per else 1)+10
QUICK=re.compile(r'jack|hop|skip|knees|kicks|jog|march|pogo|circles|swings|shuffle|climbers|run')
bounties=[]; cur=None; errs=[]; warn=[]
for ln,l in enumerate(open('bounties.txt'),1):
    l=l.rstrip('\n')
    if not l.strip() or l.startswith('# ') or l.startswith('##') or l.startswith('# '): continue
    if l.startswith('@'):
        i,title,plain,typ,areas=[x.strip() for x in l[1:].split('|')]
        cur={'id':i,'title':title,'plain':plain,'type':typ,'areas':[a.strip() for a in areas.split(',')],'phases':[]}; bounties.append(cur); continue
    if l.startswith('#'): cur['phases'].append({'name':l[1:].strip(),'moves':[]}); continue
    p=[x.strip() for x in l.split('|')]+['','','']
    name,dose,sets,rest=p[:4]
    m=BY.get(norm(name))
    if not m: errs.append(f'{cur["id"]}: move not found "{name}" (line {ln})'); continue
    cat=m['categories'].get(cur['type']) or next(iter(m['categories'].values()))
    e={'move':m['id'],'name':m['name'],'dose':int(dose) if dose else cat['dose'],'unit':cat['unit'],'perSide':cat['perSide'],
       'sets':int(sets) if sets else 1,'rest':int(rest) if rest else (15 if sets and int(sets)>1 else 0),'stars':m['stars'],'cue':cat['cue']}
    cur['phases'][-1]['moves'].append(e)
out=[]
for b in bounties:
    mv=[e for ph in b['phases'] for e in ph['moves']]
    tot=sum(secs(e['dose'],e['unit'],e['perSide'],e['sets'],e['rest'],bool(QUICK.search(e['name'].lower()))) for e in mv)
    mins=math.ceil(tot/60); tier=next((t for t in TIER if mins<=t),None)
    gear=sorted({M[e['move']]['equipment'] for e in mv if M[e['move']].get('gear')})
    b.update(stars=max(e['stars'] for e in mv),minutes=mins,tier=tier,gear=gear,estSeconds=round(tot),moveCount=len(mv))
    if tier is None: errs.append(f"{b['id']}: {mins} min is over 30")
    if b['type']=='warmup' and mins>10: errs.append(f"{b['id']}: warm-up is {mins} min (cap 10)")
    if b['type']=='warmup' and not 3<=len(mv)<=5: errs.append(f"{b['id']}: warm-up has {len(mv)} moves (3-5)")
    if b['type']=='flexibility':
        if not (mv[0]['name'].endswith('test') and mv[-1]['move']==mv[0]['move']): errs.append(f"{b['id']}: flexibility must start and end with the same test")
    seen=[e['move'] for e in mv]; d=[x for x,c in collections.Counter(seen).items() if c>1 and not x.endswith('test')]
    if d: warn.append(f"{b['id']}: repeats {d}")
    # every move above 1 star needs an easier swap for the same area and kind
    for e in mv:
        m=M[e['move']]
        if m['stars']<=1 or m['name'].endswith('test'): continue
        ok=any(o['id']!=m['id'] and o['stars']<m['stars'] and set(o['areas'])&set(m['areas']) and
               ({o['kind'],m['kind']}<= {'dynamic','isometric','static'} or o['kind']==m['kind']) and (b['type'] in o['categories']) and
               (not o.get('gear') or o['equipment']==m['equipment'] or not m.get('gear')) for o in L['moves'])
        if not ok: warn.append(f"{b['id']}: no easier swap for {m['name']} ({m['stars']}★)")
    out.append(b)
json.dump({'version':1,'about':'RankUp starter bounties. stars = hardest move; minutes = estimate (holds, reps at 1.5-2.5 s, breaths 10 s, sides doubled, sets and rest, +10 s per move); tier = card time label.','bounties':out},open('../bounties.json','w'),indent=1,ensure_ascii=False)
with open('../bounties.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['bounty','title','type','stars','minutes','gear','phase','move','dose','unit','per_side','sets','rest_s','move_stars','plain'])
    for b in out:
        for ph in b['phases']:
            for e in ph['moves']:
                w.writerow([b['id'],b['title'],b['type'],b['stars'],b['minutes'],' / '.join(b['gear']),ph['name'],e['name'],e['dose'],e['unit'],'yes' if e['perSide'] else '',e['sets'],e['rest'],e['stars'],b['plain']])
print('\n'.join(errs) or 'no errors'); print('\n'.join(warn))
for b in out: print(f"{b['type']:<12}{b['stars']}★ {b['minutes']:>3}m ({b['tier']}) {b['title']:<28} {'/'.join(b['gear'])}")
print(len(out),'bounties', collections.Counter(b['type'] for b in out))
