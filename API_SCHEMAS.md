# API Schemas for Gamification

## 1. User Response with Gamification Stats

### GET /api/users/:userId

```json
{
  "id": "user_123abc",
  "email": "john.doe@example.com",
  "displayName": "John Doe",
  "accountType": "personal",
  "workerType": ["offerServices"],
  "phoneNumber": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "US",
    "postcode": "10001"
  },
  "image": "https://example.com/avatar.jpg",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2026-01-14T15:45:00Z",
  
  "gamification": {
    "player": {
      "level": 12,
      "xp": 4250,
      "xpToNextLevel": 6000,
      "totalXp": 45250,
      "gold": 8750,
      "totalGoldEarned": 25400,
      "title": "Professional Master",
      "streak": 7,
      "lastLoginDate": "2026-01-14T08:00:00Z",
      "achievements": 8,
      "activeQuests": 3,
      "completedQuests": 45
    },
    
    "achievements": [
      {
        "id": "first-job",
        "unlocked": true,
        "unlockedAt": "2024-02-01T14:20:00Z",
        "progress": 1,
        "maxProgress": 1
      },
      {
        "id": "job-veteran",
        "unlocked": true,
        "unlockedAt": "2024-05-10T09:15:00Z",
        "progress": 10,
        "maxProgress": 10
      },
      {
        "id": "job-master",
        "unlocked": true,
        "unlockedAt": "2025-08-22T16:40:00Z",
        "progress": 50,
        "maxProgress": 50
      },
      {
        "id": "first-gold",
        "unlocked": true,
        "unlockedAt": "2024-02-02T10:30:00Z",
        "progress": 100,
        "maxProgress": 100
      },
      {
        "id": "profile-complete",
        "unlocked": true,
        "unlockedAt": "2024-01-16T11:00:00Z",
        "progress": 1,
        "maxProgress": 1
      },
      {
        "id": "first-chat",
        "unlocked": true,
        "unlockedAt": "2024-01-20T13:45:00Z",
        "progress": 1,
        "maxProgress": 1
      },
      {
        "id": "streak-7",
        "unlocked": true,
        "unlockedAt": "2026-01-14T08:00:00Z",
        "progress": 7,
        "maxProgress": 7
      },
      {
        "id": "level-10",
        "unlocked": true,
        "unlockedAt": "2025-11-05T14:20:00Z",
        "progress": 10,
        "maxProgress": 10
      },
      {
        "id": "job-legend",
        "unlocked": false,
        "progress": 52,
        "maxProgress": 100
      },
      {
        "id": "gold-collector",
        "unlocked": false,
        "progress": 8750,
        "maxProgress": 10000
      }
    ],
    
    "quests": [
      {
        "id": "quest_daily_001",
        "templateId": "daily-grind",
        "status": "active",
        "progress": 2,
        "maxProgress": 3,
        "acceptedAt": "2026-01-14T08:00:00Z",
        "expiresAt": "2026-01-15T00:00:00Z"
      },
      {
        "id": "quest_weekly_042",
        "templateId": "weekly-warrior",
        "status": "active",
        "progress": 3,
        "maxProgress": 5,
        "acceptedAt": "2026-01-12T00:00:00Z",
        "expiresAt": "2026-01-19T00:00:00Z"
      },
      {
        "id": "quest_main_004",
        "templateId": "building-reputation",
        "status": "active",
        "progress": 2,
        "maxProgress": 2,
        "acceptedAt": "2025-06-10T12:00:00Z"
      },
      {
        "id": "quest_side_018",
        "templateId": "quick-response",
        "status": "completed",
        "progress": 10,
        "maxProgress": 10,
        "acceptedAt": "2026-01-13T10:00:00Z",
        "completedAt": "2026-01-13T18:30:00Z"
      }
    ],
    
    "inventory": [
      {
        "id": "item_001",
        "name": "Legendary Badge",
        "description": "Proof of legendary status",
        "rarity": "legendary",
        "icon": "🏆",
        "equipped": true,
        "acquiredAt": "2025-08-22T16:40:00Z"
      },
      {
        "id": "item_002",
        "name": "Golden Crown",
        "description": "Symbol of mastery",
        "rarity": "epic",
        "icon": "👑",
        "equipped": false,
        "acquiredAt": "2025-11-05T14:20:00Z"
      },
      {
        "id": "item_003",
        "name": "XP Booster",
        "description": "+50% XP for 24 hours",
        "rarity": "rare",
        "icon": "⚡",
        "equipped": false,
        "acquiredAt": "2026-01-10T09:00:00Z",
        "usableUntil": "2026-01-15T09:00:00Z"
      }
    ],
    
    "notifications": [
      {
        "id": "notif_001",
        "type": "achievement",
        "message": "Achievement Unlocked: Streak Master!",
        "data": {
          "achievementId": "streak-7",
          "rewards": {
            "xp": 500,
            "gold": 300
          }
        },
        "read": false,
        "createdAt": "2026-01-14T08:00:00Z"
      },
      {
        "id": "notif_002",
        "type": "quest_complete",
        "message": "Quest Completed: Quick Response",
        "data": {
          "questId": "quest_side_018",
          "rewards": {
            "xp": 800,
            "gold": 400
          }
        },
        "read": true,
        "createdAt": "2026-01-13T18:30:00Z"
      }
    ]
  }
}
```

