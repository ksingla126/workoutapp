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
  ["legraise","Lying Leg Raise","Core","Bodyweight","bw"],["pallof","Pallof Press (Cable)","Core","Cable","w"],
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
  const timed=L.type==="t", inc= timed?0 : L.id==="legpress45"||L.id==="legpress"||L.id==="hack"? 20 : L.type==="bw"? 5 : L.equip==="Machine"? 10 : 5;
  const note= L.type==="bw"? "Bodyweight: leave weight blank, or enter added weight." : L.equip==="Dumbbell"? (L.uni?"Weight = the one dumbbell.":"Weight = each dumbbell.") : "";
  return {id:L.id,name:L.name,sets:r.sets||3,lo:r.lo||(timed?30:8),hi:r.hi||(timed?60:12),inc,rest:r.rest||90,
    ...(timed?{bw:true,unit:"sec"}:{}),...(L.type==="bw"?{optW:true}:{}),...(r.ss?{ss:r.ss}:{}),...(r.note||note?{alt:[note,r.note].filter(Boolean).join(" ")}:{}),muscle:L.muscle,equip:L.equip,uni:L.uni};
}

/* ----- Starter splits ----- */
const E=(id,sets,lo,hi,rest)=>({id,sets,lo,hi,rest});
const SPLITS={
  fb2:{name:"Full body · 2 days",days:[0,3],routines:[
    {name:"Full Body A",ex:[E("legpress45",3,8,12,150),E("bench",3,6,10,150),E("pulldown",3,8,12,90),E("legcurl",3,10,15,75),E("lateral",3,12,15,60),E("pushdown",2,10,15,60),E("plank",3,30,60,45)]},
    {name:"Full Body B",ex:[E("rdl",3,8,10,120),E("incline",3,8,12,120),E("cablerow",3,8,12,90),E("legext",3,10,15,60),E("facepull",3,12,15,60),E("curl",2,10,15,60),E("calfraise",3,10,15,60)]}]},
  abc3:{name:"A / B / C · 3 days",days:[0,2,4],routines:[
    {name:"Bench & Leg Press",ex:[E("bench",4,6,8,150),E("legpress45",4,8,12,150),E("pulldown",3,8,12,90),E("rdl",3,8,10,120),E("backext",3,10,15,75),E("fly",3,12,15,60),E("revfly",2,12,15,60),E("lateral",3,12,15,60)]},
    {name:"Press & Deadlift",ex:[E("ohp",3,6,10,120),E("tbdl",3,5,8,150),E("cablerow",3,8,12,90),E("legcurl",3,10,15,75),E("legext1",2,10,15,60),E("facepull",3,12,15,60),E("ohtri",2,10,15,60),E("calfraise",3,10,15,60)]},
    {name:"Incline & Glutes",ex:[E("incline",4,8,12,120),E("dbrow",3,8,12,90),E("hipthrust",3,8,12,120),E("legcurl",3,10,15,75),E("ezcurl",2,10,15,60),E("pushdown",2,10,15,60),E("hammer",2,10,15,60),E("calfraise",2,10,15,60)]}]},
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
function recipeTotals(r){ let t={...ZERO}; (r.items||[]).forEach(it=>{const f=foodById(it.f); if(f) t=addM(t,macrosOf(f,gramsOf(f,it.amt,it.unit)))}); const n=Math.max(1,Number(r.servings)||1); return {total:t,per:{kcal:t.kcal/n,p:t.p/n,c:t.c/n,f:t.f/n},n} }
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
function xsClose(){ stopScan(); SH=null; const el=document.getElementById("xsheet"); if(el) el.hidden=true; document.body.classList.remove("xs-open") }
function paintSheet(scrollTop){ if(!SH) return; const el=sheetEl(), inn=el.querySelector(".xs-in"); const focusSel=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.xsFocus;
  inn.innerHTML=sheetHtml();
  if(scrollTop) el.querySelector(".xs-panel").scrollTop=0;
  if(focusSel){ const f=inn.querySelector(`[data-xs-focus="${focusSel}"]`); if(f){ f.focus(); try{const v=f.value; f.setSelectionRange(v.length,v.length)}catch(e){} } } }
const commitPlan=()=>{ saveProfile(); onProfile(); render() };
// Repaint only part of the sheet, so the input being typed in (and the iPhone keyboard) stays put.
function sheetHtml(){ return SH.kind==="move"? moveHtml() : SH.kind==="hist"? historyHtml() : SH.kind==="swap"? swapHtml() : SH.kind==="account"? accountHtml() : SH.kind==="exPick"? exPickerHtml() : SH.kind==="exNew"? exNewHtml() : SH.kind==="food"? foodSheetHtml() : SH.kind==="recipe"? recipeHtml() : SH.kind==="cfood"? cfoodHtml() : "" }
function paintPart(sel){ if(!SH) return; const el=document.querySelector("#xsheet .xs-in"); const dst=el&&el.querySelector(sel); if(!dst){ paintSheet(); return }
  const tmp=document.createElement("div"); tmp.innerHTML=sheetHtml(); const src=tmp.querySelector(sel); if(src) dst.innerHTML=src.innerHTML; else paintSheet() }
function estMin(ex){ const sec=(ex||[]).reduce((t,e)=>t+(e.sets||3)*((e.rest||90)+(e.bw?(e.hi||45):40)),0); return Math.max(10,Math.round(sec/60/5)*5) }

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
   <p class="small muted">Nutrition from Open Food Facts. Check it against the label.</p>`;
}
let scanner=null, scanLoading=null;
function loadScanLib(){ if(window.Html5Qrcode) return Promise.resolve(); if(scanLoading) return scanLoading;
  scanLoading=new Promise((ok,no)=>{ const sc=document.createElement("script"); sc.src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"; sc.onload=ok; sc.onerror=()=>{scanLoading=null; no(new Error("load"))}; document.head.appendChild(sc) }); return scanLoading }
async function startScan(){ try{ await loadScanLib(); if(!SH||SH.view!=="scan") return; const box=document.getElementById("scanbox"); if(!box) return; box.innerHTML="";
    const F=window.Html5QrcodeSupportedFormats; scanner=new Html5Qrcode("scanbox",{verbose:false,formatsToSupport:F?[F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E]:undefined});
    await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:260,height:140}},code=>{ stopScan(); SH.code=code; lookupCode(code) },()=>{});
  }catch(e){ if(SH&&SH.view==="scan"){ SH.scanErr="Camera isn't available. Type the barcode number instead."; paintSheet() } } }
function stopScan(){ const sc=scanner; scanner=null; if(sc){ try{ sc.stop().catch(()=>{}) }catch(e){} } }
async function lookupCode(code){ code=String(code||"").replace(/\D/g,""); if(code.length<6){ SH.lookErr="Enter the full barcode number."; paintSheet(); return }
  SH.lookErr="Looking up…"; paintSheet();
  try{ const tok=window.appAuthToken? await window.appAuthToken() : null; const r=await fetch("/api/barcode?code="+code,{headers:tok?{authorization:"Bearer "+tok}:{}}); const j=await r.json().catch(()=>({}));
    if(r.status===404){ SH.lookErr="Not found in Open Food Facts. Add it as a custom food from its label."; paintSheet(); return }
    if(!r.ok||!j.food) throw 0; USDA.cache.set(j.food.id,j.food); keepUsda(j.food);
    SH.view=null; SH.lookErr=""; SH.tab="foods"; SH.pick={t:"f",id:j.food.id,amt:1,unit:unitsOf(j.food)[0][0]}; paintSheet(true) }
  catch(e){ SH.lookErr="Lookup isn't available right now."; paintSheet() } }
function recipeHtml(){ const r=SH.r, T=recipeTotals(r);
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
  h+= r.items.length? r.items.map((it,i)=>{const f=foodById(it.f); if(!f) return ""; const m=macrosOf(f,gramsOf(f,it.amt,it.unit)); return `<div class="extra"><span>${esc(f.n)} <span class="muted small num">· ${esc(fmtAmt(it.amt,it.unit))} · ${fmtN(m.kcal)} kcal</span></span><button type="button" data-xs-ingrm="${i}" aria-label="Remove">×</button></div>`}).join("") : `<p class="small muted">Add the ingredients for the whole batch.</p>`;
  h+=`<button type="button" class="btn ghost sm" data-xs="ingnew" style="margin:8px 0">+ Add ingredient</button>
    <div class="note num rtot"><b>Per serving:</b> ${fmtN(T.per.kcal)} kcal · ${Math.round(T.per.p)} g protein · ${Math.round(T.per.c)} g carbs · ${Math.round(T.per.f)} g fat<br><span class="small muted">Whole batch: ${fmtN(T.total.kcal)} kcal · ${Math.round(T.total.p)} g protein</span></div>
    <p class="note" data-xs-err hidden></p>
    <div class="row"><button type="button" class="btn" data-xs="rsave">Save meal</button>${SH.isNew?"":`<button type="button" class="btn ghost" data-xs="rdel">${SH.delConfirm?"Tap again to delete":"Delete"}</button>`}</div>`;
  return h;
}
function cfoodHtml(){ const d=SH.d;
  return `<div class="xs-head"><h2>${SH.isNew?"New food":"Edit food"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
   <div class="field"><label>Name</label><input data-xs-cf="n" value="${esc(d.n)}" placeholder="e.g. Quest bar, cookies & cream" data-xs-focus="cfn"></div>
   <div class="field"><label>Serving size</label><input data-xs-cf="serving" value="${esc(d.serving)}" placeholder="e.g. 1 bar"></div>
   <div class="row"><div class="field"><label>Calories</label><input inputmode="decimal" data-xs-cf="k" value="${esc(d.k)}"></div><div class="field"><label>Protein g</label><input inputmode="decimal" data-xs-cf="p" value="${esc(d.p)}"></div></div>
   <div class="row"><div class="field"><label>Carbs g</label><input inputmode="decimal" data-xs-cf="c" value="${esc(d.c)}"></div><div class="field"><label>Fat g</label><input inputmode="decimal" data-xs-cf="f" value="${esc(d.f)}"></div></div>
   <p class="small muted">Per serving, from the nutrition label.</p><p class="note" data-xs-err hidden></p>
   <div class="row"><button type="button" class="btn" data-xs="cfsave">Save food</button>${SH.isNew?"":`<button type="button" class="btn ghost" data-xs="cfdel">${SH.delConfirm?"Tap again to delete":"Delete"}</button>`}</div>`;
}
function customFoodView(){
  const K=kitchen(), g=foodGoals(), su=CUSTOM.su;
  let h=`<div class="card"><h2>Daily goals</h2><div class="row">${[["kcal","Calories",g.kcal],["protein","Protein g",g.p],["carbs","Carbs g",g.c],["fat","Fat g",g.f]].map(([k,l,v])=>`<div class="field"><label>${l}</label><input inputmode="numeric" data-c-goal="${k}" value="${v}"></div>`).join("")}</div>
   <p class="small muted">Carbs fill whatever calories protein and fat leave, unless you set them.</p></div>`;
  // My meals
  h+=`<div class="card"><div class="row between"><h2>My meals</h2><button type="button" class="btn sm" data-c-rec="">+ New meal</button></div>`;
  h+= K.recipes.length? K.recipes.map(r=>{const T=recipeTotals(r); return `<button type="button" class="dayline" data-c-rec="${r.id}"><span class="txt"><b>${esc(r.name)}</b><br><span class="small muted num">${T.n} serving${T.n===1?"":"s"} · ${fmtN(T.per.kcal)} kcal · ${Math.round(T.per.p)} g P · ${Math.round(T.per.c)} g C · ${Math.round(T.per.f)} g F each</span></span></button>`}).join("")
     : `<p class="small muted">Build your meal prep: add every ingredient in the batch and how many servings it makes. The app works out macros per serving.</p>`;
  h+=`</div>`;
  // Meal plan
  let day={...ZERO};
  h+=`<div class="card"><h2>Meal plan</h2><p class="small muted">What you plan to eat each day. One tap logs it in your diary, and it builds your grocery list.</p>`;
  SLOTS.forEach(([sk,sn])=>{ const its=K.plan[sk]||[];
    h+=`<div class="slot"><div class="row between"><b>${sn}</b><button type="button" class="link small" data-c-padd="${sk}">+ Add</button></div>`;
    its.forEach((e,i)=>{const M=entryMacros(e); if(!M) return; day=addM(day,M.m); h+=`<div class="extra"><span>${esc(M.name)} <span class="muted small num">· ${esc(M.amount)} · ${fmtN(M.m.kcal)} kcal</span></span><button type="button" data-c-prm="${sk}|${i}" aria-label="Remove">×</button></div>`});
    h+=`</div>`});
  h+=`<div class="note num"><b>Planned per day:</b> ${fmtN(day.kcal)} of ${fmtN(g.kcal)} kcal · ${Math.round(day.p)} of ${g.p} g protein · ${Math.round(day.c)} g carbs · ${Math.round(day.f)} g fat</div></div>`;
  // Grocery list
  const gl=groceryList(), chk=S.profile.grocery||{};
  h+=`<div class="card"><div class="row between"><h2>Grocery list</h2><span class="chip">7 days</span></div>`;
  h+= gl.length? gl.map(x=>`<label class="mealrow ${chk[x.id]?"eaten":""}"><input type="checkbox" data-c-gro="${x.id}" ${chk[x.id]?"checked":""}><span class="m">${esc(x.n)}</span><span class="k num">${esc(x.qty)}</span></label>`).join("")+`<button type="button" class="link small" data-c-groclr="1">Uncheck all</button>`
     : `<p class="small muted">Add meals to your plan and the shopping list fills in.</p>`;
  h+=`</div>`;
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
    return {id,n:f.n,qty} }).sort((a,b)=>a.n.localeCompare(b.n));
}

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
  return {v:2,name:nm,sex:"male",age:21,weight:wt,goal:"race",race:"half",goalDate:"2026-12-25",start:"2026-10-12",firstDay:"2026-10-12",split:"own",
    routines,week:["rA","run","rB","run","rC","run","rest"],customEx:[],runLevel:"new",exp:"new",kcal:1600,food:{kcal:1600,protein:140},
    legacyRuns:true,rope:true,fromLegacy:ymd(today),at:Date.now(),
    coachNotes:"Core block Oct 19–Nov 8: deadlift patterns were swapped for weighted core work because his core couldn't support his lower back; from Nov 9 the RDL and trap-bar deadlift return at reduced weight (trap bar around 135 lb with straps). Pressing is his weakest area, grip limits his pulls (use straps), and he dislikes split squats. Runs: Tuesday easy by heart rate (jog to 150 bpm, walk to 130), Thursday intervals, Saturday long run building to 11 mi with lighter weeks 4 and 8; half marathon Dec 25 with a 2:30–2:40 run/walk goal. Jump-rope rounds finish each gym day as prep for a Muay Thai camp right after Dec 25. He chose an aggressive calorie deficit, so watch for under-fueling."};
}
function maybeMigrateLegacy(){
  if(!window.__platform||!loaded.profile||S.profile.setup||!S.profile.about||S.profile.legacyKept) return false;
  S.profile.setup=legacyToSetup(); saveProfile(); return true;
}
const SWAP_ICON=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h9.5M10 2.5 12.5 5 10 7.5"/><path d="M13 11H3.5M6 8.5 3.5 11 6 13.5"/></svg>`;
function swapBtn(ex,log){ if(ex.fixed||log) return "";
  const undo= ex.once? `<span class="swapped">today only<button type="button" data-swapundo="${esc(ex.id)}">undo</button></span>` : "";
  return `<button type="button" class="swapb" data-swap="${esc(ex.id)}" aria-label="Swap ${esc(ex.name)}">${SWAP_ICON}</button>${undo}` }
function muscleOfEx(id){ const L=libEx(id); if(L) return L.muscle; const m=EX_MUSCLES[id]; if(!m) return ""; const top=Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0];
  return {chest:"Chest",back:"Back",shoulders:"Shoulders",arms:"Biceps",core:"Core",quads:"Quads",glutes:"Glutes",hamstrings:"Hamstrings",calves:"Calves"}[top]||"" }
function swapHtml(){
  const W=SH, p=planFor(parseYmd(W.k)), inDay=new Set((p&&p.ex||[]).map(e=>e.id));
  if(W.adding) return addExHtml(W,inDay);
  if(W.to){ const L=libEx(W.to)||{name:W.to}, isToday=W.k===ymd(today);
    return `<div class="xs-head"><h2>Swap exercise</h2><button type="button" class="btn ghost sm" data-xs="swapback">Back</button></div>
     <div class="swapfrom"><span>${esc(W.fromName)}</span>${SWAP_ICON}<span>${esc(L.name)}</span></div>
     <p class="small muted">Sets, reps and rest carry over. How long should this swap last?</p>
     <button type="button" class="swapopt" data-xs-swapmode="once"><b>${isToday?"Just today":"Just this workout"}</b><span>${fmtDate(parseYmd(W.k))} only. Your routine stays the same.</span></button>
     <button type="button" class="swapopt" data-xs-swapmode="routine"><b>Every ${esc(W.dayName)} from now on</b><span>Changes your routine for all future workouts${isToday?" starting today":" starting "+fmtShort(parseYmd(W.k))}. Logged workouts keep what you did, and Standings update to match.</span></button>` }
  const q=(W.q||"").toLowerCase().trim(), mu=W.mu||"";
  const list=exLib().filter(e=>e.id!==W.from&&(!mu||e.muscle===mu)&&(!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)||e.equip.toLowerCase().includes(q)));
  return `<div class="xs-head"><h2>Swap ${esc(W.fromName)}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
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
function doSwap(mode){ const W=SH, from=W.from, to=W.to, k=W.k;
  S.profile.swaps=S.profile.swaps||{}; const sw=S.profile.swaps; sw.once=sw.once||{}; sw.routine=sw.routine||[];
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

/* ======================= Move / skip a session ======================= */
function dayMenu(p,k,log){ if(log||!p||p.type==="rest") return "";
  return `<div class="row daymenu"><button type="button" class="link small" data-daymove="${k}">Move</button><button type="button" class="link small" data-dayskip="${k}">Skip</button></div>` }
function weekResetBtn(k){ return Object.keys(S.profile.moves||{}).some(d=>weekDays(k).includes(d)&&!S.logs[d])? `<button type="button" class="link small" data-resetweek="${k}" style="align-self:flex-start">Undo this week's schedule changes</button>` : "" }
function srcOf(dk){ const mv=S.profile.moves||{}, v=mv[dk]; if(v==="rest") return null; if(v&&/^\d{4}-/.test(v)) return v; const b=basePlan(parseYmd(dk)); return b&&b.type!=="rest"? dk : null }
function setSrc(dk,src){ const mv=S.profile.moves=S.profile.moves||{}; const b=basePlan(parseYmd(dk)), own=b&&b.type!=="rest";
  if(src===dk||(src===null&&!own)) delete mv[dk]; else mv[dk]= src===null? "rest" : src }
function sessLabel(src){ if(!src) return "Rest"; const b=basePlan(parseYmd(src)); return !b?"Rest": b.type==="gym"? b.name : b.t }
function weekDays(k){ const mon=mondayOf(parseYmd(k)); return [...Array(7)].map((_,i)=>ymd(addDays(mon,i))) }
function moveHtml(){ const k=SH.k, days=weekDays(k).filter(d=>d!==k), src=srcOf(k);
  const after=weekDays(k).filter(d=>d>=k&&!S.logs[d]), last=after[after.length-1], drops=after.length>1&&srcOf(last)&&last!==k;
  return `<div class="xs-head"><h2>Move ${esc(sessLabel(src))}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
   <p class="small muted">Pick a day this week. The two days trade places.</p>
   <div class="xs-list">${days.map(d=>{const dt=parseYmd(d), lg=!!S.logs[d], past=d<ymd(today); return `<button type="button" class="xs-item" data-xs-moveto="${d}" ${lg||past?"disabled":""}><span><b>${DOW[(dt.getDay()+6)%7]} ${dt.getDate()}</b><span class="small muted">${lg?"Logged":past?"Past":esc(sessLabel(srcOf(d)))}</span></span><span class="xs-plus">⇄</span></button>`}).join("")}</div>
   <button type="button" class="swapopt" data-xs-pushweek="1"><b>Push the rest of the week back a day</b><span>${fmtShort(parseYmd(k))} becomes a rest day and each session moves one day later.${drops?` ${esc(sessLabel(srcOf(last)))} on ${DOW[(parseYmd(last).getDay()+6)%7]} drops off.`:""}</span></button>
   ${Object.keys(S.profile.moves||{}).some(d=>weekDays(k).includes(d)&&!S.logs[d])?`<button type="button" class="btn ghost" data-xs-resetweek="1">Reset this week to the plan</button>`:""}`;
}

/* ======================= Exercise history & PRs ======================= */
function sessBest(id,l){ const sets=WS(l&&l.ex&&l.ex[id]); if(!sets.length) return 0; const L=libEx(id)||{}, timed=L.type==="t"||(sets[0].w==null&&sets[0].r);
  return timed&&!sets.some(x=>x.w)? Math.max(...sets.map(x=>Number(x.r)||0)) : Math.max(...sets.map(x=>e1rm(loadW(id,l,x.w),Number(x.r)||0))) }
function priorBest(id,k){ let b=0; Object.entries(S.logs).forEach(([kk,l])=>{ if(kk<k&&l.type==="gym") b=Math.max(b,sessBest(id,l)) }); return b }
function findPRs(k,log){ return Object.keys(log.ex||{}).filter(id=>{ const now=sessBest(id,log), before=priorBest(id,k); return before>0&&now>before+0.01 }) }
function historyHtml(){ const id=SH.id, L=libEx(id)||(typeof X!=="undefined"&&X[id])||{name:SH.name||id};
  const rows=Object.entries(S.logs).filter(([k,l])=>l.type==="gym"&&l.ex&&l.ex[id]&&l.ex[id].length).sort((a,b)=>a[0]<b[0]?1:-1);
  const timed=L.type==="t"||(typeof X!=="undefined"&&X[id]&&X[id].bw);
  let best=null, heavy=null; rows.forEach(([k,l])=>{ const b=sessBest(id,l); if(!best||b>best.v) best={v:b,k}; WS(l.ex[id]).forEach(x=>{ const w=loadW(id,l,x.w); if(!timed&&(!heavy||w>heavy.w||(w===heavy.w&&x.r>heavy.r))) heavy={w,r:x.r,k,db:logDb(id,l),raw:x.w} }) });
  const series=liftSeries(id);
  let h=`<div class="xs-head"><h2>${esc(L.name)}</h2><button type="button" class="btn ghost sm" data-xs="close">Close</button></div>`;
  if(!rows.length) return h+`<p class="small muted">No sessions logged yet. Your history, best sets and PRs show up here.</p>`;
  h+=`<div class="statrow"><div><b class="num">${timed?Math.round(best.v)+" s":fmtN(best.v)+" lb"}</b><span>${timed?"Longest hold":"Best est. 1-rep max"}</span></div>${heavy?`<div><b class="num">${heavy.db?heavy.raw+"/DB":heavy.w} × ${heavy.r}</b><span>Heaviest set</span></div>`:""}<div><b class="num">${rows.length}</b><span>Sessions</span></div></div>`;
  if(series.length>1&&!timed) h+=`<div class="eyebrow">Estimated 1-rep max</div>${lineChart(series,"var(--gym)",v=>Math.round(v),false)}`;
  h+=`<div class="eyebrow" style="margin-top:6px">History</div><div class="xs-list">${rows.map(([k,l])=>{ const pr=(l.prs||[]).includes(id), db=logDb(id,l);
    return `<div class="histrow"><div class="row between"><b>${fmtDate(parseYmd(k))}</b>${pr?`<span class="prbadge">PR</span>`:""}</div><div class="small num muted">${l.ex[id].map(x=>`${x.t==="w"?"W ":x.t==="d"?"D ":""}${x.w!=null&&!timed?`${x.w}${db?"/DB":""}×${x.r}`:`${x.r}s`}`).join(" · ")}</div></div>` }).join("")}</div>`;
  return h;
}

/* ======================= Account & settings ======================= */

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
   <h3>Workouts</h3>
   ${tog("sound","Rest timer sound","Beep when rest is over")}
   ${tog("awake","Keep screen on","While a workout timer is running")}
   <label class="setrow"><span><b>Resting heart rate</b><span class="small muted">Used for fitness estimates</span></span><input class="setnum" inputmode="numeric" data-acct-rhr="1" value="${esc(S.profile.restHr||"")}" placeholder="70"></label>
   <h3>Account</h3>
   ${CUSTOM?`<button type="button" class="setlink" data-acct-edit="1">Edit plan & goals<span>›</span></button>`:""}
   <button type="button" class="setlink" data-acct-export="1">Download my data<span>›</span></button>
   <button type="button" class="btn ghost" data-acct-out="1" style="margin-top:8px">Sign out</button>`;
}
function exportData(){ const data={exportedAt:new Date().toISOString(),profile:S.profile,logs:S.logs,meals:S.meals,photos:S.photos,chat:S.chat,advice:S.advice};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=`training-data-${ymd(today)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000) }

