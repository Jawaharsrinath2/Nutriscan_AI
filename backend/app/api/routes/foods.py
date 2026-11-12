from fastapi import APIRouter, Depends

from app.schemas.food import Dish, DishPreview, Ingredient, PlateItem
from app.services.food_repository import FoodRepository, get_food_repository
from app.services.nutrition_calculator import meal_totals

router = APIRouter(prefix="/api/foods", tags=["foods"])


@router.get("/ingredients", response_model=list[Ingredient])
def list_ingredients(repo: FoodRepository = Depends(get_food_repository)) -> list[Ingredient]:
    return [Ingredient(key=key, **item) for key, item in repo.ingredients.items()]


@router.get("/dishes", response_model=list[Dish])
def list_dishes(repo: FoodRepository = Depends(get_food_repository)) -> list[Dish]:
    dishes = []
    for key, dish in repo.dishes.items():
        items = [PlateItem(**item) for item in dish["items"]]
        totals = meal_totals(items, repo)
        dishes.append(Dish(key=key, **{**dish, "items": items}, totals=DishPreview(kcal=totals.kcal, protein=totals.protein)))
    return dishes
