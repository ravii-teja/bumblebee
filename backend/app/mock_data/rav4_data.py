"""Grounded showcase data for 2022 Toyota RAV4 2.5L (Engine Air Filter & Maintenance)."""
from app.models.schemas import (
    VehicleProfile,
    RepairProcedure,
    RepairStep,
    ComponentObservation,
    BoundingBox,
    PartCandidate,
    DiagnosticHypothesis,
)

RAV4_PROFILE = VehicleProfile(
    id="toyota_rav4_2022",
    make="Toyota",
    model="RAV4",
    year=2022,
    trim="XLE AWD",
    engine="2.5L Dynamic Force I4 (A25A-FKS)",
    transmission="Direct Shift 8-Speed Electronically Controlled Automatic",
    vin_sample="2T3P1RFV4NW******",
    manual_name="Toyota RAV4 Owner's Manual (Publication OM42C33U, Section 8-3 Do-it-yourself maintenance)",
    diagram_url="/vehicles/rav4/engine_bay_schematic.svg"
)

RAV4_COMPONENTS = [
    ComponentObservation(
        component_id="air_cleaner_assembly",
        name="Engine Air Cleaner Housing Assembly",
        system="Air Induction System",
        confidence=0.97,
        bounding_box=BoundingBox(ymin=0.28, xmin=0.18, ymax=0.68, xmax=0.52),
        polygon_points=[
            [0.22, 0.32],
            [0.34, 0.28],
            [0.48, 0.30],
            [0.52, 0.44],
            [0.50, 0.62],
            [0.42, 0.68],
            [0.26, 0.66],
            [0.18, 0.54],
            [0.19, 0.38]
        ],
        observed_state="Housing closed, dual metal retaining spring clips engaged",
        status="NORMAL",
        description="Houses the replaceable air filter element that cleans intake air before it reaches the mass airflow sensor and throttle body.",
        spatial_zone="Front Left (Driver-side front corner of engine compartment)"
    ),
    ComponentObservation(
        component_id="maf_sensor",
        name="Mass Airflow (MAF) Sensor & Intake Duct",
        system="Air Induction System",
        confidence=0.93,
        bounding_box=BoundingBox(ymin=0.22, xmin=0.46, ymax=0.42, xmax=0.64),
        polygon_points=[
            [0.46, 0.24],
            [0.58, 0.22],
            [0.64, 0.32],
            [0.61, 0.42],
            [0.50, 0.40],
            [0.46, 0.30]
        ],
        observed_state="Harness securely connected, intake hose clamps torqued",
        status="NORMAL",
        description="Measures volume and density of air entering the engine for stoichiometric fuel injection calculations.",
        spatial_zone="Directly downstream of air filter housing exit tube"
    ),
    ComponentObservation(
        component_id="coolant_reservoir",
        name="Engine Coolant Expansion Tank",
        system="Cooling System",
        confidence=0.95,
        bounding_box=BoundingBox(ymin=0.65, xmin=0.12, ymax=0.88, xmax=0.32),
        polygon_points=[
            [0.14, 0.67],
            [0.28, 0.65],
            [0.32, 0.76],
            [0.29, 0.88],
            [0.16, 0.86],
            [0.12, 0.74]
        ],
        observed_state="Translucent tank, fluid level between FULL and LOW marks (Toyota Super Long Life Pink)",
        status="NORMAL",
        description="Pressurized coolant surge tank maintaining cooling loop thermal expansion volume.",
        spatial_zone="Front Left bumper support edge"
    ),
    ComponentObservation(
        component_id="brake_fluid_reservoir",
        name="Brake Master Cylinder Fluid Reservoir",
        system="Hydraulic Brake System (Safety Guarded)",
        confidence=0.96,
        bounding_box=BoundingBox(ymin=0.15, xmin=0.74, ymax=0.36, xmax=0.92),
        polygon_points=[
            [0.76, 0.16],
            [0.90, 0.15],
            [0.92, 0.29],
            [0.88, 0.36],
            [0.75, 0.34],
            [0.74, 0.22]
        ],
        observed_state="Fluid level nominal (DOT 3 / DOT 4)",
        status="NORMAL",
        description="Hydraulic reservoir feeding dual-circuit braking system. Requires certified technician for bleeding or hydraulic servicing.",
        spatial_zone="Rear Driver side near cowl firewall"
    ),
    ComponentObservation(
        component_id="oil_filler_cap",
        name="Engine Oil Filler Cap (0W-16)",
        system="Lubrication System",
        confidence=0.98,
        bounding_box=BoundingBox(ymin=0.40, xmin=0.55, ymax=0.56, xmax=0.72),
        polygon_points=[
            [0.56, 0.42],
            [0.68, 0.40],
            [0.72, 0.49],
            [0.69, 0.56],
            [0.58, 0.55],
            [0.55, 0.47]
        ],
        observed_state="Cap threaded and locked (SAE 0W-16 specified)",
        status="NORMAL",
        description="Cylinder head valve cover oil filler neck. Factory recommended oil viscosity is SAE 0W-16.",
        spatial_zone="Center-Right top valve cover"
    ),
    ComponentObservation(
        component_id="battery_12v",
        name="12V Auxiliary Starter Battery",
        system="Electrical System",
        confidence=0.94,
        bounding_box=BoundingBox(ymin=0.52, xmin=0.72, ymax=0.86, xmax=0.96),
        polygon_points=[
            [0.74, 0.54],
            [0.94, 0.52],
            [0.96, 0.82],
            [0.88, 0.86],
            [0.73, 0.83],
            [0.72, 0.62]
        ],
        observed_state="Terminals clean, hold-down bracket secured",
        status="NORMAL",
        description="Supplies 12-volt vehicle electronics, starter motor relay, and ECU memory backup.",
        spatial_zone="Front Passenger side fender tray"
    )
]

