"""Local TensorFlow inference helper for trained MobileNetV2 checkpoints."""

import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from preprocess import assess_blur_laplacian, preprocess_leaf_image


def predict_leaf_disease(image_path: str, model_dir: str = "machine_learning/trained_model") -> dict:
    model_file = Path(model_dir) / "agrocare_mobilenetv2.keras"
    labels_file = Path(model_dir) / "class_names.json"

    if not model_file.exists() or not labels_file.exists():
        raise FileNotFoundError(
            "Trained MobileNetV2 weights not found. Train with machine_learning/train.py or use the live Gemini Vision server endpoint."
        )

    is_sharp, blur_score = assess_blur_laplacian(image_path)
    tensor = preprocess_leaf_image(image_path)
    model = tf.keras.models.load_model(model_file)
    class_names = json.loads(labels_file.read_text())

    probs = model.predict(tensor, verbose=0)[0]
    top_indices = np.argsort(probs)[::-1][:3]

    return {
        "is_sharp": is_sharp,
        "blur_variance": round(blur_score, 2),
        "primary_prediction": class_names[int(top_indices[0])],
        "confidence": round(float(probs[top_indices[0]]) * 100, 2),
        "alternatives": [
            {"label": class_names[int(i)], "confidence": round(float(probs[i]) * 100, 2)}
            for i in top_indices[1:]
        ],
    }
