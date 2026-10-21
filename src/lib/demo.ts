import { AgeGroup, Tournament } from "./arm";

export const DEFAULT_GROUPS: AgeGroup[] = [];

export const LEGACY_DEFAULT_GROUPS: AgeGroup[] = [
  { id: "m-sen", name: "Мужчины", gender: "M", ageMin: 18, ageMax: 39, limits: [60, 70, 80, 90, 100] },
  { id: "w-sen", name: "Женщины", gender: "F", ageMin: 18, ageMax: 39, limits: [55, 60, 70] },
  { id: "m-jun", name: "Юниоры", gender: "M", ageMin: 14, ageMax: 17, limits: [60, 70] },
  { id: "m-vet", name: "Мастера", gender: "M", ageMin: 40, ageMax: 99, limits: [80, 90] },
];

export const DEFAULT_TOURNAMENT: Tournament = {
  name: "",
  date: "",
  place: "",
  tables: 2,
  chiefJudge: "",
  secretary: "",
};

export const LEGACY_DEMO_NAMES = new Set<string>([
  "Волков Артём",
  "Сорокин Илья",
  "Морозов Денис",
  "Захаров Павел",
  "Лебедев Олег",
  "Никитин Роман",
  "Кузнецов Максим",
  "Баев Тимур",
  "Ершов Глеб",
  "Федоров Антон",
  "Ли Константин",
  "Гарипов Ринат",
  "Белов Кирилл",
  "Орлова Мария",
  "Шин Алина",
  "Котова Дарья",
  "Ильина Вера",
  "Смирнов Егор",
]);

export const LEGACY_DEMO_TOURNAMENT = { name: "Открытый турнир по армрестлингу", date: "2026-10-24", place: "Спортивный зал" };
