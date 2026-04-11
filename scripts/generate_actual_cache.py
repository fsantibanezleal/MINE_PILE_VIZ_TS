from __future__ import annotations

import json
import math
import os
import shutil
import sys
import importlib.util
from pathlib import Path
from typing import Any

try:
    import joblib
    import numpy as np
    import pandas as pd
    import pyarrow as pa
    import pyarrow.ipc as ipc
    import yaml
except ModuleNotFoundError as error:
    missing = getattr(error, "name", "unknown module")
    raise SystemExit(
        "Missing Python dependency for the app-ready cache exporter: "
        f"{missing}. Install the tracked exporter dependencies with "
        "`python -m pip install -r scripts/generate_actual_cache.requirements.txt` "
        "or point PYTHON_BIN to an environment where those dependencies already exist."
    ) from error

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = Path(os.environ.get("RAW_DATA_ROOT", str(PROJECT_ROOT / "data")))
APP_ROOT = Path(os.environ.get("APP_CACHE_ROOT", str(PROJECT_ROOT / ".local" / "app-data" / "v1")))
PILE_HISTORY_STRIDE = 12


def detect_reference_root() -> Path | None:
    configured = os.environ.get("REFERENCE_ROOT")
    candidates: list[Path] = []

    if configured:
        candidates.append(Path(configured))

    candidates.append(
        PROJECT_ROOT.parent.parent / "_COD" / "Data_Platform" / "DGM" / "dgm_tracking_ds" / "databricks"
    )

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


REFERENCE_ROOT = detect_reference_root()

if REFERENCE_ROOT is not None:
    sys.path.insert(0, str(REFERENCE_ROOT))


def write_json(target: Path, payload: Any) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_arrow(target: Path, rows: list[dict[str, Any]], columns: list[str]) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    data = {column: [] for column in columns}

    for row in rows:
        for column in columns:
            data[column].append(row.get(column))

    table = pa.table(data)
    with ipc.new_file(target, table.schema) as writer:
        writer.write(table)


def iso_from_ms(value: float | int) -> str:
    return pd.to_datetime(float(value), unit="ms", utc=True).isoformat()


def snapshot_id_from_timestamp(value: pd.Timestamp | str) -> str:
    timestamp = pd.Timestamp(value)
    return timestamp.strftime("%Y%m%d%H%M%S")


def load_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def normalize_anchor_value(value: Any) -> tuple[float, str]:
    if isinstance(value, (int, float)):
        return float(value), ""
    return 0.5, " (dynamic)"


def get_reported_dimension(report_root: Path, object_id: str) -> int | None:
    object_dir = report_root / object_id
    if not object_dir.exists():
        return None

    dim_dirs = [child.name for child in object_dir.iterdir() if child.is_dir()]
    if len(dim_dirs) != 1:
        return None

    dim_name = dim_dirs[0]
    if len(dim_name) >= 2 and dim_name[0].isdigit() and dim_name.endswith("D"):
        return int(dim_name[0])

    return None


def get_pile_dimension_from_conf(pile_conf: dict[str, Any], report_root: Path, object_id: str) -> int:
    reported_dimension = get_reported_dimension(report_root, object_id)
    if reported_dimension is not None:
        return reported_dimension

    model_type = str(pile_conf.get("model", {}).get("type", "")).upper()
    if "3D" in model_type:
        return 3
    if "2D" in model_type:
        return 2
    return 1


def get_configured_xy_extents(pile_conf: dict[str, Any], dimension: int) -> tuple[int, int]:
    params = pile_conf.get("model", {}).get("params", {})
    n_cols_x = int(params.get("n_cols_x", 1) or 1)
    n_cols_y = int(params.get("n_cols_y", 1) or 1)

    if dimension == 1:
        return 1, 1

    if dimension == 2:
        return max(1, n_cols_x), max(1, n_cols_y)

    return max(1, n_cols_x), max(1, n_cols_y)


