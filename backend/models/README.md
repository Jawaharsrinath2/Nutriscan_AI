# Model weights

Only needed when `DETECTOR=yolo` in `backend/.env`. Weight files are not committed.

Put your trained weights here as `food_yolo.pt` (or set `YOLO_WEIGHTS` to another path).

- **Custom weights (recommended):** train with `backend/training/train_yolo.py` on a labelled
  Indian-food detection dataset. Name the classes after ingredient keys in
  `app/data/ingredients.json` (e.g. `steamed_idli`, `vegetable_sambar`) and they map directly.
- **Stock COCO weights (demo only):** `yolo11n.pt` from Ultralytics works, but COCO only knows ~10
  foods (banana, broccoli, sandwich, ...). It will not recognise idli, dosa, sambar, etc.
