export const SEED_CROPS = [
  {
    name: 'Tomato',
    scientific_name: 'Solanum lycopersicum',
    season: 'Kharif & Rabi',
    climate_zone: 'Warm temperate & subtropical',
    description:
      'High-value horticultural crop vulnerable to foliar blights, leaf curl virus, and bacterial spot under humid conditions.',
  },
  {
    name: 'Potato',
    scientific_name: 'Solanum tuberosum',
    season: 'Rabi & Cool Season',
    climate_zone: 'Cool temperate & highland',
    description:
      'Staple tuber crop requiring close canopy monitoring for early and late blight during cool, wet weather.',
  },
  {
    name: 'Rice',
    scientific_name: 'Oryza sativa',
    season: 'Kharif & Summer',
    climate_zone: 'Humid tropical & irrigated paddy',
    description:
      'Primary cereal crop susceptible to rice blast, bacterial leaf blight, and brown spot across flooded paddies.',
  },
  {
    name: 'Wheat',
    scientific_name: 'Triticum aestivum',
    season: 'Rabi',
    climate_zone: 'Cool dry temperate',
    description:
      'Winter cereal crop susceptible to rusts (stripe, leaf, stem) and powdery mildew during heading stages.',
  },
  {
    name: 'Maize',
    scientific_name: 'Zea mays',
    season: 'Kharif & Spring',
    climate_zone: 'Warm temperate & tropical',
    description:
      'Versatile cereal crop affected by northern corn leaf blight, common rust, and gray leaf spot.',
  },
  {
    name: 'Cotton',
    scientific_name: 'Gossypium hirsutum',
    season: 'Kharif',
    climate_zone: 'Semi-arid & warm subtropical',
    description:
      'Major fiber crop exposed to bacterial blight, Alternaria leaf spot, and cotton leaf curl virus.',
  },
  {
    name: 'Chilli',
    scientific_name: 'Capsicum annuum',
    season: 'Kharif & Rabi',
    climate_zone: 'Warm humid & dry tropical',
    description:
      'Spice crop commonly challenged by anthracnose, Cercospora leaf spot, and chilli leaf curl complex.',
  },
  {
    name: 'Grapes',
    scientific_name: 'Vitis vinifera',
    season: 'Perennial',
    climate_zone: 'Semi-arid & Mediterranean',
    description:
      'Perennial fruit crop sensitive to downy mildew, powdery mildew, and anthracnose during shoot flush.',
  },
];

