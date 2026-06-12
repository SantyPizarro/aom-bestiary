import { playUiTone } from "../lib/sound";
import type { AssetManifest, UnitRecord, UnitVisualState } from "../types";
import type { ReactNode } from "react";

type Props = {
  unit: UnitRecord;
  ageIcons?: AssetManifest["ageIcons"];
  visualStates?: UnitVisualState[];
  activeVisualStateIds?: string[];
  onToggleVisualState?: (stateId: string) => void;
};

type StatIconName =
  | "food"
  | "wood"
  | "gold"
  | "favor"
  | "population"
  | "hitpoints"
  | "train"
  | "speed"
  | "lineOfSight"
  | "range"
  | "attackHack"
  | "attackPierce"
  | "attackCrush"
  | "armorHack"
  | "armorPierce"
  | "armorCrush";

const STAT_ICONS: Record<StatIconName, string> = {
  food: "/generated/aom/assets/stat-food.png",
  wood: "/generated/aom/assets/stat-wood.png",
  gold: "/generated/aom/assets/stat-gold.png",
  favor: "/generated/aom/assets/stat-favor.png",
  population: "/generated/aom/assets/stat-population.png",
  hitpoints: "/generated/aom/assets/stat-hitpoints.png",
  train: "/generated/aom/assets/stat-train.png",
  speed: "/generated/aom/assets/stat-speed.png",
  lineOfSight: "/generated/aom/assets/stat-lineOfSight.png",
  range: "/generated/aom/assets/stat-range.png",
  attackHack: "/generated/aom/assets/stat-attackHack.png",
  attackPierce: "/generated/aom/assets/stat-attackPierce.png",
  attackCrush: "/generated/aom/assets/stat-attackCrush.png",
  armorHack: "/generated/aom/assets/stat-armorHack.png",
  armorPierce: "/generated/aom/assets/stat-armorPierce.png",
  armorCrush: "/generated/aom/assets/stat-armorCrush.png",
};