/* ======================= Event handling (delegated) ======================= */
function numIn(v){ const n=Number(String(v).replace(/,/g,"")); return isFinite(n)?n:0 }
document.addEventListener("click",e=>{
  const t=e.target.closest&&e.target.closest("button,[data-xs]"); if(!t) return; const d=t.dataset;
  // --- swaps
  if(d.swap){ const p=planFor(sel), ex=p&&p.ex&&p.ex.find(e=>e.id===d.swap); if(!ex) return;
    openSheet({kind:"swap",from:ex.id,fromName:ex.name,day:p.day,dayName:(p.name||("Day "+p.day)).split(" · ")[0],k:ymd(sel),q:"",mu:muscleOfEx(ex.id)}); return }
  if(d.swapundo){ const sw=swapsOf(), k=ymd(sel), m=S.profile.swaps&&S.profile.swaps.once&&S.profile.swaps.once[k]; if(m){ Object.keys(m).forEach(f=>{ if(m[f]===d.swapundo) delete m[f] }); if(!Object.keys(m).length) delete S.profile.swaps.once[k]; saveProfile(); lastRenderKey=""; render(); toast("Swap undone") } return }
  // --- workout screen
  if(d.settype){ const [id,i]=d.settype.split("|"), k=ymd(sel), key=dkey(k,`st-${id}-${i}`), cur=setTypeK(k,id,i); drafts[key]=cur===""?"w":cur==="w"?"d":""; persistDrafts(); lastRenderKey=""; render(); return }
  if(d.addset){ const k=ymd(sel), key=dkey(k,`xs-${d.addset}`); drafts[key]=(Number(drafts[key])||0)+1; persistDrafts(); lastRenderKey=""; render(); return }
  if(d.rmset){ const k=ymd(sel), key=dkey(k,`xs-${d.rmset}`), n=Number(drafts[key])||0; if(n>0){ const ex=(planFor(sel).ex||[]).find(e=>e.id===d.rmset), last=ex?setCount(ex,k)-1:-1; ["w","r","c","st"].forEach(f=>delete drafts[dkey(k,`${f}-${d.rmset}-${last}`)]); drafts[key]=n-1; if(!drafts[key]) delete drafts[key]; persistDrafts(); lastRenderKey=""; render() } return }
  if(d.addex){ openSheet({kind:"swap",adding:true,k:d.addex,q:"",mu:""}); return }
  if(d.addrm){ const k=ymd(sel), sw=S.profile.swaps, a=sw&&sw.add&&sw.add[k]; if(a){ sw.add[k]=a.filter(x=>x.id!==d.addrm); if(!sw.add[k].length) delete sw.add[k]; saveProfile(); lastRenderKey=""; render() } return }
  if(d.openlive){ openLive(); return }
  if(d.resetweek){ const mv=S.profile.moves||{}; weekDays(d.resetweek).forEach(x=>{ if(!S.logs[x]) delete mv[x] }); saveProfile(); lastRenderKey=""; render(); toast("Week reset to the plan"); return }
  if(d.daymove){ openSheet({kind:"move",k:d.daymove}); return }
  if(d.dayskip){ if(t.dataset.armed){ setSrc(d.dayskip,null); saveProfile(); lastRenderKey=""; render(); toast("Session skipped") } else { t.dataset.armed="1"; t.textContent="Tap again to skip"; setTimeout(()=>{ if(t.isConnected){ delete t.dataset.armed; t.textContent="Skip" } },3000) } return }
  if(d.exhist){ const p=planFor(sel), ex=p&&p.ex&&p.ex.find(e=>e.id===d.exhist); openSheet({kind:"hist",id:d.exhist,name:ex&&ex.name}); return }
  // --- account
  if(d.acct){ openSheet({kind:"account"}); return }
  if(d.acctMode){ setPref({mode:d.acctMode}); paintSheet(); return }
  if(d.acctPal){ setPref({palette:d.acctPal}); paintSheet(); return }
  if(d.acctEdit){ xsClose(); setupOpen=true; SUW=null; render(); window.scrollTo(0,0); return }
  if(d.acctExport){ exportData(); return }
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
  // --- sheet
  if(!SH) return;
  if(d.xs==="close"){ xsClose(); return }
  if(d.xsMu!=null){ SH.mu=d.xsMu; paintSheet(); return }
  if(d.xsAddday){ const k=SH.k, L=libEx(d.xsAddday), tm=L&&L.type==="t"; S.profile.swaps=S.profile.swaps||{}; const sw=S.profile.swaps; sw.add=sw.add||{}; sw.add[k]=[...(sw.add[k]||[]),{id:d.xsAddday,sets:3,lo:tm?30:8,hi:tm?60:12,rest:L&&L.type==="w"&&["Barbell","Smith machine"].includes(L.equip)?150:90}];
    saveProfile(); lastRenderKey=""; render(); paintSheet(); toast("Added to today"); return }
  if(d.xsMoveto){ const a=srcOf(SH.k), b=srcOf(d.xsMoveto); setSrc(d.xsMoveto,a); setSrc(SH.k,b); saveProfile(); const msg=`${sessLabel(a)} moved to ${DOW[(parseYmd(d.xsMoveto).getDay()+6)%7]}`; xsClose(); lastRenderKey=""; render(); toast(msg); return }
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
  if(d.xs==="scan"){ SH.view="scan"; SH.scanErr=""; SH.lookErr=""; paintSheet(true); startScan(); return }
  if(d.xs==="scanback"){ stopScan(); SH.view=null; paintSheet(true); return }
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
    const K=kitchen(), i=K.foods.findIndex(f=>f.id===x.id); if(i>=0) K.foods[i]=x; else K.foods.push(x); xsClose(); commitPlan(); toast("Food saved"); return }
  if(d.xs==="cfdel"){ if(!SH.delConfirm){ SH.delConfirm=true; paintSheet(); return } const K=kitchen(); K.foods=K.foods.filter(f=>f.id!==SH.d.id); xsClose(); commitPlan(); return }
});
document.addEventListener("input",e=>{ const t=e.target, d=t.dataset||{};
  if(!SH) return;
  if(d.xsQ){ SH.q=t.value; paintPart(".xs-results"); return }
  if(d.xsCode){ SH.code=t.value; return }
  if(d.xsQty){ SH.pick.qty=t.value; paintPart(".macroline"); return }
  if(d.xsAmt){ SH.pick.amt=t.value; paintPart(".macroline"); return }
  if(d.xsNf){ SH.d[d.xsNf]=t.value; return }
  if(d.xsRf){ SH.r[d.xsRf]=t.value; if(d.xsRf==="servings") paintPart(".rtot"); return }
  if(d.xsCf){ SH.d[d.xsCf]=t.value; return }
});
document.addEventListener("change",e=>{ const t=e.target, d=t.dataset||{};
  if(d.xsUnit&&SH){ SH.pick.unit=t.value; paintPart(".macroline"); return }
  if(d.xsNf&&SH){ SH.d[d.xsNf]=t.value; return }
  if(d.cWeek!=null){ const su0=S.profile.setup; if(t.value==="run"&&su0.week.filter((w,i)=>w==="run"&&i!==+d.cWeek).length>=3){ toast("Up to 3 run days a week"); t.value=su0.week[+d.cWeek]; return }
    suMut(su=>{su.week[+d.cWeek]=t.value}); return }
  if(d.cRname){ suMut(su=>{const r=su.routines.find(x=>x.id===d.cRname); r.name=t.value.trim().slice(0,40)||r.name}); return }
  if(d.cLo||d.cHi){ const [rid,i]=(d.cLo||d.cHi).split("|"); suMut(su=>{const x=su.routines.find(r=>r.id===rid).ex[+i]; const v=Math.max(1,Math.round(numIn(t.value))||1); if(d.cLo){x.lo=v; if(x.hi<v) x.hi=v} else {x.hi=v; if(x.lo>v) x.lo=v}}); return }
  if(d.cRest){ const [rid,i]=d.cRest.split("|"); suMut(su=>{su.routines.find(r=>r.id===rid).ex[+i].rest=Number(t.value)}); return }
  if(d.acctTog){ setPref({[d.acctTog]:t.checked}); return }
  if(d.acctRhr){ const v=Math.round(numIn(t.value)); S.profile.restHr= v>=30&&v<=120? v : ""; saveProfile(); render(); return }
  if(d.cGoal){ suMut(su=>{su.food=su.food||{}; const v=Math.round(numIn(t.value)); su.food[d.cGoal]=v>0?v:undefined; if(d.cGoal==="kcal"&&v>0) su.kcal=v}); return }
  if(d.cGro){ S.profile.grocery={...(S.profile.grocery||{}),[d.cGro]:t.checked}; saveProfile(); t.closest(".mealrow")?.classList.toggle("eaten",t.checked); return }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&SH) xsClose() });
