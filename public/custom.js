/*
 * Custom plans: exercise library + routine builder (Hevy-style) and
 * food database + meal builder + diary (MyFitnessPal-style).
 * Loaded before the main app script; everything here runs lazily, at call time.
 */

/* ======================= Exercise library ======================= */
// [id, name, muscle, equipment, type]  type: w = weight × reps, bw = bodyweight reps (+ optional weight), t = timed hold (seconds)
const EXLIB_RAW = [
  // Chest
  ["bench","Bench Press (Barbell)","Chest","Barbell","w"],["dbbench","Bench Press (Dumbbell)","Chest","Dumbbell","w"],
  ["incline","Incline Bench Press (Dumbbell)","Chest","Dumbbell","w"],["inclinebb","Incline Bench Press (Barbell)","Chest","Barbell","w"],
  ["declinebench","Decline Bench Press (Barbell)","Chest","Barbell","w"],["smithbench","Bench Press (Smith Machine)","Chest","Smith machine","w"],
  ["chestpress","Chest Press (Machine)","Chest","Machine","w"],["fly","Chest Fly (Machine / Pec Deck)","Chest","Machine","w"],
  ["dbfly","Chest Fly (Dumbbell)","Chest","Dumbbell","w"],["cablecross","Cable Crossover","Chest","Cable","w"],
  ["pushup","Push-Up","Chest","Bodyweight","bw"],["dips","Chest Dip","Chest","Bodyweight","bw"],
  // Back
  ["pulldown","Lat Pulldown (Cable)","Back","Cable","w"],["pullup","Pull-Up","Back","Bodyweight","bw"],["chinup","Chin-Up","Back","Bodyweight","bw"],
  ["assistpull","Assisted Pull-Up (Machine)","Back","Machine","w"],["cablerow","Seated Cable Row","Back","Cable","w"],
  ["dbrow","Chest-Supported Row (Dumbbell)","Back","Dumbbell","w"],["onearmrow","One-Arm Row (Dumbbell)","Back","Dumbbell","w",1],
  ["bbrow","Bent-Over Row (Barbell)","Back","Barbell","w"],["tbarrow","T-Bar Row","Back","Barbell","w"],["machinerow","Seated Row (Machine)","Back","Machine","w"],
  ["straightarm","Straight-Arm Pulldown (Cable)","Back","Cable","w"],["deadlift","Deadlift (Barbell)","Back","Barbell","w"],
  ["tbdl","Trap-Bar Deadlift","Back","Barbell","w"],["shrug","Shrug (Dumbbell)","Back","Dumbbell","w"],
  ["backext","Back Extension (45°)","Back","Bodyweight","bw"],["invrow","Inverted Row","Back","Bodyweight","bw"],
  // Shoulders
  ["ohp","Overhead Press (Barbell)","Shoulders","Barbell","w"],["dbpress","Shoulder Press (Dumbbell)","Shoulders","Dumbbell","w"],
  ["machpress","Shoulder Press (Machine)","Shoulders","Machine","w"],["arnold","Arnold Press (Dumbbell)","Shoulders","Dumbbell","w"],
  ["lateral","Lateral Raise (Dumbbell)","Shoulders","Dumbbell","w"],["cablelat","Lateral Raise (Cable)","Shoulders","Cable","w"],
  ["frontraise","Front Raise (Dumbbell)","Shoulders","Dumbbell","w"],["revfly","Reverse Fly (Pec Deck)","Shoulders","Machine","w"],
  ["dbrevfly","Reverse Fly (Dumbbell)","Shoulders","Dumbbell","w"],["facepull","Face Pull (Cable)","Shoulders","Cable","w"],
  ["uprow","Upright Row (Cable)","Shoulders","Cable","w"],
  // Biceps
  ["curl","Bicep Curl (Dumbbell)","Biceps","Dumbbell","w"],["bbcurl","Bicep Curl (Barbell)","Biceps","Barbell","w"],["ezcurl","EZ-Bar Curl","Biceps","EZ bar","w"],
  ["hammer","Hammer Curl (Dumbbell)","Biceps","Dumbbell","w"],["conc","Concentration Curl (Dumbbell)","Biceps","Dumbbell","w",1],
  ["preacher","Preacher Curl (EZ Bar)","Biceps","EZ bar","w"],["cablecurl","Bicep Curl (Cable)","Biceps","Cable","w"],
  ["inclinecurl","Incline Curl (Dumbbell)","Biceps","Dumbbell","w"],
  // Triceps
  ["pushdown","Triceps Pushdown (Cable)","Triceps","Cable","w"],["ropepush","Rope Pushdown (Cable)","Triceps","Cable","w"],
  ["ohtri","Overhead Triceps Extension (Cable)","Triceps","Cable","w"],["dbohtri","Overhead Triceps Extension (Dumbbell)","Triceps","Dumbbell","w",1],
  ["skull","Skull Crusher (EZ Bar)","Triceps","EZ bar","w"],["cgbench","Close-Grip Bench Press","Triceps","Barbell","w"],
  ["tridip","Triceps Dip","Triceps","Bodyweight","bw"],["kickback","Triceps Kickback (Dumbbell)","Triceps","Dumbbell","w",1],
  // Quads
  ["squat","Squat (Barbell)","Quads","Barbell","w"],["frontsquat","Front Squat (Barbell)","Quads","Barbell","w"],
  ["goblet","Goblet Squat","Quads","Dumbbell","w",1],["hack","Hack Squat (Machine)","Quads","Machine","w"],
  ["smithsquat","Squat (Smith Machine)","Quads","Smith machine","w"],["legpress","Leg Press (Horizontal)","Quads","Machine","w"],
  ["legpress45","Leg Press (45°)","Quads","Machine","w"],["legext","Leg Extension (Machine)","Quads","Machine","w"],
  ["legext1","Single-Leg Extension (Machine)","Quads","Machine","w"],["split","Bulgarian Split Squat (Dumbbell)","Quads","Dumbbell","w"],
  ["lunge","Walking Lunge (Dumbbell)","Quads","Dumbbell","w"],["stepup","Step-Up (Dumbbell)","Quads","Dumbbell","w"],
  // Hamstrings
  ["rdl","Romanian Deadlift (Barbell)","Hamstrings","Barbell","w"],["dbrdl","Romanian Deadlift (Dumbbell)","Hamstrings","Dumbbell","w"],
  ["legcurl","Leg Curl (Seated)","Hamstrings","Machine","w"],["lyingcurl","Leg Curl (Lying)","Hamstrings","Machine","w"],
  ["goodmorning","Good Morning (Barbell)","Hamstrings","Barbell","w"],["nordic","Nordic Curl","Hamstrings","Bodyweight","bw"],
  // Glutes
  ["hipthrust","Hip Thrust (Barbell)","Glutes","Barbell","w"],["machthrust","Hip Thrust (Machine)","Glutes","Machine","w"],
  ["glutebridge","Glute Bridge","Glutes","Bodyweight","bw"],["cablekick","Glute Kickback (Cable)","Glutes","Cable","w"],
  ["abductor","Hip Abduction (Machine)","Glutes","Machine","w"],["adductor","Hip Adduction (Machine)","Glutes","Machine","w"],
  ["kbswing","Kettlebell Swing","Glutes","Kettlebell","w",1],
  // Calves
  ["calfraise","Standing Calf Raise","Calves","Machine","w"],["seatedcalf","Seated Calf Raise (Machine)","Calves","Machine","w"],["tiltcalf","Tilt-Seat Calf Raise (Machine)","Calves","Machine","w"],
  ["legpresscalf","Calf Press (Leg Press)","Calves","Machine","w"],
  // Core
  ["plank","Plank","Core","Bodyweight","t"],["sideplank","Side Plank","Core","Bodyweight","t"],
  ["declinecrunch","Decline Crunch (Weighted)","Core","Bodyweight","bw"],["cablecrunch","Cable Crunch","Core","Cable","w"],
  ["crunch","Crunch","Core","Bodyweight","bw"],["hangleg","Hanging Leg Raise","Core","Bodyweight","bw"],
  ["legraise","Lying Leg Raise","Core","Bodyweight","bw"],["pallof","Pallof Press (Cable)","Core","Cable","w"],["pallofhold","Pallof Hold (Cable)","Core","Cable","tw"],
  ["abwheel","Ab Wheel Rollout","Core","Bodyweight","bw"],["russian","Russian Twist","Core","Bodyweight","bw"],
  ["deadbug","Dead Bug","Core","Bodyweight","bw"],["woodchop","Cable Woodchop","Core","Cable","w"],
  // Forearms & conditioning
  ["wristcurl","Wrist Curl (Dumbbell)","Forearms","Dumbbell","w"],["deadhang","Dead Hang","Forearms","Bodyweight","t"],
  ["jumprope","Jump Rope","Cardio","Other","t"],["burpee","Burpee","Cardio","Bodyweight","bw"],["mountain","Mountain Climber","Cardio","Bodyweight","t"],
  ["rowerg","Rowing Machine (seconds)","Cardio","Machine","t"]
];
const MUSCLES=["Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Core","Forearms","Cardio"];
const EQUIP=["Barbell","Dumbbell","Machine","Cable","Bodyweight","EZ bar","Smith machine","Kettlebell","Other"];
function exLib(){ const pr=(typeof S!=="undefined"&&S.profile)||{}; const custom=[...((pr.setup&&pr.setup.customEx)||[]),...(pr.customEx||[])];
  return [...EXLIB_RAW.map(([id,name,muscle,equip,type,uni])=>({id,name,muscle,equip,type,uni:!!uni})), ...custom.map(c=>({...c,custom:true}))] }
function libEx(id){ return exLib().find(e=>e.id===id) }
// Map onto the app's existing standings/muscle model where it applies
const LIB_MUSCLE_MAP={Chest:{chest:1},Back:{back:1},Shoulders:{shoulders:1},Biceps:{arms:1},Triceps:{arms:1},Quads:{quads:1},Hamstrings:{hamstrings:1},Glutes:{glutes:1},Calves:{calves:1},Core:{core:1},Forearms:{arms:1}};
function toPlanEx(r){ // routine entry -> exercise object the logger understands
  const L=libEx(r.id)||{id:r.id,name:r.name||r.id,muscle:"",equip:"Other",type:"w"};
  // "t" = timed bodyweight hold (seconds only); "tw" = timed hold with a weight (weight × seconds)
  const timed=L.type==="t", heldW=L.type==="tw", inc= timed?0 : L.id==="legpress45"||L.id==="legpress"||L.id==="hack"? 20 : L.type==="bw"? 5 : L.equip==="Machine"? 10 : 5;
  const note= L.type==="bw"? "Bodyweight: leave weight blank, or enter added weight." : L.equip==="Dumbbell"? (L.uni?"Weight = the one dumbbell.":"Weight = each dumbbell.") : "";
  return {id:L.id,name:L.name,sets:r.sets||3,lo:r.lo||(timed?30:heldW?20:8),hi:r.hi||(timed?60:heldW?30:12),inc,rest:r.rest||90,
    ...(timed?{bw:true,unit:"sec"}:heldW?{unit:"sec"}:{}),...(L.type==="bw"?{optW:true}:{}),...(r.ss?{ss:r.ss}:{}),...(r.note||note?{alt:[note,r.note].filter(Boolean).join(" ")}:{}),muscle:L.muscle,equip:L.equip,uni:L.uni};
}

/* ----- Starter splits ----- */
const E=(id,sets,lo,hi,rest)=>({id,sets,lo,hi,rest});
const SPLITS={
  fb2:{name:"Full body · 2 days",days:[0,3],routines:[
    {name:"Full Body A",ex:[E("legpress45",3,8,12,150),E("bench",3,6,10,150),E("pulldown",3,8,12,90),E("legcurl",3,10,15,75),E("lateral",3,12,15,60),E("pushdown",2,10,15,60),E("plank",3,30,60,45)]},
    {name:"Full Body B",ex:[E("rdl",3,8,10,120),E("incline",3,8,12,120),E("cablerow",3,8,12,90),E("legext",3,10,15,60),E("facepull",3,12,15,60),E("curl",2,10,15,60),E("calfraise",3,10,15,60)]}]},
  abc3:{name:"Full body · 3 days",days:[0,2,4],routines:[
    {name:"Full Body A",ex:[E("bench",4,6,8,150),E("legpress45",4,8,12,150),E("pulldown",3,8,12,90),E("rdl",3,8,10,120),E("backext",3,10,15,75),E("fly",3,12,15,60),E("revfly",2,12,15,60),E("lateral",3,12,15,60)]},
    {name:"Full Body B",ex:[E("ohp",3,6,10,120),E("tbdl",3,5,8,150),E("cablerow",3,8,12,90),E("legcurl",3,10,15,75),E("legext1",2,10,15,60),E("facepull",3,12,15,60),E("ohtri",2,10,15,60),E("calfraise",3,10,15,60)]},
    {name:"Full Body C",ex:[E("incline",4,8,12,120),E("dbrow",3,8,12,90),E("hipthrust",3,8,12,120),E("legcurl",3,10,15,75),E("ezcurl",2,10,15,60),E("pushdown",2,10,15,60),E("hammer",2,10,15,60),E("calfraise",2,10,15,60)]}]},
  ppl3:{name:"Push / Pull / Legs · 3 days",days:[0,2,4],routines:[
    {name:"Push",ex:[E("bench",4,6,8,150),E("dbpress",3,8,12,120),E("incline",3,8,12,90),E("lateral",3,12,15,60),E("pushdown",3,10,15,60),E("ohtri",2,10,15,60)]},
    {name:"Pull",ex:[E("pulldown",4,8,12,90),E("cablerow",3,8,12,90),E("onearmrow",3,8,12,90),E("facepull",3,12,15,60),E("ezcurl",3,10,15,60),E("hammer",2,10,15,60)]},
    {name:"Legs",ex:[E("squat",4,5,8,180),E("rdl",3,8,10,120),E("legpress45",3,10,12,120),E("legcurl",3,10,15,75),E("legext",3,10,15,60),E("calfraise",4,10,15,60)]}]},
  ul4:{name:"Upper / Lower · 4 days",days:[0,1,3,4],routines:[
    {name:"Upper A",ex:[E("bench",4,6,8,150),E("bbrow",4,6,10,120),E("dbpress",3,8,12,90),E("pulldown",3,8,12,90),E("lateral",3,12,15,60),E("ezcurl",2,10,15,60),E("pushdown",2,10,15,60)]},
    {name:"Lower A",ex:[E("squat",4,5,8,180),E("rdl",3,8,10,120),E("legpress45",3,10,12,120),E("legcurl",3,10,15,75),E("calfraise",4,10,15,60),E("plank",3,30,60,45)]},
    {name:"Upper B",ex:[E("incline",4,8,12,120),E("cablerow",3,8,12,90),E("ohp",3,6,10,120),E("pullup",3,5,10,120),E("fly",3,12,15,60),E("hammer",2,10,15,60),E("ohtri",2,10,15,60)]},
    {name:"Lower B",ex:[E("tbdl",3,5,8,150),E("split",3,8,12,90),E("legext",3,10,15,60),E("lyingcurl",3,10,15,75),E("hipthrust",3,8,12,120),E("seatedcalf",3,12,15,60),E("hangleg",3,8,15,60)]}]},
  own:{name:"Build my own",days:[0,2,4],routines:[{name:"Workout A",ex:[]},{name:"Workout B",ex:[]},{name:"Workout C",ex:[]}]}
};
const newId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function splitToSetup(key){
  const sp=SPLITS[key], routines=sp.routines.map((r,i)=>({id:"r"+(i+1),name:r.name,ex:r.ex.map(e=>({...e}))}));
  const week=Array(7).fill("rest"); sp.days.forEach((d,i)=>week[d]=routines[i].id);
  return {routines,week};
}
function defaultRunDays(week,n){ const pref=[1,3,5,6,2,4,0], out=[]; for(const d of pref){ if(out.length>=n) break; if(week[d]==="rest") out.push(d) } return out }

/* ======================= Food database (per 100 g) ======================= */
// [id, name, kcal, protein, carbs, fat, [[serving label, grams], ...]]
const FOOD_RAW=[
  // Protein
  ["chkbr","Chicken breast, raw",120,22.5,0,2.6,[["1 breast (6 oz)",170]]],["chkbrc","Chicken breast, cooked",165,31,0,3.6,[["1 cup diced",140]]],
  ["chkth","Chicken thigh, boneless skinless, raw",121,19.7,0,4.1,[["1 thigh",95]]],["rotis","Rotisserie chicken meat, no skin",175,27,0,7,[["1 cup",140]]],
  ["turk93","Ground turkey 93% lean, raw",150,18.7,0,8.3,[["1 lb",454]]],["beef90","Ground beef 90% lean, raw",176,20,0,10,[["1 lb",454]]],
  ["beef80","Ground beef 80% lean, raw",254,17.2,0,20,[["1 lb",454]]],["sirloin","Sirloin steak, raw",160,21,0,8,[["1 steak (8 oz)",227]]],
  ["porkten","Pork tenderloin, raw",120,21,0,3.5,[["1 lb",454]]],["salmon","Salmon, raw",208,20,0,13,[["1 fillet (6 oz)",170]]],
  ["tuna","Tuna, canned in water, drained",116,25.5,0,0.8,[["1 can, drained",113]]],["shrimp","Shrimp, raw",85,20,0,0.5,[["1 lb",454]]],
  ["tilapia","Tilapia, raw",96,20,0,1.7,[["1 fillet",116]]],["cod","Cod, raw",82,18,0,0.7,[["1 fillet",180]]],
  ["bacon","Bacon, cooked",541,37,1.4,42,[["1 slice",8]]],["ham","Ham, deli sliced",110,17,2,3.5,[["1 slice",28]]],
  ["turkdeli","Turkey breast, deli sliced",100,18,3,1.5,[["1 slice",28]]],["egg","Egg, large",143,12.6,0.7,9.5,[["1 large egg",50]]],
  ["eggwh","Egg whites",52,10.9,0.7,0.2,[["1 large white",33],["1 cup",243]]],["tofu","Tofu, firm",144,17.3,2.8,8.7,[["1 block (14 oz)",397]]],
  ["tempeh","Tempeh",192,20,7.6,10.8,[["1 package (8 oz)",227]]],["whey","Whey protein powder",400,80,8,6,[["1 scoop",30]]],
  // Dairy
  ["gyog0","Greek yogurt, plain nonfat",59,10.3,3.6,0.4,[["1 cup",245],["1 container (5.3 oz)",150]]],["gyog2","Greek yogurt, plain 2%",73,9.9,3.9,1.9,[["1 cup",245]]],
  ["cott1","Cottage cheese, 1% low-fat",72,12.4,2.7,1,[["1 cup",226],["½ cup",113]]],["milk2","Milk, 2%",50,3.3,4.8,2,[["1 cup",244]]],
  ["milkw","Milk, whole",61,3.2,4.8,3.3,[["1 cup",244]]],["milks","Milk, skim",34,3.4,5,0.1,[["1 cup",245]]],
  ["almmilk","Almond milk, unsweetened",15,0.6,0.3,1.2,[["1 cup",240]]],["cheddar","Cheddar cheese",403,25,1.3,33,[["1 slice",21],["¼ cup shredded",28]]],
  ["mozz","Mozzarella, part-skim",254,24.3,2.8,15.9,[["¼ cup shredded",28]]],["parm","Parmesan, grated",420,28.4,13.9,27.8,[["1 tbsp",5]]],
  ["feta","Feta cheese",264,14.2,4.1,21.3,[["¼ cup crumbled",38]]],["butter","Butter",717,0.9,0.1,81,[["1 tbsp",14]]],
  ["crmchs","Cream cheese",342,6,4,34,[["1 tbsp",15]]],
  // Grains & starches
  ["ricew","White rice, cooked",130,2.7,28.2,0.3,[["1 cup",158]]],["ricewd","White rice, dry",365,7.1,80,0.7,[["¼ cup",46],["1 cup",185]]],
  ["riceb","Brown rice, cooked",123,2.7,25.6,1,[["1 cup",195]]],["pastad","Pasta, dry",371,13,75,1.5,[["2 oz",56]]],
  ["pastac","Pasta, cooked",158,5.8,31,0.9,[["1 cup",140]]],["oats","Rolled oats, dry",379,13.2,67.7,6.5,[["½ cup",40],["1 cup",81]]],
  ["breadww","Whole wheat bread",252,12.4,43,3.5,[["1 slice",32]]],["breadw","White bread",266,8.9,49,3.3,[["1 slice",29]]],
  ["bagel","Bagel, plain",250,10,49,1.5,[["1 bagel",105]]],["bun","Hamburger bun",279,9.5,49,4.3,[["1 bun",51]]],
  ["tortf","Flour tortilla (8 in)",312,8.3,51.6,8,[["1 tortilla",49]]],["tortc","Corn tortilla",218,5.7,44.6,2.9,[["1 tortilla",26]]],
  ["potato","Potato",77,2,17.5,0.1,[["1 medium",213]]],["swpot","Sweet potato",86,1.6,20.1,0.1,[["1 medium",130]]],
  ["quinoa","Quinoa, cooked",120,4.4,21.3,1.9,[["1 cup",185]]],["cous","Couscous, cooked",112,3.8,23.2,0.2,[["1 cup",157]]],
  ["blkbean","Black beans, cooked/canned",132,8.9,23.7,0.5,[["½ cup",86],["1 can, drained",250]]],["chickpea","Chickpeas, cooked/canned",164,8.9,27.4,2.6,[["½ cup",82]]],
  ["lentil","Lentils, cooked",116,9,20.1,0.4,[["1 cup",198]]],["kidney","Kidney beans, cooked/canned",127,8.7,22.8,0.5,[["½ cup",89]]],
  ["granola","Granola",471,10,64,20,[["¼ cup",30]]],["cereal","Oat cereal (Cheerios-type)",367,12,73,6.7,[["1 cup",28]]],
  ["ricecake","Rice cake",387,8.2,81.5,2.8,[["1 cake",9]]],["popcorn","Popcorn, air-popped",387,13,78,4.5,[["1 cup",8]]],
  // Fruit
  ["banana","Banana",89,1.1,22.8,0.3,[["1 medium",118]]],["apple","Apple",52,0.3,13.8,0.2,[["1 medium",182]]],
  ["orange","Orange",47,0.9,11.8,0.1,[["1 medium",131]]],["straw","Strawberries",32,0.7,7.7,0.3,[["1 cup",152]]],
  ["blueb","Blueberries",57,0.7,14.5,0.3,[["1 cup",148]]],["berries","Mixed berries, frozen",50,0.7,12,0.3,[["1 cup",140]]],
  ["grapes","Grapes",69,0.7,18.1,0.2,[["1 cup",151]]],["avocado","Avocado",160,2,8.5,14.7,[["1 avocado",150],["½ avocado",75]]],
  ["raisin","Raisins",299,3.1,79,0.5,[["1 small box",43]]],["pineap","Pineapple",50,0.5,13.1,0.1,[["1 cup",165]]],
  ["mango","Mango",60,0.8,15,0.4,[["1 cup",165]]],["watermel","Watermelon",30,0.6,7.6,0.2,[["1 cup",152]]],
  // Vegetables
  ["broc","Broccoli",34,2.8,6.6,0.4,[["1 cup",91]]],["spinach","Spinach, raw",23,2.9,3.6,0.4,[["1 cup",30]]],
  ["romaine","Romaine lettuce",17,1.2,3.3,0.3,[["1 cup",47]]],["carrot","Carrots",41,0.9,9.6,0.2,[["1 medium",61],["1 cup chopped",128]]],
  ["pepper","Bell pepper",31,1,6,0.3,[["1 medium",119]]],["onion","Onion",40,1.1,9.3,0.1,[["1 medium",110]]],
  ["tomato","Tomato",18,0.9,3.9,0.2,[["1 medium",123]]],["cucumber","Cucumber",16,0.7,3.6,0.1,[["1 cup sliced",104]]],
  ["zucchini","Zucchini",17,1.2,3.1,0.3,[["1 medium",196]]],["grbean","Green beans",31,1.8,7,0.2,[["1 cup",100]]],
  ["mushroom","Mushrooms",22,3.1,3.3,0.3,[["1 cup",70]]],["cauli","Cauliflower",25,1.9,5,0.3,[["1 cup",107]]],
  ["asparag","Asparagus",20,2.2,3.9,0.1,[["1 cup",134]]],["corn","Corn kernels",86,3.3,19,1.4,[["1 cup",145]]],
  ["peas","Green peas",81,5.4,14.5,0.4,[["1 cup",145]]],["stirfry","Frozen stir-fry vegetables",35,2,7,0.2,[["1 cup",90]]],
  ["garlic","Garlic",149,6.4,33,0.5,[["1 clove",3]]],["crtom","Crushed tomatoes, canned",32,1.6,7,0.3,[["1 cup",242],["1 can (28 oz)",794]]],
  ["tompaste","Tomato paste",82,4.3,18.9,0.5,[["1 tbsp",16]]],["marinara","Marinara sauce",51,1.6,8,1.5,[["½ cup",125]]],
  ["salsa","Salsa",36,1.5,7,0.2,[["2 tbsp",32]]],
  // Fats, nuts, sauces
  ["olvoil","Olive oil",884,0,0,100,[["1 tbsp",13.5],["1 tsp",4.5]]],["vegoil","Vegetable oil",884,0,0,100,[["1 tbsp",13.6]]],
  ["pb","Peanut butter",588,25,20,50,[["1 tbsp",16],["2 tbsp",32]]],["almbut","Almond butter",614,21,19,56,[["1 tbsp",16]]],
  ["almond","Almonds",579,21,21.6,49.9,[["1 oz (23 nuts)",28]]],["walnut","Walnuts",654,15.2,13.7,65.2,[["¼ cup",30]]],
  ["peanut","Peanuts",567,25.8,16.1,49.2,[["1 oz",28]]],["cashew","Cashews",553,18.2,30.2,43.9,[["1 oz",28]]],
  ["chia","Chia seeds",486,16.5,42.1,30.7,[["1 tbsp",12]]],["pesto","Basil pesto",470,5,6,47,[["1 tbsp",16]]],
  ["mayo","Mayonnaise",680,1,0.6,75,[["1 tbsp",14]]],["mayol","Mayonnaise, light",325,0.9,8.6,32.6,[["1 tbsp",15]]],
  ["ketchup","Ketchup",101,1,27,0.1,[["1 tbsp",17]]],["mustard","Mustard",60,3.7,5.8,3.3,[["1 tsp",5]]],
  ["hotsauce","Hot sauce",12,0.5,1.8,0.4,[["1 tsp",5]]],["soy","Soy sauce",53,8.1,4.9,0.6,[["1 tbsp",16]]],
  ["honey","Honey",304,0.3,82.4,0,[["1 tbsp",21]]],["maple","Maple syrup",260,0,67,0.1,[["1 tbsp",20]]],
  ["sugar","Sugar",387,0,100,0,[["1 tsp",4]]],["ranch","Ranch dressing",430,1,6,44.5,[["1 tbsp",15]]],
  ["bbq","BBQ sauce",172,0.8,40.8,0.6,[["1 tbsp",17]]],["hummus","Hummus",166,7.9,14.3,9.6,[["2 tbsp",30]]],
  ["darkchoc","Dark chocolate 70%",598,7.8,45.9,42.6,[["1 square",10]]],["protbar","Protein bar (typical)",333,33,37,12,[["1 bar",60]]],
  // Drinks & takeout
  ["oj","Orange juice",45,0.7,10.4,0.2,[["1 cup",248]]],["coffee","Coffee, black",1,0.1,0,0,[["1 cup",237]]],
  ["cola","Cola",37,0,9.6,0,[["1 can (12 oz)",368]]],["beer","Beer, regular",43,0.5,3.6,0,[["1 bottle (12 oz)",356]]],
  ["gator","Sports drink",24,0,6,0,[["1 bottle (20 oz)",591]]],["pizza","Cheese pizza",266,11.4,33.3,9.7,[["1 slice",107]]],
  ["fries","French fries",312,3.4,41,15,[["1 medium order",117]]]
];
function foodDb(){ const k=(typeof S!=="undefined"&&S.profile&&S.profile.kitchen)||{};
  return [...FOOD_RAW.map(([id,n,kc,p,c,f,sv])=>({id,n,k:kc,p,c,f,sv})), ...(k.foods||[]).map(x=>({...x,custom:true})), ...(k.usda||[])] }
function foodById(id){ return foodDb().find(f=>f.id===id) || USDA.cache.get(id) }

/* ----- USDA FoodData Central search (via /api/foods) ----- */
const USDA={cache:new Map(),results:{}};
let usdaTimer=null;
const usdaKey=q=>(q||"").trim().toLowerCase();
function usdaWant(q){ q=usdaKey(q); if(q.length<3||USDA.results[q]) return; clearTimeout(usdaTimer);
  usdaTimer=setTimeout(async()=>{ if(USDA.results[q]) return; USDA.results[q]={loading:true}; usdaPaint(q);
    try{ const tok=window.appAuthToken? await window.appAuthToken() : null;
      const r=await fetch("/api/foods?q="+encodeURIComponent(q),{headers:tok?{authorization:"Bearer "+tok}:{}});
      const j=await r.json().catch(()=>({})); if(!r.ok) throw j.code||"error";
      (j.foods||[]).forEach(f=>USDA.cache.set(f.id,f)); USDA.results[q]={list:j.foods||[]};
    }catch(e){ USDA.results[q]={err:e==="rate_limited"?"USDA search is busy. Try again in a minute.":"USDA search isn't available right now."}; setTimeout(()=>{delete USDA.results[q]},30000) }
    usdaPaint(q) },400) }