def get_anchor_span(
    pile_conf: dict[str, Any],
    kind: str,
    dimension: int,
) -> tuple[float, float]:
    params = pile_conf.get("model", {}).get("params", {})

    if kind == "input":
        span_x = params.get("feed_neighborhood_frac_x")
        span_y = params.get("feed_neighborhood_frac_y")
    else:
        span_x = params.get("discharge_neighborhood_frac_x")
        span_y = params.get("discharge_neighborhood_frac_y")

    if not isinstance(span_x, (int, float)) or float(span_x) <= 0:
        if dimension == 1:
            span_x = 0.18
        elif dimension == 2:
            n_cols_x, _ = get_configured_xy_extents(pile_conf, dimension)
            span_x = min(0.22, max(0.1, 2 / max(n_cols_x, 1)))
        else:
            span_x = 0.12

    if not isinstance(span_y, (int, float)) or float(span_y) <= 0:
        if dimension == 3:
            _, n_cols_y = get_configured_xy_extents(pile_conf, dimension)
            span_y = min(0.22, max(0.1, 2 / max(n_cols_y, 1)))
        else:
            span_y = 0.12

    return (
        float(max(0.04, min(1.0, span_x))),
        float(max(0.04, min(1.0, span_y))),
    )


def build_graph_anchor(
    anchor_id: str,
    anchor_conf: dict[str, Any],
    kind: str,
    pile_conf: dict[str, Any],
    dimension: int,
) -> dict[str, Any]:
    x, x_suffix = normalize_anchor_value(anchor_conf.get("col_x", 0.5))
    y, y_suffix = normalize_anchor_value(anchor_conf.get("col_y", 0.5))
    span_x, span_y = get_anchor_span(pile_conf, kind, dimension)
    position_mode = "assumed-center" if x_suffix or y_suffix else "fixed"

    return {
        "id": anchor_id,
        "label": anchor_conf["belt"],
        "kind": kind,
        "x": x,
        "y": y,
        "spanX": span_x,
        "spanY": span_y,
        "positionMode": position_mode,
        "relatedObjectId": anchor_conf["belt"],
    }


def read_app_version() -> str:
    package_json = json.loads((PROJECT_ROOT / "package.json").read_text(encoding="utf-8"))
    return str(package_json["version"])


def build_quality_definitions(qualities_conf: dict[str, Any]) -> list[dict[str, Any]]:
    definitions: list[dict[str, Any]] = []

    for quality_id, quality_conf in qualities_conf["qualities"]["qualities_numerical"].items():
        limits = quality_conf["profiler"]["limits_continuous"]
        definitions.append(
            {
                "id": quality_id,
                "kind": "numerical",
                "label": quality_conf["name"],
                "description": quality_conf["description"],
                "min": float(limits["min"]),
                "max": float(limits["max"]),
                "palette": ["#153a63", "#2b8cff", "#59ddff", "#f4bc63"],
            }
        )

    for quality_id, quality_conf in qualities_conf["qualities"]["qualities_categorical"].items():
        categories = []
        for mapper_conf in quality_conf["mapper"].values():
            categories.append(
                {
                    "value": float(mapper_conf["code"]),
                    "label": mapper_conf["name"],
                    "color": mapper_conf["color"],
                }
            )

        definitions.append(
            {
                "id": quality_id,
                "kind": "categorical",
                "label": quality_conf["name"],
                "description": quality_conf["description"],
                "palette": [category["color"] for category in categories],
                "categories": categories,
            }
        )

    return definitions


def quality_ids_from_definitions(definitions: list[dict[str, Any]]) -> list[str]:
    return [definition["id"] for definition in definitions]


def quality_values_from_block(block: np.ndarray, quality_ids: list[str]) -> dict[str, float | None]:
    return {
        quality_id: float(block[4 + index]) if not math.isnan(float(block[4 + index])) else None
        for index, quality_id in enumerate(quality_ids)
    }


def weighted_quality_average(
    quality_maps: list[dict[str, float | None]],
    masses: list[float],
    quality_id: str,
) -> float | None:
    weighted_sum = 0.0
    total_mass = 0.0

    for quality_map, mass in zip(quality_maps, masses, strict=True):
        value = quality_map.get(quality_id)
        if value is None:
            continue
        weighted_sum += value * mass
        total_mass += mass

    if total_mass <= 0:
        return None

    return weighted_sum / total_mass


def summarize_categorical(series: pd.Series, weights: pd.Series) -> float | None:
    grouped = weights.groupby(series).sum()
    if grouped.empty:
        return None
    return float(grouped.idxmax())


