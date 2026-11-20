from app.api.routes import admin, audit, auth, chatbot, dashboard, foods, goals, meals, menu_decider, nutrition, plans, profile, scan, vision, voice_log, water

ALL_ROUTERS = [
    auth.router,
    admin.router,
    audit.router,
    voice_log.router,
    menu_decider.router,
    chatbot.router,
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
