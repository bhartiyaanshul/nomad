import {
  Camera,
  Compass,
  Mountain,
  Music,
  Palette,
  ShoppingBag,
  Soup,
  Wine,
} from "lucide-react";
import { cn } from "./utils";

interface CategoryIconProps {
  category: string;
  className?: string;
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  const c = cn(className);
  switch (category) {
    case "food":
      return <Soup className={c} />;
    case "sightseeing":
      return <Camera className={c} />;
    case "adventure":
      return <Mountain className={c} />;
    case "culture":
      return <Palette className={c} />;
    case "relaxation":
      return <Compass className={c} />;
    case "shopping":
      return <ShoppingBag className={c} />;
    case "nightlife":
      return <Wine className={c} />;
    default:
      return <Music className={c} />;
  }
}

export function categoryLabel(category: string): string {
  return category[0].toUpperCase() + category.slice(1);
}
