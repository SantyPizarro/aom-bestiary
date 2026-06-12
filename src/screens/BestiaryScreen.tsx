import { useEffect, useMemo, useState } from "react";
import { AomImportMissingState } from "../components/AomImportMissingState";
import { AnimationControls } from "../components/AnimationControls";
import { UnitSelector } from "../components/UnitSelector";
import { UnitStatsPanel } from "../components/UnitStatsPanel";
import { UnitViewer3D } from "../components/UnitViewer3D";
import { useAomAssets } from "../lib/assets";
import { playUiTone } from "../lib/sound";
import type { AnimationState, AssetManifest, Culture, EnvironmentPreset, UnitVisualPart, UnitVisualState } from "../types";
import type { CSSProperties, Dispatch, SetStateAction } from "react";

const EMPTY_VISUAL_PARTS: UnitVisualPart[] = [];
const EMPTY_VISUAL_STATES: UnitVisualState[] = [];

export function BestiaryScreen() {
  const {
    units,
    manifest,
    generatedAvailable,
    platformTexture,
    cultureSceneAssets,
    environmentPresets,
    ageIcons,
  } = useAomAssets();
  const [selectedId, setSelectedId] = useState("minotaur");
  const [browsingCulture, setBrowsingCulture] = useState<Culture | "todas">("todas");
  const [animation, setAnimation] = useState<AnimationState>({ name: "idle", playing: true });
  const [resetNonce, setResetNonce] = useState(0);
  const [visualPartState, setVisualPartState] = useState<Record<string, boolean>>({});
  const [visualStateState, setVisualStateState] = useState<Record<string, boolean>>({});

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedId) ?? units[0],
    [selectedId, units],
  );
  const uiCulture = browsingCulture === "todas" ? selectedUnit?.culture : browsingCulture;
  const uiStyle = useMemo(() => createUiAssetStyle(manifest, uiCulture), [manifest, uiCulture]);
  const hasUiAssets = hasCompleteUiAssetStyle(uiStyle);
  const visualParts = selectedUnit?.assets.visualParts ?? EMPTY_VISUAL_PARTS;
  const visualStates = selectedUnit?.assets.visualStates ?? EMPTY_VISUAL_STATES;
  const visualPartSignature = useMemo(
    () => visualParts.map((part) => `${part.id}:${part.enabledByDefault !== false}`).join("|"),
    [visualParts],
  );
  const visualStateSignature = useMemo(
    () => visualStates.map((state) => `${state.id}:${state.enabledByDefault === true}`).join("|"),
    [visualStates],
  );
  const activeVisualStates = useMemo(
    () => visualStates.filter((state) => isVisualStateActive(state, visualStateState)),
    [visualStateState, visualStates],
  );
  const activeVisualStateIds = useMemo(
    () => activeVisualStates.map((state) => state.id),
    [activeVisualStates],
  );
  const activeEnvironment = [...activeVisualStates]
    .reverse()
    .map((state) => state.environment)
    .find((environment) => environment?.platformTexture);
  const selectedPlatformTexture =
    activeEnvironment?.platformTexture ??
    selectedUnit?.assets.environment?.platformTexture ??
    (selectedUnit ? cultureSceneAssets?.[selectedUnit.culture]?.platformTexture ?? platformTexture : platformTexture);
  const selectedEnvironmentPreset = useMemo(() => {
    if (!selectedUnit) {
      return undefined;
    }

    const environmentKey =
      activeEnvironment?.type === "water" || selectedUnit.assets.environment?.type === "water"
        ? "water"
        : selectedUnit.culture;
    const preset = environmentPresets?.[environmentKey];

    if (!preset) {
      return undefined;
    }

    return {
      ...preset,
      platformTexture:
        activeEnvironment?.platformTexture ??
        selectedUnit.assets.environment?.platformTexture ??
        preset.platformTexture ??
        selectedPlatformTexture,
      detailTexture: preset.detailTexture,
      waterFrames: preset.waterFrames,
      waterSpecTexture: preset.waterSpecTexture,
    } satisfies EnvironmentPreset;
  }, [activeEnvironment, environmentPresets, selectedPlatformTexture, selectedUnit]);
  const enabledVisualPartIds = useMemo(
    () => {
      const enabledByVisualState = new Set(activeVisualStates.flatMap((state) => state.enabledPartIds ?? []));
      const disabledByVisualState = new Set(activeVisualStates.flatMap((state) => state.disabledPartIds ?? []));

      return visualParts
        .filter((part) => {
          if (disabledByVisualState.has(part.id)) {
            return false;
          }

          if (enabledByVisualState.has(part.id)) {
            return true;
          }

          if (part.upgradeId) {
            return false;
          }

          return visualPartState[part.id] ?? part.enabledByDefault !== false;
        })
        .map((part) => part.id);
    },
    [activeVisualStates, visualPartState, visualParts],
  );

  useEffect(() => {
    if (!selectedUnit.animations.includes(animation.name)) {
      setAnimation({ name: selectedUnit.animations[0] ?? "idle", playing: true });
    }
  }, [animation.name, selectedUnit]);

  useEffect(() => {
    const nextState = Object.fromEntries(visualParts.map((part) => [part.id, part.enabledByDefault !== false]));

    setVisualPartState((current) => (areBooleanRecordsEqual(current, nextState) ? current : nextState));
  }, [selectedUnit?.id, visualPartSignature]);

  useEffect(() => {
    const nextState = Object.fromEntries(visualStates.map((state) => [state.id, state.enabledByDefault === true]));

    setVisualStateState((current) => (areBooleanRecordsEqual(current, nextState) ? current : nextState));
  }, [selectedUnit?.id, visualStateSignature]);

  if (!selectedUnit) {
    return <main className="app-shell empty">No hay unidades disponibles.</main>;
  }

  return (
    <main
      className={`app-shell culture-${uiCulture}${hasUiAssets ? " has-ui-assets" : ""}`}
      style={uiStyle}
    >
      <div className="ambient-layer" aria-hidden="true" />

      {!generatedAvailable && <AomImportMissingState />}

      <div className="bestiary-layout">
        <UnitSelector
          units={units}
          selectedId={selectedUnit.id}
          culture={browsingCulture}
          ageIcons={ageIcons}
          onSelect={setSelectedId}
          onCultureChange={setBrowsingCulture}
        />

        <section className="stage-column">
          <UnitViewer3D
            unit={selectedUnit}
            animation={animation}
            resetNonce={resetNonce}
            platformTexture={selectedPlatformTexture}
            environmentPreset={selectedEnvironmentPreset}
            enabledVisualPartIds={enabledVisualPartIds}
            activeVisualStateIds={activeVisualStateIds}
          />
          <div className="stage-controls">
            <AnimationControls
              unit={selectedUnit}
              animation={animation}
              onAnimationChange={(name) => setAnimation((current) => ({ ...current, name }))}
              onPlayingChange={(playing) => setAnimation((current) => ({ ...current, playing }))}
              onResetCamera={() => setResetNonce((value) => value + 1)}
            />
            {!["kraken", "medusa"].includes(selectedUnit.id) ? (
              <VisualPartControls
                parts={visualParts.filter((part) => !part.upgradeId)}
                state={visualPartState}
                onToggle={(partId) =>
                  setVisualPartState((current) => ({
                    ...current,
                    [partId]: !(current[partId] ?? true),
                  }))
                }
              />
            ) : null}
            <VisualStateControls
              states={visualStates.filter((state) => !state.linkedImprovementId && state.hasVisualChange !== false)}
              activeIds={activeVisualStateIds}
              onToggle={(stateId) => {
                const state = visualStates.find((candidate) => candidate.id === stateId);

                if (state) {
                  toggleVisualState(state, visualStates, setVisualStateState);
                }
              }}
            />
          </div>
          {manifest?.warnings.length ? (
            <div className="warning-strip">
              Algunos recursos visuales no pudieron cargarse completamente.
            </div>
          ) : null}
        </section>

        <UnitStatsPanel
          unit={selectedUnit}
          ageIcons={ageIcons}
          visualStates={visualStates}
          activeVisualStateIds={activeVisualStateIds}
          onToggleVisualState={(stateId) => {
            const state = visualStates.find((candidate) => candidate.id === stateId);

            if (state) {
              toggleVisualState(state, visualStates, setVisualStateState);
            }
          }}
        />
      </div>
      <footer className="project-disclaimer">
        Proyecto academico no comercial y no afiliado con Microsoft. Age of Mythology y sus
        recursos pertenecen a sus respectivos titulares.
      </footer>
    </main>
  );
}

