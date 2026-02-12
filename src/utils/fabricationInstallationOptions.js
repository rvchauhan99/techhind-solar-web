/**
 * India Solar EPC - standard selection options for Fabrication & Installation stages.
 * Labels match spec (Fabrication_Installation_Stage_Spec_India.md).
 */

export const FABRICATION_STRUCTURE_TYPES = [
    "RCC Roof Mount",
    "Tin Shed Roof",
    "Ground Mounted",
    "Elevated Structure",
    "Car Parking Structure",
    "Pergola Type",
    "Industrial Shed Structure",
];

export const FABRICATION_STRUCTURE_MATERIALS = [
    "Hot Dip Galvanized Iron (HDGI)",
    "Mild Steel (MS)",
    "Pre-Galvanized Iron (PGI)",
    "Aluminium",
    "GI with Powder Coating",
];

export const FABRICATION_COATING_TYPES = [
    "Hot Dip Galvanized (80 Micron)",
    "Hot Dip Galvanized (100 Micron)",
    "Powder Coated",
    "Anti-Rust Paint",
    "No Coating",
];

export const FABRICATION_TILT_ANGLES = [
    "10°",
    "15°",
    "18°",
    "20°",
    "22°",
    "25°",
    "Custom",
];

export const FABRICATION_HEIGHT_FROM_ROOF = [
    "300 mm",
    "450 mm",
    "600 mm",
    "900 mm",
    "Custom",
];

export const FABRICATION_LABOUR_CATEGORIES = [
    "Skilled",
    "Semi-Skilled",
    "Unskilled",
    "Contractor Based",
];

/** Fabrication image keys per spec; minimum required: full_structure_front, anchoring_closeup */
export const FABRICATION_IMAGE_KEYS = [
    { key: "before_site_photo", label: "Before Site Photo" },
    { key: "raw_material_photo", label: "Raw Material Photo" },
    { key: "anchoring_closeup", label: "Anchoring Closeup", required: true },
    { key: "full_structure_front", label: "Full Structure Front", required: true },
    { key: "side_view", label: "Side View" },
    { key: "tilt_angle_photo", label: "Tilt Angle Photo" },
    { key: "safety_photo", label: "Safety Photo" },
];

// --- Installation options ---

export const INSTALLATION_INVERTER_LOCATIONS = [
    "Indoor Wall Mount",
    "Outdoor Wall Mount",
    "Dedicated Inverter Room",
    "Near Main DB",
    "Industrial Control Panel Room",
];

export const INSTALLATION_EARTHING_TYPES = [
    "Chemical Earthing",
    "Copper Plate Earthing",
    "GI Pipe Earthing",
    "Maintenance Free Earthing",
];

export const INSTALLATION_WIRING_TYPES = [
    "Copper DC Cable (4 sqmm)",
    "Copper DC Cable (6 sqmm)",
    "Aluminium DC Cable",
    "Copper AC Cable (4 sqmm)",
    "Copper AC Cable (6 sqmm)",
    "Armoured AC Cable",
];

export const INSTALLATION_ACDB_DCDB_MAKES = [
    "Havells",
    "L&T",
    "Schneider Electric",
    "Polycab",
    "ABB",
    "Generic",
];

export const INSTALLATION_PANEL_MOUNTING_TYPES = [
    "Landscape",
    "Portrait",
];

export const INSTALLATION_NETMETER_READINESS = [
    "Applied",
    "Approved",
    "Pending",
    "Installed",
];

/** Installation image keys per spec; minimum required: full_plant_view, inverter_closeup, generation_display_photo */
export const INSTALLATION_IMAGE_KEYS = [
    { key: "full_plant_view", label: "Full Plant View", required: true },
    { key: "inverter_closeup", label: "Inverter Closeup", required: true },
    { key: "acdb_photo", label: "ACDB Photo" },
    { key: "dcdb_photo", label: "DCDB Photo" },
    { key: "earthing_photo", label: "Earthing Photo" },
    { key: "panel_serial_photo", label: "Panel Serial Photo" },
    { key: "generation_display_photo", label: "Generation Display Photo", required: true },
    { key: "customer_handover_photo", label: "Customer Handover Photo" },
];