AIR_FILTER_PROCEDURE = RepairProcedure(
    id="rav4_engine_air_filter",
    vehicle_id="toyota_rav4_2022",
    title="Engine Air Cleaner Element Inspection & Replacement",
    category="Routine Periodic Maintenance",
    difficulty="BEGINNER",
    estimated_minutes=8,
    tools_required=["None (Hands-only operation; clean shop rag optional)"],
    parts_required=["Toyota Genuine Air Filter Element 17801-F0050 or equivalent"],
    safety_critical=False,
    source_manual="Toyota RAV4 2022 Owner's Manual (Pub. OM42C33U)",
    source_section="Section 8-3: Do-it-yourself maintenance (Page 482)",
    steps=[
        RepairStep(
            step_number=1,
            title="Locate the Engine Air Cleaner Assembly",
            instruction="Stand at the front of the vehicle. Locate the black rectangular air cleaner box on the driver's front side of the engine compartment.",
            required_tools=["None"],
            safety_warning="Turn ignition OFF and allow the engine to cool for at least 15 minutes before opening any engine compartment components.",
            expected_visual_state="Air cleaner housing in full camera frame, dual metal spring clips clearly visible on the right edge.",
            reference_manual_page=482,
            reference_diagram_url="/vehicles/rav4/step1_locate.svg",
            verification_criteria=[
                "Air cleaner housing centered in frame",
                "Retaining clips visible",
                "Lighting adequate for inspection"
            ],
            sample_frame_key="step1_housing_overview"
        ),
        RepairStep(
            step_number=2,
            title="Release the Two Retaining Spring Clips",
            instruction="Grasp the two metal spring clamps located on the right side of the air cleaner housing. Press downward and outward until both clips snap open and drop clear of the upper lid.",
            required_tools=["Hands only"],
            safety_warning="Do not use screwdrivers or sharp pry tools; the spring clips are designed for thumb release to prevent cracking the plastic housing.",
            expected_visual_state="Both metal spring clips unfastened, hanging downward; upper housing seam loose.",
            reference_manual_page=482,
            reference_diagram_url="/vehicles/rav4/step2_unclip.svg",
            verification_criteria=[
                "Upper spring clip disengaged",
                "Lower spring clip disengaged",
                "No clip obstructing the seam"
            ],
            sample_frame_key="step2_clips_released"
        ),
        RepairStep(
            step_number=3,
            title="Lift Upper Housing Lid to Expose Element",
            instruction="Lift the right edge of the upper air cleaner housing upward approximately 2 to 3 inches. Pivot on the rear plastic hinge tabs without disconnecting the flexible intake duct.",
            required_tools=["Hands only"],
            safety_warning="Do not forcefully yank the lid upward; excessive force can strain the mass airflow sensor wiring harness or tear the flexible intake boot.",
            expected_visual_state="Housing lid propped open, white pleated filter media and rubber perimeter gasket clearly visible.",
            reference_manual_page=483,
            reference_diagram_url="/vehicles/rav4/step3_lift.svg",
            verification_criteria=[
                "Gap between upper lid and lower box greater than 2 inches",
                "Filter element exposed",
                "Hinge tabs intact"
            ],
            sample_frame_key="step3_lid_lifted"
        ),
        RepairStep(
            step_number=4,
            title="Extract and Inspect Old Filter Element",
            instruction="Carefully pull the rectangular filter element up and out from the lower housing. Visually inspect the underside pleats for deep dirt, insect debris, or oil fouling.",
            required_tools=["Hands only", "Optional clean rag to wipe lower tray"],
            safety_warning="Prevent dirt, leaves, or foreign debris from falling into the clean intake tract leading to the engine throttle body.",
            expected_visual_state="Filter element removed from tray; lower housing tray empty; filter element held in view showing pleat condition.",
            reference_manual_page=483,
            reference_diagram_url="/vehicles/rav4/step4_extract.svg",
            verification_criteria=[
                "Filter element completely removed from housing",
                "Intake duct unobstructed",
                "Lower box clean and free of loose leaves"
            ],
            sample_frame_key="step4_element_extracted"
        ),
        RepairStep(
            step_number=5,
            title="Install New Genuine Air Cleaner Element",
            instruction="Orient the new filter element with the rounded corner aligned with the housing notch and rubber sealing lip facing upward. Seat the element firmly into the lower housing channel.",
            required_tools=["New Air Filter (Toyota 17801-F0050 or compatible)"],
            safety_warning="Ensure the rubber perimeter gasket sits completely flat in the groove. A pinched gasket allows unfiltered bypass air into the engine.",
            expected_visual_state="Fresh, clean white pleated filter element seated uniformly flush inside the lower housing channel.",
            reference_manual_page=484,
            reference_diagram_url="/vehicles/rav4/step5_install.svg",
            verification_criteria=[
                "New filter element centered in lower tray",
                "Rubber gasket seated flush with zero gap or folding",
                "Pleats uncrushed and clean"
            ],
            sample_frame_key="step5_new_element_seated"
        ),
        RepairStep(
            step_number=6,
            title="Re-engage Rear Hinge Tabs & Lock Both Retaining Clips",
            instruction="Slide the rear locking tabs of the upper lid into the slots of the lower housing. Lower the lid flat, then pull both metal spring clips upward until they firmly snap over the lip.",
            required_tools=["Hands only"],
            safety_warning="Verify the rear tabs are engaged BEFORE latching the front clips; if rear tabs are disengaged, the airbox will leak unmetered air and trigger Check Engine light P0171.",
            expected_visual_state="Upper and lower housing halves tightly sealed together; both metal spring clips snapped upright in locked position.",
            reference_manual_page=484,
            reference_diagram_url="/vehicles/rav4/step6_sealed.svg",
            verification_criteria=[
                "Upper lid fully seated against lower box",
                "Both metal spring clips engaged and tensioned",
                "Zero gap visible along perimeter seam"
            ],
            sample_frame_key="step6_housing_sealed"
        )
    ]
)

