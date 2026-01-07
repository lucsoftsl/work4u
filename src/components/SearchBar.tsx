"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

export function SearchBar() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder={t('home.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <input
        type="text"
        placeholder={t('home.locationPlaceholder')}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button className="md:w-auto">{t('home.search')}</Button>
    </div>
  );
}
