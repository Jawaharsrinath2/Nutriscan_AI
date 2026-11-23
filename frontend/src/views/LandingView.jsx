import { useState } from "react";

/* ── Sample dishes data for the interactive showcase ────────────────────── */
const SAMPLE_PLATES = [
  {
    id: "chicken_quinoa_bowl",
    title: "Grilled Chicken Quinoa Bowl",
    tagline: "High Protein • Muscle Hypertrophy",
    image: "/samples/chicken_quinoa_bowl.jpg",
    kcal: 510,
    protein: 42,
    carbs: 38,
    fat: 18,
    dietBadge: "💪 Optimal for Muscle Gain",
    items: [
      { name: "Grilled Chicken Breast", grams: 150, kcal: 247, protein: 31.5 },
      { name: "Cooked Quinoa", grams: 120, kcal: 144, protein: 5.3 },
      { name: "Fresh Hass Avocado", grams: 50, kcal: 80, protein: 1.0 },
      { name: "Cherry Tomatoes & Greens", grams: 60, kcal: 39, protein: 4.2 },
    ],
  },
  {
    id: "paneer_thali",
    title: "Royal Paneer Vegetarian Thali",
    tagline: "Wholesome • Balanced Daily Fuel",
    image: "/samples/paneer_thali.jpg",
    kcal: 680,
    protein: 28,
    carbs: 76,
    fat: 29,
    dietBadge: "⚖️ Balanced Smart Diet",
    items: [
      { name: "Paneer Curry", grams: 140, kcal: 290, protein: 16.2 },
      { name: "Whole Wheat Roti (2 pcs)", grams: 80, kcal: 210, protein: 6.8 },
      { name: "Yellow Dal Tadka", grams: 100, kcal: 110, protein: 4.5 },
      { name: "Cucumber Salad", grams: 50, kcal: 70, protein: 0.5 },
    ],
  },
  {
    id: "idli_sambar",
    title: "Steamed Idli with Lentil Sambar",
    tagline: "Gut Healthy • Low Fat Breakfast",
    image: "/samples/idli_sambar.jpg",
    kcal: 320,
    protein: 11,
    carbs: 58,
    fat: 4,
    dietBadge: "🔥 Lean Deficit Friendly",
    items: [
      { name: "Steamed Rice Idlis (3 pcs)", grams: 150, kcal: 210, protein: 6.0 },
      { name: "Toor Dal Veggie Sambar", grams: 180, kcal: 95, protein: 4.8 },
      { name: "Coconut Chutney", grams: 20, kcal: 15, protein: 0.2 },
    ],
  },
  {
    id: "masala_dosa",
    title: "Crispy South Indian Masala Dosa",
    tagline: "Traditional Fermented Staple",
    image: "/samples/masala_dosa.jpg",
    kcal: 380,
    protein: 8,
    carbs: 62,
    fat: 11,
    dietBadge: "🍽️ Traditional Feast",
    items: [
      { name: "Crispy Dosa Crepe", grams: 120, kcal: 220, protein: 4.5 },
      { name: "Spiced Potato Masala", grams: 100, kcal: 130, protein: 2.5 },
      { name: "Tomato Garlic Chutney", grams: 25, kcal: 30, protein: 1.0 },
    ],
  },
  {
    id: "oats_berry_bowl",
    title: "Protein Oatmeal Berry Bowl",
    tagline: "Antioxidant Rich • Slow Burning Energy",
    image: "/samples/oats_berry_bowl.jpg",
    kcal: 340,
    protein: 16,
    carbs: 52,
    fat: 7,
    dietBadge: "🥑 Low Glycemic Index",
    items: [
      { name: "Rolled Oats in Almond Milk", grams: 180, kcal: 220, protein: 8.5 },
      { name: "Whey Protein Booster", grams: 15, kcal: 60, protein: 6.0 },
      { name: "Blueberries & Chia Seeds", grams: 40, kcal: 60, protein: 1.5 },
    ],
  },
];