export const SEED_DISEASES = [
  {
    crop_name: 'Tomato',
    name: 'Early Blight',
    pathogen: 'Alternaria solani',
    category: 'Fungal',
    severity_typical: 'Moderate to High',
    image_url: '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
    symptoms:
      'Dark brown to black circular lesions with concentric target-like rings on older lower leaves, often surrounded by a yellow chlorotic halo. Severe infection causes premature defoliation.',
    causes:
      'Overwintering fungal spores in crop debris or infected seed, spread by rain splash, overhead irrigation, warm temperatures (24–29°C), and high humidity.',
    prevention:
      'Practice 2–3 year crop rotation away from solanaceous crops, use certified disease-free seed, mulch soil to block splash, space plants for airflow, and water at the base in morning hours.',
    organic_treatment:
      'Remove and destroy heavily infected lower leaves. Apply Bacillus subtilis or Trichoderma viride foliar sprays, or copper soap / neem oil formulations early at symptom onset.',
    chemical_treatment:
      'Consult an agronomist for registered protectant fungicides such as chlorothalonil, mancozeb, or azoxystrobin applied according to label intervals and pre-harvest guidelines.',
  },
  {
    crop_name: 'Tomato',
    name: 'Late Blight',
    pathogen: 'Phytophthora infestans',
    category: 'Fungal',
    severity_typical: 'Severe',
    image_url: '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
    symptoms:
      'Irregular water-soaked pale green to dark brown blotches on leaves and stems that rapidly expand. White cottony sporangial growth appears on the leaf underside in humid mornings.',
    causes:
      'Oomycete pathogen thriving in cool, wet, and foggy conditions (15–22°C with >90% relative humidity). Windborne spores can spread across fields within days.',
    prevention:
      'Plant tolerant cultivars, eliminate volunteer tomato/potato plants, avoid overhead irrigation in late afternoon, and maintain wide row spacing.',
    organic_treatment:
      'Immediately rogue out severely infected plants and bag them off-field. Preventive copper hydroxide sprays within organic certification limits can slow early spread.',
    chemical_treatment:
      'Seek local agricultural extension advice promptly for targeted oomycete fungicides (e.g., metalaxyl-M + mancozeb or cymoxanil-based formulations) rotated to prevent resistance.',
  },
  {
    crop_name: 'Tomato',
    name: 'Tomato Yellow Leaf Curl Virus (TYLCV)',
    pathogen: 'Begomovirus (vector: Bemisia tabaci)',
    category: 'Viral',
    severity_typical: 'High',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Upward curling and cupping of young leaves, interveinal yellowing, stunted upright shoots, and sharp reduction in flower and fruit set.',
    causes:
      'Transmitted persistently by silverleaf whiteflies (Bemisia tabaci). Not transmitted through seed or mechanical contact.',
    prevention:
      'Use TYLCV-resistant hybrids, raise seedlings under 40-mesh insect-proof netting, install yellow sticky traps, and clear weed hosts around field borders.',
    organic_treatment:
      'Control whitefly vectors using neem-based azadirachtin sprays, insecticidal potassium salts of fatty acids, and reflective silver mulch.',
    chemical_treatment:
      'No chemical cures an already infected plant; remove early-infected plants to reduce inoculum and use recommended selective vector controls only when whitefly thresholds are exceeded.',
  },
  {
    crop_name: 'Potato',
    name: 'Potato Late Blight',
    pathogen: 'Phytophthora infestans',
    category: 'Fungal',
    severity_typical: 'Severe',
    image_url: '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
    symptoms:
      'Dark, water-soaked necrotic patches starting at leaf tips or margins, accompanied by a faint pale-green border and white downy sporulation underneath during damp weather.',
    causes:
      'Cool, overcast, rainy weather promotes rapid sporangia germination and tuber infection via rain wash into soil.',
    prevention:
      'Use certified disease-free seed tubers, hill soil well over developing tubers, destroy cull piles, and monitor regional blight forecasting alerts.',
    organic_treatment:
      'Apply preventive copper-based bio-fungicides before prolonged wet spells and remove infected foliage before harvest to protect tubers.',
    chemical_treatment:
      'Follow university extension spray schedules using systemic/translaminar fungicides (such as dimethomorph or mandipropamid) paired with protectants.',
  },
  {
    crop_name: 'Potato',
    name: 'Potato Early Blight',
    pathogen: 'Alternaria solani',
    category: 'Fungal',
    severity_typical: 'Moderate',
    image_url: '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
    symptoms:
      'Small dark brown angular spots bounded by leaf veins that enlarge into concentric bullseye rings on mature foliage, leading to yellowing and leaf drop.',
    causes:
      'Favored by alternating wet and dry periods, warm temperatures, and plant stress from nitrogen or potassium deficiency.',
    prevention:
      'Maintain balanced soil fertility (especially adequate potassium), irrigate consistently without drought stress, and rotate with cereal crops.',
    organic_treatment:
      'Apply foliar Trichoderma formulations or certified copper octanoate early when lower leaves show initial lesions.',
    chemical_treatment:
      'Consult an agronomist for mancozeb or difenoconazole-based protectant sprays if foliar lesion incidence rises past economic thresholds.',
  },
  {
    crop_name: 'Rice',
    name: 'Rice Blast',
    pathogen: 'Magnaporthe oryzae',
    category: 'Fungal',
    severity_typical: 'Severe',
    image_url: '/src/assets/images/disease_rice_blast_1795616494031.jpg',
    symptoms:
      'Spindle-shaped or diamond-shaped lesions with pointed ends, grayish-white centers, and dark brown margins on leaves; neck blast causes panicle breakage and empty grains.',
    causes:
      'Excessive nitrogen fertilization, prolonged leaf wetness from dew or drizzle, high planting density, and susceptible varieties.',
    prevention:
      'Adopt blast-resistant rice varieties, split nitrogen applications rather than heavy single basal doses, and maintain proper water depth in paddies.',
    organic_treatment:
      'Seed treatment with Pseudomonas fluorescens and foliar application of botanical extracts or bio-control agents during tillering.',
    chemical_treatment:
      'Apply extension-recommended fungicides such as tricyclazole or isoprothiolane at booting/heading stages if leaf or neck blast appears.',
  },
  {
    crop_name: 'Rice',
    name: 'Bacterial Leaf Blight',
    pathogen: 'Xanthomonas oryzae pv. oryzae',
    category: 'Bacterial',
    severity_typical: 'High',
    image_url: '/src/assets/images/disease_rice_blast_1795616494031.jpg',
    symptoms:
      'Water-soaked yellowish stripes starting along leaf margins and tips, turning pale yellow to straw-colored with wavy margins; milky bacterial ooze may appear on young lesions.',
    causes:
      'Driven by monsoon storms, high winds causing leaf abrasion, warm temperatures (25–34°C), and deep standing water.',
    prevention:
      'Grow resistant cultivars, avoid clipping seedling tips before transplanting, balance nitrogen and potash nutrition, and drain excess water temporarily during outbreaks.',
    organic_treatment:
      'Foliar spraying of certified copper oxychloride or biological antagonistic bacteria formulations where locally approved.',
    chemical_treatment:
      'Antibiotics or bactericides should only be used under strict local agricultural department supervision; prioritize resistant varieties and water management.',
  },
  {
    crop_name: 'Wheat',
    name: 'Wheat Yellow (Stripe) Rust',
    pathogen: 'Puccinia striiformis',
    category: 'Fungal',
    severity_typical: 'Severe',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Bright yellow-orange pustules (uredinia) arranged in distinct parallel linear stripes along leaf veins; powdery yellow spores rub off onto fingers.',
    causes:
      'Wind-dispersed rust spores thriving in cool, moist spring/winter mornings (10–18°C) with dew formation.',
    prevention:
      'Plant regionally recommended rust-resistant wheat varieties and avoid overly early sowing in endemic corridors.',
    organic_treatment:
      'Early field scouting and removal of isolated volunteer wheat pockets; sulfur-based dusting is sometimes used in mild organic systems.',
    chemical_treatment:
      'Targeted triazole or strobilurin fungicides (e.g., propiconazole or tebuconazole) applied promptly upon hotspot detection under agronomist guidance.',
  },
  {
    crop_name: 'Wheat',
    name: 'Wheat Powdery Mildew',
    pathogen: 'Blumeria graminis f. sp. tritici',
    category: 'Fungal',
    severity_typical: 'Moderate',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Fluffy white to gray powdery fungal patches on upper leaf surfaces, sheaths, and awns, eventually turning dull gray with tiny black cleistothecia.',
    causes:
      'Dense canopies, excessive nitrogen, shaded lower foliage, and moderate temperatures (15–22°C) with high humidity.',
    prevention:
      'Use tolerant cultivars, avoid excessive seeding rates and nitrogen top-dressing, and rotate with non-cereal crops.',
    organic_treatment:
      'Wettable sulfur sprays or potassium bicarbonate applied early before flag leaf colonization.',
    chemical_treatment:
      'Consult local extension specialists for registered triazole or morpholine fungicides if disease reaches the flag leaf.',
  },
  {
    crop_name: 'Maize',
    name: 'Northern Corn Leaf Blight',
    pathogen: 'Exserohilum turcicum',
    category: 'Fungal',
    severity_typical: 'Moderate to High',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Long, elliptical, cigar-shaped grayish-green to tan lesions (2.5–15 cm long) running parallel to leaf margins, coalescing to blight entire leaves.',
    causes:
      'Conidia overwinter on maize residue and splash onto lower leaves during warm, humid weather with heavy dew.',
    prevention:
      'Select resistant maize hybrids, incorporate or rotate away from infected maize stubble, and maintain balanced nutrition.',
    organic_treatment:
      'Biological seed coatings and early-stage neem/copper formulations in small-scale organic plots.',
    chemical_treatment:
      'Foliar fungicides (e.g., azoxystrobin or propiconazole) are typically evaluated at tasseling/silking if lesions reach upper leaves.',
  },
  {
    crop_name: 'Maize',
    name: 'Common Rust of Maize',
    pathogen: 'Puccinia sorghi',
    category: 'Fungal',
    severity_typical: 'Moderate',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Small cinnamon-brown oval pustules scattered across both upper and lower leaf surfaces, rupturing the epidermis to release dusty rust spores.',
    causes:
      'Long-distance windborne spores arriving in cool to moderate temperatures (16–23°C) with 6+ hours of leaf wetness.',
    prevention:
      'Grow resistant maize hybrids and schedule planting to avoid peak spore arrival during vegetative vulnerability.',
    organic_treatment:
      'Ensure adequate potassium fertilization and air circulation; monitor sweet corn and seed crops closely.',
    chemical_treatment:
      'Protectant or systemic strobilurin/triazole sprays only if economic threshold is crossed before silking.',
  },
  {
    crop_name: 'Cotton',
    name: 'Cotton Bacterial Blight (Angular Leaf Spot)',
    pathogen: 'Xanthomonas citri pv. malvacearum',
    category: 'Bacterial',
    severity_typical: 'Moderate to High',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Small, dark green, water-soaked angular spots bounded by leaf veins that turn dark brown to black; blackening of veins and boll rot may follow.',
    causes:
      'Seed-borne bacteria and wind-driven rain splash entering through stomata or leaf wounds.',
    prevention:
      'Use acid-delinted, certified disease-free cotton seed, plant resistant varieties, and avoid working in fields when foliage is wet.',
    organic_treatment:
      'Seed treatment with bio-control Pseudomonas strains and early copper hydroxide applications within organic guidelines.',
    chemical_treatment:
      'Follow local agricultural university advisories for copper-based bactericide sprays during early vegetative outbreaks.',
  },
  {
    crop_name: 'Chilli',
    name: 'Chilli Anthracnose & Die-Back',
    pathogen: 'Colletotrichum capsici',
    category: 'Fungal',
    severity_typical: 'High',
    image_url: '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
    symptoms:
      'Sunken circular necrotic lesions with dark concentric rings of acervuli on leaves and fruits; shoots may die back from the tip downward.',
    causes: 'Warm humid weather, rain splash, and infected seed or crop residues.',
    prevention:
      'Use disease-free seed, ensure good drainage, stake tall chilli varieties, and harvest ripe pods promptly.',
    organic_treatment:
      'Seed treatment with Trichoderma harzianum and neem oil or copper soap foliar sprays.',
    chemical_treatment:
      'Consult an agronomist for carbendazim, azoxystrobin, or mancozeb rotations observing strict pre-harvest intervals.',
  },
  {
    crop_name: 'Grapes',
    name: 'Grapevine Downy Mildew',
    pathogen: 'Plasmopara viticola',
    category: 'Fungal',
    severity_typical: 'Severe',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Translucent yellowish "oil-spot" lesions on the upper leaf surface paired with dense white downy sporulation on the corresponding underside.',
    causes:
      'Warm rainy weather (>10 mm rain and >10°C overnight) triggering zoospore splash onto young leaves and clusters.',
    prevention:
      'Maintain open vine canopy through pruning and shoot positioning to accelerate leaf drying after rain or dew.',
    organic_treatment:
      'Preventive Bordeaux mixture or copper hydroxide applications timed prior to forecast rain events.',
    chemical_treatment:
      'Rotate anti-oomycete fungicides (e.g., fosetyl-Al or mandipropamid) strictly per viticulture resistance management guidelines.',
  },
  {
    crop_name: 'Tomato',
    name: 'Healthy Foliage Baseline',
    pathogen: 'None (Healthy Tissue)',
    category: 'Healthy',
    severity_typical: 'None',
    image_url: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
    symptoms:
      'Uniform rich green leaf coloration, intact margins, crisp venation, and absence of necrotic lesions, chlorotic halos, or fungal sporulation.',
    causes:
      'Balanced macro- and micronutrient availability, proper irrigation timing, and effective preventive field hygiene.',
    prevention:
      'Continue routine weekly scouting of lower and upper canopy, drip irrigation at soil level, and balanced organic compost nutrition.',
    organic_treatment:
      'No curative treatment required. Maintain preventive mulching and beneficial insect habitat.',
    chemical_treatment: 'No chemical intervention needed.',
  },
];

