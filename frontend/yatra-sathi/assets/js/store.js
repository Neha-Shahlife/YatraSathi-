/* =========================================================================
   YATRA SATHI — OFFLINE STORE (localStorage adapter)
   =========================================================================
   This file implements EXACTLY the same method names and return shapes as
   the backend client in api.js. It is what runs when YS_CONFIG.API_BASE is
   empty, and what api.js falls back to if the backend is unreachable.

   Every method is async so that swapping in the real Python API changes
   nothing in the pages.

   DO NOT put UI code in this file.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   Seed data (demo content so the prototype is never empty)
   --------------------------------------------------------------------------- */

const DEMO_USER = {
  id: "u-demo",
  role: "traveler",
  name: "Anish M.",
  email: "anish@example.com",
  password: "traveler123",
  phone: "+977 9841-234567",
  age: 24,
  location: "Kathmandu, Nepal",
  type: "Slow travel & Mountain explorer",
  bio: "Passionate photographer and backpacker from Kathmandu. I love early sunrises, authentic local tea houses, quiet trails, and sharing road trips with fellow open-minded travellers.",
  memberSince: "October 2024",
  joined: "2024-10-07",
  avatar: "",
  rating: 4.9,
  tripsHosted: 3,
  tripsJoined: 5,
  interests: [
    "Mountain Trekking",
    "Landscape Photography",
    "Local Street Food",
    "Stargazing",
    "Campfires",
    "Cultural Heritage",
    "Motorbike Touring",
  ],
  pace: "Relaxed & Observant",
  budget: "Mid-range (Clean homestays & local cafes)",
  languages: ["Nepali (Native)", "English (Fluent)", "Hindi"],
  verifiedId: true,
  verifiedPhone: true,
  visitedDestinations: [
    "Pokhara",
    "Upper Mustang",
    "Annapurna Base Camp",
    "Langtang Valley",
    "Chitwan National Park",
    "Bandipur",
  ],
  emergencyContact: "+977 9801-998877 (Close Family)",
};

const DEMO_ADMIN = {
  id: "u-admin",
  role: "admin",
  name: "System Admin",
  email: "admin@yatrasathi.com",
  password: "admin123",
  age: 30,
  type: "Platform superuser",
  bio: "Platform owner account. Manages users and travel plans.",
  memberSince: "January 2024",
  joined: "2024-01-01",
  avatar: "",
};

