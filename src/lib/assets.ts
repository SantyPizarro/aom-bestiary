import { useEffect, useMemo, useState } from "react";
import { BASE_MYTH_UNITS } from "../data/mythUnits";
import type { AssetManifest, UnitRecord } from "../types";

const MANIFEST_URL = "/generated/aom/manifest.json";
const UNITS_URL = "/generated/aom/units.generated.json";

type AssetState = {
  loading: boolean;
  manifest: AssetManifest | null;
  units: UnitRecord[];
  generatedAvailable: boolean;
  platformTexture?: string;
  cultureSceneAssets?: AssetManifest["cultureSceneAssets"];
  environmentPresets?: AssetManifest["environmentPresets"];
  ageIcons?: AssetManifest["ageIcons"];
};

export function useAomAssets(): AssetState {
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [generatedUnits, setGeneratedUnits] = useState<UnitRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGenerated() {
      try {
        const manifestResponse = await fetch(MANIFEST_URL, { cache: "no-store" });

        if (!manifestResponse.ok) {
          return;
        }

        const nextManifest = (await manifestResponse.json()) as AssetManifest;
        const unitsResponse = await fetch(UNITS_URL, { cache: "no-store" });
        const nextUnits = unitsResponse.ok ? ((await unitsResponse.json()) as UnitRecord[]) : null;

        if (!cancelled) {
          setManifest(nextManifest);
          setGeneratedUnits(nextUnits);
        }
      } catch (error) {
        console.warn("No se pudo cargar el manifest generado de AoM.", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGenerated();

    return () => {
      cancelled = true;
    };
  }, []);

  const units = useMemo(() => {
    const sourceUnits = generatedUnits?.length ? generatedUnits : BASE_MYTH_UNITS;

    if (!manifest) {
      return sourceUnits;
    }

    return sourceUnits.map((unit) => {
      const generatedAssets = manifest.units[unit.id];

      if (!generatedAssets) {
        return unit;
      }

      return {
        ...unit,
        animations: generatedAssets.animations?.length ? generatedAssets.animations : unit.animations,
        assets: {
          ...unit.assets,
          ...generatedAssets,
          sounds: {
            ...unit.assets.sounds,
            ...generatedAssets.sounds,
          },
        },
      };
    });
  }, [generatedUnits, manifest]);

  return {
    loading,
    manifest,
    units,
    generatedAvailable: Boolean(manifest && Object.keys(manifest.units).length > 0),
    platformTexture: manifest?.platformTexture,
    cultureSceneAssets: manifest?.cultureSceneAssets,
    environmentPresets: manifest?.environmentPresets,
    ageIcons: manifest?.ageIcons,
  };
}