/* ── FAQ items ─────────────────────────────────────────────────────────── */
const FAQS = [
  {
    question: "How does NutriScan AI detect calories and macros from food photos?",
    answer:
      "NutriScan AI utilizes Google's state-of-the-art Gemini 3.6 Flash multimodal vision model (with local YOLO intelligence fallback). The AI detects distinct dish items on your plate, estimates visual portion volumes, and calculates exact calories, protein, carbs, healthy fats, and dietary fiber using verified nutritional data.",
  },
  {
    question: "Can I log my meals hands-free by speaking with Voice Log?",
    answer:
      "Yes! With the AI Voice Meal Logger, you can simply tap the microphone and speak naturally in English, Tamil, or Tanglish (e.g. 'Morning 3 idlis, sambar, and 1 boiled egg'). Gemini understands regional food vocabulary, estimates realistic grams, and logs directly into your daily tracker in seconds.",
  },
  {
    question: "How does the Restaurant Menu Decider work with Zomato, Swiggy, and paper menus?",
    answer:
      "Before ordering food at a restaurant or on delivery apps like Swiggy and Zomato, snap or upload the menu card. NutriScan AI analyzes each dish and gives you instant traffic-light verdicts: Green (Best Fit for your goals), Yellow (Moderate / Share), and Red (Target Breakers) based on your remaining daily calories and protein.",
  },
  {
    question: "Does NutriScan AI support Indian, South Indian, and regional cuisines?",
    answer:
      "Absolutely. NutriScan AI was built specifically with deep expertise in Indian, South Indian, and regional foods (Idli, Dosa, Sambar, Chicken Biryani, Paneer Thali, Dal Tadka, Roti, Chana Sundal, Fish Curry) alongside global healthy staples like Quinoa bowls, Oatmeal, and Grilled Chicken salads.",
  },
  {
    question: "Can I adjust ingredients, portion weights, or auto-fit meals to my calorie budget?",
    answer:
      "Yes! You have complete interactive control. Detected ingredients include portion sliders, multiplier chips (0.5x, 1x, 1.5x, 2x), and a 1-tap 'Auto-Fit' button that automatically scales your dish portions to fit your exact remaining daily calorie and macro budget.",
  },
  {
    question: "How does the Packaged Food Audit detect harmful additives and ultra-processed ingredients?",
    answer:
      "Simply snap a photo of any packaged food product's ingredient list and nutrition table. NutriScan AI scans for hidden added sugars, trans fats, palm oil, artificial emulsifiers, and ultra-processed food (UPF) NOVA classifications with clear health hazard alerts.",
  },
  {
    question: "Is NutriScan AI free to use, and how is my personal health data secured?",
    answer:
      "Yes, NutriScan AI is 100% free to get started with no credit card required. Your data is protected by enterprise-grade security including bcrypt password hashing, JWT authentication tokens, rate limiting against brute-force attacks, and secure Google OAuth integration.",
  },
];