export const SEED_ARTICLES = [
  {
    title: 'How to Capture Accurate Leaf Photos for AI Diagnosis',
    title_kn: 'AI ರೋಗ ಪತ್ತೆಗೆ ನಿಖರವಾದ ಎಲೆ ಚಿತ್ರಗಳನ್ನು ತೆಗೆಯುವುದು ಹೇಗೆ',
    category: 'Field Scouting',
    summary:
      'Simple lighting, framing, and focus habits that improve disease identification accuracy in the field.',
    summary_kn:
      'ಹೊಲದಲ್ಲಿ ರೋಗ ಪತ್ತೆ ನಿಖರತೆಯನ್ನು ಸುಧಾರಿಸಲು ಸರಳ ಬೆಳಕು ಮತ್ತು ಫೋಟೋ ತೆಗೆಯುವ ವಿಧಾನಗಳು.',
    content:
      'Place a single affected leaf against a plain, contrasting background such as light soil, paper, or your palm. Shoot in bright, indirect daylight rather than harsh midday shadows so lesion margins, halos, and concentric rings remain sharp. Avoid motion blur and capture both early-stage spots and the transition zone to healthy green tissue.',
    content_kn:
      'ಒಂದೇ ಬಾಧಿತ ಎಲೆಯನ್ನು ತಿಳಿ ಮಣ್ಣು, ಕಾಗದ ಅಥವಾ ಅಂಗೈಯಂತಹ ಸರಳ ಹಿನ್ನೆಲೆಯಲ್ಲಿ ಇರಿಸಿ. ಕಡು ನೆರಳುಗಳ ಬದಲು ಸ್ಪಷ್ಟವಾದ ಹಗಲು ಬೆಳಕಿನಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ. ಇದರಿಂದ ಕಲೆಗಳ ಅಂಚುಗಳು ಮತ್ತು ಹಳದಿ ವಲಯಗಳು ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುತ್ತವೆ.',
    read_time: '3 min read',
  },
  {
    title: 'Early Blight vs. Late Blight: Key Visual Differences in Solanaceous Crops',
    title_kn: 'ಆರಂಭಿಕ ಬ್ಲೈಟ್ ಮತ್ತು ಲೇಟ್ ಬ್ಲೈಟ್: ಟೊಮೆಟೊ ಮತ್ತು ಆಲೂಗಡ್ಡೆಯಲ್ಲಿ ವ್ಯತ್ಯಾಸಗಳು',
    category: 'Plant Pathology',
    summary:
      'Distinguishing Alternaria concentric rings from rapid Phytophthora water-soaked lesions before applying sprays.',
    summary_kn:
      'ಸಿಂಪಡಣೆ ಮಾಡುವ ಮೊದಲು ಆಲ್ಟರ್ನೇರಿಯಾ ವೃತ್ತಾಕಾರದ ಕಲೆಗಳು ಮತ್ತು ಫೈಟೊಫ್ಥೊರಾ ನೀರಿನಂತಹ ಕಲೆಗಳನ್ನು ಗುರುತಿಸುವ ವಿಧಾನ.',
    content:
      'Early blight (Alternaria solani) typically begins on older lower leaves with dry, papery brown spots containing concentric target-board rings and a yellow halo. Late blight (Phytophthora infestans) spreads much faster during cool, wet weather, creating dark water-soaked blotches with white downy growth on leaf undersides. Identifying the correct pathogen prevents wasted fungicides and protects yield.',
    content_kn:
      'ಆರಂಭಿಕ ಬ್ಲೈಟ್ ಸಾಮಾನ್ಯವಾಗಿ ಕೆಳಗಿನ ಹಳೆಯ ಎಲೆಗಳಲ್ಲಿ ವೃತ್ತಾಕಾರದ ಕಂದು ಕಲೆಗಳೊಂದಿಗೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಲೇಟ್ ಬ್ಲೈಟ್ ತಂಪಾದ, ಆರ್ದ್ರ ಹವಾಮಾನದಲ್ಲಿ ವೇಗವಾಗಿ ಹರಡಿ, ಎಲೆಯ ಕೆಳಭಾಗದಲ್ಲಿ ಬಿಳಿ ಬೂಷ್ಟನ್ನು ಉಂಟುಮಾಡುತ್ತದೆ.',
    read_time: '5 min read',
  },
  {
    title: 'Integrated Pest Management (IPM) for Smallholder Farms',
    title_kn: 'ಸಣ್ಣ ರೈತರಿಗಾಗಿ ಸಮಗ್ರ ಕೀಟ ಮತ್ತು ರೋಗ ನಿರ್ವಹಣೆ (IPM)',
    category: 'Sustainable Agronomy',
    summary:
      'Combining resistant varieties, crop rotation, biologicals, and targeted interventions to lower input costs.',
    summary_kn:
      'ಖರ್ಚು ಕಡಿಮೆ ಮಾಡಲು ರೋಗ ನಿರೋಧಕ ತಳಿಗಳು, ಬೆಳೆ ಪರಿವರ್ತನೆ ಮತ್ತು ಜೈವಿಕ ನಿಯಂತ್ರಣದ ಸಂಯೋಜನೆ.',
    content:
      'Effective crop protection begins long before spraying. Combining certified seed, 2-to-3-season crop rotation, field sanitation, Trichoderma or Pseudomonas bio-agents, and threshold-based selective treatments reduces chemical dependency while preserving beneficial pollinators and soil microbes.',
    content_kn:
      'ಪರಿಣಾಮಕಾರಿ ಬೆಳೆ ರಕ್ಷಣೆಯು ಸಿಂಪಡಣೆಗಿಂತ ಮೊದಲೇ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಪ್ರಮಾಣೀಕೃತ ಬೀಜಗಳು, ಬೆಳೆ ಪರಿವರ್ತನೆ ಮತ್ತು ಜೈವಿಕ ನಿಯಂತ್ರಕಗಳ ಬಳಕೆಯು ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ಕಾಪಾಡಿ ಖರ್ಚನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.',
    read_time: '4 min read',
  },
];