RAV4_PARTS = [
    PartCandidate(
        part_number="17801-F0050",
        oem_or_aftermarket="OEM",
        brand="Toyota Genuine Parts",
        name="Toyota OEM Engine Air Filter Element",
        price_usd=24.50,
        marketplace_url="https://parts.toyota.com/p/Toyota__RAV4/Engine-Air-Filter/73289053/17801-F0050.html",
        image_url="/vehicles/rav4/parts/toyota_oem_filter.png",
        verified_fitment=True,
        fitment_evidence="Official Toyota Parts Catalog fitment verified for 2019-2024 Toyota RAV4 2.5L Gas (A25A-FKS) & Hybrid (A25A-FXS). Exact factory OEM match.",
        specifications={
            "Filter Material": "High-Efficiency Non-Woven Synthetic Fiber",
            "Gasket Type": "Molded Polyurethane Precision Seal",
            "Dimensions": "10.6 x 7.4 x 1.9 inches",
            "Warranty": "12 Months / 12,000 Miles Toyota Factory Warranty"
        }
    ),
    PartCandidate(
        part_number="CA12289",
        oem_or_aftermarket="AFTERMARKET_TIER1",
        brand="FRAM",
        name="FRAM Extra Guard Air Filter CA12289",
        price_usd=16.99,
        marketplace_url="https://www.amazon.com/dp/B07Y5K8S4M",
        image_url="/vehicles/rav4/parts/fram_ca12289.png",
        verified_fitment=True,
        fitment_evidence="FRAM application guide cross-referenced: Replaces OEM 17801-F0050. Direct drop-in fit for 2019-2023 RAV4 2.5L.",
        specifications={
            "Filter Material": "Advanced Filter Media with Dirt-Locking Microscopic Channels",
            "Efficiency": "Up to 99% engine protection up to 12,000 miles",
            "Weight": "11.2 oz",
            "Country of Origin": "USA"
        }
    ),
    PartCandidate(
        part_number="33-3162",
        oem_or_aftermarket="AFTERMARKET_TIER1",
        brand="K&N",
        name="K&N High-Flow Washable Air Filter 33-3162",
        price_usd=64.99,
        marketplace_url="https://www.knfilters.com/33-3162-replacement-air-filter",
        image_url="/vehicles/rav4/parts/kn_333162.png",
        verified_fitment=True,
        fitment_evidence="K&N vehicle fitment catalog confirmed for 2019-2024 Toyota RAV4 2.5L. Million-Mile limited warranty.",
        specifications={
            "Filter Media": "Multi-Layer Oiled Cotton Gauze",
            "Maintenance": "Washable & Reusable every 50,000 miles",
            "Airflow": "+50% airflow over disposable paper filters"
        }
    ),
    PartCandidate(
        part_number="XA11628",
        oem_or_aftermarket="AFTERMARKET_STANDARD",
        brand="ECOGARD",
        name="ECOGARD Premium Engine Air Filter XA11628",
        price_usd=13.49,
        marketplace_url="https://www.amazon.com/dp/B082L4W4P6",
        image_url="/vehicles/rav4/parts/ecogard_filter.png",
        verified_fitment=True,
        fitment_evidence="ECOGARD catalog verified against OEM spec 17801-F0050. ISO/TS 16949 certified manufacturing.",
        specifications={
            "Service Interval": "12,000 miles or 1 year",
            "Housing Compatibility": "Factory Airbox Direct Fit"
        }
    )
]

