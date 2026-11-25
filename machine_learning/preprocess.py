"""OpenCV image preprocessing utilities for the optional TensorFlow/Keras CNN pipeline."""

import cv2
import numpy as np

TARGET_SIZE = (224, 224)


def preprocess_leaf_image(image_path: str) -> np.ndarray:
    """Load an RGB leaf image, validate readability, resize to 224x224, and normalize."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(img_rgb, TARGET_SIZE, interpolation=cv2.INTER_AREA)
    normalized = resized.astype(np.float32) / 255.0
    return np.expand_dims(normalized, axis=0)


def assess_blur_laplacian(image_path: str, threshold: float = 45.0) -> tuple[bool, float]:
    """Return (is_sharp, variance) using Laplacian variance to flag blurry leaf photos."""
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return False, 0.0
    variance = float(cv2.Laplacian(img, cv2.CV_64F).var())
    return variance >= threshold, variance
