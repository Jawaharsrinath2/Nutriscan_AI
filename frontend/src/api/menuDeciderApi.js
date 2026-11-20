import { request } from "./client";

export const fetchMenuSamples = () => request("/api/menu-decider/samples");

export const analyzeMenuText = (payload) =>
  request("/api/menu-decider/analyze", {
    method: "POST",
    body: payload,
  });

export const analyzeMenuPhoto = async (file, remainingKcal = 600, remainingProtein = 30, dietPref = "any") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("remaining_kcal", remainingKcal);
  formData.append("remaining_protein", remainingProtein);
  formData.append("diet_pref", dietPref);

  return request("/api/menu-decider/photo", {
    method: "POST",
    form: formData,
  });
};

export const logRestaurantDish = (dishData) => {
  const formData = new FormData();
  formData.append("dish_name", dishData.name);
  formData.append("slot", dishData.slot || "Dinner");
  formData.append("kcal", dishData.estimated_kcal);
  formData.append("protein", dishData.estimated_protein);
  formData.append("carbs", dishData.estimated_carbs || 0);
  formData.append("fat", dishData.estimated_fat || 0);
  formData.append("fiber", dishData.estimated_fiber || 0);

  return request("/api/menu-decider/log", {
    method: "POST",
    form: formData,
  });
};