export function UnitStatsPanel({
  unit,
  ageIcons,
  visualStates = [],
  activeVisualStateIds = [],
  onToggleVisualState,
}: Props) {
  const costs: Array<[string, number | undefined, StatIconName]> = [
    ["Comida", unit.stats.food, "food"],
    ["Madera", unit.stats.wood, "wood"],
    ["Oro", unit.stats.gold, "gold"],
    ["Favor", unit.stats.favor, "favor"],
  ];
  const attackEntries: Array<[string, number | undefined, StatIconName]> = [
    ["Corte", unit.stats.hackAttack, "attackHack"],
    ["Perforante", unit.stats.pierceAttack, "attackPierce"],
    ["Aplastamiento", unit.stats.crushAttack, "attackCrush"],
  ];
  const armorEntries: Array<[string, number | undefined, StatIconName]> = [
    ["Corte", unit.stats.hackArmor, "armorHack"],
    ["Perforante", unit.stats.pierceArmor, "armorPierce"],
    ["Aplastamiento", unit.stats.crushArmor, "armorCrush"],
  ];
  const attacks = attackEntries.filter(isPresentIconStat);
  const armors = armorEntries.filter(isPresentIconStat);
  const longDescription = unit.gameData?.longDescription ?? unit.description;
  const combatDescription = longDescription === unit.description ? undefined : unit.description;
  const improvements = unit.gameData?.improvements ?? [];

  return (
    <section className="panel stats-panel aom-command-panel" aria-label={`Ficha de ${unit.name}`}>
      <header className="unit-title">
        {unit.assets.portrait ? (
          <img className="unit-portrait" src={unit.assets.portrait} alt="" aria-hidden="true" />
        ) : (
          <span className={`culture-mark ${unit.culture}`} aria-hidden="true" />
        )}
        <div>
          <span className="unit-kicker">{unit.gameData?.protoName ?? unit.type}</span>
          <h1>{unit.name}</h1>
          <p className="unit-subtitle">
            {unit.assets.godIcon ? (
              <img className="unit-god-icon" src={unit.assets.godIcon} alt="" aria-hidden="true" />
            ) : null}
            <span>{unit.god}</span>
            {ageIcons?.[unit.age] ? (
              <span className="unit-age">
                <img src={ageIcons[unit.age]} alt="" aria-hidden="true" />
                Edad {unit.age}
              </span>
            ) : (
              <span>Edad {unit.age}</span>
            )}
          </p>
        </div>
      </header>

      <DescriptionBlock
        description={longDescription}
        combatDescription={combatDescription}
        strengths={unit.strengths}
        counters={unit.counters}
        location={unit.requirements[0]}
      />

      <InfoDisclosure title="Estadísticas">
        <div className="aom-resource-row" aria-label="Coste">
          {costs.map(([label, value, kind]) =>
            typeof value === "number" ? (
              <span key={label} className={`resource-pill ${kind}`}>
                <span className="stat-label">
                  <StatIcon name={kind} />
                  <small>{label}</small>
                </span>
                <strong>{formatNumber(value)}</strong>
              </span>
            ) : null,
          )}
        </div>

        <div className="aom-stat-table">
          <StatRow icon="hitpoints" label="Puntos de resistencia" value={unit.stats.hitpoints} />
          <StatRow icon="population" label="Población" value={unit.stats.population} />
          <StatRow icon="train" label="Entrenamiento" value={unit.stats.trainPoints} suffix=" s" />
          <StatRow icon="speed" label="Velocidad" value={unit.stats.speed} />
          <StatRow icon="lineOfSight" label="Campo visual" value={unit.stats.lineOfSight} />
          <StatRow icon="range" label="Alcance" value={unit.stats.range} />
        </div>

        <section className="aom-table-section">
          <h3>Ataque</h3>
          <div className="aom-stat-table compact">
            {attacks.length ? (
              attacks.map(([label, value, icon]) => <StatRow key={label} icon={icon} label={label} value={value} />)
            ) : (
              <StatRow icon="attackHack" label="Daño directo" value={undefined} />
            )}
          </div>
        </section>

        <section className="aom-table-section">
          <h3>Armadura</h3>
          <div className="armor-line">
            {armors.map(([label, value, icon]) => (
              <span key={label}>
                <StatIcon name={icon} />
                <small>{label}</small>
                <strong>{formatArmor(value)}</strong>
              </span>
            ))}
          </div>
        </section>
      </InfoDisclosure>

      <ImprovementsBlock
        improvements={improvements}
        visualStates={visualStates}
        activeVisualStateIds={activeVisualStateIds}
        onToggleVisualState={onToggleVisualState}
      />
    </section>
  );
}

function StatRow({
  icon,
  label,
  value,
  suffix = "",
}: {
  icon: StatIconName;
  label: string;
  value?: number;
  suffix?: string;
}) {
  return (
    <div className="stat-row">
      <span className="stat-label">
        <StatIcon name={icon} />
        {label}
      </span>
      <strong>{typeof value === "number" ? `${formatNumber(value)}${suffix}` : "N/D"}</strong>
    </div>
  );
}

function isPresentIconStat(entry: [string, number | undefined, StatIconName]): entry is [string, number, StatIconName] {
  return typeof entry[1] === "number";
}

