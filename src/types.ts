export type Culture = "griega" | "egipcia" | "nordica";

export type UnitStats = {
  hitpoints: number;
  favor: number;
  food?: number;
  wood?: number;
  gold?: number;
  hackAttack?: number;
  pierceAttack?: number;
  crushAttack?: number;
  hackArmor: number;
  pierceArmor: number;
  crushArmor?: number;
  speed: number;
  lineOfSight: number;
  range?: number;
  population?: number;
  trainPoints?: number;
};

export type UnitGameData = {
  protoName: string;
  displayNameId?: number;
  rolloverTextId?: number;
  longDescription?: string;
  useAgainstText?: string;
  counterWithText?: string;
  upgradeAtText?: string;
  armor?: Record<string, number>;
  attacks?: Array<{
    name: string;
    range?: number;
    rate?: number;
    damage: Record<string, number>;
    bonuses: Array<{ target: string; multiplier: number }>;
  }>;
  improvements?: UnitImprovement[];
};

export type UnitImprovement = {
  id: string;
  name: string;
  description?: string;
  history?: string;
  icon?: string;
  iconSource?: string;
  costs?: Partial<Record<"food" | "wood" | "gold" | "favor", number>>;
  researchPoints?: number;
  requirements?: string[];
  effects: string[];
};

export type UnitVisualPart = {
  id: string;
  label: string;
  model: string;
  category: "head" | "weapon" | "armor" | "upgrade" | "attachment" | "projectile" | "other";
  enabledByDefault?: boolean;
  upgradeId?: string;
  description?: string;
  attachTo?: string;
  attachSource?: string;
};

export type UnitVisualEnvironment = {
  type: "terrain" | "water";
  label?: string;
  platformTexture?: string;
};

export type EnvironmentMode = "full" | "simple" | "hidden";

export type EnvironmentProp = {
  id: string;
  label: string;
  model?: string;
  source?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  receiveShadow?: boolean;
  castShadow?: boolean;
};

export type EnvironmentPreset = {
  id: Culture | "water";
  label: string;
  culture?: Culture;
  type: "terrain" | "water";
  platformTexture?: string;
  waterFrames?: string[];
  waterSpecTexture?: string;
  detailTexture?: string;
  backdropTexture?: string;
  fogColor?: string;
  backgroundColor?: string;
  ambientColor?: string;
  keyLightColor?: string;
  fillLightColor?: string;
  props?: EnvironmentProp[];
};

export type UnitVisualState = {
  id: string;
  label: string;
  linkedImprovementId?: string;
  group?: string;
  exclusive?: boolean;
  enabledByDefault?: boolean;
  hasVisualChange?: boolean;
  description?: string;
  model?: string;
  animationModels?: Record<string, string>;
  enabledPartIds?: string[];
  disabledPartIds?: string[];
  replaceTextures?: UnitTextureReplacement[];
  environment?: UnitVisualEnvironment;
};

export type UnitTextureReplacement = {
  from: string;
  to: string;
  texture?: string;
};

export type UnitAssets = {
  model?: string;
  animationModels?: Record<string, string>;
  attachments?: string[];
  visualParts?: UnitVisualPart[];
  visualStates?: UnitVisualState[];
  environment?: UnitVisualEnvironment;
  portrait?: string;
  godIcon?: string;
  texture?: string;
  sounds?: {
    select?: string;
    attack?: string;
    special?: string;
  };
};

export type UnitRecord = {
  id: string;
  name: string;
  culture: Culture;
  age: "clasica" | "heroica" | "mitica";
  god: string;
  type: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  counters: string[];
  requirements: string[];
  stats: UnitStats;
  gameData?: UnitGameData;
  animations: string[];
  assets: UnitAssets;
};

export type UiCultureAssets = {
  border?: string;
  background?: string;
  scrollbarThumb?: string;
  scrollbarTrack?: string;
};

export type UiAssetSet = {
  cultures?: Partial<Record<Culture, UiCultureAssets>>;
  buttons?: {
    main?: string;
    mainHover?: string;
    mainActive?: string;
    help?: string;
  };
  frames?: {
    bevelGoldIn?: string;
    bevelGoldOut?: string;
    bevelThin?: string;
    commandPanel?: string;
  };
};

export type AssetManifest = {
  version: number;
  importedAt: string;
  basePath: string;
  language?: string | null;
  platformTexture?: string;
  waterTexture?: string;
  waterFrames?: string[];
  waterSpecTexture?: string;
  cultureSceneAssets?: Partial<
    Record<Culture, { platformTexture?: string; detailTexture?: string; backdropTexture?: string }>
  >;
  environmentPresets?: Partial<Record<Culture | "water", EnvironmentPreset>>;
  visualTextures?: Record<string, Record<string, UnitTextureReplacement[]>>;
  statIcons?: Record<string, string>;
  ageIcons?: Partial<Record<UnitRecord["age"], string>>;
  uiAssets?: UiAssetSet;
  godIcons?: Record<string, string>;
  units: Record<string, Partial<UnitAssets> & { animations?: string[] }>;
  missing?: string[];
  warnings?: string[];
};

export type AnimationState = {
  name: string;
  playing: boolean;
};