def build_live_summary(
    object_id: str,
    object_type: str,
    display_name: str,
    timestamp_iso: str,
    status: str,
    quality_ids: list[str],
    masses: list[float],
    quality_maps: list[dict[str, float | None]],
) -> dict[str, Any]:
    return {
        "objectId": object_id,
        "objectType": object_type,
        "displayName": display_name,
        "timestamp": timestamp_iso,
        "massTon": float(sum(masses)),
        "status": status,
        "qualityValues": {
            quality_id: weighted_quality_average(quality_maps, masses, quality_id)
            for quality_id in quality_ids
        },
    }


def build_registry(state, objects_conf: dict[str, Any], report_root: Path) -> list[dict[str, Any]]:
    registry: list[dict[str, Any]] = []
    pile_confs = {
        **objects_conf["objects"].get("piles", {}),
        **objects_conf["objects"].get("vpiles", {}),
    }

    for belt_id, belt in state.belts.items():
        registry.append(
            {
                "objectId": belt_id,
                "objectType": "belt",
                "objectRole": "virtual" if belt_id.startswith("v") else "physical",
                "displayName": belt.meta.name,
                "shortDescription": belt.meta.description_short or "Transport object",
                "stageIndex": -1,
                "dimension": 1,
                "isProfiled": bool(report_root.joinpath(belt_id).exists()),
                "liveRef": f"live/belts/{belt_id}.arrow",
                "profilerRef": f"profiler/objects/{belt_id}/manifest.json"
                if report_root.joinpath(belt_id).exists()
                else None,
            }
        )

    for pile_id, pile in state.piles.items():
        pile_conf = pile_confs[pile_id]
        dimension = get_pile_dimension_from_conf(pile_conf, report_root, pile_id)
        registry.append(
            {
                "objectId": pile_id,
                "objectType": "pile",
                "objectRole": "virtual" if pile_id.startswith("v") else "physical",
                "displayName": pile.meta.name,
                "shortDescription": pile.meta.description_short or "Accumulation object",
                "stageIndex": -1,
                "dimension": dimension,
                "isProfiled": bool(report_root.joinpath(pile_id).exists()),
                "livePileRef": f"live/piles/{pile_id}/meta.json",
                "profilerRef": f"profiler/objects/{pile_id}/manifest.json"
                if report_root.joinpath(pile_id).exists()
                else None,
            }
        )

    sequence = json.loads((RAW_ROOT / "05_model_input" / "sequence.json").read_text(encoding="utf-8"))
    stage_lookup: dict[str, int] = {}
    for index, stage in enumerate(sequence["stages"]):
        for belt_id in stage["belts"]:
            stage_lookup[belt_id] = index
        for pile_id in stage["piles"]:
            stage_lookup[pile_id] = index

    for entry in registry:
        entry["stageIndex"] = stage_lookup.get(entry["objectId"], 0)

    return registry


def build_circuit_graph(registry: list[dict[str, Any]], objects_conf: dict[str, Any]) -> dict[str, Any]:
    registry_map = {entry["objectId"]: entry for entry in registry}
    nodes = []
    edges = []

    for entry in registry:
        inputs = []
        outputs = []
        if entry["objectType"] == "pile":
            pile_conf = (
                objects_conf["objects"]["piles"].get(entry["objectId"])
                or objects_conf["objects"]["vpiles"].get(entry["objectId"])
            )
            for anchor_id, anchor_conf in (pile_conf.get("inputs") or {}).items():
                belt_id = anchor_conf["belt"]
                inputs.append(
                    build_graph_anchor(
                        anchor_id,
                        anchor_conf,
                        "input",
                        pile_conf,
                        entry["dimension"],
                    )
                )
                if belt_id in registry_map:
                    edges.append(
                        {
                            "id": f"{belt_id}->{entry['objectId']}",
                            "source": belt_id,
                            "target": entry["objectId"],
                            "label": "feed",
                        }
                    )
            for anchor_id, anchor_conf in (pile_conf.get("outputs") or {}).items():
                belt_id = anchor_conf["belt"]
                outputs.append(
                    build_graph_anchor(
                        anchor_id,
                        anchor_conf,
                        "output",
                        pile_conf,
                        entry["dimension"],
                    )
                )
                if belt_id in registry_map:
                    edges.append(
                        {
                            "id": f"{entry['objectId']}->{belt_id}",
                            "source": entry["objectId"],
                            "target": belt_id,
                            "label": "discharge",
                        }
                    )

        nodes.append(
            {
                "id": entry["objectId"],
                "objectId": entry["objectId"],
                "objectType": entry["objectType"],
                "objectRole": entry["objectRole"],
                "label": entry["displayName"],
                "stageIndex": entry["stageIndex"],
                "dimension": entry["dimension"],
                "isProfiled": entry["isProfiled"],
                "shortDescription": entry["shortDescription"],
                "inputs": inputs,
                "outputs": outputs,
            }
        )

    stages = []
    for stage_index in sorted({entry["stageIndex"] for entry in registry}):
        stages.append(
            {
                "index": stage_index,
                "label": f"Stage {stage_index + 1}",
                "nodeIds": [
                    entry["objectId"]
                    for entry in registry
                    if entry["stageIndex"] == stage_index
                ],
            }
        )

    deduped_edges = {edge["id"]: edge for edge in edges}
    return {"stages": stages, "nodes": nodes, "edges": list(deduped_edges.values())}


