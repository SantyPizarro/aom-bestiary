import { Pause, Play, RotateCcw } from "lucide-react";
import type { AnimationState, UnitRecord } from "../types";
import { playUiTone } from "../lib/sound";

type Props = {
  unit: UnitRecord;
  animation: AnimationState;
  onAnimationChange: (name: string) => void;
  onPlayingChange: (playing: boolean) => void;
  onResetCamera: () => void;
};

export function AnimationControls({
  unit,
  animation,
  onAnimationChange,
  onPlayingChange,
  onResetCamera,
}: Props) {
  return (
    <div className="animation-controls" aria-label="Controles de animacion">
      <button
        type="button"
        aria-label={animation.playing ? "Pausar animacion" : "Reproducir animacion"}
        onClick={() => {
          playUiTone("toggle");
          onPlayingChange(!animation.playing);
        }}
        onMouseEnter={() => playUiTone("hover")}
      >
        {animation.playing ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <select
        value={animation.name}
        onChange={(event) => {
          playUiTone("select");
          onAnimationChange(event.target.value);
        }}
        aria-label="Seleccionar animacion"
      >
        {unit.animations.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-label="Resetear camara"
        onClick={() => {
          playUiTone("toggle");
          onResetCamera();
        }}
        onMouseEnter={() => playUiTone("hover")}
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
}