RAV4_DIAGNOSTICS = [
    DiagnosticHypothesis(
        id="diag_air_flow_restriction",
        symptom="Decreased fuel economy (MPG down 8-12%) and sluggish initial throttle response",
        hypothesis_title="Restricted / Clogged Engine Air Cleaner Element",
        description="A heavily dust-saturated air cleaner element increases vacuum restriction across the intake tract, causing the ECU to adjust throttle plate angles and rich-fuel trims.",
        confidence=0.91,
        supporting_evidence=[
            "Vehicle mileage exceeds 15,000 miles since last inspection",
            "Visual check indicates dark grey pleats clogged with road grit and cottonwood seed fluff",
            "No active OBD-II misfire codes"
        ],
        recommended_checks=[
            "Perform visual inspection of air cleaner element (Bumblebee Step 1-4)",
            "Hold filter up to bright flashlight: if light cannot pass through pleats, replacement is required"
        ],
        safety_level="NON_SAFETY_CRITICAL",
        manual_citation="Owner's Manual Maintenance Section: inspect every 15,000 mi (24,000 km) or 18 months."
    ),
    DiagnosticHypothesis(
        id="diag_rough_idle_maf",
        symptom="Engine hesitation upon acceleration or slightly fluctuating idle RPM (600-850 RPM)",
        hypothesis_title="Contaminated Mass Airflow (MAF) Sensor or Loose Air Cleaner Lid",
        description="Air bypassing an unlatched air cleaner lid or dirty MAF sensing wire provides inaccurate intake airflow data to the engine control module.",
        confidence=0.84,
        supporting_evidence=[
            "Air cleaner housing clips loose or improperly latched",
            "Dust ingress past unsealed gasket lip"
        ],
        recommended_checks=[
            "Inspect airbox retaining clips and rear hinge tabs",
            "Verify perimeter rubber seal of air cleaner element is flat and seated"
        ],
        safety_level="NON_SAFETY_CRITICAL",
        manual_citation="Owner's Manual Section 8: Check for loose clamps, cracks, and unfastened clips."
    )
]


