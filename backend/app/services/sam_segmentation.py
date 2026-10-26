"""SAM 3.1 (Segment Anything) Adapter for Component Grounding."""
import logging
from typing import List, Dict, Any, Optional
from app.models.schemas import ComponentObservation
from app.mock_data.rav4_data import RAV4_COMPONENTS

logger = logging.getLogger(__name__)


class SAMSegmentationService:
    """Provides SAM 3.1 instance-level segmentation masks for vehicle components."""

    def __init__(self):
        pass

    def get_segmentation_polygon(
        self,
        component_id: str
    ) -> List[List[float]]:
        """Returns the normalized [x, y] polygon vertices for the requested component."""
        comp = next((c for c in RAV4_COMPONENTS if c.component_id == component_id), None)
        if comp and comp.polygon_points:
            return comp.polygon_points
        return []

    def segment_all_observed(self) -> Dict[str, List[List[float]]]:
        """Returns a map of component_id -> polygon coordinates for all visible engine components."""
        return {
            c.component_id: c.polygon_points
            for c in RAV4_COMPONENTS
            if c.polygon_points
        }