---

## 2. Achievement Configuration (Database Schema)

### Collection: `achievements_config`

```json
[
  {
    "id": "first-job",
    "name": {
      "en": "First Steps",
      "es": "Primeros Pasos",
      "fr": "Premiers Pas"
    },
    "description": {
      "en": "Complete your first job",
      "es": "Completa tu primer trabajo",
      "fr": "Complétez votre premier travail"
    },
    "category": "jobs",
    "rarity": "common",
    "icon": "🎯",
    "maxProgress": 1,
    "rewards": {
      "xp": 100,
      "gold": 50
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "job_complete",
      "threshold": 1
    }
  },
  {
    "id": "job-veteran",
    "name": {
      "en": "Veteran Worker",
      "es": "Trabajador Veterano",
      "fr": "Travailleur Vétéran"
    },
    "description": {
      "en": "Complete 10 jobs",
      "es": "Completa 10 trabajos",
      "fr": "Complétez 10 travaux"
    },
    "category": "jobs",
    "rarity": "uncommon",
    "icon": "⚔️",
    "maxProgress": 10,
    "rewards": {
      "xp": 500,
      "gold": 250
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "job_complete",
      "threshold": 10
    }
  },
  {
    "id": "job-master",
    "name": {
      "en": "Master Professional",
      "es": "Profesional Maestro",
      "fr": "Professionnel Maître"
    },
    "description": {
      "en": "Complete 50 jobs",
      "es": "Completa 50 trabajos",
      "fr": "Complétez 50 travaux"
    },
    "category": "jobs",
    "rarity": "rare",
    "icon": "👑",
    "maxProgress": 50,
    "rewards": {
      "xp": 2000,
      "gold": 1000,
      "title": {
        "en": "Professional Master",
        "es": "Maestro Profesional",
        "fr": "Maître Professionnel"
      }
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "job_complete",
      "threshold": 50
    }
  },
  {
    "id": "job-legend",
    "name": {
      "en": "Legendary Freelancer",
      "es": "Freelancer Legendario",
      "fr": "Freelance Légendaire"
    },
    "description": {
      "en": "Complete 100 jobs",
      "es": "Completa 100 trabajos",
      "fr": "Complétez 100 travaux"
    },
    "category": "jobs",
    "rarity": "legendary",
    "icon": "🏆",
    "maxProgress": 100,
    "rewards": {
      "xp": 10000,
      "gold": 5000,
      "title": {
        "en": "Legendary Freelancer",
        "es": "Freelancer Legendario",
        "fr": "Freelance Légendaire"
      },
      "item": {
        "id": "legendary-badge",
        "rarity": "legendary"
      }
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "job_complete",
      "threshold": 100
    }
  },
  {
    "id": "first-gold",
    "name": {
      "en": "First Earnings",
      "es": "Primeras Ganancias",
      "fr": "Premiers Gains"
    },
    "description": {
      "en": "Earn your first 100 gold",
      "es": "Gana tus primeros 100 de oro",
      "fr": "Gagnez vos premiers 100 d'or"
    },
    "category": "earnings",
    "rarity": "common",
    "icon": "💰",
    "maxProgress": 100,
    "rewards": {
      "xp": 150,
      "gold": 100
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "gold_earned",
      "threshold": 100
    }
  },
  {
    "id": "gold-collector",
    "name": {
      "en": "Gold Collector",
      "es": "Coleccionista de Oro",
      "fr": "Collectionneur d'Or"
    },
    "description": {
      "en": "Accumulate 10,000 gold",
      "es": "Acumula 10,000 de oro",
      "fr": "Accumulez 10 000 d'or"
    },
    "category": "earnings",
    "rarity": "epic",
    "icon": "💎",
    "maxProgress": 10000,
    "rewards": {
      "xp": 3000,
      "gold": 2000
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "gold_accumulated",
      "threshold": 10000
    }
  },
  {
    "id": "wealthy",
    "name": {
      "en": "Wealthy Merchant",
      "es": "Comerciante Rico",
      "fr": "Marchand Riche"
    },
    "description": {
      "en": "Accumulate 100,000 gold",
      "es": "Acumula 100,000 de oro",
      "fr": "Accumulez 100 000 d'or"
    },
    "category": "earnings",
    "rarity": "legendary",
    "icon": "🌟",
    "maxProgress": 100000,
    "rewards": {
      "xp": 15000,
      "gold": 10000,
      "title": {
        "en": "Merchant King",
        "es": "Rey Comerciante",
        "fr": "Roi Marchand"
      }
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "gold_accumulated",
      "threshold": 100000
    }
  },
  {
    "id": "profile-complete",
    "name": {
      "en": "Well Prepared",
      "es": "Bien Preparado",
      "fr": "Bien Préparé"
    },
    "description": {
      "en": "Complete your profile 100%",
      "es": "Completa tu perfil al 100%",
      "fr": "Complétez votre profil à 100%"
    },
    "category": "profile",
    "rarity": "uncommon",
    "icon": "📝",
    "maxProgress": 1,
    "rewards": {
      "xp": 300,
      "gold": 150
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "profile_completion",
      "threshold": 100
    }
  },
  {
    "id": "level-10",
    "name": {
      "en": "Rising Star",
      "es": "Estrella Ascendente",
      "fr": "Étoile Montante"
    },
    "description": {
      "en": "Reach level 10",
      "es": "Alcanza el nivel 10",
      "fr": "Atteignez le niveau 10"
    },
    "category": "profile",
    "rarity": "rare",
    "icon": "⭐",
    "maxProgress": 10,
    "rewards": {
      "xp": 1000,
      "gold": 500
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "level_reached",
      "threshold": 10
    }
  },
  {
    "id": "level-50",
    "name": {
      "en": "Ascended",
      "es": "Ascendido",
      "fr": "Ascensionné"
    },
    "description": {
      "en": "Reach level 50",
      "es": "Alcanza el nivel 50",
      "fr": "Atteignez le niveau 50"
    },
    "category": "profile",
    "rarity": "legendary",
    "icon": "✨",
    "maxProgress": 50,
    "rewards": {
      "xp": 20000,
      "gold": 15000,
      "title": {
        "en": "Ascended One",
        "es": "Ascendido",
        "fr": "Ascensionné"
      }
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "level_reached",
      "threshold": 50
    }
  },
  {
    "id": "first-chat",
    "name": {
      "en": "Friendly Face",
      "es": "Cara Amigable",
      "fr": "Visage Amical"
    },
    "description": {
      "en": "Send your first message",
      "es": "Envía tu primer mensaje",
      "fr": "Envoyez votre premier message"
    },
    "category": "social",
    "rarity": "common",
    "icon": "💬",
    "maxProgress": 1,
    "rewards": {
      "xp": 50,
      "gold": 25
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "message_sent",
      "threshold": 1
    }
  },
  {
    "id": "social-butterfly",
    "name": {
      "en": "Social Butterfly",
      "es": "Mariposa Social",
      "fr": "Papillon Social"
    },
    "description": {
      "en": "Have 10 active conversations",
      "es": "Ten 10 conversaciones activas",
      "fr": "Ayez 10 conversations actives"
    },
    "category": "social",
    "rarity": "rare",
    "icon": "🦋",
    "maxProgress": 10,
    "rewards": {
      "xp": 800,
      "gold": 400
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "active_conversations",
      "threshold": 10
    }
  },
  {
    "id": "streak-7",
    "name": {
      "en": "Dedicated",
      "es": "Dedicado",
      "fr": "Dévoué"
    },
    "description": {
      "en": "Login for 7 consecutive days",
      "es": "Inicia sesión durante 7 días consecutivos",
      "fr": "Connectez-vous pendant 7 jours consécutifs"
    },
    "category": "special",
    "rarity": "uncommon",
    "icon": "🔥",
    "maxProgress": 7,
    "rewards": {
      "xp": 500,
      "gold": 300
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "login_streak",
      "threshold": 7
    }
  },
  {
    "id": "streak-30",
    "name": {
      "en": "Unwavering",
      "es": "Inquebrantable",
      "fr": "Inébranlable"
    },
    "description": {
      "en": "Login for 30 consecutive days",
      "es": "Inicia sesión durante 30 días consecutivos",
      "fr": "Connectez-vous pendant 30 jours consécutifs"
    },
    "category": "special",
    "rarity": "epic",
    "icon": "⚡",
    "maxProgress": 30,
    "rewards": {
      "xp": 5000,
      "gold": 3000
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "login_streak",
      "threshold": 30
    }
  },
  {
    "id": "perfect-rating",
    "name": {
      "en": "Five Stars",
      "es": "Cinco Estrellas",
      "fr": "Cinq Étoiles"
    },
    "description": {
      "en": "Maintain a 5-star rating for 20 jobs",
      "es": "Mantén una calificación de 5 estrellas durante 20 trabajos",
      "fr": "Maintenez une note de 5 étoiles pendant 20 travaux"
    },
    "category": "special",
    "rarity": "legendary",
    "icon": "🌟",
    "maxProgress": 20,
    "rewards": {
      "xp": 10000,
      "gold": 7500,
      "title": {
        "en": "Five Star Professional",
        "es": "Profesional de Cinco Estrellas",
        "fr": "Professionnel Cinq Étoiles"
      }
    },
    "hidden": false,
    "enabled": true,
    "requirements": {
      "action": "five_star_jobs",
      "threshold": 20
    }
  },
  {
    "id": "secret-001",
    "name": {
      "en": "???",
      "es": "???",
      "fr": "???"
    },
    "description": {
      "en": "Hidden achievement",
      "es": "Logro oculto",
      "fr": "Succès caché"
    },
    "category": "special",
    "rarity": "legendary",
    "icon": "❓",
    "maxProgress": 1,
    "rewards": {
      "xp": 5000,
      "gold": 5000,
      "item": {
        "id": "mystery-box",
        "rarity": "legendary"
      }
    },
    "hidden": true,
    "enabled": true,
    "requirements": {
      "action": "secret_condition",
      "threshold": 1,
      "details": "Complete a job on your birthday"
    }
  }
]
```