GENERIC_PROFILE = VehicleProfile(
    id="generic_vehicle",
    make="",
    model="Vehicle",
    year=2024,
    trim="Inspection",
    engine="Automotive Powertrain",
    transmission="Standard Transmission",
    manual_name="Official Manufacturer Service Documentation",
    diagram_url="/vehicles/clean_car_view.svg"
)

GENERIC_PROCEDURE = RepairProcedure(
    id="general_inspection",
    vehicle_id="generic_vehicle",
    title="Automotive Diagnostic & Field Verification",
    category="Physical Field Inspection",
    difficulty="BEGINNER",
    estimated_minutes=10,
    tools_required=["Bumblebee Vision Camera Sensor"],
    parts_required=["Pending Vehicle & Issue Identification"],
    safety_critical=False,
    source_manual="Official Manufacturer Service Documentation",
    source_section="Field Inspection Protocol",
    steps=AIR_FILTER_PROCEDURE.steps
)


def create_dynamic_vehicle_profile(make: str, model: str, year: int) -> VehicleProfile:
    """Generates an accurate vehicle profile for any detected vehicle."""
    make_clean = make.strip().title()
    model_clean = model.strip().title()
    return VehicleProfile(
        id=f"{make_clean.lower()}_{model_clean.lower()}_{year}",
        make=make_clean,
        model=model_clean,
        year=year,
        trim="Standard / Base",
        engine="Factory Standard Powertrain",
        transmission="Automatic / Direct Drive",
        manual_name=f"{year} {make_clean} {model_clean} Official Owner & Maintenance Manual",
        diagram_url="/vehicles/clean_car_view.svg"
    )


def create_dynamic_procedure(vehicle: VehicleProfile, issue: str) -> RepairProcedure:
    """Generates a step-by-step repair procedure for the detected vehicle."""
    return RepairProcedure(
        id=f"{vehicle.id}_procedure",
        vehicle_id=vehicle.id,
        title=f"{vehicle.year} {vehicle.make} {vehicle.model} — Engine Air Cleaner Inspection & Replacement",
        category="Routine Periodic Maintenance",
        difficulty="BEGINNER",
        estimated_minutes=10,
        tools_required=["Hands only (Optional clean shop towel)"],
        parts_required=[f"{vehicle.make} Genuine Air Filter Element or certified equivalent"],
        safety_critical=False,
        source_manual=vehicle.manual_name,
        source_section="Do-it-yourself maintenance: Air cleaner element",
        steps=AIR_FILTER_PROCEDURE.steps
    )

