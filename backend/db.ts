import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'agrocare.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'farmer' CHECK(role IN ('farmer', 'admin')),
      language_pref TEXT NOT NULL DEFAULT 'en' CHECK(language_pref IN ('en', 'kn')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS farmer_profiles (
      user_id INTEGER PRIMARY KEY,
      phone TEXT DEFAULT '',
      village_district TEXT DEFAULT '',
      state TEXT DEFAULT '',
      farm_size_acres REAL DEFAULT 0,
      primary_crops TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS crops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      scientific_name TEXT NOT NULL,
      season TEXT NOT NULL,
      climate_zone TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_id INTEGER NOT NULL,
      crop_name TEXT NOT NULL,
      name TEXT NOT NULL,
      pathogen TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Fungal', 'Bacterial', 'Viral', 'Pest', 'Healthy')),
      severity_typical TEXT NOT NULL,
      image_url TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      causes TEXT NOT NULL,
      prevention TEXT NOT NULL,
      organic_treatment TEXT NOT NULL,
      chemical_treatment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      image_data TEXT NOT NULL,
      crop_detected TEXT NOT NULL,
      disease_detected TEXT NOT NULL,
      is_healthy INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL,
      severity TEXT NOT NULL,
      alternatives_json TEXT NOT NULL DEFAULT '[]',
      description TEXT NOT NULL,
      symptoms_json TEXT NOT NULL DEFAULT '[]',
      causes_json TEXT NOT NULL DEFAULT '[]',
      prevention_json TEXT NOT NULL DEFAULT '[]',
      organic_json TEXT NOT NULL DEFAULT '[]',
      chemical_json TEXT NOT NULL DEFAULT '[]',
      quality_warning TEXT DEFAULT '',
      model_used TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS saved_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      detection_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (detection_id) REFERENCES detections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'advisory', 'alert')),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_kn TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      summary_kn TEXT NOT NULL,
      content TEXT NOT NULL,
      content_kn TEXT NOT NULL,
      read_time TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const cropCountRow = db.prepare('SELECT COUNT(*) as count FROM crops').get() as { count: number };
  if (cropCountRow.count === 0) {
    const insertCrop = db.prepare(`
      INSERT INTO crops (name, scientific_name, season, climate_zone, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const cropsSeed = [
      ['Tomato', 'Solanum lycopersicum', 'Kharif & Rabi', 'Warm temperate & subtropical', 'High-value horticultural crop vulnerable to foliar blights, leaf curl virus, and bacterial spot under humid conditions.'],
      ['Potato', 'Solanum tuberosum', 'Rabi & Cool Season', 'Cool temperate & highland', 'Staple tuber crop requiring close canopy monitoring for early and late blight during cool, wet weather.'],
      ['Rice', 'Oryza sativa', 'Kharif & Summer', 'Humid tropical & irrigated paddy', 'Primary cereal crop susceptible to rice blast, bacterial leaf blight, and brown spot across flooded paddies.'],
      ['Wheat', 'Triticum aestivum', 'Rabi', 'Cool dry temperate', 'Winter cereal crop susceptible to rusts (stripe, leaf, stem) and powdery mildew during heading stages.'],
      ['Maize', 'Zea mays', 'Kharif & Spring', 'Warm temperate & tropical', 'Versatile cereal crop affected by northern corn leaf blight, common rust, and gray leaf spot.'],
      ['Cotton', 'Gossypium hirsutum', 'Kharif', 'Semi-arid & warm subtropical', 'Major fiber crop exposed to bacterial blight, Alternaria leaf spot, and cotton leaf curl virus.'],
      ['Chilli', 'Capsicum annuum', 'Kharif & Rabi', 'Warm humid & dry tropical', 'Spice crop commonly challenged by anthracnose, Cercospora leaf spot, and chilli leaf curl complex.'],
      ['Grapes', 'Vitis vinifera', 'Perennial', 'Semi-arid & Mediterranean', 'Perennial fruit crop sensitive to downy mildew, powdery mildew, and anthracnose during shoot flush.']
    ];

    const insertManyCrops = db.transaction((items: string[][]) => {
      for (const item of items) {
        insertCrop.run(...item);
      }
    });
    insertManyCrops(cropsSeed);
  }

  const diseaseCountRow = db.prepare('SELECT COUNT(*) as count FROM diseases').get() as { count: number };
  if (diseaseCountRow.count === 0) {
    const cropRows = db.prepare('SELECT id, name FROM crops').all() as Array<{ id: number; name: string }>;
    const cropMap = new Map(cropRows.map((c) => [c.name, c.id]));

    const insertDisease = db.prepare(`
      INSERT INTO diseases (
        crop_id, crop_name, name, pathogen, category, severity_typical, image_url,
        symptoms, causes, prevention, organic_treatment, chemical_treatment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const diseasesSeed = [
      [
        cropMap.get('Tomato'), 'Tomato', 'Early Blight', 'Alternaria solani', 'Fungal', 'Moderate to High',
        '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
        'Dark brown to black circular lesions with concentric target-like rings on older lower leaves, often surrounded by a yellow chlorotic halo. Severe infection causes premature defoliation.',
        'Overwintering fungal spores in crop debris or infected seed, spread by rain splash, overhead irrigation, warm temperatures (24–29°C), and high humidity.',
        'Practice 2–3 year crop rotation away from solanaceous crops, use certified disease-free seed, mulch soil to block splash, space plants for airflow, and water at the base in morning hours.',
        'Remove and destroy heavily infected lower leaves. Apply Bacillus subtilis or Trichoderma viride foliar sprays, or copper soap / neem oil formulations early at symptom onset.',
        'Consult an agronomist for registered protectant fungicides such as chlorothalonil, mancozeb, or azoxystrobin applied according to label intervals and pre-harvest guidelines.'
      ],
      [
        cropMap.get('Tomato'), 'Tomato', 'Late Blight', 'Phytophthora infestans', 'Fungal', 'Severe',
        '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
        'Irregular water-soaked pale green to dark brown blotches on leaves and stems that rapidly expand. White cottony sporangial growth appears on the leaf underside in humid mornings.',
        'Oomycete pathogen thriving in cool, wet, and foggy conditions (15–22°C with >90% relative humidity). Windborne spores can spread across fields within days.',
        'Plant tolerant cultivars, eliminate volunteer tomato/potato plants, avoid overhead irrigation in late afternoon, and maintain wide row spacing.',
        'Immediately rogue out severely infected plants and bag them off-field. Preventive copper hydroxide sprays within organic certification limits can slow early spread.',
        'Seek local agricultural extension advice promptly for targeted oomycete fungicides (e.g., metalaxyl-M + mancozeb or cymoxanil-based formulations) rotated to prevent resistance.'
      ],
      [
        cropMap.get('Tomato'), 'Tomato', 'Tomato Yellow Leaf Curl Virus (TYLCV)', 'Begomovirus (vector: Bemisia tabaci)', 'Viral', 'High',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Upward curling and cupping of young leaves, interveinal yellowing, stunted upright shoots, and sharp reduction in flower and fruit set.',
        'Transmitted persistently by silverleaf whiteflies (Bemisia tabaci). Not transmitted through seed or mechanical contact.',
        'Use TYLCV-resistant hybrids, raise seedlings under 40-mesh insect-proof netting, install yellow sticky traps, and clear weed hosts around field borders.',
        'Control whitefly vectors using neem-based azadirachtin sprays, insecticidal potassium salts of fatty acids, and reflective silver mulch.',
        'No chemical cures an already infected plant; remove early-infected plants to reduce inoculum and use recommended selective vector controls only when whitefly thresholds are exceeded.'
      ],
      [
        cropMap.get('Potato'), 'Potato', 'Potato Late Blight', 'Phytophthora infestans', 'Fungal', 'Severe',
        '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
        'Dark, water-soaked necrotic patches starting at leaf tips or margins, accompanied by a faint pale-green border and white downy sporulation underneath during damp weather.',
        'Cool, overcast, rainy weather promotes rapid sporangia germination and tuber infection via rain wash into soil.',
        'Use certified disease-free seed tubers, hill soil well over developing tubers, destroy cull piles, and monitor regional blight forecasting alerts.',
        'Apply preventive copper-based bio-fungicides before prolonged wet spells and remove infected foliage before harvest to protect tubers.',
        'Follow university extension spray schedules using systemic/translaminar fungicides (such as dimethomorph or mandipropamid) paired with protectants.'
      ],
      [
        cropMap.get('Potato'), 'Potato', 'Potato Early Blight', 'Alternaria solani', 'Fungal', 'Moderate',
        '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
        'Small dark brown angular spots bounded by leaf veins that enlarge into concentric bullseye rings on mature foliage, leading to yellowing and leaf drop.',
        'Favored by alternating wet and dry periods, warm temperatures, and plant stress from nitrogen or potassium deficiency.',
        'Maintain balanced soil fertility (especially adequate potassium), irrigate consistently without drought stress, and rotate with cereal crops.',
        'Apply foliar Trichoderma formulations or certified copper octanoate early when lower leaves show initial lesions.',
        'Consult an agronomist for mancozeb or difenoconazole-based protectant sprays if foliar lesion incidence rises past economic thresholds.'
      ],
      [
        cropMap.get('Rice'), 'Rice', 'Rice Blast', 'Magnaporthe oryzae', 'Fungal', 'Severe',
        '/src/assets/images/disease_rice_blast_1795616494031.jpg',
        'Spindle-shaped or diamond-shaped lesions with pointed ends, grayish-white centers, and dark brown margins on leaves; neck blast causes panicle breakage and empty grains.',
        'Excessive nitrogen fertilization, prolonged leaf wetness from dew or drizzle, high planting density, and susceptible varieties.',
        'Adopt blast-resistant rice varieties, split nitrogen applications rather than heavy single basal doses, and maintain proper water depth in paddies.',
        'Seed treatment with Pseudomonas fluorescens and foliar application of botanical extracts or bio-control agents during tillering.',
        'Apply extension-recommended fungicides such as tricyclazole or isoprothiolane at booting/heading stages if leaf or neck blast appears.'
      ],
      [
        cropMap.get('Rice'), 'Rice', 'Bacterial Leaf Blight', 'Xanthomonas oryzae pv. oryzae', 'Bacterial', 'High',
        '/src/assets/images/disease_rice_blast_1795616494031.jpg',
        'Water-soaked yellowish stripes starting along leaf margins and tips, turning pale yellow to straw-colored with wavy margins; milky bacterial ooze may appear on young lesions.',
        'Driven by monsoon storms, high winds causing leaf abrasion, warm temperatures (25–34°C), and deep standing water.',
        'Grow resistant cultivars, avoid clipping seedling tips before transplanting, balance nitrogen and potash nutrition, and drain excess water temporarily during outbreaks.',
        'Foliar spraying of certified copper oxychloride or biological antagonistic bacteria formulations where locally approved.',
        'Antibiotics or bactericides should only be used under strict local agricultural department supervision; prioritize resistant varieties and water management.'
      ],
      [
        cropMap.get('Wheat'), 'Wheat', 'Wheat Yellow (Stripe) Rust', 'Puccinia striiformis', 'Fungal', 'Severe',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Bright yellow-orange pustules (uredinia) arranged in distinct parallel linear stripes along leaf veins; powdery yellow spores rub off onto fingers.',
        'Wind-dispersed rust spores thriving in cool, moist spring/winter mornings (10–18°C) with dew formation.',
        'Plant regionally recommended rust-resistant wheat varieties and avoid overly early sowing in endemic corridors.',
        'Early field scouting and removal of isolated volunteer wheat pockets; sulfur-based dusting is sometimes used in mild organic systems.',
        'Targeted triazole or strobilurin fungicides (e.g., propiconazole or tebuconazole) applied promptly upon hotspot detection under agronomist guidance.'
      ],
      [
        cropMap.get('Wheat'), 'Wheat', 'Wheat Powdery Mildew', 'Blumeria graminis f. sp. tritici', 'Fungal', 'Moderate',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Fluffy white to gray powdery fungal patches on upper leaf surfaces, sheaths, and awns, eventually turning dull gray with tiny black cleistothecia.',
        'Dense canopies, excessive nitrogen, shaded lower foliage, and moderate temperatures (15–22°C) with high humidity.',
        'Use tolerant cultivars, avoid excessive seeding rates and nitrogen top-dressing, and rotate with non-cereal crops.',
        'Wettable sulfur sprays or potassium bicarbonate applied early before flag leaf colonization.',
        'Consult local extension specialists for registered triazole or morpholine fungicides if disease reaches the flag leaf.'
      ],
      [
        cropMap.get('Maize'), 'Maize', 'Northern Corn Leaf Blight', 'Exserohilum turcicum', 'Fungal', 'Moderate to High',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Long, elliptical, cigar-shaped grayish-green to tan lesions (2.5–15 cm long) running parallel to leaf margins, coalescing to blight entire leaves.',
        'Conidia overwinter on maize residue and splash onto lower leaves during warm, humid weather with heavy dew.',
        'Select resistant maize hybrids, incorporate or rotate away from infected maize stubble, and maintain balanced nutrition.',
        'Biological seed coatings and early-stage neem/copper formulations in small-scale organic plots.',
        'Foliar fungicides (e.g., azoxystrobin or propiconazole) are typically evaluated at tasseling/silking if lesions reach upper leaves.'
      ],
      [
        cropMap.get('Maize'), 'Maize', 'Common Rust of Maize', 'Puccinia sorghi', 'Fungal', 'Moderate',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Small cinnamon-brown oval pustules scattered across both upper and lower leaf surfaces, rupturing the epidermis to release dusty rust spores.',
        'Long-distance windborne spores arriving in cool to moderate temperatures (16–23°C) with 6+ hours of leaf wetness.',
        'Grow resistant maize hybrids and schedule planting to avoid peak spore arrival during vegetative vulnerability.',
        'Ensure adequate potassium fertilization and air circulation; monitor sweet corn and seed crops closely.',
        'Protectant or systemic strobilurin/triazole sprays only if economic threshold is crossed before silking.'
      ],
      [
        cropMap.get('Cotton'), 'Cotton', 'Cotton Bacterial Blight (Angular Leaf Spot)', 'Xanthomonas citri pv. malvacearum', 'Bacterial', 'Moderate to High',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Small, dark green, water-soaked angular spots bounded by leaf veins that turn dark brown to black; blackening of veins and boll rot may follow.',
        'Seed-borne bacteria and wind-driven rain splash entering through stomata or leaf wounds.',
        'Use acid-delinted, certified disease-free cotton seed, plant resistant varieties, and avoid working in fields when foliage is wet.',
        'Seed treatment with bio-control Pseudomonas strains and early copper hydroxide applications within organic guidelines.',
        'Follow local agricultural university advisories for copper-based bactericide sprays during early vegetative outbreaks.'
      ],
      [
        cropMap.get('Chilli'), 'Chilli', 'Chilli Anthracnose & Die-Back', 'Colletotrichum capsici', 'Fungal', 'High',
        '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
        'Sunken circular necrotic lesions with dark concentric rings of acervuli on leaves and fruits; shoots may die back from the tip downward.',
        'Warm humid weather, rain splash, and infected seed or crop residues.',
        'Use disease-free seed, ensure good drainage, stake tall chilli varieties, and harvest ripe pods promptly.',
        'Seed treatment with Trichoderma harzianum and neem oil or copper soap foliar sprays.',
        'Consult an agronomist for carbendazim, azoxystrobin, or mancozeb rotations observing strict pre-harvest intervals.'
      ],
      [
        cropMap.get('Grapes'), 'Grapes', 'Grapevine Downy Mildew', 'Plasmopara viticola', 'Fungal', 'Severe',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Translucent yellowish "oil-spot" lesions on the upper leaf surface paired with dense white downy sporulation on the corresponding underside.',
        'Warm rainy weather (>10 mm rain and >10°C overnight) triggering zoospore splash onto young leaves and clusters.',
        'Maintain open vine canopy through pruning and shoot positioning to accelerate leaf drying after rain or dew.',
        'Preventive Bordeaux mixture or copper hydroxide applications timed prior to forecast rain events.',
        'Rotate anti-oomycete fungicides (e.g., fosetyl-Al or mandipropamid) strictly per viticulture resistance management guidelines.'
      ],
      [
        cropMap.get('Tomato'), 'Tomato', 'Healthy Foliage Baseline', 'None (Healthy Tissue)', 'Healthy', 'None',
        '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
        'Uniform rich green leaf coloration, intact margins, crisp venation, and absence of necrotic lesions, chlorotic halos, or fungal sporulation.',
        'Balanced macro- and micronutrient availability, proper irrigation timing, and effective preventive field hygiene.',
        'Continue routine weekly scouting of lower and upper canopy, drip irrigation at soil level, and balanced organic compost nutrition.',
        'No curative treatment required. Maintain preventive mulching and beneficial insect habitat.',
        'No chemical intervention needed.'
      ]
    ];

    const insertManyDiseases = db.transaction((items: unknown[][]) => {
      for (const item of items) {
        insertDisease.run(...item);
      }
    });
    insertManyDiseases(diseasesSeed);
  }

  const articleCountRow = db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };
  if (articleCountRow.count === 0) {
    const insertArticle = db.prepare(`
      INSERT INTO articles (title, title_kn, category, summary, summary_kn, content, content_kn, read_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const articlesSeed = [
      [
        'How to Capture Accurate Leaf Photos for AI Diagnosis',
        'AI ರೋಗ ಪತ್ತೆಗೆ ನಿಖರವಾದ ಎಲೆ ಚಿತ್ರಗಳನ್ನು ತೆಗೆಯುವುದು ಹೇಗೆ',
        'Field Scouting',
        'Simple lighting, framing, and focus habits that improve disease identification accuracy in the field.',
        'ಹೊಲದಲ್ಲಿ ರೋಗ ಪತ್ತೆ ನಿಖರತೆಯನ್ನು ಸುಧಾರಿಸಲು ಸರಳ ಬೆಳಕು ಮತ್ತು ಫೋಟೋ ತೆಗೆಯುವ ವಿಧಾನಗಳು.',
        'Place a single affected leaf against a plain, contrasting background such as light soil, paper, or your palm. Shoot in bright, indirect daylight rather than harsh midday shadows so lesion margins, halos, and concentric rings remain sharp. Avoid motion blur and capture both early-stage spots and the transition zone to healthy green tissue.',
        'ಒಂದೇ ಬಾಧಿತ ಎಲೆಯನ್ನು ತಿಳಿ ಮಣ್ಣು, ಕಾಗದ ಅಥವಾ ಅಂಗೈಯಂತಹ ಸರಳ ಹಿನ್ನೆಲೆಯಲ್ಲಿ ಇರಿಸಿ. ಕಡು ನೆರಳುಗಳ ಬದಲು ಸ್ಪಷ್ಟವಾದ ಹಗಲು ಬೆಳಕಿನಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ. ಇದರಿಂದ ಕಲೆಗಳ ಅಂಚುಗಳು ಮತ್ತು ಹಳದಿ ವಲಯಗಳು ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುತ್ತವೆ.',
        '3 min read'
      ],
      [
        'Early Blight vs. Late Blight: Key Visual Differences in Solanaceous Crops',
        'ಆರಂಭಿಕ ಬ್ಲೈಟ್ ಮತ್ತು ಲೇಟ್ ಬ್ಲೈಟ್: ಟೊಮೆಟೊ ಮತ್ತು ಆಲೂಗಡ್ಡೆಯಲ್ಲಿ ವ್ಯತ್ಯಾಸಗಳು',
        'Plant Pathology',
        'Distinguishing Alternaria concentric rings from rapid Phytophthora water-soaked lesions before applying sprays.',
        'ಸಿಂಪಡಣೆ ಮಾಡುವ ಮೊದಲು ಆಲ್ಟರ್ನೇರಿಯಾ ವೃತ್ತಾಕಾರದ ಕಲೆಗಳು ಮತ್ತು ಫೈಟೊಫ್ಥೊರಾ ನೀರಿನಂತಹ ಕಲೆಗಳನ್ನು ಗುರುತಿಸುವ ವಿಧಾನ.',
        'Early blight (Alternaria solani) typically begins on older lower leaves with dry, papery brown spots containing concentric target-board rings and a yellow halo. Late blight (Phytophthora infestans) spreads much faster during cool, wet weather, creating dark water-soaked blotches with white downy growth on leaf undersides. Identifying the correct pathogen prevents wasted fungicides and protects yield.',
        'ಆರಂಭಿಕ ಬ್ಲೈಟ್ ಸಾಮಾನ್ಯವಾಗಿ ಕೆಳಗಿನ ಹಳೆಯ ಎಲೆಗಳಲ್ಲಿ ವೃತ್ತಾಕಾರದ ಕಂದು ಕಲೆಗಳೊಂದಿಗೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಲೇಟ್ ಬ್ಲೈಟ್ ತಂಪಾದ, ಆರ್ದ್ರ ಹವಾಮಾನದಲ್ಲಿ ವೇಗವಾಗಿ ಹರಡಿ, ಎಲೆಯ ಕೆಳಭಾಗದಲ್ಲಿ ಬಿಳಿ ಬೂಷ್ಟನ್ನು ಉಂಟುಮಾಡುತ್ತದೆ.',
        '5 min read'
      ],
      [
        'Integrated Pest Management (IPM) for Smallholder Farms',
        'ಸಣ್ಣ ರೈತರಿಗಾಗಿ ಸಮಗ್ರ ಕೀಟ ಮತ್ತು ರೋಗ ನಿರ್ವಹಣೆ (IPM)',
        'Sustainable Agronomy',
        'Combining resistant varieties, crop rotation, biologicals, and targeted interventions to lower input costs.',
        'ಖರ್ಚು ಕಡಿಮೆ ಮಾಡಲು ರೋಗ ನಿರೋಧಕ ತಳಿಗಳು, ಬೆಳೆ ಪರಿವರ್ತನೆ ಮತ್ತು ಜೈವಿಕ ನಿಯಂತ್ರಣದ ಸಂಯೋಜನೆ.',
        'Effective crop protection begins long before spraying. Combining certified seed, 2-to-3-season crop rotation, field sanitation, Trichoderma or Pseudomonas bio-agents, and threshold-based selective treatments reduces chemical dependency while preserving beneficial pollinators and soil microbes.',
        'ಪರಿಣಾಮಕಾರಿ ಬೆಳೆ ರಕ್ಷಣೆಯು ಸಿಂಪಡಣೆಗಿಂತ ಮೊದಲೇ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಪ್ರಮಾಣೀಕೃತ ಬೀಜಗಳು, ಬೆಳೆ ಪರಿವರ್ತನೆ ಮತ್ತು ಜೈವಿಕ ನಿಯಂತ್ರಕಗಳ ಬಳಕೆಯು ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ಕಾಪಾಡಿ ಖರ್ಚನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.',
        '4 min read'
      ]
    ];

    const insertManyArticles = db.transaction((items: string[][]) => {
      for (const item of items) {
        insertArticle.run(...item);
      }
    });
    insertManyArticles(articlesSeed);
  }

  const notifCountRow = db.prepare('SELECT COUNT(*) as count FROM notifications').get() as { count: number };
  if (notifCountRow.count === 0) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (NULL, ?, ?, ?)
    `).run(
      'Monsoon Foliar Scouting Advisory',
      'High morning humidity increases risk of Early Blight in Tomato and Blast in Rice. Inspect lower canopy leaves twice weekly.',
      'advisory'
    );
  }
}
