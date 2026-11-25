"""Transfer-learning training script using MobileNetV2 for PlantVillage-style datasets."""

import argparse
import json
from pathlib import Path
import tensorflow as tf


def build_model(num_classes: int) -> tf.keras.Model:
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs * 255.0)
    x = base_model(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def train(dataset_dir: str, output_dir: str, epochs: int = 10, batch_size: int = 32) -> None:
    train_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=0.2,
        subset="training",
        seed=42,
        image_size=(224, 224),
        batch_size=batch_size,
        label_mode="categorical",
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=(224, 224),
        batch_size=batch_size,
        label_mode="categorical",
    )

    class_names = train_ds.class_names
    model = build_model(len(class_names))
    model.fit(train_ds, validation_data=val_ds, epochs=epochs)

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    model.save(out_path / "agrocare_mobilenetv2.keras")
    (out_path / "class_names.json").write_text(json.dumps(class_names, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_dir", required=True, help="Path to labeled crop leaf image folders")
    parser.add_argument("--output_dir", default="machine_learning/trained_model")
    parser.add_argument("--epochs", type=int, default=10)
    args = parser.parse_args()
    train(args.dataset_dir, args.output_dir, epochs=args.epochs)
