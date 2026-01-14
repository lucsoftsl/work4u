"use client";

import Link from "next/link";
import { MapPin, Star, Users, Coins, Sparkles, Swords, Clock } from "lucide-react";
import Image from "next/image";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    category: string;
    description: string;
    budget: number;
    budgetType: "FIXED" | "HOURLY";
    budgetCurrency: string;
    location: string;
    remote: boolean;
    applicants: number;
    createdBy: {
      userId: string;
      name: string;
      image?: string | null;
      rating: number;
      reviews: number;
    };
  };
}

// Determine quest difficulty based on budget
const getQuestDifficulty = (budget: number): {
  rarity: string;
  color: string;
  label: string;
  xpReward: number;
} => {
  if (budget >= 5000) return {
    rarity: 'rarity-legendary',
    color: 'text-rarity-legendary',
    label: 'LEGENDARY',
    xpReward: 500
  };
  if (budget >= 2000) return {
    rarity: 'rarity-epic',
    color: 'text-rarity-epic',
    label: 'EPIC',
    xpReward: 300
  };
  if (budget >= 1000) return {
    rarity: 'rarity-rare',
    color: 'text-rarity-rare',
    label: 'RARE',
    xpReward: 200
  };
  if (budget >= 500) return {
    rarity: 'rarity-uncommon',
    color: 'text-rarity-uncommon',
    label: 'UNCOMMON',
    xpReward: 100
  };
  return {
    rarity: 'rarity-common',
    color: 'text-rarity-common',
    label: 'COMMON',
    xpReward: 50
  };
};

export function JobCard({ job }: JobCardProps) {
  const difficulty = getQuestDifficulty(job.budget);
  const goldReward = Math.floor(job.budget / 10); // Convert currency to gold

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className={`
        bg-card border-2 rounded-lg p-6 
        ${difficulty.rarity}
        transition-all duration-300 
        hover:scale-[1.02] hover:-translate-y-1
        cursor-pointer h-full flex flex-col
        relative overflow-hidden
        ${difficulty.label === 'LEGENDARY' ? 'animate-pulse-glow' : ''}
      `}>
        {/* Decorative corner accent */}
        <div className={`absolute top-0 right-0 w-20 h-20 ${difficulty.color} opacity-10`}>
          <Swords className="w-full h-full transform rotate-45" />
        </div>

        {/* Header */}
        <div className="mb-4 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className={`
              inline-flex items-center gap-1 px-3 py-1 rounded-full 
              text-xs font-bold uppercase
              ${difficulty.color}
              bg-gradient-to-r from-card to-muted
              border-2 ${difficulty.rarity.replace('rarity-', 'border-rarity-')}
            `}>
              <Sparkles className="w-3 h-3" />
              {difficulty.label}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground border border-border">
              {job.category}
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground line-clamp-2 flex items-start gap-2">
            <Scroll className={`w-5 h-5 mt-0.5 flex-shrink-0 ${difficulty.color}`} />
            {job.title}
          </h3>
        </div>

        {/* Description - Quest text */}
        <div className="mb-4 flex-1">
          <p className="text-sm text-muted-foreground italic line-clamp-3">
            "{job.description}"
          </p>
        </div>

        {/* Quest Rewards */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-semibold">QUEST REWARDS:</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-secondary" />
                <span className="text-base font-bold text-secondary">
                  {goldReward.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">Gold</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-accent" />
                <span className="text-base font-bold text-accent">
                  +{difficulty.xpReward}
                </span>
                <span className="text-xs text-muted-foreground">XP</span>
              </div>
            </div>
            {job.budgetType === "HOURLY" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>per hour</span>
              </div>
            )}
          </div>
        </div>

        {/* Location & Remote */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin size={16} />
          <span>{job.remote ? "🌍 Remote Quest" : job.location}</span>
        </div>

        {/* Quest Giver Info */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {job.createdBy.image ? (
              <Image
                src={job.createdBy.image}
                alt={job.createdBy.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-primary"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {job.createdBy.name[0]}
                </span>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Quest Giver</p>
              <p className="text-sm font-medium text-foreground">{job.createdBy.name}</p>
              <div className="flex items-center gap-1">
                <Star size={12} className="text-secondary fill-secondary" />
                <span className="text-xs text-muted-foreground">
                  {job.createdBy.rating} ({job.createdBy.reviews})
                </span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Users size={14} />
              <span className="text-xs font-bold">{job.applicants}</span>
            </div>
            <p className="text-xs text-muted-foreground">Adventurers</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Import Scroll icon
const Scroll = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3H16C17.1046 3 18 3.89543 18 5V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V5C6 3.89543 6.89543 3 8 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7H15M9 11H15M9 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
