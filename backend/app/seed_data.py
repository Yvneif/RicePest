"""Seed content for the pest catalog - real reference material for each class."""

from __future__ import annotations

CATALOG_SEED: list[dict] = [
    {
        "slug": "green-leafhopper",
        "title": "Green Leafhopper",
        "scientific_name": "Nephotettix virescens / N. nigropictus",
        "description": (
            "A small green leafhopper that sucks the sap of rice plants and is the main "
            "carrier of tungro virus. Maliit na berdeng insektong sumisipsip ng katas ng "
            "palay at pangunahing tagapadala ng tungro virus."
        ),
        "damage_signs": (
            "Yellowing leaves that start from the tips, stunted plants, and hopper burn "
            "during heavy infestations."
        ),
        "status": "available",
        "image": "green-leafhopper.jpg",
    },
    {
        "slug": "leaf-folders",
        "title": "Leaf Folders",
        "scientific_name": "Cnaphalocrocis medinalis",
        "description": (
            "Caterpillars that fold rice leaves lengthwise and feed on the green tissue "
            "inside, leaving white streaks. Mga uod na bumabalot sa dahon ng palay at "
            "kinakain ang laman nito."
        ),
        "damage_signs": (
            "Folded leaf edges and long white translucent streaks across the leaf blades."
        ),
        "status": "available",
        "image": "leaf-folders.jpg",
    },
    {
        "slug": "rice-bug",
        "title": "Rice Bug",
        "scientific_name": "Leptocorisa oratorius",
        "description": (
            "A slender brown bug that sucks the milky sap of developing grains from "
            "flowering to the milky stage, leaving empty or deformed grains. Payat na "
            "kayumangging insekto na sumisipsip ng hangsap ng binhing mura."
        ),
        "damage_signs": (
            "Pecky, discolored, and empty grains, plus a distinct unpleasant odor in "
            "heavily infested fields."
        ),
        "status": "available",
        "image": "rice-bug.jpg",
    },
    {
        "slug": "stem-borer",
        "title": "Stem Borer",
        "scientific_name": "Scirpophaga incertulas (yellow stem borer)",
        "description": (
            "Moth larvae that bore into rice stems and cut the growing point of the "
            "plant. Mga uod na pumapasok sa tangkay ng palay at pinuputol ang pinaka-suso "
            "ng halaman."
        ),
        "damage_signs": (
            "Dead hearts during the vegetative stage and white earheads at flowering."
        ),
        "status": "available",
        "image": "stem-borer.jpg",
    },
]
