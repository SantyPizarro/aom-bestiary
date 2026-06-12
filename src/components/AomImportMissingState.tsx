import { AlertTriangle, Boxes } from "lucide-react";

type Props = {
  compact?: boolean;
};

export function AomImportMissingState({ compact = false }: Props) {
  return (
    <aside className={compact ? "import-state compact" : "import-state"}>
      <div className="import-state__icon" aria-hidden="true">
        {compact ? <AlertTriangle size={18} /> : <Boxes size={24} />}
      </div>
      <div>
        <strong>Recursos propietarios no incluidos</strong>
        <p>
          Esta version publica utiliza una presentacion alternativa cuando los recursos del juego
          no estan disponibles.
        </p>
      </div>
    </aside>
  );
}