function isVisualStateActive(state: UnitVisualState, visualStateState: Record<string, boolean>) {
  return visualStateState[state.id] ?? state.enabledByDefault === true;
}

function areBooleanRecordsEqual(first: Record<string, boolean>, second: Record<string, boolean>) {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  return firstKeys.every((key) => first[key] === second[key]);
}

function toggleVisualState(
  state: UnitVisualState,
  allStates: UnitVisualState[],
  setVisualStateState: Dispatch<SetStateAction<Record<string, boolean>>>,
) {
  playUiTone("toggle");
  setVisualStateState((current) => {
    const currentlyActive = isVisualStateActive(state, current);
    const nextActive = state.exclusive ? true : !currentlyActive;
    const next = { ...current, [state.id]: nextActive };

    if (nextActive && state.exclusive && state.group) {
      for (const sibling of allStates) {
        if (sibling.id !== state.id && sibling.group === state.group) {
          next[sibling.id] = false;
        }
      }
    }

    return next;
  });
}

function VisualPartControls({
  parts,
  state,
  onToggle,
}: {
  parts: UnitVisualPart[];
  state: Record<string, boolean>;
  onToggle: (partId: string) => void;
}) {
  if (!parts.length) {
    return null;
  }

  return (
    <div className="visual-part-controls" aria-label="Piezas visuales de la unidad">
      <span>Equipo</span>
      <div>
        {parts.map((part) => {
          const active = state[part.id] ?? part.enabledByDefault !== false;

          return (
            <button
              key={part.id}
              type="button"
              className={active ? "active" : ""}
              onClick={() => {
                playUiTone("toggle");
                onToggle(part.id);
              }}
              onMouseEnter={() => playUiTone("hover")}
            >
              {part.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VisualStateControls({
  states,
  activeIds,
  onToggle,
}: {
  states: UnitVisualState[];
  activeIds: string[];
  onToggle: (stateId: string) => void;
}) {
  if (!states.length) {
    return null;
  }

  return (
    <div className="visual-state-controls" aria-label="Estados visuales de la unidad">
      <span>{states.some((state) => state.group === "hydra-heads") ? "Cabezas" : "Estados"}</span>
      <div>
        {states.map((state) => {
          const active = activeIds.includes(state.id);

          return (
            <button
              key={state.id}
              type="button"
              className={active ? "active" : ""}
              onClick={() => onToggle(state.id)}
              onMouseEnter={() => playUiTone("hover")}
            >
              {state.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type UiAssetStyle = CSSProperties & Record<string, string>;

function createUiAssetStyle(manifest: AssetManifest | null, culture?: Culture): UiAssetStyle {
  if (!manifest?.uiAssets || !culture) {
    return {};
  }

  const cultureAssets = manifest.uiAssets.cultures?.[culture];
  const sceneAssets = manifest.cultureSceneAssets?.[culture];
  const buttons = manifest.uiAssets.buttons;
  const frames = manifest.uiAssets.frames;
  const style: UiAssetStyle = {};

  assignUrl(style, "--aom-ui-panel-border", cultureAssets?.border);
  assignUrl(style, "--aom-ui-panel-bg", cultureAssets?.background);
  assignUrl(style, "--aom-ui-scroll-thumb", cultureAssets?.scrollbarThumb);
  assignUrl(style, "--aom-ui-scroll-track", cultureAssets?.scrollbarTrack);
  assignUrl(style, "--aom-scene-backdrop", sceneAssets?.backdropTexture);
  assignUrl(style, "--aom-ui-button", buttons?.main);
  assignUrl(style, "--aom-ui-button-hover", buttons?.mainHover);
  assignUrl(style, "--aom-ui-button-active", buttons?.mainActive);
  assignUrl(style, "--aom-ui-help-button", buttons?.help);
  assignUrl(style, "--aom-ui-bevel-in", frames?.bevelGoldIn);
  assignUrl(style, "--aom-ui-bevel-out", frames?.bevelGoldOut);
  assignUrl(style, "--aom-ui-bevel-thin", frames?.bevelThin);
  assignUrl(style, "--aom-ui-command-panel", frames?.commandPanel);

  return style;
}

function assignUrl(style: UiAssetStyle, variable: string, value?: string) {
  if (value) {
    style[variable] = `url("${value}")`;
  }
}

function hasCompleteUiAssetStyle(style: UiAssetStyle) {
  return [
    "--aom-ui-panel-border",
    "--aom-ui-panel-bg",
    "--aom-ui-bevel-in",
    "--aom-ui-bevel-thin",
    "--aom-ui-bevel-out",
  ].every((key) => Boolean(style[key]));
}