def build_belt_records(belt, quality_ids: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, float | None]], list[float]]:
    records = []
    quality_maps = []
    masses = []
    used_rows = belt.mto_current[belt.mto_current[:, 0] > 0]

    for index, row in enumerate(used_rows):
        quality_values = quality_values_from_block(row, quality_ids)
        mass = float(row[1])
        records.append(
            {
                "position": index,
                "massTon": mass,
                "timestampOldestMs": float(row[2]),
                "timestampNewestMs": float(row[3]),
                **quality_values,
            }
        )
        quality_maps.append(quality_values)
        masses.append(mass)

    return records, quality_maps, masses


def build_pile_cell_records(pile, quality_ids: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, float | None]], list[float]]:
    internal = pile.internal_pile
    used = internal[:, 0, :, :] > 0
    indices = np.argwhere(used)
    records = []
    quality_maps = []
    masses = []

    for z, x, y in indices:
        feature_vector = internal[z, :, x, y]
        quality_values = quality_values_from_block(feature_vector, quality_ids)
        mass = float(feature_vector[1])
        records.append(
            {
                "ix": int(x),
                "iy": int(y),
                "iz": int(z),
                "massTon": mass,
                "timestampOldestMs": float(feature_vector[2]),
                "timestampNewestMs": float(feature_vector[3]),
                **quality_values,
            }
        )
        quality_maps.append(quality_values)
        masses.append(mass)

    return records, quality_maps, masses


def build_surface_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    top_map: dict[tuple[int, int], dict[str, Any]] = {}
    for record in records:
        key = (record["ix"], record["iy"])
        current = top_map.get(key)
        if current is None or current["iz"] < record["iz"]:
            top_map[key] = record
    return list(top_map.values())


