import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { AssetManifest, Culture, UnitRecord } from "../types";
import { playAssetSound, playUiTone } from "../lib/sound";

type Props = {
  units: UnitRecord[];
  selectedId: string;
  culture: Culture | "todas";
  ageIcons?: AssetManifest["ageIcons"];
  onSelect: (id: string) => void;
  onCultureChange: (culture: Culture | "todas") => void;
};

const CULTURES: Array<{ id: Culture | "todas"; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "griega", label: "Griegas" },
  { id: "egipcia", label: "Egipcias" },
  { id: "nordica", label: "Nordicas" },
];

export function UnitSelector({ units, selectedId, culture, ageIcons, onSelect, onCultureChange }: Props) {
  const [query, setQuery] = useState("");

  const visibleUnits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesCulture = culture === "todas" || unit.culture === culture;
      const matchesQuery = !normalizedQuery || unit.name.toLowerCase().includes(normalizedQuery);

      return matchesCulture && matchesQuery;
    });
  }, [culture, query, units]);

  return (
    <section className="panel unit-selector" aria-label="Selector de unidades miticas">
      <div className="panel-heading">
        <span>Bestiario</span>
        <small>{units.length} unidades</small>
      </div>

      <div className="culture-tabs" role="tablist" aria-label="Culturas">
        {CULTURES.map((item) => (
          <button
            key={item.id}
            className={item.id === culture ? "active" : ""}
            type="button"
            onClick={() => {
              playUiTone("toggle");
              onCultureChange(item.id);
            }}
            onMouseEnter={() => playUiTone("hover")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="search-box">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar unidad"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="unit-list">
        {visibleUnits.map((unit) => (
          <button
            key={unit.id}
            className={unit.id === selectedId ? "unit-card active" : "unit-card"}
            type="button"
            onClick={() => {
              if (!playAssetSound(unit.assets.sounds?.select)) {
                playUiTone("select");
              }
              onSelect(unit.id);
            }}
            onMouseEnter={() => playUiTone("hover")}
          >
            {unit.assets.portrait ? (
              <img className="unit-card__portrait" src={unit.assets.portrait} alt="" aria-hidden="true" />
            ) : (
              <span className={`culture-mark ${unit.culture}`} aria-hidden="true" />
            )}
            <span className="unit-card__content">
              <strong>{unit.name}</strong>
              <small>{unit.god}</small>
            </span>
            {ageIcons?.[unit.age] ? (
              <img
                className="unit-card__age"
                src={ageIcons[unit.age]}
                alt={`Edad ${unit.age}`}
                title={`Edad ${unit.age}`}
              />
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