const DEMO_TRIPS = [
  {
    id: "t1",
    title: "Weekend escape to Pokhara & Sarangkot",
    dest: "Pokhara",
    date: "2026-10-03",
    days: 3,
    type: "Relaxed",
    spots: 2,
    totalSpots: 4,
    owner: "Anish M.",
    ownerId: "u-demo",
    published: true,
    ownerBio:
      "Outdoor photographer & mountain enthusiast based in Kathmandu. Loves sunset boating and Sarangkot viewpoints.",
    ownerRating: "4.9 ★ (8 reviews)",
    ownerJoined: "Joined Oct 2024",
    desc: "A relaxed weekend getaway from Kathmandu to Pokhara. We will enjoy scenic drives through the Trishuli valley, rent quiet wooden boats on Phewa Lake, watch the sunrise over Machhapuchhre from Sarangkot, and chill at lakeside cafes in the evening.",
    altitude: "822m - 1,600m",
    difficulty: "Easy & Leisure",
    bestSeason: "Sept - Dec, Feb - May",
    estimatedBudget: "NPR 11,000 - 14,000 per person",
    transport: "Tourist Bus / Shared Van",
    meetingPoint: "Sorhakhutte Tourist Bus Park, Kathmandu (6:30 AM)",
    itinerary: [
      {
        day: 1,
        title: "Kathmandu to Pokhara Scenic Drive & Lakeside Sunset",
        desc: "Depart early morning along the Prithvi Highway with stops for breakfast by Trishuli river. Check in at Lakeside hotel in Pokhara, freshen up, take a peaceful sunset boat ride on Phewa Lake, and explore lakeside live acoustic cafes.",
        tags: ["Scenic Drive", "Phewa Lake Boating", "Lakeside Stroll"],
      },
      {
        day: 2,
        title: "Sarangkot Sunrise, Peace Pagoda Hike & Davis Falls",
        desc: "Early 5:00 AM trip to Sarangkot hill station for panoramic Himalayan sunrise over Annapurna & Dhaulagiri. Afternoon hike up to World Peace Pagoda overlooking Pokhara valley, followed by visits to Gupteshwor Mahadev Cave and Davis Falls.",
        tags: ["Annapurna Sunrise", "Peace Pagoda", "Cave Exploration"],
      },
      {
        day: 3,
        title: "Morning Breakfast by Lake & Return to Kathmandu",
        desc: "Enjoy a relaxed breakfast overlooking the lake, pick up local coffee or baked goods, and head back toward Kathmandu with arrival by early evening.",
        tags: ["Lakeside Breakfast", "Scenic Return"],
      },
    ],
    inclusions: [
      "Comfortable tourist coach transport Kathmandu-Pokhara return",
      "2 nights lakeside hotel (twin share, breakfast included)",
      "Phewa Lake boat rental with life jackets",
      "Private cab for Sarangkot sunrise & Peace Pagoda trip",
    ],
    exclusions: [
      "Lunches and dinners at cafes",
      "Personal souvenirs, coffee, and beverages",
      "Personal travel insurance",
    ],
    packingList: [
      "Comfortable walking shoes or light trainers",
      "Light jacket / fleece for Sarangkot morning breeze",
      "Sunglasses, sunscreen & hat",
      "Camera or smartphone with powerbank",
      "Cash in NPR for local cafes and roadside snacks",
    ],
  },
  {
    id: "t2",
    title: "Upper Mustang Ancient Desert & Road Journey",
    dest: "Mustang",
    date: "2026-10-18",
    days: 6,
    type: "Road trip",
    spots: 3,
    totalSpots: 5,
    owner: "Sadhana K.",
    ownerId: "u-sadhana",
    published: true,
    ownerBio:
      "Travel writer and road trip driver who has crossed Upper Mustang twice. Loves Tibetan culture, canyon cliffs, and homestays.",
    ownerRating: "5.0 ★ (12 reviews)",
    ownerJoined: "Joined Jun 2024",
    desc: "An epic 4x4 overland expedition into the rain-shadow territory of Upper Mustang. We will drive through dramatic sandstone canyons, historic Tibetan-style walled villages, red cliffs of Dhakmar, and the mystical kingdom of Lo Manthang.",
    altitude: "2,700m - 3,840m",
    difficulty: "Moderate Road Trip",
    bestSeason: "March - Nov",
    estimatedBudget: "NPR 35,000 - 45,000 per person (inc. special permit)",
    transport: "4WD Mahindra Scorpio / Land Cruiser",
    meetingPoint: "Pokhara Old Bus Stand or Beni Bazaar (7:00 AM)",
    itinerary: [
      {
        day: 1,
        title: "Pokhara to Tatopani & Kalopani",
        desc: "Drive through Beni along the Kali Gandaki river canyon, passing the world's deepest gorge between Dhaulagiri and Annapurna. Relax at natural hot springs in Tatopani before staying at Kalopani with snow peak views.",
        tags: ["Kali Gandaki Gorge", "Tatopani Hot Spring", "Dhaulagiri Views"],
      },
      {
        day: 2,
        title: "Kalopani to Kagbeni & Chele",
        desc: "Pass Jomsom and the sacred windswept valley of Kagbeni (the gateway checkpoint to Upper Mustang). Cross into the arid landscape to reach the cliffside settlement of Chele.",
        tags: ["Kagbeni Gateway", "Arid Canyons", "Local Apple Orchards"],
      },
      {
        day: 3,
        title: "Chele through Syangboche to Ghami & Charang",
        desc: "Traverse high passes including Yamda La and Nyi La (4,010m). Marvel at the ancient Mani walls and red chortens of Ghami before arriving at Charang village with its ancient monastery.",
        tags: ["High Mountain Passes", "Red Chortens", "Charang Monastery"],
      },
      {
        day: 4,
        title: "Charang to Lo Manthang & Sky Caves of Chhoser",
        desc: "Arrive at the walled medieval capital of Lo Manthang. Explore the King’s palace, ancient gompas, and take a local horse or jeep excursion to the multi-story Sky Caves of Chhoser.",
        tags: ["Walled City", "King's Palace", "Chhoser Sky Caves"],
      },
      {
        day: 5,
        title: "Lo Manthang to Muktinath Sacred Temple",
        desc: "Journey southward via scenic ridge roads toward Muktinath, the sacred pilgrimage temple sacred to Hindus and Buddhists with 108 stone water spouts and eternal flame.",
        tags: ["Muktinath Temple", "108 Water Spouts", "Scenic Ridge Drive"],
      },
      {
        day: 6,
        title: "Muktinath to Jomsom & Return to Pokhara",
        desc: "Morning descent down Kali Gandaki riverbed to Jomsom and drive back down to Pokhara for a farewell dinner.",
        tags: ["Jomsom Valley", "Return to Pokhara"],
      },
    ],
    inclusions: [
      "Shared 4x4 off-road vehicle with experienced mountain driver",
      "5 nights local guesthouse / homestay accommodation",
      "Upper Mustang special restricted area permit processing",
      "Experienced local cultural guide",
    ],
    exclusions: [
      "Personal snacks, bottled water & hot showers in high villages",
      "Personal riding gear or horse rentals in Lo Manthang",
      "Tips for vehicle driver & guide",
    ],
    packingList: [
      "Windproof and dustproof jacket (Mustang gets very windy)",
      "High SPF sunscreen and lip balm with UV filter",
      "Warm thermals for freezing nights",
      "Valid passport / Citizenship copy and 4 passport photos for permit",
      "Good sunglasses and buff / scarf for dust protection",
    ],
  },
  {
    id: "t3",
    title: "Annapurna Sanctuary Short Trek",
    dest: "Annapurna",
    date: "2026-11-02",
    days: 7,
    type: "Trekking",
    spots: 2,
    totalSpots: 4,
    owner: "Rohan P.",
    ownerId: "u-rohan",
    published: true,
    ownerBio:
      "Certified wilderness first responder and passionate Himalayan hiker. Organized over 15 high-altitude treks.",
    ownerRating: "4.8 ★ (15 reviews)",
    ownerJoined: "Joined Feb 2024",
    desc: "An invigorating trek into the Annapurna Sanctuary amphitheatre. Surrounded 360-degrees by giants like Annapurna I (8,091m), Machhapuchhre (Fishtail), and Hiunchuli. Ideal for fit travellers who love mountain trails.",
    altitude: "1,940m - 4,130m (ABC)",
    difficulty: "Challenging / Active",
    bestSeason: "Oct - Dec, March - May",
    estimatedBudget: "NPR 22,000 - 28,000 per person",
    transport: "Shared Jeep Pokhara to Ghandruk / Siwai",
    meetingPoint: "Pokhara Lakeside Gate (6:00 AM)",
    itinerary: [
      {
        day: 1,
        title: "Pokhara drive to Siwai & Trek to Chhomrong",
        desc: "Scenic jeep drive to Siwai trailhead followed by stone-stair ascent through lush rhododendron forests and Gurung villages to Chhomrong with grand views of Fishtail.",
        tags: ["Gurung Villages", "Stone Stairs", "Fishtail View"],
      },
      {
        day: 2,
        title: "Chhomrong to Dovan & Himalaya",
        desc: "Descend into the Chhomrong Khola river and climb steeply through dense bamboo and oak forest to reach the peaceful Himalayan lodge settlement.",
        tags: ["Bamboo Forest", "River Crossing", "Mountain Lodge"],
      },
      {
        day: 3,
        title: "Himalaya to Machhapuchhre Base Camp (MBC)",
        desc: "Trek past Hinku Cave and enter the gateway gorge of the Annapurna Sanctuary, opening up to majestic vistas at MBC (3,700m).",
        tags: ["Alpine Landscape", "Hinku Cave", "MBC 3,700m"],
      },
      {
        day: 4,
        title: "MBC to Annapurna Base Camp (ABC - 4,130m)",
        desc: "Gentle 2-hour morning ascent into the heart of ABC surrounded by 360-degree snow walls and glaciers. Golden sunset over Annapurna I.",
        tags: ["Annapurna Base Camp", "Glacier Panorama", "Golden Sunset"],
      },
      {
        day: 5,
        title: "Sunrise at ABC & Descent to Bamboo",
        desc: "Watch the world turn golden at sunrise across the amphitheatre. Begin descent through alpine valleys down to Bamboo.",
        tags: ["Sanctuary Sunrise", "Mountain Photography", "Descent"],
      },
      {
        day: 6,
        title: "Bamboo to Jhinu Danda Hot Springs",
        desc: "Trek via Chhomrong to Jhinu Danda. In the afternoon, soak tired muscles in natural hot springs right beside the roaring river.",
        tags: ["Jhinu Hot Springs", "Suspension Bridge"],
      },
      {
        day: 7,
        title: "Jhinu Danda to Siwai & Drive back to Pokhara",
        desc: "Short morning walk across the suspension bridge to the jeep station, drive back to Pokhara, celebration dinner lakeside.",
        tags: ["Celebration Dinner", "Pokhara Return"],
      },
    ],
    inclusions: [
      "ACAP (Annapurna Conservation Area) and TIMS trekking permits",
      "Shared jeep transfer Pokhara-Siwai return",
      "6 nights tea-house accommodation on mountain route",
      "Trek safety briefing and first aid support",
    ],
    exclusions: [
      "Individual food, tea, and boiled drinking water",
      "Hot shower and device charging fees in high lodges",
      "Porters (available on request for shared fee)",
    ],
    packingList: [
      "Sturdy, broken-in trekking boots with ankle support",
      "Warm down jacket and thermal base layers",
      "Trekking poles and headlamp",
      "Water purification tablets or UV filter",
      "Personal blister kit and altitude medication",
    ],
  },
  {
    id: "t4",
    title: "Chitwan Wildlife & Jungle Safari Weekend",
    dest: "Chitwan",
    date: "2026-10-24",
    days: 2,
    type: "Nature",
    spots: 4,
    totalSpots: 6,
    owner: "Mina T.",
    ownerId: "u-mina",
    published: true,
    ownerBio:
      "Wildlife conservation graduate and birdwatcher. Enthusiastic about introducing travellers to Nepal's Terai biodiversity.",
    ownerRating: "4.9 ★ (6 reviews)",
    ownerJoined: "Joined Jul 2024",
    desc: "A warm and exciting weekend in Chitwan National Park. We will go on open-top jeep safaris in search of the one-horned rhinoceros and Bengal tigers, canoe down the Rapti River observing marsh mugger crocodiles, and watch sunset over the elephant grass.",
    altitude: "150m - 250m (Subtropical plains)",
    difficulty: "Easy & Family-friendly",
    bestSeason: "Oct - March",
    estimatedBudget: "NPR 9,000 - 12,000 per person",
    transport: "Tourist Bus from Kathmandu or Pokhara",
    meetingPoint: "Sauraha Bus Park, Chitwan (1:00 PM Day 1)",
    itinerary: [
      {
        day: 1,
        title: "Arrival in Sauraha, River Canoe & Sunset",
        desc: "Arrive in Sauraha, check into peaceful garden resort. Afternoon wooden canoe ride along Rapti river watching kingfishers, gharials, and rhinos grazing by the banks. Evening cultural Tharu stick dance performance.",
        tags: ["Canoe Ride", "Gharial Crocodiles", "Tharu Culture"],
      },
      {
        day: 2,
        title: "Deep Jungle Jeep Safari & Elephant Care Visit",
        desc: "Half-day open jeep safari through core zones of Chitwan National Park spotting deer, wild boars, rhinos, and diverse bird species. Visit Elephant breeding and conservation sanctuary before departure.",
        tags: ["Jeep Safari", "One-horned Rhinos", "Bird Watching"],
      },
    ],
    inclusions: [
      "Chitwan National Park entrance permits",
      "1 night cottage resort accommodation with pool & garden",
      "Rapti river canoe safari with nature guide",
      "Open jeep safari through national park buffer zone",
    ],
    exclusions: [
      "Intercity bus travel to/from Sauraha",
      "Personal bar drinks and snacks",
      "Tips for jungle safari driver and nature guide",
    ],
    packingList: [
      "Dull-colored or neutral clothing (khaki, olive green, beige for wildlife spotting)",
      "Mosquito repellent and light long-sleeve cotton shirt",
      "Binoculars and camera with zoom lens",
      "Hat and sunglasses",
      "Light sandals and walking sneakers",
    ],
  },
  /* ---------------------------------------------------------------------
     Additional plans. These carry only the core fields — the trip-detail
     page generates a day-by-day outline and fast facts from `days` and
     `dest`, so they still render as full trips.
     Trips owned by "u-demo" are the demo traveller's own, so My Trips and
     the Partner Requests page have real content to work with.
     --------------------------------------------------------------------- */
  {
    id: "t5",
    title: "Everest Base Camp classic trek",
    dest: "Everest",
    date: "2026-10-12",
    days: 14,
    type: "Trekking",
    spots: 4,
    totalSpots: 6,
    owner: "Tenzing S.",
    ownerId: "u-tenzing",
    published: true,
    desc: "The full Khumbu walk-in from Lukla via Namche and Tengboche, with acclimatisation days built in. Steady pace, teahouse nights, early starts.",
    ownerBio: "Khumbu-raised guide with nine EBC seasons behind him.",
    ownerRating: "5.0 ★ (21 reviews)",
    ownerJoined: "Joined Jan 2024",
  },
  {
    id: "t6",
    title: "Langtang Valley & Kyanjin Ri",
    dest: "Langtang",
    date: "2026-10-09",
    days: 7,
    type: "Trekking",
    spots: 3,
    totalSpots: 5,
    owner: "Anish M.",
    ownerId: "u-demo",
    published: true,
    desc: "The closest real Himalayan valley to Kathmandu. Bus to Syabrubesi, then up through bamboo and yak pasture to Kyanjin Gompa, with a dawn climb of Kyanjin Ri.",
    ownerBio: "Outdoor photographer & mountain enthusiast based in Kathmandu.",
    ownerRating: "4.9 ★ (8 reviews)",
    ownerJoined: "Joined Oct 2024",
  },
  {
    id: "t7",
    title: "Bhaktapur & Nagarkot heritage weekend",
    dest: "Kathmandu Valley",
    date: "2026-09-26",
    days: 2,
    type: "Cultural",
    spots: 5,
    totalSpots: 6,
    owner: "Sita R.",
    ownerId: "u-sita",
    published: true,
    desc: "Newari courtyards, pottery square and juju dhau in Bhaktapur, then up to Nagarkot for a Himalayan sunrise over the valley rim.",
    ownerBio: "Heritage-walk organiser and lifelong valley resident.",
    ownerRating: "4.7 ★ (9 reviews)",
    ownerJoined: "Joined Mar 2025",
  },
  {
    id: "t8",
    title: "Bandipur ridge weekend from Kathmandu",
    dest: "Bandipur",
    date: "2026-10-02",
    days: 2,
    type: "Relaxed",
    spots: 4,
    totalSpots: 5,
    owner: "Anish M.",
    ownerId: "u-demo",
    published: true,
    desc: "A car-free hilltop bazaar with big mountain views. Slow mornings on the Tundikhel, an afternoon at Siddha Cave, and evening momo on the main street.",
    ownerBio: "Outdoor photographer & mountain enthusiast based in Kathmandu.",
    ownerRating: "4.9 ★ (8 reviews)",
    ownerJoined: "Joined Oct 2024",
  },
  {
    id: "t9",
    title: "Rara Lake far-west expedition",
    dest: "Rara Lake",
    date: "2026-10-20",
    days: 9,
    type: "Road trip",
    spots: 2,
    totalSpots: 4,
    owner: "Bikash T.",
    ownerId: "u-bikash",
    published: true,
    desc: "Flight to Nepalgunj, then overland into Mugu for Nepal's largest lake. Pine forest, Murma Top sunsets and almost no other travellers.",
    ownerBio: "Documentary filmmaker drawn to the Karnali roads.",
    ownerRating: "4.8 ★ (5 reviews)",
    ownerJoined: "Joined Aug 2024",
  },
  {
    id: "t10",
    title: "Ilam tea gardens & Antu Danda sunrise",
    dest: "Ilam",
    date: "2026-11-14",
    days: 5,
    type: "Nature",
    spots: 4,
    totalSpots: 6,
    owner: "Pratima L.",
    ownerId: "u-pratima",
    published: true,
    desc: "Eastern hills at their greenest. Walking the Kanyam terraces, a working tea-factory visit, and the Kanchenjunga sunrise from Antu Danda.",
    ownerBio: "Tea buyer from Jhapa, in the eastern hills most months.",
    ownerRating: "4.9 ★ (7 reviews)",
    ownerJoined: "Joined May 2025",
  },
  {
    id: "t11",
    title: "Poon Hill short trek for first-timers",
    dest: "Annapurna",
    date: "2026-09-29",
    days: 4,
    type: "Trekking",
    spots: 3,
    totalSpots: 6,
    owner: "Rohan P.",
    ownerId: "u-rohan",
    published: true,
    desc: "The friendliest introduction to Himalayan trekking. Stone stairs through Ulleri, a night at Ghorepani, and the Dhaulagiri-to-Annapurna panorama at dawn.",
    ownerBio: "Certified wilderness first responder and passionate Himalayan hiker.",
    ownerRating: "4.8 ★ (15 reviews)",
    ownerJoined: "Joined Feb 2024",
  },
  {
    id: "t12",
    title: "Muktinath pilgrimage by jeep",
    dest: "Mustang",
    date: "2026-11-08",
    days: 5,
    type: "Cultural",
    spots: 3,
    totalSpots: 6,
    owner: "Kamala G.",
    ownerId: "u-kamala",
    published: true,
    desc: "A steady pilgrimage route up the Kali Gandaki to the 108 water spouts at Muktinath, with nights in Tatopani and Marpha.",
    ownerBio: "Has made the Muktinath journey six times, happy to guide first-timers.",
    ownerRating: "5.0 ★ (11 reviews)",
    ownerJoined: "Joined Nov 2024",
  },
  {
    id: "t13",
    title: "Phewa Lake paragliding & Pokhara long weekend",
    dest: "Pokhara",
    date: "2026-10-16",
    days: 3,
    type: "Adventure",
    spots: 2,
    totalSpots: 4,
    owner: "Dipesh K.",
    ownerId: "u-dipesh",
    published: true,
    desc: "Tandem paragliding off Sarangkot, an afternoon on the lake, and the Peace Pagoda hike. Good for anyone wanting one big adrenaline day.",
    ownerBio: "Paragliding enthusiast, 60+ flights over Phewa.",
    ownerRating: "4.6 ★ (4 reviews)",
    ownerJoined: "Joined Jun 2025",
  },
  {
    id: "t14",
    title: "Bardiya-style jungle days in Chitwan",
    dest: "Chitwan",
    date: "2026-12-06",
    days: 3,
    type: "Nature",
    spots: 5,
    totalSpots: 6,
    owner: "Mina T.",
    ownerId: "u-mina",
    published: true,
    desc: "A slower jungle trip: two jeep safaris, a long canoe stretch, birdwatching at dawn and Tharu cooking in the evening.",
    ownerBio: "Wildlife conservation graduate and birdwatcher.",
    ownerRating: "4.9 ★ (6 reviews)",
    ownerJoined: "Joined Jul 2024",
  },
];

