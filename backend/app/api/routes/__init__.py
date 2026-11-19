from app.api.routes import admin, auth, dashboard, foods, goals, meals, nutrition, plans, profile, scan, vision, water

ALL_ROUTERS = [
    auth.router,
    admin.router,
    dashboard.router,
    profile.router,
    plans.router,
    scan.router,
    foods.router,
    nutrition.router,
    meals.router,
    water.router,
    goals.router,
    vision.router,
]
