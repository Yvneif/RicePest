"""POST /api/recommend - eradication technique recommendation engine.

Ports the thesis decision-tree (pest_data2py.py) to structured JSON content.
The sklearn DecisionTreeClassifier is kept so recommendations stay identical
to the original 32-row expert table.
"""

from __future__ import annotations

import numpy as np
from flask import request
from sklearn.tree import DecisionTreeClassifier

from app.api import api_bp
from app.utils import UploadError

FEATURE_MAPPING = {
    "pest_type": {"Rice Bug": 0, "Stem Borer": 1, "Green Leafhopper": 2, "Leaf Folder": 3},
    "season": {"sunny": 0, "rainy": 1},
    "pest_density": {"Maritak": 0, "Marakal": 1, "Sobra Karakal": 2, "Ali na Abilang": 3},
    "eradication_technique": {
        "Physical + Mechanical 1": 0,
        "Cultural 1": 1,
        "Biological 1": 2,
        "Chemical 1": 3,
        "Physical + Mechanical 2": 4,
        "Cultural 2": 5,
        "Biological 2": 6,
        "Chemical 2": 7,
        "Physical + Mechanical 3": 8,
        "Cultural 3": 9,
        "Chemical 3": 10,
        "Physical + Mechanical 4": 11,
        "Cultural 4": 12,
        "Chemical 4": 13,
        "None": 14,
    },
}

# The original expert table: [pest, season, density, technique]
TABLE = [
    ["Rice Bug", "sunny", "Maritak", "Physical + Mechanical 1"],
    ["Rice Bug", "rainy", "Maritak", "Cultural 1"],
    ["Rice Bug", "sunny", "Marakal", "Biological 1"],
    ["Rice Bug", "rainy", "Marakal", "Cultural 1"],
    ["Rice Bug", "sunny", "Sobra Karakal", "Chemical 1"],
    ["Rice Bug", "rainy", "Sobra Karakal", "Chemical 1"],
    ["Rice Bug", "rainy", "Ali na Abilang", "None"],
    ["Rice Bug", "sunny", "Ali na Abilang", "None"],
    ["Stem Borer", "sunny", "Maritak", "Physical + Mechanical 2"],
    ["Stem Borer", "rainy", "Maritak", "Cultural 2"],
    ["Stem Borer", "sunny", "Marakal", "Biological 2"],
    ["Stem Borer", "rainy", "Marakal", "Cultural 2"],
    ["Stem Borer", "sunny", "Sobra Karakal", "Chemical 2"],
    ["Stem Borer", "rainy", "Sobra Karakal", "Chemical 2"],
    ["Stem Borer", "rainy", "Ali na Abilang", "None"],
    ["Stem Borer", "sunny", "Ali na Abilang", "None"],
    ["Green Leafhopper", "sunny", "Maritak", "Cultural 3"],
    ["Green Leafhopper", "rainy", "Maritak", "Cultural 3"],
    ["Green Leafhopper", "sunny", "Marakal", "Physical + Mechanical 3"],
    ["Green Leafhopper", "rainy", "Marakal", "Cultural 3"],
    ["Green Leafhopper", "sunny", "Sobra Karakal", "Chemical 3"],
    ["Green Leafhopper", "rainy", "Sobra Karakal", "Chemical 3"],
    ["Green Leafhopper", "sunny", "Ali na Abilang", "None"],
    ["Green Leafhopper", "rainy", "Ali na Abilang", "None"],
    ["Leaf Folder", "sunny", "Maritak", "Cultural 4"],
    ["Leaf Folder", "rainy", "Maritak", "Cultural 4"],
    ["Leaf Folder", "sunny", "Marakal", "Cultural 4"],
    ["Leaf Folder", "rainy", "Marakal", "Physical + Mechanical 4"],
    ["Leaf Folder", "sunny", "Sobra Karakal", "Chemical 4"],
    ["Leaf Folder", "rainy", "Sobra Karakal", "Chemical 4"],
    ["Leaf Folder", "sunny", "Ali na Abilang", "None"],
    ["Leaf Folder", "rainy", "Ali na Abilang", "None"],
]