/* Destination catalogue. Trip counts are computed live from the trips list,
   so the "(no. of trips)" shown on the Destinations page is always real.
   `region`, `bestSeason` and `difficulty` feed the destination cards. */
const DEMO_DESTINATIONS = [
  {
    id: "d1",
    name: "Pokhara",
    imageKey: "pokhara",
    region: "Gandaki Province",
    badge: "Lakes & Leisure",
    badgeStyle: "",
    heading: "Lakes & mountain views",
    desc: "Phewa Lake boating, Sarangkot sunrises and slow lakeside cafe afternoons.",
    bestSeason: "Sept - Dec",
    difficulty: "Easy",
    tags: ["Fewa Lake", "Paragliding"],
  },
  {
    id: "d2",
    name: "Mustang",
    imageKey: "mustang",
    region: "Gandaki Province",
    badge: "Road Journey",
    badgeStyle: "gold",
    heading: "Roads & high desert",
    desc: "Wind-carved canyons, apple orchards and the walled city of Lo Manthang.",
    bestSeason: "Mar - Nov",
    difficulty: "Moderate",
    tags: ["Muktinath", "Road Trip"],
  },
  {
    id: "d3",
    name: "Annapurna",
    imageKey: "annapurna",
    region: "Gandaki Province",
    badge: "Trekking",
    badgeStyle: "",
    heading: "Trails & snow peaks",
    desc: "The world's best-loved amphitheatre trek, with routes for every pace.",
    bestSeason: "Oct - Dec, Mar - May",
    difficulty: "Challenging",
    tags: ["ABC Trek", "Poon Hill"],
  },
  {
    id: "d4",
    name: "Chitwan",
    imageKey: "chitwan",
    region: "Bagmati Province",
    badge: "Wildlife",
    badgeStyle: "",
    heading: "Wildlife & jungle",
    desc: "Open-top safaris, river canoeing and one-horned rhinos in the elephant grass.",
    bestSeason: "Oct - Mar",
    difficulty: "Easy",
    tags: ["Rhino Safari", "Canoeing"],
  },
  {
    id: "d5",
    name: "Everest",
    imageKey: "everest",
    region: "Koshi Province",
    badge: "High Himalaya",
    badgeStyle: "gold",
    heading: "Khumbu & base camp",
    desc: "Sherpa villages, Tengboche monastery and the classic walk to Base Camp.",
    bestSeason: "Mar - May, Oct - Nov",
    difficulty: "Strenuous",
    tags: ["EBC Trek", "Namche Bazaar"],
  },
  {
    id: "d6",
    name: "Langtang",
    imageKey: "langtang",
    region: "Bagmati Province",
    badge: "Trekking",
    badgeStyle: "",
    heading: "Valleys close to home",
    desc: "The nearest true Himalayan valley to Kathmandu — yak pastures and Kyanjin Ri.",
    bestSeason: "Oct - Dec, Mar - May",
    difficulty: "Moderate",
    tags: ["Kyanjin Gompa", "Tamang Heritage"],
  },
  {
    id: "d7",
    name: "Kathmandu Valley",
    imageKey: "kathmandu",
    region: "Bagmati Province",
    badge: "Heritage",
    badgeStyle: "",
    heading: "Temples & old towns",
    desc: "Durbar squares, Newari courtyards, hilltop stupas and rim-of-the-valley rides.",
    bestSeason: "All year",
    difficulty: "Easy",
    tags: ["Bhaktapur", "Nagarkot"],
  },
  {
    id: "d8",
    name: "Bandipur",
    imageKey: "bandipur",
    region: "Gandaki Province",
    badge: "Weekend Escape",
    badgeStyle: "",
    heading: "Hilltop Newari town",
    desc: "A car-free bazaar on a ridge, with Himalayan views from the Tundikhel.",
    bestSeason: "Sept - May",
    difficulty: "Easy",
    tags: ["Siddha Cave", "Ridge Walks"],
  },
  {
    id: "d9",
    name: "Rara Lake",
    imageKey: "rara",
    region: "Karnali Province",
    badge: "Off the Grid",
    badgeStyle: "gold",
    heading: "Nepal's biggest lake",
    desc: "Remote blue water ringed by pine forest in the far west — few crowds, long days.",
    bestSeason: "Apr - Jun, Sept - Oct",
    difficulty: "Moderate",
    tags: ["Rara National Park", "Murma Top"],
  },
  {
    id: "d10",
    name: "Ilam",
    imageKey: "ilam",
    region: "Koshi Province",
    badge: "Tea Country",
    badgeStyle: "",
    heading: "Green tea terraces",
    desc: "Rolling tea gardens, misty mornings and Kanyam's endless green ridgelines.",
    bestSeason: "Oct - Apr",
    difficulty: "Easy",
    tags: ["Kanyam", "Antu Danda"],
  },
];

