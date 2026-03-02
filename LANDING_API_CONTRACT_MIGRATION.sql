-- Landing API contract migration (Design-Driven + TDD)
-- Date: 2026-03-02
-- Purpose:
-- 1) Persist the exact payload consumed by src/types/landing.ts
-- 2) Allow publishing landing snapshots without redeploying frontend
-- 3) Force backend to serve GET /api/landing from DB, not hardcoded code constants

CREATE TABLE IF NOT EXISTS `landingPayloads` (
  `id` varchar(100) NOT NULL,
  `locale` varchar(10) NOT NULL DEFAULT 'en',
  `version` int NOT NULL,
  `status` enum('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `payload` json NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `dateTimeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dateTimeUpdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `publishedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_landingPayloads_locale_version` (`locale`, `version`),
  KEY `idx_landingPayloads_locale_status_version` (`locale`, `status`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Optional: ensure payload object structure exists at top-level
ALTER TABLE `landingPayloads`
  ADD CONSTRAINT `chk_landingPayloads_payload_is_object`
  CHECK (JSON_VALID(`payload`) AND JSON_TYPE(`payload`) = 'OBJECT');

-- Seed a first published payload for EN locale.
-- Backend should query latest published version by locale.
INSERT INTO `landingPayloads` (`id`, `locale`, `version`, `status`, `payload`, `notes`, `publishedAt`)
VALUES (
  'landing_en_v1',
  'en',
  1,
  'PUBLISHED',
  JSON_OBJECT(
    'hero', JSON_OBJECT(
      'desktopTitleLine1', 'Find Help for Any Task.',
      'desktopTitleLine2', 'Or Earn by Doing.',
      'desktopSubtitle', 'Connect with top-tier freelancers and businesses globally. Start your journey today with the world''s most trusted marketplace.',
      'desktopSearchPlaceholder', 'Search for ''Web Design'' or ''SEO''...',
      'desktopImageUrl', '/assets/welcome1.png',
      'mobileTitle', 'Find Help for Any Task. Or Earn by Doing.',
      'mobileBadge', 'Gamified Marketplace',
      'mobileSearchPlaceholder', 'I need help with...',
      'filterAriaLabel', 'Filters'
    ),
    'categories', JSON_OBJECT(
      'desktopTitle', 'Browse by Category',
      'desktopSubtitle', 'Find help for everything from digital design to local home services and manual labor.',
      'desktopViewAllLabel', 'View all',
      'desktopItems', JSON_ARRAY(
        JSON_OBJECT('slug','design-creative','name','Design & Creative','countLabel','1.2k+ active gigs','iconKey','palette'),
        JSON_OBJECT('slug','programming-tech','name','Programming & Tech','countLabel','850+ developers','iconKey','code2'),
        JSON_OBJECT('slug','writing-translation','name','Writing & Translation','countLabel','2k+ writers','iconKey','penline'),
        JSON_OBJECT('slug','painter','name','Painter','countLabel','300+ local painters','iconKey','paintbrush'),
        JSON_OBJECT('slug','general-labor','name','General Labor','countLabel','900+ local helpers','iconKey','hammer'),
        JSON_OBJECT('slug','gardener','name','Gardener','countLabel','150+ garden experts','iconKey','sprout')
      ),
      'mobileTitle', 'Browse Categories',
      'mobileViewAllLabel', 'See All',
      'mobileItems', JSON_ARRAY(
        JSON_OBJECT('slug','design','name','Design','iconKey','design'),
        JSON_OBJECT('slug','labor','name','Labor','iconKey','labor'),
        JSON_OBJECT('slug','gardening','name','Gardening','iconKey','gardening'),
        JSON_OBJECT('slug','delivery','name','Delivery','iconKey','delivery'),
        JSON_OBJECT('slug','cleaning','name','Cleaning','iconKey','cleaning')
      )
    ),
    'professionals', JSON_OBJECT(
      'badgeLabel', 'Handpicked Talent',
      'title', 'Featured Professionals',
      'subtitle', 'Meet the friendly experts in your neighborhood ready to help today',
      'verifiedLabel', 'Verified',
      'ctaLabel', 'View Profile',
      'items', JSON_ARRAY(
        JSON_OBJECT('id','pro_1','name','Sarah Jenkins','title','Senior UX Designer','rating','4.9','distanceLabel','0.8 miles away','tags',JSON_ARRAY('UI/UX','Figma','Branding'),'jobsCompleted',95,'responsiveness',88,'communication',92),
        JSON_OBJECT('id','pro_2','name','David Miller','title','Local Handyman','rating','5.0','distanceLabel','1.2 miles away','tags',JSON_ARRAY('Plumbing','Electrical','Repairs'),'jobsCompleted',98,'responsiveness',95,'communication',90),
        JSON_OBJECT('id','pro_3','name','Elena Rodriguez','title','Content Strategist','rating','4.8','distanceLabel','2.5 miles away','tags',JSON_ARRAY('SEO','Copywriting','Ads'),'jobsCompleted',90,'responsiveness',85,'communication',96)
      )
    ),
    'jobs', JSON_OBJECT(
      'title', 'Featured Jobs',
      'subtitle', 'Explore active opportunities and start earning',
      'viewAllLabel', 'Browse all jobs',
      'items', JSON_ARRAY(
        JSON_OBJECT('id','job_1','typeLabel','Cleaning','typeTone','cleaning','budgetLabel','$50 - $80','title','Apartment Deep Cleaning','locationLabel','Downtown, San Francisco','actionLabel','Bid Now'),
        JSON_OBJECT('id','job_2','typeLabel','Assembly','typeTone','assembly','budgetLabel','$120','title','IKEA Furniture Assembly','locationLabel','Mission District, SF','actionLabel','View Job'),
        JSON_OBJECT('id','job_3','typeLabel','Delivery','typeTone','delivery','budgetLabel','$40/hr','title','Grocery Delivery Specialist','locationLabel','SoMa, San Francisco','actionLabel','Bid Now')
      )
    ),
    'footer', JSON_OBJECT(
      'brand', 'Work4U',
      'tagline', 'The world''s most trusted marketplace for creative and technical services.',
      'copyright', '© 2024 Work4U Inc. All rights reserved.',
      'language', 'English',
      'currency', 'USD',
      'columns', JSON_ARRAY(
        JSON_OBJECT('title','Company','links',JSON_ARRAY(JSON_OBJECT('label','About Us','href','/about'),JSON_OBJECT('label','Careers','href','/careers'),JSON_OBJECT('label','Press','href','/press'))),
        JSON_OBJECT('title','Resources','links',JSON_ARRAY(JSON_OBJECT('label','Help Center','href','/help'),JSON_OBJECT('label','Terms of Service','href','/terms'),JSON_OBJECT('label','Community','href','/community'))),
        JSON_OBJECT('title','Support','links',JSON_ARRAY(JSON_OBJECT('label','Safety Center','href','/safety'),JSON_OBJECT('label','Quality Guide','href','/quality')))
      ),
      'mobileLinks', JSON_ARRAY(
        JSON_OBJECT('label','Support','href','/support'),
        JSON_OBJECT('label','Terms','href','/terms'),
        JSON_OBJECT('label','Privacy','href','/privacy')
      )
    ),
    'mobile', JSON_OBJECT(
      'topRatedTitle', 'Top Rated Pros',
      'topRatedBadge', 'Top Talent',
      'topRatedJobsCompletedTitle', 'Jobs Completed',
      'topRatedResponsivenessTitle', 'Responsiveness',
      'topRatedItems', JSON_ARRAY(
        JSON_OBJECT('id','top_1','name','Alex Johnson','rating','4.9','reviews','124','jobsCompletedLabel','85/100','jobsCompletedPct',85,'responsivenessLabel','98%','responsivenessPct',98,'distanceLabel','2.4km away','ctaLabel','View Profile'),
        JSON_OBJECT('id','top_2','name','Maria Clark','rating','5.0','reviews','98','jobsCompletedLabel','91/100','jobsCompletedPct',91,'responsivenessLabel','96%','responsivenessPct',96,'distanceLabel','1.1km away','ctaLabel','View Profile')
      ),
      'activeJobsTitle', 'Active Jobs',
      'activeJobsFilterLabel', 'Nearby',
      'activeJobItems', JSON_ARRAY(
        JSON_OBJECT('id','mobile_job_1','title','Apartment Deep Cleaning','budgetLabel','$120','locationLabel','Downtown','tagLabel','Fixed Price','tagTone','success','applicantsLabel','12 Applicants','actionLabel','Apply Now'),
        JSON_OBJECT('id','mobile_job_2','title','IKEA Furniture Assembly','budgetLabel','$45/hr','locationLabel','Uptown','tagLabel','Urgent','tagTone','info','applicantsLabel','4 Applicants','actionLabel','Apply Now')
      ),
      'bottomNav', JSON_ARRAY(
        JSON_OBJECT('label','Home','iconKey','home'),
        JSON_OBJECT('label','Explore','iconKey','explore'),
        JSON_OBJECT('label','Messages','iconKey','messages','badge','3'),
        JSON_OBJECT('label','Profile','iconKey','profile')
      )
    ),
    'actions', JSON_OBJECT(
      'signInLabel', 'Sign In',
      'notificationsLabel', 'Notifications',
      'joinNowLabel', 'Join Now',
      'searchButtonLabel', 'Search',
      'categoryViewAllHref', '/jobs',
      'jobsViewAllHref', '/jobs',
      'signInHref', '/signin',
      'joinNowAuthHref', '/post-job',
      'joinNowGuestHref', '/signup'
    )
  ),
  'Initial design-driven landing payload',
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  `payload` = VALUES(`payload`),
  `status` = VALUES(`status`),
  `notes` = VALUES(`notes`),
  `publishedAt` = VALUES(`publishedAt`);

-- Query used by backend:
-- SELECT payload
-- FROM landingPayloads
-- WHERE locale = 'en' AND status = 'PUBLISHED'
-- ORDER BY version DESC
-- LIMIT 1;
