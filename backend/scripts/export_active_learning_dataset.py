#!/usr/bin/env python3
"""CLI utility to export high-rated Bumblebee repair sessions into training JSONL."""
import os
import sys
import json

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.services.active_learning import ActiveLearningService

def main():
    dataset = ActiveLearningService.compile_fine_tuning_dataset(min_rating=4)
    out_path = os.path.join(backend_dir, "bumblebee_fine_tuning_dataset.jsonl")
    
    with open(out_path, "w", encoding="utf-8") as f:
        for r in dataset["records"]:
            f.write(json.dumps(r) + "\n")
            
    print(f"Exported {dataset['total_examples']} active learning examples to {out_path}")

if __name__ == "__main__":
    main()