/* Seeded join requests.
   The first three are addressed to trips the demo traveller owns (t1, t6, t8)
   so the Partner Requests page opens with real Accept / Reject work to do.
   The last two are requests the demo traveller sent to other people's trips,
   which is what "Requests I Sent" on My Trips lists. */
const DEMO_REQUESTS = [
  {
    id: "r-seed-1",
    tripId: "t6",
    userId: "u-priya",
    user: "Priya Adhikari",
    phone: "+977 9845-112233",
    spots: 2,
    message:
      "Hi! I've done Ghorepani before but never Langtang. I'd be travelling with my sister — we're both comfortable with 6-7 hour walking days. Would love to join if there's room.",
    status: "Pending",
    created: "2026-09-12T09:20:00.000Z",
  },
  {
    id: "r-seed-2",
    tripId: "t1",
    userId: "u-suman",
    user: "Suman Rai",
    phone: "+977 9812-556677",
    spots: 1,
    message:
      "I'm based in Lalitpur and free that weekend. Happy to share the driving costs and I have my own camera gear for the Sarangkot sunrise.",
    status: "Pending",
    created: "2026-09-13T15:45:00.000Z",
  },
  {
    id: "r-seed-3",
    tripId: "t8",
    userId: "u-maya",
    user: "Maya Gurung",
    phone: "+977 9861-889900",
    spots: 1,
    message:
      "Bandipur has been on my list for years. Solo traveller, easy-going, non-smoker.",
    status: "Accepted",
    created: "2026-09-08T11:10:00.000Z",
    resolved: "2026-09-09T08:00:00.000Z",
  },
  {
    id: "r-seed-4",
    tripId: "t11",
    userId: "u-demo",
    user: "Anish M.",
    phone: "+977 9841-234567",
    spots: 1,
    message:
      "Would like to join the Poon Hill trek — I'm hoping to shoot the dawn panorama.",
    status: "Pending",
    created: "2026-09-11T07:30:00.000Z",
  },
  {
    id: "r-seed-5",
    tripId: "t5",
    userId: "u-demo",
    user: "Anish M.",
    phone: "+977 9841-234567",
    spots: 1,
    message: "Very keen on EBC this season. I have prior 4,000m+ experience.",
    status: "Accepted",
    created: "2026-09-05T12:00:00.000Z",
    resolved: "2026-09-06T09:15:00.000Z",
  },
];

