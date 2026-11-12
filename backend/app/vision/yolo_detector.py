"""Local detection with an Ultralytics YOLO model.

Stock COCO weights only know ~10 generic foods (banana, broccoli, pizza...). For idli, dosa,
sambar etc. train custom weights with backend/training/train_yolo.py and point YOLO_WEIGHTS at them.
"""

from pathlib import Path

from PIL import Image

from app.vision.base import Detection, DetectionResult, Detector, DetectorError


class YoloDetector(Detector):
    name = "yolo"
    scores_are_calibrated = True

    def __init__(self, weights: Path, min_score: float):
        # ultralytics pulls in torch (~2 GB), so it is an optional install (requirements-ml.txt).
        from ultralytics import YOLO

        self._model = YOLO(str(weights))
        self._min_score = min_score

    def detect(self, image: Image.Image) -> DetectionResult:
        try:
            result = self._model.predict(image, conf=self._min_score, verbose=False)[0]
        except Exception as exc:  # torch/runtime errors surface as a failed scan, not a 500
            raise DetectorError(f"YOLO inference failed: {str(exc)[:200]}") from exc

        width, height = image.size
        detections = []
        for box in result.boxes:
            x0, y0, x1, y1 = box.xyxy[0].tolist()
            detections.append(
                Detection(
                    label=result.names[int(box.cls)],
                    box=(x0 / width, y0 / height, x1 / width, y1 / height),
                    score=float(box.conf),
                )
            )
        return DetectionResult(detections=detections, is_food=bool(detections))
