/**
 * High-Resolution HTML5 Canvas Social Share Card Renderer for NutriScan AI.
 * Produces crisp 2x Retina PNGs for Instagram Stories (9:16) and Square Posts (1:1).
 */

export const CARD_THEMES = {
  emerald: {
    id: "emerald",
    name: "Emerald Glass",
    bgGradient: ["#064e3b", "#065f46", "#042f2e"],
    cardBg: "rgba(255, 255, 255, 0.08)",
    accent: "#10b981",
    accentLight: "#34d399",
    textPrimary: "#ffffff",
    textSecondary: "#a7f3d0",
    badgeBg: "rgba(16, 185, 129, 0.2)",
    badgeBorder: "rgba(52, 211, 153, 0.4)",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Tech",
    bgGradient: ["#0f172a", "#1e293b", "#090d16"],
    cardBg: "rgba(255, 255, 255, 0.06)",
    accent: "#38bdf8",
    accentLight: "#7dd3fc",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    badgeBg: "rgba(56, 189, 248, 0.18)",
    badgeBorder: "rgba(125, 211, 252, 0.4)",
  },
  sunset: {
    id: "sunset",
    name: "Sunset Energy",
    bgGradient: ["#831843", "#9d174d", "#4c0519"],
    cardBg: "rgba(255, 255, 255, 0.09)",
    accent: "#f43f5e",
    accentLight: "#fb7185",
    textPrimary: "#ffffff",
    textSecondary: "#fecdd3",
    badgeBg: "rgba(244, 63, 94, 0.2)",
    badgeBorder: "rgba(251, 113, 133, 0.4)",
  },
  amber: {
    id: "amber",
    name: "Golden Fitness",
    bgGradient: ["#78350f", "#92400e", "#451a03"],
    cardBg: "rgba(255, 255, 255, 0.08)",
    accent: "#f59e0b",
    accentLight: "#fbbf24",
    textPrimary: "#ffffff",
    textSecondary: "#fde68a",
    badgeBg: "rgba(245, 158, 11, 0.2)",
    badgeBorder: "rgba(251, 191, 36, 0.4)",
  },
};

export const CARD_FORMATS = {
  story: {
    id: "story",
    name: "Story (9:16)",
    width: 1080,
    height: 1920,
    aspect: "9/16",
  },
  square: {
    id: "square",
    name: "Square Post (1:1)",
    width: 1080,
    height: 1080,
    aspect: "1/1",
  },
};

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