/* Seeded notifications for the demo traveller. Three are unread, so the
   sidebar badge and the dashboard bell both show a count on first load. */
const DEMO_NOTIFICATIONS = [
  {
    id: "n-seed-1",
    userId: "u-demo",
    text: "Priya Adhikari asked to join \"Langtang Valley & Kyanjin Ri\".",
    href: "../requests/request.html",
    read: false,
    created: "2026-09-13T15:45:00.000Z",
  },
  {
    id: "n-seed-2",
    userId: "u-demo",
    text: "Suman Rai asked to join \"Weekend escape to Pokhara & Sarangkot\".",
    href: "../requests/request.html",
    read: false,
    created: "2026-09-12T09:20:00.000Z",
  },
  {
    id: "n-seed-3",
    userId: "u-demo",
    text: "Your request to join \"Everest Base Camp classic trek\" was accepted.",
    href: "../my-trips/myTrip.html",
    read: false,
    created: "2026-09-06T09:15:00.000Z",
  },
  {
    id: "n-seed-4",
    userId: "u-demo",
    text: "You accepted Maya Gurung for \"Bandipur ridge weekend from Kathmandu\".",
    href: "../requests/request.html",
    read: true,
    created: "2026-09-09T08:00:00.000Z",
  },
  {
    id: "n-seed-5",
    userId: "u-demo",
    text: "Your travel plan \"Bandipur ridge weekend from Kathmandu\" was published.",
    href: "../trip-detail/tripDetail.html?id=t8",
    read: true,
    created: "2026-09-01T10:00:00.000Z",
  },
];