_X = [
    [
        FEATURE_MAPPING["pest_type"][row[0]],
        FEATURE_MAPPING["season"][row[1]],
        FEATURE_MAPPING["pest_density"][row[2]],
    ]
    for row in TABLE
]
_Y = [FEATURE_MAPPING["eradication_technique"][row[3]] for row in TABLE]

_CLF = DecisionTreeClassifier().fit(_X, _Y)

# Structured eradication guidance (Tagalog) for each technique.
TECHNIQUES: dict[str, dict] = {
    "Physical + Mechanical 1": {
        "steps": [
            "Hulihin ang rice bugs gamit ang lambat tuwing umaga o hapon.",
            "Epektibo ito kapag kakaunti pa ang rice bugs; nangangailangan ng tiyaga.",
        ],
        "materials": ["Lambat o net"],
        "precautions": [
            "Siguraduhing walang butas ang lambat upang hindi makatakas ang rice bugs."
        ],
    },
    "Cultural 1": {
        "steps": [
            "Tanggalin ang mga damo sa loob at paligid ng bukid para hindi dumami ang rice bugs kapag bakante ang taniman.",
            "Pantayin ang lupa at maglagay ng pantay-pantay na pataba at tubig para sabay-sabay tumubo ang palay.",
            "Sabay-sabay na magtanim sa mga bukid sa baryo para mabawasan ang rice bugs.",
        ],
        "materials": ["Mga kagamitan sa paglinis ng damo", "Pataba"],
        "precautions": [
            "Siguraduhing ligtas na tinatanggal ang mga damo upang maiwasan ang pagdami ng peste."
        ],
    },
    "Biological 1": {
        "steps": [
            "Hayaan ang mga natural na kalaban ng rice bugs tulad ng wasps, grasshoppers, at gagamba na kumain ng rice bugs at ng kanilang mga itlog.",
            "Iwasan ang sobrang paggamit ng insecticide para hindi mamatay ang mga ito.",
        ],
        "materials": [],
        "precautions": [
            "Iwasan ang pag-spray ng insecticides sa lugar kung saan naroroon ang mga natural na predators."
        ],
    },
    "Chemical 1": {
        "steps": [
            "Kumonsulta muna sa crop protection expert bago gumamit ng pesticide.",
            "Simulan ang pag-inspeksyon ng bukid bago mamulaklak ang palay at ituloy araw-araw hanggang tumigas ang butil.",
            "Bilangin ang rice bugs tuwing umaga o hapon sa 20 halaman habang naglalakad sa bukid.",
            "Kung may higit sa 10 rice bugs sa 20 halaman, maaaring kailangan ng direktang aksyon.",
            "Pumili ng insecticide batay sa kagamitan, presyo, karanasan, at presensya ng isda sa lugar.",
            "Timbangin ang benepisyo at panganib sa kalusugan at kalikasan bago gumamit.",
        ],
        "materials": ["Insecticide", "Konsultasyon sa crop protection expert"],
        "precautions": [
            "Siguraduhin ang kaligtasan ng kapaligiran at kalusugan bago mag-spray ng insecticides."
        ],
    },
    "Physical + Mechanical 2": {
        "steps": [
            "Sa seedbed at paglipat-tanim, pitasin at sirain ang mga itlog ng peste sa halaman.",
            "Paminsan-minsang taasan ang antas ng tubig sa irigasyon upang malubog ang mga itlog sa ibabang bahagi ng halaman.",
            "Bago maglipat-tanim, putulin ang tuktok ng dahon para mabawasan ang itlog na nailipat mula seedbed papunta sa bukid.",
        ],
        "materials": ["Mga kagamitan sa pag-pitas ng itlog", "Irigasyon system"],
        "precautions": ["Siguraduhing maayos ang pagkatubo ng mga halaman matapos ang proseso."],
    },
    "Cultural 2": {
        "steps": [
            "Gumamit ng mga matitibay na uri ng palay na hindi madaling dapuan ng peste.",
            "Siguraduhing tama ang timing ng pagtatanim at gawin itong sabay-sabay sa buong baryo.",
            "Anihin ang pinakamababang bahagi ng halaman upang alisin ang mga larvae sa mga tangkay.",
            "Alisin ang mga natirang tangkay at kusang tumutubong palay, saka araruhin at bahaing mabuti ang bukid.",
        ],
        "materials": ["Matitibay na uri ng binhi ng palay"],
        "precautions": ["Siguraduhing pantay-pantay ang pataba at tubig sa buong bukid."],
    },
    "Biological 2": {
        "steps": [
            "Hayaan ang mga natural na kalaban ng peste: wasps, langgam, lady beetle, damselfly, dragonfly, gagamba at iba pa.",
            "Bacteria, fungi, at nematodes ay nakakaapekto rin sa mga larvae ng peste.",
        ],
        "materials": [],
        "precautions": [
            "Huwag gumamit ng malalakas na pesticides na maaaring makapinsala sa mga natural na predators."
        ],
    },
    "Chemical 2": {
        "steps": [
            "Hatiin ang paglagay ng nitrogen fertilizer at sundin ang tamang dami at tamang oras ng aplikasyon."
        ],
        "materials": ["Nitrogen fertilizer"],
        "precautions": [
            "Iwasan ang labis na paglalagay ng fertilizer upang hindi makasira sa lupa at tubig."
        ],
    },
    "Physical + Mechanical 3": {
        "steps": [
            "Maglagay ng nitrogen ayon sa pangangailangan gamit ang Leaf Color Chart para maiwasan ang pagdami ng leafhopper."
        ],
        "materials": ["Leaf Color Chart", "Nitrogen fertilizer"],
        "precautions": [
            "Siguraduhing tama ang pagkakalagay ng nitrogen upang maiwasan ang pag-atake ng mga leafhoppers."
        ],
    },
    "Cultural 3": {
        "steps": [
            "Gumamit ng mga matitibay na uri ng palay laban sa GLH at tungro; kumonsulta sa lokal na opisina ng agrikultura.",
            "Magtanim nang dalawang beses sa isang taon at sabay-sabay sa ibang bukid para mabawasan ang leafhopper.",
            "Gumamit ng lumang punla (3 linggo pataas) para mabawasan ang panganib ng sakit.",
            "Magtanim nang maaga, lalo na sa tag-init, para maiwasan ang sakit na dulot ng mga insekto.",
            "Iwasan ang pagtatanim sa panahon ng mataas na aktibidad ng GLH; gumamit ng light traps para malaman ang dami ng GLH.",
        ],
        "materials": ["Matitibay na uri ng binhi laban sa GLH"],
        "precautions": ["Iwasan ang pagtatanim sa panahon ng mataas na aktibidad ng GLH."],
    },
    "Chemical 3": {
        "steps": [
            "Mag-spray ng insecticide nang dalawang beses, 15 at 30 araw pagkatapos maglipat-tanim.",
            "Mag-spray ng insecticide tulad ng Fenitrothion.",
        ],
        "materials": ["Insecticide (Fenitrothion)"],
        "precautions": ["Siguraduhing tamang gamit at proteksiyon para sa ligtas na pag-spray."],
    },
    "Physical + Mechanical 4": {
        "steps": [
            "Hindi inirerekomenda ang paggamit ng pesticides sa maagang yugto ng crop.",
            "Maraming magsasaka ang walang tamang safety equipment at kaalaman para sa ligtas na paggamit ng pesticides.",
            "Mas mainam na kumonsulta sa crop protection specialist para sa tamang payo.",
        ],
        "materials": ["Pesticides", "Konsultasyon sa crop protection expert"],
        "precautions": ["Siguraduhing may tamang safety equipment ang magsasaka."],
    },
    "Cultural 4": {
        "steps": [
            "Gumamit ng matitibay na uri ng palay; kumonsulta sa lokal na opisina ng agrikultura para sa updated na listahan.",
            "Magtanim ng ibang crop pagkatapos ng palay o magpahinga ng lupa.",
            "Iwasan ang ratooning (pagtatanim mula sa natirang ugat).",
            "Magbaha at araruhin ang bukid pagkatapos anihin kung posible.",
            "Alisin ang mga damo sa loob at gilid ng bukid.",
            "Bawasan ang dami ng tanim at gumamit ng tamang dami ng pataba.",
        ],
        "materials": ["Matibay na uri ng palay", "Konsultasyon para sa crop rotation"],
        "precautions": ["Iwasan ang ratooning upang hindi maipasa ang peste sa susunod na tanim."],
    },
    "Chemical 4": {
        "steps": [
            "Mag-spray ng insecticides tulad ng flubendiamide, chlorantraniliprole, alpha-cypermethrin, abamectin 2%, cartap hydrochloride, at profenofos."
        ],
        "materials": ["Insecticides (flubendiamide, chlorantraniliprole, atbp.)"],
        "precautions": [
            "Iwasan ang over-spray at tiyaking ligtas sa kalusugan ang paggamit ng mga insecticides."
        ],
    },
    "None": {
        "steps": ["Walang kailangang gawin dahil anumang paraan ay makakadagdag lamang sa gastos."],
        "materials": [],
        "precautions": [],
    },
}


