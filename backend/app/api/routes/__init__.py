from app.api.routes import auth, foods, goals, meals, nutrition, profile, scan, vision, water

ALL_ROUTERS = [
    auth.router,
    profile.router,
    scan.router,
    foods.router,
    nutrition.router,
    meals.router,
    water.router,
    goals.router,
    vision.router,
]
