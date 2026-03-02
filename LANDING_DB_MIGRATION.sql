-- Landing redesign schema migration for work4u (MySQL/TiDB)
-- Date: 2026-03-02
-- Notes:
-- 1) Uses additive changes (no destructive drops).
-- 2) Keeps current tables working while enabling the new landing design.
-- 3) Run in staging first.

-- =====================================================
-- 1) Categories for landing and search taxonomy
-- =====================================================
CREATE TABLE IF NOT EXISTS `landingCategories` (
  `id` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `name` json NOT NULL,
  `description` json DEFAULT NULL,
  `iconKey` varchar(80) NOT NULL,
  `activeGigCount` int NOT NULL DEFAULT 0,
  `displayOrder` int NOT NULL DEFAULT 0,
  `isFeatured` tinyint(1) NOT NULL DEFAULT 1,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `dateTimeCreated` timestamp DEFAULT CURRENT_TIMESTAMP,
  `dateTimeUpdated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_landingCategories_slug` (`slug`),
  KEY `idx_landingCategories_featured` (`isFeatured`, `displayOrder`),
  KEY `idx_landingCategories_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

INSERT INTO `landingCategories` (`id`, `slug`, `name`, `description`, `iconKey`, `activeGigCount`, `displayOrder`, `isFeatured`, `enabled`)
VALUES
  ('cat_design_creative','design-creative', JSON_OBJECT('en','Design & Creative','es','Diseño y Creatividad','fr','Design et Création'), JSON_OBJECT('en','Design services and creative work'), 'pen-tool', 1200, 10, 1, 1),
  ('cat_programming_tech','programming-tech', JSON_OBJECT('en','Programming & Tech','es','Programación y Tecnología','fr','Programmation et Tech'), JSON_OBJECT('en','Software and technical services'), 'code-2', 850, 20, 1, 1),
  ('cat_writing_translation','writing-translation', JSON_OBJECT('en','Writing & Translation','es','Redacción y Traducción','fr','Rédaction et Traduction'), JSON_OBJECT('en','Writing, editing, and language services'), 'languages', 2000, 30, 1, 1),
  ('cat_painter','painter', JSON_OBJECT('en','Painter','es','Pintor','fr','Peintre'), JSON_OBJECT('en','Local painting services'), 'paintbrush', 300, 40, 1, 1),
  ('cat_general_labor','general-labor', JSON_OBJECT('en','General Labor','es','Trabajo General','fr','Travaux généraux'), JSON_OBJECT('en','Local helper services'), 'wrench', 900, 50, 1, 1),
  ('cat_gardener','gardener', JSON_OBJECT('en','Gardener','es','Jardinero','fr','Jardinier'), JSON_OBJECT('en','Gardening and landscaping services'), 'flower-2', 150, 60, 1, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `iconKey` = VALUES(`iconKey`),
  `activeGigCount` = VALUES(`activeGigCount`),
  `displayOrder` = VALUES(`displayOrder`),
  `isFeatured` = VALUES(`isFeatured`),
  `enabled` = VALUES(`enabled`);

-- =====================================================
-- 2) Jobs enhancements for featured cards/search
-- =====================================================
ALTER TABLE `jobs`
  ADD COLUMN IF NOT EXISTS `categorySlug` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `jobTypeLabel` varchar(80) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `budgetMin` decimal(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `budgetMax` decimal(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `locationShort` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `isFeaturedOnLanding` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `featuredRank` int DEFAULT NULL;

-- Backfill with safe defaults
UPDATE `jobs`
SET
  `budgetMin` = COALESCE(`budgetMin`, `budget`),
  `budgetMax` = COALESCE(`budgetMax`, `budget`),
  `locationShort` = COALESCE(`locationShort`, SUBSTRING(`location`, 1, 120)),
  `categorySlug` = COALESCE(`categorySlug`,
    CASE
      WHEN LOWER(`category`) IN ('design & creative','design and creative') THEN 'design-creative'
      WHEN LOWER(`category`) IN ('programming & tech','programming and tech') THEN 'programming-tech'
      WHEN LOWER(`category`) IN ('writing & translation','writing and translation') THEN 'writing-translation'
      WHEN LOWER(`category`) = 'painter' THEN 'painter'
      WHEN LOWER(`category`) = 'general labor' THEN 'general-labor'
      WHEN LOWER(`category`) = 'gardener' THEN 'gardener'
      ELSE LOWER(REPLACE(REPLACE(REPLACE(TRIM(`category`), '&', 'and'), ' ', '-'), '--', '-'))
    END
  ),
  `jobTypeLabel` = COALESCE(`jobTypeLabel`,
    CASE
      WHEN LOWER(`category`) LIKE '%clean%' THEN 'Cleaning'
      WHEN LOWER(`category`) LIKE '%assembl%' THEN 'Assembly'
      WHEN LOWER(`category`) LIKE '%deliver%' THEN 'Delivery'
      ELSE `category`
    END
  );

CREATE INDEX IF NOT EXISTS `idx_jobs_categorySlug` ON `jobs` (`categorySlug`);
CREATE INDEX IF NOT EXISTS `idx_jobs_featured` ON `jobs` (`isFeaturedOnLanding`, `featuredRank`, `status`);
CREATE INDEX IF NOT EXISTS `idx_jobs_search` ON `jobs` (`status`, `categorySlug`, `location`);

-- =====================================================
-- 3) Professional cards for landing
-- =====================================================
CREATE TABLE IF NOT EXISTS `professionalProfiles` (
  `userId` varchar(100) NOT NULL,
  `headline` varchar(160) NOT NULL,
  `bio` text DEFAULT NULL,
  `avatarUrl` varchar(500) DEFAULT NULL,
  `coverImageUrl` varchar(500) DEFAULT NULL,
  `distanceLabel` varchar(120) DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT 0,
  `ratingAvg` decimal(3,2) NOT NULL DEFAULT 0.00,
  `ratingCount` int NOT NULL DEFAULT 0,
  `isFeaturedOnLanding` tinyint(1) NOT NULL DEFAULT 0,
  `featuredRank` int DEFAULT NULL,
  `dateTimeCreated` timestamp DEFAULT CURRENT_TIMESTAMP,
  `dateTimeUpdated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_professionalProfiles_featured` (`isFeaturedOnLanding`, `featuredRank`),
  KEY `idx_professionalProfiles_verified` (`isVerified`),
  CONSTRAINT `fk_professionalProfiles_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS `professionalMetrics` (
  `userId` varchar(100) NOT NULL,
  `jobsCompletedScore` tinyint unsigned NOT NULL DEFAULT 0,
  `responsivenessScore` tinyint unsigned NOT NULL DEFAULT 0,
  `communicationScore` tinyint unsigned NOT NULL DEFAULT 0,
  `dateTimeCreated` timestamp DEFAULT CURRENT_TIMESTAMP,
  `dateTimeUpdated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`) /*T![clustered_index] CLUSTERED */,
  CONSTRAINT `fk_professionalMetrics_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_jobsCompletedScore` CHECK (`jobsCompletedScore` BETWEEN 0 AND 100),
  CONSTRAINT `chk_responsivenessScore` CHECK (`responsivenessScore` BETWEEN 0 AND 100),
  CONSTRAINT `chk_communicationScore` CHECK (`communicationScore` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS `professionalSkills` (
  `id` varchar(100) NOT NULL,
  `userId` varchar(100) NOT NULL,
  `skillKey` varchar(120) NOT NULL,
  `displayOrder` int NOT NULL DEFAULT 0,
  `dateTimeCreated` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_professionalSkills_user_skill` (`userId`, `skillKey`),
  KEY `idx_professionalSkills_user_order` (`userId`, `displayOrder`),
  CONSTRAINT `fk_professionalSkills_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Backfill profile rows from users + review aggregates
INSERT INTO `professionalProfiles` (`userId`, `headline`, `avatarUrl`, `isVerified`, `ratingAvg`, `ratingCount`, `isFeaturedOnLanding`)
SELECT
  u.`id`,
  COALESCE(NULLIF(u.`workerTypes`, ''), 'Professional'),
  u.`photoUrl`,
  CASE WHEN u.`status` = 'ACTIVE' THEN 1 ELSE 0 END,
  COALESCE(r.`avgRating`, 0.00),
  COALESCE(r.`cnt`, 0),
  0
FROM `users` u
LEFT JOIN (
  SELECT `userId`, ROUND(AVG(`ratingCount`), 2) AS `avgRating`, COUNT(*) AS `cnt`
  FROM `userReviews`
  WHERE `status` = 'VERIFIED'
  GROUP BY `userId`
) r ON r.`userId` = u.`id`
WHERE u.`workerTypes` IS NOT NULL
ON DUPLICATE KEY UPDATE
  `headline` = VALUES(`headline`),
  `avatarUrl` = VALUES(`avatarUrl`),
  `isVerified` = VALUES(`isVerified`),
  `ratingAvg` = VALUES(`ratingAvg`),
  `ratingCount` = VALUES(`ratingCount`);

INSERT INTO `professionalMetrics` (`userId`, `jobsCompletedScore`, `responsivenessScore`, `communicationScore`)
SELECT p.`userId`, 80, 80, 80
FROM `professionalProfiles` p
ON DUPLICATE KEY UPDATE
  `jobsCompletedScore` = `jobsCompletedScore`;

-- =====================================================
-- 4) Footer link content table (CMS-style)
-- =====================================================
CREATE TABLE IF NOT EXISTS `siteLinks` (
  `id` varchar(100) NOT NULL,
  `groupKey` enum('company','resources','support') NOT NULL,
  `label` json NOT NULL,
  `href` varchar(500) NOT NULL,
  `displayOrder` int NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `dateTimeCreated` timestamp DEFAULT CURRENT_TIMESTAMP,
  `dateTimeUpdated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_siteLinks_group` (`groupKey`, `displayOrder`),
  KEY `idx_siteLinks_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

INSERT INTO `siteLinks` (`id`, `groupKey`, `label`, `href`, `displayOrder`, `isActive`)
VALUES
  ('site_company_about', 'company', JSON_OBJECT('en','About Us','es','Sobre nosotros','fr','À propos'), '#', 10, 1),
  ('site_company_careers', 'company', JSON_OBJECT('en','Careers','es','Carreras','fr','Carrières'), '#', 20, 1),
  ('site_company_press', 'company', JSON_OBJECT('en','Press','es','Prensa','fr','Presse'), '#', 30, 1),
  ('site_resources_help', 'resources', JSON_OBJECT('en','Help Center','es','Centro de ayuda','fr','Centre d\'aide'), '#', 10, 1),
  ('site_resources_terms', 'resources', JSON_OBJECT('en','Terms of Service','es','Términos del servicio','fr','Conditions d\'utilisation'), '#', 20, 1),
  ('site_resources_community', 'resources', JSON_OBJECT('en','Community','es','Comunidad','fr','Communauté'), '#', 30, 1),
  ('site_support_safety', 'support', JSON_OBJECT('en','Safety Center','es','Centro de seguridad','fr','Centre de sécurité'), '#', 10, 1),
  ('site_support_quality', 'support', JSON_OBJECT('en','Quality Guide','es','Guía de calidad','fr','Guide qualité'), '#', 20, 1)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `href` = VALUES(`href`),
  `displayOrder` = VALUES(`displayOrder`),
  `isActive` = VALUES(`isActive`);

-- =====================================================
-- 5) Badge count performance (header bell + messages)
-- =====================================================
CREATE INDEX IF NOT EXISTS `idx_userMessages_toUser_read_created`
  ON `userMessages` (`toUserId`, `isRead`, `dateTimeCreated`);

CREATE INDEX IF NOT EXISTS `idx_gamificationNotifications_user_read_created`
  ON `gamificationNotifications` (`userId`, `readFlag`, `dateTimeCreated`);

-- Optional lightweight views for API responses
CREATE OR REPLACE VIEW `v_unread_message_counts` AS
SELECT `toUserId` AS `userId`, COUNT(*) AS `unreadMessages`
FROM `userMessages`
WHERE `isRead` = 0
GROUP BY `toUserId`;

CREATE OR REPLACE VIEW `v_unread_gamification_notification_counts` AS
SELECT `userId`, COUNT(*) AS `unreadNotifications`
FROM `gamificationNotifications`
WHERE `readFlag` = 0
GROUP BY `userId`;

-- =====================================================
-- 6) Suggested API payload helper views for landing
-- =====================================================
CREATE OR REPLACE VIEW `v_landing_featured_jobs` AS
SELECT
  j.`id`,
  j.`title`,
  j.`jobTypeLabel`,
  j.`budgetMin`,
  j.`budgetMax`,
  j.`budgetType`,
  j.`budgetCurrency`,
  j.`locationShort`,
  j.`categorySlug`,
  j.`featuredRank`
FROM `jobs` j
WHERE j.`isFeaturedOnLanding` = 1
  AND j.`status` = 'VERIFIED'
ORDER BY j.`featuredRank` ASC, j.`dateTimeCreated` DESC;

CREATE OR REPLACE VIEW `v_landing_featured_professionals` AS
SELECT
  p.`userId`,
  u.`displayName`,
  p.`headline`,
  p.`avatarUrl`,
  p.`coverImageUrl`,
  p.`distanceLabel`,
  p.`isVerified`,
  p.`ratingAvg`,
  p.`ratingCount`,
  m.`jobsCompletedScore`,
  m.`responsivenessScore`,
  m.`communicationScore`,
  p.`featuredRank`
FROM `professionalProfiles` p
JOIN `users` u ON u.`id` = p.`userId`
LEFT JOIN `professionalMetrics` m ON m.`userId` = p.`userId`
WHERE p.`isFeaturedOnLanding` = 1
ORDER BY p.`featuredRank` ASC;