---

## 3. Quest Templates Configuration

### Collection: `quest_templates`

```json
[
  {
    "id": "daily-grind",
    "title": {
      "en": "Daily Grind",
      "es": "Rutina Diaria",
      "fr": "Routine Quotidienne"
    },
    "description": {
      "en": "Apply to 3 jobs today",
      "es": "Aplica a 3 trabajos hoy",
      "fr": "Postulez à 3 emplois aujourd'hui"
    },
    "type": "daily",
    "difficulty": "common",
    "maxProgress": 3,
    "rewards": {
      "xp": 100,
      "gold": 50
    },
    "duration": "24h",
    "enabled": true,
    "requirements": {
      "action": "job_application",
      "threshold": 3
    }
  },
  {
    "id": "profile-polish",
    "title": {
      "en": "Profile Polish",
      "es": "Pulir Perfil",
      "fr": "Polir le Profil"
    },
    "description": {
      "en": "Update your profile or portfolio",
      "es": "Actualiza tu perfil o portafolio",
      "fr": "Mettez à jour votre profil ou portfolio"
    },
    "type": "daily",
    "difficulty": "common",
    "maxProgress": 1,
    "rewards": {
      "xp": 75,
      "gold": 40
    },
    "duration": "24h",
    "enabled": true,
    "requirements": {
      "action": "profile_update",
      "threshold": 1
    }
  },
  {
    "id": "network-builder",
    "title": {
      "en": "Network Builder",
      "es": "Constructor de Red",
      "fr": "Constructeur de Réseau"
    },
    "description": {
      "en": "Send 5 messages to potential clients",
      "es": "Envía 5 mensajes a clientes potenciales",
      "fr": "Envoyez 5 messages à des clients potentiels"
    },
    "type": "daily",
    "difficulty": "uncommon",
    "maxProgress": 5,
    "rewards": {
      "xp": 150,
      "gold": 75
    },
    "duration": "24h",
    "enabled": true,
    "requirements": {
      "action": "message_sent",
      "threshold": 5
    }
  },
  {
    "id": "weekly-warrior",
    "title": {
      "en": "Weekly Warrior",
      "es": "Guerrero Semanal",
      "fr": "Guerrier Hebdomadaire"
    },
    "description": {
      "en": "Complete 5 jobs this week",
      "es": "Completa 5 trabajos esta semana",
      "fr": "Complétez 5 travaux cette semaine"
    },
    "type": "weekly",
    "difficulty": "rare",
    "maxProgress": 5,
    "rewards": {
      "xp": 1000,
      "gold": 500
    },
    "duration": "7d",
    "enabled": true,
    "requirements": {
      "action": "job_complete",
      "threshold": 5
    }
  },
  {
    "id": "main-journey-begins",
    "title": {
      "en": "The Journey Begins",
      "es": "El Viaje Comienza",
      "fr": "Le Voyage Commence"
    },
    "description": {
      "en": "Complete your profile and apply to your first job",
      "es": "Completa tu perfil y aplica a tu primer trabajo",
      "fr": "Complétez votre profil et postulez à votre premier emploi"
    },
    "type": "main",
    "difficulty": "common",
    "maxProgress": 2,
    "rewards": {
      "xp": 200,
      "gold": 100
    },
    "enabled": true,
    "requirements": {
      "steps": [
        {
          "action": "profile_complete",
          "threshold": 1
        },
        {
          "action": "job_application",
          "threshold": 1
        }
      ]
    }
  }
]
```

