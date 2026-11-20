"""1-5 star rating for every move. Rules first, then hand overrides (stars-overrides.txt).
1★ anyone, any day · 2★ light effort or a little range/balance · 3★ real work · 4★ demanding · 5★ hardest."""
import re
END5=r'front split|side split slides|middle splits|wheel pose|king pigeon|standing split|skin the cat|german hang|nordic curl|copenhagen plank \(long|pistol squat \(assisted\)|reverse nordic|v-ups|stir the pot|body saw|l-sit|wall back bend walk|winged dragon|fingertip plank'
END4=r'pancake|saddle pose|reclined hero|camel|bow pose|plow|shoulder stand|snail|copenhagen|hollow rocks|burpee|tuck jump|broad jump|lunge jumps|lateral bounds|b-skips|skater squats|hip airplanes|shinbox get-up|wall-facing squat|active pancake|compression lifts|lizard crawl|turkish get-up|hindu push|decline push|single-leg wall sit|foam roller (rollouts|pikes|hamstring curls|single-leg)|slider leg curls|dragon pose|front split slides|side split slides|band (dancer|standing split|king pigeon|front split)|seal stretch|upward dog|half frog|kneeling quad stretch \(wall\)|couch stretch$'
BAL=r'single-leg|one leg|balance|star excursion|airplane|pistol|skater|t-balance'
STR=r'push-up|plank|wall sit|squat|lunge|bridge|crunch|leg raise|hollow|superman|bear|crab|climber|dips|row|step-up|calf raise|thrust|deadlift|rdl|good morning|press|curl|pull|raise|kick|walk|hold'
def stars(m):
    n=m['name'].lower(); k=m['kind']; lvl=m.get('level',1); c=set(m['cautions'])
    if re.search(END5,n) or 'advanced' in c or 'neck-load' in c: s=5
    elif re.search(END4,n) or 'deep-backbend' in c: s=4
    elif k in ('breathing','self-massage'): s=1 if not re.search(r'it band|shins|pecs|ql|lower back|hip flexor release',n) else 2
    elif lvl==3: s=4
    elif lvl==2: s=2 if k=='static' else 3
    else:
        s=1
        if k in ('isometric',) or (k=='dynamic' and re.search(STR,n) and not re.search(r'circle|swing|roll|rock|tilt|nod|shrug|march in place|easy|slow|gentle|light|jog in place',n)): s=2
        if 'impact' in c: s=2
    if s<5 and re.search(BAL,n) and s<3: s+=1
    if 'impact' in c and s<3 and re.search(r'jump|bound',n): s=3
    if 'deep-knee' in c and s<2 and k!='breathing': s=2
    return s
def load_overrides(path='stars-overrides.txt'):
    o={}
    try:
        for l in open(path):
            l=l.strip()
            if l and not l.startswith('#'): name,v=l.rsplit('|',1); o[name.strip().lower()]=int(v)
    except FileNotFoundError: pass
    return o
