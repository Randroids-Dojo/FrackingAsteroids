import { z } from "zod";

export const ShipSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  velocityX: z.number(),
  velocityY: z.number(),
});
export type Ship = z.infer<typeof ShipSchema>;

export const UpgradesSchema = z.object({
  blaster: z.number().int().min(1).max(5),
  collector: z.number().int().min(1).max(5),
  storage: z.number().int().min(1).max(5),
});
export type Upgrades = z.infer<typeof UpgradesSchema>;

export const CargoSchema = z.object({
  scrap: z.number().min(0),
  fragments: z.number().min(0),
  capacity: z.number().int().min(1),
});
export type Cargo = z.infer<typeof CargoSchema>;

export const GameStateSchema = z.object({
  ship: ShipSchema,
  upgrades: UpgradesSchema,
  cargo: CargoSchema,
  score: z.number().int().min(0),
  wave: z.number().int().min(1),
  timestamp: z.number(),
});
export type GameState = z.infer<typeof GameStateSchema>;

export const FeedbackSchema = z.object({
  message: z.string().min(1).max(2000),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export function defaultGameState(): GameState {
  return {
    ship: { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 },
    upgrades: { blaster: 1, collector: 1, storage: 1 },
    cargo: { scrap: 0, fragments: 0, capacity: 50 },
    score: 0,
    wave: 1,
    timestamp: Date.now(),
  };
}
