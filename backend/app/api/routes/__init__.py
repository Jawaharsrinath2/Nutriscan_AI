from app.api.routes import auth, foods, goals, meals, nutrition, scan, vision, water

ALL_ROUTERS = [auth.router, scan.router, foods.router, nutrition.router, meals.router, water.router, goals.router, vision.router]