def get_pest_density(pest_count: int) -> str:
    """Bucket a pest count into the Filipino density categories."""
    if pest_count < 5:
        return "Maritak"
    if pest_count <= 60:
        return "Marakal"
    if pest_count <= 150:
        return "Sobra Karakal"
    return "Ali na Abilang"


def normalize_pest(label: str) -> str:
    """Accept plural/singular labels ('Leaf Folders' -> 'Leaf Folder')."""
    label = (label or "").strip()
    if label in FEATURE_MAPPING["pest_type"]:
        return label
    if label.endswith("s") and label[:-1] in FEATURE_MAPPING["pest_type"]:
        return label[:-1]
    return label


def _technique_code(pest: str, season: str, density: str) -> str:
    features = np.array(
        [
            FEATURE_MAPPING["pest_type"][pest],
            FEATURE_MAPPING["season"][season],
            FEATURE_MAPPING["pest_density"][density],
        ]
    ).reshape(1, -1)
    code = int(_CLF.predict(features)[0])
    for technique, value in FEATURE_MAPPING["eradication_technique"].items():
        if value == code:
            return technique
    return "None"


@api_bp.post("/recommend")
def recommend():  # noqa: ANN202
    data = request.get_json(silent=True) or {}
    pest = normalize_pest(str(data.get("pestType", "")))
    season = str(data.get("season", "")).strip().lower()
    try:
        count = int(data.get("pestCount"))
    except (TypeError, ValueError):
        raise UploadError("validation_error", "pestCount must be a whole number.") from None

    if pest not in FEATURE_MAPPING["pest_type"]:
        raise UploadError("validation_error", f"Unknown pest type: {data.get('pestType')!r}")
    if season not in FEATURE_MAPPING["season"]:
        raise UploadError("validation_error", "season must be 'sunny' or 'rainy'.")
    if count < 0 or count > 1_000_000:
        raise UploadError("validation_error", "pestCount must be between 0 and 1,000,000.")

    density = get_pest_density(count)
    technique = _technique_code(pest, season, density)

    return {
        "pestType": pest,
        "season": season,
        "pestCount": count,
        "density": density,
        "technique": {"name": technique, **TECHNIQUES[technique]},
    }