---

## 4. Backend Event Triggers (for reference)

These are the events your backend should track to update gamification stats:

```typescript
type GamificationEvent = 
  | 'job_complete'
  | 'job_application'
  | 'gold_earned'
  | 'gold_accumulated'
  | 'profile_completion'
  | 'profile_update'
  | 'level_reached'
  | 'message_sent'
  | 'active_conversations'
  | 'login_streak'
  | 'five_star_jobs'
  | 'secret_condition';

interface EventPayload {
  userId: string;
  event: GamificationEvent;
  value: number;
  metadata?: Record<string, any>;
  timestamp: string;
}
```

### Example Event Calls:

```javascript
// When user completes a job
POST /api/gamification/events
{
  "userId": "user_123abc",
  "event": "job_complete",
  "value": 1,
  "metadata": {
    "jobId": "job_456def",
    "rating": 5,
    "earnings": 250
  },
  "timestamp": "2026-01-14T15:45:00Z"
}

// When user earns gold
POST /api/gamification/events
{
  "userId": "user_123abc",
  "event": "gold_earned",
  "value": 250,
  "metadata": {
    "source": "job_completion",
    "jobId": "job_456def"
  },
  "timestamp": "2026-01-14T15:45:00Z"
}
```

---

## 5. Recommended Database Tables

