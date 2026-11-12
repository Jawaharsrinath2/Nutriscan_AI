import { request } from "./client";

export const fetchIngredients = () => request("/api/foods/ingredients");
export const fetchDishes = () => request("/api/foods/dishes");