async function tryLoadImage(src) {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws the share card on a canvas element.
 */
export async function renderShareCard(canvas, {
  type = "meal", // "meal" | "audit" | "daily"
  format = "story", // "story" | "square"
  themeId = "emerald",
  data = {},
  caption = "🔥 NutriScan AI Pre-Meal Check",
  user = null,
}) {
  const fmt = CARD_FORMATS[format] || CARD_FORMATS.story;
  const theme = CARD_THEMES[themeId] || CARD_THEMES.emerald;

  canvas.width = fmt.width;
  canvas.height = fmt.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = fmt.width;
  const H = fmt.height;
  const isStory = format === "story";

  // 1. Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, theme.bgGradient[0]);
  bgGrad.addColorStop(0.5, theme.bgGradient[1]);
  bgGrad.addColorStop(1, theme.bgGradient[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative glowing ambient orbs
  ctx.save();
  const orb1 = ctx.createRadialGradient(W * 0.85, H * 0.15, 20, W * 0.85, H * 0.15, 450);
  orb1.addColorStop(0, theme.accent + "44");
  orb1.addColorStop(1, "transparent");
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, W, H);

  const orb2 = ctx.createRadialGradient(W * 0.15, H * 0.8, 20, W * 0.15, H * 0.8, 500);
  orb2.addColorStop(0, theme.accentLight + "33");
  orb2.addColorStop(1, "transparent");
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 2. Header Branding
  const topPad = isStory ? 100 : 70;
  ctx.save();
  // Logo Icon
  roundRect(ctx, 80, topPad, 56, 56, 16);
  ctx.fillStyle = theme.accent;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🥗", 108, topPad + 28);

  // App Title
  ctx.textAlign = "left";
  ctx.font = "900 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("NutriScan", 152, topPad + 24);

  const aiWidth = ctx.measureText("NutriScan").width;
  ctx.fillStyle = theme.accentLight;
  ctx.fillText("AI", 152 + aiWidth + 8, topPad + 24);

  // Subtitle / Date
  ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.textSecondary;
  const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  ctx.fillText(`Smart Pre-Meal Check • ${todayStr}`, 152, topPad + 48);

  // User badge on right
  if (user?.username) {
    ctx.textAlign = "right";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.textPrimary;
    ctx.fillText(`@${user.username}`, W - 80, topPad + 28);

    ctx.font = "500 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText("Daily Tracker", W - 80, topPad + 48);
  }
  ctx.restore();

  // 3. Motivational Top Banner
  const bannerY = topPad + 90;
  ctx.save();
  roundRect(ctx, 80, bannerY, W - 160, 58, 20);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = theme.textPrimary;
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(caption || "🔥 100% Focused on Nutrition Goals", W / 2, bannerY + 29);
  ctx.restore();

  // 4. Content by Type
  if (type === "meal") {
    await renderMealCardContent(ctx, W, H, isStory, theme, data);
  } else if (type === "audit") {
    await renderAuditCardContent(ctx, W, H, isStory, theme, data);
  } else {
    await renderDailyCardContent(ctx, W, H, isStory, theme, data);
  }

  // 5. Footer Watermark
  const footerY = H - (isStory ? 100 : 65);
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, footerY - 25);
  ctx.lineTo(W - 80, footerY - 25);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.accentLight;
  ctx.fillText("nutriscan.ai", W / 2, footerY);

  ctx.font = "400 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.textSecondary;
  ctx.fillText("Snap or scan your food before eating to inspect calories, protein & diet fit", W / 2, footerY + 24);
  ctx.restore();
}

/**
 * Meal Scan / Plate Card Content
 */
async function renderMealCardContent(ctx, W, H, isStory, theme, data) {
  const contentY = isStory ? 290 : 250;
  const cardW = W - 160;
  const cardH = isStory ? 1340 : 680;

  // Main Card Container
  ctx.save();
  roundRect(ctx, 80, contentY, cardW, cardH, 32);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Photo / Visual Box
  const photoH = isStory ? 540 : 240;
  const photoY = contentY + 30;
  const photoX = 110;
  const photoW = cardW - 60;

  const img = await tryLoadImage(data.image_url);
  ctx.save();
  roundRect(ctx, photoX, photoY, photoW, photoH, 24);
  ctx.clip();

  if (img) {
    // Cover image inside box
    const imgRatio = img.width / img.height;
    const boxRatio = photoW / photoH;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > boxRatio) {
      sw = img.height * boxRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / boxRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
  } else {
    // Fallback stylish food art background
    const plateGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    plateGrad.addColorStop(0, "#065f46");
    plateGrad.addColorStop(1, "#022c22");
    ctx.fillStyle = plateGrad;
    ctx.fillRect(photoX, photoY, photoW, photoH);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "80px sans-serif";
    ctx.fillText("🍽️", photoX + photoW / 2, photoY + photoH / 2 - 20);

    ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Fresh Pre-Meal Check", photoX + photoW / 2, photoY + photoH / 2 + 50);
  }
  ctx.restore();

  // Meal Slot Tag over photo
  if (data.slot) {
    ctx.save();
    roundRect(ctx, photoX + 20, photoY + 20, 160, 44, 14);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.slot, photoX + 100, photoY + 42);
    ctx.restore();
  }

  // Dish Title & Portion
  let textY = photoY + photoH + 45;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "900 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  const title = (data.title || "Balanced Nutrition Plate").slice(0, 36);
  ctx.fillText(title, W / 2, textY);

  if (data.total_grams) {
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(`${data.total_grams}g Total Portion Weight`, W / 2, textY + 32);
  }
  ctx.restore();

  // Big Calorie Number & Stat Ring
  const calY = textY + (isStory ? 100 : 65);
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "900 86px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.accentLight;
  ctx.fillText(`${data.kcal || 0}`, W / 2, calY);

  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.textSecondary;
  ctx.fillText("CALORIES", W / 2, calY + 38);
  ctx.restore();

  // 4 Macro Badges (Protein, Carbs, Fat, Fiber)
  const macroY = calY + (isStory ? 95 : 70);
  const macroW = (cardW - 90) / 4;
  const macroH = isStory ? 130 : 95;

  const macros = [
    { label: "PROTEIN", val: `${data.protein ?? 0}g`, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
    { label: "CARBS", val: `${data.carbs ?? 0}g`, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" },
    { label: "FAT", val: `${data.fat ?? 0}g`, color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)" },
    { label: "FIBER", val: `${data.fiber ?? 0}g`, color: "#34d399", bg: "rgba(52, 211, 153, 0.15)" },
  ];

  macros.forEach((m, idx) => {
    const mx = 110 + idx * (macroW + 10);
    ctx.save();
    roundRect(ctx, mx, macroY, macroW, macroH, 18);
    ctx.fillStyle = m.bg;
    ctx.fill();
    ctx.strokeStyle = m.color + "55";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = m.color;
    ctx.fillText(m.label, mx + macroW / 2, macroY + (isStory ? 38 : 30));

    ctx.font = "900 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(m.val, mx + macroW / 2, macroY + (isStory ? 82 : 68));
    ctx.restore();
  });

  // Story Extra: Diet Compatibility / Verdict Card
  if (isStory && data.verdict) {
    const verdictY = macroY + macroH + 40;
    ctx.save();
    roundRect(ctx, 110, verdictY, cardW - 60, 150, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.accentLight;
    ctx.fillText("✨ AI NUTRITIONIST INSIGHT", W / 2, verdictY + 38);

    ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    const vText = data.verdict.slice(0, 90) + (data.verdict.length > 90 ? "…" : "");
    ctx.fillText(vText, W / 2, verdictY + 80);
    ctx.restore();
  }
}

/**
 * Supermarket Packaged Food & Barcode Health Audit Card Content
 */
async function renderAuditCardContent(ctx, W, H, isStory, theme, data) {
  const contentY = isStory ? 290 : 250;
  const cardW = W - 160;
  const cardH = isStory ? 1340 : 680;

  // Main Card Container
  ctx.save();
  roundRect(ctx, 80, contentY, cardW, cardH, 32);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Top Product Header
  const headerY = contentY + 35;
  ctx.save();
  ctx.textAlign = "center";

  if (data.brand) {
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(data.brand.toUpperCase(), W / 2, headerY);
  }

  ctx.font = "900 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  const pName = (data.product_name || "Packaged Food").slice(0, 34);
  ctx.fillText(pName, W / 2, headerY + 42);

  ctx.font = "500 18px monospace";
  ctx.fillStyle = theme.textSecondary;
  ctx.fillText(`Barcode: ${data.barcode || "N/A"}`, W / 2, headerY + 76);
  ctx.restore();

  // NutriScore Big Letter Badge
  const gradeColors = {
    A: "#10b981",
    B: "#84cc16",
    C: "#f59e0b",
    D: "#f97316",
    E: "#ef4444",
  };
  const grade = (data.nutriscore_grade || "C").toUpperCase();
  const gColor = gradeColors[grade] || "#f59e0b";

  const badgeY = headerY + 115;
  const badgeSize = isStory ? 210 : 130;

  ctx.save();
  roundRect(ctx, W / 2 - badgeSize / 2, badgeY, badgeSize, badgeSize, 36);
  ctx.fillStyle = gColor;
  ctx.fill();
  ctx.shadowColor = gColor;
  ctx.shadowBlur = 40;

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${isStory ? "110px" : "72px"} -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillText(grade, W / 2, badgeY + badgeSize / 2 - (isStory ? 10 : 6));

  ctx.font = `bold ${isStory ? "20px" : "14px"} -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillText("NUTRISCORE", W / 2, badgeY + badgeSize - (isStory ? 26 : 18));
  ctx.restore();

  // Health Score & NOVA Group Badges
  const statsY = badgeY + badgeSize + 40;
  ctx.save();
  // Health Score pill
  roundRect(ctx, W / 2 - 240, statsY, 220, 60, 18);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fill();
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${data.health_score || 0}/100`, W / 2 - 130, statsY + 38);

  // NOVA Group pill
  roundRect(ctx, W / 2 + 20, statsY, 220, 60, 18);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fill();
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`NOVA ${data.nova_group || 4} UPF`, W / 2 + 130, statsY + 38);
  ctx.restore();

  // Nutrition Macros Line
  const nutri = data.nutriments || {};
  const macroY = statsY + 85;
  const macroW = (cardW - 80) / 4;
  const macroH = isStory ? 110 : 80;

  const mList = [
    { label: "CALORIES", val: `${Math.round(nutri.kcal_100g || 0)} kcal` },
    { label: "SUGAR", val: `${nutri.sugars_100g || 0}g` },
    { label: "PROTEIN", val: `${nutri.protein_100g || 0}g` },
    { label: "FAT", val: `${nutri.fat_100g || 0}g` },
  ];

  mList.forEach((m, idx) => {
    const mx = 100 + idx * (macroW + 8);
    ctx.save();
    roundRect(ctx, mx, macroY, macroW, macroH, 16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(m.label, mx + macroW / 2, macroY + (isStory ? 34 : 26));

    ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(m.val, mx + macroW / 2, macroY + (isStory ? 74 : 58));
    ctx.restore();
  });

  // Red Flags / Watchouts Box
  if (isStory) {
    const flagY = macroY + macroH + 35;
    ctx.save();
    roundRect(ctx, 110, flagY, cardW - 60, 210, 24);
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.stroke();

    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#fca5a5";
    ctx.textAlign = "left";
    ctx.fillText("🚨 RED FLAGS & INDUSTRIAL ADDITIVES", 140, flagY + 40);

    const flags = data.red_flags?.slice(0, 3) || ["No major red flags detected."];
    flags.forEach((rf, i) => {
      ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`• ${rf.slice(0, 58)}`, 140, flagY + 80 + i * 36);
    });
    ctx.restore();

    // Healthier Swap
    if (data.healthy_swaps?.[0]) {
      const swapY = flagY + 235;
      ctx.save();
      roundRect(ctx, 110, swapY, cardW - 60, 115, 20);
      ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
      ctx.stroke();

      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#6ee7b7";
      ctx.fillText("💡 RECOMMENDED CLEAN ALTERNATIVE", 140, swapY + 36);

      ctx.font = "bold 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(data.healthy_swaps[0].slice(0, 60), 140, swapY + 76);
      ctx.restore();
    }
  }
}

/**
 * Daily Accomplishment / Progress Card Content
 */
async function renderDailyCardContent(ctx, W, H, isStory, theme, data) {
  const contentY = isStory ? 290 : 250;
  const cardW = W - 160;
  const cardH = isStory ? 1340 : 680;

  // Main Card Container
  ctx.save();
  roundRect(ctx, 80, contentY, cardW, cardH, 32);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Daily Title & Trophy
  const headerY = contentY + 45;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "70px sans-serif";
  ctx.fillText("🏆", W / 2, headerY + 40);

  ctx.font = "900 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Daily Nutrition Accomplishment", W / 2, headerY + 120);

  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.accentLight;
  ctx.fillText("TARGETS HIT & LOGGED TODAY", W / 2, headerY + 158);
  ctx.restore();

  // Big Calorie Budget Section
  const calY = headerY + 220;
  ctx.save();
  roundRect(ctx, 110, calY, cardW - 60, isStory ? 220 : 150, 24);
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fill();

  ctx.textAlign = "center";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.textSecondary;
  ctx.fillText("DAILY CALORIES CONSUMED", W / 2, calY + 45);

  ctx.font = `900 ${isStory ? "78px" : "60px"} -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  const consumedKcal = data.consumedKcal || 0;
  const targetKcal = data.targetKcal || 2000;
  ctx.fillText(`${consumedKcal} / ${targetKcal} kcal`, W / 2, calY + (isStory ? 128 : 108));

  if (isStory) {
    const pct = Math.min(100, Math.round((consumedKcal / (targetKcal || 1)) * 100));
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.accentLight;
    ctx.fillText(`⚡ ${pct}% of Daily Energy Budget`, W / 2, calY + 180);
  }
  ctx.restore();

  // 3 Key Stats Badges (Protein, Water, Meals)
  const statsY = calY + (isStory ? 255 : 180);
  const statW = (cardW - 80) / 3;
  const statH = isStory ? 160 : 110;

  const items = [
    {
      icon: "💪",
      title: "PROTEIN",
      val: `${data.consumedProtein || 0}g / ${data.targetProtein || 120}g`,
      sub: "Muscle Fuel",
      color: "#38bdf8",
    },
    {
      icon: "💧",
      title: "WATER",
      val: `${data.glasses || 0} Glasses`,
      sub: `${((data.glasses || 0) * 0.25).toFixed(1)}L Hydration`,
      color: "#67e8f9",
    },
    {
      icon: "🥗",
      title: "MEALS",
      val: `${data.mealsCount || 0} Logged`,
      sub: "Pre-Meal Inspected",
      color: "#4ade80",
    },
  ];

  items.forEach((item, idx) => {
    const ix = 100 + idx * (statW + 10);
    ctx.save();
    roundRect(ctx, ix, statsY, statW, statH, 20);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = item.color + "55";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "30px sans-serif";
    ctx.fillText(item.icon, ix + statW / 2, statsY + (isStory ? 45 : 35));

    ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(item.val, ix + statW / 2, statsY + (isStory ? 92 : 72));

    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = item.color;
    ctx.fillText(item.sub, ix + statW / 2, statsY + (isStory ? 128 : 96));
    ctx.restore();
  });

  // Story Motivational Banner
  if (isStory) {
    const quoteY = statsY + statH + 45;
    ctx.save();
    roundRect(ctx, 110, quoteY, cardW - 60, 160, 24);
    ctx.fillStyle = theme.badgeBg;
    ctx.fill();
    ctx.strokeStyle = theme.badgeBorder;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = theme.accentLight;
    ctx.fillText("🌟 NUTRITION STREAK ACTIVE", W / 2, quoteY + 50);

    ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Consistency is your greatest superpower.", W / 2, quoteY + 95);
    ctx.fillText("Every meal tracked brings you closer to your fitness goals.", W / 2, quoteY + 128);
    ctx.restore();
  }
}