def build_stockpile_metadata(
    pile_id: str,
    pile,
    pile_conf: dict[str, Any],
    records: list[dict[str, Any]],
    quality_maps: list[dict[str, float | None]],
    masses: list[float],
    quality_ids: list[str],
    registry_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    dimension = registry_map[pile_id]["dimension"]
    configured_x, configured_y = get_configured_xy_extents(pile_conf, dimension)
    extents_x = max(configured_x, max((record["ix"] for record in records), default=-1) + 1)
    extents_y = max(configured_y, max((record["iy"] for record in records), default=-1) + 1)
    extents_z = max((record["iz"] for record in records), default=0) + 1

    inputs = []
    outputs = []
    for anchor_id, anchor_conf in (pile_conf.get("inputs") or {}).items():
        inputs.append(build_graph_anchor(anchor_id, anchor_conf, "input", pile_conf, dimension))
    for anchor_id, anchor_conf in (pile_conf.get("outputs") or {}).items():
        outputs.append(build_graph_anchor(anchor_id, anchor_conf, "output", pile_conf, dimension))

    return {
        "objectId": pile_id,
        "displayName": registry_map[pile_id]["displayName"],
        "objectRole": registry_map[pile_id]["objectRole"],
        "timestamp": iso_from_ms(pile.timestamp_current_ms),
        "dimension": dimension,
        "extents": {"x": extents_x or 1, "y": extents_y or 1, "z": extents_z or 1},
        "occupiedCellCount": len(records),
        "surfaceCellCount": len(build_surface_records(records)),
        "defaultQualityId": quality_ids[0],
        "availableQualityIds": quality_ids,
        "viewModes": ["surface", "shell", "full", "slice"] if dimension == 3 else ["full"],
        "suggestedFullStride": 2 if len(records) > 150_000 else 1,
        "fullModeThreshold": 150_000,
        "qualityAverages": {
            quality_id: weighted_quality_average(quality_maps, masses, quality_id)
            for quality_id in quality_ids
        },
        "inputs": inputs,
        "outputs": outputs,
        "files": {
            "cells": f"live/piles/{pile_id}/cells.arrow",
            "surface": f"live/piles/{pile_id}/surface.arrow",
            "shell": f"live/piles/{pile_id}/shell.arrow",
        },
    }


def pick_profile_files(object_id: str, dim_folder: Path) -> list[Path]:
    latest = dim_folder / "profile_latest.parquet"
    history = sorted((dim_folder / "history").glob("profile_*.parquet"))
    if object_id == "pile_stockpile":
        history = history[::PILE_HISTORY_STRIDE]

    candidates = history.copy()
    if latest.exists():
        candidates.append(latest)

    deduped: dict[str, Path] = {}
    for candidate in candidates:
        if candidate.name == "profile_latest.parquet":
            timestamp = pd.read_parquet(candidate, columns=["timestamp"]).iloc[0, 0]
            deduped[snapshot_id_from_timestamp(timestamp)] = candidate
            continue
        deduped[candidate.stem.replace("profile_", "")] = candidate

    return [deduped[key] for key in sorted(deduped)]


def summarize_profile_dataframe(
    df: pd.DataFrame,
    object_id: str,
    object_type: str,
    display_name: str,
    dimension: int,
    numerical_ids: list[str],
    categorical_ids: list[str],
) -> dict[str, Any]:
    mass = float(df["mass_ton"].sum()) if "mass_ton" in df.columns else 0.0
    timestamp = pd.Timestamp(df["timestamp"].iloc[0]).isoformat()
    weights = df["mass_ton"] if "mass_ton" in df.columns else pd.Series([1.0] * len(df))
    weights_sum = float(weights.sum()) if len(weights) > 0 else 0.0
    summary = {
        "snapshotId": snapshot_id_from_timestamp(timestamp),
        "timestamp": timestamp,
        "objectId": object_id,
        "objectType": object_type,
        "displayName": display_name,
        "dimension": dimension,
        "massTon": mass,
    }

    for quality_id in numerical_ids:
        if quality_id in df.columns:
            series = pd.to_numeric(df[quality_id], errors="coerce").dropna()
            if series.empty:
                summary[quality_id] = None
            elif weights_sum > 0 and len(series) == len(df[quality_id]):
                summary[quality_id] = float(np.average(df[quality_id], weights=weights))
            else:
                summary[quality_id] = float(series.mean())
    for quality_id in categorical_ids:
        if quality_id in df.columns:
            summary[quality_id] = (
                summarize_categorical(df[quality_id], weights)
                if weights_sum > 0
                else (df[quality_id].dropna().iloc[0] if df[quality_id].dropna().shape[0] > 0 else None)
            )

    return summary


def profile_rows_from_dataframe(df: pd.DataFrame, quality_ids: list[str], dimension: int) -> list[dict[str, Any]]:
    rows = []
    for _, record in df.iterrows():
        row = {
            "timestamp": pd.Timestamp(record["timestamp"]).isoformat(),
            "ix": int(record["ix"]) if "ix" in record else 0,
            "iy": int(record["iy"]) if "iy" in record else 0,
            "iz": int(record["z"]) if "z" in record else int(record.get("iz", 0)),
            "massTon": float(record["mass_ton"]),
            "timestampOldestMs": float(record["timestamp_oldest_ms"]),
            "timestampNewestMs": float(record["timestamp_newest_ms"]),
        }
        for quality_id in quality_ids:
            if quality_id in df.columns:
                row[quality_id] = float(record[quality_id]) if pd.notna(record[quality_id]) else None
        rows.append(row)
    return rows


def ensure_required_paths() -> None:
    if not RAW_ROOT.exists():
        raise FileNotFoundError(
            f"Configured RAW_DATA_ROOT does not exist: {RAW_ROOT}. Set RAW_DATA_ROOT or place the dataset under {PROJECT_ROOT / 'data'}."
        )

    required = [
        RAW_ROOT / "conf" / "qualities.yml",
        RAW_ROOT / "conf" / "mto_objects.yml",
        RAW_ROOT / "05_model_input" / "sequence.json",
        RAW_ROOT / "06_models" / "mt_state.joblib",
        RAW_ROOT / "08_reporting",
    ]

    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "The raw dataset is missing required files/directories:\n- " + "\n- ".join(missing)
        )