function StatIcon({ name }: { name: StatIconName }) {
  return (
    <img
      className="stat-icon"
      src={STAT_ICONS[name]}
      alt=""
      aria-hidden="true"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function DescriptionBlock({
  description,
  combatDescription,
  strengths,
  counters,
  location,
}: {
  description: string;
  combatDescription?: string;
  strengths: string[];
  counters: string[];
  location?: string;
}) {
  return (
    <InfoDisclosure title="Información" defaultOpen>
      <div className="description-block">
        {description.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {combatDescription ? <p className="combat-description">{combatDescription}</p> : null}
        <div className="combat-guidance">
          {strengths[0] ? (
            <span>
              <strong>Usar contra</strong>
              {strengths[0]}
            </span>
          ) : null}
          {counters[0] ? (
            <span>
              <strong>Contraatacar con</strong>
              {counters[0]}
            </span>
          ) : null}
        </div>
        <AvailabilityLine location={location} />
      </div>
    </InfoDisclosure>
  );
}

function InfoDisclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="info-disclosure" open={defaultOpen}>
      <summary>
        <span>{title}</span>
      </summary>
      <div className="info-disclosure__content">{children}</div>
    </details>
  );
}

function AvailabilityLine({ location }: { location?: string }) {
  if (!location) {
    return null;
  }

  return (
    <div className="availability-line">
      <span>Disponible en</span>
      <strong>{location}</strong>
    </div>
  );
}

function ImprovementsBlock({
  improvements,
  visualStates,
  activeVisualStateIds,
  onToggleVisualState,
}: {
  improvements: NonNullable<UnitRecord["gameData"]>["improvements"];
  visualStates: UnitVisualState[];
  activeVisualStateIds: string[];
  onToggleVisualState?: (stateId: string) => void;
}) {
  if (!improvements?.length) {
    return null;
  }

  return (
    <details className="info-disclosure improvements-block">
      <summary>
        <span>Mejoras</span>
      </summary>
      <div className="info-disclosure__content improvement-list">
        {improvements.map((improvement) => {
          const visualState = visualStates.find((state) => state.linkedImprovementId === improvement.id);

          return (
            <article key={improvement.id} className="improvement-card">
              {improvement.icon ? (
                <img
                  className="improvement-icon"
                  src={improvement.icon}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <div className="improvement-card__body">
                <header>
                  <strong>{improvement.name}</strong>
                  {improvement.researchPoints ? <small>{formatNumber(improvement.researchPoints)} s</small> : null}
                </header>
                <ImprovementVisualControl
                  state={visualState}
                  active={visualState ? activeVisualStateIds.includes(visualState.id) : false}
                  onToggle={onToggleVisualState}
                />
                {improvement.description ? <p>{improvement.description}</p> : null}
                <ImprovementCost costs={improvement.costs} />
                {improvement.effects.length ? (
                  <ul className="effect-list">
                    {improvement.effects.slice(0, 4).map((effect) => (
                      <li key={effect}>{effect}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}

function ImprovementVisualControl({
  state,
  active,
  onToggle,
}: {
  state?: UnitVisualState;
  active: boolean;
  onToggle?: (stateId: string) => void;
}) {
  if (!state) {
    return null;
  }

  if (state.hasVisualChange === false) {
    return null;
  }

  return (
    <button
      type="button"
      className={`improvement-visual-toggle${active ? " active" : ""}`}
      onClick={() => {
        onToggle?.(state.id);
      }}
      onMouseEnter={() => playUiTone("hover")}
    >
      {active ? "Visual activo" : "Ver mejora"}
    </button>
  );
}

function ImprovementCost({
  costs,
}: {
  costs?: NonNullable<NonNullable<UnitRecord["gameData"]>["improvements"]>[number]["costs"];
}) {
  if (!costs || !Object.values(costs).some((value) => typeof value === "number")) {
    return null;
  }

  const entries: Array<[keyof NonNullable<typeof costs>, StatIconName, string]> = [
    ["food", "food", "Comida"],
    ["wood", "wood", "Madera"],
    ["gold", "gold", "Oro"],
    ["favor", "favor", "Favor"],
  ];

  return (
    <div className="improvement-cost">
      {entries.map(([key, icon, label]) =>
        typeof costs[key] === "number" ? (
          <span key={key} aria-label={`${label}: ${costs[key]}`}>
            <StatIcon name={icon} />
            {formatNumber(costs[key])}
          </span>
        ) : null,
      )}
    </div>
  );
}

function formatArmor(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
