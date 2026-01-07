"use client";

import Link from "next/link";
import { MapPin, Star, Users } from "lucide-react";
import Image from "next/image";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    category: string;
    description: string;
    budget: number;
    budgetType: "FIXED" | "HOURLY";
    location: string;
    remote: boolean;
    applicants: number;
    poster: {
      name: string;
      image: string;
      rating: number;
      reviews: number;
    };
  };
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-2">
            {job.category}
          </div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{job.title}</h3>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-1">{job.description}</p>

        {/* Budget */}
        <div className="mb-4">
          <p className="text-xl font-bold text-gray-900">
            ${job.budget.toLocaleString()}
            {job.budgetType === "HOURLY" && "/hr"}
          </p>
        </div>

        {/* Location & Remote */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <MapPin size={16} />
          {job.remote ? "Remote" : job.location}
        </div>

        {/* Poster Info */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Image
              src={job.poster.image}
              alt={job.poster.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{job.poster.name}</p>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-gray-600">
                  {job.poster.rating} ({job.poster.reviews})
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Users size={16} />
            <span className="text-sm">{job.applicants}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