### SQL Schema Example:

```sql
-- User Gamification Stats
CREATE TABLE user_gamification (
  user_id VARCHAR(255) PRIMARY KEY,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  total_xp INT DEFAULT 0,
  gold INT DEFAULT 0,
  total_gold_earned INT DEFAULT 0,
  title VARCHAR(255),
  streak INT DEFAULT 0,
  last_login_date TIMESTAMP,
  achievements_count INT DEFAULT 0,
  active_quests_count INT DEFAULT 0,
  completed_quests_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Achievements
CREATE TABLE user_achievements (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  achievement_id VARCHAR(255),
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP,
  progress INT DEFAULT 0,
  max_progress INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_achievement (user_id, achievement_id)
);

-- User Quests
CREATE TABLE user_quests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  template_id VARCHAR(255),
  status ENUM('active', 'completed', 'expired', 'abandoned') DEFAULT 'active',
  progress INT DEFAULT 0,
  max_progress INT,
  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Inventory
CREATE TABLE user_inventory (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  item_name VARCHAR(255),
  item_description TEXT,
  rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
  icon VARCHAR(50),
  equipped BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usable_until TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Gamification Notifications
CREATE TABLE gamification_notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  type ENUM('achievement', 'level_up', 'quest_complete', 'reward', 'challenge'),
  message TEXT,
  data JSON,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

This structure allows you to:
1. Store user gamification progress in your database
2. Configure achievements and quests from the backend
3. Track all gamification events
4. Support multi-language content
5. Easily extend with new achievements/quests without code changes
