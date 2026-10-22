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
function exLib(){ const custom=(typeof S!=="undefined"&&S.profile&&S.profile.setup&&S.profile.setup.customEx)||[];
  return [...EXLIB_RAW.map(([id,name,muscle,equip,type,uni])=>({id,name,muscle,equip,type,uni:!!uni})), ...custom.map(c=>({...c,custom:true}))] }
function libEx(id){ return exLib().find(e=>e.id===id) }
// Map onto the app's existing standings/muscle model where it applies
const LIB_MUSCLE_MAP={Chest:{chest:1},Back:{back:1},Shoulders:{shoulders:1},Biceps:{arms:1},Triceps:{arms:1},Quads:{quads:1},Hamstrings:{hamstrings:1},Glutes:{glutes:1},Calves:{calves:1},Core:{core:1},Forearms:{arms:1}};
function toPlanEx(r){ // routine entry -> exercise object the logger understands
  const L=libEx(r.id)||{id:r.id,name:r.name||r.id,muscle:"",equip:"Other",type:"w"};
  const timed=L.type==="t", inc= timed?0 : L.id==="legpress45"||L.id==="legpress"||L.id==="hack"? 20 : L.type==="bw"? 5 : L.equip==="Machine"? 10 : 5;
  const note= L.type==="bw"? "Bodyweight: leave weight blank, or enter added weight." : L.equip==="Dumbbell"? (L.uni?"Weight = the one dumbbell.":"Weight = each dumbbell.") : "";
  return {id:L.id,name:L.name,sets:r.sets||3,lo:r.lo||(timed?30:8),hi:r.hi||(timed?60:12),inc,rest:r.rest||90,
    ...(timed?{bw:true,unit:"sec"}:{}),...(L.type==="bw"?{optW:true}:{}),...(r.note||note?{alt:[note,r.note].filter(Boolean).join(" ")}:{}),muscle:L.muscle,equip:L.equip,uni:L.uni};
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
function keepUsda(f){ if(!f||f.src!=="usda") return; const K=kitchen(); K.usda=K.usda||[]; if(!K.usda.some(x=>x.id===f.id)){ K.usda.push({id:f.id,n:f.n,k:f.k,p:f.p,c:f.c,f:f.f,sv:f.sv,src:"usda"}); if(K.usda.length>300) K.usda.shift(); saveProfile() } }
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
function diaryTotals(k){ const m=S.meals[k]; let t={...ZERO}; (m&&m.items||[]).forEach(x=>{t=addM(t,{kcal:+x.kcal||0,p:+x.p||0,c:+x.c||0,f:+x.f||0})}); return t }
function foodGoals(){ const su=CUSTOM&&CUSTOM.su; const g=(su&&su.food)||{}; const kcal=Number(g.kcal||su&&su.kcal)||2000;
  const p=Number(g.protein)||Math.round((Number(su&&su.weight)||170)*0.8), f=Number(g.fat)||Math.round(kcal*0.28/9), c=Number(g.carbs)||Math.max(0,Math.round((kcal-p*4-f*9)/4));
  return {kcal,p,c,f} }

/* ======================= Logged days keep their plan ======================= */
const SNAP_KEYS=["id","name","sets","lo","hi","inc","rest","bw","unit","optW","alt","muscle","equip","uni"];
function planSnapshot(d){ const p=planFor(d); if(!p||p.type==="rest") return null;
  if(p.type==="gym") return {type:"gym",day:p.day,name:p.name,ex:(p.ex||[]).map(e=>{const o={}; SNAP_KEYS.forEach(k=>{if(e[k]!==undefined) o[k]=e[k]}); return o})};
  return {type:"run",key:p.key,t:p.t,d:p.d} }
function loggedPlan(d){ const k=ymd(d), l=S.logs[k]; if(!l) return null; const w=weekOf(d), i=dowOf(d);
  if(l.plan&&l.plan.type) return {...l.plan,w,i,logged:true};
  if(l.type==="gym"&&l.ex){ const cur=CUSTOM.gym[l.day];
    return {type:"gym",w,i,day:l.day,name:(cur&&cur.name)||"Workout",logged:true,ex:Object.keys(l.ex).map(id=>{const c=cur&&cur.ex.find(e=>e.id===id), b=c||toPlanEx({id}); return {...b,sets:Math.max(b.sets,l.ex[id].length)}})} }
  if(l.type==="run"){ const b=basePlan(d); return b&&b.type==="run"? b : {type:"run",w,i,key:"tue",t:"Run",d:"Logged run",logged:true} }
  return null }

/* ======================= Shared bottom sheet ======================= */
let SH=null; // {kind, ...state}
function sheetEl(){ let el=document.getElementById("xsheet"); if(!el){ el=document.createElement("div"); el.id="xsheet"; el.hidden=true; el.innerHTML=`<div class="xs-back" data-xs="close"></div><div class="xs-panel" role="dialog" aria-modal="true"><div class="xs-in"></div></div>`; document.body.appendChild(el) } return el }
function openSheet(state){ SH=state; const el=sheetEl(); el.hidden=false; document.body.classList.add("xs-open"); paintSheet(true) }
function xsClose(){ SH=null; const el=document.getElementById("xsheet"); if(el) el.hidden=true; document.body.classList.remove("xs-open") }
function paintSheet(scrollTop){ if(!SH) return; const el=sheetEl(), inn=el.querySelector(".xs-in"); const focusSel=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.xsFocus;
  inn.innerHTML=sheetHtml();
  if(scrollTop) el.querySelector(".xs-panel").scrollTop=0;
  if(focusSel){ const f=inn.querySelector(`[data-xs-focus="${focusSel}"]`); if(f){ f.focus(); try{const v=f.value; f.setSelectionRange(v.length,v.length)}catch(e){} } } }
const commitPlan=()=>{ saveProfile(); onProfile(); render() };
// Repaint only part of the sheet, so the input being typed in (and the iPhone keyboard) stays put.
function sheetHtml(){ return SH.kind==="account"? accountHtml() : SH.kind==="exPick"? exPickerHtml() : SH.kind==="exNew"? exNewHtml() : SH.kind==="food"? foodSheetHtml() : SH.kind==="recipe"? recipeHtml() : SH.kind==="cfood"? cfoodHtml() : "" }
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
      <div class="small">${r.ex.length? r.ex.map(e=>{const L=libEx(e.id); return `${esc(L?L.name:e.id)} <span class="muted num">${e.sets}×${e.lo}–${e.hi}${L&&L.type==="t"?"s":""}</span>`}).join("<br>") : `<span class="muted">No exercises yet.</span> <button type="button" class="link small" data-c-ropen="${r.id}">Add some</button>`}</div></div>`; return }
    h+=`<div class="card routine"><div class="row between" style="gap:8px"><input class="rname" data-c-rname="${r.id}" value="${esc(r.name)}" aria-label="Routine name"><button type="button" class="btn sm" data-c-ropen="${r.id}">Done</button></div>`;
    if(!r.ex.length) h+=`<p class="small muted">No exercises yet. Add some below.</p>`;
    r.ex.forEach((e,ei)=>{ const L=libEx(e.id)||{name:e.id,muscle:"",type:"w"}, t=L.type==="t";
      h+=`<div class="rex"><div class="rex-h"><div><b>${esc(L.name)}</b><span class="small muted">${esc(L.muscle)}${L.equip?` · ${esc(L.equip)}`:""}</span></div>
        <div class="rex-act"><button type="button" data-c-mv="${r.id}|${ei}|-1" aria-label="Move up" ${ei===0?"disabled":""}>↑</button><button type="button" data-c-mv="${r.id}|${ei}|1" aria-label="Move down" ${ei===r.ex.length-1?"disabled":""}>↓</button><button type="button" data-c-rm="${r.id}|${ei}" aria-label="Remove">✕</button></div></div>
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
  SLOTS.forEach(([sk,sn])=>{ const its=items.map((x,i)=>[x,i]).filter(([x])=>x.slot===sk), st=its.reduce((a,[x])=>a+(+x.kcal||0),0), planned=(plan[sk]||[]);
    h+=`<div class="slot"><div class="row between"><b>${sn}</b><span class="small muted num">${fmtN(st)} kcal</span></div>`;
    its.forEach(([x,i])=>{h+=`<div class="extra"><span>${esc(x.n)} <span class="muted small num">· ${esc(x.amt||"")} · ${fmtN(x.kcal)} kcal · ${Math.round(x.p||0)} g P</span></span><button type="button" data-c-fdel="${k}|${i}" aria-label="Remove ${esc(x.n)}">×</button></div>`});
    h+=`<div class="row" style="gap:8px">${planned.length&&!its.some(([x])=>x.planned)?`<button type="button" class="link small" data-c-fplan="${k}|${sk}">+ Log planned ${sn.toLowerCase()}</button>`:""}<button type="button" class="link small" data-c-food="${k}|${sk}">+ Add</button></div></div>`});
  return h+`</div>`;
}
function foodSheetHtml(){
  const tabs=[["meals","My meals"],["foods","Foods"],["quick","Quick add"]], tab=SH.tab||"foods", slotName=(SLOTS.find(s=>s[0]===SH.slot)||[])[1];
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
  h+=`<div class="seg three" style="margin-bottom:10px">${tabs.map(([k,n])=>`<button type="button" class="${tab===k?"on":""}" data-xs-tab="${k}">${n}</button>`).join("")}</div>`;
  if(tab==="meals"){ const rs=kitchen().recipes;
    h+= rs.length? `<div class="xs-list">${rs.map(r=>{const p=recipeTotals(r).per; return `<button type="button" class="xs-item" data-xs-pickr="${r.id}"><span><b>${esc(r.name)}</b><span class="small muted num">${fmtN(p.kcal)} kcal · ${Math.round(p.p)} g P per serving</span></span><span class="xs-plus">+</span></button>`}).join("")}</div>` : `<p class="small muted">No meals yet. Build one in Plan → Food → My meals.</p>`;
  } else if(tab==="foods"){ const q=(SH.q||"").toLowerCase().trim(); const list=foodDb().filter(f=>!q||f.n.toLowerCase().includes(q));
    h+=`<input class="xs-search" type="search" placeholder="Search foods" value="${esc(SH.q||"")}" data-xs-q="1" data-xs-focus="q" autocomplete="off">
      <div class="xs-results"><div class="xs-list">${list.map(f=>{const u=unitsOf(f)[0], m=macrosOf(f,u[1]); return `<button type="button" class="xs-item" data-xs-pickf="${f.id}"><span><b>${esc(f.n)}</b><span class="small muted num">${esc(u[0])} · ${fmtN(m.kcal)} kcal · ${Math.round(m.p)} g P${f.custom?" · custom":""}</span></span><span class="xs-plus">+</span></button>`}).join("")}</div>${usdaSection(SH.q,list.length)}</div>`;
  } else {
    h+=`<div class="field"><label>Name</label><input data-xs-quick="n" placeholder="e.g. Latte" data-xs-focus="qn"></div>
      <div class="row"><div class="field"><label>Calories</label><input inputmode="numeric" data-xs-quick="kcal"></div><div class="field"><label>Protein g</label><input inputmode="numeric" data-xs-quick="p"></div></div>
      <div class="row"><div class="field"><label>Carbs g</label><input inputmode="numeric" data-xs-quick="c"></div><div class="field"><label>Fat g</label><input inputmode="numeric" data-xs-quick="f"></div></div>
      <p class="note" data-xs-err hidden></p><button type="button" class="btn" data-xs="qadd">Add</button>`;
  }
  return h;
}
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
  if(d.cMv){ const [rid,i,dir]=d.cMv.split("|"); suMut(su=>{const r=su.routines.find(x=>x.id===rid), a=+i, b=a+ +dir; if(b<0||b>=r.ex.length) return; [r.ex[a],r.ex[b]]=[r.ex[b],r.ex[a]]}); return }
  if(d.cRm){ const [rid,i]=d.cRm.split("|"); suMut(su=>{const r=su.routines.find(x=>x.id===rid); r.ex.splice(+i,1)}); return }
  if(d.cSets){ const [rid,i,dir]=d.cSets.split("|"); suMut(su=>{const x=su.routines.find(r=>r.id===rid).ex[+i]; x.sets=Math.max(1,Math.min(10,(x.sets||3)+ +dir))}); return }
  if(d.cRdel){ suMut(su=>{su.routines=su.routines.filter(r=>r.id!==d.cRdel); su.week=su.week.map(w=>w===d.cRdel?"rest":w)}); return }
  if(d.cRnew){ suMut(su=>{const n=su.routines.length; const id=newId("r"); R_OPEN.add(id); su.routines.push({id,name:"Workout "+"ABCDEFGHIJ"[n%10],ex:[]})}); return }
  if(d.cTpl){ if(SH_CONFIRM!==d.cTpl){ SH_CONFIRM=d.cTpl; render(); return } SH_CONFIRM=""; suMut(su=>{const x=splitToSetup(d.cTpl); su.routines=x.routines; const runs=su.week.map((w,i)=>w==="run"?i:-1).filter(i=>i>=0); su.week=x.week.map((w,i)=>w==="rest"&&runs.includes(i)?"run":w)}); toast("Routines replaced"); return }
  // --- food (home diary + plan)
  if(d.cFood!=null){ const [k,slot]=d.cFood.split("|"); openSheet({kind:"food",mode:"diary",k,slot,tab:"foods",q:""}); return }
  if(d.cFdel){ const [k,i]=d.cFdel.split("|"); const m=S.meals[k]; if(!m) return; m.items=(m.items||[]).filter((_,j)=>j!==+i); saveMeals(k); lastRenderKey=""; render(); return }
  if(d.cFplan){ const [k,sk]=d.cFplan.split("|"); const m=S.meals[k]||(S.meals[k]={eaten:{},extras:[]}); m.items=m.items||[];
    (kitchen().plan[sk]||[]).forEach(e=>{const M=entryMacros(e); if(M) m.items.push({slot:sk,n:M.name,amt:M.amount,kcal:Math.round(M.m.kcal),p:+M.m.p.toFixed(1),c:+M.m.c.toFixed(1),f:+M.m.f.toFixed(1),src:e,planned:true})});
    saveMeals(k); lastRenderKey=""; render(); toast("Logged"); return }
  if(d.cPadd){ openSheet({kind:"food",mode:"plan",slot:d.cPadd,tab:"meals",q:""}); return }
  if(d.cPrm){ const [sk,i]=d.cPrm.split("|"); kitchen().plan[sk].splice(+i,1); commitPlan(); return }
  if(d.cRec!=null){ const r=d.cRec? kitchen().recipes.find(x=>x.id===d.cRec) : null; openSheet({kind:"recipe",isNew:!r,r:r?JSON.parse(JSON.stringify(r)):{id:newId("rc"),name:"",servings:4,items:[]}}); return }
  if(d.cCf!=null){ const f=d.cCf? kitchen().foods.find(x=>x.id===d.cCf) : null; openSheet({kind:"cfood",isNew:!f,d:f?{...f}:{id:newId("cf"),n:"",serving:"1 serving",k:"",p:"",c:"",f:""}}); return }
  if(d.cGroclr){ S.profile.grocery={}; saveProfile(); render(); return }
  // --- sheet
  if(!SH) return;
  if(d.xs==="close"){ xsClose(); return }
  if(d.xsMu!=null){ SH.mu=d.xsMu; paintSheet(); return }
  if(d.xsTab){ SH.tab=d.xsTab; SH.q=""; paintSheet(true); return }
  if(d.xsSlot){ SH.slot=d.xsSlot; paintSheet(); return }
  if(d.xsEx){ const id=d.xsEx; suMut(su=>{const r=su.routines.find(x=>x.id===SH.rid); const i=r.ex.findIndex(x=>x.id===id); if(i>=0) r.ex.splice(i,1); else { const L=libEx(id), tm=L&&L.type==="t"; r.ex.push({id,sets:3,lo:tm?30:8,hi:tm?60:12,rest:L&&L.type==="w"&&["Barbell","Smith machine"].includes(L.equip)?150:90}) }}); paintSheet(); return }
  if(d.xs==="exnew"){ SH.kind="exNew"; SH.d=null; paintSheet(true); return }
  if(d.xs==="exback"){ SH.kind="exPick"; paintSheet(true); return }
  if(d.xs==="exsave"){ const x=SH.d; if(!x.name.trim()){ const er=document.querySelector("[data-xs-err]"); er.textContent="Give the exercise a name."; er.hidden=false; return }
    const id=newId("cx"); suMut(su=>{su.customEx=su.customEx||[]; su.customEx.push({id,name:x.name.trim().slice(0,60),muscle:x.muscle,equip:x.equip,type:x.type}); su.routines.find(r=>r.id===SH.rid).ex.push({id,sets:3,lo:x.type==="t"?30:8,hi:x.type==="t"?60:12,rest:90})});
    SH.kind="exPick"; paintSheet(true); toast("Exercise added"); return }
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
