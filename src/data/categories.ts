export const CATEGORIES = [
  // Home & Property Maintenance
  {
    id: "plumbing",
    nameKey: "categories.plumbing",
    icon: "🚰",
    description: "Pipe repairs, leaks, installations, and drainage",
  },
  {
    id: "electrical",
    nameKey: "categories.electrical",
    icon: "⚡",
    description: "Wiring, repairs, installations, and troubleshooting",
  },
  {
    id: "carpentry",
    nameKey: "categories.carpentry",
    icon: "🪚",
    description: "Furniture mounting, shelving, doors, and woodwork",
  },
  {
    id: "painting",
    nameKey: "categories.painting",
    icon: "🎨",
    description: "Interior/exterior painting, wallpaper, and finishing",
  },
  {
    id: "hvac",
    nameKey: "categories.hvac",
    icon: "❄️",
    description: "Heating, cooling, air conditioning, and ventilation",
  },
  {
    id: "roofing",
    nameKey: "categories.roofing",
    icon: "🏠",
    description: "Roof repairs, installation, and maintenance",
  },
  {
    id: "masonry",
    nameKey: "categories.masonry",
    icon: "🧱",
    description: "Brickwork, stonework, tiles, and concrete",
  },
  {
    id: "flooring",
    nameKey: "categories.flooring",
    icon: "🪵",
    description: "Installation and repair of wood, laminate, tile, and carpet",
  },
  {
    id: "handyman",
    nameKey: "categories.handyman",
    icon: "🔧",
    description: "Small repairs, assembly, and various household fixes",
  },
  {
    id: "landscaping",
    nameKey: "categories.landscaping",
    icon: "🌿",
    description: "Lawn care, pruning, landscaping design, and garden work",
  },

  // Cleaning & Household Services
  {
    id: "cleaning",
    nameKey: "categories.cleaning",
    icon: "🧹",
    description: "House, office, and specialized cleaning",
  },
  {
    id: "laundry",
    nameKey: "categories.laundry",
    icon: "👔",
    description: "Washing, drying, ironing, and fabric care",
  },
  {
    id: "organizing",
    nameKey: "categories.organizing",
    icon: "📦",
    description: "Home organization, decluttering, and storage solutions",
  },

  // Transportation & Delivery
  {
    id: "moving",
    nameKey: "categories.moving",
    icon: "🚚",
    description: "House moving, furniture transport, and item delivery",
  },
  {
    id: "delivery",
    nameKey: "categories.delivery",
    icon: "📮",
    description: "Package delivery, shopping, and general errands",
  },

  // Personal & Care Services
  {
    id: "pet-care",
    nameKey: "categories.petCare",
    icon: "🐕",
    description: "Dog walking, pet sitting, grooming, and care",
  },
  {
    id: "childcare",
    nameKey: "categories.childcare",
    icon: "👶",
    description: "Babysitting, daycare, tutoring, and childcare",
  },
  {
    id: "senior-care",
    nameKey: "categories.seniorCare",
    icon: "👴",
    description: "Elderly care, companionship, and assistance",
  },
  {
    id: "personal-training",
    nameKey: "categories.personalTraining",
    icon: "💪",
    description: "Gym training, fitness coaching, and classes",
  },

  // Automotive Services
  {
    id: "car-repair",
    nameKey: "categories.carRepair",
    icon: "🔧",
    description: "Vehicle maintenance, repairs, and detailing",
  },
  {
    id: "car-wash",
    nameKey: "categories.carWash",
    icon: "🚗",
    description: "Car washing, waxing, and interior cleaning",
  },

  // Tech & Electronics
  {
    id: "it-support",
    nameKey: "categories.itSupport",
    icon: "💻",
    description: "Computer repair, setup, and technical assistance",
  },
  {
    id: "appliance-repair",
    nameKey: "categories.applianceRepair",
    icon: "🔌",
    description: "Kitchen appliances, washing machines, and electronics",
  },

  // Events & Entertainment
  {
    id: "event-setup",
    nameKey: "categories.eventSetup",
    icon: "🎉",
    description: "Party setup, decorations, and event coordination",
  },
  {
    id: "photography",
    nameKey: "categories.photography",
    icon: "📷",
    description: "Events, portraits, and video recording",
  },

  // Skilled Trades & Professional Services
  {
    id: "locksmith",
    nameKey: "categories.locksmith",
    icon: "🔐",
    description: "Lock installation, repair, and emergency services",
  },
  {
    id: "welding",
    nameKey: "categories.welding",
    icon: "⚙️",
    description: "Metal fabrication, welding, and repairs",
  },
  {
    id: "construction",
    nameKey: "categories.construction",
    icon: "🏗️",
    description: "General construction, demolition, and building work",
  },

  // Education & Training
  {
    id: "tutoring",
    nameKey: "categories.tutoring",
    icon: "📚",
    description: "Academic tutoring, language lessons, and classes",
  },
  {
    id: "music-lessons",
    nameKey: "categories.musicLessons",
    icon: "🎵",
    description: "Instrument lessons and music instruction",
  },

  // Food & Beverage
  {
    id: "cooking",
    nameKey: "categories.cooking",
    icon: "🍳",
    description: "Home cooking, meal preparation, and catering",
  },
  {
    id: "bartending",
    nameKey: "categories.bartending",
    icon: "🍹",
    description: "Bartending, mixology, and beverage service",
  },

  // Fashion & Beauty
  {
    id: "hairstyle",
    nameKey: "categories.hairstyle",
    icon: "💇",
    description: "Haircuts, styling, and hair treatments",
  },
  {
    id: "beauty",
    nameKey: "categories.beauty",
    icon: "💄",
    description: "Makeup, nails, and beauty treatments",
  },
  {
    id: "alterations",
    nameKey: "categories.alterations",
    icon: "✂️",
    description: "Hemming, tailoring, and clothing repairs",
  },

  // Other & General
  {
    id: "other",
    nameKey: "categories.other",
    icon: "⭐",
    description: "Any other type of work not listed above",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const EXPERIENCE_LEVELS = [
  { value: "BEGINNER", label: "Beginner", description: "No experience required" },
  { value: "INTERMEDIATE", label: "Intermediate", description: "Some experience required" },
  { value: "EXPERT", label: "Expert", description: "Advanced skills required" },
];

export const BUDGET_TYPES = [
  { value: "FIXED", label: "Fixed Price", description: "Set a one-time price" },
  { value: "HOURLY", label: "Hourly Rate", description: "Pay by the hour" },
  { value: "RANGE", label: "Budget Range", description: "Set a min-max budget" },
];

export const DURATIONS = [
  { value: "less-than-1-day", label: "Less than 1 day" },
  { value: "1-3-days", label: "1-3 days" },
  { value: "1-2-weeks", label: "1-2 weeks" },
  { value: "2-4-weeks", label: "2-4 weeks" },
  { value: "1-3-months", label: "1-3 months" },
  { value: "more-than-3-months", label: "More than 3 months" },
];