/* Bump this when the seed content above changes. Anyone who already has the
   old demo data in localStorage gets the new content on their next load —
   accounts they registered themselves are preserved. */
const SEED_VERSION = "2";

/* ---------------------------------------------------------------------------
   Store
   --------------------------------------------------------------------------- */

const Store = {
  keys: {
    users: "ys_users",
    session: "ys_session",
    token: "ys_token",
    trips: "ys_trips",
    requests: "ys_requests",
    notifications: "ys_notifications",
    saved: "ys_saved",
    seedVersion: "ys_seed_version",
  },

  /* ---------- low-level helpers ---------- */

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  },

  _uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  },

  /* Strip the password before anything leaves the store, so page code never
     holds credentials. Python should do the same. */
  _safe(user) {
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
  },

  /* ---------- seeding ---------- */

  seed() {
    const storedVersion = localStorage.getItem(this.keys.seedVersion);
    const isStale = storedVersion !== SEED_VERSION;

    /* --- users: always make sure the demo + admin accounts exist, and
           never touch accounts the visitor registered themselves --- */
    let users = this._read(this.keys.users, []);
    for (const demo of [DEMO_USER, DEMO_ADMIN]) {
      if (!users.some((u) => u.id === demo.id)) users.push({ ...demo });
    }
    this._write(this.keys.users, users);

    /* --- demo content: replaced whenever the seed version changes --- */
    const trips = this._read(this.keys.trips, null);
    if (isStale || !trips || !trips.length) {
      /* Keep any trips the visitor created; refresh the demo ones. */
      const demoIds = DEMO_TRIPS.map((t) => t.id);
      const userCreated = (trips || []).filter(
        (t) => !demoIds.includes(t.id) && t.ownerId !== "u-demo",
      );
      this._write(this.keys.trips, [
        ...DEMO_TRIPS.map((t) => ({ ...t })),
        ...userCreated,
      ]);
    }

    const requests = this._read(this.keys.requests, null);
    if (isStale || requests === null) {
      const seededIds = DEMO_REQUESTS.map((r) => r.id);
      const userMade = (requests || []).filter(
        (r) => !seededIds.includes(r.id) && !String(r.id).startsWith("r-seed"),
      );
      this._write(this.keys.requests, [
        ...DEMO_REQUESTS.map((r) => ({ ...r })),
        ...userMade,
      ]);
    }

    const notifications = this._read(this.keys.notifications, null);
    if (isStale || notifications === null) {
      const userNotifs = (notifications || []).filter(
        (n) => !String(n.id).startsWith("n-seed"),
      );
      this._write(this.keys.notifications, [
        ...DEMO_NOTIFICATIONS.map((n) => ({ ...n })),
        ...userNotifs,
      ]);
    }

    if (this._read(this.keys.saved, null) === null) {
      this._write(this.keys.saved, ["t3"]);
    }

    localStorage.setItem(this.keys.seedVersion, SEED_VERSION);
  },

  /* ---------- session ---------- */

  _session() {
    return this._read(this.keys.session, null);
  },

  _startSession(user) {
    const token = "local-" + btoa(unescape(encodeURIComponent(user.email)));
    localStorage.setItem(this.keys.token, token);
    this._write(this.keys.session, { userId: user.id, email: user.email });
    return { token, user: this._safe(user) };
  },

  _currentUserRaw() {
    const s = this._session();
    if (!s) return null;
    const users = this._read(this.keys.users, []);
    return users.find((u) => u.id === s.userId) || null;
  },

  /* =======================================================================
     AUTH
     ======================================================================= */

  async register(payload) {
    const users = this._read(this.keys.users, []);
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();

    if (users.some((u) => String(u.email).toLowerCase() === email)) {
      throw new Error("An account with this email already exists.");
    }

    const user = {
      id: this._uid("u"),
      role: YS_CONFIG.ROLES.TRAVELER,
      name: String(payload.name || "").trim(),
      email,
      password: payload.password || "",
      age: Number(payload.age) || null,
      type: payload.type || "Slow travel",
      bio: "New to Yatra Sathi.",
      location: "",
      phone: "",
      avatar: "",
      joined: new Date().toISOString().slice(0, 10),
      memberSince: new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      interests: [],
      visitedDestinations: [],
      languages: [],
      pace: "Relaxed & Observant",
      budget: "Mid-range (Clean homestays & local cafes)",
      emergencyContact: "",
      verifiedId: false,
      verifiedPhone: false,
    };

    users.push(user);
    this._write(this.keys.users, users);
    const session = this._startSession(user);
    await this.createNotification("Welcome to Yatra Sathi.");
    return session;
  },

  async login({ email, password }) {
    const users = this._read(this.keys.users, []);
    const target = String(email || "")
      .trim()
      .toLowerCase();
    const user = users.find((u) => String(u.email).toLowerCase() === target);

    if (!user) {
      throw new Error("No account found with that email.");
    }
    /* Offline mode is a prototype: accept a matching password, or any
       password for the seeded demo accounts so the flow stays testable. */
    const isDemo = user.id === "u-demo" || user.id === "u-admin";
    if (!isDemo && user.password && user.password !== password) {
      throw new Error("Incorrect password.");
    }
    return this._startSession(user);
  },

  async googleAuth() {
    /* Front-end prototype only. Real Google OAuth is handled by Python:
       see docs/API_CONTRACT.md → POST /auth/google */
    const users = this._read(this.keys.users, []);
    const user = users.find((u) => u.id === "u-demo") || users[0];
    return this._startSession(user);
  },

  async logout() {
    localStorage.removeItem(this.keys.token);
    localStorage.removeItem(this.keys.session);
    return { ok: true };
  },

  async me() {
    return this._safe(this._currentUserRaw());
  },

  /* =======================================================================
     PROFILE
     ======================================================================= */

  async updateProfile(patch) {
    const users = this._read(this.keys.users, []);
    const s = this._session();
    if (!s) throw new Error("Not signed in.");
    const idx = users.findIndex((u) => u.id === s.userId);
    if (idx === -1) throw new Error("Account not found.");

    users[idx] = { ...users[idx], ...patch, id: users[idx].id };
    this._write(this.keys.users, users);
    return this._safe(users[idx]);
  },

  async deleteAccount() {
    const s = this._session();
    if (!s) throw new Error("Not signed in.");

    const users = this._read(this.keys.users, []).filter(
      (u) => u.id !== s.userId,
    );
    this._write(this.keys.users, users);

    /* Remove the user's own content too. */
    const trips = this._read(this.keys.trips, []).filter(
      (t) => t.ownerId !== s.userId,
    );
    this._write(this.keys.trips, trips);

    await this.logout();
    return { ok: true };
  },

  /* =======================================================================
     USERS (admin)
     ======================================================================= */

  async listUsers() {
    return this._read(this.keys.users, []).map((u) => this._safe(u));
  },

  async deleteUser(id) {
    const users = this._read(this.keys.users, []).filter((u) => u.id !== id);
    this._write(this.keys.users, users);
    return { ok: true };
  },

  /* =======================================================================
     TRIPS
     ======================================================================= */

  async listTrips(filters = {}) {
    let trips = this._read(this.keys.trips, []);
    const { dest, type, fromDate, ownerId, published } = filters;

    if (dest) trips = trips.filter((t) => t.dest === dest);
    if (type) trips = trips.filter((t) => t.type === type);
    if (fromDate) trips = trips.filter((t) => t.date >= fromDate);
    if (ownerId) trips = trips.filter((t) => t.ownerId === ownerId);
    if (published !== undefined) {
      trips = trips.filter((t) => Boolean(t.published) === Boolean(published));
    }
    return trips;
  },

  async getTrip(id) {
    const trips = this._read(this.keys.trips, []);
    return trips.find((t) => t.id === id) || null;
  },

  async createTrip(payload) {
    const user = this._currentUserRaw();
    if (!user) throw new Error("Not signed in.");

    const trip = {
      id: this._uid("t"),
      title: payload.title,
      dest: payload.dest,
      date: payload.date,
      days: Number(payload.days),
      type: payload.type,
      spots: Number(payload.spots),
      totalSpots: Number(payload.spots),
      desc: payload.desc,
      owner: user.name,
      ownerId: user.id,
      ownerBio: user.bio || "",
      published: true,
      created: new Date().toISOString(),
    };

    const trips = this._read(this.keys.trips, []);
    trips.unshift(trip);
    this._write(this.keys.trips, trips);

    await this.createNotification(
      "Your travel plan was published.",
      "../trip-detail/tripDetail.html?id=" + trip.id,
    );
    return trip;
  },

  async updateTrip(id, patch) {
    const trips = this._read(this.keys.trips, []);
    const idx = trips.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Trip not found.");
    trips[idx] = { ...trips[idx], ...patch, id };
    this._write(this.keys.trips, trips);
    return trips[idx];
  },

  async deleteTrip(id) {
    const trips = this._read(this.keys.trips, []).filter((t) => t.id !== id);
    this._write(this.keys.trips, trips);
    return { ok: true };
  },

  /* =======================================================================
     DESTINATIONS  (with live trip counts)
     ======================================================================= */

  async listDestinations() {
    const trips = this._read(this.keys.trips, []);
    return DEMO_DESTINATIONS.map((d) => ({
      ...d,
      tripCount: trips.filter((t) => t.dest === d.name).length,
    }));
  },

  /* =======================================================================
     SAVED / WISHLIST
     ======================================================================= */

  async listSaved() {
    return this._read(this.keys.saved, []);
  },

  async toggleSave(tripId) {
    const list = this._read(this.keys.saved, []);
    const idx = list.indexOf(tripId);
    let saved;
    if (idx > -1) {
      list.splice(idx, 1);
      saved = false;
    } else {
      list.push(tripId);
      saved = true;
    }
    this._write(this.keys.saved, list);
    return { tripId, saved };
  },

  /* =======================================================================
     JOIN REQUESTS
     ======================================================================= */

  /* Requests other travellers sent for MY trips → these get Accept / Reject. */
  async listIncomingRequests() {
    const user = this._currentUserRaw();
    if (!user) return [];
    const trips = this._read(this.keys.trips, []);
    const myTripIds = trips
      .filter((t) => t.ownerId === user.id)
      .map((t) => t.id);

    return this._read(this.keys.requests, [])
      .filter((r) => myTripIds.includes(r.tripId))
      .map((r) => ({
        ...r,
        trip: trips.find((t) => t.id === r.tripId) || null,
      }));
  },

  /* Requests I sent to other people's trips. */
  async listSentRequests() {
    const user = this._currentUserRaw();
    if (!user) return [];
    const trips = this._read(this.keys.trips, []);

    return this._read(this.keys.requests, [])
      .filter((r) => r.userId === user.id)
      .map((r) => ({
        ...r,
        trip: trips.find((t) => t.id === r.tripId) || null,
      }));
  },

  async listAllRequests() {
    return this._read(this.keys.requests, []);
  },

  async createRequest(tripId, payload) {
    const user = this._currentUserRaw();
    if (!user) throw new Error("Not signed in.");

    const requests = this._read(this.keys.requests, []);
    if (requests.some((r) => r.tripId === tripId && r.userId === user.id)) {
      throw new Error("You already sent a request for this trip.");
    }

    const request = {
      id: this._uid("r"),
      tripId,
      userId: user.id,
      user: user.name,
      phone: payload.phone || "",
      spots: Number(payload.spots) || 1,
      message: payload.message || "",
      status: "Pending",
      created: new Date().toISOString(),
    };

    requests.push(request);
    this._write(this.keys.requests, requests);

    /* Tell the trip owner someone wants to join. */
    const trip = await this.getTrip(tripId);
    if (trip) {
      await this.createNotification(
        `${user.name} asked to join "${trip.title}".`,
        "../requests/request.html",
        trip.ownerId,
      );
    }
    return request;
  },

  /* status: "Accepted" | "Rejected" */
  async updateRequestStatus(id, status) {
    const requests = this._read(this.keys.requests, []);
    const idx = requests.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) throw new Error("Request not found.");

    requests[idx].status = status;
    requests[idx].resolved = new Date().toISOString();
    this._write(this.keys.requests, requests);

    /* Accepting consumes open spots on the trip. */
    if (status === "Accepted") {
      const trips = this._read(this.keys.trips, []);
      const tIdx = trips.findIndex((t) => t.id === requests[idx].tripId);
      if (tIdx > -1) {
        const taken = Number(requests[idx].spots) || 1;
        trips[tIdx].spots = Math.max(0, Number(trips[tIdx].spots || 0) - taken);
        this._write(this.keys.trips, trips);
      }
    }

    const trip = (await this.getTrip(requests[idx].tripId)) || {};
    /* The decision notification goes to the traveller who asked to join. */
    await this.createNotification(
      `Your request to join "${trip.title || "a trip"}" was ${status.toLowerCase()}.`,
      "../my-trips/myTrip.html",
      requests[idx].userId,
    );

    return requests[idx];
  },

  /* =======================================================================
     NOTIFICATIONS
     ======================================================================= */

  /* Notifications belong to a user, exactly as they do in the backend, so a
     notification meant for a trip owner is never shown to the requester. */
  async listNotifications() {
    const user = this._currentUserRaw();
    if (!user) return [];
    return this._read(this.keys.notifications, [])
      .filter((n) => !n.userId || n.userId === user.id)
      .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  },

  /* userId defaults to the signed-in user; pass it explicitly to notify
     somebody else (e.g. the traveller whose request you just accepted). */
  async createNotification(text, href = "#", userId = null) {
    const target = userId || (this._currentUserRaw() || {}).id;
    if (!target) return null;

    const items = this._read(this.keys.notifications, []);
    const item = {
      id: this._uid("n"),
      userId: target,
      text,
      href,
      read: false,
      created: new Date().toISOString(),
    };
    items.unshift(item);
    this._write(this.keys.notifications, items);
    return item;
  },

  async markAllNotificationsRead() {
    const user = this._currentUserRaw();
    if (!user) return [];

    const items = this._read(this.keys.notifications, []).map((n) =>
      !n.userId || n.userId === user.id ? { ...n, read: true } : n,
    );
    this._write(this.keys.notifications, items);
    return this.listNotifications();
  },

  /* =======================================================================
     ADMIN STATS
     ======================================================================= */

  async adminStats() {
    const users = this._read(this.keys.users, []);
    const trips = this._read(this.keys.trips, []);
    const requests = this._read(this.keys.requests, []);
    return {
      users: users.length,
      trips: trips.length,
      requests: requests.length,
      matches: requests.filter((r) => r.status === "Accepted").length,
    };
  },
};

Store.seed();