/* ── LandingView Component ─────────────────────────────────────────────── */
export default function LandingView({ onGetStarted, onSignIn, isAuthenticated, onGoToApp }) {
  const [selectedPlate, setSelectedPlate] = useState(SAMPLE_PLATES[0]);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (idx) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Sticky Top Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <nav aria-label="Main Navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  NutriScan <span className="text-emerald-600">AI</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Vision 2.0
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-emerald-600 transition">How It Works</a>
            <a href="#ai-tools" className="hover:text-emerald-600 transition">AI Tools</a>
            <a href="#demo" className="hover:text-emerald-600 transition">Live Demo</a>
            <a href="#features" className="hover:text-emerald-600 transition">Features</a>
            <a href="#diet-plans" className="hover:text-emerald-600 transition">Diet Plans</a>
            <a href="#faq" className="hover:text-emerald-600 transition">FAQ</a>
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onGoToApp}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-sm transition"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-emerald-600 hover:bg-slate-100 transition"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-sm shadow-emerald-500/20 transition"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-4 pt-2 pb-4 bg-white border-b border-slate-200 space-y-2">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">How It Works</a>
            <a href="#ai-tools" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">AI Tools</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Live Demo</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Features</a>
            <a href="#diet-plans" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Diet Plans</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">FAQ</a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onGoToApp}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm"
                >
                  Go to Dashboard →
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="w-full py-2 rounded-xl text-center text-sm font-semibold text-slate-700 bg-slate-100"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm"
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white">
        {/* Glow background accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-emerald-400/10 via-teal-400/15 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Next-Gen Gemini 3.6 Flash Vision</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                AI-Powered Nutrition Tracker:{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 bg-clip-text text-transparent">
                  Know What’s On Your Plate Before You Eat
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Snap meal photos, log food with natural voice, or audit restaurant menus. Powered by Google Gemini Vision to calculate exact calories, protein, and macros for Indian &amp; global dishes in seconds.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 group"
                >
                  <span>Start Scanning Free</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <a
                  href="#demo"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 font-semibold text-base transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Explore Live Demo</span>
                  <span>🍽️</span>
                </a>
              </div>

              {/* Trust badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80 text-left max-w-lg mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl font-extrabold text-emerald-700">98%</div>
                  <div className="text-xs text-slate-500 font-medium">Vision Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-teal-700">100+</div>
                  <div className="text-xs text-slate-500 font-medium">Verified Dishes</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-cyan-700">5-in-1</div>
                  <div className="text-xs text-slate-500 font-medium">AI Nutrition Suite</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Hero Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform hover:-translate-y-1 transition duration-300">
                {/* Simulated scan window */}
                <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                  <img
                    src="/samples/chicken_quinoa_bowl.jpg"
                    alt="NutriScan AI food scanner analyzing Grilled Chicken Quinoa Bowl ingredients, grams, calories, and macros"
                    className="w-full h-full object-cover"
                  />
                  {/* Scanner overlay beam */}
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-emerald-500/10" />
                  <div className="scanner-beam" />

                  {/* AI detection hotspots */}
                  <div className="absolute top-[28%] left-[32%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-lg border border-emerald-400/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 hotspot-dot" />
                    <span>Grilled Chicken (150g)</span>
                  </div>

                  <div className="absolute top-[68%] left-[62%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-lg border border-teal-400/60">
                    <span className="w-2 h-2 rounded-full bg-teal-400 hotspot-dot" />
                    <span>Quinoa (120g)</span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">
                    AI Scanned • 510 kcal
                  </div>
                </div>

                {/* Instant Macro Summary */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">Chicken Quinoa Bowl</h4>
                      <p className="text-xs text-slate-500">Auto-detected 4 ingredients</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      High Protein
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-400 font-medium">Calories</div>
                      <div className="text-sm font-extrabold text-slate-900">510</div>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                      <div className="text-xs text-indigo-500 font-medium">Protein</div>
                      <div className="text-sm font-extrabold text-indigo-900">42g</div>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="text-xs text-amber-500 font-medium">Carbs</div>
                      <div className="text-sm font-extrabold text-amber-900">38g</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                      <div className="text-xs text-rose-500 font-medium">Fat</div>
                      <div className="text-sm font-extrabold text-rose-900">18g</div>
                    </div>
                  </div>

                  {/* Verdict strip */}
                  <div className="flex items-center gap-2.5 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-3 py-2 rounded-xl">
                    <span className="text-base">🎯</span>
                    <span className="font-medium">Fits perfectly within your daily target of 2,450 kcal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Simple 3-Step Flow</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              From Plate Photo To Macro Breakdown in Seconds
            </h3>
            <p className="text-slate-600 text-base">
              No manual tedious calorie lookups. NutriScan AI analyzes the image, identifies each food item, and calculates your targets in one click.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 relative flex flex-col items-center text-center hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl mb-6 font-extrabold">
                📸
              </div>
              <div className="absolute top-6 right-6 text-xs font-black text-slate-300">01</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">1. Snap Or Upload</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Take a quick photo of your breakfast, thali, or dinner using your camera or choose any image from your gallery.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 relative flex flex-col items-center text-center hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center text-2xl mb-6 font-extrabold">
                🤖
              </div>
              <div className="absolute top-6 right-6 text-xs font-black text-slate-300">02</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">2. Multimodal AI Analysis</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Gemini Vision parses food items, detects portion volumes, and queries the nutrition database for exact calories, protein, and macros.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 relative flex flex-col items-center text-center hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl mb-6 font-extrabold">
                🎯
              </div>
              <div className="absolute top-6 right-6 text-xs font-black text-slate-300">03</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">3. Auto-Fit &amp; Log</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Review your diet verdict, scale portions with the 1-click Auto-Fit tool to match your daily limit, and log to your tracker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Flagship AI Tools Suite Section ──────────────────────────── */}
      <section id="ai-tools" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Complete AI Health Ecosystem</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              5 Intelligent AI Tools To Master Your Daily Nutrition
            </h3>
            <p className="text-slate-600 text-base">
              From snapping home-cooked meals and speaking dishes with natural voice to evaluating restaurant menus and packaged snacks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Tool 1: Pre-Meal Food Photo Scanner */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  📸
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Multimodal Vision
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Gemini 3.6 Flash</span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Pre-Meal Photo Scanner
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Snap any home-cooked plate, thali, or snack. The AI identifies discrete ingredients, recognizes culinary portions, and calculates exact calories, protein, and macros before your first bite.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Food Volume &amp; Gram Estimation</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 2: Voice Meal Logger */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-teal-400 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  🎙️
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Hands-Free Voice NLP
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">English • Tamil • Tanglish</span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
                  Multilingual Voice Meal Logger
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  No tedious manual typing. Tap the microphone and describe your meal naturally (e.g. &ldquo;2 chapati with dal and curd&rdquo; or &ldquo;Kaalaila 3 idli, sambar&rdquo;). Gemini logs portions into your diary instantly.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-bold text-teal-700">
                <span>Fast 10-Second Diary Logging</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 3: Restaurant Menu Decider */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-cyan-400 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  🍽️
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    Smart Pre-Order Guide
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Zomato • Swiggy • Dine-In</span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">
                  Restaurant Menu Decider
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload any restaurant menu card or food delivery screenshot. NutriScan AI grades every dish with instant 🟢 Green (Best Fit), 🟡 Yellow (Moderate), and 🔴 Red (Target Breakers) verdicts matching your remaining daily calories.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-bold text-cyan-700">
                <span>Eat Out Without Derailing Goals</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 4: 24/7 AI Nutritionist Coach */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  🤖
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    24/7 Live Intelligence
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Context-Aware</span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  24/7 Personal AI Nutritionist
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Need a late-night snack idea or high-protein dinner option? Your AI Coach knows your exact consumed macros, remaining calories, and logged meals today to deliver personalized, actionable diet advice.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Personalized Cravings &amp; Swaps</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 5: Packaged Food Ingredient Audit */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  📦
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Ingredient Label OCR
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">UPF &amp; Sugar Audit</span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Packaged Food Health Audit
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Scan packaged food labels to unmask hidden added sugars, industrial seed oils, palm oil, artificial emulsifiers, and NOVA ultra-processed food (UPF) classifications with clear health risk ratings.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-bold text-indigo-700">
                <span>Spot Hidden Food Hazards</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 6: 1-Tap Auto-Fit & Daily Tracker */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Smart Portion Control
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">One-Tap Rebalance</span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                  One-Tap Auto-Fit &amp; Tracker
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Have 400 kcal left for dinner? Tap Auto-Fit and NutriScan re-portions your plate ingredients automatically to hit your exact calorie and protein goals without guessing.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Zero Guesswork Macro Balance</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Demo Showcase ─────────────────────────────────── */}
      <section id="demo" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Interactive Demo</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              See How NutriScan Breaks Down Real Plates
            </h3>
            <p className="text-slate-600 text-base">
              Click through popular meals below to preview how our food recognition engine identifies ingredients, weights, and macronutrients.
            </p>
          </div>

          {/* Dish selector chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {SAMPLE_PLATES.map((plate) => (
              <button
                key={plate.id}
                type="button"
                onClick={() => setSelectedPlate(plate)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  selectedPlate.id === plate.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {plate.title}
              </button>
            ))}
          </div>

          {/* Interactive display card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12">
            {/* Left: Food photo with details */}
            <div className="md:col-span-6 relative aspect-square sm:aspect-auto">
              <img
                src={selectedPlate.image}
                alt={`NutriScan AI calorie counter analyzing ${selectedPlate.title}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/20">
                {selectedPlate.dietBadge}
              </div>
            </div>

            {/* Right: Nutrition breakdown table */}
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  {selectedPlate.tagline}
                </span>
                <h4 className="text-2xl font-extrabold text-slate-900 mt-1 mb-4">
                  {selectedPlate.title}
                </h4>

                {/* Macro Pills */}
                <div className="grid grid-cols-4 gap-2 mb-6 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-400 font-medium">Energy</div>
                    <div className="text-base font-extrabold text-slate-900">{selectedPlate.kcal}</div>
                    <div className="text-[10px] text-slate-400">kcal</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="text-[11px] text-indigo-500 font-medium">Protein</div>
                    <div className="text-base font-extrabold text-indigo-900">{selectedPlate.protein}g</div>
                    <div className="text-[10px] text-indigo-400">g</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="text-[11px] text-amber-500 font-medium">Carbs</div>
                    <div className="text-base font-extrabold text-amber-900">{selectedPlate.carbs}g</div>
                    <div className="text-[10px] text-amber-400">g</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-[11px] text-rose-500 font-medium">Fat</div>
                    <div className="text-base font-extrabold text-rose-900">{selectedPlate.fat}g</div>
                    <div className="text-[10px] text-rose-400">g</div>
                  </div>
                </div>

                {/* Ingredient item list */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Detected Ingredients ({selectedPlate.items.length})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedPlate.items.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                          <span>{item.grams}g</span>
                          <span className="font-bold text-slate-700">{item.kcal} kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Try this Plate CTA */}
              <button
                type="button"
                onClick={onGetStarted}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Scan Your Own Meal Now</span>
                <span>📸</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Features Grid ─────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Built For Precision</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Everything You Need To Master Daily Nutrition
            </h3>
            <p className="text-slate-600 text-base">
              Engineered with advanced food vision models, customizable macro targets, and zero-friction tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                ⚡
              </div>
              <h4 className="text-lg font-bold text-slate-900">Smart Dual-Engine Vision</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Harnesses Google Gemini 3.6 Flash for multi-label recognition and local YOLO detection when offline or low-latency is needed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl">
                ⚖️
              </div>
              <h4 className="text-lg font-bold text-slate-900">One-Tap Auto-Fit Scaling</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Have 450 kcal remaining for the day? Tap Auto-Fit and the plate portion sizes automatically re-proportion to match your deficit or target.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl">
                💧
              </div>
              <h4 className="text-lg font-bold text-slate-900">Daily Hydration Tracker</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track water consumption in 250ml glasses with a single tap. Log hydration side-by-side with breakfast, lunch, snacks, and dinner.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl">
                🥗
              </div>
              <h4 className="text-lg font-bold text-slate-900">50+ Verified Food Database</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nutritional profiles including calories, protein, complex carbs, healthy fats, and dietary fiber for whole foods and regional recipes.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl">
                🛡️
              </div>
              <h4 className="text-lg font-bold text-slate-900">Attempt Limits &amp; Security</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Brute-force protection with automatic 15-minute account lockouts on 5 failed attempts, IP rate-limiting, and bcrypt password encryption.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition hover:shadow-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl">
                🌐
              </div>
              <h4 className="text-lg font-bold text-slate-900">One-Tap Google OAuth</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sign in seamlessly using your Google credentials with Google Identity Services. Your personalized preferences sync to your profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Diet Plans Section ────────────────────────────────────────── */}
      <section id="diet-plans" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Tailored To Your Lifestyle</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Preset Diet Plans &amp; Custom Target Goals
            </h3>
            <p className="text-slate-600 text-base">
              Choose an evidence-based preset or configure your own grams and calories. Every meal photo is evaluated against your active plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Plan 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
              <div className="text-2xl">🔥</div>
              <h4 className="text-lg font-bold text-slate-900">Fat Loss &amp; Lean Deficit</h4>
              <div className="text-2xl font-extrabold text-slate-900">
                1,600 <span className="text-xs text-slate-400 font-normal">kcal/day</span>
              </div>
              <p className="text-xs text-slate-500">
                High protein to preserve lean muscle while maintaining a steady calorie deficit.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700 space-y-1">
                <div className="flex justify-between"><span>Protein</span><span className="text-indigo-600">130g</span></div>
                <div className="flex justify-between"><span>Carbs</span><span className="text-amber-600">140g</span></div>
                <div className="flex justify-between"><span>Fat</span><span className="text-rose-600">55g</span></div>
              </div>
            </div>

            {/* Plan 2 */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500 shadow-md relative space-y-4">
              <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                Most Popular
              </div>
              <div className="text-2xl">⚖️</div>
              <h4 className="text-lg font-bold text-slate-900">Balanced Smart Maintenance</h4>
              <div className="text-2xl font-extrabold text-slate-900">
                2,000 <span className="text-xs text-slate-400 font-normal">kcal/day</span>
              </div>
              <p className="text-xs text-slate-500">
                Optimal everyday distribution for sustained mental energy, gut health, and fitness.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700 space-y-1">
                <div className="flex justify-between"><span>Protein</span><span className="text-indigo-600">130g</span></div>
                <div className="flex justify-between"><span>Carbs</span><span className="text-amber-600">210g</span></div>
                <div className="flex justify-between"><span>Fat</span><span className="text-rose-600">65g</span></div>
              </div>
            </div>

            {/* Plan 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
              <div className="text-2xl">💪</div>
              <h4 className="text-lg font-bold text-slate-900">Muscle Hypertrophy Bulk</h4>
              <div className="text-2xl font-extrabold text-slate-900">
                2,450 <span className="text-xs text-slate-400 font-normal">kcal/day</span>
              </div>
              <p className="text-xs text-slate-500">
                Caloric surplus with 180g protein to maximize strength training and tissue repair.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700 space-y-1">
                <div className="flex justify-between"><span>Protein</span><span className="text-indigo-600">180g</span></div>
                <div className="flex justify-between"><span>Carbs</span><span className="text-amber-600">260g</span></div>
                <div className="flex justify-between"><span>Fat</span><span className="text-rose-600">75g</span></div>
              </div>
            </div>

            {/* Plan 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
              <div className="text-2xl">🥑</div>
              <h4 className="text-lg font-bold text-slate-900">Low-Carb &amp; Glycemic</h4>
              <div className="text-2xl font-extrabold text-slate-900">
                1,750 <span className="text-xs text-slate-400 font-normal">kcal/day</span>
              </div>
              <p className="text-xs text-slate-500">
                Low net carbs to prevent post-meal sugar spikes and promote fat utilization.
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700 space-y-1">
                <div className="flex justify-between"><span>Protein</span><span className="text-indigo-600">140g</span></div>
                <div className="flex justify-between"><span>Carbs</span><span className="text-amber-600">75g</span></div>
                <div className="flex justify-between"><span>Fat</span><span className="text-rose-600">100g</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Got Questions?</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Frequently Asked Questions
            </h3>
            <p className="text-slate-600 text-base">
              Everything you need to know about NutriScan AI and getting started.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={faq.question}
                className="border border-slate-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base">{faq.question}</span>
                  <span className="text-slate-400 text-xl font-bold">
                    {expandedFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 py-4 bg-white text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── High-Impact Bottom CTA Banner ─────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>

          <h3 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Turn Every Meal Into A Step Toward Your Goals
          </h3>

          <p className="text-emerald-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Join thousands of health enthusiasts using AI to inspect calories, protein, and dietary balance before taking the first bite.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 font-extrabold text-base shadow-xl transition"
            >
              Get Started In 30 Seconds Free
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="w-full sm:w-auto px-6 py-4 rounded-xl border border-white/40 hover:bg-white/10 text-white font-semibold text-base transition"
            >
              Sign In To Account
            </button>
          </div>
        </div>
      </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                N
              </div>
              <div>
                <span className="text-white font-black text-lg tracking-tight">NutriScan <span className="text-emerald-400">AI</span></span>
                <p className="text-xs text-slate-400">Smart Pre-Meal Food Photo Analyzer, Voice Logger &amp; AI Diet Assistant</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 font-semibold">
              <a href="#how-it-works" className="hover:text-emerald-400 transition">How It Works</a>
              <a href="#ai-tools" className="hover:text-emerald-400 transition">AI Tools</a>
              <a href="#demo" className="hover:text-emerald-400 transition">Live Demo</a>
              <a href="#features" className="hover:text-emerald-400 transition">Features</a>
              <a href="#diet-plans" className="hover:text-emerald-400 transition">Diet Plans</a>
              <a href="#faq" className="hover:text-emerald-400 transition">FAQ</a>
              <button type="button" onClick={onSignIn} className="hover:text-emerald-400 transition">Sign In</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 NutriScan AI. All rights reserved. Powered by Google Gemini Multimodal Vision.</p>
            <p>Built for healthy living in India &amp; worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