function usdaPaint(q){ if(SH&&usdaKey(SH.q)===q) paintPart(".xs-results") }
function usdaSection(q,localCount){ q=usdaKey(q); if(q.length<3) return localCount?"":`<p class="small muted">No matches. Type at least 3 letters to search the USDA database.</p>`;
  usdaWant(q); const r=USDA.results[q];
  let h=`<div class="eyebrow" style="margin-top:12px">USDA database</div>`;
  if(!r||r.loading) return h+`<p class="small muted"><span class="pulse"></span> Searching…</p>`;
  if(r.err) return h+`<p class="small muted">${esc(r.err)}</p>`;
  if(!r.list.length) return h+`<p class="small muted">No USDA matches. Try fewer words, or add it as a custom food.</p>`;
  return h+`<div class="xs-list">${r.list.map(f=>{const u=f.sv[0]||["100 g",100], m=macrosOf(f,u[1]); return `<button type="button" class="xs-item" data-xs-pickf="${f.id}"><span><b>${esc(f.n)}</b><span class="small muted num">${esc(u[0])} · ${fmtN(m.kcal)} kcal · ${Math.round(m.p)} g P</span></span><span class="xs-plus">+</span></button>`}).join("")}</div>`;
}
function keepUsda(f){ if(!f||(f.src!=="usda"&&f.src!=="off")) return; const K=kitchen(); K.usda=K.usda||[]; if(!K.usda.some(x=>x.id===f.id)){ K.usda.push({id:f.id,n:f.n,k:f.k,p:f.p,c:f.c,f:f.f,sv:f.sv,src:f.src}); if(K.usda.length>300) K.usda.shift(); saveProfile() } }
function unitsOf(f){ return f.custom? [[f.serving||"1 serving",100]] : [...(f.sv||[]),["g",1],["oz",28.35],["lb",453.6]] }
function gramsOf(f,amt,unit){ if(!f) return 0; const u=unitsOf(f).find(x=>x[0]===unit)||unitsOf(f)[0]; return (Number(amt)||0)*u[1] }
function macrosOf(f,grams){ const m=grams/100; return {kcal:f.k*m,p:f.p*m,c:f.c*m,f:f.f*m} }
const addM=(a,b,x=1)=>({kcal:a.kcal+b.kcal*x,p:a.p+b.p*x,c:a.c+b.c*x,f:a.f+b.f*x});
const ZERO={kcal:0,p:0,c:0,f:0};
function kitchen(){ S.profile.kitchen=S.profile.kitchen||{foods:[],recipes:[],plan:{b:[],l:[],d:[],s:[]}}; const k=S.profile.kitchen; k.foods=k.foods||[]; k.recipes=k.recipes||[]; k.plan=k.plan||{b:[],l:[],d:[],s:[]}; return k }
function recipeTotals(r,base){ let t={...ZERO}; (base?(r.items||[]):scaledItems(r)).forEach(it=>{const f=foodById(it.f); if(f) t=addM(t,macrosOf(f,gramsOf(f,it.amt,it.unit)))}); const n=Math.max(1,Number(r.servings)||1); return {total:t,per:{kcal:t.kcal/n,p:t.p/n,c:t.c/n,f:t.f/n},n} }
function entryMacros(e){ // plan/diary source: {t:"r",id,qty} or {t:"f",id,amt,unit}
  if(e.t==="r"){ const r=kitchen().recipes.find(x=>x.id===e.id); if(!r) return null; const T=recipeTotals(r).per; return {name:r.name,amount:`${fmtQ(e.qty)} serving${Number(e.qty)===1?"":"s"}`,m:{kcal:T.kcal*e.qty,p:T.p*e.qty,c:T.c*e.qty,f:T.f*e.qty}} }
  const f=foodById(e.id); if(!f) return null; return {name:f.n,amount:fmtAmt(e.amt,e.unit),m:macrosOf(f,gramsOf(f,e.amt,e.unit))} }
const fmtAmt=(a,u)=>{ const q=fmtQ(a); if(["g","oz","lb"].includes(u)) return `${q} ${u}`; if(/^1 /.test(u)) return Number(a)===1? u : `${q} × ${u.slice(2)}`; return Number(a)===1? u : `${q} × ${u}` };
const fmtQ=n=>{const x=Number(n)||0; return Number.isInteger(x)?String(x):x.toFixed(2).replace(/0+$/,"").replace(/\.$/,"")};
const SLOTS=[["b","Breakfast"],["l","Lunch"],["d","Dinner"],["s","Snacks"]];

/* ----- Diary math (used by the main app's food totals) ----- */
// Entries from the original meal-plan checkboxes and off-plan extras still count and show in the diary.
const LEGACY_SLOT={b:"b",l:"l",d:"d",s:"s",e:"s",bn:"s"};
function legacyItems(k){ const m=S.meals[k]; if(!m) return []; const out=[];
  Object.entries(m.eaten||{}).forEach(([id,v])=>{ if(v&&typeof MEALS!=="undefined"&&MEALS[id]) out.push({slot:LEGACY_SLOT[id]||"s",n:MEALS[id].n.replace(/^[^·]+·\s*/,""),amt:"meal plan",kcal:MEALS[id].kcal,p:MEALS[id].p,c:0,f:0,legacy:true}) });
  (m.extras||[]).forEach(x=>out.push({slot:"s",n:x.n||"Extra",amt:"",kcal:+x.kcal||0,p:+x.p||0,c:0,f:0,legacy:true}));
  return out }
function diaryTotals(k){ const m=S.meals[k]; let t={...ZERO}; [...(m&&m.items||[]),...legacyItems(k)].forEach(x=>{t=addM(t,{kcal:+x.kcal||0,p:+x.p||0,c:+x.c||0,f:+x.f||0})}); return t }
function foodGoals(){ const su=CUSTOM&&CUSTOM.su; const g=(su&&su.food)||{}; const kcal=Number(g.kcal||su&&su.kcal)||2000;
  const p=Number(g.protein)||Math.round((Number(su&&su.weight)||170)*0.8), f=Number(g.fat)||Math.round(kcal*0.28/9), c=Number(g.carbs)||Math.max(0,Math.round((kcal-p*4-f*9)/4));
  return {kcal,p,c,f} }

/* ======================= Logged days keep their plan ======================= */
const SNAP_KEYS=["id","name","sets","lo","hi","inc","rest","bw","unit","optW","alt","muscle","equip","uni","ss"];
function planSnapshot(d){ const p=planFor(d); if(!p||p.type==="rest") return null;
  if(p.type==="gym") return {type:"gym",day:p.day,name:p.name,ex:(p.ex||[]).map(e=>{const o={}; SNAP_KEYS.forEach(k=>{if(e[k]!==undefined) o[k]=e[k]}); return o})};
  return {type:"run",key:p.key,t:p.t,d:p.d} }
function loggedPlan(d){ const k=ymd(d), l=S.logs[k]; if(!l) return null; const w=weekOf(d), i=dowOf(d);
  if(l.plan&&l.plan.type) return {...l.plan,w,i,logged:true};
  if(l.type==="gym"&&l.ex&&CUSTOM.su.fromLegacy&&/^[ABC]$/.test(l.day||"")&&typeof gymDay0==="function"){
    let g=gymDay0(l.day,d); BUILTIN_SWAPS.forEach(r=>{ if(r.day===l.day&&k>=r.since) g={...g,ex:g.ex.map(e=>e.id===r.from?swapEx(e,r.to):e)} });
    if(k>=V2_FROM) g={...g,ex:[...g.ex,ropeFor(d)]};
    return {type:"gym",w,i,day:l.day,name:g.name,ex:g.ex,logged:true} }
  if(l.type==="gym"&&l.ex){ const cur=CUSTOM.gym[l.day]||CUSTOM.gym["r"+l.day];
    return {type:"gym",w,i,day:l.day,name:(cur&&cur.name)||"Workout",logged:true,ex:Object.keys(l.ex).map(id=>{const c=cur&&cur.ex.find(e=>e.id===id), b=c||toPlanEx({id}); return {...b,sets:Math.max(b.sets,l.ex[id].length)}})} }
  if(l.type==="run"&&!l.plan){ const mv=(S.profile.moves||{})[k], b0=mv&&/^\d{4}-/.test(mv)? basePlan(parseYmd(mv)) : basePlan(d); if(b0&&b0.type==="run") return null }
  if(l.type==="run"){ const b=basePlan(d); return b&&b.type==="run"? b : {type:"run",w,i,key:"tue",t:"Run",d:"Logged run",logged:true} }
  return null }

/* ======================= Shared bottom sheet ======================= */
let SH=null; // {kind, ...state}
function sheetEl(){ let el=document.getElementById("xsheet"); if(!el){ el=document.createElement("div"); el.id="xsheet"; el.hidden=true; el.innerHTML=`<div class="xs-back" data-xs="close"></div><div class="xs-panel" role="dialog" aria-modal="true"><div class="xs-in"></div></div>`; document.body.appendChild(el) } return el }
function openSheet(state){ SH=state; const el=sheetEl(); el.hidden=false; document.body.classList.add("xs-open"); paintSheet(true) }
function xsClose(){ stopScan(); if(SH&&SH.kind==="form"&&SH.track) URL.revokeObjectURL(SH.track.url); SH=null; const el=document.getElementById("xsheet"); if(el) el.hidden=true; document.body.classList.remove("xs-open") }
function paintSheet(scrollTop){ if(!SH) return; const el=sheetEl(), inn=el.querySelector(".xs-in"); const focusSel=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.xsFocus;
  inn.innerHTML=sheetHtml();
  if(scrollTop) el.querySelector(".xs-panel").scrollTop=0;
  if(SH.kind==="form") formMountReplay();
  if(focusSel){ const f=inn.querySelector(`[data-xs-focus="${focusSel}"]`); if(f){ f.focus(); try{const v=f.value; f.setSelectionRange(v.length,v.length)}catch(e){} } } }
const commitPlan=()=>{ saveProfile(); onProfile(); render() };
// Repaint only part of the sheet, so the input being typed in (and the iPhone keyboard) stays put.
function sheetHtml(){ return SH.kind==="form"? formHtml() : SH.kind==="autogen"? autogenHtml() : SH.kind==="shopItem"? shopItemHtml() : SH.kind==="shopList"? shopListHtml() : SH.kind==="shopSched"? shopSchedHtml() : SH.kind==="gscan"? gscanHtml() : SH.kind==="plates"? platesHtml() : SH.kind==="move"? moveHtml() : SH.kind==="hist"? historyHtml() : SH.kind==="swap"? swapHtml() : SH.kind==="account"? accountHtml() : SH.kind==="exPick"? exPickerHtml() : SH.kind==="exNew"? exNewHtml() : SH.kind==="food"? foodSheetHtml() : SH.kind==="recipe"? recipeHtml() : SH.kind==="cfood"? cfoodHtml() : "" }
function paintPart(sel){ if(!SH) return; const el=document.querySelector("#xsheet .xs-in"); const dst=el&&el.querySelector(sel); if(!dst){ paintSheet(); return }
  const tmp=document.createElement("div"); tmp.innerHTML=sheetHtml(); const src=tmp.querySelector(sel); if(src) dst.innerHTML=src.innerHTML; else paintSheet() }
function estMin(ex){ const sec=(ex||[]).reduce((t,e)=>t+(e.sets||3)*((e.rest||90)+(isSec(e)?(e.hi||45):40)),0); return Math.max(10,Math.round(sec/60/5)*5) }

/* ======================= Routine editor (Plan → Training) ======================= */
function routinesEditor(){
  const su=CUSTOM.su, rs=su.routines||[];
  const opts=(v)=>[["rest","Rest"],["run","Run"],...rs.map(r=>[r.id,r.name])].map(([id,n])=>`<option value="${esc(id)}" ${v===id?"selected":""}>${esc(n)}</option>`).join("");
  let h=`<div class="card"><h2>Weekly schedule</h2><div class="sched">${DOW.map((d,i)=>`<label><span>${d}</span><select data-c-week="${i}">${opts(su.week[i])}</select></label>`).join("")}</div>
    <p class="small muted">Changes apply to your plan from today on.</p></div>`;
  rs.forEach((r,ri)=>{
    if(!R_OPEN.has(r.id)){ h+=`<div class="card routine"><div class="row between" style="gap:8px"><h2>${esc(r.name)}</h2><button type="button" class="btn ghost sm" data-c-ropen="${r.id}">Edit</button></div>
      <div class="small">${r.ex.length? r.ex.map(e=>{const L=libEx(e.id); return `${e.ss?"⛓ ":""}${esc(L?L.name:e.id)} <span class="muted num">${e.sets}×${e.lo}–${e.hi}${L&&L.type==="t"?"s":""}</span>`}).join("<br>") : `<span class="muted">No exercises yet.</span> <button type="button" class="link small" data-c-ropen="${r.id}">Add some</button>`}</div></div>`; return }
    h+=`<div class="card routine"><div class="row between" style="gap:8px"><input class="rname" data-c-rname="${r.id}" value="${esc(r.name)}" aria-label="Routine name"><button type="button" class="btn sm" data-c-ropen="${r.id}">Done</button></div>`;
    if(!r.ex.length) h+=`<p class="small muted">No exercises yet. Add some below.</p>`;
    r.ex.forEach((e,ei)=>{ const L=libEx(e.id)||{name:e.id,muscle:"",type:"w"}, t=L.type==="t";
      const ssTag=e.ss?`<span class="sslabel" style="font-size:11px">Superset</span>`:"";
      h+=`<div class="rex ${e.ss?"inss":""}"><div class="rex-h"><div>${ssTag}<b>${esc(L.name)}</b><span class="small muted">${esc(L.muscle)}${L.equip?` · ${esc(L.equip)}`:""}</span></div>
        <div class="rex-act"><button type="button" class="${e.ss?"on":""}" data-c-ss="${r.id}|${ei}" aria-label="${e.ss?"Unlink superset":"Superset with next exercise"}" title="Superset" ${!e.ss&&ei===r.ex.length-1?"disabled":""}>⛓</button><button type="button" data-c-mv="${r.id}|${ei}|-1" aria-label="Move up" ${ei===0?"disabled":""}>↑</button><button type="button" data-c-mv="${r.id}|${ei}|1" aria-label="Move down" ${ei===r.ex.length-1?"disabled":""}>↓</button><button type="button" data-c-rm="${r.id}|${ei}" aria-label="Remove">✕</button></div></div>
        <div class="rex-f"><label>Sets<span class="step"><button type="button" data-c-sets="${r.id}|${ei}|-1">−</button><b class="num">${e.sets}</b><button type="button" data-c-sets="${r.id}|${ei}|1">+</button></span></label>
        <label>${t?"Seconds":"Reps"}<span class="rng"><input inputmode="numeric" data-c-lo="${r.id}|${ei}" value="${e.lo}">–<input inputmode="numeric" data-c-hi="${r.id}|${ei}" value="${e.hi}"></span></label>
        <label>Rest<select data-c-rest="${r.id}|${ei}">${[30,45,60,75,90,120,150,180,240].map(s=>`<option value="${s}" ${Number(e.rest)===s?"selected":""}>${fmtClock(s*1000)}</option>`).join("")}</select></label></div></div>`});
    h+=`<div class="row" style="gap:8px"><button type="button" class="btn sm" data-c-add="${r.id}">+ Add exercise</button><button type="button" class="btn ghost sm" data-c-rdel="${r.id}" ${rs.length<=1?"disabled":""}>Delete routine</button></div></div>`;
  });
  h+=`<div class="card"><button type="button" class="btn ghost" data-c-rnew="1">+ New routine</button>
    <p class="small muted" style="margin-top:10px">Start over from a template:</p><div class="suopts">${Object.entries(SPLITS).filter(([k])=>k!=="own").map(([k,s])=>`<button type="button" class="suopt" data-c-tpl="${k}"><b>${esc(s.name)}</b><span>${SH_CONFIRM===k?"Tap again to replace your routines":"Replaces your routines"}</span></button>`).join("")}</div></div>`;
  return h;
}
let SH_CONFIRM="", R_OPEN=new Set();
function routineById(id){ return (CUSTOM.su.routines||[]).find(r=>r.id===id) }
function suMut(fn){ const su=S.profile.setup; fn(su); su.at=Date.now(); commitPlan() }

/* ----- Exercise picker ----- */
function exPickerHtml(){
  const q=(SH.q||"").toLowerCase().trim(), mu=SH.mu||"", r=routineById(SH.rid), have=new Set((r&&r.ex||[]).map(e=>e.id));
  const list=exLib().filter(e=>(!mu||e.muscle===mu)&&(!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)||e.equip.toLowerCase().includes(q)));
  return `<div class="xs-head"><h2>Add exercises</h2><button type="button" class="btn sm" data-xs="close">Done</button></div>
   <input class="xs-search" type="search" placeholder="Search exercises" value="${esc(SH.q||"")}" data-xs-q="1" data-xs-focus="q" autocomplete="off">
   <div class="xs-chips"><button type="button" class="${!mu?"on":""}" data-xs-mu="">All</button>${MUSCLES.map(m=>`<button type="button" class="${mu===m?"on":""}" data-xs-mu="${m}">${m}</button>`).join("")}</div>
   <div class="xs-results"><div class="xs-list">${list.map(e=>`<button type="button" class="xs-item ${have.has(e.id)?"on":""}" data-xs-ex="${e.id}"><span><b>${esc(e.name)}</b><span class="small muted">${esc(e.muscle)} · ${esc(e.equip)}${e.custom?" · custom":""}</span></span><span class="xs-plus">${have.has(e.id)?"✓":"+"}</span></button>`).join("")||`<p class="small muted">No matches. Create it as a custom exercise below.</p>`}</div></div>
   <button type="button" class="btn ghost" data-xs="exnew" style="margin-top:12px">Create custom exercise</button>`;
}
function exNewHtml(){ const d=SH.d||(SH.d={name:SH.q||"",muscle:"Chest",equip:"Machine",type:"w"});
  const sel=(k,arr)=>`<select data-xs-nf="${k}">${arr.map(([v,l])=>`<option value="${v}" ${d[k]===v?"selected":""}>${l}</option>`).join("")}</select>`;
  return `<div class="xs-head"><h2>Custom exercise</h2><button type="button" class="btn ghost sm" data-xs="exback">Back</button></div>
   <div class="field"><label>Name</label><input data-xs-nf="name" value="${esc(d.name)}" data-xs-focus="nname"></div>
   <div class="row"><div class="field"><label>Muscle</label>${sel("muscle",MUSCLES.map(m=>[m,m]))}</div><div class="field"><label>Equipment</label>${sel("equip",EQUIP.map(m=>[m,m]))}</div></div>
   <div class="field"><label>Logged as</label>${sel("type",[["w","Weight × reps"],["bw","Bodyweight reps (+ optional weight)"],["t","Timed (seconds)"]])}</div>
   <p class="note" data-xs-err hidden></p><button type="button" class="btn" data-xs="exsave">Create and add</button>`;
}

/* ======================= Food UI ======================= */
function macroBars(t,g){ const row=(l,v,goal,col,u)=>`<div class="mb"><div class="row between small"><span>${l}</span><span class="num">${fmtN(v)}${u} <span class="muted">/ ${fmtN(goal)}${u}</span></span></div><div class="bar thin"><i style="width:${Math.min(100,goal?v/goal*100:0)}%;background:${col}"></i></div></div>`;
  return `<div class="macros">${row("Protein",t.p,g.p,"var(--gym)","g")}${row("Carbs",t.c,g.c,"var(--coach)","g")}${row("Fat",t.f,g.f,"var(--run)","g")}</div>` }
function diaryCard(d){
  const k=ymd(d), m=S.meals[k]||{}, items=m.items||[], g=foodGoals(), t=diaryTotals(k), left=g.kcal-t.kcal, plan=kitchen().plan;
  let h=`<div class="card"><div class="row between"><div><div class="eyebrow">Food diary</div><h2>${k===ymd(today)?"Today's food":"Food · "+fmtShort(d)}</h2></div><button type="button" class="btn sm" data-c-food="${k}|">+ Add food</button></div>
   <div class="kcalrow"><div><b class="num">${fmtN(g.kcal)}</b><span>Goal</span></div><b class="op">−</b><div><b class="num">${fmtN(t.kcal)}</b><span>Food</span></div><b class="op">=</b><div class="${left<0?"over":""}"><b class="num">${fmtN(Math.abs(left))}</b><span>${left<0?"Over":"Remaining"}</span></div></div>
   ${macroBars(t,g)}`;
  SLOTS.forEach(([sk,sn])=>{ const its=items.map((x,i)=>[x,i]).filter(([x])=>x.slot===sk), st=its.reduce((a,[x])=>a+(+x.kcal||0),0)+legacyItems(k).filter(x=>x.slot===sk).reduce((a,x)=>a+x.kcal,0), planned=(plan[sk]||[]);
    h+=`<div class="slot"><div class="row between"><b>${sn}</b><span class="small muted num">${fmtN(st)} kcal</span></div>`;
    legacyItems(k).filter(x=>x.slot===sk).forEach(x=>{h+=`<div class="extra"><span>${esc(x.n)} <span class="muted small num">· ${fmtN(x.kcal)} kcal · ${Math.round(x.p||0)} g P</span></span></div>`});
    its.forEach(([x,i])=>{h+=`<div class="extra"><span>${esc(x.n)} <span class="muted small num">· ${esc(x.amt||"")} · ${fmtN(x.kcal)} kcal · ${Math.round(x.p||0)} g P</span></span><button type="button" data-c-fdel="${k}|${i}" aria-label="Remove ${esc(x.n)}">×</button></div>`});
    const yk=ymd(addDays(parseYmd(k),-1)), yIts=((S.meals[yk]||{}).items||[]).filter(x=>x.slot===sk);
    h+=`<div class="row" style="gap:8px;flex-wrap:wrap">${yIts.length&&!its.length?`<button type="button" class="link small" data-c-fcopy="${k}|${sk}">Copy yesterday (${fmtN(yIts.reduce((a,x)=>a+(+x.kcal||0),0))} kcal)</button>`:""}${planned.length&&!its.some(([x])=>x.planned)?`<button type="button" class="link small" data-c-fplan="${k}|${sk}">+ Log planned ${sn.toLowerCase()}</button>`:""}<button type="button" class="link small" data-c-food="${k}|${sk}">+ Add</button></div></div>`});
  return h+`</div>`;
}
function foodSheetHtml(){ if(SH.view==="scan") return scanHtml();
  const rec=recentFoods(), tabs=[["recent","Recent"],["meals","My meals"],["foods","Search"],["quick","Quick"]], tab=SH.tab||(rec.length?"recent":"foods"), slotName=(SLOTS.find(s=>s[0]===SH.slot)||[])[1];
  let h=`<div class="xs-head"><h2>${SH.mode==="plan"?"Add to plan":"Add food"}${slotName?` · ${slotName}`:""}</h2><button type="button" class="btn ghost sm" data-xs="close">Close</button></div>`;
  if(!SH.slot){ h+=`<div class="xs-chips">${SLOTS.map(([k,n])=>`<button type="button" data-xs-slot="${k}">${n}</button>`).join("")}</div><p class="small muted">Pick a meal first.</p>`; return h }
  if(SH.pick){ // amount step
    const P=SH.pick; let m;
    if(P.t==="r"){ const r=kitchen().recipes.find(x=>x.id===P.id); const per=recipeTotals(r).per; m={kcal:per.kcal*(+P.qty||0),p:per.p*(+P.qty||0),c:per.c*(+P.qty||0),f:per.f*(+P.qty||0)};
      h+=`<h3>${esc(r.name)}</h3><div class="field"><label>Servings</label><input inputmode="decimal" data-xs-qty="1" value="${esc(P.qty)}" data-xs-focus="qty"></div>` }
    else { const f=foodById(P.id); m=macrosOf(f,gramsOf(f,P.amt,P.unit));
      h+=`<h3>${esc(f.n)}</h3><div class="row"><div class="field"><label>Amount</label><input inputmode="decimal" data-xs-amt="1" value="${esc(P.amt)}" data-xs-focus="amt"></div><div class="field"><label>Unit</label><select data-xs-unit="1">${unitsOf(f).map(([u])=>`<option ${u===P.unit?"selected":""}>${esc(u)}</option>`).join("")}</select></div></div>` }
    h+=`<p class="num macroline"><b>${fmtN(m.kcal)} kcal</b> · ${Math.round(m.p)} g protein · ${Math.round(m.c)} g carbs · ${Math.round(m.f)} g fat</p>
      <div class="row"><button type="button" class="btn" data-xs="fadd">${SH.mode==="plan"?"Add to plan":"Add to diary"}</button><button type="button" class="btn ghost" data-xs="fback">Back</button></div>`;
    return h }
  h+=`<div class="seg four" style="margin-bottom:10px">${tabs.map(([k,n])=>`<button type="button" class="${tab===k?"on":""}" data-xs-tab="${k}">${n}</button>`).join("")}</div>`;
  if(tab==="recent"){
    h+= rec.length? `<div class="xs-list">${rec.map((r,i)=>`<button type="button" class="xs-item" data-xs-recent="${i}"><span><b>${esc(r.n)}</b><span class="small muted num">${esc(r.amt||"")} · ${fmtN(r.kcal)} kcal · ${Math.round(r.p||0)} g P${r.count>1?` · logged ${r.count}×`:""}</span></span><span class="xs-plus">+</span></button>`).join("")}</div>` : `<p class="small muted">Foods you log show up here for one-tap adding.</p>`;
  } else if(tab==="meals"){ const rs=kitchen().recipes;
    h+= rs.length? `<div class="xs-list">${rs.map(r=>{const p=recipeTotals(r).per; return `<button type="button" class="xs-item" data-xs-pickr="${r.id}"><span><b>${esc(r.name)}</b><span class="small muted num">${fmtN(p.kcal)} kcal · ${Math.round(p.p)} g P per serving</span></span><span class="xs-plus">+</span></button>`}).join("")}</div>` : `<p class="small muted">No meals yet. Build one in Plan → Food → My meals.</p>`;
  } else if(tab==="foods"){ const q=(SH.q||"").toLowerCase().trim(); const list=foodDb().filter(f=>!q||f.n.toLowerCase().includes(q));
    h+=`<div class="row" style="gap:8px;flex-wrap:nowrap"><input class="xs-search" type="search" placeholder="Search foods" value="${esc(SH.q||"")}" data-xs-q="1" data-xs-focus="q" autocomplete="off"><button type="button" class="btn ghost sm" data-xs="scan" style="flex-shrink:0">Scan</button></div>
      <div class="xs-results"><div class="xs-list">${list.map(f=>{const u=unitsOf(f)[0], m=macrosOf(f,u[1]); return `<button type="button" class="xs-item" data-xs-pickf="${f.id}"><span><b>${esc(f.n)}</b><span class="small muted num">${esc(u[0])} · ${fmtN(m.kcal)} kcal · ${Math.round(m.p)} g P${f.custom?" · custom":""}</span></span><span class="xs-plus">+</span></button>`}).join("")}</div>${usdaSection(SH.q,list.length)}</div>`;
  } else {
    h+=`<div class="field"><label>Name</label><input data-xs-quick="n" placeholder="e.g. Latte" data-xs-focus="qn"></div>
      <div class="row"><div class="field"><label>Calories</label><input inputmode="numeric" data-xs-quick="kcal"></div><div class="field"><label>Protein g</label><input inputmode="numeric" data-xs-quick="p"></div></div>
      <div class="row"><div class="field"><label>Carbs g</label><input inputmode="numeric" data-xs-quick="c"></div><div class="field"><label>Fat g</label><input inputmode="numeric" data-xs-quick="f"></div></div>
      <p class="note" data-xs-err hidden></p><button type="button" class="btn" data-xs="qadd">Add</button>`;
  }
  return h;
}
// Recent: distinct foods from the last 45 days of diary entries, newest first, with how often they were logged
function recentFoods(){ const seen=new Map(), cut=ymd(addDays(today,-45));
  Object.keys(S.meals||{}).filter(k=>k>=cut).sort().reverse().forEach(k=>(S.meals[k].items||[]).forEach(x=>{ const key=x.src?JSON.stringify(x.src):"q:"+x.n+":"+x.kcal;
    if(seen.has(key)) seen.get(key).count++; else seen.set(key,{...x,count:1}) }));
  return [...seen.values()].slice(0,40) }