def ensure_reference_modules() -> None:
    if importlib.util.find_spec("mineral_tracking") is not None:
        return

    fallback_hint = PROJECT_ROOT.parent.parent / "_COD" / "Data_Platform" / "DGM" / "dgm_tracking_ds" / "databricks"
    configured_hint = os.environ.get("REFERENCE_ROOT")

    details = [
        "The cache exporter needs the reference `mineral_tracking` module to unpickle the raw model state.",
        f"Tried REFERENCE_ROOT={configured_hint or '<unset>'}.",
    ]

    configured_path = Path(configured_hint) if configured_hint else None
    if configured_path != fallback_hint:
        details.append(f"Expected local fallback path if available: {fallback_hint}")

    details.append(
        "Set REFERENCE_ROOT to the databricks source tree that contains the `mineral_tracking` package."
    )

    raise SystemExit("\n".join(details))


def main() -> None:
    ensure_required_paths()
    ensure_reference_modules()

    if APP_ROOT.exists():
        shutil.rmtree(APP_ROOT)
    APP_ROOT.mkdir(parents=True, exist_ok=True)

    qualities_conf = load_yaml(RAW_ROOT / "conf" / "qualities.yml")
    objects_conf = load_yaml(RAW_ROOT / "conf" / "mto_objects.yml")
    quality_definitions = build_quality_definitions(qualities_conf)
    quality_ids = quality_ids_from_definitions(quality_definitions)
    numerical_ids = [
        definition["id"] for definition in quality_definitions if definition["kind"] == "numerical"
    ]
    categorical_ids = [
        definition["id"] for definition in quality_definitions if definition["kind"] == "categorical"
    ]

    state = joblib.load(RAW_ROOT / "06_models" / "mt_state.joblib")
    report_root = RAW_ROOT / "08_reporting"
    registry = build_registry(state, objects_conf, report_root)
    registry_map = {entry["objectId"]: entry for entry in registry}
    circuit = build_circuit_graph(registry, objects_conf)

    live_summaries = []
    belt_columns = [
        "position",
        "massTon",
        "timestampOldestMs",
        "timestampNewestMs",
        *quality_ids,
    ]
    cell_columns = [
        "ix",
        "iy",
        "iz",
        "massTon",
        "timestampOldestMs",
        "timestampNewestMs",
        *quality_ids,
    ]

    for belt_id, belt in state.belts.items():
        records, quality_maps, masses = build_belt_records(belt, quality_ids)
        write_arrow(APP_ROOT / "live" / "belts" / f"{belt_id}.arrow", records, belt_columns)
        live_summaries.append(
            build_live_summary(
                belt_id,
                "belt",
                registry_map[belt_id]["displayName"],
                iso_from_ms(belt.timestamp_current_ms),
                belt.status,
                quality_ids,
                masses,
                quality_maps,
            )
        )

    pile_confs = {
        **objects_conf["objects"].get("piles", {}),
        **objects_conf["objects"].get("vpiles", {}),
    }

    for pile_id, pile in state.piles.items():
        records, quality_maps, masses = build_pile_cell_records(pile, quality_ids)
        surface_records = build_surface_records(records)
        meta = build_stockpile_metadata(
            pile_id,
            pile,
            pile_confs[pile_id],
            records,
            quality_maps,
            masses,
            quality_ids,
            registry_map,
        )
        write_json(APP_ROOT / "live" / "piles" / pile_id / "meta.json", meta)
        write_arrow(APP_ROOT / "live" / "piles" / pile_id / "cells.arrow", records, cell_columns)
        write_arrow(APP_ROOT / "live" / "piles" / pile_id / "surface.arrow", surface_records, cell_columns)
        write_arrow(APP_ROOT / "live" / "piles" / pile_id / "shell.arrow", surface_records, cell_columns)
        live_summaries.append(
            build_live_summary(
                pile_id,
                "pile",
                registry_map[pile_id]["displayName"],
                iso_from_ms(pile.timestamp_current_ms),
                "Updated",
                quality_ids,
                masses,
                quality_maps,
            )
        )

    profiler_index_objects = []
    profiler_summary_rows = []

    for entry in registry:
        object_id = entry["objectId"]
        object_dir = report_root / object_id
        if not object_dir.exists():
            continue

        dim_dirs = [child for child in object_dir.iterdir() if child.is_dir()]
        if not dim_dirs:
            continue

        dim_dir = dim_dirs[0]
        files = pick_profile_files(object_id, dim_dir)
        if not files:
            continue

        manifest_snapshot_ids = []
        for file_path in files:
            frame = pd.read_parquet(file_path)
            summary = summarize_profile_dataframe(
                frame,
                object_id,
                entry["objectType"],
                entry["displayName"],
                entry["dimension"],
                numerical_ids,
                categorical_ids,
            )
            snapshot_id = summary["snapshotId"]
            manifest_snapshot_ids.append(snapshot_id)
            profiler_summary_rows.append(summary)
            rows = profile_rows_from_dataframe(frame, quality_ids, entry["dimension"])
            write_arrow(
                APP_ROOT
                / "profiler"
                / "objects"
                / object_id
                / "snapshots"
                / f"{snapshot_id}.arrow",
                rows,
                ["timestamp", *cell_columns],
            )

        profiler_index_objects.append(
            {
                "objectId": object_id,
                "displayName": entry["displayName"],
                "objectType": entry["objectType"],
                "dimension": entry["dimension"],
                "manifestRef": f"profiler/objects/{object_id}/manifest.json",
            }
        )
        write_json(
            APP_ROOT / "profiler" / "objects" / object_id / "manifest.json",
            {
                "objectId": object_id,
                "objectType": entry["objectType"],
                "displayName": entry["displayName"],
                "dimension": entry["dimension"],
                "defaultQualityId": quality_ids[0],
                "availableQualityIds": quality_ids,
                "latestSnapshotId": manifest_snapshot_ids[-1],
                "snapshotIds": manifest_snapshot_ids,
                "snapshotPathTemplate": f"profiler/objects/{object_id}/snapshots/[snapshotId].arrow",
            },
        )

    manifest = {
        "schemaVersion": "1.0.0",
        "appVersion": read_app_version(),
        "datasetLabel": "Local converted dataset",
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "latestTimestamp": iso_from_ms(state.last_processed_ms),
        "paths": {
            "qualities": "qualities.json",
            "registry": "registry.json",
            "circuit": "circuit.json",
            "liveSummaries": "live/object-summaries.json",
            "profilerIndex": "profiler/index.json",
            "profilerSummary": "profiler/summary.arrow",
        },
        "capabilities": {
            "circuit": True,
            "live": True,
            "stockpiles": True,
            "profiler": True,
        },
        "objectCounts": {
            "total": len(registry),
            "belts": sum(1 for entry in registry if entry["objectType"] == "belt"),
            "piles": sum(1 for entry in registry if entry["objectType"] == "pile"),
            "profiled": sum(1 for entry in registry if entry["isProfiled"]),
        },
    }

    write_json(APP_ROOT / "manifest.json", manifest)
    write_json(APP_ROOT / "qualities.json", quality_definitions)
    write_json(APP_ROOT / "registry.json", registry)
    write_json(APP_ROOT / "circuit.json", circuit)
    write_json(APP_ROOT / "live" / "object-summaries.json", live_summaries)
    write_json(
        APP_ROOT / "profiler" / "index.json",
        {
            "defaultObjectId": "pile_stockpile"
            if any(obj["objectId"] == "pile_stockpile" for obj in profiler_index_objects)
            else profiler_index_objects[0]["objectId"],
            "objects": profiler_index_objects,
        },
    )
    profiler_summary_rows.sort(key=lambda row: (row["timestamp"], row["objectId"]))
    write_arrow(
        APP_ROOT / "profiler" / "summary.arrow",
        profiler_summary_rows,
        [
            "snapshotId",
            "timestamp",
            "objectId",
            "objectType",
            "displayName",
            "dimension",
            "massTon",
            *quality_ids,
        ],
    )

    print(f"Generated app cache at {APP_ROOT}")


if __name__ == "__main__":
    main()
