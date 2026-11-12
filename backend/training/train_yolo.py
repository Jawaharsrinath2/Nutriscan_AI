"""Optional: fine-tune YOLO for local detection (DETECTOR=yolo).

Needs `pip install -r requirements-ml.txt` and a labelled dataset described by dataset.yaml.
Run from the backend folder:
  python training/train_yolo.py --data training/dataset.yaml --epochs 100
Then copy the printed best.pt to models/food_yolo.pt.
"""

import argparse

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default="training/dataset.yaml")
    parser.add_argument("--base", default="yolo11n.pt", help="pretrained checkpoint to start from")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()

    model = YOLO(args.base)
    model.train(data=args.data, epochs=args.epochs, imgsz=args.imgsz, project="training/runs", name="food")
    print(f"Best weights: {model.trainer.best}")


if __name__ == "__main__":
    main()
