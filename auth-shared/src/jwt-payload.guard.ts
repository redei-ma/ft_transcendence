
import { JwtAccessPayloadDto } from "./jwt-access-payload.dto";

export function isJwtAccessPayloadDto(payload: unknown): payload is JwtAccessPayloadDto {
  if (typeof payload !== "object" || payload === null) return false;

  const p = payload as Record<string, unknown>;

  return (
    typeof p.sub === "number" &&
    typeof p.username === "string"
  );
}