function scanHtml(){
  return `<div class="xs-head"><h2>Scan a barcode</h2><button type="button" class="btn ghost sm" data-xs="scanback">Back</button></div>
   <div id="scanbox" class="scanbox"><p class="small muted">${SH.scanErr?esc(SH.scanErr):"Starting camera…"}</p></div>
   <div class="row" style="gap:8px;flex-wrap:nowrap"><input class="xs-search" inputmode="numeric" placeholder="Or type the barcode number" data-xs-code="1" value="${esc(SH.code||"")}" data-xs-focus="code"><button type="button" class="btn sm" data-xs="lookup" style="flex-shrink:0">Look up</button></div>
   <p class="note" data-xs-err ${SH.lookErr?"":"hidden"}>${esc(SH.lookErr||"")}</p>
   ${SH.lookAdd?`<div class="note"><b>Add it from the label</b> and it'll come straight up next time, for you and anyone else who scans it.<div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-xs="scanadd">Enter the label</button></div></div>`:""}
   <p class="small muted">Nutrition from USDA, Open Food Facts and other RankUp users. Check it against the label.</p>`;
}
let scanner=null, scanLoading=null;
function loadScanLib(){ if(window.Html5Qrcode) return Promise.resolve(); if(scanLoading) return scanLoading;
  scanLoading=new Promise((ok,no)=>{ const sc=document.createElement("script"); sc.src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"; sc.onload=ok; sc.onerror=()=>{scanLoading=null; no(new Error("load"))}; document.head.appendChild(sc) }); return scanLoading }
async function startScan(){ try{ await loadScanLib(); if(!SH||SH.view!=="scan") return; const box=document.getElementById("scanbox"); if(!box) return; box.innerHTML="";
    const F=window.Html5QrcodeSupportedFormats; scanner=new Html5Qrcode("scanbox",{verbose:false,formatsToSupport:F?[F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E]:undefined});
    await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:260,height:140}},code=>{ stopScan(); SH.code=code; (SH.kind==="gscan"?gLookup:lookupCode)(code) },()=>{});
  }catch(e){ if(SH&&SH.view==="scan"){ SH.scanErr="Camera isn't available. Type the barcode number instead."; paintSheet() } } }
function startScanG(){ SH.view="scan"; startScan() }
function stopScan(){ const sc=scanner; scanner=null; if(sc){ try{ sc.stop().catch(()=>{}) }catch(e){} } }
// Share a product someone typed in after a scan, so the next person who scans it gets it straight away.
async function shareBarcode(entry){ try{ const tok=window.appAuthToken? await window.appAuthToken() : null; if(!tok||!entry||!entry.code) return;
  await fetch("/api/barcode",{method:"POST",headers:{authorization:"Bearer "+tok,"content-type":"application/json"},body:JSON.stringify(entry)}) }catch(e){} }
const srcTxt=src=>src&&src.length? src.join(" + ") : "the barcode databases";
async function lookupCode(code){ code=String(code||"").replace(/\D/g,""); if(code.length<6){ SH.lookErr="Enter the full barcode number."; SH.lookAdd=null; paintSheet(); return }
  const W=SH, pickFood=f=>{ W.view=null; W.lookErr=""; W.lookAdd=null; W.tab="foods"; W.pick={t:"f",id:f.id,amt:1,unit:unitsOf(f)[0][0]}; paintSheet(true) };
  const mine=kitchen().foods.find(f=>f.code===code); if(mine) return pickFood({...mine,custom:true});
  W.lookErr="Looking up…"; W.lookAdd=null; paintSheet();
  try{ const tok=window.appAuthToken? await window.appAuthToken() : null; const r=await fetch("/api/barcode?code="+code,{headers:tok?{authorization:"Bearer "+tok}:{}}); const j=await r.json().catch(()=>({}));
    if(SH!==W) return;
    if(r.ok&&j.food){ USDA.cache.set(j.food.id,j.food); keepUsda(j.food); W.src=srcTxt(j.src); return pickFood(j.food) }
    if(r.ok&&j.cfood){ // label nutrition another RankUp user entered: keep a copy in this person's foods
      const K=kitchen(), x={id:newId("cf"),n:j.cfood.n||j.product.name,serving:j.cfood.serving||"1 serving",k:j.cfood.k,p:j.cfood.p||0,c:j.cfood.c||0,f:j.cfood.f||0,code,shared:1};
      K.foods.push(x); saveProfile(); toast("Found it: added by another RankUp user"); return pickFood({...x,custom:true}) }
    if(r.status===404||r.ok){ W.lookErr= r.ok&&j.product? `Found ${j.product.name}, but no nutrition info yet.` : "This barcode isn't in any food database yet.";
      W.lookAdd={code,name:r.ok&&j.product?j.product.name:""}; paintSheet(); return }
    throw 0 }
  catch(e){ if(SH!==W) return; W.lookErr="Lookup isn't available right now."; W.lookAdd=null; paintSheet() } }
function recipeHtml(){ const r=SH.r, T=recipeTotals(r,true);
  let h=`<div class="xs-head"><h2>${SH.isNew?"New meal":"Edit meal"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>`;
  if(SH.adding){ const q=(SH.q||"").toLowerCase().trim(); const list=foodDb().filter(f=>!q||f.n.toLowerCase().includes(q));
    if(SH.pick){ const P=SH.pick, f=foodById(P.id), m=macrosOf(f,gramsOf(f,P.amt,P.unit));
      return h+`<h3>${esc(f.n)}</h3><div class="row"><div class="field"><label>Amount</label><input inputmode="decimal" data-xs-amt="1" value="${esc(P.amt)}" data-xs-focus="amt"></div><div class="field"><label>Unit</label><select data-xs-unit="1">${unitsOf(f).map(([u])=>`<option ${u===P.unit?"selected":""}>${esc(u)}</option>`).join("")}</select></div></div>
        <p class="num macroline"><b>${fmtN(m.kcal)} kcal</b> · ${Math.round(m.p)} g P · ${Math.round(m.c)} g C · ${Math.round(m.f)} g F</p>
        <div class="row"><button type="button" class="btn" data-xs="ingadd">Add ingredient</button><button type="button" class="btn ghost" data-xs="fback">Back</button></div>` }
    return h+`<input class="xs-search" type="search" placeholder="Search ingredients" value="${esc(SH.q||"")}" data-xs-q="1" data-xs-focus="q" autocomplete="off">
      <div class="xs-results"><div class="xs-list">${list.map(f=>`<button type="button" class="xs-item" data-xs-pickf="${f.id}"><span><b>${esc(f.n)}</b><span class="small muted num">${fmtN(f.custom?f.k:f.k)} kcal ${f.custom?"per "+esc(f.serving||"serving"):"/ 100 g"}</span></span><span class="xs-plus">+</span></button>`).join("")}</div>${usdaSection(SH.q,list.length)}</div>
      <button type="button" class="btn ghost" data-xs="ingback" style="margin-top:12px">Back to meal</button>` }
  h+=`<div class="field"><label>Meal name</label><input data-xs-rf="name" value="${esc(r.name)}" placeholder="e.g. Pesto chicken rice bowls" data-xs-focus="rname"></div>
    <div class="field" style="max-width:160px"><label>Makes (servings)</label><input inputmode="numeric" data-xs-rf="servings" value="${esc(r.servings)}" data-xs-focus="rserv"></div>
    <h3>Ingredients</h3>`;
  const methodHtml=`<div class="field"><label>Method (one step per line)</label><textarea data-xs-rf="method" rows="7" data-xs-focus="rmethod" placeholder="Brown the turkey…">${esc(r.method||"")}</textarea></div>
    <div class="field"><label>Storing and reheating</label><textarea data-xs-rf="store" rows="3" data-xs-focus="rstore">${esc(r.store||"")}</textarea></div>`;
  h+= r.items.length? r.items.map((it,i)=>{const f=foodById(it.f); if(!f) return ""; const m=macrosOf(f,gramsOf(f,it.amt,it.unit)); return `<div class="extra"><span>${esc(f.n)} <span class="muted small num">· ${esc(fmtAmt(it.amt,it.unit))} · ${fmtN(m.kcal)} kcal</span></span><button type="button" data-xs-ingrm="${i}" aria-label="Remove">×</button></div>`}).join("") : `<p class="small muted">Add the ingredients for the whole batch.</p>`;
  h+=`<button type="button" class="btn ghost sm" data-xs="ingnew" style="margin:8px 0">+ Add ingredient</button>
    <div class="note num rtot"><b>Per serving:</b> ${fmtN(T.per.kcal)} kcal · ${Math.round(T.per.p)} g protein · ${Math.round(T.per.c)} g carbs · ${Math.round(T.per.f)} g fat<br><span class="small muted">Whole batch: ${fmtN(T.total.kcal)} kcal · ${Math.round(T.total.p)} g protein</span></div>
    ${methodHtml}<p class="note" data-xs-err hidden></p>
    <div class="row"><button type="button" class="btn" data-xs="rsave">Save meal</button>${SH.isNew?"":`<button type="button" class="btn ghost" data-xs="rdel">${SH.delConfirm?"Tap again to delete":"Delete"}</button>`}</div>`;
  return h;
}
function cfoodHtml(){ const d=SH.d;
  return `<div class="xs-head"><h2>${SH.isNew?"New food":"Edit food"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
   <div class="field"><label>Name</label><input data-xs-cf="n" value="${esc(d.n)}" placeholder="e.g. Quest bar, cookies & cream" data-xs-focus="cfn"></div>
   <div class="field"><label>Serving size</label><input data-xs-cf="serving" value="${esc(d.serving)}" placeholder="e.g. 1 bar"></div>
   <div class="row"><div class="field"><label>Calories</label><input inputmode="decimal" data-xs-cf="k" value="${esc(d.k)}"></div><div class="field"><label>Protein g</label><input inputmode="decimal" data-xs-cf="p" value="${esc(d.p)}"></div></div>
   <div class="row"><div class="field"><label>Carbs g</label><input inputmode="decimal" data-xs-cf="c" value="${esc(d.c)}"></div><div class="field"><label>Fat g</label><input inputmode="decimal" data-xs-cf="f" value="${esc(d.f)}"></div></div>
   <p class="small muted">Per serving, from the nutrition label.${d.code?` Linked to barcode ${esc(d.code)} and shared so others who scan it get it too.`:""}</p><p class="note" data-xs-err hidden></p>
   <div class="row"><button type="button" class="btn" data-xs="cfsave">Save food</button>${SH.isNew?"":`<button type="button" class="btn ghost" data-xs="cfdel">${SH.delConfirm?"Tap again to delete":"Delete"}</button>`}</div>`;
}
/* ======================= Form check (on the phone; see formcheck.js) ======================= */
const FORM_ICON=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="4" width="9.5" height="8" rx="1.8"/><path d="M11 7l3.5-2v6L11 9"/></svg>`;
function formPattern(id){ const L=typeof libEx==="function"&&libEx(id); return window.FC? FC.patternFor(id,L&&L.muscle) : "basic" }
function formBtn(ex){ if(!ex||ex.fixed||!window.FC||formPattern(ex.id)==="none") return ""; return `<button type="button" class="swapb" data-formcheck="${esc(ex.id)}" aria-label="Form check: ${esc(ex.name)}" title="Check my form">${FORM_ICON}</button>` }
function formExercises(){ const seen=new Map(); try{ Object.values(curPhase()).forEach(d=>(d.ex||[]).forEach(e=>{ if(!e.fixed&&!seen.has(e.id)&&formPattern(e.id)!=="none") seen.set(e.id,e.name) })) }catch(e){}
  return [...seen.entries()] }
function formChecks(){ return (S.profile.formChecks||[]) }
const FORM_VERDICT={good:["Looks solid","good"],minor:["One thing to fix","minor"],fix:["A few things to fix","fix"],unclear:["Couldn't tell","unclear"]};
const FORM_TIPS={squat:"Side view, phone at hip height, whole body in frame. Film from the front another time to check your knees.",hinge:"Side view, phone at hip height, with the bar and your whole body in frame.",bridge:"Side view, level with the bench.",lunge:"Side view, whole body in frame.",
  hpress:"Side view at bench height, so your arm and the bar are clear.",dip:"Side view, whole body in frame.",vpress:"Side view, whole body and the weight overhead in frame.",row:"Side view, phone at hip height.",vpull:"Side or front view, with the bar and your whole body in frame.",
  curl:"Side view, whole body in frame.",tri:"Side view, your arm clearly visible.",raise:"Front view for lateral raises, side view for front raises.",legraise:"Side view, whole body in frame.",hold:"Side view at floor level.",basic:"Whole body in frame, from the side if you can."};
function formOpen(id){ const list=formExercises(), ex=id||(list[0]&&list[0][0])||"", name=(list.find(x=>x[0]===ex)||[])[1]||(typeof libEx==="function"&&libEx(ex)?libEx(ex).name:"");
  openSheet({kind:"form",step:"pick",ex,name}); if(window.FC) FC.load().catch(()=>{}) }
async function formPick(file){ const W=SH; if(!W||W.kind!=="form"||!file) return;
  if(!/^video\//.test(file.type||"")&&!/\.(mov|mp4|m4v|webm|3gp)$/i.test(file.name||"")){ W.err="That isn't a video file."; paintSheet(); return }
  W.err=""; W.step="reading"; W.prog={step:"Opening your video…",p:0}; paintSheet(true);
  try{ const tr=await FC.track(file,pr=>{ if(SH!==W) return; W.prog=pr; const b=document.querySelector("[data-fc-prog]"), s=document.querySelector("[data-fc-step]"); if(b) b.style.width=Math.round(pr.p*100)+"%"; if(s) s.textContent=pr.step });
    if(SH!==W){ URL.revokeObjectURL(tr.url); return }
    const L=typeof libEx==="function"&&libEx(W.ex), res=FC.analyze(tr.frames,{pattern:formPattern(W.ex),id:W.ex,height:tr.H});
    W.track=tr; W.res=res; W.step="result";
    const rec={id:"fc"+Date.now().toString(36),d:ymd(today),ex:W.ex,name:W.name,verdict:res.verdict,reps:res.reps.length,hold:res.hold||null,view:res.view||"",findings:res.findings.map(f=>({level:f.level,text:f.text,cue:f.cue}))};
    S.profile.formChecks=[...formChecks(),rec].slice(-40); saveProfile();
    S.chat.push({role:"user",content:`Form check (tracked on my phone): ${W.name}`,t:Date.now()}); S.chat.push({role:"assistant",content:formText(rec),t:Date.now()}); saveChat();
    paintSheet(true) }
  catch(e){ if(SH!==W) return; W.step="pick"; const c=e&&e.code;
    W.err= c==="timeout"? "That video took too long to open. Try a shorter clip (10–20 seconds is plenty)." : c==="decode"? "Couldn't read that video on this device. Try another clip, or on iPhone set Settings → Camera → Formats → Most Compatible." : "The body tracker couldn't start. Check your connection the first time you use it, then try again."; paintSheet(true) } }
function formText(r){ return [`**${FORM_VERDICT[r.verdict][0]}.** ${r.reps?`${r.reps} reps tracked.`:r.hold?`Held about ${r.hold.sec} s.`:""}`, ...r.findings.filter(f=>f.level!=="good"||true).map(f=>`${f.level==="fix"?"Fix":f.level==="tip"?"Tip":"Good"}: ${f.text}${f.cue?` ${f.cue}`:""}`)].join("\n") }
function formChart(res){ const se=res.series; if(!se||!se.s||se.s.length<3) return "";
  const W=320,H=90, t=se.t, s=se.s, tmax=t[t.length-1]||1, lo=Math.min(...s.filter(v=>v!=null)), hi=Math.max(...s.filter(v=>v!=null)), r=(hi-lo)||1, up=/Y$/.test(se.key);
  const y=v=>20+(H-28)*(up? (v-lo)/r : 1-(v-lo)/r), x=tt=>8+(W-16)*tt/tmax;
  const d=s.map((v,i)=>v==null?"":`${i&&s[i-1]!=null?"L":"M"}${x(t[i]).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return `<svg class="fc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Movement over the set"><path d="${d}" fill="none" stroke="var(--gym)" stroke-width="2.2" stroke-linejoin="round"/>${res.reps.map(rp=>`<g data-xs-fseek="${rp.tt}"><circle cx="${x(rp.tt).toFixed(1)}" cy="${y(s[rp.it]).toFixed(1)}" r="9" fill="transparent"/><circle cx="${x(rp.tt).toFixed(1)}" cy="${y(s[rp.it]).toFixed(1)}" r="4.5" fill="${rp.flags.length?"var(--warn)":"var(--good)"}"/><text x="${x(rp.tt).toFixed(1)}" y="11" text-anchor="middle">${rp.n}</text></g>`).join("")}</svg>` }
function formResultHtml(res,live){
  const ord={fix:0,tip:1,good:2}, fx=res.findings.map((f,i)=>({f,i})).sort((a,b)=>(a.i===0&&a.f.level==="good"?-1:b.i===0&&b.f.level==="good"?1:(ord[a.f.level]-ord[b.f.level])||a.i-b.i)).map(x=>x.f), lvl={fix:"Fix",tip:"Tip",good:"Good"};
  const rows=res.reps&&res.reps.length? `<div class="tablewrap"><table class="fc-reps"><thead><tr><th>Rep</th><th>Time</th>${res.reps[0].conc!=null?"<th>Up</th>":""}<th>Notes</th></tr></thead><tbody>${res.reps.map(r=>`<tr data-xs-fseek="${r.tt}"><td>${r.n}</td><td class="num">${r.total.toFixed(1)} s</td>${r.conc!=null?`<td class="num">${r.conc.toFixed(1)} s</td>`:""}<td>${r.flags.length?r.flags.map(esc).join(", "):'<span class="muted">✓</span>'}</td></tr>`).join("")}</tbody></table></div>` : "";
  return `<div class="fc-verdict ${FORM_VERDICT[res.verdict][1]}">${FORM_VERDICT[res.verdict][0]}</div>
    <div class="fc-finds">${fx.map(f=>`<div class="fc-find ${f.level}" ${live&&f.t!=null?`data-xs-fseek="${f.t}"`:""}><span class="fc-lvl">${lvl[f.level]}</span><div><b>${esc(f.text)}</b>${f.cue?`<div class="small">${esc(f.cue)}</div>`:""}${live&&f.t!=null?`<div class="small muted">Tap to see it</div>`:""}</div></div>`).join("")}</div>
    ${live?formChart(res)+rows:""}` }
function formHtml(){ const W=SH, list=formExercises(), pat=formPattern(W.ex);
  const head=`<div class="xs-head"><h2>Form check</h2><button type="button" class="btn ghost sm" data-xs="close">${W.step==="result"?"Done":"Cancel"}</button></div>`;
  const err=W.err?`<p class="note">${esc(W.err)}</p>`:"";
  if(W.step==="reading") return head+`<div class="gen-busy"><div class="gen-spin" aria-hidden="true"></div><b data-fc-step>${esc(W.prog&&W.prog.step||"Working…")}</b><p class="small muted">This runs on your phone. The video isn't uploaded anywhere.</p><div class="rk-bar"><i data-fc-prog style="width:${Math.round((W.prog&&W.prog.p||0)*100)}%;background:var(--gym)"></i></div></div>`;
  if(W.step==="result"){ const R=W.res, tr=W.track;
    return head+`<p class="small muted">${[esc(W.name),R.reps.length?`${R.reps.length} reps`:R.hold?`${R.hold.sec} s hold`:"",tr.cut?"first 30 s":"",R.view?`${R.view} view`:""].filter(Boolean).join(" · ")}</p>
      <div class="fc-replay"><video playsinline muted controls preload="auto" src="${tr.url}"></video><canvas aria-hidden="true"></canvas></div>
      <p class="small muted">Play it back with your skeleton drawn on. Tap a rep or a note to jump to it.</p>`+formResultHtml(R,true)+
      `<div class="row" style="margin-top:12px"><button type="button" class="btn ghost" data-xs="formagain">Check another video</button><button type="button" class="link small" data-xs="formchat">Ask your coach about it</button></div>
      <p class="small muted">Measured from a single camera, so treat it as a guide. Sharp pain means stop and get it looked at.</p>` }
  const past=formChecks().filter(x=>x.ex===W.ex).slice(-3).reverse();
  return head+`<div class="field"><label>Exercise</label><select data-xs-fex="1">${list.map(([id,n])=>`<option value="${esc(id)}" ${id===W.ex?"selected":""}>${esc(n)}</option>`).join("")}</select></div>
    <label class="btn fc-pick">${FORM_ICON} Record or choose a video<input type="file" accept="video/*" data-xs-fvid="1" hidden></label>${err}
    <ul class="fc-tips small"><li><b>Filming:</b> ${esc(FORM_TIPS[pat]||FORM_TIPS.basic)}</li><li>One set of 2–5 reps is plenty. Clips over 30 s use the first 30.</li><li>Everything runs on your phone: free, private, and it works offline.</li></ul>
    ${pat==="basic"?`<p class="small muted">For this exercise you'll get reps, tempo and range of motion. Detailed technique checks cover squats, deadlifts and RDLs, lunges, presses, rows, pull-ups, curls, triceps, raises and planks.</p>`:""}
    ${past.length?`<h3>Past checks</h3>${past.map(x=>`<details class="logger"><summary>${fmtShort(parseYmd(x.d))} · ${FORM_VERDICT[x.verdict][0]}</summary>${formResultHtml({...x,reps:[]},false)}</details>`).join("")}`:""}` }
document.addEventListener("click",e=>{ const el=e.target.closest&&e.target.closest("[data-xs-fseek]"); if(el&&SH&&SH.kind==="form"&&SH.seek) SH.seek(Number(el.dataset.xsFseek)) });
// replay: draw the tracked skeleton over the video as it plays
function formMountReplay(){ const W=SH; if(!W||W.kind!=="form"||W.step!=="result") return;
  const box=document.querySelector("#xsheet .fc-replay"); if(!box||box.dataset.on) return; box.dataset.on="1";
  const v=box.querySelector("video"), cv=box.querySelector("canvas"), ctx=cv.getContext("2d"), tr=W.track, fr=tr.frames;
  const draw=()=>{ const w=v.clientWidth, h=v.clientHeight; if(!w) return; const dpr=window.devicePixelRatio||1; if(cv.width!==Math.round(w*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr) }
    ctx.clearRect(0,0,cv.width,cv.height); const s=Math.min(w/tr.W,h/tr.H)*dpr, ox=(cv.width-tr.W*s)/2, oy=(cv.height-tr.H*s)/2;
    const i=Math.max(0,Math.min(fr.length-1,Math.round(v.currentTime*FC.FPS))); ctx.save(); ctx.translate(ox,oy); FC.drawSkeleton(ctx,fr[i]&&fr[i].lm,s,W.res.side,"#7DE3FF"); ctx.restore() };
  let raf=0; const loop=()=>{ draw(); if(!v.paused&&!v.ended) raf=requestAnimationFrame(loop) };
  v.addEventListener("play",()=>{ cancelAnimationFrame(raf); loop() }); ["seeked","loadeddata","pause"].forEach(ev=>v.addEventListener(ev,draw)); window.addEventListener("resize",draw);
  W.seek=t=>{ v.pause(); v.currentTime=Math.max(0,t); box.scrollIntoView({block:"nearest",behavior:"smooth"}) };
  setTimeout(draw,60) }

/* ======================= Auto-generated food plan =======================
   The person gives calories, protein, what they want the food to be like, what to leave out and a weekly budget.
   Claude writes the recipes using only foods from the built-in database (so every macro is computed here, not
   guessed), plus a priced shopping list. The app checks every ingredient, enforces allergies, and scales portions
   to the calorie goal before anything is saved. */
const AVOID_GROUPS=[
  {g:"Protein sources",items:[["chicken","Chicken"],["turkey","Turkey"],["beef","Beef"],["pork","Pork"],["fish","Fish"],["shellfish","Shellfish"],["eggs","Eggs"],["dairy","Milk & dairy"],["soy","Tofu & soy"],["beans","Beans & lentils"],["whey","Protein powder"]]},
  {g:"Common allergens",items:[["dairy","Milk"],["eggs","Eggs"],["peanuts","Peanuts"],["treenuts","Tree nuts"],["gluten","Wheat & gluten"],["soy","Soy"],["fish","Fish"],["shellfish","Shellfish"],["sesame","Sesame"]]},
  {g:"Other",items:[["mushrooms","Mushrooms"],["onion","Onion & garlic"],["spicy","Spicy food"]]}];
const AVOID_FOODS={chicken:["chkbr","chkbrc","chkth","rotis"],turkey:["turk93","turkdeli"],beef:["beef90","beef80","sirloin"],pork:["porkten","bacon","ham"],
  fish:["salmon","tuna","tilapia","cod"],shellfish:["shrimp"],eggs:["egg","eggwh","mayo","mayol","ranch"],
  dairy:["whey","gyog0","gyog2","cott1","milk2","milkw","milks","cheddar","mozz","parm","feta","butter","crmchs","pesto","ranch","pizza","darkchoc","protbar"],
  soy:["tofu","tempeh","soy","protbar"],beans:["blkbean","chickpea","lentil","kidney","hummus"],whey:["whey","protbar"],peanuts:["pb","peanut","protbar"],
  treenuts:["almmilk","almbut","almond","walnut","cashew","pesto"],gluten:["pastad","pastac","breadww","breadw","bagel","bun","tortf","cous","granola","cereal","oats","pizza","beer","soy","protbar"],
  sesame:["hummus"],mushrooms:["mushroom"],onion:["onion","garlic"],spicy:["hotsauce","salsa"]};
// words that give an allergen away in a recipe name or method, even when it isn't a listed ingredient
const AVOID_WORDS={chicken:/chicken/i,turkey:/turkey/i,beef:/\bbeef|steak|sirloin/i,pork:/\bpork|bacon|\bham\b|sausage/i,fish:/\bfish|salmon|tuna|tilapia|\bcod\b|anchov/i,shellfish:/shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster/i,
  eggs:/\beggs?\b|mayo|aioli/i,dairy:/\bmilk|cheese|yogh?urt|butter|cream|parmesan|whey|ghee/i,soy:/\bsoy|tofu|tempeh|edamame|miso|tamari/i,beans:/\bbeans?\b|lentil|chickpea|hummus/i,whey:/whey|protein powder/i,
  peanuts:/peanut/i,treenuts:/almond|walnut|cashew|pecan|pistachio|hazelnut|pine nut|macadamia|pesto/i,gluten:/wheat|flour|bread|pasta|noodle|tortilla|couscous|barley|\brye\b|soy sauce|bagel|\bbun\b|panko|breadcrumb/i,
  sesame:/sesame|tahini/i,mushrooms:/mushroom/i,onion:/onion|garlic|shallot|scallion|leek/i,spicy:/spicy|chili|chilli|jalape|cayenne|sriracha|hot sauce|red pepper flakes/i};
const GEN_STYLES=[["taste","Taste-focused"],["easy","Easy to cook"],["quick","Quick, under 30 min"],["batch","Meal prep in batches"],["cheap","Budget-friendly"],["variety","Lots of variety"],["few","Few ingredients"],["comfort","Comfort food"],["light","Fresh & light"]];
const GEN_SLOT_NAMES={b:"Breakfast",l:"Lunch",d:"Dinner",s:"Snacks"};
function genDefaults(){ const K=kitchen(), g=foodGoals(), p=K.genPrefs||{};
  return {kcal:g.kcal,protein:g.p,desc:p.desc||"",styles:p.styles||["easy","batch"],cook:p.cook||"batch",budget:p.budget||"",avoid:{...(p.avoid||{})},slots:p.slots||{b:1,l:1,d:1,s:1}} }
function genAvoidIds(avoid){ const ids=new Set(); Object.keys(avoid||{}).forEach(k=>(AVOID_FOODS[k]||[]).forEach(id=>ids.add(id))); return ids }
function genCatalog(avoid){ const bad=genAvoidIds(avoid);
  return FOOD_RAW.filter(([id])=>!bad.has(id)&&!["beer","cola","gator","pizza","fries","coffee"].includes(id)).map(([id,n,k,p,c,f,sv])=>`${id} | ${n} | ${k} kcal, ${p} P, ${c} C, ${f} F per 100 g | units: g, oz, lb${(sv||[]).map(s=>", "+s[0]).join("")}`).join("\n") }
function genLabel(k){ for(const G of AVOID_GROUPS){ const x=G.items.find(i=>i[0]===k); if(x) return x[1] } return k }
function genPrompt(f){
  const slots=Object.keys(GEN_SLOT_NAMES).filter(s=>f.slots[s]).map(s=>GEN_SLOT_NAMES[s]).join(", ");
  const allergic=Object.entries(f.avoid).filter(([,v])=>v==="allergy").map(([k])=>genLabel(k)), avoid=Object.entries(f.avoid).filter(([,v])=>v==="avoid").map(([k])=>genLabel(k));
  const styles=f.styles.map(s=>(GEN_STYLES.find(x=>x[0]===s)||[])[1]).filter(Boolean);
  return `Task: generate a weekly food plan for a fitness app user.
Targets per day: ${f.kcal} kcal and at least ${f.protein} g protein (land within 5% of the calories).
Meals to cover: ${slots}.
What they want: ${styles.join(", ")||"no preference"}.${f.desc?` In their words: "${String(f.desc).slice(0,400)}"`:""}
Cooking: ${f.cook==="daily"?"they cook most days, so smaller recipes (2–4 servings) and more variety":"they batch cook once or twice a week, so big recipes that keep in the fridge or freezer"}.
${f.budget?`Weekly grocery budget: $${f.budget} (US prices). Stay within it; if that's impossible for these targets, get as close as you can and say so in the summary.`:"No set budget; keep it reasonable."}
${allergic.length?`ALLERGIES (strict, including hidden sources like sauces, pesto, breading, seasonings and anything in the method): ${allergic.join(", ")}.`:""}
${avoid.length?`Don't use (dislikes or choices): ${avoid.join(", ")}.`:""}
Use ONLY these foods for ingredients (id | name | macros | units). Herbs, spices, salt, pepper, vinegar, lemon juice and cooking spray can appear in methods without being listed, as long as they don't break the allergies.
${genCatalog(f.avoid)}

Reply with JSON only, in exactly this shape:
{"summary":"1–2 sentences on the plan","recipes":[{"name":"","slot":"b|l|d|s","servings":7,"perDay":1,"when":"about 40 min · makes 7","items":[{"f":"chkbr","amt":4,"unit":"lb"}],"method":"one step per line, with temperatures and times","store":"how to store and reheat","costPerBatch":12.5}],"shopping":[{"name":"Chicken breast","amt":4,"unit":"lb","price":12.0}],"weeklyCost":78}
Rules:
- 3 to 6 recipes. servings = portions one batch makes; perDay = portions eaten per day (0.5 steps). A week needs perDay × 7 portions, so size batches for that.
- Each item's unit must be g, oz, lb, or one of that food's listed units, written exactly.
- Work out the macros from the per-100 g numbers so the day (sum of perDay × one portion of each recipe) hits the targets.
- shopping = one week of groceries in store package sizes, units from: oz, lb, g, kg, fl oz, ml, l, count. price = typical US price in dollars. weeklyCost = the total.`;
}
const genRound=(v,u)=>u==="g"?Math.max(5,Math.round(v/5)*5):u==="lb"?Math.max(0.25,Math.round(v*4)/4):Math.max(0.5,Math.round(v*2)/2);
function genUnit(food,unit){ const units=unitsOf(food).map(x=>x[0]); unit=String(unit||"").trim(); if(units.includes(unit)) return unit;
  const lo=unit.toLowerCase(), hit=units.find(u=>u.toLowerCase()===lo||u.toLowerCase().replace(/^1 /,"")===lo.replace(/^1 /,"")); return hit||null }
// Check, clean and fit Claude's plan. Returns everything the preview and "Use this plan" need.
function genBuild(res,f){
  const bad=genAvoidIds(f.avoid), allergy=Object.keys(f.avoid).filter(k=>f.avoid[k]==="allergy"), warn=[], recipes=[];
  (Array.isArray(res&&res.recipes)?res.recipes:[]).slice(0,8).forEach(r=>{
    const name=String(r&&r.name||"").trim().slice(0,80); if(!name) return;
    const text=name+" "+String(r.method||"");
    const hit=allergy.find(k=>AVOID_WORDS[k]&&AVOID_WORDS[k].test(text)); if(hit){ warn.push(`Left out "${name}": it mentions ${genLabel(hit).toLowerCase()}.`); return }
    const items=[]; (Array.isArray(r.items)?r.items:[]).forEach(it=>{ const food=FOOD_RAW.find(x=>x[0]===it.f); const amt=Number(it.amt);
      if(!food||!(amt>0)){ return } if(bad.has(it.f)){ warn.push(`Took ${food[1].toLowerCase()} out of "${name}".`); return }
      const F=foodById(it.f), u=genUnit(F,it.unit); if(!u){ warn.push(`Skipped an ingredient in "${name}" with an unknown amount.`); return }
      items.push({f:it.f,amt:+amt.toFixed(2),unit:u}) });
    if(!items.length) return;
    const soft=Object.keys(f.avoid).filter(k=>f.avoid[k]==="avoid").find(k=>AVOID_WORDS[k]&&AVOID_WORDS[k].test(text)); if(soft) warn.push(`"${name}" mentions ${genLabel(soft).toLowerCase()}: check the method.`);
    const slot=GEN_SLOT_NAMES[r.slot]? r.slot : "l";
    recipes.push({name,slot,servings:Math.max(1,Math.min(30,Math.round(Number(r.servings)||1))),perDay:Math.max(0.5,Math.min(4,Math.round((Number(r.perDay)||1)*2)/2)),
      when:String(r.when||"").slice(0,60),method:String(r.method||"").slice(0,3000),store:String(r.store||"").slice(0,600),cost:Number(r.costPerBatch)>0?+Number(r.costPerBatch).toFixed(2):null,items}) });
  const dayOf=()=>recipes.reduce((t,r)=>{ const T=recipeTotals(r,true).per; return {kcal:t.kcal+T.kcal*r.perDay,p:t.p+T.p*r.perDay,c:t.c+T.c*r.perDay,f:t.f+T.f*r.perDay} },{kcal:0,p:0,c:0,f:0});
  let day=dayOf(), scale=1;
  // fit portions to the calorie goal when Claude's maths is off by more than 7%
  if(recipes.length&&day.kcal>0&&Math.abs(f.kcal/day.kcal-1)>0.07){ scale=Math.max(0.6,Math.min(1.8,f.kcal/day.kcal));
    recipes.forEach(r=>r.items.forEach(it=>{ it.amt=genRound(it.amt*scale,it.unit) })); day=dayOf();
    warn.push(`Portions ${scale>1?"scaled up":"scaled down"} ${Math.round(Math.abs(scale-1)*100)}% to fit your calories. Go by the ingredient amounts listed; the method may still show the old ones.`) }
  const shop=[]; (Array.isArray(res&&res.shopping)?res.shopping:[]).slice(0,60).forEach(x=>{ const n=String(x&&x.name||"").trim().slice(0,80); if(!n) return;
    const unit=G_UNITS.includes(x.unit)?x.unit:"", amt=Number(x.amt)>0? (scale!==1&&unit&&unit!=="count"? genRound(Number(x.amt)*scale,unit==="lb"?"lb":"x") : Number(x.amt)) : null;
    const price=Number(x.price)>0? +(Number(x.price)*(scale!==1&&unit&&unit!=="count"?scale:1)).toFixed(2) : null;
    if(allergy.some(k=>AVOID_WORDS[k]&&AVOID_WORDS[k].test(n))){ warn.push(`Removed "${n}" from the shopping list.`); return }
    shop.push({name:n,amt,unit:amt?unit:"",price}) });
  const cost=shop.reduce((t,x)=>t+(x.price||0),0);
  if(f.budget&&cost>Number(f.budget)*1.02) warn.push(`Estimated $${Math.round(cost)} a week, over your $${f.budget} budget.`);
  if(recipes.length&&day.p<f.protein*0.9) warn.push(`About ${Math.round(day.p)} g protein a day, below your ${f.protein} g goal.`);
  return {summary:String(res&&res.summary||"").slice(0,400),recipes,shop,day,cost,scale,warn} }
function genStart(){ openSheet({kind:"autogen",step:"form",f:genDefaults()}) }
async function genRun(){ const W=SH, f=W.f;
  if(!(f.kcal>=1200&&f.kcal<=5000)){ toast("Enter daily calories between 1,200 and 5,000"); return } if(!(f.protein>=30&&f.protein<=400)){ toast("Enter a protein goal in grams"); return }
  if(!Object.values(f.slots).some(Boolean)){ toast("Pick at least one meal"); return }
  if(!sampleFn){ W.step="error"; W.err="The planner needs a connection to your coach. Check that you're online and signed in."; paintSheet(true); return }
  const K=kitchen(); K.genPrefs={desc:f.desc,styles:f.styles,cook:f.cook,budget:f.budget,avoid:f.avoid,slots:f.slots}; saveProfile();
  W.step="busy"; W.prog=0; paintSheet(true);
  try{ const res=await sampleFn.json(genPrompt(f),{cache:false,maxTokens:9000,onProgress:({text})=>{ if(SH!==W) return; W.prog=Math.min(97,Math.round(text.length/70)); const el=document.querySelector("[data-gen-prog]"); if(el) el.style.width=W.prog+"%" }});
    if(SH!==W) return; const B=genBuild(res,f); if(!B.recipes.length) throw Object.assign(new Error("empty"),{code:"empty"});
    W.res=B; W.step="result"; paintSheet(true) }
  catch(e){ if(SH!==W) return; W.step="error"; W.err= e&&e.code==="rate_limited"? "You've hit today's coach limit. Try again tomorrow." : e&&e.code==="truncated"? "The plan came back too long. Try again, maybe with fewer meals." : "Couldn't make a plan this time. Try again."; paintSheet(true) } }
function genApply(mode){ const W=SH, B=W.res, f=W.f, K=kitchen(), stamp=Date.now();
  if(mode==="replace"){ const old=new Set(K.recipes.filter(r=>r.gen).map(r=>r.id)); K.recipes=K.recipes.filter(r=>!old.has(r.id)); SLOTS.forEach(([sk])=>K.plan[sk]=[]) }
  B.recipes.forEach(r=>{ const id=newId("rc"); K.recipes.push({id,name:r.name,servings:r.servings,items:r.items,method:r.method,store:r.store,when:r.when,gen:stamp});
    (K.plan[r.slot]=K.plan[r.slot]||[]).push({t:"r",id,qty:r.perDay}) });
  if(B.shop.length){ const lid=newId("l"), list={id:lid,name:"Weekly groceries",gen:stamp,items:B.shop.map(x=>({id:newId("i"),name:x.name,amt:x.amt,unit:x.unit,note:x.price?`≈ $${x.price.toFixed(2)}`:""})),steps:[]};
    if(!K.shop||!K.shop.lists||!K.shop.lists.length) K.shop={day:0,start:ymd(nextShopDay({day:0})),cycle:[lid],lists:[list]};
    else { const gone=new Set(K.shop.lists.filter(l=>l.gen).map(l=>l.id)); K.shop.lists=[...K.shop.lists.filter(l=>!gone.has(l.id)),list];
      K.shop.cycle=(K.shop.cycle||[]).map(id=>gone.has(id)?lid:id); if(!K.shop.cycle.includes(lid)&&!K.shop.cycle.length) K.shop.cycle=[lid] } }
  K.genHide=1; const su=S.profile.setup; su.food={...(su.food||{}),kcal:Math.round(f.kcal),protein:Math.round(f.protein)}; su.kcal=Math.round(f.kcal); su.at=Date.now();
  xsClose(); commitPlan(); toast(mode==="replace"?"Your new food plan is ready":"Meals added to your plan") }
function autogenHtml(){ const W=SH, f=W.f;
  const head=`<div class="xs-head"><h2>Auto-generate food plan</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>`;
  if(W.step==="busy") return head+`<div class="gen-busy"><div class="gen-spin" aria-hidden="true"></div><b>Planning your week…</b><p class="small muted">Picking recipes, working out portions for ${fmtN(f.kcal)} kcal and ${f.protein} g protein, and pricing the groceries. About 30–60 seconds.</p><div class="rk-bar"><i data-gen-prog style="width:${W.prog||0}%;background:var(--food)"></i></div></div>`;
  if(W.step==="error") return head+`<p class="note">${esc(W.err||"Something went wrong.")}</p><div class="row"><button type="button" class="btn" data-xs="genrun">Try again</button><button type="button" class="btn ghost" data-xs="genform">Change my answers</button></div>`;
  if(W.step==="result"){ const B=W.res, has=kitchen().recipes.length||SLOTS.some(([sk])=>(kitchen().plan[sk]||[]).length);
    const bySlot=Object.keys(GEN_SLOT_NAMES).map(s=>B.recipes.filter(r=>r.slot===s).map(r=>{ const T=recipeTotals(r,true).per; return `<div class="gen-rec"><span class="eyebrow">${GEN_SLOT_NAMES[s]}${r.perDay!==1?` · ${fmtQ(r.perDay)} servings a day`:""}</span><b>${esc(r.name)}</b><span class="small muted num">${fmtN(T.kcal)} kcal · ${Math.round(T.p)} g protein a serving · ${/makes/i.test(r.when)?"":`makes ${r.servings}`}${r.when?`${/makes/i.test(r.when)?"":" · "}${esc(r.when)}`:""}</span></div>` }).join("")).join("");
    return head+(B.summary?`<p class="small">${esc(B.summary)}</p>`:"")+
      `<div class="gen-tot num"><div><b>${fmtN(B.day.kcal)}</b><span>of ${fmtN(f.kcal)} kcal</span></div><div><b>${Math.round(B.day.p)} g</b><span>of ${f.protein} g protein</span></div><div><b>${B.cost?`$${Math.round(B.cost)}`:"–"}</b><span>${f.budget?`of $${f.budget} a week`:"a week, est."}</span></div></div>`+
      `<div class="stack" style="gap:8px">${bySlot}</div>`+
      (B.warn.length?`<div class="note gen-warn">${B.warn.map(w=>`<div>${esc(w)}</div>`).join("")}</div>`:"")+
      `<p class="small muted">${B.shop.length} items on the shopping list. Prices are estimates, and every recipe and amount can be edited after.</p>`+
      `<div class="row">${has?`<button type="button" class="btn" data-xs="genuse" data-mode="replace">Replace my meal plan</button><button type="button" class="btn ghost" data-xs="genuse" data-mode="add">Add to my plan</button>`:`<button type="button" class="btn" data-xs="genuse" data-mode="replace">Use this plan</button>`}</div>
      <div class="row"><button type="button" class="link small" data-xs="genrun">Make a different one</button><button type="button" class="link small" data-xs="genform">Change my answers</button></div>` }
  const chip=(k,l)=>{ const v=f.avoid[k]; return `<button type="button" class="gen-chip ${v||""}" data-xs-gavoid="${k}" aria-pressed="${!!v}">${esc(l)}${v==="allergy"?" · allergic":v==="avoid"?" · no":""}</button>` };
  return head+`<p class="small muted">Tell it what you're after and it writes the recipes, portions and a priced shopping list. You can edit everything after.</p>
    <div class="row"><div class="field"><label>Calories a day</label><input inputmode="numeric" data-xs-gf="kcal" value="${esc(f.kcal)}" data-xs-focus="gkcal"></div><div class="field"><label>Protein (g)</label><input inputmode="numeric" data-xs-gf="protein" value="${esc(f.protein)}" data-xs-focus="gprot"></div></div>
    <h3>What should it be like?</h3><div class="gen-chips">${GEN_STYLES.map(([k,l])=>`<button type="button" class="gen-chip ${f.styles.includes(k)?"on":""}" data-xs-gstyle="${k}" aria-pressed="${f.styles.includes(k)}">${esc(l)}</button>`).join("")}</div>
    <div class="field"><label>Anything else? <span class="muted">(optional)</span></label><textarea data-xs-gf="desc" rows="2" placeholder="e.g. I love Mexican and Asian flavors, hate soggy food, want something sweet after dinner" data-xs-focus="gdesc">${esc(f.desc)}</textarea></div>
    <h3>Cooking</h3><div class="seg two"><button type="button" class="${f.cook==="batch"?"on":""}" data-xs-gcook="batch">Batch cook 1–2× a week</button><button type="button" class="${f.cook==="daily"?"on":""}" data-xs-gcook="daily">Cook most days</button></div>
    <h3>Meals to plan</h3><div class="gen-chips">${Object.entries(GEN_SLOT_NAMES).map(([k,l])=>`<button type="button" class="gen-chip ${f.slots[k]?"on":""}" data-xs-gslot="${k}" aria-pressed="${!!f.slots[k]}">${l}</button>`).join("")}</div>
    <h3>Leave out</h3><p class="small muted">Tap once for <b>don't want</b> (dislikes or choices), twice for <b>allergic</b> (also kept out of sauces and seasonings), three times to clear.</p>
    ${AVOID_GROUPS.map(G=>`<div class="eyebrow" style="margin-top:6px">${esc(G.g)}</div><div class="gen-chips">${G.items.map(([k,l])=>chip(k,l)).join("")}</div>`).join("")}
    <h3>Weekly grocery budget <span class="muted small">(optional)</span></h3><div class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><span style="font-weight:700">$</span><input class="xs-search" inputmode="numeric" data-xs-gf="budget" value="${esc(f.budget)}" placeholder="e.g. 80" data-xs-focus="gbud" style="max-width:140px"><span class="small muted">a week</span></div>
    <p class="small muted">Not medical or dietary advice. With a serious allergy, always check labels.</p>
    <button type="button" class="btn" data-xs="genrun" style="width:100%;margin-top:6px">Generate my plan</button>` }
function genCard(K){
  if(K.genHide||K.recipes.length||SLOTS.some(([sk])=>(K.plan[sk]||[]).length)) return "";
  return `<div class="card gen-card"><div class="eyebrow">Get started</div><h2>Your food plan</h2>
    <p class="small">Set your goals and what you like, and get a week of recipes, portions and a priced shopping list made for you. Or build it yourself below.</p>
    <div class="row"><button type="button" class="btn" data-c-autogen="1">Auto-generate food plan</button><button type="button" class="link small" data-c-genhide="1">I'll set it up myself</button></div></div>` }

function customFoodView(){
  const K=kitchen(), g=foodGoals(), su=CUSTOM.su;
  let h=genCard(K)+`<div class="card"><h2>Daily goals</h2><div class="row">${[["kcal","Calories",g.kcal],["protein","Protein g",g.p],["carbs","Carbs g",g.c],["fat","Fat g",g.f]].map(([k,l,v])=>`<div class="field"><label>${l}</label><input inputmode="numeric" data-c-goal="${k}" value="${v}"></div>`).join("")}</div>
   <p class="small muted">Carbs fill whatever calories protein and fat leave, unless you set them.</p></div>`;
  // My meals
  h+=`<div class="card"><div class="row between"><h2>My meals</h2><span class="row" style="gap:6px;flex-wrap:nowrap"><button type="button" class="btn ghost sm" data-c-autogen="1">Auto-generate</button><button type="button" class="btn sm" data-c-rec="">+ New meal</button></span></div>`;
  h+= K.recipes.length? K.recipes.map(r=>{const T=recipeTotals(r); return `<div class="recwrap"><button type="button" class="dayline rec" data-c-rec="${r.id}"><span class="txt"><b>${esc(r.name)}</b><br><span class="small muted num">${T.n} serving${T.n===1?"":"s"} · ${fmtN(T.per.kcal)} kcal · ${Math.round(T.per.p)} g P · ${Math.round(T.per.c)} g C · ${Math.round(T.per.f)} g F each</span>${recipeScales(r).length?`<span class="chip food adjchip">Adjusted to your packages</span>`:""}</span></button>${recipeMethod(r)}</div>`}).join("")
     : `<p class="small muted">Build your meal prep: add every ingredient in the batch and how many servings it makes. The app works out macros per serving.</p>`;
  h+=`</div>`;
  // Meal plan
  let day={...ZERO};
  h+=`<div class="card"><h2>Meal plan</h2><p class="small muted">What you plan to eat each day. One tap logs it in your diary, and it builds your grocery list.</p>`;
  SLOTS.forEach(([sk,sn])=>{ const its=K.plan[sk]||[];
    h+=`<div class="slot"><div class="row between"><b>${sn}</b><button type="button" class="link small" data-c-padd="${sk}">+ Add</button></div>`;
    its.forEach((e,i)=>{const M=entryMacros(e); if(!M) return; day=addM(day,M.m); h+=`<div class="extra"><span>${esc(M.name)} <span class="muted small num">· ${esc(M.amount)} · ${fmtN(M.m.kcal)} kcal</span></span><button type="button" data-c-prm="${sk}|${i}" aria-label="Remove">×</button></div>`});
    h+=`</div>`});
  const gap=g.kcal-day.kcal, short=day.kcal>0&&gap>g.kcal*0.15;
  h+=`<div class="note num"><b>Planned per day:</b> ${fmtN(day.kcal)} of ${fmtN(g.kcal)} kcal · ${Math.round(day.p)} of ${g.p} g protein · ${Math.round(day.c)} g carbs · ${Math.round(day.f)} g fat${short?`<br><span class="small">About ${fmtN(Math.round(gap/50)*50)} kcal short of your goal: add a snack or an extra serving with + Add.</span>`:""}</div></div>`;
  const gl=groceryList(), hasLists=!!(K.shop&&K.shop.lists&&K.shop.lists.length);
  if(hasLists){ h+=shopCard(K);
    if(gl.length) h+=`<details class="card needs"><summary><b>What your meal plan uses</b> <span class="small muted">· 7 days, for checking your lists</span></summary>${gl.map(x=>shopRow("f:"+x.id,x.id,x.n,x.qty,{q:x.gr,u:"g"})).join("")}</details>` }
  else { // one Shopping card: the list your meal plan makes, and the option to keep your own lists
    h+=`<div class="card shop"><div class="row between"><h2>Shopping</h2>${gl.length?'<span class="chip">7 days</span>':""}</div>`;
    h+= gl.length? `<p class="small muted">Everything your meal plan uses in a week.</p>${storeBar()}${gl.map(x=>shopRow("f:"+x.id,x.id,x.n,x.qty,{q:x.gr,u:"g"})).join("")}<button type="button" class="link small" data-c-groclr="1">Uncheck all</button>
      <p class="small muted" style="margin-top:10px">Want to add other things, or shop on a rotation (like a big shop one week and a quick one the next)? Save it as your own list.</p>
      <div class="row"><button type="button" class="btn sm" data-c-shopfromplan="1">Save as my list</button><button type="button" class="btn ghost sm" data-c-shoplist="">+ New list</button></div>`
      : `<p class="small muted">Add meals to your plan and your shopping list fills in by itself. Or make your own lists and put them on a weekly rotation.</p><div class="row"><button type="button" class="btn ghost sm" data-c-shoplist="">+ New list</button></div>`;
    h+=`</div>` }
  // Custom foods
  h+=`<div class="card"><div class="row between"><h2>My foods</h2><button type="button" class="btn ghost sm" data-c-cf="">+ New food</button></div>`;
  h+= K.foods.length? K.foods.map(f=>`<button type="button" class="dayline" data-c-cf="${f.id}"><span class="txt"><b>${esc(f.n)}</b> <span class="small muted num">${esc(f.serving)} · ${fmtN(f.k)} kcal · ${f.p} g P</span></span></button>`).join("") : `<p class="small muted">Add packaged foods from their nutrition label.</p>`;
  return h+`</div>`;
}
function groceryList(){ const K=kitchen(), g={};
  const add=(f,grams)=>{ if(!f) return; g[f.id]=(g[f.id]||0)+grams };
  SLOTS.forEach(([sk])=>(K.plan[sk]||[]).forEach(e=>{
    if(e.t==="r"){ const r=K.recipes.find(x=>x.id===e.id); if(!r) return; const n=Math.max(1,Number(r.servings)||1);
      (r.items||[]).forEach(it=>{const f=foodById(it.f); add(f,gramsOf(f,it.amt,it.unit)*(Number(e.qty)||0)/n*7)}) }
    else { const f=foodById(e.id); add(f,gramsOf(f,e.amt,e.unit)*7) } }));
  return Object.entries(g).map(([id,gr])=>{ const f=foodById(id); let qty;
    if(f.custom) qty=`${fmtQ(Math.round(gr/100*10)/10)} × ${f.serving||"serving"}`;
    else { const each=f.sv.find(([l])=>/^1 (large|medium|bagel|bun|tortilla|avocado|clove|cake|bar|can|block|package|fillet|breast|thigh|steak|bottle)/.test(l));
      qty= each? `${Math.ceil(gr/each[1]-0.05)} × ${each[0].replace(/^1 /,"")}` : gr>=454? `${(gr/453.6).toFixed(1)} lb` : `${Math.ceil(gr/28.35)} oz` }
    return {id,n:f.n,qty,gr} }).sort((a,b)=>a.n.localeCompare(b.n));
}


/* ======================= 3-meal batch plan (Oct 26, 2026) ======================= */
// Three meals that batch-cook and freeze: burritos, pesto chicken bowls, turkey bolognese with protein pasta.
// Week A (big cook, every other Sunday) makes everything; Week B only makes the chicken bowls.
const BATCH3={
  foods:[{id:"cfPP",n:"Protein pasta, dry (e.g. Barilla Protein+)",serving:"2 oz (56 g)",k:190,p:10,c:38,f:1.5}],
  recipes:[
    {id:"rcBur",name:"Turkey & egg burritos (batch)",servings:14,
      items:[{f:"turk93",amt:2.5,unit:"1 lb"},{f:"egg",amt:14,unit:"1 large egg"},{f:"eggwh",amt:850,unit:"g"},{f:"tortf",amt:1008,unit:"g"},{f:"cheddar",amt:98,unit:"g"},{f:"salsa",amt:14,unit:"2 tbsp"}],
      when:"Week A · about 45 min · makes 14",
      method:`Mix the seasoning: 2 tsp salt, 1 tsp pepper, 2 tsp garlic powder, 2 tsp smoked paprika, 1 tsp dried sage, ½ tsp chili flakes.
Brown 2.5 lb ground turkey in a large nonstick pan over medium-high, 8–10 min, breaking it up. Stir in the seasoning and tip it into a big bowl.
Whisk 14 eggs with 3½ cups liquid egg whites and a pinch of salt. Scramble in the same pan over medium-low, stirring slowly. Take them off while still a little wet: they finish cooking when you reheat.
Fold the eggs into the turkey. Let the filling cool 10 minutes so the tortillas don't steam and tear.
Warm the 10-inch tortillas 15 seconds in the microwave so they bend without cracking.
Lay ¾ cup filling in a line on each tortilla and top with 1 tbsp shredded cheese. Fold in the sides, then roll tight away from you.
Wrap each burrito in foil and freeze flat in gallon bags, labeled with the date. Keep salsa in the fridge and add it when you eat (2 tbsp each).`,
      store:`Freezer up to 2 months. Reheat: take off the foil, wrap in a damp paper towel and microwave 2–2½ min, flipping halfway, then rest 1 min. Air fryer: 350 °F for 12–14 min from frozen, still in foil for the first 8 min.`},
    {id:"rcPes",name:"Pesto chicken rice bowls (batch)",servings:7,
      items:[{f:"chkbr",amt:4,unit:"lb"},{f:"ricewd",amt:6,unit:"¼ cup"},{f:"broc",amt:14,unit:"1 cup"},{f:"pesto",amt:9,unit:"1 tbsp"}],
      when:"Every Sunday · about 40 min · makes 7",
      method:`Heat the oven to 425 °F and line a sheet pan with foil.
Pat 4 lb chicken breasts dry. Slice any piece thicker than an inch in half horizontally so everything cooks evenly.
Rub with 2 tbsp pesto (2 thawed cubes), 1½ tsp salt and ½ tsp pepper. Spread out on the pan.
Bake 18–22 min, until the thickest piece reads 160 °F. Rest 10 min (it climbs to 165 °F), then slice.
While it bakes, rinse 1½ cups rice. Bring it to a boil with 2¼ cups water and ½ tsp salt, cover, cook on the lowest heat 15 min, then off the heat 10 min. Fluff and spread on a tray to cool.
Split the chicken and rice across 7 containers (about ¾ cup rice each) with 1 tbsp pesto on top.
Keep 2 cups frozen broccoli per bowl in the freezer bag until you eat.`,
      store:`Fridge 4 days, so freeze 3 bowls for Thu–Sat and move one to the fridge the night before. Reheat: add 2 cups frozen broccoli, cover, microwave 3–4 min, stirring halfway.`},
    {id:"rcBol",name:"Turkey bolognese with protein pasta (batch)",servings:14,
      items:[{f:"turk93",amt:6,unit:"1 lb"},{f:"onion",amt:2,unit:"1 medium"},{f:"carrot",amt:2,unit:"1 medium"},{f:"garlic",amt:6,unit:"1 clove"},{f:"crtom",amt:9.8,unit:"1 cup"},{f:"tompaste",amt:170,unit:"g"},{f:"spinach",amt:14,unit:"1 cup"},{f:"cfPP",amt:14,unit:"2 oz (56 g)"}],
      when:"Week A · about 50 min, mostly simmering · makes 14",
      method:`Finely chop 2 onions and 2 carrots (a few pulses in a food processor works) and mince 6 garlic cloves.
In your biggest pot (7 qt or more) over medium-high, brown 6 lb ground turkey in two batches with 1 tsp salt each, 8–10 min per batch, breaking it up. Keep the first batch in a bowl while you do the second.
Put all the turkey back. Add the onion and carrot and cook 6–8 min until soft, then the garlic for 1 min.
Stir in a 6 oz can of tomato paste and cook 2 min until it darkens.
Add 3 × 28 oz cans crushed tomatoes, 2 tbsp Italian seasoning, 1 tsp salt, ½ tsp pepper and 1 tbsp balsamic vinegar. Bring to a simmer.
Simmer uncovered 30 min, stirring every 5–10 min, until thick. Stir in 14 cups spinach for the last 2 min (it wilts down to almost nothing).
Cool 20 min, then portion into 14 containers (about 1½ cups each).
Pasta, per dinner: boil 2 oz protein pasta in salted water for the time on the box (about 10 min). Or cook 7 portions on Sunday, toss with 1 tsp oil and keep in the fridge up to 4 days.`,
      store:`4 portions in the fridge (4 days), 10 in the freezer (3 months). Reheat sauce from frozen 4–5 min in the microwave, stirring halfway (2–3 min if thawed overnight), then toss with the pasta.`}
  ],
  plan:{b:[{t:"r",id:"rcBur",qty:1}],l:[{t:"r",id:"rcPes",qty:1}],d:[{t:"r",id:"rcBol",qty:1}],s:[]},
  prep:{start:"2026-11-01",
    weeks:[
      {name:"Week A: big cook",time:"about 2½ hours",steps:[
        "0:00 Chop the bolognese vegetables. Start browning the first 3 lb of turkey in the big pot.",
        "0:15 Oven to 425 °F. Season the chicken. Brown the second batch of bolognese turkey.",
        "0:30 Chicken in the oven. Rice on the stove. Vegetables, garlic and paste into the pot, then tomatoes: simmer 30 min.",
        "0:35 Burrito turkey in a skillet, then the eggs.",
        "0:52 Chicken out to rest. Put 6 eggs on to boil (12 min, then ice water).",
        "1:00 Roll and wrap 14 burritos.",
        "1:30 Spinach into the sauce. Slice the chicken.",
        "1:40 Portion 7 chicken bowls (freeze 3) and 14 bolognese (freeze 10). Burritos into the freezer."],
       shop:[["chicken","Chicken breast","4 lb",{q:4,u:"lb"}],["turkey","93% lean ground turkey","8.5 lb (three 3-lb packs)",{q:8.5,u:"lb"}],["eggs","Eggs","2½ dozen",{q:30,u:"count"}],["whites","Liquid egg whites","32 oz carton",{q:32,u:"fl oz"}],["tort","10-inch flour tortillas","14",{q:14,u:"count"}],["cheese","Shredded cheddar or Mexican blend","8 oz",{q:8,u:"oz"}],["salsa","Salsa","1 jar (16 oz)",{q:16,u:"oz"}],["crtom","Crushed tomatoes","3 × 28 oz cans",{q:84,u:"oz"}],["paste","Tomato paste","1 × 6 oz can",{q:6,u:"oz"}],["veg","Onions, carrots, garlic","2 + 2 + 1 head"],["spin","Baby spinach","1 lb",{q:16,u:"oz"}],["pasta","Protein pasta","1 box",{q:14,u:"oz"}],["broc","Frozen broccoli","2 × 32 oz",{q:64,u:"oz"}],["banana","Bananas","for long runs",{q:2,u:"count"}],["rice","Rice","if you're low (1½ cups a week)",{q:11,u:"oz"}]]},
      {name:"Week B: quick cook",time:"about 40 minutes",steps:[
        "Oven to 425 °F. Season and bake the chicken (18–22 min).",
        "Rice on the stove while it bakes. Boil 6 eggs for run days.",
        "Rest and slice the chicken, then portion 7 bowls (freeze 3).",
        "Burritos and bolognese come out of the freezer: move 4 bolognese and a few burritos to the fridge."],
       shop:[["chicken","Chicken breast","4 lb",{q:4,u:"lb"}],["eggs","Eggs","1 dozen",{q:12,u:"count"}],["pasta","Protein pasta","1 box",{q:14,u:"oz"}],["broc","Frozen broccoli","2 × 32 oz",{q:64,u:"oz"}],["salsa","Salsa","if you're out"],["banana","Bananas","for long runs",{q:2,u:"count"}]]}],
    every:[{name:"Walnut pesto",time:"every 4–5 weeks · 15 min",shop:[["basil","Fresh basil","4 oz container (2 packed cups)",{q:2.5,u:"oz"}],["walnuts","Walnuts","8 oz bag",{q:4,u:"oz"}],["parm","Parmesan","5 oz wedge or tub",{q:3,u:"oz"}],["lemon","Lemon","1",{q:1,u:"count"}],["oil","Olive oil","500 ml bottle (lasts ~3 batches)",{q:6,u:"fl oz"}],["garlic","Garlic","4 cloves from your head"],["spin","Baby spinach","2 cups from the Week A bag"],["tray","Ice-cube tray and freezer bags","if you don't have them"]],steps:[
        "Toast 1 cup walnuts in a dry pan 3 min until fragrant; let them cool.",
        "Blend 2 packed cups basil, 2 cups baby spinach, the walnuts, 1 cup grated parmesan, 4 garlic cloves, juice of 1 lemon and 1 tsp salt until chopped.",
        "With the blender running, stream in ¾ cup olive oil until smooth. Taste for salt and lemon.",
        "Freeze in an ice-cube tray (1 tbsp per cube), then bag the cubes. Keeps 3 months; keep a week's worth in the fridge."]},
      {name:"Run-day eggs",time:"with each Sunday prep",steps:["Boil 6 eggs 12 min, then ice water 5 min. Two each for Tue, Thu and Sat. Add a banana 30–45 min before the Saturday long run."]}]}
};
function maybeMealsV3(){
  if(!window.__platform||!loaded.profile||!CUSTOM||!CUSTOM.su.fromLegacy) return false;
  const K=kitchen();
  if(K.v3){ if(!K.shop){ K.shop=prepToShop(BATCH3.prep); delete K.prep; delete K.prepV; saveProfile(); return true } return false }
  BATCH3.foods.forEach(f=>{ if(!K.foods.some(x=>x.id===f.id)) K.foods.push({...f}) });
  const ids=new Set(BATCH3.recipes.map(r=>r.id));
  K.recipes=[...BATCH3.recipes.map(r=>JSON.parse(JSON.stringify(r))),...K.recipes.filter(r=>!ids.has(r.id)&&r.id!=="rcYog")];
  K.plan=JSON.parse(JSON.stringify(BATCH3.plan)); K.shop=prepToShop(BATCH3.prep); K.v3=Date.now();
  saveProfile(); return true;
}
// The old two-week prep (Week A / Week B + a separate pesto list) as general lists on a rotation; pesto now shops with Week A.
function prepToShop(P){ const simple=(t,n)=>n&&(t===`${n.q} ${n.u}`||t===`${n.q}`);
  const item=([id,name,txt,need])=>({id,name,amt:need?need.q:null,unit:need?need.u:"",note:simple(txt,need)?"":txt});
  const pe=(P.every||[]).find(e=>e.name==="Walnut pesto");
  const pesto=pe&&pe.shop? pe.shop.filter(([id])=>!["garlic","spin","tray"].includes(id)).map(x=>item(x)).map(x=>({...x,id:"pesto-"+x.id,name:x.name+(x.name.includes("basil")?"":" (pesto)")})) : [];
  const lists=P.weeks.map((w,i)=>({id:i===0?"la":"lb",name:w.name.split(":")[0],items:w.shop.map(item),steps:[...w.steps]}));
  if(lists[0]&&pe){ lists[0].items.push(...pesto); lists[0].steps.push(...pe.steps.map(x=>"Pesto: "+x)) }
  return {day:0,start:P.start,cycle:lists.map(l=>l.id),lists} }
function recipeMethod(r){ if(!r.method&&!r.store) return "";
  const lines=scaledMethod(r).split("\n").map(x=>x.trim()).filter(Boolean), sc=recipeScales(r);
  return `<details class="method"><summary>How to make it${r.when?` <span class="muted">· ${esc(r.when)}</span>`:""}</summary>${sc.length?`<p class="small adj">Adjusted to what you buy at ${esc(storeName())}: ${sc.map(x=>`${esc(SHOPLABEL[x.key]||x.key)} ${esc(x.P.totTxt)}`).join(", ")}. Same number of portions, a little more in each.</p>`:""}${lines.length?`<ol class="steps small">${lines.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`:""}${r.store?`<p class="small"><b>Storing and reheating:</b> ${esc(r.store)}</p>`:""}</details>` }


/* ======================= Grocery scanning ======================= */
// Scan a product for a shopping-list item and the app remembers it for that store: name, package size,
// and how many packages cover what the plan needs ("Buy 2 × 2.5 lb"). Products are saved per store,
// and every scanned barcode is remembered, so the next scan is instant even for items the databases don't know.
const GU={g:["g",1],kg:["g",1000],oz:["g",28.3495],lb:["g",453.592],"fl oz":["ml",29.5735],ml:["ml",1],l:["ml",1000],count:["count",1]};
const G_UNITS=["oz","lb","g","kg","fl oz","ml","l","count"];
const BARCODE_ICON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>`;
const gBase=(q,u)=>{ const x=GU[u]; return x? {v:q*x[1],d:x[0]} : null };
const gFrom=(v,u)=>v/(GU[u]?GU[u][1]:1);
const gFmt=(q,u)=>u==="count"? `${fmtQ(Math.round(q*10)/10)}` : `${fmtQ(Math.round(q*100)/100)} ${u}`;
function gNeedTxt(need){ if(!need) return ""; if(need.u==="g"&&need.q>=454) return gFmt(need.q/453.592,"lb"); if(need.u==="g") return gFmt(need.q/28.3495,"oz"); return need.u==="count"? `${fmtQ(need.q)}` : gFmt(need.q,need.u) }
function storesOf(){ const K=kitchen(); return K.stores&&K.stores.length? K.stores : ["My store"] }
function storeName(){ const K=kitchen(), st=storesOf(); return st.includes(K.store)? K.store : st[0] }
function linkFor(key){ const K=kitchen(); return ((K.products||{})[key]||{})[storeName()]||null }
// what to buy: number of packages that covers the need (weight and volume are treated as interchangeable, ≈ 1 g per ml)
function packPlan(need,pack){ if(!need||!pack||!(pack.qty>0)) return null; const nb=gBase(need.q,need.u); if(!nb) return null;
  if((nb.d==="count")!==(pack.unit==="count")) return null;
  const n=Math.max(1,Math.ceil(nb.v/pack.qty-0.03)), disp= GU[need.u]&&GU[need.u][0]===pack.unit&&need.u!=="g"? need.u : pack.unit==="g"? (pack.qty>=454?"lb":"oz") : pack.unit==="ml"? "fl oz" : "count";
  return {n, approx:nb.d!==pack.unit, packTxt:gFmt(gFrom(pack.qty,disp),disp), totTxt:gFmt(gFrom(n*pack.qty,disp),disp)} }
const SHOPKEYS={};
function shopRow(key,chkKey,name,qtyTxt,need){ SHOPKEYS[chkKey]={key,name,need}; const chk=(S.profile.grocery||{})[chkKey], L=linkFor(key), P=L&&packPlan(need,L.pack);
  const right= L&&P? `<b>Buy ${P.n}</b> <span class="muted">× ${esc(P.packTxt)}</span>` : L&&L.pack&&L.pack.txt? esc(L.pack.txt) : esc(qtyTxt);
  const sub= L? `<span class="pname">${esc(L.name)}${P?` · ${P.approx?"≈ ":""}${esc(P.totTxt)} for ${esc(gNeedTxt(need))}`:""}</span>` : "";
  return `<div class="shoprow"><label class="mealrow ${chk?"eaten":""}"><input type="checkbox" data-c-gro="${esc(chkKey)}" ${chk?"checked":""}><span class="m">${esc(name)}${sub}</span><span class="k small">${right}</span></label><button type="button" class="scanb ${L?"on":""}" data-c-gscan="${esc(chkKey)}" data-gkey="${esc(key)}" aria-label="${L?"Change the":"Scan a"} product for ${esc(name)}">${BARCODE_ICON}</button></div>` }
function storeBar(){ const st=storesOf(), cur=storeName();
  return `<div class="storebar"><label for="gStore" class="small muted">Shopping at</label><select id="gStore" data-c-store="1">${st.map(x=>`<option ${x===cur?"selected":""}>${esc(x)}</option>`).join("")}<option value="__add">+ Add a store…</option></select>
    <span class="small muted">Tap ${BARCODE_ICON.replace('<svg','<svg class="inl"')} next to an item to scan it here.</span></div>` }
function gscanHtml(){ const W=SH, st=storeName(), L=linkFor(W.key), need=W.need;
  const head=`<div class="xs-head"><h2>${esc(W.name)}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <p class="small muted">At <b>${esc(st)}</b>${need?` · you need ${esc(gNeedTxt(need))}`:""}.</p>`;
  if(W.view==="store") return `<div class="xs-head"><h2>Add a store</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="field"><label>Store name</label><input data-xs-gstore="1" placeholder="e.g. ShopRite Bridgewater" data-xs-focus="gstore" value="${esc(W.store||"")}"></div>
    <p class="small muted">Products you scan are saved per store, since package sizes differ.</p><button type="button" class="btn" data-xs="gstoresave">Add store</button>`;
  if(W.view==="edit"){ const pl=packPlanFromEdit();
    return head+`<div class="seg two gtabs"><button type="button" data-xs="gscanagain" aria-pressed="false">Scan barcode</button><button type="button" class="on" aria-pressed="true">Type it in</button></div>
      <div class="field"><label>Product</label><input data-xs-gn="1" value="${esc(W.pname||"")}" placeholder="e.g. Perdue chicken breast, family pack" data-xs-focus="gn"></div>
      <div class="row" style="flex-wrap:nowrap"><div class="field" style="flex:1 1 0;min-width:0"><label>Package size</label><input inputmode="decimal" data-xs-gq="1" value="${esc(W.eq||"")}" placeholder="e.g. 2.5" data-xs-focus="gq"></div>
      <div class="field" style="flex:0 0 110px;min-width:0"><label>Unit</label><select data-xs-gu="1">${G_UNITS.map(u=>`<option ${u===W.eu?"selected":""}>${u}</option>`).join("")}</select></div></div>
      ${W.hint?`<p class="small muted">${esc(W.hint)}</p>`:""}
      <div class="note gplan">${gPlanTxt(pl)}</div>
      <div class="row"><button type="button" class="btn" data-xs="gsave">Save for ${esc(st)}</button><button type="button" class="btn ghost" data-xs="gscanagain">Scan again</button></div>
      ${W.src?`<p class="small muted">${esc(W.src)}</p>`:""}` }
  const tabs=`<div class="seg two gtabs"><button type="button" class="on" aria-pressed="true">Scan barcode</button><button type="button" data-xs="gmanual" aria-pressed="false">Type it in</button></div>`;
  return head+tabs+(L?`<div class="note"><b>Saved:</b> ${esc(L.name)}${L.pack&&L.pack.txt?` · ${esc(L.pack.txt)}`:""}<div class="row" style="margin-top:6px"><button type="button" class="btn ghost sm" data-xs="gedit">Edit</button><button type="button" class="btn ghost sm" data-xs="grm">Remove</button></div></div>`:"")+
    `<div id="scanbox" class="scanbox"><p class="small muted">${W.scanErr?esc(W.scanErr):"Starting camera…"}</p></div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input class="xs-search" inputmode="numeric" placeholder="Or type the barcode number" data-xs-code="1" value="${esc(W.code||"")}" data-xs-focus="code"><button type="button" class="btn sm" data-xs="glookup" style="flex-shrink:0">Look up</button></div>
    <p class="note" data-xs-err ${W.lookErr?"":"hidden"}>${esc(W.lookErr||"")}</p>
    <p class="small muted">No barcode, like loose produce? Use “Type it in”.</p>` }
function packPlanFromEdit(){ const W=SH, q=numIn(W.eq), b=q>0&&gBase(q,W.eu); return b? packPlan(W.need,{qty:b.v,unit:b.d}) : null }
function gPlanTxt(pl){ const W=SH; if(!W.need) return "Saved sizes show on your shopping list."; if(!(numIn(W.eq)>0)) return `Enter the package size to see how many to buy for ${esc(gNeedTxt(W.need))}.`;
  if(!pl) return `This package is sold by ${W.eu==="count"?"count":"weight or volume"} but the list counts ${W.need.u==="count"?"items":"weight"}, so check the amount yourself.`;
  const R=RECIPE_SCALE[W.key], b=gBase(numIn(W.eq),W.eu), f=R&&b? (pl.n*b.v)/gBase(R.need.q,R.need.u).v : 1;
  const rec= R&&f>1.005&&f<3? `<br><span class="small">Your recipes will use all ${esc(pl.totTxt)} (${Math.round((f-1)*100)}% more), so each portion gets a little more. Macros update to match.</span>` : "";
  return `<b>Buy ${pl.n}</b> ${pl.n===1?"package":"packages"}: ${pl.approx?"about ":""}${esc(pl.totTxt)} for the ${esc(gNeedTxt(W.need))} you need.${rec}` }
function gEditFrom(prod){ const W=SH, pk=prod&&prod.pack; W.pname=prod&&prod.name||""; W.hint=""; W.eq=""; W.eu=W.need&&GU[W.need.u]&&W.need.u!=="g"? W.need.u : "oz";
  if(pk&&pk.qty>0){ let u=W.eu; if(!GU[u]||GU[u][0]!==pk.unit) u= pk.unit==="g"? (pk.qty>=454?"lb":"oz") : pk.unit==="ml"? "fl oz" : "count"; W.eu=u; W.eq=String(Math.round(gFrom(pk.qty,u)*100)/100) }
  else if(pk&&pk.txt) W.hint=`The barcode database says "${pk.txt}". Enter the size from the label.`;
  W.view="edit" }
async function gLookup(code){ code=String(code||"").replace(/\D/g,""); const W=SH; if(!W||W.kind!=="gscan") return;
  if(code.length<6){ W.lookErr="Enter the full barcode number."; paintSheet(); return }
  W.code=code; const mine=(kitchen().barcodes||{})[code];
  if(mine){ gEditFrom(mine); W.src="Saved from an earlier scan."; paintSheet(true); return }
  W.lookErr="Looking up…"; paintSheet();
  try{ const tok=window.appAuthToken? await window.appAuthToken() : null; const r=await fetch("/api/barcode?code="+code,{headers:tok?{authorization:"Bearer "+tok}:{}}); const j=await r.json().catch(()=>({}));
    if(SH!==W) return;
    if(r.status===404||(r.ok&&!j.product)){ W.lookErr=""; gEditFrom(null); W.hint="That barcode isn't in the product databases yet. Enter the name and size from the package: next time you or anyone else scans it, it'll come straight up."; paintSheet(true); return }
    if(!r.ok) throw 0;
    W.lookErr=""; gEditFrom(j.product); W.src=`Name and size from ${srcTxt(j.src)}. Check them against the package.`; paintSheet(true) }
  catch(e){ if(SH!==W) return; W.lookErr="Lookup isn't available right now. You can still enter the size yourself."; paintSheet() } }


/* ----- recipes follow what you actually buy -----
   Packages never match the plan exactly (2 × 2.5 lb chicken = 5 lb for a 4 lb recipe). For the fresh batch
   ingredients, the recipe uses the whole amount you bought at the current store: same number of portions, a bit
   more in each, with the macros and the method updated to match. Pantry and counted items (pasta, rice, eggs,
   tortillas) aren't scaled, since the extra just keeps for next time. */
const SHOPLABEL={chicken:"chicken",turkey:"turkey",crtom:"crushed tomatoes",paste:"tomato paste",spin:"spinach"};
const RECIPE_SCALE={
  chicken:{need:{q:4,u:"lb"},uses:[["rcPes","chkbr"]]},
  turkey:{need:{q:8.5,u:"lb"},uses:[["rcBur","turk93"],["rcBol","turk93"]]},
  crtom:{need:{q:84,u:"oz"},uses:[["rcBol","crtom"]]},
  paste:{need:{q:6,u:"oz"},uses:[["rcBol","tompaste"]]},
  spin:{need:{q:16,u:"oz"},uses:[["rcBol","spinach"]]}};
const METHOD_SUBS={ // phrases in the method that carry a scaled amount: [recipe, ingredient key, text, unit, base amount, wording]
  rcPes:[["chicken","4 lb chicken breasts","lb",4,q=>`${q} chicken breasts`]],
  rcBur:[["turkey","2.5 lb ground turkey","lb",2.5,q=>`${q} ground turkey`]],
  rcBol:[["turkey","6 lb ground turkey","lb",6,q=>`${q} ground turkey`],["crtom","3 × 28 oz cans crushed tomatoes","oz",84,q=>`${q} crushed tomatoes`],["paste","a 6 oz can of tomato paste","oz",6,q=>`${q} tomato paste`],["spin","14 cups spinach","cup",14,q=>`${q} spinach`]]};
function scaleOf(key){ const R=RECIPE_SCALE[key], L=R&&linkFor(key); if(!L||!L.pack||!(L.pack.qty>0)) return null;
  const nb=gBase(R.need.q,R.need.u), P=packPlan(R.need,L.pack); if(!P||!nb) return null;
  const f=(P.n*L.pack.qty)/nb.v; return f>1.005&&f<3? {f,key,L,P} : null }
function scaleFor(rid,fid){ for(const key in RECIPE_SCALE){ if(RECIPE_SCALE[key].uses.some(([r,f])=>r===rid&&f===fid)) return scaleOf(key) } return null }
function scaledItems(r){ if(!r||!r.items) return []; return r.items.map(it=>{ const sc=scaleFor(r.id,it.f); return sc? {...it,amt:+(it.amt*sc.f).toFixed(3)} : it }) }
function recipeScales(r){ const out=[]; for(const key in RECIPE_SCALE){ if(RECIPE_SCALE[key].uses.some(([rid])=>rid===r.id)){ const sc=scaleOf(key); if(sc) out.push(sc) } } return out }
function scaledMethod(r){ let m=String(r.method||""); (METHOD_SUBS[r.id]||[]).forEach(([key,txt,u,base,word])=>{ const sc=scaleOf(key); if(!sc||!m.includes(txt)) return;
  const q=base*sc.f, amt= u==="cup"? `${fmtQ(Math.round(q))} cups` : u==="lb"? `${fmtQ(Math.round(q*100)/100)} lb` : q>=32? `${fmtQ(Math.round(q))} oz (${fmtQ(Math.round(q/16*100)/100)} lb)` : `${fmtQ(Math.round(q*10)/10)} oz`;
  m=m.replace(txt,word(amt)) }); return m }


/* ======================= Shopping lists ======================= */
// Your own lists on a weekly rotation, like gym days: e.g. Week A (big shop) → Week B (top-up) → repeat, on your shopping day.
// Each item can carry an amount (for the scanner's "how many to buy") and a note shown instead of it ("2½ dozen").
const DAYS7=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
let shopEdit=null; // list id in edit mode
function shopOf(){ const K=kitchen(); return K.shop||null }
function nextShopDay(sh){ let d=midnight(today); while(d.getDay()!==(sh.day||0)) d=addDays(d,1); return d }
function shopCycleIdx(sh,d){ const n=(sh.cycle||[]).length; if(!n) return -1; const st=parseYmd(sh.start||ymd(d)); const w=Math.floor(Math.round((d-st)/86400000)/7); return ((w%n)+n)%n }
function shopItemQty(it){ if(it.note) return it.note; if(it.amt>0) return it.unit==="count"||!it.unit? `${fmtQ(it.amt)}` : `${fmtQ(it.amt)} ${it.unit}`; return "" }
function shopItemNeed(it){ return it.amt>0&&GU[it.unit]? {q:Number(it.amt),u:it.unit} : null }
function shopCard(K){ const sh=K.shop;
  if(!sh||!sh.lists||!sh.lists.length) return `<div class="card"><h2>Shopping lists</h2><p class="small muted">Make the lists you shop from and put them on a weekly rotation, like gym days. Scan items once and the app works out how many packages to buy at each store.</p>
    <div class="row"><button type="button" class="btn sm" data-c-shopfromplan="1">Start from my meal plan</button><button type="button" class="btn ghost sm" data-c-shoplist="">+ New list</button></div></div>`;
  const nd=nextShopDay(sh), ci=shopCycleIdx(sh,nd), curId=ci>=0? sh.cycle[ci] : null, cur=sh.lists.find(l=>l.id===curId);
  const cyc=(sh.cycle||[]).map(id=>{ const l=sh.lists.find(x=>x.id===id); return l? esc(l.name) : "No shop" }).join(" → ");
  let h=`<div class="card shop"><div class="row between"><h2>Shopping</h2><span class="chip food">${fmtShort(nd)}: ${cur?esc(cur.name):"no shop"}</span></div>
    <div class="row between shopsched"><span class="small muted">${DAYS7[sh.day||0]}s · ${cyc||"no rotation yet"}</span><button type="button" class="link small" data-c-shopsched="1">Edit schedule</button></div>${storeBar()}`;
  const order=[...sh.lists].sort((a,b)=>(a.id===curId?-1:b.id===curId?1:0));
  order.forEach(l=>{ const editing=shopEdit===l.id, open=l.id===curId||editing;
    h+=`<details class="prepwk" ${open?"open":""} data-shopl="${esc(l.id)}"><summary><b>${esc(l.name)}</b><span class="small muted">${l.items.length} item${l.items.length===1?"":"s"}${l.id===curId?" · this week":""}</span></summary>`;
    h+= l.items.length? l.items.map(it=> editing
        ? `<button type="button" class="shopedit" data-c-shopitem="${esc(l.id)}|${esc(it.id)}"><span><b>${esc(it.name)}</b><span class="small muted">${esc(shopItemQty(it))}</span></span><span class="xs-plus">✎</span></button>`
        : shopRow(it.id,`${l.id}-${it.id}`,it.name,shopItemQty(it),shopItemNeed(it))).join("") : `<p class="small muted">No items yet.</p>`;
    h+=`<div class="row" style="margin-top:8px;gap:8px">${editing?`<button type="button" class="btn sm" data-c-shopitem="${esc(l.id)}|">+ Add item</button><button type="button" class="btn ghost sm" data-c-shoplist="${esc(l.id)}">Rename or delete</button><button type="button" class="btn ghost sm" data-c-shopedit="">Done</button>`
        : `<button type="button" class="btn ghost sm" data-c-shopedit="${esc(l.id)}">Edit list</button><button type="button" class="link small" data-c-shopclr="${esc(l.id)}">Uncheck all</button>`}</div>`;
    if(l.steps&&l.steps.length) h+=`<div class="eyebrow" style="margin-top:12px">Cooking order</div><ol class="steps small">${l.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`;
    h+=`</details>` });
  return h+`<button type="button" class="btn ghost sm" data-c-shoplist="" style="align-self:flex-start;margin-top:4px">+ New list</button></div>` }
function shopItemHtml(){ const W=SH, l=shopOf().lists.find(x=>x.id===W.listId);
  return `<div class="xs-head"><h2>${W.itemId?"Edit item":"Add item"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <p class="small muted">On ${esc(l?l.name:"this list")}.</p>
    <div class="field"><label>Item</label><input data-xs-si="name" value="${esc(W.name||"")}" placeholder="e.g. Chicken breast" data-xs-focus="siname"></div>
    <div class="row" style="flex-wrap:nowrap"><div class="field" style="flex:1 1 0;min-width:0"><label>Amount you need</label><input inputmode="decimal" data-xs-si="amt" value="${esc(W.amt??"")}" placeholder="e.g. 4" data-xs-focus="siamt"></div>
      <div class="field" style="flex:0 0 110px;min-width:0"><label>Unit</label><select data-xs-si="unit"><option value="" ${!W.unit?"selected":""}>—</option>${G_UNITS.map(u=>`<option ${u===W.unit?"selected":""}>${u}</option>`).join("")}</select></div></div>
    <div class="field"><label>Note (optional, shown instead of the amount)</label><input data-xs-si="note" value="${esc(W.note||"")}" placeholder="e.g. 2½ dozen, or if you're low" data-xs-focus="sinote"></div>
    <p class="small muted">With an amount and unit, scanning the product tells you how many packages to buy.</p>
    <div class="row"><button type="button" class="btn" data-xs="sisave">${W.itemId?"Save":"Add"}</button>${W.itemId?`<button type="button" class="btn ghost" data-xs="sidel">${W.delConfirm?"Tap again to delete":"Delete"}</button>`:""}</div>` }
function shopListHtml(){ const W=SH;
  return `<div class="xs-head"><h2>${W.listId?"Edit list":"New list"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="field"><label>List name</label><input data-xs-sl="name" value="${esc(W.name||"")}" placeholder="e.g. Week A, Costco run, Pesto" data-xs-focus="slname"></div>
    <div class="field"><label>Cooking order or notes (one per line, optional)</label><textarea data-xs-sl="steps" rows="6" data-xs-focus="slsteps">${esc(W.steps||"")}</textarea></div>
    ${W.listId?"":`<p class="small muted">After saving, add it to your schedule so it comes up on the right week.</p>`}
    <div class="row"><button type="button" class="btn" data-xs="slsave">Save list</button>${W.listId?`<button type="button" class="btn ghost" data-xs="sldel">${W.delConfirm?"Tap again to delete":"Delete list"}</button>`:""}</div>` }
function shopSchedHtml(){ const W=SH, sh=shopOf(), opts=id=>`<option value="">No shopping</option>${sh.lists.map(l=>`<option value="${esc(l.id)}" ${l.id===id?"selected":""}>${esc(l.name)}</option>`).join("")}`;
  return `<div class="xs-head"><h2>Shopping schedule</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="field"><label>Shopping day</label><select data-xs-ss="day">${DAYS7.map((d,i)=>`<option value="${i}" ${i===W.day?"selected":""}>${d}</option>`).join("")}</select></div>
    <p class="small muted">Your weeks repeat in this order, like a gym split.</p>
    ${W.cycle.map((id,i)=>`<div class="row sswk" style="flex-wrap:nowrap"><span class="small" style="width:64px;flex:none">Week ${i+1}</span><select data-xs-ss="wk" data-i="${i}" style="flex:1;min-width:0">${opts(id)}</select>${W.cycle.length>1?`<button type="button" class="btn ghost sm" data-xs-ssrm="${i}" aria-label="Remove week ${i+1}">×</button>`:""}</div>`).join("")}
    <button type="button" class="btn ghost sm" data-xs="ssadd" style="align-self:flex-start">+ Add a week</button>
    <div class="field"><label>Your next shopping day (${fmtShort(nextShopDay({day:W.day}))}) is</label><select data-xs-ss="pos">${W.cycle.map((id,i)=>`<option value="${i}" ${i===W.pos?"selected":""}>Week ${i+1}</option>`).join("")}</select></div>
    <button type="button" class="btn" data-xs="sssave">Save schedule</button>` }
function shopFromPlan(){ const K=kitchen(), gl=groceryList(); if(!gl.length){ toast("Add meals to your meal plan first"); return }
  const items=gl.map(x=>{ const f=foodById(x.id), lb=x.gr/453.592; return {id:"f:"+x.id,name:x.n,amt:lb>=1?+lb.toFixed(2):+(x.gr/28.3495).toFixed(1),unit:lb>=1?"lb":"oz",note:""} });
  K.shop={day:0,start:ymd(nextShopDay({day:0})),cycle:["l1"],lists:[{id:"l1",name:"Weekly shop",items,steps:[]}]}; commitPlan(); toast("Shopping list made from your meal plan") }

/* ======================= Exercise swaps ======================= */
// Library exercises borrow strength standards from a close equivalent, so swaps still count in Standings.
const STD_ALIAS={dbbench:["bench","db"],inclinebb:["incline","bb"],smithbench:["bench","bb"],chestpress:["bench","bb"],declinebench:["bench","bb"],
  dbfly:["fly","db"],cablecross:["fly","bb"],machinerow:["cablerow","bb"],bbrow:["cablerow","bb"],tbarrow:["cablerow","bb"],onearmrow:["dbrow","db"],
  dbpress:["ohp","db"],machpress:["ohp","bb"],arnold:["ohp","db"],dbrevfly:["revfly","db"],bbcurl:["ezcurl","bb"],cablecurl:["ezcurl","bb"],preacher:["ezcurl","bb"],
  inclinecurl:["curl","db"],ropepush:["pushdown","bb"],dbohtri:["ohtri","db"],skull:["ohtri","bb"],hack:["squat","bb"],smithsquat:["squat","bb"],frontsquat:["squat","bb",0.85],
  legext:["legext1","bb",1.8],lyingcurl:["legcurl","bb"],dbrdl:["rdl","db"],deadlift:["tbdl","bb"],machthrust:["hipthrust","bb"],seatedcalf:["calfraise","bb",0.8],
  legpresscalf:["calfraise","bb",1.3],tiltcalf:["calfraise","bb"]};
let stdAliased=false;
function initStdAliases(){ if(stdAliased||typeof STD==="undefined") return; stdAliased=true;
  for(const [id,[t,k,mul]] of Object.entries(STD_ALIAS)){ if(STD[t]&&STD[t][k]&&!STD[id]) STD[id]={[k]:STD[t][k].map(v=>+(v*(mul||1)).toFixed(3))}; if(EX_MUSCLES[t]&&!EX_MUSCLES[id]) EX_MUSCLES[id]=EX_MUSCLES[t] } }
const SWAP_REST={};
const BUILTIN_SWAPS=[{day:"B",from:"calfraise",to:"tiltcalf",since:"2026-10-21"}]; // made before the swap button existed
function swapsOf(){ const sw=(S.profile&&S.profile.swaps)||{}; return {routine:sw.routine||[],once:sw.once||{},add:sw.add||{}} }
function swapEx(orig,toId){
  const L=libEx(toId); let e;
  if(!CUSTOM&&typeof X!=="undefined"&&X[toId]) e={...X[toId]};
  else e=toPlanEx({id:toId,sets:orig.sets,lo:orig.lo,hi:orig.hi,rest:orig.rest||restFor(orig.id)});
  const timed=!!(e.bw&&e.unit==="sec");
  e={...e,sets:orig.sets,swappedFrom:orig.id};
  if(timed&&!orig.bw){ e.lo=30; e.hi=60 } else if(!timed&&orig.bw){ e.lo=8; e.hi=12 } else if(!timed){ e.lo=orig.lo; e.hi=orig.hi }
  if(!SWAP_REST[e.id]) SWAP_REST[e.id]=orig.rest||(typeof REST!=="undefined"&&REST[orig.id])||90;
  if(L&&L.equip==="Dumbbell"&&!DBCFG[e.id]) DBCFG[e.id]={def:true,m:L.uni?1:2};
  if(!ALLEX.some(a=>a.id===e.id)) ALLEX.push(e);
  if(L&&!EX_MUSCLES[e.id]&&LIB_MUSCLE_MAP[L.muscle]) EX_MUSCLES[e.id]=LIB_MUSCLE_MAP[L.muscle];
  return e;
}
// Routine swaps with a start date. Built-in plans use them for every routine change; custom plans only for scheduled ones.
function applySwaps(g,dayKey,d,routineOnly){
  if(!g||!g.ex) return g; const k=ymd(d), sw=swapsOf(); let ex=g.ex, name=g.name;
  (CUSTOM? sw.routine : [...BUILTIN_SWAPS,...sw.routine]).forEach(r=>{ if(r.day!==dayKey||k<r.since) return;
    if(r.name) name=r.name;
    if(r.from) ex=ex.map(e=>{ if(e.id!==r.from) return e; const n={...swapEx(e,r.to)}; ["sets","lo","hi","rest"].forEach(f=>{ if(r[f]!=null) n[f]=r[f] }); if(r.rest) SWAP_REST[n.id]=r.rest; if(r.ss!==undefined) n.ss=r.ss||undefined; return n });
    if(r.from&&r.at!=null){ const i=ex.findIndex(e=>e.id===r.to); if(i>=0&&i!==r.at){ ex=[...ex]; const [m]=ex.splice(i,1); ex.splice(Math.min(r.at,ex.length),0,m) } } });
  const once=!routineOnly&&sw.once[k]; if(once) ex=ex.map(e=>once[e.id]?{...swapEx(e,once[e.id]),once:true}:e);
  const add=!routineOnly&&sw.add[k]; if(add&&add.length){ ex=[...ex]; add.forEach(a=>{ if(!ex.some(e=>e.id===a.id)){ const e=swapEx({sets:a.sets||3,lo:a.lo||8,hi:a.hi||12,rest:a.rest||90,id:"_"},a.id); ex.push({...e,added:true}) } }) }
  return ex===g.ex&&name===g.name? g : {...g,name,ex};
}
/* ----- One-time move of the original hand-built plan onto routines (reversible: delete profile.setup) ----- */
function legacyToSetup(){
  const P=S.profile, about=String(P.about||""), nm=(about.match(/^\s*([A-Za-z][A-Za-z'-]{1,30})\s*,/)||[])[1]||"You";
  const wts=(P.weights||[]).slice().sort((a,b)=>a.d<b.d?-1:1), wt=wts.length?Number(wts[wts.length-1].lb):(Number((about.match(/(\d{3})\s*lb/)||[])[1])||270);
  const E2=(id,sets,lo,hi,ss)=>({id,sets,lo,hi,rest:REST[id]||90,note:X[id]&&X[id].alt,...(ss?{ss}:{})});
  const routines=[
    {id:"rA",name:"Day A · Bench & Leg Press",ex:[E2("bench",4,6,8),E2("legpress45",4,8,12),E2("pulldown",3,8,12),E2("backext",3,10,15),E2("declinecrunch",3,10,15),E2("fly",3,12,15,"a1"),E2("revfly",2,12,15,"a1"),E2("lateral",3,12,15)]},
    {id:"rB",name:"Day B · Press & Core",ex:[E2("ohp",3,6,10),E2("cablerow",3,8,12),E2("legcurl",3,10,15),E2("legext1",2,10,15),E2("facepull",3,12,15,"b1"),E2("ohtri",2,10,15,"b1"),E2("pallof",3,10,12,"b2"),E2("tiltcalf",3,10,15,"b2")]},
    {id:"rC",name:"Day C · Incline & Glutes",ex:[E2("incline",4,8,12),E2("dbrow",3,8,12),E2("hipthrust",3,8,12),E2("legcurl",3,10,15),E2("ezcurl",2,10,15,"c1"),E2("pushdown",2,10,15,"c1"),E2("hammer",2,10,15,"c2"),{...E2("calfraise",2,10,15,"c2"),note:"Pair with hammer curls. Full stretch at the bottom, 1 s pause at the top."}]}];
  // swaps already made with the swap button
  const sw=P.swaps||{}, keep=[];
  (sw.routine||[]).forEach(r=>{ const rid="r"+r.day, R=routines.find(x=>x.id===rid); if(!R) return;
    if(r.since<=ymd(today)){ const e=R.ex.find(x=>x.id===r.from); if(e) e.id=r.to } else keep.push({...r,day:rid}) });
  // Nov 9: the core block ends and the deadlifts return
  keep.push({day:"rA",since:"2026-11-09",from:"declinecrunch",to:"rdl",sets:3,lo:8,hi:10,rest:120,at:3});
  keep.push({day:"rB",since:"2026-11-09",name:"Day B · Press & Deadlift",from:"pallof",to:"tbdl",sets:3,lo:5,hi:8,rest:150,ss:null,at:1});
  P.swaps={once:sw.once||{},routine:keep};
  // the meal plan becomes recipes in My meals + a daily plan
  const K=kitchen(); if(!K.recipes.length){
    K.recipes=[
      {id:"rcYog",name:"Yogurt berry bowl",servings:1,items:[{f:"gyog0",amt:1,unit:"1 cup"},{f:"oats",amt:27,unit:"g"},{f:"berries",amt:0.75,unit:"1 cup"}]},
      {id:"rcPes",name:"Pesto chicken rice bowl",servings:1,items:[{f:"chkbrc",amt:6,unit:"oz"},{f:"ricew",amt:0.5,unit:"1 cup"},{f:"broc",amt:2,unit:"1 cup"},{f:"pesto",amt:1,unit:"1 tbsp"}]},
      {id:"rcBol",name:"Turkey bolognese pasta (batch)",servings:14,items:[{f:"turk93",amt:4,unit:"1 lb"},{f:"onion",amt:2,unit:"1 medium"},{f:"carrot",amt:2,unit:"1 medium"},{f:"garlic",amt:6,unit:"1 clove"},{f:"crtom",amt:3,unit:"1 can (28 oz)"},{f:"tompaste",amt:170,unit:"g"},{f:"spinach",amt:14,unit:"1 cup"},{f:"pastad",amt:28,unit:"oz"}]},
      {id:"rcCot",name:"Cottage cheese + berries",servings:1,items:[{f:"cott1",amt:0.75,unit:"1 cup"},{f:"berries",amt:0.5,unit:"1 cup"}]}];
    K.plan={b:[{t:"r",id:"rcYog",qty:1}],l:[{t:"r",id:"rcPes",qty:1}],d:[{t:"r",id:"rcBol",qty:1}],s:[{t:"r",id:"rcCot",qty:1}]} }
  return {v:2,name:nm,sex:"male",age:21,weight:wt,goal:"fit",race:null,ongoing:1,start:"2026-10-12",firstDay:"2026-10-12",split:"own",
    routines,week:["rA","run","rB","run","rC","run","rest"],customEx:[],runLevel:"new",exp:"new",kcal:1600,food:{kcal:1600,protein:140},
    legacyRuns:true,rope:true,fromLegacy:ymd(today),at:Date.now(),
    coachNotes:"Core block Oct 19–Nov 8: deadlift patterns were swapped for weighted core work because his core couldn't support his lower back; from Nov 9 the RDL and trap-bar deadlift return at reduced weight (trap bar around 135 lb with straps). Pressing is his weakest area, grip limits his pulls (use straps), and he dislikes split squats. Runs: Tuesday easy by heart rate (jog to 150 bpm, walk to 130), Thursday intervals, Saturday long run building to 11 mi, then cycling with a lighter week every 4th week. Jump-rope rounds finish each gym day as prep for a Muay Thai camp right after Dec 25. He chose an aggressive calorie deficit, so watch for under-fueling. No race on the calendar: the plan is ongoing, focused on getting steadily stronger and healthier."};
}
// Oct 28: his Pallof press becomes a Pallof hold (weight × seconds), in his plan only
function maybePallofHold(){
  const su=S.profile&&S.profile.setup; if(!su||!su.fromLegacy||su.pallofHold) return false;
  const NOTE="Stand side-on to the cable, arms locked straight out at chest height, and don't let it twist you. Seconds are per side.";
  (su.routines||[]).forEach(r=>(r.ex||[]).forEach(e=>{ if(e.id==="pallof"){ e.id="pallofhold"; e.lo=20; e.hi=30; e.rest=60; e.note=NOTE } }));
  const sw=S.profile.swaps; if(sw&&sw.routine) sw.routine.forEach(r=>{ if(r.from==="pallof") r.from="pallofhold"; if(r.to==="pallof") r.to="pallofhold" });
  su.pallofHold=1; su.at=Date.now(); saveProfile(); return true }
function maybeMigrateLegacy(){
  if(!window.__platform||!loaded.profile||S.profile.setup||!S.profile.about||S.profile.legacyKept) return false;
  S.profile.setup=legacyToSetup(); saveProfile(); return true;
}
const SWAP_ICON=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h9.5M10 2.5 12.5 5 10 7.5"/><path d="M13 11H3.5M6 8.5 3.5 11 6 13.5"/></svg>`;
function swapBtn(ex,log){ if(ex.fixed) return "";
  if(log) return `<button type="button" class="swapb" data-swap="${esc(ex.id)}" aria-label="Logged the wrong exercise? Change ${esc(ex.name)}" title="Logged the wrong exercise? Change it">${SWAP_ICON}</button>`;
  const undo= ex.once? `<span class="swapped">today only<button type="button" data-swapundo="${esc(ex.id)}">undo</button></span>` : "";
  return `<button type="button" class="swapb" data-swap="${esc(ex.id)}" aria-label="Swap ${esc(ex.name)}">${SWAP_ICON}</button>${undo}` }
function muscleOfEx(id){ const L=libEx(id); if(L) return L.muscle; const m=EX_MUSCLES[id]; if(!m) return ""; const top=Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0];
  return {chest:"Chest",back:"Back",shoulders:"Shoulders",arms:"Biceps",core:"Core",quads:"Quads",glutes:"Glutes",hamstrings:"Hamstrings",calves:"Calves"}[top]||"" }
function swapHtml(){
  const W=SH, p=planFor(parseYmd(W.k)), inDay=new Set((p&&p.ex||[]).map(e=>e.id));
  if(W.adding) return addExHtml(W,inDay);
  if(W.to&&W.fix){ const L=libEx(W.to)||{name:W.to}, can=fixRoutineOK(W);
    return `<div class="xs-head"><h2>Fix logged exercise</h2><button type="button" class="btn ghost sm" data-xs="swapback">Back</button></div>
     <div class="swapfrom"><span>${esc(W.fromName)}</span>${SWAP_ICON}<span>${esc(L.name)}</span></div>
     <p class="small muted">Your sets from ${fmtDate(parseYmd(W.k))} stay exactly as logged, recorded as ${esc(L.name)}. History, PRs and ranks update to match.</p>
     <button type="button" class="swapopt" data-xs-swapmode="fixonly"><b>Just fix this workout</b><span>Your routine stays the same.</span></button>
     ${can?`<button type="button" class="swapopt" data-xs-swapmode="fixroutine"><b>Fix it and swap it in your routine too</b><span>Every ${esc(W.dayName)} from today on uses ${esc(L.name)} instead of ${esc(W.fromName)}.</span></button>`:""}` }
  if(W.to){ const L=libEx(W.to)||{name:W.to}, isToday=W.k===ymd(today);
    return `<div class="xs-head"><h2>Swap exercise</h2><button type="button" class="btn ghost sm" data-xs="swapback">Back</button></div>
     <div class="swapfrom"><span>${esc(W.fromName)}</span>${SWAP_ICON}<span>${esc(L.name)}</span></div>
     <p class="small muted">Sets, reps and rest carry over. How long should this swap last?</p>
     <button type="button" class="swapopt" data-xs-swapmode="once"><b>${isToday?"Just today":"Just this workout"}</b><span>${fmtDate(parseYmd(W.k))} only. Your routine stays the same.</span></button>
     <button type="button" class="swapopt" data-xs-swapmode="routine"><b>Every ${esc(W.dayName)} from now on</b><span>Changes your routine for all future workouts${isToday?" starting today":" starting "+fmtShort(parseYmd(W.k))}. Logged workouts keep what you did, and Standings update to match.</span></button>` }
  const q=(W.q||"").toLowerCase().trim(), mu=W.mu||"";
  const timed=id=>{ const L=libEx(id); return L? L.type==="t" : !!(typeof X!=="undefined"&&X[id]&&X[id].unit==="sec") };
  const list=exLib().filter(e=>e.id!==W.from&&(!W.fix||timed(e.id)===timed(W.from))&&(!mu||e.muscle===mu)&&(!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)||e.equip.toLowerCase().includes(q)));
  return `<div class="xs-head"><h2>${W.fix?`Change ${esc(W.fromName)} to…`:`Swap ${esc(W.fromName)}`}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
   ${W.fix?`<p class="small muted">Logged the wrong exercise on ${fmtDate(parseYmd(W.k))}? Pick what you actually did. Your sets stay as logged.</p>`:""}
   <input class="xs-search" type="search" placeholder="Search exercises" value="${esc(W.q||"")}" data-xs-q="1" data-xs-focus="q" autocomplete="off">
   <div class="xs-chips"><button type="button" class="${!mu?"on":""}" data-xs-mu="">All</button>${MUSCLES.map(m=>`<button type="button" class="${mu===m?"on":""}" data-xs-mu="${m}">${m}</button>`).join("")}</div>
   <div class="xs-results"><div class="xs-list">${list.map(e=>{const used=inDay.has(e.id); return `<button type="button" class="xs-item" data-xs-swapto="${e.id}" ${used?"disabled":""}><span><b>${esc(e.name)}</b><span class="small muted">${used?"Already in this workout":`${esc(e.muscle)} · ${esc(e.equip)}${e.custom?" · custom":""}`}</span></span><span class="xs-plus">${SWAP_ICON}</span></button>`}).join("")||`<p class="small muted">No matches. Create it as a custom exercise below.</p>`}</div></div>
   <button type="button" class="btn ghost" data-xs="swapnew" style="margin-top:12px">Create custom exercise</button>`;
}
function addExHtml(W,inDay){
  const q=(W.q||"").toLowerCase().trim(), mu=W.mu||"";
  const list=exLib().filter(e=>(!mu||e.muscle===mu)&&(!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)||e.equip.toLowerCase().includes(q)));
  return `<div class="xs-head"><h2>Add to today</h2><button type="button" class="btn sm" data-xs="close">Done</button></div>
   <p class="small muted">Adds to ${fmtDate(parseYmd(W.k))} only. To keep it, add it to the routine in Plan.</p>
   <input class="xs-search" type="search" placeholder="Search exercises" value="${esc(W.q||"")}" data-xs-q="1" data-xs-focus="q" autocomplete="off">
   <div class="xs-chips"><button type="button" class="${!mu?"on":""}" data-xs-mu="">All</button>${MUSCLES.map(m=>`<button type="button" class="${mu===m?"on":""}" data-xs-mu="${m}">${m}</button>`).join("")}</div>
   <div class="xs-results"><div class="xs-list">${list.map(e=>{const used=inDay.has(e.id); return `<button type="button" class="xs-item ${used?"on":""}" data-xs-addday="${e.id}" ${used?"disabled":""}><span><b>${esc(e.name)}</b><span class="small muted">${used?"In this workout":`${esc(e.muscle)} · ${esc(e.equip)}`}</span></span><span class="xs-plus">${used?"✓":"+"}</span></button>`}).join("")||`<p class="small muted">No matches.</p>`}</div></div>`;
}
// a logged exercise that was recorded under the wrong name: move its sets to the right exercise
function fixLoggedEx(k,from,to){ const l=S.logs[k]; if(!l||!l.ex) return null; const L=libEx(to);
  const ex={}; Object.keys(l.ex).forEach(id=>{ if(id===from) ex[to]=l.ex[from]; else if(id!==to) ex[id]=l.ex[id] }); if(!(to in ex)&&l.ex[from]) ex[to]=l.ex[from];
  const db={...(l.db||{})}; if(from in db){ delete db[from] } if(L&&L.equip==="Dumbbell"){ db[to]=true; if(!DBCFG[to]) DBCFG[to]={def:true,m:L.uni?1:2} }
  let plan=l.plan; if(!(plan&&plan.ex)&&l.type==="gym"){ const lp=planFor(parseYmd(k)); if(lp&&lp.ex) plan={type:"gym",day:lp.day,name:lp.name,ex:lp.ex.map(e=>{const o={}; SNAP_KEYS.forEach(x=>{if(e[x]!==undefined) o[x]=e[x]}); return o})} }
  if(plan&&plan.ex){ plan={...plan,ex:plan.ex.map(e=>{ if(e.id!==from) return e; const n=toPlanEx({id:to,sets:e.sets,lo:e.lo,hi:e.hi,rest:e.rest,ss:e.ss}), o={}; SNAP_KEYS.forEach(x=>{ if(n[x]!==undefined) o[x]=n[x] }); return o }).filter((e,i,a)=>a.findIndex(y=>y.id===e.id)===i)} }
  if(typeof clearDrafts==="function") clearDrafts(k,new RegExp("^((w|r|c|st)-"+from+"-\\d+|xs-"+from+")$"));
  const nl={...l,ex,db,...(plan?{plan}:{}),fixed:[...(l.fixed||[]),{from,to,at:Date.now()}],savedAt:Date.now()}; delete nl.prs;
  const prs=findPRs(k,nl); if(prs.length) nl.prs=prs;
  return saveLog(k,nl);
}
function fixRoutine(W){ const rs=(S.profile.setup&&S.profile.setup.routines)||[]; return rs.find(x=>x.id===W.day)||rs.find(x=>x.id==="r"+W.day) }
function fixRoutineOK(W){ if(CUSTOM){ const r=fixRoutine(W); return !!(r&&r.ex.some(x=>x.id===W.from)&&!r.ex.some(x=>x.id===W.to)) }
  const g=typeof gymDay==="function"&&gymDay(W.day,today); return !!(g&&g.ex&&g.ex.some(x=>x.id===W.from)) }
function doSwap(mode){ const W=SH, from=W.from, to=W.to, k=W.k;
  S.profile.swaps=S.profile.swaps||{}; const sw=S.profile.swaps; sw.once=sw.once||{}; sw.routine=sw.routine||[];
  if(mode==="fixonly"||mode==="fixroutine"){ const toName=(libEx(to)||{name:to}).name;
    const done=fixLoggedEx(k,from,to); if(!done){ xsClose(); return }
    if(mode==="fixroutine"&&fixRoutineOK(W)){
      if(CUSTOM){ const su=S.profile.setup, r=fixRoutine(W), e=r&&r.ex.find(x=>x.id===from); if(e){ const tm=(libEx(to)||{}).type==="t", wasT=(libEx(from)||{}).type==="t"; e.id=to; if(tm&&!wasT){e.lo=30;e.hi=60} else if(!tm&&wasT){e.lo=8;e.hi=12} su.at=Date.now() } xsClose(); commitPlan() }
      else { sw.routine.push({day:W.day,from,to,since:ymd(today)}); saveProfile(); xsClose() }
      lastRenderKey=""; render(); toast(`Fixed, and ${W.dayName} now uses ${toName}`); return }
    xsClose(); lastRenderKey=""; render(); toast(`Fixed: ${fmtShort(parseYmd(k))} now shows ${toName}`); return }
  if(mode==="once"){ sw.once[k]={...(sw.once[k]||{}),[from]:to}; saveProfile(); xsClose(); lastRenderKey=""; render(); toast("Swapped for this workout"); return }
  if(sw.once[k]&&sw.once[k][from]){ delete sw.once[k][from]; if(!Object.keys(sw.once[k]).length) delete sw.once[k] }
  if(CUSTOM){ const su=S.profile.setup, r=su.routines.find(x=>x.id===W.day); const e=r&&r.ex.find(x=>x.id===from);
    if(e){ const L=libEx(to), tm=L&&L.type==="t", wasT=(libEx(from)||{}).type==="t"; e.id=to; if(tm&&!wasT){e.lo=30;e.hi=60} else if(!tm&&wasT){e.lo=8;e.hi=12} su.at=Date.now() }
    xsClose(); commitPlan(); lastRenderKey=""; render(); toast(`${r?r.name:"Routine"} updated`); return }
  sw.routine.push({day:W.day,from,to,since:k}); saveProfile(); xsClose(); lastRenderKey=""; render(); toast(`${W.dayName} updated from ${fmtShort(parseYmd(k))} on`);
}
function swapsText(){ const sw=swapsOf(), L=id=>(libEx(id)||(typeof X!=="undefined"&&X[id])||{name:id}).name, out=[];
  (CUSTOM?sw.routine:[...BUILTIN_SWAPS,...sw.routine]).filter(r=>r.from).forEach(r=>out.push(`${CUSTOM&&CUSTOM.gym[r.day]?CUSTOM.gym[r.day].name:"Day "+r.day}: ${L(r.from)} → ${L(r.to)} from ${r.since}`));
  Object.entries(sw.once).filter(([k])=>k>=ymd(addDays(today,-14))).forEach(([k,m])=>Object.entries(m).forEach(([a,b])=>out.push(`${k} only: ${L(a)} → ${L(b)}`)));
  return out.length? `Exercise swaps they made in the app: ${out.join("; ")}.\n` : "" }

/* ======================= Move / swap / rest a session ======================= */
// Schedule changes live in profile.moves: {"YYYY-MM-DD": "rest" | "<date whose session happens on this day>"}
function dayMenu(p,k,log){ if(log||!p) return ""; const past=k<ymd(today);
  if(p.type==="rest") return past? "" : `<div class="row daymenu"><button type="button" class="link small" data-daymove="${k}|swap">Train today: swap with a workout day</button></div>`;
  return `<div class="row daymenu"><button type="button" class="link small" data-daymove="${k}|move">Move</button>${past?"":`<button type="button" class="link small" data-daymove="${k}|swap">Swap</button>`}<button type="button" class="link small" data-dayskip="${k}">Make it a rest day</button></div>` }
function weekResetBtn(k){ return Object.keys(S.profile.moves||{}).some(d=>weekDays(k).includes(d)&&!S.logs[d])? `<button type="button" class="link small" data-resetweek="${k}" style="align-self:flex-start">Undo this week's schedule changes</button>` : "" }
function srcOf(dk){ const mv=S.profile.moves||{}, v=mv[dk]; if(v==="rest") return null; if(v&&/^\d{4}-/.test(v)) return v; const b=basePlan(parseYmd(dk)); return b&&b.type!=="rest"? dk : null }
function setSrc(dk,src){ const mv=S.profile.moves=S.profile.moves||{}; const b=basePlan(parseYmd(dk)), own=b&&b.type!=="rest";
  if(src===dk||(src===null&&!own)) delete mv[dk]; else mv[dk]= src===null? "rest" : src }
function sessLabel(src){ if(!src) return "Rest"; const b=basePlan(parseYmd(src)); return !b?"Rest": b.type==="gym"? b.name : b.t }
function weekDays(k){ const mon=mondayOf(parseYmd(k)); return [...Array(7)].map((_,i)=>ymd(addDays(mon,i))) }
const dayName=d=>{ const dt=parseYmd(d); return `${DOW[(dt.getDay()+6)%7]} ${dt.getDate()}` };
// days a session can go to: today through the end of next week, not logged, inside the plan
function moveTargets(k){ const td=ymd(today), base=k>td?k:td, end=ymd(addDays(mondayOf(parseYmd(base)),13)), out=[];
  for(let d=parseYmd(td);ymd(d)<=end;d=addDays(d,1)){ const x=ymd(d); if(x!==k&&!S.logs[x]&&inProgram(d)) out.push(x) } return out }
function swapDays(a,b){ const sa=srcOf(a), sb=srcOf(b); setSrc(a,sb); setSrc(b,sa) }
function moveDay(from,to){ const sa=srcOf(from); setSrc(to,sa); setSrc(from,null) }
// sessions in the last week that were planned but never logged
function missedDays(){ const td=ymd(today), out=[]; for(let i=6;i>=1;i--){ const d=addDays(today,-i), k=ymd(d); if(d<countStart()||!inProgram(d)||S.logs[k]) continue; const p=planFor(d); if(p&&(p.type==="gym"||p.type==="run")) out.push(k) } return out }
function missedCard(){ const ms=missedDays(); if(!ms.length) return "";
  return `<div class="card missed"><div class="row between"><h2>Missed ${ms.length>1?"sessions":"a session"}</h2></div><p class="small muted">Move ${ms.length>1?"them":"it"} to a day that works, or make ${ms.length>1?"them rest days":"it a rest day"} so your week adds up.</p>
    ${ms.map(k=>`<div class="row between missrow"><span><b>${dayName(k)}</b> <span class="muted">· ${esc(sessLabel(srcOf(k)))}</span></span><span class="row" style="gap:12px"><button type="button" class="link small" data-daymove="${k}|move">Move</button><button type="button" class="link small" data-dayskip="${k}">Rest day</button></span></div>`).join("")}</div>` }
function moveHtml(){ const k=SH.k, mode=SH.mode||"move", src=srcOf(k), past=k<ymd(today), targets=moveTargets(k).filter(d=>mode!=="swap"||src||srcOf(d));
  if(SH.pick){ const t=SH.pick, other=sessLabel(srcOf(t));
    return `<div class="xs-head"><h2>${esc(dayName(t))} already has ${esc(other)}</h2><button type="button" class="btn ghost sm" data-xs-movepick="back">Back</button></div>
     <p class="small muted">What should happen to ${esc(other)}?</p>
     ${past?"":`<button type="button" class="swapopt" data-xs-movepick="swap"><b>Swap them</b><span>${esc(sessLabel(src))} on ${esc(dayName(t))}, ${esc(other)} on ${esc(dayName(k))}.</span></button>`}
     <button type="button" class="swapopt" data-xs-movepick="replace"><b>Replace it</b><span>${esc(sessLabel(src))} on ${esc(dayName(t))}. ${esc(other)} is skipped${past?"":` and ${esc(dayName(k))} becomes a rest day`}.</span></button>` }
  const wk=mondayOf(parseYmd(targets[0]||k)), thisWk=ymd(wk), item=d=>{ const s=srcOf(d); return `<button type="button" class="xs-item" data-xs-moveto="${d}"><span><b>${d===ymd(today)?"Today":dayName(d)}</b><span class="small muted">${esc(sessLabel(s))}</span></span><span class="xs-plus">${mode==="swap"?"⇄":"→"}</span></button>` };
  const a=targets.filter(d=>d<ymd(addDays(wk,7))), b=targets.filter(d=>d>=ymd(addDays(wk,7)));
  const title= mode==="swap"? (src?`Swap ${esc(sessLabel(src))} with…`:`Swap this rest day with…`) : `Move ${esc(sessLabel(src))} to…`;
  const sub= mode==="swap"? "The two days trade places." : past? `Pick a day for the session you missed on ${esc(dayName(k))}.` : `${esc(dayName(k))} becomes a rest day.`;
  return `<div class="xs-head"><h2>${title}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
   <p class="small muted">${sub}</p>
   ${a.length?`<div class="eyebrow">This week</div><div class="xs-list">${a.map(item).join("")}</div>`:""}
   ${b.length?`<div class="eyebrow">Next week</div><div class="xs-list">${b.map(item).join("")}</div>`:""}
   ${!a.length&&!b.length?`<p class="small muted">No open days left in your plan.</p>`:""}
   ${mode==="move"&&!past&&src?`<button type="button" class="swapopt" data-xs-pushweek="1"><b>Push the rest of the week back a day</b><span>${esc(dayName(k))} becomes a rest day and each session moves one day later.${(()=>{ const after=weekDays(k).filter(d=>d>=k&&!S.logs[d]), last=after[after.length-1]; return after.length>1&&srcOf(last)&&last!==k?` ${esc(sessLabel(srcOf(last)))} on ${DOW[(parseYmd(last).getDay()+6)%7]} drops off.`:"" })()}</span></button>`:""}
   ${Object.keys(S.profile.moves||{}).some(d=>weekDays(k).includes(d)&&!S.logs[d])?`<button type="button" class="btn ghost" data-xs-resetweek="1">Reset this week to the plan</button>`:""}`;
}

/* ======================= Exercise history & PRs ======================= */
function sessBest(id,l){ const sets=WS(l&&l.ex&&l.ex[id]); if(!sets.length) return 0; const L=libEx(id)||{}, timed=L.type==="t"||(sets[0].w==null&&sets[0].r);
  if(L.type==="tw") return Math.max(...sets.map(x=>(loadW(id,l,x.w)+1)*(Number(x.r)||0))); // weighted hold: weight × seconds
  return timed&&!sets.some(x=>x.w)? Math.max(...sets.map(x=>Number(x.r)||0)) : Math.max(...sets.map(x=>e1rm(loadW(id,l,x.w),Number(x.r)||0))) }
function priorBest(id,k){ let b=0; Object.entries(S.logs).forEach(([kk,l])=>{ if(kk<k&&l.type==="gym") b=Math.max(b,sessBest(id,l)) }); return b }
function findPRs(k,log){ return Object.keys(log.ex||{}).filter(id=>{ const now=sessBest(id,log), before=priorBest(id,k); return before>0&&now>before+0.01 }) }
function historyHtml(){ const id=SH.id, L=libEx(id)||(typeof X!=="undefined"&&X[id])||{name:SH.name||id};
  const rows=Object.entries(S.logs).filter(([k,l])=>l.type==="gym"&&l.ex&&l.ex[id]&&l.ex[id].length).sort((a,b)=>a[0]<b[0]?1:-1);
  const timed=L.type==="t"||(typeof X!=="undefined"&&X[id]&&X[id].bw), heldW=L.type==="tw";
  let best=null, heavy=null; rows.forEach(([k,l])=>{ const b=sessBest(id,l); if(!best||b>best.v) best={v:b,k}; WS(l.ex[id]).forEach(x=>{ const w=loadW(id,l,x.w); if(!timed&&(!heavy||w>heavy.w||(w===heavy.w&&x.r>heavy.r))) heavy={w,r:x.r,k,db:logDb(id,l),raw:x.w} }) });
  const series=liftSeries(id);
  let h=`<div class="xs-head"><h2>${esc(L.name)}</h2><button type="button" class="btn ghost sm" data-xs="close">Close</button></div>`;
  if(!rows.length) return h+`<p class="small muted">No sessions logged yet. Your history, best sets and PRs show up here.</p>`;
  const bestSet= heldW? (()=>{ let b=null; rows.forEach(([k,l])=>WS(l.ex[id]).forEach(x=>{ const v=(loadW(id,l,x.w)+1)*(Number(x.r)||0); if(!b||v>b.v) b={v,w:x.w,r:x.r} })); return b })() : null;
  h+=`<div class="statrow"><div><b class="num">${heldW&&bestSet?`${toU(bestSet.w||0)} ${uL()} × ${bestSet.r} s`:timed?Math.round(best.v)+" s":fmtN(toUd(best.v))+" "+uL()}</b><span>${heldW?"Best hold":timed?"Longest hold":"Best est. 1-rep max"}</span></div>${heavy&&!heldW?`<div><b class="num">${heavy.db?toU(heavy.raw)+"/DB":toU(heavy.w)} × ${heavy.r}</b><span>Heaviest set</span></div>`:""}<div><b class="num">${rows.length}</b><span>Sessions</span></div></div>`;
  if(series.length>1&&!timed&&!heldW) h+=`<div class="eyebrow">Estimated 1-rep max</div>${lineChart(series.map(x=>({...x,y:toUd(x.y)})),"var(--gym)",v=>Math.round(v),false)}`;
  h+=`<div class="eyebrow" style="margin-top:6px">History</div><div class="xs-list">${rows.map(([k,l])=>{ const pr=(l.prs||[]).includes(id), db=logDb(id,l);
    return `<div class="histrow"><div class="row between"><b>${fmtDate(parseYmd(k))}</b>${pr?`<span class="prbadge">PR</span>`:""}</div><div class="small num muted">${l.ex[id].map(x=>`${x.t==="w"?"W ":x.t==="d"?"D ":x.t==="g"?"G ":""}${x.w!=null&&!timed?`${toU(x.w)}${db?"/DB":""}×${x.r}${heldW?"s":""}`:`${x.r}s`}`).join(" · ")}</div></div>` }).join("")}</div>`;
  return h;
}

/* ======================= Units (data is always stored in lb) ======================= */
const KG=2.20462;
function UNIT(){ try{ return (userPrefs().unit==="kg")?"kg":"lb" }catch(e){ return "lb" } }
const uL=()=>UNIT();
// lift weights shown to the user, to 0.1 in either unit: what was logged is shown as logged, never rounded to plates
function toU(lb){ const n=Number(lb); if(lb===""||lb==null||!isFinite(n)) return lb; return UNIT()==="kg"? Math.round(n/KG*10)/10 : Math.round(n*10)/10 }
// an exercise's weight step in lb, in a size that makes sense in the unit you use (kg: nearest 0.5 kg)
const incU=inc=>UNIT()==="kg"? Math.max(0.5,Math.round(inc/KG*2)/2)*KG : inc;
const toUd=lb=>UNIT()==="kg"? Number(lb)/KG : Number(lb);     // unrounded, for charts, totals and rates
function fromU(v){ const n=Number(v); if(!isFinite(n)) return n; return UNIT()==="kg"? +(n*KG).toFixed(3) : n }
const incTxt=inc=>UNIT()==="kg"? `${Math.max(0.5,Math.round(inc/KG*2)/2)} kg` : `${inc} lb`;
function setUnit(u){ if(u===UNIT()) return; const from=UNIT();
  // typed-but-unsaved weights switch with you
  Object.keys(drafts).forEach(k=>{ if(/\|(w-|bwIn2?$|lvW)/.test(k)&&drafts[k]!==""&&isFinite(Number(drafts[k]))){ const lb= from==="kg"? Number(drafts[k])*KG : Number(drafts[k]); drafts[k]=String(u==="kg"? Math.round(lb/KG*10)/10 : Math.round(lb*10)/10) } }); persistDrafts();
  if(SUW&&SUW.weight){ const lb= from==="kg"? Number(SUW.weight)*KG : Number(SUW.weight); SUW.weight=String(u==="kg"? Math.round(lb/KG*10)/10 : Math.round(lb)) }
  setPref({unit:u}); lastRenderKey=""; render() }

/* ======================= Plate calculator ======================= */
const PLATES={lb:[45,35,25,10,5,2.5],kg:[25,20,15,10,5,2.5,1.25]};
const BARS={lb:[["Olympic bar",45],["EZ bar",25],["Smith machine",20],["Trap bar",55]],kg:[["Olympic bar",20],["EZ bar",10],["Smith machine",10],["Trap bar",25]]};
const BAR_EX={"Olympic bar":"bench","EZ bar":"ezcurl","Smith machine":"smithbench","Trap bar":"tbdl"};
function barKind(ex){ const L=libEx(ex&&ex.id)||{}; return ex&&ex.id==="tbdl"?"Trap bar":L.equip==="EZ bar"?"EZ bar":L.equip==="Smith machine"?"Smith machine":"Olympic bar" }
function barFor(ex){ const u=UNIT(), kind=barKind(ex), pr=((userPrefs().bars||{})[u]||{})[kind]; return {kind,w:pr!=null?pr:BARS[u].find(b=>b[0]===kind)[1]} }
function plateable(ex,db){ if(!ex||db||ex.bw||ex.optW) return false; const L=libEx(ex.id); return ex.id==="tbdl"||!!(L&&["Barbell","EZ bar","Smith machine"].includes(L.equip)) }
function platesFor(total,bar){ const u=UNIT(), have=(userPrefs().plates||{})[u]||PLATES[u]; let side=(Number(total)-bar)/2; if(!(side>0)) return {side:0,list:[],left:0};
  const list=[]; for(const p of [...have].sort((a,b)=>b-a)){ while(side>=p-1e-9){ list.push(p); side-=p } } return {side:(Number(total)-bar)/2,list,left:Math.round(side*100)/100} }
function platesText(total,ex){ const b=barFor(ex), u=uL(), n=Number(total); if(!(n>0)) return "";
  if(n<b.w) return `Less than the ${b.kind.toLowerCase()} (${b.w} ${u})`; if(n===b.w) return `Just the ${b.kind.toLowerCase()} (${b.w} ${u})`;
  const r=platesFor(n,b.w), grp={}; r.list.forEach(p=>grp[p]=(grp[p]||0)+1);
  return `Per side: ${Object.entries(grp).sort((a,b)=>b[0]-a[0]).map(([p,c])=>c>1?`${c}×${p}`:p).join(" + ")||"nothing"}${r.left>0?` (+${r.left} ${u} won't load)`:""} · ${b.kind} ${b.w}` }
function plateViz(list){ const H={45:46,25:42,35:44,20:44,15:40,10:32,5:26,2.5:20,1.25:16}; return `<div class="pviz"><i class="bar"></i>${list.map(p=>`<i class="pl" style="height:${H[p]||20}px">${p}</i>`).join("")}</div>` }
function platesHtml(){ const u=UNIT(), ex=SH.ex, b=barFor(ex), w=SH.w, r=platesFor(w,b.w), have=(userPrefs().plates||{})[u]||PLATES[u];
  return `<div class="xs-head"><h2>Plate calculator</h2><button type="button" class="btn ghost sm" data-xs="close">Done</button></div>
   <div class="row" style="gap:8px;flex-wrap:nowrap;align-items:center"><input class="xs-search" inputmode="decimal" data-xs-pw="1" value="${esc(w)}" data-xs-focus="pw" style="max-width:140px"><b>${u} total</b></div>
   <div class="plate-out">${!(Number(w)>0)?`<p class="small muted">Enter a weight.</p>`:Number(w)<=b.w?`<p>${esc(platesText(w,ex))}</p>`:`${plateViz(r.list)}<p><b>Each side:</b> ${r.list.join(" + ")||"nothing"}${r.left>0?` <span class="muted">(+${r.left} ${u} can't be loaded with your plates)</span>`:""}</p>`}</div>
   <div class="eyebrow">Bar</div><div class="xs-chips">${BARS[u].map(([n])=>`<button type="button" class="${b.kind===n?"on":""}" data-xs-bar="${n}">${n}</button>`).join("")}</div>
   <p class="small muted">${esc(b.kind)} weighs <input class="setnum" inputmode="decimal" data-xs-barw="${esc(b.kind)}" value="${b.w}"> ${u}</p>
   <div class="eyebrow">Plates you have</div><div class="xs-chips">${PLATES[u].map(p=>`<button type="button" class="${have.includes(p)?"on":""}" data-xs-plate="${p}">${p}</button>`).join("")}</div>` }

/* ======================= Account & settings ======================= */
function userPrefs(){ const local=(window.LOOK&&LOOK.read())||{}; const p=(S.profile&&S.profile.prefs)||{}; return {mode:"system",palette:"classic",sound:true,awake:true,...local,...p} }
function setPref(patch){ const cur={...userPrefs(),...patch}; if(window.LOOK) LOOK.save({mode:cur.mode,palette:cur.palette,sound:cur.sound,awake:cur.awake}); S.profile.prefs=cur; saveProfile(); }
function syncPrefs(){ const p=S.profile&&S.profile.prefs; if(p&&window.LOOK) LOOK.save(p) }
function accountName(){ const su=S.profile&&S.profile.setup; return (su&&su.name)||(window.appUserEmail&&appUserEmail().split("@")[0])||"You" }
function accountBtn(){ if(!window.__platform) return ""; const n=accountName(); return `<button type="button" class="acct" data-acct="1" aria-label="Account and settings">${esc((n[0]||"?").toUpperCase())}</button>` }
function accountHtml(){
  const pr=userPrefs(), P=window.LOOK?LOOK.presets:{}, email=window.appUserEmail?appUserEmail():"";
  const tog=(k,label,sub)=>`<label class="setrow"><span><b>${label}</b>${sub?`<span class="small muted">${sub}</span>`:""}</span><input type="checkbox" class="switch" data-acct-tog="${k}" ${pr[k]?"checked":""}></label>`;
  return `<div class="xs-head"><div class="acct-id"><span class="acct big">${esc((accountName()[0]||"?").toUpperCase())}</span><span><b>${esc(accountName())}</b>${email?`<span class="small muted">${esc(email)}</span>`:""}</span></div><button type="button" class="btn ghost sm" data-xs="close">Close</button></div>
   <h3>Appearance</h3>
   <div class="seg three">${[["system","System"],["light","Light"],["dark","Dark"]].map(([k,l])=>`<button type="button" class="${pr.mode===k?"on":""}" data-acct-mode="${k}" aria-pressed="${pr.mode===k}">${l}</button>`).join("")}</div>
   <div class="palettes">${Object.entries(P).map(([k,v])=>`<button type="button" class="pal ${pr.palette===k?"on":""}" data-acct-pal="${k}" aria-pressed="${pr.palette===k}"><span class="dots">${v.dots.map(c=>`<i style="background:${c}"></i>`).join("")}</span>${esc(v.name)}</button>`).join("")}</div>
   <h3>Units</h3>
   <div class="seg" style="grid-template-columns:1fr 1fr">${[["lb","Pounds (lb)"],["kg","Kilograms (kg)"]].map(([k,l])=>`<button type="button" class="${UNIT()===k?"on":""}" data-acct-unit="${k}" aria-pressed="${UNIT()===k}">${l}</button>`).join("")}</div>
   <h3>Workouts</h3>
   ${tog("sound","Rest timer sound","Beep when rest is over")}
   ${tog("awake","Keep screen on","While a workout timer is running")}
   <label class="setrow"><span><b>Resting heart rate</b><span class="small muted">Used for fitness estimates</span></span><input class="setnum" inputmode="numeric" data-acct-rhr="1" value="${esc(S.profile.restHr||"")}" placeholder="70"></label>
   ${stravaRows()}
   <h3>Account</h3>
   ${CUSTOM?`<button type="button" class="setlink" data-acct-edit="1">Edit plan & goals<span>›</span></button>`:""}
   <button type="button" class="setlink" data-acct-export="1">Download my data<span>›</span></button>
   <button type="button" class="btn ghost" data-acct-out="1" style="margin-top:8px">Sign out</button>`;
}
/* ----- Strava auto-import -----
   The server is the source of truth for "connected": on iPhone the Strava approval happens in a Safari sheet,
   so the app asks /api/strava-status when it opens and when it comes back to the foreground. */
let stravaBusy=false, stravaChecked=0;
const STRAVA_ERR={not_signed_in:"Sign in again, then connect Strava.",strava_keys_missing:"Setup: add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in Vercel, then redeploy.",
  strava_client_id_invalid:"Setup: STRAVA_CLIENT_ID in Vercel should be just the number from your Strava API page.",service_key_missing:"Setup: add SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.",
  service_key_is_anon:"Setup: SUPABASE_SERVICE_ROLE_KEY is set to the anon key. Use the service_role key instead.",service_key_invalid:"Setup: SUPABASE_SERVICE_ROLE_KEY in Vercel isn't valid. Copy the service_role key again.",
  table_missing:"Setup: run the Strava SQL in Supabase first.",database_error:"The database didn't answer. Try again in a minute.",rate_limited:"Strava is busy. Try again in 15 minutes.",
  revoked:"Strava access was removed. Connect again.",strava_error:"Strava didn't answer. Try again later.",network:"You're offline. Try again when you're connected."};
function stravaState(){ return (userPrefs().strava)||{} }
function setStrava(patch){ setPref({strava:{...stravaState(),...patch}}) }
async function api(path,opt){ const tok=window.appAuthToken? await appAuthToken() : null; let r;
  try{ r=await fetch(path,{...(opt||{}),headers:{...(tok?{authorization:"Bearer "+tok}:{})}}) }catch(e){ throw Object.assign(new Error("network"),{code:"network"}) }
  const j=await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error(j.code||"error"),{status:r.status,code:j.code||"strava_error"}); return j }
function stravaMsg(e){ return STRAVA_ERR[e&&e.code]||"Couldn't reach Strava. Try again." }
async function stravaConnect(){
  if(SH&&SH.kind==="account"){ SH.stravaErr=""; SH.connecting=true; paintSheet() }
  try{ const j=await api("/api/strava-start"); setStrava({pending:Date.now()}); if(SH&&SH.kind==="account"){ SH.connecting=false; paintSheet() } location.href=j.url }
  catch(e){ if(SH&&SH.kind==="account"){ SH.connecting=false; SH.stravaErr=stravaMsg(e); paintSheet() } else toast(stravaMsg(e)) } }
async function stravaDisconnect(){ try{ await api("/api/strava-disconnect",{method:"POST"}) }catch(e){ if(e.code==="network"){ toast(stravaMsg(e)); return } }
  setStrava({connected:false,pending:0,cursor:null,lastSync:null}); if(SH&&SH.kind==="account") paintSheet(); toast("Strava disconnected") }
async function stravaCheck(force){
  const ss=stravaState(); if(!force&&Date.now()-stravaChecked<20000) return; stravaChecked=Date.now();
  try{ const j=await api("/api/strava-status");
    if(j.connected&&!ss.connected){ setStrava({connected:true,pending:0}); toast("Strava connected. Importing your runs…"); stravaSync(true) }
    else if(!j.connected&&(ss.connected||ss.pending)){ setStrava({connected:false,pending:0}) }
    else if(j.connected&&(!ss.lastSync||Date.now()-ss.lastSync>30*60000)) stravaSync(false);
    if(SH&&SH.kind==="account") paintSheet();
  }catch(e){} }
// Strava activity → the same run breakdown a GPX file gives; runs without GPS/streams keep Strava's summary
function stravaToSt(run){ const S2=run.streams||{}, t0=Date.parse(run.start), k=String(run.startLocal||run.start||"").slice(0,10);
  let st=null;
  if(S2.time&&S2.time.length>=10&&isFinite(t0)){
    const pts=S2.time.map((sec,i)=>({t:t0+sec*1000,lat:S2.latlng&&S2.latlng[i]?S2.latlng[i][0]:null,lon:S2.latlng&&S2.latlng[i]?S2.latlng[i][1]:null,ele:S2.altitude?S2.altitude[i]:null,d:S2.distance?S2.distance[i]:null,hr:S2.heartrate?S2.heartrate[i]:null,cad:S2.cadence?S2.cadence[i]:null}));
    try{ st=trackFromPoints(pts,run.name) }catch(e){ st=null } }
  if(!st){ const mi=(Number(run.distance)||0)/1609.344; if(mi<0.05) return null; let cad=run.cadence; if(cad&&cad<120) cad*=2;
    st={name:String(run.name||"").slice(0,80),mi:+mi.toFixed(2),movingMin:run.moving?+(run.moving/60).toFixed(2):null,elapsedMin:run.elapsed?+(run.elapsed/60).toFixed(2):null,
      elevFt:run.elevM!=null?Math.round(run.elevM*3.28084):null,avgHr:run.avgHr?Math.round(run.avgHr):null,maxHr:run.maxHr?Math.round(run.maxHr):null,cad:cad?Math.round(cad):null,splits:[]} }
  st.src="strava"; st.stravaId=run.id; st.date=k; if(run.type==="VirtualRun") st.treadmill=true; return st }
async function stravaSync(manual){
  const ss=stravaState(); if(!ss.connected||stravaBusy) return; stravaBusy=true;
  if(SH&&SH.kind==="account"){ SH.syncing=true; SH.stravaErr=""; paintSheet() }
  let n=0, asks=0; const ana=[], got=[];
  try{
    let cursor=ss.cursor||Math.floor(START.getTime()/1000);
    for(let round=0;round<5;round++){
      const j=await api("/api/strava-sync?after="+Math.max(0,cursor-2*86400));
      (j.runs||[]).forEach(run=>{ got.push(run); cursor=Math.max(cursor,Math.floor(Date.parse(run.start)/1000)||0) });
      if(!j.more) break; cursor=Math.max(cursor,j.next||0) }
    // group by day, oldest first, skipping anything already recorded
    const byDay={};
    got.forEach(run=>{ const k=String(run.startLocal||run.start||"").slice(0,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||knownStrava(k).has(run.id)) return;
      const st=stravaToSt(run); if(!st) return; (byDay[k]=byDay[k]||[]).push(candidate(run,st)) });
    const inbox=stravaInbox(); let inboxChanged=false;
    for(const k of Object.keys(byDay).sort()){
      const fresh=byDay[k].sort((a,b)=>a.start<b.start?-1:1), log=S.logs[k], p=planFor(parseYmd(k)), gymDay=(log&&log.type==="gym")||(!log&&p&&p.type==="gym");
      if(log&&(log.type==="gym"||log.st)){                       // day already has its session → these are extras
        // a run you already imported from a GPX file shows up on Strava too: recognise it instead of adding it twice
        let same=null; if(log.st&&!log.st.stravaId) same=fresh.find(c=>sameRun(log,c));
        const add=fresh.filter(c=>c!==same).map(slim), upd={...log};
        if(same) upd.st={...log.st,stravaId:same.stravaId};
        if(add.length) upd.extraRuns=[...(log.extraRuns||[]),...add];
        if(same||add.length){ await saveLog(k,upd); n+=add.length } continue }
      const waiting=(inbox[k]&&inbox[k].runs)||[];
      if(gymDay||waiting.length+fresh.length>1||(inbox[k]&&inbox[k].allExtra)){ // let the user choose (gym days: extras)
        inbox[k]={runs:[...waiting,...fresh],allExtra:gymDay||!!(inbox[k]&&inbox[k].allExtra)}; inboxChanged=true; if(!gymDay) asks++; continue }
      const c=fresh[0]; await useStravaRun(k,c,[]); n++; if(k>=ymd(addDays(today,-7))) ana.push(k) }
    if(inboxChanged){ S.profile.stravaInbox=inbox; saveProfile() }
    setStrava({connected:true,pending:0,cursor,lastSync:Date.now()});
    if(asks) toast(asks===1?"More than one Strava run on a day. Pick which one counts on that day's card.":`Several days have more than one Strava run. Pick which one counts on each day.`);
    else if(n) toast(`Imported ${n} run${n>1?"s":""} from Strava`); else if(manual) toast("You're up to date with Strava");
    if(typeof analyzeRun==="function"&&sampleFn) ana.forEach((k,i)=>setTimeout(()=>analyzeRun(k),1500*(i+1)));
    if(n||inboxChanged){ lastRenderKey=""; render() }
  }catch(e){
    if(e.code==="not_connected"||e.code==="revoked") setStrava({connected:false,pending:0});
    if(SH&&SH.kind==="account") SH.stravaErr=stravaMsg(e); else if(manual||e.code==="revoked") toast(stravaMsg(e));
    if(n){ lastRenderKey=""; render() }
  }finally{ stravaBusy=false; if(SH&&SH.kind==="account"){ SH.syncing=false; paintSheet() } } }
/* ----- several Strava runs on one day: you choose which is the day's run, the rest become extra runs ----- */
function stravaInbox(){ return {...((S.profile&&S.profile.stravaInbox)||{})} }
function candidate(run,st){ return {stravaId:run.id,name:String(run.name||"Run").slice(0,80),start:run.startLocal||run.start,mi:st.mi,min:st.movingMin||st.elapsedMin,st} }
function knownStrava(k){ const ids=new Set(), l=S.logs[k], ib=((S.profile&&S.profile.stravaInbox)||{})[k];
  if(l&&l.st&&l.st.stravaId) ids.add(l.st.stravaId); (l&&l.extraRuns||[]).forEach(x=>ids.add(x.stravaId)); (ib&&ib.runs||[]).forEach(x=>ids.add(x.stravaId)); return ids }
function sameRun(log,c){ const a=Number(log.st.mi||log.mi)||0, b=Number(c.mi)||0, ta=Number(log.st.movingMin||log.st.elapsedMin||log.min)||0, tb=Number(c.min)||0;
  return a>0&&b>0&&Math.abs(a-b)/Math.max(a,b)<0.15&&(!ta||!tb||Math.abs(ta-tb)/Math.max(ta,tb)<0.2) }
const slim=c=>({stravaId:c.stravaId,name:c.name,start:c.start,mi:c.mi,min:c.min,avgHr:c.st&&c.st.avgHr||null,...(c.st&&c.st.best&&c.st.gps!==false&&!c.st.treadmill?{best:c.st.best}:{})});
async function useStravaRun(k,c,extras){
  const log=S.logs[k], p=planFor(parseYmd(k));
  const base=log||{type:"run",key:p&&p.type==="run"?p.key:"extra",rpe:"",notes:"Imported from Strava"};
  const extra=!(p&&p.type==="run")&&!(base.plan)? {plan:{type:"run",key:"extra",t:"Run",d:"Extra run · imported from Strava"}} : {};
  const xr=[...(log&&log.extraRuns||[]),...extras.map(slim)];
  await saveLog(k,{...base,...extra,type:"run",mi:base.mi||c.mi,min:base.min||c.min,st:c.st,...(xr.length?{extraRuns:xr}:{}),savedAt:Date.now()});
}
function stravaChooser(k,log){ const ib=((S.profile&&S.profile.stravaInbox)||{})[k]; if(!ib||!ib.runs||!ib.runs.length||ib.allExtra||(log&&log.st)) return "";
  const t=x=>{ const d=new Date(x.start); return isFinite(d)? d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",timeZone:"UTC"}) : "" };
  return `<div class="schoose"><b>Which Strava run is ${k===ymd(today)?"today's":"this day's"} run?</b><span class="small muted">The others are saved as extra runs on this day.</span>
    ${ib.runs.map(x=>`<button type="button" class="opt" data-spick="${k}|${x.stravaId}"><span><b>${esc(x.name)}</b><span class="small muted num">${t(x)} · ${x.mi} mi · ${x.min?fmtMin(x.min):"–"}${x.mi&&x.min?` · ${fmtMin(x.min/x.mi)}/mi`:""}</span></span><span class="xs-plus">✓</span></button>`).join("")}
    <button type="button" class="link small" data-snone="${k}" style="align-self:flex-start">They're all extra runs</button></div>` }
function extraRunsBlock(k,log){ const ib=((S.profile&&S.profile.stravaInbox)||{})[k];
  const list=[...(log&&log.extraRuns||[]),...(ib&&ib.allExtra?ib.runs.map(slim):[])]; if(!list.length) return "";
  return `<div class="xruns"><div class="eyebrow">Extra run${list.length>1?"s":""} this day</div>${list.map(x=>`<div class="xr"><span>${esc(x.name||"Run")}</span><span class="num muted">${x.mi} mi${x.min?` · ${fmtMin(x.min)}`:""}${x.avgHr?` · ${x.avgHr} bpm`:""}</span></div>`).join("")}</div>` }
// when a run is logged by hand, runs marked "all extra" come along as extras
function extrasForSave(k,log){ const ib=((S.profile&&S.profile.stravaInbox)||{})[k]; const xr=[...(log&&log.extraRuns||[])];
  if(ib&&ib.runs){ ib.runs.forEach(x=>{ if(!xr.some(y=>y.stravaId===x.stravaId)) xr.push(slim(x)) }); const inbox=stravaInbox(); delete inbox[k]; S.profile.stravaInbox=inbox; saveProfile() }
  return xr }
function maybeStravaInit(){ if(!window.__stravaInit&&window.__platform&&loaded.profile&&loaded.logs){ window.__stravaInit=true; stravaOnLoad() } }
function stravaOnLoad(){
  if(!(window.appConfig&&appConfig().strava)) return;
  const q=new URLSearchParams(location.search), r=q.get("strava");
  if(r){ history.replaceState(null,"",location.pathname); if(r!=="connected") toast(r==="denied"?"Strava connection cancelled.":r==="scope"?"Tick “View data about your activities” so runs can import.":r==="expired"?"That Strava link expired. Connect again.":"Strava didn't finish connecting. Try again.") }
  stravaCheck(true);
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ const ss=stravaState(); if(ss.pending&&Date.now()-ss.pending<30*60000) stravaCheck(true); else if(ss.connected) stravaCheck(false) } }) }
function stravaRows(){ if(!(window.appConfig&&appConfig().strava)) return ""; const ss=stravaState(), busy=SH&&SH.syncing;
  const err=SH&&SH.stravaErr?`<p class="note">${esc(SH.stravaErr)}</p>`:"";
  if(ss.connected) return `<h3>Strava</h3><div class="setrow"><span><b>Connected</b><span class="small muted">${busy?"Syncing…":ss.lastSync?"Last synced "+new Date(ss.lastSync).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Runs import automatically"}</span></span><span class="row" style="gap:6px;flex-wrap:nowrap"><button type="button" class="btn sm" data-acct-ssync="1" ${busy?"disabled":""}>Sync</button><button type="button" class="btn ghost sm" data-acct-sdisc="1">Disconnect</button></span></div>${err}`;
  if(ss.pending&&Date.now()-ss.pending<30*60000) return `<h3>Strava</h3><div class="setrow"><span><b>Finishing on Strava…</b><span class="small muted">Approve on the Strava screen, then come back here.</span></span><button type="button" class="btn sm" data-acct-scheck="1">Check</button></div><button type="button" class="link small" data-acct-sconn="1">Start over</button>${err}`;
  return `<h3>Strava</h3><button type="button" class="setlink" data-acct-sconn="1" ${SH&&SH.connecting?"disabled":""}>${SH&&SH.connecting?"Opening Strava…":"Connect Strava"}<span>›</span></button><p class="small muted">Runs you record on Strava import by themselves, with pace, splits and heart rate.</p>${err}` }

// Strava where runs happen, not only in the account sheet
const STRAVA_MARK=`<svg viewBox="0 0 24 24" aria-hidden="true" class="sv-mark"><path fill="#FC4C02" d="M10.1 1 4.3 12.4h3.5l2.3-4.5 2.2 4.5h3.5z"/><path fill="#FC4C02" opacity=".6" d="m15.8 12.4-1.7 3.4-1.8-3.4H9.8l4.3 8.4 4.2-8.4z"/></svg>`;
function stravaPrompt(where){
  if(!(window.appConfig&&appConfig().strava)) return ""; const ss=stravaState();
  if(ss.connected||(ss.pending&&Date.now()-ss.pending<30*60000)) return "";
  if(where==="home"&&userPrefs().stravaHide) return "";
  return `<div class="strava-cta">${STRAVA_MARK}<div style="flex:1;min-width:0"><b>Record runs on Strava?</b><div class="small muted">Connect it once and your runs import by themselves, with the route, splits and heart rate.</div>
    <div class="row" style="margin-top:8px;gap:10px;align-items:center"><button type="button" class="btn sm" data-strava-go="1">Connect Strava</button>${where==="home"?'<button type="button" class="link small" data-strava-hide="1">Not now</button>':""}</div></div></div>` }
function exportData(){ const data={exportedAt:new Date().toISOString(),profile:S.profile,logs:S.logs,meals:S.meals,photos:S.photos,chat:S.chat,advice:S.advice};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=`training-data-${ymd(today)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000) }

/* ======================= Event handling (delegated) ======================= */
function numIn(v){ const n=Number(String(v).replace(/,/g,"")); return isFinite(n)?n:0 }
document.addEventListener("click",e=>{
  const t=e.target.closest&&e.target.closest("button,[data-xs]"); if(!t) return; const d=t.dataset;
  // --- Strava: pick the day's run
  if(d.spick){ const [k,id]=d.spick.split("|"), ib=stravaInbox()[k]; if(!ib) return; const c=ib.runs.find(x=>String(x.stravaId)===id); if(!c) return;
    const others=ib.runs.filter(x=>x!==c), inbox=stravaInbox(); delete inbox[k]; S.profile.stravaInbox=inbox; saveProfile();
    useStravaRun(k,c,others).then(()=>{ lastRenderKey=""; render(); toast(others.length?`Logged ${c.name}. ${others.length} extra run${others.length>1?"s":""} saved.`:`Logged ${c.name}`); if(typeof analyzeRun==="function"&&sampleFn) setTimeout(()=>analyzeRun(k),800) }); return }
  if(d.snone){ const inbox=stravaInbox(); if(inbox[d.snone]){ inbox[d.snone]={...inbox[d.snone],allExtra:true}; S.profile.stravaInbox=inbox; saveProfile(); lastRenderKey=""; render(); toast("Saved as extra runs. Log today's run when you do it.") } return }
  // --- swaps
  if(d.swap){ const p=planFor(sel), ex=p&&p.ex&&p.ex.find(e=>e.id===d.swap); if(!ex) return;
    openSheet({kind:"swap",from:ex.id,fromName:ex.name,day:p.day,dayName:(p.name||("Day "+p.day)).split(" · ")[0],k:ymd(sel),q:"",mu:muscleOfEx(ex.id),fix:!!S.logs[ymd(sel)]}); return }
  if(d.swapundo){ const sw=swapsOf(), k=ymd(sel), m=S.profile.swaps&&S.profile.swaps.once&&S.profile.swaps.once[k]; if(m){ Object.keys(m).forEach(f=>{ if(m[f]===d.swapundo) delete m[f] }); if(!Object.keys(m).length) delete S.profile.swaps.once[k]; saveProfile(); lastRenderKey=""; render(); toast("Swap undone") } return }
  // --- workout screen
  if(d.unitflip){ setUnit(UNIT()==="kg"?"lb":"kg"); return }
  if(d.plates){ const [id,w]=d.plates.split("|"), p=planFor(sel), ex=(p&&p.ex&&p.ex.find(e=>e.id===id))||{id}; openSheet({kind:"plates",ex,w:w||""}); return }
  if(d.settype){ const [id,i]=d.settype.split("|"), k=ymd(sel), key=dkey(k,`st-${id}-${i}`), cur=setTypeK(k,id,i); drafts[key]=cur===""?"w":cur==="w"?"d":""; /* Gate sets are recognised automatically now */ persistDrafts(); lastRenderKey=""; render(); return }
  if(d.addset){ const k=ymd(sel), key=dkey(k,`xs-${d.addset}`); drafts[key]=(Number(drafts[key])||0)+1; persistDrafts(); lastRenderKey=""; render(); return }
  if(d.rmset){ const k=ymd(sel), key=dkey(k,`xs-${d.rmset}`), n=Number(drafts[key])||0; if(n>0){ const ex=(planFor(sel).ex||[]).find(e=>e.id===d.rmset), last=ex?setCount(ex,k)-1:-1; ["w","r","c","st"].forEach(f=>delete drafts[dkey(k,`${f}-${d.rmset}-${last}`)]); drafts[key]=n-1; if(!drafts[key]) delete drafts[key]; persistDrafts(); lastRenderKey=""; render() } return }
  if(d.addex){ openSheet({kind:"swap",adding:true,k:d.addex,q:"",mu:""}); return }
  if(d.addrm){ const k=ymd(sel), sw=S.profile.swaps, a=sw&&sw.add&&sw.add[k]; if(a){ sw.add[k]=a.filter(x=>x.id!==d.addrm); if(!sw.add[k].length) delete sw.add[k]; saveProfile(); lastRenderKey=""; render() } return }
  if(d.openlive){ openLive(); return }
  if(d.resetweek){ const mv=S.profile.moves||{}; weekDays(d.resetweek).forEach(x=>{ if(!S.logs[x]) delete mv[x] }); saveProfile(); lastRenderKey=""; render(); toast("Week reset to the plan"); return }
  if(d.daymove){ const [k,m]=d.daymove.split("|"); openSheet({kind:"move",k,mode:m||"move"}); return }
  if(d.dayskip){ if(t.dataset.armed){ const lab=sessLabel(srcOf(d.dayskip)); setSrc(d.dayskip,null); saveProfile(); lastRenderKey=""; render(); toast(`${lab} skipped. ${dayName(d.dayskip)} is a rest day`) } else { const was=t.textContent; t.dataset.armed="1"; t.textContent="Tap again to confirm"; setTimeout(()=>{ if(t.isConnected){ delete t.dataset.armed; t.textContent=was } },3000) } return }
  if(d.exhist){ const p=planFor(sel), ex=p&&p.ex&&p.ex.find(e=>e.id===d.exhist); openSheet({kind:"hist",id:d.exhist,name:ex&&ex.name}); return }
  // --- account
  if(d.acct){ openSheet({kind:"account"}); if(window.appConfig&&appConfig().strava) stravaCheck(false); return }
  if(d.acctUnit){ setUnit(d.acctUnit); paintSheet(); return }
  if(d.acctMode){ setPref({mode:d.acctMode}); paintSheet(); return }
  if(d.acctPal){ setPref({palette:d.acctPal}); paintSheet(); return }
  if(d.acctEdit){ xsClose(); setupOpen=true; SUW=null; render(); window.scrollTo(0,0); return }
  if(d.acctExport){ exportData(); return }
  if(d.acctSconn||d.stravaGo){ stravaConnect(); return }
  if(d.stravaHide){ setPref({stravaHide:Date.now()}); lastRenderKey=""; render(); toast("Hidden. You can connect any time from your account."); return }
  if(d.acctSsync){ stravaSync(true); return }
  if(d.acctSdisc){ stravaDisconnect(); return }
  if(d.acctScheck){ stravaCheck(true); return }
  if(d.acctOut){ xsClose(); if(window.appSignOut) appSignOut(); return }
  // --- routine editor
  if(d.cGotoplan){ tab="plan"; planView="training"; try{localStorage.setItem("rd25-tab","plan")}catch(_){} render(); window.scrollTo(0,0); return }
  if(d.cRopen){ R_OPEN.has(d.cRopen)?R_OPEN.delete(d.cRopen):R_OPEN.add(d.cRopen); render(); return }
  if(d.cAdd){ openSheet({kind:"exPick",rid:d.cAdd,q:"",mu:""}); return }
  if(d.cSs){ const [rid,i]=d.cSs.split("|"); suMut(su=>{ const r=su.routines.find(x=>x.id===rid), ix=+i, e=r.ex[ix];
      if(e.ss){ const g=e.ss; delete e.ss; const left=r.ex.filter(x=>x.ss===g); if(left.length<2) left.forEach(x=>delete x.ss) }
      else if(r.ex[ix+1]){ const nx=r.ex[ix+1], g=nx.ss||(r.ex[ix-1]&&r.ex[ix-1].ss)||newId("s"); e.ss=g; nx.ss=g } }); return }
  if(d.cMv){ const [rid,i,dir]=d.cMv.split("|"); suMut(su=>{const r=su.routines.find(x=>x.id===rid), a=+i, b=a+ +dir; if(b<0||b>=r.ex.length) return; [r.ex[a],r.ex[b]]=[r.ex[b],r.ex[a]]}); return }
  if(d.cRm){ const [rid,i]=d.cRm.split("|"); suMut(su=>{const r=su.routines.find(x=>x.id===rid); r.ex.splice(+i,1)}); return }
  if(d.cSets){ const [rid,i,dir]=d.cSets.split("|"); suMut(su=>{const x=su.routines.find(r=>r.id===rid).ex[+i]; x.sets=Math.max(1,Math.min(10,(x.sets||3)+ +dir))}); return }
  if(d.cRdel){ suMut(su=>{su.routines=su.routines.filter(r=>r.id!==d.cRdel); su.week=su.week.map(w=>w===d.cRdel?"rest":w)}); return }
  if(d.cRnew){ suMut(su=>{const n=su.routines.length; const id=newId("r"); R_OPEN.add(id); su.routines.push({id,name:"Workout "+"ABCDEFGHIJ"[n%10],ex:[]})}); return }
  if(d.cTpl){ if(SH_CONFIRM!==d.cTpl){ SH_CONFIRM=d.cTpl; render(); return } SH_CONFIRM=""; suMut(su=>{const x=splitToSetup(d.cTpl); su.routines=x.routines; const runs=su.week.map((w,i)=>w==="run"?i:-1).filter(i=>i>=0); su.week=x.week.map((w,i)=>w==="rest"&&runs.includes(i)?"run":w)}); toast("Routines replaced"); return }
  // --- food (home diary + plan)
  if(d.cFood!=null){ const [k,slot]=d.cFood.split("|"); openSheet({kind:"food",mode:"diary",k,slot,q:""}); return }
  if(d.cFdel){ const [k,i]=d.cFdel.split("|"); const m=S.meals[k]; if(!m) return; m.items=(m.items||[]).filter((_,j)=>j!==+i); saveMeals(k); lastRenderKey=""; render(); return }
  if(d.cFplan){ const [k,sk]=d.cFplan.split("|"); const m=S.meals[k]||(S.meals[k]={eaten:{},extras:[]}); m.items=m.items||[];
    (kitchen().plan[sk]||[]).forEach(e=>{const M=entryMacros(e); if(M) m.items.push({slot:sk,n:M.name,amt:M.amount,kcal:Math.round(M.m.kcal),p:+M.m.p.toFixed(1),c:+M.m.c.toFixed(1),f:+M.m.f.toFixed(1),src:e,planned:true})});
    saveMeals(k); lastRenderKey=""; render(); toast("Logged"); return }
  if(d.cFcopy){ const [k,sk]=d.cFcopy.split("|"), yk=ymd(addDays(parseYmd(k),-1)), m=S.meals[k]||(S.meals[k]={eaten:{},extras:[]}); m.items=m.items||[];
    ((S.meals[yk]||{}).items||[]).filter(x=>x.slot===sk).forEach(x=>{ const {planned,...rest}=x; m.items.push({...rest}) }); saveMeals(k); lastRenderKey=""; render(); toast("Copied from yesterday"); return }
  if(d.cPadd){ openSheet({kind:"food",mode:"plan",slot:d.cPadd,tab:"meals",q:""}); return }
  if(d.cPrm){ const [sk,i]=d.cPrm.split("|"); kitchen().plan[sk].splice(+i,1); commitPlan(); return }
  if(d.cRec!=null){ const r=d.cRec? kitchen().recipes.find(x=>x.id===d.cRec) : null; openSheet({kind:"recipe",isNew:!r,r:r?JSON.parse(JSON.stringify(r)):{id:newId("rc"),name:"",servings:4,items:[]}}); return }
  if(d.cCf!=null){ const f=d.cCf? kitchen().foods.find(x=>x.id===d.cCf) : null; openSheet({kind:"cfood",isNew:!f,d:f?{...f}:{id:newId("cf"),n:"",serving:"1 serving",k:"",p:"",c:"",f:""}}); return }
  if(d.cGroclr){ S.profile.grocery={}; saveProfile(); render(); return }
  if(d.cShopfromplan){ shopFromPlan(); return }
  if(d.cAutogen){ genStart(); return }
  if(d.formcheck!=null){ formOpen(d.formcheck); return }
  if(d.cGenhide){ kitchen().genHide=1; commitPlan(); return }
  if(d.cShopedit!=null){ shopEdit=d.cShopedit||null; lastRenderKey=""; render(); return }
  if(d.cShopclr){ const g={...(S.profile.grocery||{})}; Object.keys(g).forEach(k=>{ if(k.startsWith(d.cShopclr+"-")) delete g[k] }); S.profile.grocery=g; saveProfile(); lastRenderKey=""; render(); return }
  if(d.cShopitem!=null){ const [lid,iid]=d.cShopitem.split("|"), l=shopOf().lists.find(x=>x.id===lid), it=iid&&l&&l.items.find(x=>x.id===iid);
    openSheet({kind:"shopItem",listId:lid,itemId:iid||null,name:it?it.name:"",amt:it&&it.amt!=null?String(it.amt):"",unit:it?it.unit||"":"",note:it?it.note||"":""}); return }
  if(d.cShoplist!=null){ const l=d.cShoplist&&shopOf()&&shopOf().lists.find(x=>x.id===d.cShoplist); openSheet({kind:"shopList",listId:l?l.id:null,name:l?l.name:"",steps:l?(l.steps||[]).join("\n"):""}); return }
  if(d.cShopsched){ const sh=shopOf(); openSheet({kind:"shopSched",day:sh.day||0,cycle:[...(sh.cycle&&sh.cycle.length?sh.cycle:[sh.lists[0].id])],pos:Math.max(0,shopCycleIdx(sh,nextShopDay(sh)))}); return }
  if(d.cGscan){ const R=SHOPKEYS[d.cGscan]||{key:d.gkey||d.cGscan,name:d.gkey||d.cGscan,need:null}; openSheet({kind:"gscan",key:R.key,name:R.name,need:R.need,view:linkFor(R.key)?"home":"scan"}); if(SH.view==="scan") startScanG(); return }
  // --- sheet
  if(!SH) return;
  if(d.xs==="close"){ xsClose(); return }
  if(d.xsMu!=null){ SH.mu=d.xsMu; paintSheet(); return }
  if(d.xsAddday){ const k=SH.k, L=libEx(d.xsAddday), tm=L&&L.type==="t"; S.profile.swaps=S.profile.swaps||{}; const sw=S.profile.swaps; sw.add=sw.add||{}; sw.add[k]=[...(sw.add[k]||[]),{id:d.xsAddday,sets:3,lo:tm?30:8,hi:tm?60:12,rest:L&&L.type==="w"&&["Barbell","Smith machine"].includes(L.equip)?150:90}];
    saveProfile(); lastRenderKey=""; render(); paintSheet(); toast("Added to today"); return }
  if(d.xsBar){ SH.ex={id:BAR_EX[d.xsBar]}; paintSheet(); return }
  if(d.xsPlate){ const u=UNIT(), p=Number(d.xsPlate), plates={...(userPrefs().plates||{})}; const have=new Set(plates[u]||PLATES[u]); have.has(p)?have.delete(p):have.add(p); plates[u]=[...have]; setPref({plates}); paintSheet(); return }
  if(d.xsMoveto){ const k=SH.k, to=d.xsMoveto, a=srcOf(k), b=srcOf(to);
    if(SH.mode==="swap"){ swapDays(k,to); saveProfile(); xsClose(); lastRenderKey=""; render(); toast(`${dayName(k)} and ${dayName(to)} swapped`); return }
    if(b){ SH.pick=to; paintSheet(true); return }
    moveDay(k,to); saveProfile(); xsClose(); lastRenderKey=""; render(); toast(`${sessLabel(a)} moved to ${dayName(to)}`); return }
  if(d.xsMovepick){ const k=SH.k, to=SH.pick, a=srcOf(k), b=srcOf(to);
    if(d.xsMovepick==="back"){ SH.pick=null; paintSheet(true); return }
    if(d.xsMovepick==="swap") swapDays(k,to); else moveDay(k,to);
    saveProfile(); xsClose(); lastRenderKey=""; render(); toast(d.xsMovepick==="swap"?`${dayName(k)} and ${dayName(to)} swapped`:`${sessLabel(a)} moved to ${dayName(to)}. ${sessLabel(b)} skipped`); return }
  if(d.xsPushweek){ const days=weekDays(SH.k).filter(x=>x>=SH.k&&!S.logs[x]), srcs=days.map(srcOf); days.forEach((x,i)=>setSrc(x,i===0?null:srcs[i-1])); saveProfile(); xsClose(); lastRenderKey=""; render(); toast("Week pushed back a day"); return }
  if(d.xsResetweek){ const mv=S.profile.moves||{}; weekDays(SH.k).forEach(x=>{ if(!S.logs[x]) delete mv[x] }); saveProfile(); xsClose(); lastRenderKey=""; render(); toast("Week reset to the plan"); return }
  if(d.xsSwapto){ SH.to=d.xsSwapto; paintSheet(true); return }
  if(d.xs==="swapback"){ SH.to=null; paintSheet(true); return }
  if(d.xsSwapmode){ doSwap(d.xsSwapmode); return }
  if(d.xs==="swapnew"){ SH.back=SH.kind; SH.kind="exNew"; SH.d=null; paintSheet(true); return }
  if(d.xsTab){ SH.tab=d.xsTab; SH.q=""; paintSheet(true); return }
  if(d.xsSlot){ SH.slot=d.xsSlot; paintSheet(); return }
  if(d.xsEx){ const id=d.xsEx; suMut(su=>{const r=su.routines.find(x=>x.id===SH.rid); const i=r.ex.findIndex(x=>x.id===id); if(i>=0) r.ex.splice(i,1); else { const L=libEx(id), tm=L&&L.type==="t"; r.ex.push({id,sets:3,lo:tm?30:8,hi:tm?60:12,rest:L&&L.type==="w"&&["Barbell","Smith machine"].includes(L.equip)?150:90}) }}); paintSheet(); return }
  if(d.xs==="exnew"){ SH.kind="exNew"; SH.d=null; paintSheet(true); return }
  if(d.xs==="exback"){ SH.kind=SH.back==="swap"?"swap":"exPick"; paintSheet(true); return }
  if(d.xs==="exsave"){ const x=SH.d; if(!x.name.trim()){ const er=document.querySelector("[data-xs-err]"); er.textContent="Give the exercise a name."; er.hidden=false; return }
    const id=newId("cx");
    if(SH.back==="swap"){ S.profile.customEx=S.profile.customEx||[]; S.profile.customEx.push({id,name:x.name.trim().slice(0,60),muscle:x.muscle,equip:x.equip,type:x.type}); saveProfile(); SH.kind="swap"; SH.to=id; paintSheet(true); return }
    suMut(su=>{su.customEx=su.customEx||[]; su.customEx.push({id,name:x.name.trim().slice(0,60),muscle:x.muscle,equip:x.equip,type:x.type}); su.routines.find(r=>r.id===SH.rid).ex.push({id,sets:3,lo:x.type==="t"?30:8,hi:x.type==="t"?60:12,rest:90})});
    SH.kind="exPick"; paintSheet(true); toast("Exercise added"); return }
  if(d.xsRecent!=null){ const r=recentFoods()[+d.xsRecent]; if(!r) return;
    if(r.src&&(r.src.t==="r"||r.src.t==="f")&&(r.src.t==="r"?kitchen().recipes.some(x=>x.id===r.src.id):foodById(r.src.id))){ SH.pick=r.src.t==="r"?{t:"r",id:r.src.id,qty:r.src.qty}:{t:"f",id:r.src.id,amt:r.src.amt,unit:r.src.unit}; paintSheet(true); return }
    if(SH.mode==="plan"){ toast("Quick-add entries can't go in the plan"); return }
    const m=S.meals[SH.k]||(S.meals[SH.k]={eaten:{},extras:[]}); m.items=m.items||[]; const {count,planned,...x}=r; m.items.push({...x,slot:SH.slot}); saveMeals(SH.k); xsClose(); lastRenderKey=""; render(); toast("Added"); return }
  if(d.xs==="sisave"){ const W=SH, K=kitchen(), l=K.shop.lists.find(x=>x.id===W.listId), name=(W.name||"").trim().slice(0,60); if(!name){ toast("Add the item name"); return }
    const amt=numIn(W.amt), it={name,amt:amt>0?amt:null,unit:amt>0?W.unit||"":"",note:(W.note||"").trim().slice(0,60)};
    if(W.itemId){ const x=l.items.find(y=>y.id===W.itemId); Object.assign(x,it) } else l.items.push({id:newId("it"),...it});
    saveProfile(); xsClose(); lastRenderKey=""; render(); toast(W.itemId?"Saved":"Added"); return }
  if(d.xs==="sidel"){ if(!SH.delConfirm){ SH.delConfirm=true; paintSheet(); return } const K=kitchen(), l=K.shop.lists.find(x=>x.id===SH.listId); l.items=l.items.filter(x=>x.id!==SH.itemId); saveProfile(); xsClose(); lastRenderKey=""; render(); toast("Deleted"); return }
  if(d.xs==="slsave"){ const W=SH, K=kitchen(), name=(W.name||"").trim().slice(0,40); if(!name){ toast("Name the list"); return }
    const steps=String(W.steps||"").split("\n").map(x=>x.trim()).filter(Boolean);
    K.shop=K.shop||{day:0,start:ymd(nextShopDay({day:0})),cycle:[],lists:[]};
    if(W.listId){ const l=K.shop.lists.find(x=>x.id===W.listId); l.name=name; l.steps=steps }
    else { const id=newId("sl"); K.shop.lists.push({id,name,items:[],steps}); if(!K.shop.cycle.length) K.shop.cycle=[id]; shopEdit=id }
    saveProfile(); xsClose(); lastRenderKey=""; render(); toast(W.listId?"Saved":"List made. Add your items"); return }
  if(d.xs==="sldel"){ if(!SH.delConfirm){ SH.delConfirm=true; paintSheet(); return } const K=kitchen(), id=SH.listId; K.shop.lists=K.shop.lists.filter(x=>x.id!==id); K.shop.cycle=K.shop.cycle.map(x=>x===id?"":x); if(shopEdit===id) shopEdit=null; saveProfile(); xsClose(); lastRenderKey=""; render(); toast("List deleted"); return }
  if(d.xs==="ssadd"){ SH.cycle.push(shopOf().lists[0].id); paintSheet(); return }
  if(d.xsSsrm!=null){ SH.cycle.splice(+d.xsSsrm,1); SH.pos=Math.min(SH.pos,SH.cycle.length-1); paintSheet(); return }
  if(d.xs==="sssave"){ const W=SH, K=kitchen(), nd=nextShopDay({day:W.day}); K.shop.day=W.day; K.shop.cycle=[...W.cycle]; K.shop.start=ymd(addDays(nd,-7*W.pos)); saveProfile(); xsClose(); lastRenderKey=""; render(); toast("Schedule saved"); return }
  if(SH.kind==="form"){
    if(d.xs==="formagain"){ if(SH.track) URL.revokeObjectURL(SH.track.url); SH.step="pick"; SH.err=""; SH.track=null; SH.res=null; paintSheet(true); return }
    if(d.xs==="formchat"){ xsClose(); tab="advice"; advView="advice"; lastRenderKey=""; render(); setTimeout(()=>{ const ta=document.getElementById("chatIn"); if(ta){ ta.value="About that form check: "; ta.focus(); ta.scrollIntoView({block:"center"}) } },60); return } }
  if(SH.kind==="autogen"){ const f=SH.f;
    if(d.xsGstyle){ const k=d.xsGstyle; f.styles=f.styles.includes(k)? f.styles.filter(x=>x!==k) : [...f.styles,k]; paintSheet(); return }
    if(d.xsGcook){ f.cook=d.xsGcook; paintSheet(); return }
    if(d.xsGslot){ f.slots={...f.slots,[d.xsGslot]:f.slots[d.xsGslot]?0:1}; paintSheet(); return }
    if(d.xsGavoid){ const k=d.xsGavoid, v=f.avoid[k], nx= !v? "avoid" : v==="avoid"? "allergy" : null; f.avoid={...f.avoid}; if(nx) f.avoid[k]=nx; else delete f.avoid[k]; paintSheet(); return }
    if(d.xs==="genrun"){ genRun(); return }
    if(d.xs==="genform"){ SH.step="form"; paintSheet(true); return }
    if(d.xs==="genuse"){ genApply(t.dataset.mode||"replace"); return } }
  if(d.xs==="glookup"){ stopScan(); const inp=document.querySelector("[data-xs-code]"); gLookup(inp?inp.value:SH.code); return }
  if(d.xs==="gmanual"){ stopScan(); gEditFrom(null); paintSheet(true); return }
  if(d.xs==="gscanagain"){ SH.view="scan"; SH.scanErr=""; SH.lookErr=""; paintSheet(true); startScanG(); return }
  if(d.xs==="gedit"){ const L=linkFor(SH.key); gEditFrom(L); SH.code=L&&L.code||SH.code; paintSheet(true); return }
  if(d.xs==="grm"){ const K=kitchen(), m=(K.products||{})[SH.key]; if(m){ delete m[storeName()]; saveProfile() } xsClose(); lastRenderKey=""; render(); toast("Removed"); return }
  if(d.xs==="gsave"){ const W=SH, q=numIn(W.eq), b=q>0&&gBase(q,W.eu), name=(W.pname||"").trim();
    if(!name){ toast("Add the product name"); return } if(!b){ toast("Enter the package size"); return }
    const K=kitchen(), st=storeName(), pack={qty:+b.v.toFixed(2),unit:b.d,txt:gFmt(q,W.eu)};
    K.products=K.products||{}; K.products[W.key]={...(K.products[W.key]||{}),[st]:{code:W.code||null,name,pack,at:Date.now()}};
    if(W.code){ K.barcodes=K.barcodes||{}; K.barcodes[W.code]={name,pack}; shareBarcode({code:W.code,name,pack}) }
    saveProfile(); xsClose(); lastRenderKey=""; render(); const pl=packPlan(W.need,pack); toast(pl?`Saved: buy ${pl.n} at ${st}`:`Saved for ${st}`); return }
  if(d.xs==="gstoresave"){ const inp=document.querySelector("[data-xs-gstore]"), name=(inp&&inp.value||"").trim().slice(0,40); if(!name){ toast("Enter a store name"); return }
    const K=kitchen(), st=storesOf(); K.stores=st.includes(name)? st : [...(K.stores&&K.stores.length?K.stores:["My store"]).filter(x=>!(x==="My store"&&!Object.values(K.products||{}).some(m=>m["My store"]))),name]; K.store=name; saveProfile(); xsClose(); lastRenderKey=""; render(); toast(`Shopping at ${name}`); return }
  if(d.xs==="scan"){ SH.view="scan"; SH.scanErr=""; SH.lookErr=""; paintSheet(true); startScan(); return }
  if(d.xs==="scanback"){ stopScan(); SH.view=null; paintSheet(true); return }
  if(d.xs==="scanadd"){ const A=SH.lookAdd||{}, back=SH; stopScan(); openSheet({kind:"cfood",isNew:true,back,d:{id:newId("cf"),n:A.name||"",serving:"1 serving",k:"",p:"",c:"",f:"",code:A.code}}); return }
  if(d.xs==="lookup"){ stopScan(); const inp=document.querySelector("[data-xs-code]"); lookupCode(inp?inp.value:SH.code); return }
  if(d.xsPickr){ SH.pick={t:"r",id:d.xsPickr,qty:1}; paintSheet(true); return }
  if(d.xsPickf){ const f=foodById(d.xsPickf); keepUsda(f); SH.pick={t:"f",id:f.id,amt:1,unit:unitsOf(f)[0][0]}; paintSheet(true); return }
  if(d.xs==="fback"){ SH.pick=null; paintSheet(true); return }
  if(d.xs==="fadd"){ const P=SH.pick, e=P.t==="r"?{t:"r",id:P.id,qty:numIn(P.qty)}:{t:"f",id:P.id,amt:numIn(P.amt),unit:P.unit}; if(!(e.qty>0||e.amt>0)){ toast("Enter an amount above 0"); return }
    if(SH.mode==="plan"){ const K=kitchen(); (K.plan[SH.slot]=K.plan[SH.slot]||[]).push(e); xsClose(); commitPlan(); toast("Added to plan"); return }
    const M=entryMacros(e), k=SH.k, m=S.meals[k]||(S.meals[k]={eaten:{},extras:[]}); m.items=m.items||[];
    m.items.push({slot:SH.slot,n:M.name,amt:M.amount,kcal:Math.round(M.m.kcal),p:+M.m.p.toFixed(1),c:+M.m.c.toFixed(1),f:+M.m.f.toFixed(1),src:e});
    saveMeals(k); xsClose(); lastRenderKey=""; render(); toast("Added"); return }
  if(d.xs==="qadd"){ const q=n=>numIn((document.querySelector(`[data-xs-quick="${n}"]`)||{}).value||0), name=(document.querySelector('[data-xs-quick="n"]')||{}).value||"";
    const kc=q("kcal"); if(!(kc>0)){ const er=document.querySelector("[data-xs-err]"); er.textContent="Enter calories."; er.hidden=false; return }
    const k=SH.k, m=S.meals[k]||(S.meals[k]={eaten:{},extras:[]}); m.items=m.items||[]; m.items.push({slot:SH.slot,n:name.trim()||"Quick add",amt:"",kcal:Math.round(kc),p:q("p"),c:q("c"),f:q("f")});
    saveMeals(k); xsClose(); lastRenderKey=""; render(); toast("Added"); return }
  // recipe editor
  if(d.xs==="ingnew"){ SH.adding=true; SH.q=""; SH.pick=null; paintSheet(true); return }
  if(d.xs==="ingback"){ SH.adding=false; SH.pick=null; paintSheet(true); return }
  if(d.xs==="ingadd"){ const P=SH.pick; if(!(numIn(P.amt)>0)){ toast("Enter an amount above 0"); return } SH.r.items.push({f:P.id,amt:numIn(P.amt),unit:P.unit}); SH.adding=false; SH.pick=null; paintSheet(true); return }
  if(d.xsIngrm!=null){ SH.r.items.splice(+d.xsIngrm,1); paintSheet(); return }
  if(d.xs==="rsave"){ const r=SH.r; r.name=(r.name||"").trim(); r.servings=Math.max(1,Math.round(numIn(r.servings))||1);
    if(!r.name||!r.items.length){ const er=document.querySelector("[data-xs-err]"); er.textContent=!r.name?"Give the meal a name.":"Add at least one ingredient."; er.hidden=false; return }
    const K=kitchen(), i=K.recipes.findIndex(x=>x.id===r.id); if(i>=0) K.recipes[i]=r; else K.recipes.push(r); xsClose(); commitPlan(); toast("Meal saved"); return }
  if(d.xs==="rdel"){ if(!SH.delConfirm){ SH.delConfirm=true; paintSheet(); return } const K=kitchen(), id=SH.r.id; K.recipes=K.recipes.filter(x=>x.id!==id); SLOTS.forEach(([sk])=>K.plan[sk]=(K.plan[sk]||[]).filter(e=>!(e.t==="r"&&e.id===id))); xsClose(); commitPlan(); return }
  // custom food
  if(d.xs==="cfsave"){ const x=SH.d; x.n=(x.n||"").trim(); ["k","p","c","f"].forEach(k=>x[k]=numIn(x[k])); x.serving=(x.serving||"1 serving").trim()||"1 serving";
    if(!x.n||!(x.k>=0)){ const er=document.querySelector("[data-xs-err]"); er.textContent="Add a name and calories."; er.hidden=false; return }
    const K=kitchen(), i=K.foods.findIndex(f=>f.id===x.id); if(i>=0) K.foods[i]=x; else K.foods.push(x);
    if(x.code&&!x.shared) shareBarcode({code:x.code,name:x.n,food:{n:x.n,serving:x.serving,k:x.k,p:x.p,c:x.c,f:x.f}});
    const back=SH.back; if(back){ commitPlan(); back.view=null; back.lookErr=""; back.lookAdd=null; back.tab="foods"; back.pick={t:"f",id:x.id,amt:1,unit:unitsOf({...x,custom:true})[0][0]}; openSheet(back); toast("Saved. Everyone who scans it gets it now"); return }
    xsClose(); commitPlan(); toast("Food saved"); return }
  if(d.xs==="cfdel"){ if(!SH.delConfirm){ SH.delConfirm=true; paintSheet(); return } const K=kitchen(); K.foods=K.foods.filter(f=>f.id!==SH.d.id); xsClose(); commitPlan(); return }
});
document.addEventListener("input",e=>{ const t=e.target, d=t.dataset||{};
  if(!SH) return;
  if(d.xsQ){ SH.q=t.value; paintPart(".xs-results"); return }
  if(d.xsCode){ SH.code=t.value; return }
  if(d.xsPw){ SH.w=t.value; paintPart(".plate-out"); return }
  if(d.xsQty){ SH.pick.qty=t.value; paintPart(".macroline"); return }
  if(d.xsAmt){ SH.pick.amt=t.value; paintPart(".macroline"); return }
  if(d.xsNf){ SH.d[d.xsNf]=t.value; return }
  if(d.xsSi&&SH&&SH.kind==="shopItem"){ SH[d.xsSi]=t.value; return }
  if(d.xsSl&&SH&&SH.kind==="shopList"){ SH[d.xsSl]=t.value; return }
  if(d.xsGf&&SH&&SH.kind==="autogen"){ const k=d.xsGf; SH.f[k]= k==="desc"? t.value : String(t.value).replace(/[^\d.]/g,"")===""? "" : Number(String(t.value).replace(/[^\d.]/g,"")); return }
  if(d.xsGn!=null&&SH&&SH.kind==="gscan"){ SH.pname=t.value; return }
  if(d.xsGq!=null&&SH&&SH.kind==="gscan"){ SH.eq=t.value; paintPart(".gplan"); return }
  if(d.xsRf){ SH.r[d.xsRf]=t.value; if(d.xsRf==="servings") paintPart(".rtot"); return }
  if(d.xsCf){ SH.d[d.xsCf]=t.value; return }
});
document.addEventListener("change",e=>{ const t=e.target, d=t.dataset||{};
  if(d.xsFvid&&SH&&SH.kind==="form"){ const f=t.files&&t.files[0]; t.value=""; formPick(f); return }
  if(d.xsFex&&SH&&SH.kind==="form"){ SH.ex=t.value; SH.name=t.options[t.selectedIndex].text; paintSheet(); return }
  if(d.xsSi==="unit"&&SH&&SH.kind==="shopItem"){ SH.unit=t.value; return }
  if(d.xsSs&&SH&&SH.kind==="shopSched"){ if(d.xsSs==="day"){ SH.day=+t.value; paintSheet() } else if(d.xsSs==="wk"){ SH.cycle[+t.dataset.i]=t.value } else if(d.xsSs==="pos") SH.pos=+t.value; return }
  if(d.xsGu!=null&&SH&&SH.kind==="gscan"){ SH.eu=t.value; paintPart(".gplan"); return }
  if(d.cStore){ if(t.value==="__add"){ t.value=storeName(); openSheet({kind:"gscan",view:"store",key:"",name:""}); return } kitchen().store=t.value; saveProfile(); lastRenderKey=""; render(); toast(`Shopping at ${t.value}`); return }
  if(d.xsUnit&&SH){ SH.pick.unit=t.value; paintPart(".macroline"); return }
  if(d.xsNf&&SH){ SH.d[d.xsNf]=t.value; return }
  if(d.cWeek!=null){ const su0=S.profile.setup; if(t.value==="run"&&su0.week.filter((w,i)=>w==="run"&&i!==+d.cWeek).length>=3){ toast("Up to 3 run days a week"); t.value=su0.week[+d.cWeek]; return }
    suMut(su=>{su.week[+d.cWeek]=t.value}); return }
  if(d.cRname){ suMut(su=>{const r=su.routines.find(x=>x.id===d.cRname); r.name=t.value.trim().slice(0,40)||r.name}); return }
  if(d.cLo||d.cHi){ const [rid,i]=(d.cLo||d.cHi).split("|"); suMut(su=>{const x=su.routines.find(r=>r.id===rid).ex[+i]; const v=Math.max(1,Math.round(numIn(t.value))||1); if(d.cLo){x.lo=v; if(x.hi<v) x.hi=v} else {x.hi=v; if(x.lo>v) x.lo=v}}); return }
  if(d.cRest){ const [rid,i]=d.cRest.split("|"); suMut(su=>{su.routines.find(r=>r.id===rid).ex[+i].rest=Number(t.value)}); return }
  if(d.xsBarw&&SH){ const u=UNIT(), v=Number(t.value); if(v>=0&&v<200){ const bars={...(userPrefs().bars||{})}; bars[u]={...(bars[u]||{}),[d.xsBarw]:v}; setPref({bars}); paintSheet() } return }
  if(d.acctTog){ setPref({[d.acctTog]:t.checked}); return }
  if(d.acctRhr){ const v=Math.round(numIn(t.value)); S.profile.restHr= v>=30&&v<=120? v : ""; saveProfile(); render(); return }
  if(d.cGoal){ suMut(su=>{su.food=su.food||{}; const v=Math.round(numIn(t.value)); su.food[d.cGoal]=v>0?v:undefined; if(d.cGoal==="kcal"&&v>0) su.kcal=v}); return }
  if(d.cGro){ S.profile.grocery={...(S.profile.grocery||{}),[d.cGro]:t.checked}; saveProfile(); t.closest(".mealrow")?.classList.toggle("eaten",t.checked); return }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&SH) xsClose() });
// while typing a barbell weight, show the plates per side under that exercise (tap it for the full calculator)
function plateHint(input){ const m=/^w-(.+)-(\d+)$/.exec(input.id||""); if(!m) return; const p=planFor(sel), ex=p&&p.ex&&p.ex.find(e=>e.id===m[1]); const box=document.getElementById("pl-"+m[1]);
  if(!box||!ex) return; const txt=platesText(input.value,ex); box.innerHTML=txt?`<button type="button" class="plates-btn" data-plates="${esc(ex.id)}|${esc(input.value)}">${esc(txt)}</button>`:"" }
document.addEventListener("focusin",e=>{ if(e.target&&/^w-/.test(e.target.id||"")) plateHint(e.target) });
document.addEventListener("input",e=>{ if(e.target&&/^w-/.test(e.target.id||"")) plateHint(e.target) });
