import { AgeGroup, Athlete, Tournament, uid } from "./arm";

export const DEFAULT_GROUPS: AgeGroup[] = [
  { id: "m-sen", name: "Мужчины", gender: "M", ageMin: 18, ageMax: 39, limits: [60, 70, 80, 90, 100] },
  { id: "w-sen", name: "Женщины", gender: "F", ageMin: 18, ageMax: 39, limits: [55, 60, 70] },
  { id: "m-jun", name: "Юниоры", gender: "M", ageMin: 14, ageMax: 17, limits: [60, 70] },
  { id: "m-vet", name: "Мастера", gender: "M", ageMin: 40, ageMax: 99, limits: [80, 90] },
];

export const DEFAULT_TOURNAMENT: Tournament = {
  name: "Открытый турнир по армрестлингу",
  date: "2026-10-24",
  place: "Спортивный зал",
  tables: 2,
  chiefJudge: "",
  secretary: "",
};

type Seed = [string, "M" | "F", number, number | null, string, string, ("right" | "left")[]];

const SEED: Seed[] = [
  ["Волков Артём", "M", 1997, 79.4, "Титан", "Казань", ["right", "left"]],
  ["Сорокин Илья", "M", 1999, 78.9, "Беркут", "Уфа", ["right", "left"]],
  ["Морозов Денис", "M", 1995, 77.2, "Титан", "Казань", ["right"]],
  ["Захаров Павел", "M", 2001, 76.5, "Атлант", "Самара", ["right", "left"]],
  ["Лебедев Олег", "M", 1993, 79.8, "Беркут", "Уфа", ["right"]],
  ["Никитин Роман", "M", 2000, 74.1, "Стальная рука", "Пермь", ["right", "left"]],
  ["Кузнецов Максим", "M", 1996, 88.3, "Атлант", "Самара", ["right"]],
  ["Баев Тимур", "M", 1998, 89.5, "Беркут", "Уфа", ["right", "left"]],
  ["Ершов Глеб", "M", 1994, 86.0, "Титан", "Казань", ["right"]],
  ["Федоров Антон", "M", 2002, 84.7, "Стальная рука", "Пермь", ["right"]],
  ["Ли Константин", "M", 2000, 69.2, "Атлант", "Самара", ["right"]],
  ["Гарипов Ринат", "M", 1997, 68.4, "Беркут", "Уфа", ["right", "left"]],
  ["Белов Кирилл", "M", 2003, 67.9, "Титан", "Казань", ["right"]],
  ["Орлова Мария", "F", 2001, 58.6, "Атлант", "Самара", ["left", "right"]],
  ["Шин Алина", "F", 1999, 59.3, "Титан", "Казань", ["left", "right"]],
  ["Котова Дарья", "F", 2003, 57.8, "Беркут", "Уфа", ["left"]],
  ["Ильина Вера", "F", 1998, 59.9, "Стальная рука", "Пермь", ["left", "right"]],
  ["Смирнов Егор", "M", 1990, null, "Атлант", "Самара", ["right"]],
];

export function demoAthletes(): Athlete[] {
  return SEED.map(([name, gender, birthYear, weight, club, city, hands]) => ({
    id: uid(),
    name,
    gender,
    birthYear,
    weight,
    club,
    city,
    hands,
  }));
}
